'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Chat, ChatMessage } from '@/types';

// Demo tenant ID - in production, this would come from auth context
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

interface UseChatOptions {
  chatId: string | null;
  agentId?: string;
}

interface UseChatReturn {
  chat: Chat | null;
  messages: ChatMessage[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  sending: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadMore: () => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
}

/**
 * Hook for managing a single chat conversation
 */
export function useChat({ chatId, agentId }: UseChatOptions): UseChatReturn {
  const supabase = createClient();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch messages for a chat - defined first to avoid dependency issues
  const fetchMessages = useCallback(async (id: string, before?: string) => {
    try {
      const url = new URL(`/api/chats/${id}/messages`, window.location.origin);
      url.searchParams.set('limit', '50');
      if (before) url.searchParams.set('before', before);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch messages');

      const { messages: newMessages, has_more } = await response.json();

      if (before) {
        // Prepend older messages
        setMessages(prev => [...newMessages.reverse(), ...prev]);
      } else {
        // Initial load - show newest at bottom
        setMessages(newMessages.reverse());
      }
      setHasMore(has_more);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, []);

  // Fetch or create chat
  const initChat = useCallback(async () => {
    if (!chatId && !agentId) {
      setChat(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let chatData: Chat | null = null;

      if (chatId) {
        // Fetch existing chat
        const response = await fetch(`/api/chats`);
        if (!response.ok) throw new Error('Failed to fetch chats');
        const { chats } = await response.json();
        chatData = chats.find((c: Chat) => c.id === chatId) || null;
      } else if (agentId) {
        // Create new chat with agent
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agentId }),
        });
        if (!response.ok) throw new Error('Failed to create chat');
        const { chat: newChat } = await response.json();
        chatData = newChat;
      }

      setChat(chatData);

      if (chatData?.id) {
        // Fetch messages
        await fetchMessages(chatData.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize chat'));
    } finally {
      setLoading(false);
    }
  }, [chatId, agentId, fetchMessages]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!chat?.id || !content.trim()) return;

    try {
      setSending(true);

      // Optimistically add user message
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        chat_id: chat.id,
        role: 'user',
        content: content.trim(),
        metadata: {},
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimisticMessage]);

      const response = await fetch(`/api/chats/${chat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const { message: savedMessage } = await response.json();

      // Replace optimistic message with saved message
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMessage.id ? savedMessage : m))
      );
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      throw err;
    } finally {
      setSending(false);
    }
  }, [chat?.id]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!chat?.id || messages.length === 0 || !hasMore) return;

    const oldestMessage = messages[0];
    await fetchMessages(chat.id, oldestMessage.created_at);
  }, [chat?.id, messages, hasMore, fetchMessages]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!chat?.id) return;

    try {
      const response = await fetch(
        `/api/chats/${chat.id}/messages/${messageId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete message');

      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      throw err;
    }
  }, [chat?.id]);

  // Initialize chat on mount or when chatId/agentId changes
  useEffect(() => {
    initChat();
  }, [initChat]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!chat?.id) return;

    const channel = supabase
      .channel(`chat:${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload: { new: ChatMessage }) => {
          setMessages(current => {
            // Check if message already exists
            if (current.find(m => m.id === payload.new.id)) {
              return current;
            }
            // Add new message
            return [...current, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload: { old: ChatMessage }) => {
          setMessages(current =>
            current.filter(m => m.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chat?.id, supabase]);

  return {
    chat,
    messages,
    loading,
    error,
    hasMore,
    sending,
    sendMessage,
    loadMore,
    deleteMessage,
  };
}

/**
 * Hook for listing all chats for the current user
 */
export function useChats() {
  const supabase = createClient();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chats');
      if (!response.ok) throw new Error('Failed to fetch chats');
      const { chats: fetchedChats } = await response.json();
      setChats(fetchedChats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch chats'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Subscribe to chat updates
  useEffect(() => {
    const channel = supabase
      .channel(`user_chats:${DEMO_TENANT_ID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `tenant_id=eq.${DEMO_TENANT_ID}`,
        },
        () => {
          // Refetch chats when any change occurs
          fetchChats();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, fetchChats]);

  return { chats, loading, error, refetch: fetchChats };
}
