'use client';

import {
  Calendar,
  User,
  CheckSquare,
} from 'lucide-react';
import { cn, formatDate, getInitials, getAvatarColor } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority, Agent } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskTimeline } from './TaskTimeline';

export const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'queued', label: 'Backlog', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { value: 'review', label: 'Review', color: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'failed', label: 'Failed', color: 'bg-red-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-400' },
];

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
];

interface TaskDetailContentProps {
  task: Task;
  isEditing: boolean;
  editedTask: Partial<Task>;
  agents: Agent[];
  onFieldChange: (updates: Partial<Task>) => void;
}

export function TaskDetailContent({
  task,
  isEditing,
  editedTask,
  agents,
  onFieldChange,
}: TaskDetailContentProps) {
  const currentStatus = STATUS_OPTIONS.find(
    (s) => s.value === (isEditing ? editedTask.status : task.status)
  );
  const currentPriority = PRIORITY_OPTIONS.find(
    (p) => p.value === (isEditing ? editedTask.priority : task.priority)
  );
  const assignedAgent = agents.find(
    (a) => a.id === (isEditing ? editedTask.assigned_agent_id : task.assigned_agent_id)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Status & Priority Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase">Status</Label>
          {isEditing ? (
            <Select
              value={editedTask.status}
              onValueChange={(value: TaskStatus) => onFieldChange({ status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', option.color)} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', currentStatus?.color)} />
              <span className="font-medium">{currentStatus?.label}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase">Priority</Label>
          {isEditing ? (
            <Select
              value={editedTask.priority}
              onValueChange={(value: TaskPriority) => onFieldChange({ priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', option.color)} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', currentPriority?.color)} />
              <span className="font-medium">{currentPriority?.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase">Assignee</Label>
        {isEditing ? (
          <Select
            value={editedTask.assigned_agent_id || 'unassigned'}
            onValueChange={(value) =>
              onFieldChange({ assigned_agent_id: value === 'unassigned' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                        {getInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                    {agent.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-3">
            {assignedAgent ? (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={assignedAgent.avatar_url || undefined} />
                  <AvatarFallback
                    className={cn('text-xs text-white', getAvatarColor(assignedAgent.id))}
                  >
                    {getInitials(assignedAgent.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{assignedAgent.name}</p>
                  <p className="text-xs text-muted-foreground">{assignedAgent.role}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground">Unassigned</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Due Date */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase">Due Date</Label>
        {isEditing ? (
          <Input
            type="date"
            value={editedTask.due_date ? editedTask.due_date.split('T')[0] : ''}
            onChange={(e) =>
              onFieldChange({
                due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
          />
        ) : (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {task.due_date ? (
                formatDate(task.due_date)
              ) : (
                <span className="text-muted-foreground">No due date</span>
              )}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase">Description</Label>
        {isEditing ? (
          <Textarea
            value={editedTask.description || ''}
            onChange={(e) => onFieldChange({ description: e.target.value })}
            placeholder="Add a description..."
            rows={4}
          />
        ) : (
          <div className="text-sm">
            {task.description ? (
              <p className="whitespace-pre-wrap">{task.description}</p>
            ) : (
              <span className="text-muted-foreground italic">No description</span>
            )}
          </div>
        )}
      </div>

      {/* Acceptance Criteria */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase">Acceptance Criteria</Label>
        {isEditing ? (
          <Textarea
            value={editedTask.acceptance_criteria?.join('\n') || ''}
            onChange={(e) =>
              onFieldChange({
                acceptance_criteria: e.target.value.split('\n').filter(Boolean),
              })
            }
            placeholder="Enter criteria (one per line)..."
            rows={3}
          />
        ) : (
          <div className="text-sm">
            {task.acceptance_criteria && task.acceptance_criteria.length > 0 ? (
              <ul className="space-y-1">
                {task.acceptance_criteria.map((criteria, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground italic">No acceptance criteria</span>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <TaskTimeline task={task} />
    </div>
  );
}
