'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Flag, 
  AlignLeft, 
  CheckSquare,
  Edit2,
  Trash2,
  MoreHorizontal,
  Save,
  Loader2
} from 'lucide-react';
import { cn, formatDate, formatDateTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority, Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (task: Task) => void;
  loading?: boolean;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'queued', label: 'Backlog', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { value: 'review', label: 'Review', color: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'failed', label: 'Failed', color: 'bg-red-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-400' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
];

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  agents,
  onUpdate,
  onDelete,
  loading,
}: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [saving, setSaving] = useState(false);

  // Reset edit state when task changes
  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigned_agent_id: task.assigned_agent_id,
        due_date: task.due_date,
        acceptance_criteria: task.acceptance_criteria,
      });
      setIsEditing(false);
    }
  }, [task, isOpen]);

  if (!task) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(task.id, editedTask);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    onDelete(task);
    onClose();
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === (isEditing ? editedTask.status : task.status));
  const currentPriority = PRIORITY_OPTIONS.find(p => p.value === (isEditing ? editedTask.priority : task.priority));
  const assignedAgent = agents.find(a => a.id === (isEditing ? editedTask.assigned_agent_id : task.assigned_agent_id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              {isEditing ? (
                <Input
                  value={editedTask.title || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                  className="text-lg font-semibold"
                  placeholder="Task title"
                />
              ) : (
                <DialogTitle className="text-lg font-semibold leading-tight">
                  {task.title}
                </DialogTitle>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">ID: {task.id.slice(0, 8)}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  Created {formatDateTime(task.created_at)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Task
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Status & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Status</Label>
                {isEditing ? (
                  <Select
                    value={editedTask.status}
                    onValueChange={(value: TaskStatus) => setEditedTask({ ...editedTask, status: value })}
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
                    onValueChange={(value: TaskPriority) => setEditedTask({ ...editedTask, priority: value })}
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
                  onValueChange={(value) => setEditedTask({ ...editedTask, assigned_agent_id: value === 'unassigned' ? undefined : value })}
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
                        <AvatarFallback className={cn('text-xs text-white', getAvatarColor(assignedAgent.id))}>
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
                  onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {task.due_date 
                      ? formatDate(task.due_date) 
                      : <span className="text-muted-foreground">No due date</span>
                    }
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
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
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
                  onChange={(e) => setEditedTask({ 
                    ...editedTask, 
                    acceptance_criteria: e.target.value.split('\n').filter(Boolean) 
                  })}
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
            <Separator />
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase">Timeline</Label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p>{formatDateTime(task.created_at)}</p>
                </div>
                {task.started_at && (
                  <div>
                    <span className="text-muted-foreground">Started:</span>
                    <p>{formatDateTime(task.started_at)}</p>
                  </div>
                )}
                {task.completed_at && (
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <p>{formatDateTime(task.completed_at)}</p>
                  </div>
                )}
                {task.estimated_duration && (
                  <div>
                    <span className="text-muted-foreground">Estimated Duration:</span>
                    <p>{task.estimated_duration} minutes</p>
                  </div>
                )}
                {task.actual_duration && (
                  <div>
                    <span className="text-muted-foreground">Actual Duration:</span>
                    <p>{task.actual_duration} minutes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
