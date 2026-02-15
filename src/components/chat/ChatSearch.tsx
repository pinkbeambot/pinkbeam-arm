'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, Bookmark } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface ChatSearchProps {
  chatId: string | null;
  open: boolean;
  agentName: string;
  onShowingResults: (showing: boolean) => void;
}

export function ChatSearch({ chatId, open, agentName, onShowingResults }: ChatSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when chat changes or search panel closes/opens
  useEffect(() => {
    setSearchQuery('');
    setSearchResults([]);
    onShowingResults(false);
  }, [chatId, open, onShowingResults]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Update parent about results state
  useEffect(() => {
    const showing = open && searchQuery.trim().length > 0 && searchResults.length > 0;
    onShowingResults(showing);
  }, [open, searchQuery, searchResults, onShowingResults]);

  const performSearch = useCallback(
    async (query: string) => {
      if (!chatId || !query.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const params = new URLSearchParams({ q: query, limit: '20' });
        const response = await fetch(`/api/chats/${chatId}/messages/search?${params}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data.messages || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [chatId]
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

  const handleResultClick = useCallback((resultId: string) => {
    setSearchQuery('');
    setSearchResults([]);
    // Find the message in the DOM and scroll to it
    const el = document.getElementById(`msg-${resultId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 2000);
    }
  }, []);

  if (!open) return null;

  const showingResults = searchQuery.trim().length > 0 && searchResults.length > 0;

  return (
    <>
      {/* Search bar */}
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

      {/* Search results */}
      {showingResults && (
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-3">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleResultClick(result.id)}
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
      )}
    </>
  );
}
