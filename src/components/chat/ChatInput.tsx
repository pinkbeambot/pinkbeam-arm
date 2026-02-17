'use client';

import { useState, useCallback, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  maxLength = 4000,
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!content.trim() || disabled) return;

    onSend(content.trim());
    setContent('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= maxLength) {
        setContent(value);
      }

      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    },
    [maxLength]
  );

  const charCount = content.length;
  const isOverLimit = charCount > maxLength * 0.9;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'min-h-[48px] sm:min-h-[44px] max-h-[120px] sm:max-h-[150px] resize-none py-3 px-3 sm:px-4 text-sm sm:text-base',
            'focus-visible:ring-1 focus-visible:ring-ring rounded-xl'
          )}
          style={{ height: 'auto' }}
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          size="icon"
          className="h-12 w-12 sm:h-11 sm:w-11 flex-shrink-0 rounded-xl min-h-[48px] min-w-[48px]"
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <Send className="h-5 w-5 sm:h-4 sm:w-4" />
          )}
        </Button>
      </div>

      {/* Character count and hint row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
          Press Enter to send, Shift+Enter for new line
        </span>
        <span
          className={cn(
            'text-[10px] sm:text-xs ml-auto',
            isOverLimit ? 'text-amber-500' : 'text-muted-foreground'
          )}
        >
          {charCount}/{maxLength}
        </span>
      </div>
    </div>
  );
}
