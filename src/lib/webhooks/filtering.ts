/**
 * Webhook Event Filtering
 * 
 * Utilities for filtering webhook events based on endpoint configuration.
 */

import type { WebhookEventType } from '@/types/webhook';

// Event categories for filtering
export const EVENT_CATEGORIES = {
  AGENT: ['agent.created', 'agent.updated', 'agent.deleted', 'agent.status_changed', 'agent.terminated'],
  TASK: ['task.created', 'task.updated', 'task.assigned', 'task.completed', 'task.failed', 'task.status_changed'],
  DECISION: ['decision.proposed', 'decision.approved', 'decision.rejected'],
  ESCALATION: ['escalation.created', 'escalation.resolved'],
  SYSTEM: ['system.alert', 'system.error', 'system.config_changed'],
} as const;

export type EventCategory = keyof typeof EVENT_CATEGORIES;

/**
 * Check if an event matches the endpoint's event filters
 * 
 * Supports:
 * - Wildcard '*' to subscribe to all events
 * - Category wildcards like 'agent.*', 'task.*'
 * - Specific events like 'agent.created'
 */
export function shouldDeliverEvent(
  eventType: WebhookEventType,
  subscribedEvents: string[]
): boolean {
  // Check for global wildcard
  if (subscribedEvents.includes('*')) {
    return true;
  }

  // Check for exact match
  if (subscribedEvents.includes(eventType)) {
    return true;
  }

  // Check for category wildcard (e.g., 'agent.*')
  const category = eventType.split('.')[0];
  if (subscribedEvents.includes(`${category}.*`)) {
    return true;
  }

  return false;
}

/**
 * Get all events in a category
 */
export function getEventsInCategory(category: EventCategory): string[] {
  return [...EVENT_CATEGORIES[category]];
}

/**
 * Validate event filters
 * Returns valid events and any invalid ones
 */
export function validateEventFilters(
  events: string[]
): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  const allValidEvents = Object.values(EVENT_CATEGORIES).flat();

  for (const event of events) {
    // Allow wildcards
    if (event === '*') {
      valid.push(event);
      continue;
    }

    // Allow category wildcards
    if (event.endsWith('.*')) {
      const category = event.slice(0, -2) as EventCategory;
      if (EVENT_CATEGORIES[category]) {
        valid.push(event);
        continue;
      }
    }

    // Check specific events
    if (allValidEvents.includes(event)) {
      valid.push(event);
    } else {
      invalid.push(event);
    }
  }

  return { valid, invalid };
}

/**
 * Expand event filters to concrete event list
 * Converts wildcards to specific events
 */
export function expandEventFilters(events: string[]): string[] {
  const expanded = new Set<string>();

  for (const event of events) {
    if (event === '*') {
      // Add all events
      Object.values(EVENT_CATEGORIES).forEach(category => {
        category.forEach(e => expanded.add(e));
      });
    } else if (event.endsWith('.*')) {
      // Add all events in category
      const category = event.slice(0, -2) as EventCategory;
      const categoryEvents = EVENT_CATEGORIES[category];
      if (categoryEvents) {
        categoryEvents.forEach(e => expanded.add(e));
      }
    } else {
      expanded.add(event);
    }
  }

  return Array.from(expanded);
}

/**
 * Build event filter summary for display
 */
export function buildEventFilterSummary(events: string[]): string {
  if (events.includes('*')) {
    return 'All events';
  }

  const categories = new Set<EventCategory>();
  const specificEvents: string[] = [];

  for (const event of events) {
    if (event.endsWith('.*')) {
      const category = event.slice(0, -2) as EventCategory;
      categories.add(category);
    } else {
      specificEvents.push(event);
    }
  }

  const parts: string[] = [];
  
  if (categories.size > 0) {
    parts.push(`All ${Array.from(categories).join(', ')} events`);
  }
  
  if (specificEvents.length > 0) {
    parts.push(`${specificEvents.length} specific event${specificEvents.length !== 1 ? 's' : ''}`);
  }

  return parts.join(' + ') || 'No events selected';
}
