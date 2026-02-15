'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronDown, Trash2, Bookmark, Search, Download, FileText, FileJson, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn, formatRelativeTime, getAvatarColor, getInitials, getAgentStatusColor } from '@/lib/utils';
import { useChat } from '@/lib/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatInput } from './ChatInput';
import type { ChatMessage } from '@/types';

interface ChatPanelProps {
  chatId: string | null;
  agentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Search Result Type
// ============================================================================

interface SearchResult {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  is_bookmarked: boolean;
  created_at: string;
  rank: number;
  headline: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function ChatPanel({ chatId, agentId, open, onOpenChange }: ChatPanelProps) {
  const {
    chat,
    messages,
    loading,
    error,
    hasMore,
    sending,
    agentResponding,
    agentResponseError,
    sendMessage,
    loadMore,
    deleteMessage,
    retryLastMessage,
  } = useChat({ chatId, agentId });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Bookmark state — tracks toggling in progress
  const [togglingBookmark, setTogglingBookmark] = useState<Set<string>>(new Set());
  // Local bookmark overrides (optimistic updates)
  const [bookmarkOverrides, setBookmarkOverrides] = useState<Map<string, boolean>>(new Map());

  // Show bookmarks only filter
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Reset search when chat changes
  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowBookmarkedOnly(false);
    setBookmarkOverrides(new Map());
  }, [chatId]);

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

  // Search within chat
  const performSearch = useCallback(
    async (query: string) => {
      if (!chat?.id || !query.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const params = new URLSearchParams({ q: query, limit: '20' });
        const response = await fetch(`/api/chats/${chat.id}/messages/search?${params}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data.messages || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [chat?.id]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (!value.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchDebounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    },
    [performSearch]
  );

  // Cleanup search debounce
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Toggle bookmark
  const toggleBookmark = useCallback(
    async (messageId: string, currentBookmarked: boolean) => {
      if (!chat?.id) return;

      setTogglingBookmark((prev) => new Set(prev).add(messageId));
      // Optimistic update
      setBookmarkOverrides((prev) => new Map(prev).set(messageId, !currentBookmarked));

      try {
        const response = await fetch(`/api/chats/${chat.id}/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_bookmarked: !currentBookmarked }),
        });

