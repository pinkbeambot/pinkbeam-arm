'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronDown, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn, formatRelativeTime, getAvatarColor, getInitials, getAgentStatusColor } from '@/lib/utils';
import { useChat } from '@/lib/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { ChatInput } from './ChatInput';
import type { ChatMessage } from '@/types';

interface ChatPanelProps {
  chatId: string | null;
  agentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatPanel({ chatId, agentId, open, onOpenChange }: ChatPanelProps) {
  const { chat, messages, loading, error, hasMore, sending, sendMessage, loadMore, deleteMessage } =
    useChat({ chatId, agentId });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;

    setAutoScroll(isNearBottom);
    setShowScrollButton(!isNearBottom);

    // Load more when scrolled to top
    if (scrollTop < 50 && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setAutoScroll(true);
      setShowScrollButton(false);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage(content);
        setAutoScroll(true);
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [sendMessage]
  );

  const agent = chat?.agent;
  const agentName = agent?.name || 'Agent';
  const agentAvatar = agent?.avatar_url;
  const agentStatus = agent?.status || 'idle';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md p-0 flex flex-col"
        side="right"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={agentAvatar} />
                  <AvatarFallback
                    className={cn('text-white text-sm', getAvatarColor(agentName))}
                  >
                    {getInitials(agentName)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                    getAgentStatusColor(agentStatus)
                  )}
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{agentName}</h3>
                <p className="text-xs text-muted-foreground">
                  {loading ? 'Connecting...' : error ? 'Error' : 'Online'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 px-4 py-4"
        >
          {loading && messages.length === 0 ? (
            <ChatLoadingSkeleton />
          ) : error ? (
            <ChatError error={error} onRetry={() => window.location.reload()} />
          ) : messages.length === 0 ? (
            <ChatEmptyState agentName={agentName} />
          ) : (
            <div className="space-y-4">
              {hasMore && (
                <div className="text-center py-2">
                  <span className="text-xs text-muted-foreground">Loading more...</span>
                </div>
              )}
              {messages.map((message, index) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  isUser={message.role === 'user'}
                  agentName={agentName}
                  agentAvatar={agentAvatar}
                  showAvatar={
                    index === 0 ||
                    messages[index - 1]?.role !== message.role
                  }
                  onDelete={() => deleteMessage(message.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            New messages
          </Button>
        )}

        {/* Input */}
        <div className="border-t p-4 flex-shrink-0">
          <ChatInput
            onSend={handleSendMessage}
            disabled={sending || loading}
            placeholder={`Message ${agentName}...`}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  agentName?: string;
  agentAvatar?: string;
  showAvatar: boolean;
  onDelete: () => void;
}

function ChatMessageBubble({
  message,
  isUser,
  agentName,
  agentAvatar,
  showAvatar,
  onDelete,
}: ChatMessageBubbleProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={cn(
        'flex gap-3 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8">
        {showAvatar ? (
          <Avatar className="h-8 w-8">
            {!isUser && <AvatarImage src={agentAvatar} />}
            <AvatarFallback
              className={cn(
                'text-white text-xs',
                isUser ? 'bg-primary' : getAvatarColor(agentName || 'Agent')
              )}
            >
              {isUser ? 'You' : getInitials(agentName || 'Agent')}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Message */}
      <div className={cn('flex flex-col max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          <div className={cn(
            "prose prose-sm max-w-none",
            isUser ? "prose-invert" : "prose-slate dark:prose-invert"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Override default elements for better styling
                p: ({ children }) => <p className="m-0 whitespace-pre-wrap">{children}</p>,
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "underline underline-offset-2",
                      isUser ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:text-primary/80"
                    )}
                  >
                    {children}
                  </a>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className={cn(
                      "px-1.5 py-0.5 rounded text-xs font-mono",
                      isUser
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/20 text-foreground"
                    )}>
                      {children}
                    </code>
                  ) : (
                    <pre className={cn(
                      "p-3 rounded-lg overflow-x-auto my-2",
                      isUser
                        ? "bg-primary-foreground/10"
                        : "bg-muted-foreground/10"
                    )}>
                      <code className="text-xs font-mono">{children}</code>
                    </pre>
                  );
                },
                ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold my-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold my-1">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className={cn(
                    "border-l-2 pl-3 my-2 italic",
                    isUser ? "border-primary-foreground/30" : "border-muted-foreground/30"
                  )}>
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Timestamp and actions */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(message.created_at)}
          </span>

          {isUser && showDelete && (
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Delete message"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn('flex gap-3', i % 2 === 0 ? 'flex-row-reverse' : 'flex-row')}>
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className={cn('space-y-2', i % 2 === 0 ? 'items-end' : 'items-start')}>
            <div className={cn('h-10 w-48 rounded-2xl bg-muted', i % 2 === 0 ? 'rounded-br-md' : 'rounded-bl-md')} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <p className="text-sm text-destructive mb-2">Failed to load chat</p>
      <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
      <Button size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function ChatEmptyState({ agentName }: { agentName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <p className="text-sm font-medium mb-1">Start a conversation</p>
      <p className="text-xs text-muted-foreground">
        Send a message to {agentName} to begin chatting.
      </p>
    </div>
  );
}
