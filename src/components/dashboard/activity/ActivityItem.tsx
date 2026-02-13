'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityIcon, ActivityTypeBadge } from './ActivityIcon';
import type { ActivityEvent, ActivityItemProps } from './types';

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    // For recent events, show relative time
    if (diffInMinutes < 60) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // For older events, show the time
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

function getEventDescription(event: ActivityEvent): string {
  const { type, metadata, actor, target } = event;
  
  switch (type) {
    case 'task_created':
      return `${actor.name} created task "${metadata.title}"`;
    case 'task_started':
      return `${actor.name} started working on "${target?.name || metadata.title}"`;
    case 'task_completed':
      return `${actor.name} completed "${target?.name || metadata.title}"`;
    case 'task_failed':
      return `${actor.name} failed to complete "${target?.name || metadata.title}"`;
    case 'decision_made':
      return `${actor.name} made a decision: "${metadata.title}"`;
    case 'escalation_created':
      return `${actor.name} needs your help: "${metadata.title}"`;
    case 'escalation_resolved':
      return `Escalation resolved: "${metadata.title}"`;
    case 'agent_spawned':
      return `${actor.name} spawned ${target?.name || 'a new agent'}`;
    case 'agent_terminated':
      return `${target?.name || 'Agent'} was terminated`;
    default:
      return metadata.description || metadata.title || 'Unknown activity';
  }
}

function getExpandedContent(event: ActivityEvent): React.ReactNode {
  const { type, metadata, target } = event;
  
  switch (type) {
    case 'decision_made':
      return (
        <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Reasoning:</span>{' '}
            {metadata.description || 'No reasoning provided'}
          </p>
          {typeof metadata.confidence === 'number' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Confidence:</span>
              <span className={cn(
                'font-medium',
                metadata.confidence > 80 ? 'text-green-500' :
                metadata.confidence > 50 ? 'text-amber-500' : 'text-red-500'
              )}>
                {metadata.confidence}%
              </span>
            </div>
          )}
        </div>
      );
      
    case 'escalation_created':
      return (
        <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Question:</span>{' '}
            {metadata.description}
          </p>
          {typeof metadata.suggestedResolution === 'string' && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Suggested:</span>{' '}
              {metadata.suggestedResolution}
            </p>
          )}
        </div>
      );
      
    case 'task_completed':
    case 'task_failed':
      return (
        <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
          {typeof metadata.duration === 'string' && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Duration:</span>{' '}
              {metadata.duration}
            </p>
          )}
          {metadata?.output !== undefined && metadata?.output !== null && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Output:</span>{' '}
              {String(metadata.output).substring(0, 200)}
              {String(metadata.output).length > 200 ? '...' : ''}
            </p>
          )}
        </div>
      );
      
    default:
      return metadata.description ? (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-sm text-muted-foreground">{metadata.description}</p>
        </div>
      ) : null;
  }
}

// ============================================================================
// Activity Item Component
// ============================================================================

export function ActivityItem({
  event,
  isExpanded = false,
  onExpand,
  onClick,
  isNew = false,
}: ActivityItemProps) {
  const [expanded, setExpanded] = React.useState(isExpanded);
  
  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onExpand?.();
  };
  
  const handleClick = () => {
    onClick?.();
  };
  
  const showExpandButton = ['decision_made', 'escalation_created', 'task_completed', 'task_failed'].includes(event.type) || 
    event.metadata.description;
  
  return (
    <div
      className={cn(
        'group relative flex gap-3 p-3 rounded-lg transition-colors cursor-pointer',
        'hover:bg-muted/50',
        isNew && 'bg-primary/5',
        expanded && 'bg-muted/30'
      )}
      onClick={handleClick}
    >
      {/* New indicator */}
      {isNew && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}
      
      {/* Icon */}
      <div className="flex-shrink-0">
        <ActivityIcon 
          type={event.type} 
          size="md" 
          pulse={isNew}
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <ActivityTypeBadge type={event.type} />
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(event.timestamp)}
              </span>
            </div>
            
            {/* Description */}
            <p className={cn(
              'mt-1 text-sm',
              isNew ? 'text-foreground font-medium' : 'text-foreground'
            )}>
              {getEventDescription(event)}
            </p>
            
            {/* Actor info */}
            <p className="mt-0.5 text-xs text-muted-foreground">
              via {event.actor.name}
            </p>
          </div>
          
          {/* Expand button */}
          {showExpandButton && (
            <button
              onClick={handleExpand}
              className={cn(
                'flex-shrink-0 p-1 rounded-md transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
                expanded && 'text-foreground bg-muted'
              )}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        
        {/* Expanded content */}
        {expanded && (
          <div className="animate-slide-in">
            {getExpandedContent(event)}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Activity Item Skeleton
// ============================================================================

export function ActivityItemSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-lg">
      {/* Icon skeleton */}
      <div className="flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
      </div>
      
      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-16 h-5 rounded-full bg-muted animate-pulse" />
          <div className="w-20 h-4 rounded bg-muted animate-pulse" />
        </div>
        <div className="w-full h-4 rounded bg-muted animate-pulse" />
        <div className="w-24 h-3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
