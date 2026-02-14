'use client';

import { useState } from 'react';
import { MessageSquare, Bot } from 'lucide-react';
import { PortalLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { ChatPanel } from '@/components/chat';
import { useChats } from '@/lib/hooks/useChat';
import { useAgentsRealtime } from '@/lib/hooks/useAgents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatRelativeTime, getAvatarColor, getInitials } from '@/lib/utils';
import type { Chat } from '@/types';

// Demo tenant ID - in production, this would come from auth context
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export default function ChatPage() {
  const { chats, loading: chatsLoading } = useChats();
  const { agents, loading: agentsLoading } = useAgentsRealtime(DEMO_TENANT_ID);
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const handleOpenChat = (chatId?: string, agentId?: string) => {
    setSelectedChatId(chatId || null);
    setSelectedAgentId(agentId || null);
    setChatOpen(true);
  };

  const loading = chatsLoading || agentsLoading;

  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Chat"
          description="Communicate with your AI workforce."
        />

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

        {/* Chat Panel */}
        <ChatPanel
          chatId={selectedChatId}
          agentId={selectedAgentId || undefined}
          open={chatOpen}
          onOpenChange={setChatOpen}
        />
      </PageContainer>
    </PortalLayout>
  );
}

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
