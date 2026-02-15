import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  MetaAgentSession,
  MetaAgentCommand,
  ProcessMessageResponse,
  SuggestedAction,
} from '@/types/meta-agent';

export interface ValisMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
  suggestedFollowups?: string[];
  usedLLM?: boolean;
  processingTimeMs?: number;
}

interface UseValisOptions {
  sessionId?: string;
}

interface UseValisReturn {
  messages: ValisMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: Error | null;
  session: MetaAgentSession | null;
  sessions: MetaAgentSession[];
  sessionsLoading: boolean;
  suggestedActions: SuggestedAction[];
  sendMessage: (content: string) => Promise<void>;
  createSession: () => Promise<string | null>;
  selectSession: (sessionId: string) => void;
  clearError: () => void;
}

export function useValis(options: UseValisOptions = {}): UseValisReturn {
  const [messages, setMessages] = useState<ValisMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<MetaAgentSession | null>(null);
  const [sessions, setSessions] = useState<MetaAgentSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    options.sessionId
  );

  const supabase = createClient();
  const abortRef = useRef<AbortController | null>(null);

  // Helper to get auth token
  const getToken = useCallback(async (): Promise<string> => {
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();
    if (!authSession) throw new Error('Not authenticated');
    return authSession.access_token;
  }, [supabase]);

  // Fetch sessions list
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/meta-agent/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // If the sessions endpoint doesn't exist yet, fail silently
        if (res.status === 404) {
          setSessions([]);
          return;
        }
        throw new Error('Failed to fetch sessions');
      }
      const data = await res.json();
      setSessions(data.sessions || data.data || []);
    } catch {
      // Sessions list is non-critical
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [getToken]);

  // Load command history for a session
  const loadSessionHistory = useCallback(
    async (sessionId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await fetch(
          `/api/meta-agent/sessions/${sessionId}/history?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          // If history endpoint doesn't exist, start fresh
          if (res.status === 404) {
            setMessages([]);
            return;
          }
          throw new Error('Failed to load history');
        }

        const data = await res.json();
        const commands: MetaAgentCommand[] = data.commands || data.data || [];

        // Convert commands to messages
        const msgs: ValisMessage[] = commands.flatMap((cmd) => {
          const result: ValisMessage[] = [
            {
              id: `${cmd.id}-user`,
              role: 'user',
              content: cmd.raw_message,
              timestamp: cmd.created_at,
              intent: cmd.intent,
            },
          ];
          if (cmd.status === 'completed' || cmd.status === 'failed') {
            result.push({
              id: `${cmd.id}-assistant`,
              role: 'assistant',
              content: cmd.response_message,
              timestamp: cmd.completed_at || cmd.processed_at || cmd.created_at,
              intent: cmd.intent,
              suggestedFollowups: cmd.response_metadata?.suggested_followups,
              usedLLM: cmd.response_metadata?.used_llm as boolean | undefined,
              processingTimeMs: cmd.processing_time_ms,
            });
          }
          return result;
        });

        setMessages(msgs);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    },
    [getToken]
  );

  // Select a session
  const selectSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      setSuggestedActions([]);
    },
    []
  );

  // Create a new session
  const createSession = useCallback(async (): Promise<string | null> => {
    try {
      const token = await getToken();
      // Send a dummy message to create a session, then clear it
      // Or, use the process endpoint which auto-creates sessions
      const res = await fetch('/api/meta-agent/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: "What's the status of my workforce?",
        }),
      });

      if (!res.ok) throw new Error('Failed to create session');

      const data: ProcessMessageResponse = await res.json();
      const newSessionId = data.session.id;

      // Convert to messages
      const newMessages: ValisMessage[] = [
        {
          id: `${data.command.id}-user`,
          role: 'user',
          content: data.command.raw_message,
          timestamp: data.command.created_at,
          intent: data.command.intent,
        },
        {
          id: `${data.command.id}-assistant`,
          role: 'assistant',
          content: data.command.response_message,
          timestamp:
            data.command.completed_at ||
            data.command.processed_at ||
            data.command.created_at,
          intent: data.command.intent,
          suggestedFollowups:
            data.command.response_metadata?.suggested_followups,
          usedLLM: data.command.response_metadata?.used_llm as boolean | undefined,
          processingTimeMs: data.command.processing_time_ms,
        },
      ];

      setActiveSessionId(newSessionId);
      setMessages(newMessages);
      setSession(data.session);
      setSuggestedActions(data.suggested_actions || []);
      fetchSessions();

      return newSessionId;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    }
  }, [getToken, fetchSessions]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      setIsSending(true);
      setError(null);
      setSuggestedActions([]);

      // Optimistically add user message
      const tempId = `temp-${Date.now()}`;
      const userMsg: ValisMessage = {
        id: tempId,
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Cancel any pending request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      try {
        const token = await getToken();
        const res = await fetch('/api/meta-agent/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: content.trim(),
            session_id: activeSessionId,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || `Request failed with status ${res.status}`
          );
        }

        const data: ProcessMessageResponse = await res.json();

        // If a new session was created, track it
        if (!activeSessionId && data.session?.id) {
          setActiveSessionId(data.session.id);
        }

        setSession(data.session);

        // Replace temp user message and add assistant response
        const assistantMsg: ValisMessage = {
          id: `${data.command.id}-assistant`,
          role: 'assistant',
          content: data.command.response_message,
          timestamp:
            data.command.completed_at ||
            data.command.processed_at ||
            data.command.created_at,
          intent: data.command.intent,
          suggestedFollowups:
            data.command.response_metadata?.suggested_followups,
          usedLLM: data.command.response_metadata?.used_llm as boolean | undefined,
          processingTimeMs: data.command.processing_time_ms,
        };

        setMessages((prev) => {
          // Replace the temp message with the real one
          const updated = prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: `${data.command.id}-user`,
                  timestamp: data.command.created_at,
                  intent: data.command.intent,
                }
              : m
          );
          return [...updated, assistantMsg];
        });

        setSuggestedActions(data.suggested_actions || []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Remove the optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } finally {
        setIsSending(false);
        abortRef.current = null;
      }
    },
    [activeSessionId, getToken]
  );

  const clearError = useCallback(() => setError(null), []);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load history when active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadSessionHistory(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, loadSessionHistory]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    session,
    sessions,
    sessionsLoading,
    suggestedActions,
    sendMessage,
    createSession,
    selectSession,
    clearError,
  };
}
