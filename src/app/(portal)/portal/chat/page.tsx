/**
 * Optimized Chat Page
 * 
 * Uses lazy loading for the heavy ChatPanel component.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Bot, Search, X, Bookmark, Loader2 } from 'lucide-react';
import { PortalLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { useChats } from '@/lib/hooks/useChat';
import { useAgentsRealtime } from '@/lib/hooks/useAgents';
import { useTenant } from '@/lib/hooks/useTenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatRelativeTime, getAvatarColor, getInitials } from '@/lib/utils';
import type { Chat, ChatSearchResult } from '@/types';

// LAZY LOAD: ChatPanel is heavy due to TipTap editor and realtime subscriptions
import { ChatPanelLazy } from '@/lib/performance/lazy-components';

export default function ChatPage() {
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenant();
  const { chats, loading: chatsLoading } = useChats();
  const { agents, loading: agentsLoading } = useAgentsRealtime(tenantId);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAgentFilter, setSearchAgentFilter] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<ChatSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenChat = (chatId?: string, agentId?: string) => {
    setSelectedChatId(chatId || null);
    setSelectedAgentId(agentId || null);
    setChatOpen(true);
  };

  // Global search across all chats
  const performGlobalSearch = useCallback(
    async (query: string, agentId?: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setSearching(false);
        setSearchActive(false);
        return;
      }

      setSearching(true);
      setSearchActive(true);
      try {
        const params = new URLSearchParams({ q: query, limit: '20' });
        if (agentId && agentId !== 'all') {
          params.set('agent_id', agentId);
        }
        const response = await fetch(`/api/chats/search?${params}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data.messages || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    []
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
        setSearchActive(false);
        return;
      }
      setSearching(true);
      searchDebounceRef.current = setTimeout(() => {
        performGlobalSearch(value, searchAgentFilter);
      }, 300);
    },
    [performGlobalSearch, searchAgentFilter]
  );

  const handleAgentFilterChange = useCallback(
    (value: string) => {
      setSearchAgentFilter(value);
      if (searchQuery.trim()) {
        performGlobalSearch(searchQuery, value);
      }
    },
    [searchQuery, performGlobalSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchActive(false);
    setSearchAgentFilter('all');
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
  }, []);

  // Cleanup search debounce
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const loading = chatsLoading || agentsLoading || tenantLoading;

  // Get unique agents from chats for the filter dropdown
  const chatAgents = chats
    .filter((c) => c.agent)
    .map((c) => c.agent!)
    .filter((agent, i, arr) => arr.findIndex((a) => a.id === agent.id) === i);

  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Chat"
          description="Communicate with your AI workforce."
        />

        {tenantError && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              Tenant error: {tenantError.message}
            </p>
          </div>
        )}

        {/* Global Search Bar */}
        <Card className="mb-6">
          <CardContent className="py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={searchAgentFilter} onValueChange={handleAgentFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {chatAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchActive && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Results
                {!searching && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({searchResults.length} result{searchResults.length !== 1 ? 's' : ''})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searching ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Searching...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No messages found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <GlobalSearchResult
                        key={result.id}
                        result={result}
                        onClick={() => handleOpenChat(result.chat_id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Chats */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Active Conversations
              </CardTitle>
              <CardDescription>
                Your ongoing conversations with agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ChatsLoadingSkeleton />
              ) : chats.length === 0 ? (
                <EmptyChatsState />
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {chats.map((chat) => (
                      <ChatListItem
                        key={chat.id}
                        chat={chat}
                        onClick={() => handleOpenChat(chat.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Start New Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Start New Chat
              </CardTitle>
              <CardDescription>
                Start a conversation with any agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <AgentsLoadingSkeleton />
              ) : agents.length === 0 ? (
                <EmptyAgentsState />
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {agents.map((agent) => (
                      <AgentListItem
                        key={agent.id}
                        agent={agent}
                        onClick={() => handleOpenChat(undefined, agent.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Panel - LAZY LOADED */}
        <ChatPanelLazy
          chatId={selectedChatId}
          agentId={selectedAgentId || undefined}
          open={chatOpen}
          onOpenChange={setChatOpen}
        />
      </PageContainer>
    </PortalLayout>
  );
}

// ============================================================================
// Global Search Result
// ============================================================================

interface GlobalSearchResultProps {
  result: ChatSearchResult;
  onClick: () => void;
}

function GlobalSearchResult({ result, onClick }: GlobalSearchResultProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
    >
      <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
        <AvatarImage src={result.agent_avatar || undefined} />
        <AvatarFallback
          className={cn('text-white text-xs', getAvatarColor(result.agent_name))}
        >
          {getInitials(result.agent_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {result.role === 'user' ? 'You' : result.agent_name}
            </span>
            {result.is_bookmarked && (
              <Bookmark className="h-3 w-3 fill-current text-yellow-500" />
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatRelativeTime(result.created_at)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {result.snippet}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Chat with {result.agent_name}
        </p>
      </div>
    </button>
  );
}

// ============================================================================
// Chat List Item
// ============================================================================

interface ChatListItemProps {
  chat: Chat;
  onClick: () => void;
}

function ChatListItem({ chat, onClick }: ChatListItemProps) {
  const agent = chat.agent;
  const hasUnread = chat.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-muted focus:bg-muted focus:outline-none',
        hasUnread && 'bg-primary/5'
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={agent?.avatar_url} />
        <AvatarFallback
          className={cn('text-white text-sm', getAvatarColor(agent?.name || 'Agent'))}
        >
          {getInitials(agent?.name || 'Agent')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{agent?.name}</span>
          {chat.last_message_at && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatRelativeTime(chat.last_message_at)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {chat.last_message || 'No messages yet'}
        </p>
      </div>

      {hasUnread && (
        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
          {chat.unread_count}
        </span>
      )}
    </button>
  );
}

interface AgentListItemProps {
  agent: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
    status: string;
  };
  onClick: () => void;
}

function AgentListItem({ agent, onClick }: AgentListItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={agent.avatar_url} />
        <AvatarFallback
          className={cn('text-white text-sm', getAvatarColor(agent.name))}
        >
          {getInitials(agent.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm block truncate">{agent.name}</span>
        <span className="text-xs text-muted-foreground capitalize">{agent.role}</span>
      </div>

      <Button variant="ghost" size="sm">
        <MessageSquare className="h-4 w-4" />
      </Button>
    </button>
  );
}

function ChatsLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentsLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyChatsState() {
  return (
    <div className="text-center py-12">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground">No conversations yet</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Start chatting with an agent from the list on the right.
      </p>
    </div>
  );
}

function EmptyAgentsState() {
  return (
    <div className="text-center py-12">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <Bot className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground">No agents available</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Create an agent first to start chatting.
      </p>
    </div>
  );
}
