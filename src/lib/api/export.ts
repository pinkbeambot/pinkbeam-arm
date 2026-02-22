/**
 * Export Utilities
 * 
 * Helper functions for exporting data in CSV, JSON, and JSONL formats.
 */

import type { ExportFormat } from '@/lib/validation/export';

/**
 * Convert array of objects to CSV string
 */
export function toCsv<T extends Record<string, unknown>>(
  data: T[],
  options?: {
    columns?: string[];
    includeHeaders?: boolean;
  }
): string {
  if (data.length === 0) return '';

  const columns = options?.columns || Object.keys(data[0]);
  const includeHeaders = options?.includeHeaders ?? true;

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, newline, or quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: string[] = [];

  if (includeHeaders) {
    rows.push(columns.join(','));
  }

  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col];
      // Handle nested objects/arrays
      if (typeof value === 'object' && value !== null) {
        return escapeCell(JSON.stringify(value));
      }
      return escapeCell(value);
    });
    rows.push(values.join(','));
  }

  return rows.join('\n');
}

/**
 * Convert array of objects to JSONL (JSON Lines) format
 */
export function toJsonl<T extends Record<string, unknown>>(data: T[]): string {
  return data.map(row => JSON.stringify(row)).join('\n');
}

/**
 * Format data for export
 */
export function formatForExport<T extends Record<string, unknown>>(
  data: T[],
  format: ExportFormat,
  options?: {
    columns?: string[];
    includeHeaders?: boolean;
  }
): string {
  switch (format) {
    case 'csv':
      return toCsv(data, options);
    case 'jsonl':
      return toJsonl(data);
    case 'json':
    default:
      return JSON.stringify(data, null, 2);
  }
}

/**
 * Generate export filename
 */
export function generateExportFilename(
  entity: string,
  format: ExportFormat,
  tenantId?: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tenantPrefix = tenantId ? `${tenantId.slice(0, 8)}_` : '';
  return `${tenantPrefix}${entity}_${timestamp}.${format}`;
}

/**
 * Get content type for export format
 */
export function getExportContentType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'jsonl':
      return 'application/x-ndjson';
    case 'json':
    default:
      return 'application/json';
  }
}

/**
 * Sanitize data for export (remove sensitive fields)
 */
export function sanitizeForExport<T extends Record<string, unknown>>(
  data: T[],
  fieldsToRemove: string[] = []
): Partial<T>[] {
  const defaultFieldsToRemove = ['tenant_id', 'search_vector'];
  const allFieldsToRemove = [...defaultFieldsToRemove, ...fieldsToRemove];

  return data.map(item => {
    const sanitized = { ...item };
    for (const field of allFieldsToRemove) {
      delete sanitized[field];
    }
    return sanitized;
  });
}

/**
 * Transform nested JSON fields for CSV export
 */
export function flattenForCsv<T extends Record<string, unknown>>(
  data: T[],
  jsonFields: string[] = []
): Record<string, unknown>[] {
  return data.map(item => {
    const flattened: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(item)) {
      if (jsonFields.includes(key) && typeof value === 'object' && value !== null) {
        // Flatten JSON fields as string
        flattened[key] = JSON.stringify(value);
      } else {
        flattened[key] = value;
      }
    }
    
    return flattened;
  });
}
