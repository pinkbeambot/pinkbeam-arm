'use client';

import { useState, useCallback } from 'react';
import type { ChatMessage } from '@/types';

interface UseBookmarksOptions {
  chatId: string | null;
}

export function useBookmarks({ chatId }: UseBookmarksOptions) {
  const [togglingBookmark, setTogglingBookmark] = useState<Set<string>>(new Set());
  const [bookmarkOverrides, setBookmarkOverrides] = useState<Map<string, boolean>>(new Map());
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  const resetBookmarks = useCallback(() => {
    setShowBookmarkedOnly(false);
    setBookmarkOverrides(new Map());
  }, []);

  const toggleBookmark = useCallback(
    async (messageId: string, currentBookmarked: boolean) => {
      if (!chatId) return;

      setTogglingBookmark((prev) => new Set(prev).add(messageId));
      // Optimistic update
      setBookmarkOverrides((prev) => new Map(prev).set(messageId, !currentBookmarked));

      try {
        const response = await fetch(`/api/chats/${chatId}/messages/${messageId}`, {
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
    [chatId]
  );

  const isBookmarked = useCallback(
    (message: ChatMessage) => {
      if (bookmarkOverrides.has(message.id)) {
        return bookmarkOverrides.get(message.id)!;
      }
      return message.is_bookmarked || false;
    },
    [bookmarkOverrides]
  );

  return {
    togglingBookmark,
    showBookmarkedOnly,
    setShowBookmarkedOnly,
    toggleBookmark,
    isBookmarked,
    resetBookmarks,
  };
}
