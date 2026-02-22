/**
 * Webhook Event Filtering
 */

import type { WebhookEventType } from '@/types/webhook';

export const EVENT_CATEGORIES = {
  AGENT: ['agent.created', 'agent.updated', 'agent.deleted', 'agent.status_changed', 'agent.terminated'],
  TASK: ['task.created', 'task.updated', 'task.assigned', 'task.completed', 'task.failed', 'task.status_changed'],
  DECISION: ['decision.proposed', 'decision.approved', 'decision.rejected'],
  ESCALATION: ['escalation.created', 'escalation.resolved'],
  SYSTEM: ['system.alert', 'system.error', 'system.config_changed'],
} as const;

export type EventCategory = keyof typeof EVENT_CATEGORIES;

export function shouldDeliverEvent(
  eventType: WebhookEventType,
  subscribedEvents: string[]
): boolean {
  if (subscribedEvents.includes('*')) return true;
  if (subscribedEvents.includes(eventType)) return true;
  
  const category = eventType.split('.')[0];
  if (subscribedEvents.includes(`${category}.*`)) return true;
  
  return false;
}

export function getEventsInCategory(category: EventCategory): string[] {
  return [...EVENT_CATEGORIES[category]];
}

export function validateEventFilters(events: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const allValidEvents = Object.values(EVENT_CATEGORIES).flat();

  for (const event of events) {
    if (event === '*') {
      valid.push(event);
    } else if (event.endsWith('.*')) {
      const category = event.slice(0, -2) as EventCategory;
      if (EVENT_CATEGORIES[category]) valid.push(event);
      else invalid.push(event);
    } else if (allValidEvents.includes(event)) {
      valid.push(event);
    } else {
      invalid.push(event);
    }
  }

  return { valid, invalid };
}

export function expandEventFilters(events: string[]): string[] {
  const expanded = new Set<string>();

  for (const event of events) {
    if (event === '*') {
      Object.values(EVENT_CATEGORIES).forEach(category => {
        category.forEach(e => expanded.add(e));
      });
    } else if (event.endsWith('.*')) {
      const category = event.slice(0, -2) as EventCategory;
      const categoryEvents = EVENT_CATEGORIES[category];
      if (categoryEvents) categoryEvents.forEach(e => expanded.add(e));
    } else {
      expanded.add(event);
    }
  }

  return Array.from(expanded);
}

export function buildEventFilterSummary(events: string[]): string {
  if (events.includes('*')) return 'All events';

  const categories = new Set<EventCategory>();
  const specificEvents: string[] = [];

  for (const event of events) {
    if (event.endsWith('.*')) {
      categories.add(event.slice(0, -2) as EventCategory);
    } else {
      specificEvents.push(event);
    }
  }

  const parts: string[] = [];
  if (categories.size > 0) parts.push(`All ${Array.from(categories).join(', ')} events`);
  if (specificEvents.length > 0) parts.push(`${specificEvents.length} specific event${specificEvents.length !== 1 ? 's' : ''}`);

  return parts.join(' + ') || 'No events selected';
}
