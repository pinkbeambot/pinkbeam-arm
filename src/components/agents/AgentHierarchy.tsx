"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Agent, AgentStatus } from "@/types";
import { AgentStatusDot } from "@/components/agents";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  Network,
  Users,
  List,
  GitBranch,
} from "lucide-react";

export interface AgentHierarchyProps {
  agents: Agent[];
  selectedAgentId?: string | null;
  onSelectAgent?: (agent: Agent) => void;
  className?: string;
  maxDepth?: number;
  showStats?: boolean;
  viewMode?: "tree" | "org" | "list";
  onViewModeChange?: (mode: "tree" | "org" | "list") => void;
}

export interface AgentHierarchyNodeProps {
  agent: Agent;
  agents: Agent[];
  depth: number;
  selectedAgentId?: string | null;
  onSelectAgent?: (agent: Agent) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  maxDepth: number;
}

export interface AgentHierarchyStats {
  totalAgents: number;
  maxDepth: number;
  rootAgents: number;
  leafAgents: number;
  avgChildrenPerAgent: number;
  agentsByDepth: Record<number, number>;
  agentsByRole: Record<string, number>;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
    "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function calculateHierarchyStats(agents: Agent[]): AgentHierarchyStats {
  const totalAgents = agents.length;
  const maxDepth = Math.max(...agents.map((a) => a.depth || 0), 0);
  const rootAgents = agents.filter((a) => !a.parent_id).length;
  const leafAgents = agents.filter(
    (a) => !agents.some((child) => child.parent_id === a.id)
  ).length;

  const childrenCount = agents.reduce((acc, agent) => {
    const children = agents.filter((a) => a.parent_id === agent.id).length;
    return acc + children;
  }, 0);
  const avgChildrenPerAgent = totalAgents > 0 ? childrenCount / totalAgents : 0;

