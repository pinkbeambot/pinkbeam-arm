"use client";

import { EmptyState } from "./EmptyState";
import {
  Bot,
  CheckSquare,
  MessageSquare,
  AlertTriangle,
  FileText,
  Users,
  Search,
  Inbox,
  Bell,
  Settings,
  Calendar,
  BarChart3,
  Shield,
  Zap,
  FolderOpen,
  Mail,
} from "lucide-react";

// ============================================================================
// Agent Roster Empty States
// ============================================================================

/**
 * Empty state for when no agents exist yet
 */
export function EmptyStateNoAgents({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={Bot}
      title="No agents yet"
      description="Create your first AI agent to start delegating tasks and automating your workflow."
      action={{ label: "Create Agent", onClick: onCreate }}
    />
  );
}

/**
 * Empty state for agent search with no results
 */
export function EmptyStateNoAgentResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No agents found"
      description="Try adjusting your search or filters to find what you're looking for."
      action={{ label: "Clear Filters", onClick: onClear }}
    />
  );
}

/**
 * Empty state for agent's children/spawned agents
 */
export function EmptyStateNoChildAgents({ parentName }: { parentName?: string }) {
  return (
    <EmptyState
      icon={Users}
      title="No spawned agents"
      description={parentName ? `${parentName} hasn't spawned any child agents yet.` : "This agent hasn't spawned any child agents yet."}
    />
  );
}

// ============================================================================
// Task Pipeline Empty States
// ============================================================================

/**
 * Empty state for when no tasks exist
 */
export function EmptyStateNoTasks({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={CheckSquare}
      title="No tasks yet"
      description="Create your first task to get started. Tasks can be assigned to agents and tracked through completion."
      action={{ label: "Create Task", onClick: onCreate }}
    />
  );
}

/**
 * Empty state for task search with no results
 */
export function EmptyStateNoTaskResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No tasks found"
      description="Try adjusting your search or filters to find what you're looking for."
      action={{ label: "Clear Filters", onClick: onClear }}
    />
  );
}

/**
 * Empty state for empty kanban column
 */
export function EmptyStateEmptyColumn({ status }: { status?: string }) {
  const statusText = status ? ` in ${status}` : "";
  return (
    <EmptyState
      icon={FolderOpen}
      title={`No tasks${statusText}`}
      description="Tasks will appear here when they're moved to this stage."
      className="p-8 border-dashed border-2"
    />
  );
}

// ============================================================================
// Escalation Inbox Empty States
// ============================================================================

/**
 * Empty state for when no escalations exist
 */
export function EmptyStateNoEscalations() {
  return (
    <EmptyState
      icon={Inbox}
      title="No escalations"
      description="Great news! All your agents are handling their tasks smoothly. Escalations appear here when agents need your attention."
    />
  );
}

/**
 * Empty state for resolved escalations
 */
export function EmptyStateNoResolvedEscalations() {
  return (
    <EmptyState
      icon={Shield}
      title="No resolved escalations"
      description="Resolved escalations will appear here."
    />
  );
}

/**
 * Empty state for filtered escalation view with no results
 */
export function EmptyStateNoEscalationResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No escalations found"
      description="Try adjusting your filters to see more results."
      action={{ label: "Clear Filters", onClick: onClear }}
    />
  );
}

// ============================================================================
// Activity Feed Empty States
// ============================================================================

/**
 * Empty state for activity feed
 */
export function EmptyStateNoActivity() {
  return (
    <EmptyState
      icon={Zap}
      title="No activity yet"
      description="Activity from your agents will appear here. This includes task updates, decisions, and escalations."
    />
  );
}

/**
 * Empty state for filtered activity
 */
export function EmptyStateNoActivityResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No activity found"
      description="Try adjusting your filters to see more results."
      action={{ label: "Clear Filters", onClick: onClear }}
    />
  );
}

// ============================================================================
// Decision Log Empty States
// ============================================================================

/**
 * Empty state for decision log
 */
export function EmptyStateNoDecisions() {
  return (
    <EmptyState
      icon={FileText}
      title="No decisions yet"
      description="Agent decisions that require approval will appear here. This creates an audit trail of all important choices."
    />
  );
}

