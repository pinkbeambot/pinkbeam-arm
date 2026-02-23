'use client';

import { formatDateTime } from '@/lib/utils';
import type { Task } from '@/types';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface TaskTimelineProps {
  task: Task;
}

export function TaskTimeline({ task }: TaskTimelineProps) {
  return (
    <>
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
    </>
  );
}
