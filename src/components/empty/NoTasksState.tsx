'use client';

import { ClipboardList, Plus, ListTodo } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NoTasksStateProps {
  /** Called when user clicks create task button */
  onCreateTask?: () => void;
  /** URL to navigate to for creating task */
  createHref?: string;
  /** Optional description override */
  description?: string;
  /** Optional title override */
  title?: string;
  /** Variant - default, compact, or card */
  variant?: 'default' | 'compact' | 'card';
  /** Custom className */
  className?: string;
  /** Filter context - shows different message when filtered */
  filterActive?: boolean;
  /** Called when clearing filters */
  onClearFilters?: () => void;
}

/**
 * NoTasksState - Empty state when no tasks exist
 * 
 * Shows a friendly empty state encouraging users to create their first task.
 * Adapts messaging based on whether filters are active.
 * 
 * @example
 * ```tsx
 * <NoTasksState 
 *   onCreateTask={() => setShowCreateModal(true)}
 * />
 * 
 * // When filters are active
 * <NoTasksState 
 *   filterActive={searchQuery !== ''}
 *   onClearFilters={() => setSearchQuery('')}
 * />
 * ```
 */
export function NoTasksState({
  onCreateTask,
  createHref = '/portal/tasks/new',
  description,
  title,
  variant = 'default',
  className,
  filterActive = false,
  onClearFilters,
}: NoTasksStateProps) {
  const defaultTitle = filterActive ? 'No tasks match your filters' : 'No tasks yet';
  const defaultDescription = filterActive
    ? 'Try adjusting your filters or search criteria to find what you\'re looking for.'
    : 'Create your first task to start tracking work and delegating to agents.';

  const displayTitle = title || defaultTitle;
  const displayDescription = description || defaultDescription;

  if (variant === 'compact') {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="font-medium text-foreground mb-1">{displayTitle}</h4>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
          {displayDescription}
        </p>
        {filterActive && onClearFilters ? (
          <Button size="sm" variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        ) : (
          <Button size="sm" onClick={onCreateTask} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn('p-8 text-center border-dashed', className)}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10"
        >
          <ListTodo className="h-8 w-8 text-blue-500" />
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          {displayDescription}
        </p>
        {filterActive && onClearFilters ? (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        ) : (
          <Button onClick={onCreateTask} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
        className="text-center"
      >
        {/* Animated Icon */}
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
        >
          <ClipboardList className="h-10 w-10 text-blue-500" />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-semibold text-foreground mb-3"
        >
          {displayTitle}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground max-w-md mx-auto mb-8"
        >
          {displayDescription}
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          {filterActive && onClearFilters ? (
            <Button
              size="lg"
              variant="outline"
              onClick={onClearFilters}
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={onCreateTask}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Task
            </Button>
          )}
        </motion.div>

        {/* Secondary hint */}
        {!filterActive && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-sm text-muted-foreground"
          >
            Tasks help you track work and can be assigned to agents for execution
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

export default NoTasksState;
