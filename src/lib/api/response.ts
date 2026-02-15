/**
 * Standardized API Response Utilities
 *
 * Provides consistent response shapes across all API routes:
 * - Success: `{ data, pagination?, meta? }`
 * - Error:   `{ error, details? }`
 */

import { NextResponse } from 'next/server';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Success Responses ────────────────────────────────────────────────────────

/** Single resource or object: `{ data }` */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/** List with pagination: `{ data, pagination, meta? }` */
export function apiSuccessList<T>(
  data: T[],
  pagination: Pagination,
  meta?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    meta ? { data, pagination, meta } : { data, pagination },
  );
}

// ── Error Responses ──────────────────────────────────────────────────────────

/** Error: `{ error, details? }` */
export function apiError(
  message: string,
  status = 400,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status },
  );
}

// ── Delete Response ──────────────────────────────────────────────────────────

/** Deleted resource: `{ data: { id, ... } }` */
export function apiDeleted<T>(data: T): NextResponse {
  return NextResponse.json({ data });
}
