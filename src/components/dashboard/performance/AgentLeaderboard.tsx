'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Medal,
  Trophy,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AgentPerformance, LeaderboardSortField, SortDirection } from './types';

interface AgentLeaderboardProps {
  agents: AgentPerformance[];
  className?: string;
  onAgentClick?: (agent: AgentPerformance) => void;
}

interface SortConfig {
  field: LeaderboardSortField;
  direction: SortDirection;
}

const rankMedals = {
  1: { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  2: { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  3: { icon: Award, color: 'text-amber-600', bg: 'bg-amber-600/10' },
};

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

export function AgentLeaderboard({ 
  agents, 
  className,
  onAgentClick 
}: AgentLeaderboardProps) {
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    field: 'rank',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const handleSort = (field: LeaderboardSortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedAgents = React.useMemo(() => {
    const sorted = [...agents];
    sorted.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortConfig.field) {
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        case 'tasksCompleted':
          aValue = a.tasksCompleted;
          bValue = b.tasksCompleted;
          break;
        case 'avgCompletionTime':
          aValue = a.avgCompletionTime;
          bValue = b.avgCompletionTime;
          break;
        case 'successRate':
          aValue = a.successRate;
          bValue = b.successRate;
          break;
        case 'escalationRate':
          aValue = a.escalationRate;
          bValue = b.escalationRate;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
    return sorted;
  }, [agents, sortConfig]);

  const totalPages = Math.ceil(sortedAgents.length / itemsPerPage);
  const paginatedAgents = sortedAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderSortIcon = (field: LeaderboardSortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4 text-primary" />
      : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Agent Leaderboard</span>
          <span className="text-sm font-normal text-muted-foreground">
            {agents.length} agents
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('rank')}
                    className="h-8 px-2"
                  >
                    Rank
                    {renderSortIcon('rank')}
                  </Button>
                </TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('tasksCompleted')}
                    className="h-8 px-2"
                  >
                    Tasks
                    {renderSortIcon('tasksCompleted')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('avgCompletionTime')}
                    className="h-8 px-2"
                  >
                    Avg Time
                    {renderSortIcon('avgCompletionTime')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('successRate')}
                    className="h-8 px-2"
                  >
                    Success
                    {renderSortIcon('successRate')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSort('escalationRate')}
                    className="h-8 px-2"
                  >
                    Escalations
                    {renderSortIcon('escalationRate')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAgents.map((agent) => {
                const rankConfig = rankMedals[agent.rank as keyof typeof rankMedals];
                const RankIcon = rankConfig?.icon;

                return (
                  <TableRow 
                    key={agent.agent.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      "hover:bg-muted/50"
                    )}
                    onClick={() => onAgentClick?.(agent)}
                  >
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {RankIcon ? (
                          <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full",
                            rankConfig.bg
                          )}>
                            <RankIcon className={cn("h-4 w-4", rankConfig.color)} />
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            #{agent.rank}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={agent.agent.avatar_url} alt={agent.agent.name} />
                          <AvatarFallback>{agent.agent.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{agent.agent.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {agent.agent.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{agent.tasksCompleted}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({agent.tasksFailed} failed)
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatTime(agent.avgCompletionTime)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={agent.successRate >= 95 ? 'default' : agent.successRate >= 90 ? 'secondary' : 'destructive'}
                        className="font-mono"
                      >
                        {agent.successRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-sm",
                        agent.escalationRate > 10 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {agent.escalationRate.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
