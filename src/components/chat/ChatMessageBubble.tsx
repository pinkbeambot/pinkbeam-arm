'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Trash2, Bookmark } from 'lucide-react';
import { cn, formatRelativeTime, getAvatarColor, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ChatMessage } from '@/types';

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

export function ChatMessageBubble({
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
        'flex gap-2 sm:gap-3 group rounded-lg transition-all duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onTouchStart={() => setShowActions(true)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 sm:w-8">
        {showAvatar ? (
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
            {!isUser && <AvatarImage src={agentAvatar} />}
            <AvatarFallback
              className={cn(
                'text-white text-[10px] sm:text-xs',
                isUser ? 'bg-primary' : getAvatarColor(agentName || 'Agent')
              )}
            >
              {isUser ? 'You' : getInitials(agentName || 'Agent')}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7 sm:w-8" />
        )}
      </div>

      {/* Message */}
      <div className={cn('flex flex-col max-w-[80%] sm:max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm',
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
                p: ({ children }) => <p className="m-0 whitespace-pre-wrap text-sm">{children}</p>,
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
                      "px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono",
                      isUser
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/20 text-foreground"
                    )}>
                      {children}
                    </code>
                  ) : (
                    <pre className={cn(
                      "p-2 sm:p-3 rounded-lg overflow-x-auto my-2 text-xs",
                      isUser
                        ? "bg-primary-foreground/10"
                        : "bg-muted-foreground/10"
                    )}>
                      <code className="text-[10px] sm:text-xs font-mono">{children}</code>
                    </pre>
                  );
                },
                ul: ({ children }) => <ul className="list-disc pl-3 sm:pl-4 my-1 text-sm">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-3 sm:pl-4 my-1 text-sm">{children}</ol>,
                li: ({ children }) => <li className="my-0.5 text-sm">{children}</li>,
                h1: ({ children }) => <h1 className="text-base sm:text-lg font-bold my-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm sm:text-base font-bold my-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold my-1">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className={cn(
                    "border-l-2 pl-2 sm:pl-3 my-2 italic text-sm",
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
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {formatRelativeTime(message.created_at)}
          </span>

          {/* Bookmark (always visible when bookmarked, hover for all) */}
          {(showActions || isBookmarked) && (
            <button
              onClick={onToggleBookmark}
              disabled={isTogglingBookmark}
              className={cn(
                'transition-colors p-1 rounded min-h-[24px] min-w-[24px] flex items-center justify-center',
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
              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded min-h-[24px] min-w-[24px] flex items-center justify-center"
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
