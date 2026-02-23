'use client';

import { User, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { Agent } from '@/types';

interface AgentFilterProps {
  agents: Agent[];
  agentFilter: string | 'all';
  onAgentFilterChange: (agent: string | 'all') => void;
}

export function AgentFilter({ agents, agentFilter, onAgentFilterChange }: AgentFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <User className="h-4 w-4" />
          <span>Agent</span>
          {agentFilter !== 'all' && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              1
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Filter by Agent</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={agentFilter === 'all'}
          onCheckedChange={() => onAgentFilterChange('all')}
        >
          All Agents
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {agents.map((agent) => (
          <DropdownMenuCheckboxItem
            key={agent.id}
            checked={agentFilter === agent.id}
            onCheckedChange={() => onAgentFilterChange(agent.id)}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={agent.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              {agent.name}
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
