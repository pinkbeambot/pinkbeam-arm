/**
 * Advanced Filtering Utilities
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database';

export type FilterOperator = 
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' 
  | 'in' | 'nin' | 'like' | 'nlike' | 'is' | 'between';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export function applyFilter<T extends Record<string, unknown>>(
  query: ReturnType<SupabaseClient<Database>['from']>,
  condition: FilterCondition
): ReturnType<SupabaseClient<Database>['from']> {
  const { field, operator, value } = condition;

  switch (operator) {
    case 'eq': return query.eq(field, value);
    case 'neq': return query.neq(field, value);
    case 'gt': return query.gt(field, value);
    case 'gte': return query.gte(field, value);
    case 'lt': return query.lt(field, value);
    case 'lte': return query.lte(field, value);
    case 'in': return Array.isArray(value) ? query.in(field, value) : query.eq(field, value);
    case 'nin': return Array.isArray(value) ? query.not(field, 'in', value) : query.neq(field, value);
    case 'like': return query.ilike(field, `%${value}%`);
    case 'nlike': return query.not(field, 'ilike', `%${value}%`);
    case 'is': return value === null ? query.is(field, null) : query.not(field, 'is', null);
    case 'between': return Array.isArray(value) && value.length === 2 
      ? query.gte(field, value[0]).lte(field, value[1]) 
      : query;
    default: return query;
  }
}

export function applyFilters<T extends Record<string, unknown>>(
  query: ReturnType<SupabaseClient<Database>['from']>,
  conditions: FilterCondition[]
): ReturnType<SupabaseClient<Database>['from']> {
  return conditions.reduce((q, condition) => applyFilter(q, condition), query);
}

export function applyFullTextSearch<T extends Record<string, unknown>>(
  query: ReturnType<SupabaseClient<Database>['from']>,
  searchTerm: string,
  fields: string[] = ['name', 'description'],
  operator: 'and' | 'or' = 'and'
): ReturnType<SupabaseClient<Database>['from']> {
  if (!searchTerm.trim()) return query;

  const terms = searchTerm.split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return query;

  if (operator === 'and') {
    const orConditions = fields.map(field => 
      terms.map(term => `${field}.ilike.%${term}%`).join(',')
    );
    return query.or(orConditions.join(','));
  } else {
    const orConditions = terms.flatMap(term => 
      fields.map(f => `${f}.ilike.%${term}%`)
    );
    return query.or(orConditions.join(','));
  }
}

export function parseFilters(filtersJson?: string): FilterCondition[] {
  if (!filtersJson) return [];
  
  try {
    const parsed = JSON.parse(filtersJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((obj): obj is FilterCondition => 
        typeof obj === 'object' && obj !== null &&
        'field' in obj && typeof obj.field === 'string' &&
        'operator' in obj && typeof obj.operator === 'string' &&
        'value' in obj
      );
    }
    return [];
  } catch {
    return [];
  }
}

export const PRIORITY_ORDER = { low: 1, normal: 2, high: 3, urgent: 4 } as const;

export function getPrioritySortValue(priority: string): number {
  return PRIORITY_ORDER[priority as keyof typeof PRIORITY_ORDER] || 0;
}