  const agentsByDepth = agents.reduce((acc, agent) => {
    const depth = agent.depth || 0;
    acc[depth] = (acc[depth] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const agentsByRole = agents.reduce((acc, agent) => {
    const role = agent.role || "unknown";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return { totalAgents, maxDepth, rootAgents, leafAgents, avgChildrenPerAgent, agentsByDepth, agentsByRole };
}

function AgentHierarchyNode({ agent, agents, depth, selectedAgentId, onSelectAgent, expandedIds, onToggleExpand, maxDepth }: AgentHierarchyNodeProps) {
  const children = useMemo(() => agents.filter((a) => a.parent_id === agent.id), [agents, agent.id]);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(agent.id);
  const isSelected = selectedAgentId === agent.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(agent.id);
  };

  const handleClick = () => onSelectAgent?.(agent);

  const depthColors = ["border-blue-500", "border-indigo-500", "border-violet-500", "border-purple-500", "border-fuchsia-500", "border-pink-500", "border-rose-500"];
  const borderColor = depthColors[depth % depthColors.length];

  return (
    <div className="relative">
      {depth > 0 && <div className="absolute left-0 top-1/2 w-4 h-px bg-border -translate-x-full" aria-hidden="true" />}
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1">
          {hasChildren ? (
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleToggle} aria-label={isExpanded ? "Collapse" : "Expand"}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : <div className="w-6" />}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleClick} className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-all text-left",
                  "hover:shadow-md hover:border-primary/50",
                  isSelected ? "border-primary bg-primary/5 shadow-md" : `border-transparent bg-card ${borderColor}`,
                  depth === 0 && "bg-gradient-to-r from-primary/5 to-transparent"
                )}>
                  <Avatar className="h-10 w-10 shrink-0">
                    {agent.avatar_url ? <AvatarImage src={agent.avatar_url} alt={agent.name} /> : null}
                    <AvatarFallback className={cn("text-white text-sm font-medium", getAvatarColor(agent.name))}>
                      {getInitials(agent.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{agent.name}</span>
                      <AgentStatusDot status={agent.status} size="sm" pulse={agent.status === "active"} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs capitalize">{agent.role}</Badge>
                      {hasChildren && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{children.length}</span>}
                    </div>
                  </div>
                  {depth === 0 && <Badge variant="outline" className="text-xs ml-2">Root</Badge>}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{agent.role} • Depth {agent.depth || 0}</p>
                  {agent.description && <p className="text-sm">{agent.description}</p>}
                  {hasChildren && <p className="text-sm text-muted-foreground">{children.length} direct subordinate{children.length !== 1 ? "s" : ""}</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {hasChildren && isExpanded && (
          <div className="flex flex-col gap-2 mt-2 pl-4 border-l-2 border-border ml-4">
            {children.map((child) => <AgentHierarchyNode key={child.id} agent={child} agents={agents} depth={depth + 1} selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} expandedIds={expandedIds} onToggleExpand={onToggleExpand} maxDepth={maxDepth} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function OrgChartView({ agents, selectedAgentId, onSelectAgent }: Omit<AgentHierarchyProps, "viewMode" | "onViewModeChange">) {
  const rootAgents = useMemo(() => agents.filter((a) => !a.parent_id), [agents]);

  const renderOrgNode = (agent: Agent, level: number) => {
    const children = agents.filter((a) => a.parent_id === agent.id);
    const isSelected = selectedAgentId === agent.id;

    return (
      <div key={agent.id} className="flex flex-col items-center">
        <button onClick={() => onSelectAgent?.(agent)} className={cn(
          "flex flex-col items-center p-4 rounded-lg border-2 transition-all min-w-[160px]",
          "hover:shadow-lg hover:border-primary/50",
          isSelected ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card"
        )}>
          <Avatar className="h-12 w-12 mb-2">
            {agent.avatar_url ? <AvatarImage src={agent.avatar_url} alt={agent.name} /> : null}
            <AvatarFallback className={cn("text-white", getAvatarColor(agent.name))}>{getInitials(agent.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm text-center">{agent.name}</span>
          <Badge variant="secondary" className="text-xs capitalize mt-1">{agent.role}</Badge>
          <AgentStatusDot status={agent.status} size="sm" className="mt-2" pulse={agent.status === "active"} />
        </button>
        {children.length > 0 && (
          <div className="mt-8 relative">
            <div className="absolute top-0 left-1/2 w-px h-4 bg-border -translate-x-1/2 -translate-y-full" />
            <div className="absolute top-0 h-px bg-border -translate-y-full" style={{ left: `${50 / children.length}%`, right: `${50 / children.length}%` }} />
            <div className="flex gap-4">
              {children.map((child) => <div key={child.id} className="relative"><div className="absolute top-0 left-1/2 w-px h-4 bg-border -translate-x-1/2 -translate-y-full" />{renderOrgNode(child, level + 1)}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-8 min-w-max">
        {rootAgents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No agents in hierarchy</p>
            <p className="text-sm">Create agents to build your organization</p>
          </div>
        ) : <div className="flex gap-16 justify-center">{rootAgents.map((agent) => renderOrgNode(agent, 0))}</div>}
      </div>
    </ScrollArea>
  );
}

function ListView({ agents, selectedAgentId, onSelectAgent }: Omit<AgentHierarchyProps, "viewMode" | "onViewModeChange">) {
  const sortedAgents = useMemo(() => [...agents].sort((a, b) => { const depthDiff = (a.depth || 0) - (b.depth || 0); return depthDiff !== 0 ? depthDiff : a.name.localeCompare(b.name); }), [agents]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-4">
        {sortedAgents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          const hasParent = !!agent.parent_id;
          const indent = (agent.depth || 0) * 24;
          return (
            <button key={agent.id} onClick={() => onSelectAgent?.(agent)} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left", "hover:bg-accent", isSelected && "bg-accent")} style={{ paddingLeft: `${12 + indent}px` }}>
              {hasParent && <div className="flex items-center text-muted-foreground"><div className="w-4 h-px bg-border" /><div className="w-px h-4 bg-border -ml-px mb-2" /></div>}
              <Avatar className="h-8 w-8 shrink-0">
                {agent.avatar_url ? <AvatarImage src={agent.avatar_url} alt={agent.name} /> : null}
                <AvatarFallback className={cn("text-white text-xs", getAvatarColor(agent.name))}>{getInitials(agent.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-medium truncate">{agent.name}</span><AgentStatusDot status={agent.status} size="sm" pulse={agent.status === "active"} /></div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Badge variant="secondary" className="text-xs capitalize">{agent.role}</Badge><span>•</span><span>Depth {agent.depth || 0}</span></div>
              </div>
            </button>
          );
        })}
        {sortedAgents.length === 0 && <div className="text-center py-12 text-muted-foreground"><List className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No agents found</p></div>}
      </div>
    </ScrollArea>
  );
}

function HierarchyStats({ agents }: { agents: Agent[] }) {
  const stats = useMemo(() => calculateHierarchyStats(agents), [agents]);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="text-center"><div className="text-2xl font-bold">{stats.totalAgents}</div><div className="text-sm text-muted-foreground">Total Agents</div></div>
      <div className="text-center"><div className="text-2xl font-bold">{stats.maxDepth + 1}</div><div className="text-sm text-muted-foreground">Hierarchy Levels</div></div>
      <div className="text-center"><div className="text-2xl font-bold">{stats.rootAgents}</div><div className="text-sm text-muted-foreground">Root Agents</div></div>
      <div className="text-center"><div className="text-2xl font-bold">{stats.avgChildrenPerAgent.toFixed(1)}</div><div className="text-sm text-muted-foreground">Avg Children</div></div>
    </div>
  );
}

export function AgentHierarchy({ agents, selectedAgentId, onSelectAgent, className, maxDepth = 10, showStats = true, viewMode = "tree", onViewModeChange }: AgentHierarchyProps) {
  const [internalViewMode, setInternalViewMode] = useState<"tree" | "org" | "list">(viewMode);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(agents.map((a) => a.id)));

  const currentViewMode = onViewModeChange ? viewMode : internalViewMode;

  const handleViewModeChange = (mode: "tree" | "org" | "list") => {
    if (onViewModeChange) onViewModeChange(mode);
    else setInternalViewMode(mode);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const rootAgents = useMemo(() => agents.filter((a) => !a.parent_id), [agents]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2"><Network className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold">Agent Hierarchy</h3><Badge variant="secondary">{agents.length}</Badge></div>
        <div className="flex items-center gap-2">
          <Button variant={currentViewMode === "tree" ? "default" : "outline"} size="sm" onClick={() => handleViewModeChange("tree")}><GitBranch className="h-4 w-4 mr-1" />Tree</Button>
          <Button variant={currentViewMode === "org" ? "default" : "outline"} size="sm" onClick={() => handleViewModeChange("org")}><Network className="h-4 w-4 mr-1" />Org</Button>
          <Button variant={currentViewMode === "list" ? "default" : "outline"} size="sm" onClick={() => handleViewModeChange("list")}><List className="h-4 w-4 mr-1" />List</Button>
        </div>
      </div>
      {showStats && <HierarchyStats agents={agents} />}
      <div className="flex-1 min-h-0">
        {currentViewMode === "tree" && (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {rootAgents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Network className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No agents in hierarchy</p><p className="text-sm">Create agents to build your organization</p></div>
              ) : rootAgents.map((agent) => <AgentHierarchyNode key={agent.id} agent={agent} agents={agents} depth={0} selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} expandedIds={expandedIds} onToggleExpand={handleToggleExpand} maxDepth={maxDepth} />)}
            </div>
          </ScrollArea>
        )}
        {currentViewMode === "org" && <OrgChartView agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} />}
        {currentViewMode === "list" && <ListView agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} />}
      </div>
    </div>
  );
}

export default AgentHierarchy;