/**
 * Empty state for pending decisions
 */
export function EmptyStateNoPendingDecisions() {
  return (
    <EmptyState
      icon={Shield}
      title="No pending decisions"
      description="All caught up! Decisions requiring your approval will appear here."
    />
  );
}

// ============================================================================
// Chat/Conversation Empty States
// ============================================================================

/**
 * Empty state for chat when no messages exist
 */
export function EmptyStateNoMessages({ onStart }: { onStart?: () => void }) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages yet"
      description="Start a conversation with this agent. You can ask questions, give instructions, or request updates."
      action={{ label: "Send Message", onClick: onStart }}
    />
  );
}

/**
 * Empty state for empty conversation list
 */
export function EmptyStateNoConversations({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={Mail}
      title="No conversations"
      description="Start a conversation with one of your agents."
      action={{ label: "New Conversation", onClick: onCreate }}
    />
  );
}

// ============================================================================
// Notification Empty States
// ============================================================================

/**
 * Empty state for notifications
 */
export function EmptyStateNoNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications"
      description="You're all caught up! Notifications appear here when something needs your attention."
    />
  );
}

/**
 * Empty state for notification history
 */
export function EmptyStateNoNotificationHistory() {
  return (
    <EmptyState
      icon={Calendar}
      title="No notification history"
      description="Old notifications will appear here after they've been dismissed."
    />
  );
}

// ============================================================================
// Search Empty States
// ============================================================================

/**
 * Generic empty search state
 */
export function EmptyStateSearch({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title={query ? `No results for "${query}"` : "No results found"}
      description="Try a different search term or check your spelling."
      action={{ label: "Clear Search", onClick: onClear }}
    />
  );
}

// ============================================================================
// Dashboard Empty States
// ============================================================================

/**
 * Empty state for analytics/charts with no data
 */
export function EmptyStateNoAnalytics() {
  return (
    <EmptyState
      icon={BarChart3}
      title="No data yet"
      description="Analytics will appear here once you have agents running and completing tasks."
    />
  );
}

/**
 * Empty state for time range with no data
 */
export function EmptyStateNoDataForRange({ range }: { range?: string }) {
  return (
    <EmptyState
      icon={Calendar}
      title={range ? `No data for ${range}` : "No data for this period"}
      description="Try selecting a different time range to see analytics."
    />
  );
}

// ============================================================================
// Error/Access Empty States
// ============================================================================

/**
 * Empty state for 404/not found
 */
export function EmptyStateNotFound({ onBack }: { onBack?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      action={{ label: "Go Back", onClick: onBack }}
    />
  );
}

/**
 * Empty state for access denied
 */
export function EmptyStateAccessDenied({ onContact }: { onContact?: () => void }) {
  return (
    <EmptyState
      icon={Shield}
      title="Access denied"
      description="You don't have permission to view this resource."
      action={{ label: "Contact Support", onClick: onContact }}
    />
  );
}

/**
 * Empty state for offline/disconnected
 */
export function EmptyStateOffline({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="You're offline"
      description="Please check your internet connection and try again."
      action={{ label: "Retry", onClick: onRetry }}
    />
  );
}

// ============================================================================
// Settings Empty States
// ============================================================================

/**
 * Empty state for settings section
 */
export function EmptyStateNoSettings() {
  return (
    <EmptyState
      icon={Settings}
      title="No settings available"
      description="Settings for this feature will appear here when available."
    />
  );
}

/**
 * Empty state for integrations
 */
export function EmptyStateNoIntegrations({ onConnect }: { onConnect?: () => void }) {
  return (
    <EmptyState
      icon={Zap}
      title="No integrations yet"
      description="Connect your favorite tools to extend your agents' capabilities."
      action={{ label: "Connect Integration", onClick: onConnect }}
    />
  );
}

/**
 * Empty state for team members
 */
export function EmptyStateNoTeamMembers({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No team members"
      description="Invite team members to collaborate on your AI workforce."
      action={{ label: "Invite Member", onClick: onInvite }}
    />
  );
}
