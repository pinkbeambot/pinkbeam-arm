/**
 * Client-side CSV parser for bulk import operations.
 * Handles quoted fields, newlines within quotes, and common edge cases.
 */

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: CSVParseError[];
}

export interface CSVParseError {
  row: number;
  message: string;
}

/**
 * Parse a CSV string into structured data.
 * Supports: quoted fields, commas in quotes, escaped quotes (""), newlines in quotes.
 */
export function parseCSV(text: string): CSVParseResult {
  const errors: CSVParseError[] = [];
  const lines = splitCSVLines(text.trim());

  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [{ row: 0, message: 'Empty CSV file' }] };
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  if (headers.length === 0) {
    return { headers: [], rows: [], errors: [{ row: 0, message: 'No headers found' }] };
  }

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip empty lines

    const values = parseCSVLine(line);

    if (values.length !== headers.length) {
      errors.push({
        row: i + 1,
        message: `Expected ${headers.length} columns but got ${values.length}`,
      });
      continue;
    }

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j].trim();
    }
    rows.push(row);
  }

  return { headers, rows, errors };
}

/**
 * Split CSV text into logical lines, respecting quoted fields that span multiple lines.
 */
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
        // Escaped quote
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === '\n' || (char === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      lines.push(current);
      current = '';
      if (char === '\r') i++; // skip \n in \r\n
    } else if (char === '\r' && !inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse a single CSV line into an array of field values.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

/**
 * Validate parsed CSV rows against a schema definition.
 */
export interface ColumnSchema {
  name: string;
  required?: boolean;
  validate?: (value: string) => string | null; // returns error message or null
}

export interface ValidationResult {
  valid: Record<string, string>[];
  invalid: { row: number; data: Record<string, string>; errors: string[] }[];
}

export function validateCSVRows(
  rows: Record<string, string>[],
  schema: ColumnSchema[],
): ValidationResult {
  const valid: Record<string, string>[] = [];
  const invalid: { row: number; data: Record<string, string>; errors: string[] }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors: string[] = [];

    for (const col of schema) {
      const value = row[col.name] ?? '';

      if (col.required && !value) {
        rowErrors.push(`"${col.name}" is required`);
        continue;
      }

      if (value && col.validate) {
        const error = col.validate(value);
        if (error) {
          rowErrors.push(`"${col.name}": ${error}`);
        }
      }
    }

    if (rowErrors.length > 0) {
      invalid.push({ row: i + 2, data: row, errors: rowErrors }); // +2 for 1-indexed + header row
    } else {
      valid.push(row);
    }
  }

  return { valid, invalid };
}

// Pre-built column schemas for agents and tasks

const VALID_ROLES = ['ceo', 'manager', 'worker', 'specialist', 'system'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const VALID_CAPABILITIES = ['spawn', 'delegate', 'decide', 'escalate', 'access_external', 'modify_config'];

export const AGENT_COLUMNS: ColumnSchema[] = [
  { name: 'name', required: true },
  {
    name: 'role',
    required: true,
    validate: (v) => VALID_ROLES.includes(v.toLowerCase()) ? null : `must be one of: ${VALID_ROLES.join(', ')}`,
  },
  { name: 'description' },
  {
    name: 'capabilities',
    validate: (v) => {
      if (!v) return null;
      const caps = v.split(';').map(c => c.trim().toLowerCase());
      const invalid = caps.filter(c => c && !VALID_CAPABILITIES.includes(c));
      return invalid.length > 0 ? `invalid capabilities: ${invalid.join(', ')}` : null;
    },
  },
  { name: 'model' },
];

export const TASK_COLUMNS: ColumnSchema[] = [
  { name: 'title', required: true },
  { name: 'description' },
  {
    name: 'priority',
    validate: (v) => {
      if (!v) return null;
      return VALID_PRIORITIES.includes(v.toLowerCase()) ? null : `must be one of: ${VALID_PRIORITIES.join(', ')}`;
    },
  },
  { name: 'type' },
  { name: 'assignee_id' },
  { name: 'deadline_at' },
];
