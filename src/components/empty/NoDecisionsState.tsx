'use client';

import { Brain, Lightbulb, GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NoDecisionsStateProps {
  /** Called when user clicks to view decision log */
  onViewLog?: () => void;
  /** URL to navigate to for viewing all decisions */
  viewHref?: string;
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
  /** Context for the empty state */
  context?: 'dashboard' | 'agent' | 'global';
}

/**
 * NoDecisionsState - Empty state when no decisions exist
 * 
 * Shows a friendly empty state explaining that decisions will appear
 * as agents make them. Adapts messaging based on context and filters.
 * 
 * @example
 * ```tsx
 * <NoDecisionsState 
 *   onViewLog={() => router.push('/decisions')}
 *   context="dashboard"
 * />
 * 
 * // For a specific agent
 * <NoDecisionsState 
 *   context="agent"
 *   description="This agent hasn't made any decisions yet."
 * />
 * ```
 */
export function NoDecisionsState({
  onViewLog,
  viewHref = '/portal/decisions',
  description,
  title,
  variant = 'default',
  className,
  filterActive = false,
  onClearFilters,
  context = 'global',
}: NoDecisionsStateProps) {
  const getContextualContent = () => {
    if (filterActive) {
      return {
        title: title || 'No decisions match your filters',
        description: description || 'Try adjusting your filters or date range to find decisions.',
      };
    }

    switch (context) {
      case 'agent':
        return {
          title: title || 'No decisions yet',
          description: description || 'This agent will appear here when they make their first decision.',
        };
      case 'dashboard':
        return {
          title: title || 'No recent decisions',
          description: description || 'Decisions made by your agents will appear here in real-time.',
        };
      default:
        return {
          title: title || 'No decisions yet',
          description: description || 'Decisions made by your agents will appear here. Assign tasks to agents to see their decision-making in action.',
        };
    }
  };

  const { title: displayTitle, description: displayDescription } = getContextualContent();

  if (variant === 'compact') {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
          <Brain className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="font-medium text-foreground mb-1">{displayTitle}</h4>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
          {displayDescription}
        </p>
        {filterActive && onClearFilters ? (
          <Button size="sm" variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        ) : onViewLog ? (
          <Button size="sm" variant="outline" onClick={onViewLog} className="gap-2">
            <GitBranch className="h-4 w-4" />
            View All
          </Button>
        ) : null}
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
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10"
        >
          <Lightbulb className="h-8 w-8 text-amber-500" />
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          {displayDescription}
        </p>
        {filterActive && onClearFilters ? (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        ) : onViewLog ? (
          <Button variant="outline" onClick={onViewLog} className="gap-2">
            <GitBranch className="h-4 w-4" />
            View Decision Log
          </Button>
        ) : null}
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
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20"
        >
          <Brain className="h-10 w-10 text-amber-500" />
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
          ) : onViewLog ? (
            <Button
              size="lg"
              variant="outline"
              onClick={onViewLog}
              className="gap-2"
            >
              <GitBranch className="h-5 w-5" />
              View Decision Log
            </Button>
          ) : null}
        </motion.div>

        {/* Secondary hint */}
        {!filterActive && context !== 'agent' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-sm text-muted-foreground"
          >
            Decisions are recorded when agents take action or make choices
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

export default NoDecisionsState;
