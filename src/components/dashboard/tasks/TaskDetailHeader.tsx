'use client';

import {
  Edit2,
  Trash2,
  MoreHorizontal,
  Save,
  Loader2,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskDetailHeaderProps {
  task: Task;
  isEditing: boolean;
  editedTitle: string;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onTitleChange: (title: string) => void;
}

export function TaskDetailHeader({
  task,
  isEditing,
  editedTitle,
  saving,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onTitleChange,
}: TaskDetailHeaderProps) {
  return (
    <DialogHeader className="px-6 py-4 border-b">
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-4">
          {isEditing ? (
            <Input
              value={editedTitle}
              onChange={(e) => onTitleChange(e.target.value)}
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
            <span className="text-muted-foreground">&bull;</span>
            <span className="text-xs text-muted-foreground">
              Created {formatDateTime(task.created_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
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
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
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
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
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
  );
}
