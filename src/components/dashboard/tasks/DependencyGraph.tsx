'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  Handle,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowUpCircle, Circle, CheckCircle2, Clock, Lock, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Layout helpers ───────────────────────────────────────────────

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;

interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: string;
}

// Simple layered layout using topological sort
function layoutNodes(
  tasks: Task[],
  dependencies: TaskDependency[]
): { x: number; y: number; id: string }[] {
  const taskIds = new Set(tasks.map((t) => t.id));
  // Build adjacency: depends_on -> task (upstream -> downstream)
  const outgoing = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of taskIds) {
    outgoing.set(id, []);
    inDegree.set(id, 0);
  }

  for (const dep of dependencies) {
    if (!taskIds.has(dep.task_id) || !taskIds.has(dep.depends_on_task_id)) continue;
    outgoing.get(dep.depends_on_task_id)!.push(dep.task_id);
    inDegree.set(dep.task_id, (inDegree.get(dep.task_id) || 0) + 1);
  }

  // Topological sort (Kahn's) to assign layers
  const layers: string[][] = [];
  let queue = [...taskIds].filter((id) => (inDegree.get(id) || 0) === 0);

  while (queue.length > 0) {
    layers.push(queue);
    const next: string[] = [];
    for (const id of queue) {
      for (const child of outgoing.get(id) || []) {
        const deg = (inDegree.get(child) || 1) - 1;
        inDegree.set(child, deg);
        if (deg === 0) next.push(child);
      }
    }
    queue = next;
  }

  // Place any remaining tasks (cycles) in a final layer
  const placed = new Set(layers.flat());
  const remaining = [...taskIds].filter((id) => !placed.has(id));
  if (remaining.length > 0) {
    layers.push(remaining);
  }

  const positions: { x: number; y: number; id: string }[] = [];
  const layerGap = 200;
  const nodeGap = 120;

  for (let col = 0; col < layers.length; col++) {
    const layer = layers[col];
    const totalHeight = layer.length * NODE_HEIGHT + (layer.length - 1) * nodeGap;
    const startY = -totalHeight / 2;

    for (let row = 0; row < layer.length; row++) {
      positions.push({
        id: layer[row],
        x: col * (NODE_WIDTH + layerGap),
        y: startY + row * (NODE_HEIGHT + nodeGap),
      });
    }
  }

  return positions;
}

// ─── Status / priority configs ────────────────────────────────────

