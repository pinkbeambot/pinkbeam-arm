/**
 * Advanced Filtering Utilities
 * 
 * Helper functions for building complex database queries
 * with filtering, sorting, and full-text search.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database';

export type FilterOperator = 
  | 'eq'      // equals
  | 'neq'     // not equals
  | 'gt'      // greater than
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'in'      // in array
  | 'nin'     // not in array
  | 'like'    // contains (case-insensitive)
  | 'nlike'   // not contains
  | 'is'      // is null / is not null
  | 'between'; // between two values

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Apply a filter condition to a Supabase query
 */
export function applyFilter<T extends Record<string, unknown>>(
  query: ReturnType<SupabaseClient<Database>['from']>,
  condition: FilterCondition
): ReturnType<SupabaseClient<Database>['from']> {
  const { field, operator, value } = condition;

  switch (operator) {
    case 'eq':
      return query.eq(field, value);
    case 'neq':
      return query.neq(field, value);
    case 'gt':
      return query.gt(field, value);
    case 'gte':
      return query.gte(field, value);
    case 'lt':
      return query.lt(field, value);
    case 'lte':
      return query.lte(field, value);
    case 'in':
      if (Array.isArray(value)) {
        return query.in(field, value);
      }
      return query.eq(field, value);
    case 'nin':
      if (Array.isArray(value)) {
        return query.not(field, 'in', value);
      }
      return query.neq(field, value);
    case 'like':
      return query.ilike(field, `%${value}%`);
    case 'nlike':
      return query.not(field, 'ilike', `%${value}%`);
    case 'is':
      if (value === null) {
        return query.is(field, null);
      }
      return query.not(field, 'is', null);
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return query.gte(field, value[0]).lte(field, value[1]);
      }
      return query;
    default:
      return query;
  }
}

/**
 * Apply multiple filter conditions to a query
 */
export function applyFilters<T extends Record<string, unknown>>(
  query: ReturnType<SupabaseClient<Database>['from']>,
  conditions: FilterCondition[]
): ReturnType<SupabaseClient<Database>['from']> {
  return conditions.reduce((q, condition) => applyFilter(q, condition), query);
}

/**
 * Build a full-text search query for multiple fields
 */
export function buildSearchQuery(
  fields: string[],
  searchTerm: string,
  operator: 'and' | 'or' = 'and'
): string {
  const terms = searchTerm.split(/\s+/).filter(t => t.length > 0);
  
  if (terms.length === 0) return '';
  
  const fieldQueries = fields.map(field => {
    const termQueries = terms.map(term => `${field}.ilike.%${term}%`);
    return operator === 'and' 
      ? termQueries.join(',')
      : termQueries.join(',');
  });
  
  return fieldQueries.join(',');
}

/**
 * Apply full-text search to a query
 */
export function applyFullTextSearch<T extends Record<string, unknown>>(
  query: ReturnType<SupabaseClient<Database>['from']>,
  searchTerm: string,
  fields: string[] = ['name', 'description'],
  operator: 'and' | 'or' = 'and'
): ReturnType<SupabaseClient<Database>['from']> {
  if (!searchTerm.trim()) return query;

  const searchQuery = buildSearchQuery(fields, searchTerm, operator);
  
  if (!searchQuery) return query;

  // Use or for field-level, and/or for term-level based on operator
  if (operator === 'and') {
    // For AND, we need all terms to match at least one field
    const terms = searchTerm.split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 1) {
      return query.or(fields.map(f => `${f}.ilike.%${terms[0]}%`).join(','));
    }
    // Multiple terms - use textSearch if available, otherwise use ilike
    return query.or(
      fields.map(field => 
        terms.map(term => `${field}.ilike.%${term}%`).join(',')
      ).join(',')
    );
  } else {
    // OR mode - any term in any field
    return query.or(
      searchTerm.split(/\s+/)
        .filter(t => t.length > 0)
        .flatMap(term => fields.map(f => `${f}.ilike.%${term}%`))
        .join(',')
    );
  }
}

/**
 * Parse filter JSON string into FilterCondition array
 */
export function parseFilters(filtersJson?: string): FilterCondition[] {
  if (!filtersJson) return [];
  
  try {
    const parsed = JSON.parse(filtersJson);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidFilterCondition);
    }
    return [];
  } catch {
    return [];
  }
}

function isValidFilterCondition(obj: unknown): obj is FilterCondition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'field' in obj &&
    typeof (obj as FilterCondition).field === 'string' &&
    'operator' in obj &&
    typeof (obj as FilterCondition).operator === 'string' &&
    'value' in obj
  );
}

/**
 * Apply sorting to a query
 */
export function applySorting<T extends Record<string, unknown>>(
  query: ReturnType<SupabaseClient<Database>['from']>,
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): ReturnType<SupabaseClient<Database>['from']> {
  return query.order(sortBy, { ascending: sortOrder === 'asc' });
}

/**
 * Priority mapping for sorting by priority
 */
export const PRIORITY_ORDER = {
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4,
} as const;

/**
 * Get sort value for priority-based sorting
 */
export function getPrioritySortValue(priority: string): number {
  return PRIORITY_ORDER[priority as keyof typeof PRIORITY_ORDER] || 0;
}
