'use client';

/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, Bookmark, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { cn, getAvatarColor, getInitials } from '@/lib/utils';
import { useChat } from '@/lib/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAutoScroll, useBookmarks, useExport } from './hooks';
import { ChatHeader } from './ChatHeader';
import { ChatSearch } from './ChatSearch';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  chatId: string | null;
  agentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  const { scrollRef, showScrollButton, handleScroll, scrollToBottom, setAutoScroll } =
    useAutoScroll({ messages, hasMore, loading, loadMore });

  const {
    togglingBookmark,
    showBookmarkedOnly,
    setShowBookmarkedOnly,
    toggleBookmark,
    isBookmarked,
    resetBookmarks,
  } = useBookmarks({ chatId: chat?.id ?? null });

  const { exporting, exportChat } = useExport({
    chatId: chat?.id ?? null,
    showBookmarkedOnly,
  });

  const [searchOpen, setSearchOpen] = useState(false);
  const [showingSearchResults, setShowingSearchResults] = useState(false);

  // Reset when chat changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setSearchOpen(false);
    resetBookmarks();
  }, [chatId, resetBookmarks]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage(content);
        setAutoScroll(true);
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [sendMessage, setAutoScroll]
  );

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
        className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col" 
        side="right"
      >
        <SheetTitle className="sr-only">Chat with {agentName}</SheetTitle>
        <ChatHeader
          agentName={agentName}
          agentAvatar={agentAvatar}
          agentStatus={agentStatus}
          loading={loading}
          error={error}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen((prev) => !prev)}
          showBookmarkedOnly={showBookmarkedOnly}
          onToggleBookmarks={() => setShowBookmarkedOnly((prev) => !prev)}
          exporting={exporting}
          onExport={exportChat}
          onClose={() => onOpenChange(false)}
        />

        <ChatSearch
          chatId={chat?.id ?? null}
          open={searchOpen}
          agentName={agentName}
          onShowingResults={setShowingSearchResults}
        />

        {!showingSearchResults && (
          <>
            <ScrollArea
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 px-3 sm:px-4 py-4"
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
                  {agentResponding && (
                    <AgentTypingIndicator agentName={agentName} agentAvatar={agentAvatar} />
                  )}
                  {agentResponseError && (
                    <AgentResponseError error={agentResponseError} onRetry={retryLastMessage} />
                  )}
                </div>
              )}
            </ScrollArea>

            {showScrollButton && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full shadow-lg z-10"
                onClick={scrollToBottom}
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                New messages
              </Button>
            )}
          </>
        )}

        <div className="border-t p-3 sm:p-4 flex-shrink-0 bg-background">
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
// Helper Components
// ============================================================================

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
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-sm font-medium mb-2">Failed to load chat</p>
      <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
      <Button size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}

function ChatEmptyState({ agentName }: { agentName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <Avatar className="h-12 w-12 mb-3">
        <AvatarFallback className={cn('text-white', getAvatarColor(agentName))}>
          {getInitials(agentName)}
        </AvatarFallback>
      </Avatar>
      <p className="text-sm font-medium mb-1">Start a conversation</p>
      <p className="text-xs text-muted-foreground">
        Send a message to {agentName} to begin chatting.
      </p>
    </div>
  );
}

function AgentTypingIndicator({
  agentName,
  agentAvatar,
}: {
  agentName: string;
  agentAvatar?: string;
}) {
  return (
    <div className="flex gap-2 sm:gap-3 flex-row">
      <div className="flex-shrink-0 w-7 sm:w-8">
        <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
          <AvatarImage src={agentAvatar} />
          <AvatarFallback
            className={cn('text-white text-[10px] sm:text-xs', getAvatarColor(agentName))}
          >
            {getInitials(agentName)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex flex-col items-start max-w-[80%] sm:max-w-[75%]">
        <div className="rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-sm bg-muted text-foreground rounded-bl-md">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-muted-foreground" />
            <span className="text-xs sm:text-sm text-muted-foreground">{agentName} is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentResponseError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="flex gap-2 sm:gap-3 flex-row">
      <div className="flex-shrink-0 w-7 sm:w-8" />
      <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%]">
        <div className="rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-2">
              <span className="text-xs sm:text-sm">Failed to get response: {error.message}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 sm:h-8 gap-1 self-start text-xs"
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
