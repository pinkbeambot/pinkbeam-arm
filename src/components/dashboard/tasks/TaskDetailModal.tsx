'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Task, Agent } from '@/types';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskDetailHeader } from './TaskDetailHeader';
import { TaskDetailContent } from './TaskDetailContent';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (task: Task) => void;
  loading?: boolean;
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  agents,
  onUpdate,
  onDelete,
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

  const handleSave = useCallback(async () => {
    if (!task) return;
    setSaving(true);
    try {
      await onUpdate(task.id, editedTask);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }, [task, editedTask, onUpdate]);

  const handleDelete = useCallback(() => {
    if (!task) return;
    onDelete(task);
    onClose();
  }, [task, onDelete, onClose]);

  const handleFieldChange = useCallback((updates: Partial<Task>) => {
    setEditedTask((prev) => ({ ...prev, ...updates }));
  }, []);

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <TaskDetailHeader
          task={task}
          isEditing={isEditing}
          editedTitle={editedTask.title || ''}
          saving={saving}
          onEdit={() => setIsEditing(true)}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          onDelete={handleDelete}
          onTitleChange={(title) => handleFieldChange({ title })}
        />

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <TaskDetailContent
            task={task}
            isEditing={isEditing}
            editedTask={editedTask}
            agents={agents}
            onFieldChange={handleFieldChange}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