        if (!response.ok) {
          // Revert optimistic update
          setBookmarkOverrides((prev) => {
            const next = new Map(prev);
            next.delete(messageId);
            return next;
          });
        }
      } catch {
        // Revert optimistic update
        setBookmarkOverrides((prev) => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
      } finally {
        setTogglingBookmark((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
    [chat?.id]
  );

  // Export chat
  const handleExport = useCallback(
    async (format: 'markdown' | 'json' | 'text') => {
      if (!chat?.id) return;
      setExporting(true);

      try {
        const params = new URLSearchParams({
          format,
          bookmarked_only: showBookmarkedOnly ? 'true' : 'false',
        });
        const response = await fetch(`/api/chats/${chat.id}/export?${params}`);

        if (!response.ok) throw new Error('Export failed');

        if (format === 'json') {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          downloadBlob(blob, `chat-export.json`);
        } else {
          const text = await response.text();
          const mimeType = format === 'markdown' ? 'text/markdown' : 'text/plain';
          const ext = format === 'markdown' ? 'md' : 'txt';
          const blob = new Blob([text], { type: mimeType });
          downloadBlob(blob, `chat-export.${ext}`);
        }
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setExporting(false);
      }
    },
    [chat?.id, showBookmarkedOnly]
  );

  // Resolve bookmark status (with optimistic override)
  const isBookmarked = useCallback(
    (message: ChatMessage) => {
      if (bookmarkOverrides.has(message.id)) {
        return bookmarkOverrides.get(message.id)!;
      }
      return message.is_bookmarked || false;
    },
    [bookmarkOverrides]
  );

  // Filter messages if bookmark filter is active
  const displayedMessages = showBookmarkedOnly
    ? messages.filter((m) => isBookmarked(m))
    : messages;

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

            <div className="flex items-center gap-1">
              {/* Search toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={searchOpen ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => {
                        setSearchOpen(!searchOpen);
                        if (searchOpen) {
                          setSearchQuery('');
                          setSearchResults([]);
                        }
                      }}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search messages</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Bookmark filter toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showBookmarkedOnly ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
                    >
                      <Bookmark className={cn('h-4 w-4', showBookmarkedOnly && 'fill-current')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showBookmarkedOnly ? 'Show all messages' : 'Show bookmarked only'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Export dropdown */}
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={exporting}>
                          {exporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Export transcript</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('markdown')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('text')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as Plain Text
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <FileJson className="h-4 w-4 mr-2" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Close */}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Search bar */}
        {searchOpen && (
          <div className="px-4 py-2 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search in conversation..."
                className="pl-9 h-9"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {searchQuery.trim() && !searching && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
        )}

        {/* Search results */}
        {searchOpen && searchQuery.trim() && searchResults.length > 0 ? (
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-3">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // Close search and scroll to message
                    setSearchOpen(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    // Find the message in the messages list and scroll to it
                    const el = document.getElementById(`msg-${result.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                      setTimeout(() => {
                        el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                      }, 2000);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {result.role === 'user' ? 'You' : agentName}
                    </span>
                    <div className="flex items-center gap-2">
                      {result.is_bookmarked && (
                        <Bookmark className="h-3 w-3 fill-current text-yellow-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(result.created_at)}
                      </span>
                    </div>
                  </div>
                  <div
                    className="text-sm line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: result.headline || result.content.slice(0, 200) }}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <>
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
              ) : displayedMessages.length === 0 ? (
                showBookmarkedOnly ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Bookmark className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium mb-1">No bookmarked messages</p>
                    <p className="text-xs text-muted-foreground">
                      Bookmark messages by clicking the bookmark icon.
                    </p>
                  </div>
                ) : (
                  <ChatEmptyState agentName={agentName} />
                )
              ) : (
                <div className="space-y-4">
                  {hasMore && !showBookmarkedOnly && (
                    <div className="text-center py-2">
                      <span className="text-xs text-muted-foreground">Loading more...</span>
                    </div>
                  )}
                  {displayedMessages.map((message, index) => (
                    <ChatMessageBubble
                      key={message.id}
                      message={message}
                      isUser={message.role === 'user'}
                      agentName={agentName}
                      agentAvatar={agentAvatar}
                      showAvatar={
                        index === 0 ||
                        displayedMessages[index - 1]?.role !== message.role
                      }
                      isBookmarked={isBookmarked(message)}
                      isTogglingBookmark={togglingBookmark.has(message.id)}
                      onToggleBookmark={() => toggleBookmark(message.id, isBookmarked(message))}
                      onDelete={() => deleteMessage(message.id)}
                    />
                  ))}
                  {/* Agent responding indicator */}
                  {agentResponding && (
                    <AgentTypingIndicator agentName={agentName} agentAvatar={agentAvatar} />
                  )}
                  {/* Agent response error */}
                  {agentResponseError && (
                    <AgentResponseError
                      error={agentResponseError}
                      onRetry={retryLastMessage}
                    />
                  )}
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
          </>
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

// ============================================================================
// Message Bubble
// ============================================================================

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  agentName?: string;
  agentAvatar?: string;
  showAvatar: boolean;
  isBookmarked: boolean;
  isTogglingBookmark: boolean;
  onToggleBookmark: () => void;
  onDelete: () => void;
}

function ChatMessageBubble({
  message,
  isUser,
  agentName,
  agentAvatar,
  showAvatar,
  isBookmarked,
  isTogglingBookmark,
  onToggleBookmark,
  onDelete,
}: ChatMessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        'flex gap-3 group rounded-lg transition-all duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
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

          {/* Bookmark (always visible when bookmarked, hover for all) */}
          {(showActions || isBookmarked) && (
            <button
              onClick={onToggleBookmark}
              disabled={isTogglingBookmark}
              className={cn(
                'transition-colors',
                isBookmarked
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-muted-foreground hover:text-yellow-500'
              )}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark message'}
            >
              <Bookmark className={cn('h-3 w-3', isBookmarked && 'fill-current')} />
            </button>
          )}

          {isUser && showActions && (
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

// ============================================================================
// Helper Components
// ============================================================================

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

/**
 * Agent typing indicator
 */
function AgentTypingIndicator({
  agentName,
  agentAvatar,
}: {
  agentName: string;
  agentAvatar?: string;
}) {
  return (
    <div className="flex gap-3 flex-row">
      <div className="flex-shrink-0 w-8">
        <Avatar className="h-8 w-8">
          <AvatarImage src={agentAvatar} />
          <AvatarFallback
            className={cn('text-white text-xs', getAvatarColor(agentName))}
          >
            {getInitials(agentName)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex flex-col items-start max-w-[75%]">
        <div className="rounded-2xl px-4 py-3 text-sm bg-muted text-foreground rounded-bl-md">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">{agentName} is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Agent response error
 */
function AgentResponseError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="flex gap-3 flex-row">
      <div className="flex-shrink-0 w-8" />
      <div className="flex flex-col items-start max-w-[75%]">
        <div className="rounded-2xl px-4 py-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-2">
              <span className="text-sm">Failed to get response: {error.message}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8 gap-1 self-start"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
