'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  User,
  Loader2,
  Plus,
  Clock,
  Zap,
  AlertCircle,
  ChevronRight,
  History,
  Brain,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatInput } from '@/components/chat/ChatInput';
import { useValis, type ValisMessage } from '@/lib/hooks/useValis';
import type { MetaAgentSession, SuggestedAction } from '@/types/meta-agent';

// ============================================================================
// ValisChat — Main Component
// ============================================================================

export function ValisChat() {
  const {
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
  } = useValis();

  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = (content: string) => {
    sendMessage(content);
  };

  const handleSuggestedAction = (action: SuggestedAction) => {
    if (action.action === 'send_message' && action.params.message) {
      sendMessage(action.params.message as string);
    }
  };

  const handleSuggestedFollowup = (text: string) => {
    sendMessage(text);
  };

  const handleNewSession = async () => {
    await createSession();
    setShowSessions(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Sessions Sidebar (collapsible) */}
      {showSessions && (
        <Card className="w-72 flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />
              Sessions
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNewSession}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sessionsLoading ? (
                <SessionsLoadingSkeleton />
              ) : sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No previous sessions
                </p>
              ) : (
                sessions.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    isActive={session?.id === s.id}
                    onClick={() => {
                      selectSession(s.id);
                      setShowSessions(false);
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSessions(!showSessions)}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              {showSessions ? 'Hide' : 'Sessions'}
            </Button>
            {session && (
              <span className="text-xs text-muted-foreground">
                {session.title || `Session ${session.id.slice(0, 8)}`}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleNewSession} className="gap-2">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <MessagesLoadingSkeleton />
            ) : !hasMessages ? (
              <WelcomeScreen onSuggestion={handleSend} />
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onFollowup={handleSuggestedFollowup}
                  />
                ))}

                {/* Sending indicator */}
                {isSending && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        VALIS is thinking...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Error Banner */}
          {error && (
            <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{error.message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="h-6 px-2 text-xs"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Suggested Actions */}
          {suggestedActions.length > 0 && (
            <div className="mx-4 mb-2 flex flex-wrap gap-2">
              {suggestedActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => handleSuggestedAction(action)}
                >
                  <ChevronRight className="h-3 w-3" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-border p-4">
            <ChatInput
              onSend={handleSend}
              disabled={isSending}
              placeholder="Ask VALIS anything about your workforce..."
              maxLength={2000}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// MessageBubble
// ============================================================================

function MessageBubble({
  message,
  onFollowup,
}: {
  message: ValisMessage;
  onFollowup: (text: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex-shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'flex flex-col max-w-[80%] gap-1',
          isUser && 'items-end'
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-2.5 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(message.content),
              }}
            />
          )}
        </div>

        {/* Metadata */}
        <div
          className={cn(
            'flex items-center gap-2 text-[10px] text-muted-foreground',
            isUser && 'flex-row-reverse'
          )}
        >
          <span>{formatRelativeTime(message.timestamp)}</span>
          {!isUser && message.usedLLM !== undefined && (
            <span className="flex items-center gap-0.5">
              {message.usedLLM ? (
                <>
                  <Brain className="h-2.5 w-2.5" />
                  LLM
                </>
              ) : (
                <>
                  <Zap className="h-2.5 w-2.5" />
                  Regex
                </>
              )}
            </span>
          )}
          {!isUser && message.processingTimeMs !== undefined && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {message.processingTimeMs}ms
            </span>
          )}
        </div>

        {/* Follow-up suggestions */}
        {!isUser && message.suggestedFollowups && message.suggestedFollowups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {message.suggestedFollowups.map((text, idx) => (
              <button
                key={idx}
                onClick={() => onFollowup(text)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-2.5 w-2.5" />
                {text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WelcomeScreen
// ============================================================================

function WelcomeScreen({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const suggestions = [
    {
      label: "What's the status of my workforce?",
      description: 'Get an overview of all agents and their current activities',
    },
    {
      label: 'Show me urgent escalations',
      description: 'See issues that need your immediate attention',
    },
    {
      label: 'How many tasks were completed today?',
      description: 'Check daily task completion metrics',
    },
    {
      label: 'Create a new worker agent',
      description: 'Spawn a new agent to handle specific work',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 shadow-lg shadow-pink-500/20 mb-6">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Welcome to VALIS</h2>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
        Your AI command interface for managing the agent workforce.
        Ask me anything about your agents, tasks, or system status.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => onSuggestion(s.label)}
            className="text-left rounded-lg border border-border p-3 hover:bg-muted transition-colors group"
          >
            <p className="text-sm font-medium group-hover:text-primary transition-colors">
              {s.label}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {s.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SessionItem
// ============================================================================

function SessionItem({
  session,
  isActive,
  onClick,
}: {
  session: MetaAgentSession;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-muted text-foreground'
      )}
    >
      <p className="font-medium truncate text-xs">
        {session.title || `Session ${session.id.slice(0, 8)}`}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {formatRelativeTime(session.last_activity_at || session.created_at)}
        {session.command_count > 0 && ` \u00b7 ${session.command_count} messages`}
      </p>
    </button>
  );
}

// ============================================================================
// Loading Skeletons
// ============================================================================

function MessagesLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn('flex items-start gap-3', i % 2 === 0 && 'flex-row-reverse')}>
          <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          <div className="space-y-2 max-w-[60%]">
            <Skeleton className="h-12 w-48 rounded-lg" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionsLoadingSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5 p-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Simple Markdown Renderer
// ============================================================================

function renderMarkdown(text: string): string {
  // Simple markdown to HTML — handles the most common patterns
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Unordered lists
    .replace(/^\s*[-*\u2022]\s+(.+)$/gm, '<li>$1</li>')
    // Line breaks (double newline = paragraph)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines to <br>
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(
    /(<li>[\s\S]*?<\/li>)(?=\s*(?:<li>|$))/g,
    (match) => match
  );
  html = html.replace(
    /((?:<li>[\s\S]*?<\/li>\s*)+)/g,
    '<ul>$1</ul>'
  );

  // Wrap in paragraph
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<pre')) {
    html = `<p>${html}</p>`;
  }

  return html;
}
