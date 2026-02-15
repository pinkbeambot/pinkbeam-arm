'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  ListTodo,
  GitPullRequest,
  Activity,
  Search,
  Loader2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface SearchResult {
  id: string;
  type: 'agent' | 'task' | 'decision' | 'activity';
  title: string;
  subtitle: string;
  url: string;
  metadata?: Record<string, string>;
}

interface SearchResponse {
  query: string;
  results: {
    agents: SearchResult[];
    tasks: SearchResult[];
    decisions: SearchResult[];
    activities: SearchResult[];
  };
  total: number;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'arm-recent-searches';
const MAX_RECENT = 5;
const DEBOUNCE_MS = 300;

const TYPE_ICONS: Record<SearchResult['type'], typeof Bot> = {
  agent: Bot,
  task: ListTodo,
  decision: GitPullRequest,
  activity: Activity,
};

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  agent: 'Agents',
  task: 'Tasks',
  decision: 'Decisions',
  activity: 'Activities',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  idle: 'bg-gray-400',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
  completed: 'bg-green-500',
  in_progress: 'bg-blue-500',
  queued: 'bg-gray-400',
  blocked: 'bg-orange-500',
  failed: 'bg-red-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  proposed: 'bg-blue-500',
};

// ============================================================================
// Recent Searches
// ============================================================================

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // localStorage may be unavailable
  }
}

// ============================================================================
// Component
// ============================================================================

export function GlobalSearch() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Load recent searches when dialog opens
  React.useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
    }
  }, [open]);

  // Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search with debounce
  const performSearch = React.useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const params = new URLSearchParams({ q: searchQuery, limit: '5' });
        const response = await fetch(`/api/search?${params}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data: SearchResponse = await response.json();
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  // Handle search input change with debounce
  const handleSearchChange = React.useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (!value.trim()) {
        setResults(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, DEBOUNCE_MS);
    },
    [performSearch]
  );

  // Clean up debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Navigate to result
  const handleSelect = React.useCallback(
    (result: SearchResult) => {
      if (query.trim()) {
        addRecentSearch(query.trim());
      }
      setOpen(false);
      setQuery('');
      setResults(null);
      router.push(result.url);
    },
    [router, query]
  );

  // Use a recent search
  const handleRecentSearch = React.useCallback(
    (search: string) => {
      setQuery(search);
      performSearch(search);
    },
    [performSearch]
  );

  const hasResults =
    results &&
    (results.results.agents.length > 0 ||
      results.results.tasks.length > 0 ||
      results.results.decisions.length > 0 ||
      results.results.activities.length > 0);

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5',
          'text-sm text-muted-foreground transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'w-56 lg:w-64'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Command palette dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <div className="flex items-center border-b border-border px-3">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            )}
            <input
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search agents, tasks, decisions, activities..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <CommandList className="max-h-[400px]">
            {/* Show recent searches when no query */}
            {!query.trim() && recentSearches.length > 0 && (
              <CommandGroup heading="Recent Searches">
                {recentSearches.map((search) => (
                  <CommandItem
                    key={search}
                    value={search}
                    onSelect={() => handleRecentSearch(search)}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{search}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* No results */}
            {query.trim() && !isLoading && results && !hasResults && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            )}

            {/* Results grouped by type */}
            {hasResults &&
              (['agents', 'tasks', 'decisions', 'activities'] as const).map((type, groupIndex) => {
                const items = results!.results[type];
                if (items.length === 0) return null;

                const resultType = type === 'agents' ? 'agent' : type === 'tasks' ? 'task' : type === 'decisions' ? 'decision' : 'activity';
                const Icon = TYPE_ICONS[resultType];

                return (
                  <React.Fragment key={type}>
                    {groupIndex > 0 && <CommandSeparator />}
                    <CommandGroup heading={TYPE_LABELS[resultType]}>
                      {items.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.type}-${item.id}`}
                          onSelect={() => handleSelect(item)}
                        >
                          <Icon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.subtitle}
                            </p>
                          </div>
                          {item.metadata?.status && (
                            <div className="ml-2 flex items-center gap-1.5 shrink-0">
                              <span
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  STATUS_COLORS[item.metadata.status] || 'bg-gray-400'
                                )}
                              />
                              <span className="text-xs text-muted-foreground capitalize">
                                {item.metadata.status.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </React.Fragment>
                );
              })}

            {/* Loading state */}
            {isLoading && query.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
