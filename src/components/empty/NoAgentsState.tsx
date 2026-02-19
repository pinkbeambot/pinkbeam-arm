'use client';

import { Bot, Plus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NoAgentsStateProps {
  /** Called when user clicks create agent button */
  onCreateAgent?: () => void;
  /** URL to navigate to for creating agent */
  createHref?: string;
  /** Optional description override */
  description?: string;
  /** Optional title override */
  title?: string;
  /** Variant - default or compact for inline usage */
  variant?: 'default' | 'compact' | 'card';
  /** Custom className */
  className?: string;
  /** Whether user has permission to create agents */
  canCreate?: boolean;
}

/**
 * NoAgentsState - Empty state when no agents exist
 * 
 * Shows a friendly empty state encouraging users to create their first agent.
 * Used in agent list views when the user has no agents yet.
 * 
 * @example
 * ```tsx
 * <NoAgentsState 
 *   onCreateAgent={() => setShowCreateModal(true)}
 *   canCreate={user.canCreateAgents}
 * />
 * 
 * // Compact version for inline usage
 * <NoAgentsState variant="compact" createHref="/agents/new" />
 * ```
 */
export function NoAgentsState({
  onCreateAgent,
  createHref = '/portal/agents/new',
  description = 'Create your first AI agent to start delegating tasks and automating your workflow.',
  title = 'No agents yet',
  variant = 'default',
  className,
  canCreate = true,
}: NoAgentsStateProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
          <Bot className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="font-medium text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
          {description}
        </p>
        {canCreate && (
          <Button
            size="sm"
            onClick={onCreateAgent}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Agent
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
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-500/10"
        >
          <Sparkles className="h-8 w-8 text-pink-500" />
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          {description}
        </p>
        {canCreate && (
          <Button
            onClick={onCreateAgent}
            className="gap-2 bg-pink-500 hover:bg-pink-600"
          >
            <Plus className="h-4 w-4" />
            Create Your First Agent
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
            y: [0, -5, 0],
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20"
        >
          <Bot className="h-10 w-10 text-pink-500" />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-semibold text-foreground mb-3"
        >
          {title}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground max-w-md mx-auto mb-8"
        >
          {description}
        </motion.p>

        {/* CTA */}
        {canCreate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              size="lg"
              onClick={onCreateAgent}
              className="gap-2 bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-shadow"
            >
              <Plus className="h-5 w-5" />
              Create Your First Agent
            </Button>
          </motion.div>
        )}

        {/* Secondary hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-sm text-muted-foreground"
        >
          Agents can make decisions, execute tasks, and collaborate with your team
        </motion.p>
      </motion.div>
    </div>
  );
}

export default NoAgentsState;
