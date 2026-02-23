import { describe, it, expect } from 'vitest';
import { escapeIlike } from '@/lib/utils';

describe('escapeIlike', () => {
  it('returns empty string for empty input', () => {
    expect(escapeIlike('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(escapeIlike('hello world')).toBe('hello world');
  });

  it('escapes percent characters', () => {
    expect(escapeIlike('100%')).toBe('100\\%');
  });

  it('escapes underscore characters', () => {
    expect(escapeIlike('my_search')).toBe('my\\_search');
  });

  it('escapes backslash characters', () => {
    expect(escapeIlike('path\\to')).toBe('path\\\\to');
  });

  it('escapes multiple special characters together', () => {
    expect(escapeIlike('%_\\')).toBe('\\%\\_\\\\');
  });

  it('truncates input to 200 characters', () => {
    const longString = 'a'.repeat(300);
    const result = escapeIlike(longString);
    expect(result.length).toBe(200);
  });

  it('strips HTML tags', () => {
    expect(escapeIlike('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(escapeIlike('hello <b>world</b>')).toBe('hello world');
  });

  it('strips nested HTML tags', () => {
    expect(escapeIlike('<div><span>text</span></div>')).toBe('text');
  });

  it('strips HTML tags before truncating', () => {
    const input = '<b>' + 'a'.repeat(250) + '</b>';
    const result = escapeIlike(input);
    // After truncation of 200 chars, remaining tags are stripped
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('handles combined HTML and special ILIKE characters', () => {
    expect(escapeIlike('<b>100%</b>')).toBe('100\\%');
  });

  it('handles self-closing tags', () => {
    expect(escapeIlike('line<br/>break')).toBe('linebreak');
  });
});
