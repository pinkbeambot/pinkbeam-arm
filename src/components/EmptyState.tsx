"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Users,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  Search,
  type LucideIcon,
} from "lucide-react";

export type EmptyStateIcon =
  | "inbox"
  | "users"
  | "tasks"
  | "messages"
  | "alert"
  | "search";

interface EmptyStateProps {
  icon?: EmptyStateIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const iconMap: Record<EmptyStateIcon, LucideIcon> = {
  inbox: Inbox,
  users: Users,
  tasks: ClipboardList,
  messages: MessageSquare,
  alert: AlertCircle,
  search: Search,
};

/**
 * Empty State Component
 * 
 * Reusable empty state with icon, title, description, and optional CTA.
 * Used for: no agents, no tasks, no activities, no decisions, etc.
 * 
 * @example
 * ```tsx
 * // No agents
 * <EmptyState
 *   icon="users"
 *   title="No agents yet"
 *   description="Create your first agent to get started."
 *   action={{ label: "Create Agent", onClick: () => {} }}
 * />
 * 
 * // No search results
 * <EmptyState
 *   icon="search"
 *   title="No results found"
 *   description="Try adjusting your search terms."
 * />
 * 
 * // No tasks
 * <EmptyState
 *   icon="tasks"
 *   title="All caught up!"
 *   description="No pending tasks at the moment."
 * />
 * ```
 */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8",
        className
      )}
    >
      <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 mb-4">
        <Icon className="h-8 w-8 text-slate-500 dark:text-slate-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