const STATUS_COLORS: Record<TaskStatus, { bg: string; border: string; text: string; minimap: string }> = {
  queued: { bg: 'bg-gray-500/10', border: 'border-gray-500', text: 'text-gray-600 dark:text-gray-400', minimap: '#6b7280' },
  in_progress: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', minimap: '#3b82f6' },
  blocked: { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-600 dark:text-red-400', minimap: '#ef4444' },
  review: { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', minimap: '#f59e0b' },
  completed: { bg: 'bg-green-500/10', border: 'border-green-500', text: 'text-green-600 dark:text-green-400', minimap: '#22c55e' },
  failed: { bg: 'bg-red-600/10', border: 'border-red-600', text: 'text-red-700 dark:text-red-500', minimap: '#dc2626' },
  cancelled: { bg: 'bg-gray-400/10', border: 'border-gray-400', text: 'text-gray-500 dark:text-gray-500', minimap: '#9ca3af' },
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  queued: <Circle className="w-3.5 h-3.5" />,
  in_progress: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  blocked: <Lock className="w-3.5 h-3.5" />,
  review: <Clock className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  failed: <AlertCircle className="w-3.5 h-3.5" />,
  cancelled: <Circle className="w-3.5 h-3.5" />,
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  queued: 'Backlog',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  review: 'Review',
  completed: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const PRIORITY_ICONS: Record<TaskPriority, React.ReactNode> = {
  urgent: <AlertCircle className="w-3 h-3 text-red-500" />,
  high: <ArrowUpCircle className="w-3 h-3 text-orange-500" />,
  normal: <Circle className="w-3 h-3 text-blue-500" />,
  low: <Circle className="w-3 h-3 text-gray-400" />,
};

// ─── Custom Node ──────────────────────────────────────────────────

interface TaskNodeData {
  task: Task;
  highlighted: boolean;
  dimmed: boolean;
  onTaskClick?: (task: Task) => void;
  [key: string]: unknown;
}

function TaskNode({ data }: NodeProps<Node<TaskNodeData>>) {
  const { task, highlighted, dimmed, onTaskClick } = data;
  const status = STATUS_COLORS[task.status] || STATUS_COLORS.queued;

  return (
    <div
      onClick={() => onTaskClick?.(task)}
      className={cn(
        'rounded-lg border-2 px-3 py-2 w-[240px] cursor-pointer transition-all duration-200',
        status.bg,
        status.border,
        highlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg scale-105',
        dimmed && 'opacity-30',
        !highlighted && !dimmed && 'hover:shadow-md'
      )}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-muted-foreground !border-background" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-muted-foreground !border-background" />

      <div className="flex items-start gap-2">
        <div className={cn('mt-0.5 shrink-0', status.text)}>
          {STATUS_ICONS[task.status]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate text-foreground">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', status.text)}>
              {STATUS_LABELS[task.status]}
            </Badge>
            <span className="flex items-center gap-0.5">
              {PRIORITY_ICONS[task.priority]}
              <span className="text-[10px] text-muted-foreground capitalize">{task.priority}</span>
            </span>
          </div>
          {task.assigned_agent && (
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              {task.assigned_agent.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { task: TaskNode };

// ─── Legend ───────────────────────────────────────────────────────

function GraphLegend() {
  const items: { status: TaskStatus; label: string }[] = [
    { status: 'queued', label: 'Backlog' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'blocked', label: 'Blocked' },
    { status: 'review', label: 'Review' },
    { status: 'completed', label: 'Done' },
    { status: 'failed', label: 'Failed' },
  ];

  return (
    <div className="absolute top-3 right-3 z-10 bg-card/90 backdrop-blur-sm border rounded-lg p-3 shadow-sm">
      <p className="text-xs font-semibold text-foreground mb-2">Status Legend</p>
      <div className="space-y-1">
        {items.map(({ status, label }) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-sm border', STATUS_COLORS[status].bg, STATUS_COLORS[status].border)} />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t">
        <p className="text-[10px] text-muted-foreground">Click a node to highlight its dependency chain</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

interface DependencyGraphProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function DependencyGraph({ tasks, onTaskClick }: DependencyGraphProps) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch all dependencies
  useEffect(() => {
    let cancelled = false;

    async function fetchDeps() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch('/api/v1/tasks/dependencies', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setDependencies(json.data || []);
        }
      } catch {
        // silently fail — graph shows without edges
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDeps();
    return () => { cancelled = true; };
  }, []);

  // Find the full dependency chain for a selected task
  const highlightedIds = useMemo(() => {
    if (!selectedTaskId) return new Set<string>();

    const ids = new Set<string>();
    ids.add(selectedTaskId);

    // Trace upstream (tasks this depends on)
    function traceUpstream(taskId: string) {
      for (const dep of dependencies) {
        if (dep.task_id === taskId && !ids.has(dep.depends_on_task_id)) {
          ids.add(dep.depends_on_task_id);
          traceUpstream(dep.depends_on_task_id);
        }
      }
    }

    // Trace downstream (tasks that depend on this)
    function traceDownstream(taskId: string) {
      for (const dep of dependencies) {
        if (dep.depends_on_task_id === taskId && !ids.has(dep.task_id)) {
          ids.add(dep.task_id);
          traceDownstream(dep.task_id);
        }
      }
    }

    traceUpstream(selectedTaskId);
    traceDownstream(selectedTaskId);
    return ids;
  }, [selectedTaskId, dependencies]);

  const highlightedEdgeIds = useMemo(() => {
    if (!selectedTaskId) return new Set<string>();

    const edgeIds = new Set<string>();
    for (const dep of dependencies) {
      if (highlightedIds.has(dep.task_id) && highlightedIds.has(dep.depends_on_task_id)) {
        edgeIds.add(dep.id);
      }
    }
    return edgeIds;
  }, [selectedTaskId, dependencies, highlightedIds]);

  // Build nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const positions = layoutNodes(tasks, dependencies);
    const posMap = new Map(positions.map((p) => [p.id, p]));

    const nodes: Node<TaskNodeData>[] = tasks.map((task) => {
      const pos = posMap.get(task.id) || { x: 0, y: 0 };
      const isHighlighted = selectedTaskId ? highlightedIds.has(task.id) : false;
      const isDimmed = selectedTaskId ? !highlightedIds.has(task.id) : false;

      return {
        id: task.id,
        type: 'task',
        position: { x: pos.x, y: pos.y },
        data: {
          task,
          highlighted: isHighlighted,
          dimmed: isDimmed,
          onTaskClick: handleNodeClick,
        },
      };
    });

    const taskIdSet = new Set(tasks.map((t) => t.id));
    const edges: Edge[] = dependencies
      .filter((dep) => taskIdSet.has(dep.task_id) && taskIdSet.has(dep.depends_on_task_id))
      .map((dep) => {
        const isHighlighted = selectedTaskId ? highlightedEdgeIds.has(dep.id) : false;
        const targetTask = tasks.find((t) => t.id === dep.task_id);
        const isBlocking = dep.dependency_type === 'blocks' && targetTask?.status === 'blocked';

        return {
          id: dep.id,
          source: dep.depends_on_task_id,
          target: dep.task_id,
          type: 'smoothstep',
          animated: isBlocking,
          style: {
            stroke: isHighlighted
              ? 'hsl(var(--primary))'
              : isBlocking
                ? '#ef4444'
                : 'hsl(var(--muted-foreground))',
            strokeWidth: isHighlighted ? 2.5 : 1.5,
            opacity: selectedTaskId && !isHighlighted ? 0.15 : 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isHighlighted
              ? 'hsl(var(--primary))'
              : isBlocking
                ? '#ef4444'
                : 'hsl(var(--muted-foreground))',
            width: 16,
            height: 16,
          },
          label: dep.dependency_type === 'blocks' ? 'blocks' : undefined,
          labelStyle: {
            fontSize: 10,
            fill: 'hsl(var(--muted-foreground))',
          },
        };
      });

    return { initialNodes: nodes, initialEdges: edges };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dependencies, selectedTaskId, highlightedIds, highlightedEdgeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (task: Task) => {
      setSelectedTaskId((prev) => (prev === task.id ? null : task.id));
      onTaskClick?.(task);
    },
    [onTaskClick]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const minimapNodeColor = useCallback((node: Node) => {
    const data = node.data as TaskNodeData;
    if (data?.task) {
      return STATUS_COLORS[data.task.status]?.minimap || '#6b7280';
    }
    return '#6b7280';
  }, []);

  // Stats
  const stats = useMemo(() => {
    const blockedCount = tasks.filter((t) => t.status === 'blocked').length;
    const withDeps = new Set(dependencies.map((d) => d.task_id));
    const tasksWithDeps = tasks.filter((t) => withDeps.has(t.id)).length;
    return { blockedCount, tasksWithDeps, totalDeps: dependencies.length };
  }, [tasks, dependencies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading dependency graph...</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
        <Circle className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm">No tasks to display</p>
        <p className="text-xs mt-1">Create tasks and add dependencies to see them here</p>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full border rounded-lg overflow-hidden bg-background">
      {/* Stats bar */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <Badge variant="outline" className="text-xs bg-card/90 backdrop-blur-sm">
          {tasks.length} tasks
        </Badge>
        <Badge variant="outline" className="text-xs bg-card/90 backdrop-blur-sm">
          {stats.totalDeps} dependencies
        </Badge>
        {stats.blockedCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {stats.blockedCount} blocked
          </Badge>
        )}
      </div>

      <GraphLegend />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="hsl(var(--background) / 0.8)"
          className="!bg-card !border"
        />
      </ReactFlow>
    </div>
  );
}
