/**
 * Unit tests for Cost Tracking validation schemas
 * Issue #117: LLM cost tracking persistence
 */

import { describe, it, expect } from 'vitest';
import {
  listCostsQuerySchema,
  costSummaryQuerySchema,
  dailyCostsQuerySchema,
} from '@/lib/validation';

describe('Cost Tracking Validation', () => {
  describe('listCostsQuerySchema', () => {
    it('should validate minimal query', () => {
      const result = listCostsQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should validate complete query', () => {
      const input = {
        model: 'claude-3-5-sonnet',
        provider: 'anthropic' as const,
        status: 'success' as const,
        agent_id: '550e8400-e29b-41d4-a716-446655440000',
        task_id: '550e8400-e29b-41d4-a716-446655440001',
        date_from: '2026-02-01T00:00:00Z',
        date_to: '2026-02-14T23:59:59Z',
        page: '2',
        limit: '50',
      };

      const result = listCostsQuerySchema.parse(input);
      expect(result.model).toBe('claude-3-5-sonnet');
      expect(result.provider).toBe('anthropic');
      expect(result.status).toBe('success');
      expect(result.agent_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.task_id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.date_from).toBe('2026-02-01T00:00:00Z');
      expect(result.date_to).toBe('2026-02-14T23:59:59Z');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should reject invalid provider', () => {
      expect(() =>
        listCostsQuerySchema.parse({ provider: 'invalid-provider' })
      ).toThrow();
    });

    it('should reject invalid status', () => {
      expect(() =>
        listCostsQuerySchema.parse({ status: 'pending' })
      ).toThrow();
    });

    it('should reject invalid UUID for agent_id', () => {
      expect(() =>
        listCostsQuerySchema.parse({ agent_id: 'not-a-uuid' })
      ).toThrow();
    });

    it('should reject invalid page number', () => {
      expect(() =>
        listCostsQuerySchema.parse({ page: '0' })
      ).toThrow();
    });

    it('should reject limit over 100', () => {
      expect(() =>
        listCostsQuerySchema.parse({ limit: '101' })
      ).toThrow();
    });

    it('should coerce string page to number', () => {
      const result = listCostsQuerySchema.parse({ page: '5' });
      expect(result.page).toBe(5);
      expect(typeof result.page).toBe('number');
    });

    it('should coerce string limit to number', () => {
      const result = listCostsQuerySchema.parse({ limit: '50' });
      expect(result.limit).toBe(50);
      expect(typeof result.limit).toBe('number');
    });

    it('should accept all valid status values', () => {
      const statuses = ['success', 'error', 'cached'] as const;
      statuses.forEach((status) => {
        const result = listCostsQuerySchema.parse({ status });
        expect(result.status).toBe(status);
      });
    });

    it('should accept all valid provider values', () => {
      const providers = ['anthropic', 'openai'] as const;
      providers.forEach((provider) => {
        const result = listCostsQuerySchema.parse({ provider });
        expect(result.provider).toBe(provider);
      });
    });
  });

  describe('costSummaryQuerySchema', () => {
    it('should validate empty query', () => {
      const result = costSummaryQuerySchema.parse({});
      expect(result.date_from).toBeUndefined();
      expect(result.date_to).toBeUndefined();
    });

    it('should validate date range', () => {
      const input = {
        date_from: '2026-02-01T00:00:00Z',
        date_to: '2026-02-14T23:59:59Z',
      };

      const result = costSummaryQuerySchema.parse(input);
      expect(result.date_from).toBe('2026-02-01T00:00:00Z');
      expect(result.date_to).toBe('2026-02-14T23:59:59Z');
    });

    it('should reject invalid date format', () => {
      expect(() =>
        costSummaryQuerySchema.parse({ date_from: 'invalid-date' })
      ).toThrow();
    });

    it('should accept only date_from', () => {
      const result = costSummaryQuerySchema.parse({
        date_from: '2026-02-01T00:00:00Z',
      });
      expect(result.date_from).toBe('2026-02-01T00:00:00Z');
      expect(result.date_to).toBeUndefined();
    });

    it('should accept only date_to', () => {
      const result = costSummaryQuerySchema.parse({
        date_to: '2026-02-14T23:59:59Z',
      });
      expect(result.date_to).toBe('2026-02-14T23:59:59Z');
      expect(result.date_from).toBeUndefined();
    });
  });

  describe('dailyCostsQuerySchema', () => {
    it('should use default value of 30 days', () => {
      const result = dailyCostsQuerySchema.parse({});
      expect(result.days).toBe(30);
    });

    it('should accept valid days parameter', () => {
      const result = dailyCostsQuerySchema.parse({ days: '7' });
      expect(result.days).toBe(7);
    });

    it('should coerce string days to number', () => {
      const result = dailyCostsQuerySchema.parse({ days: '60' });
      expect(result.days).toBe(60);
      expect(typeof result.days).toBe('number');
    });

    it('should reject zero days', () => {
      expect(() =>
        dailyCostsQuerySchema.parse({ days: '0' })
      ).toThrow();
    });

    it('should reject negative days', () => {
      expect(() =>
        dailyCostsQuerySchema.parse({ days: '-5' })
      ).toThrow();
    });

    it('should reject days over 90', () => {
      expect(() =>
        dailyCostsQuerySchema.parse({ days: '91' })
      ).toThrow();
    });

    it('should accept maximum of 90 days', () => {
      const result = dailyCostsQuerySchema.parse({ days: '90' });
      expect(result.days).toBe(90);
    });

    it('should accept minimum of 1 day', () => {
      const result = dailyCostsQuerySchema.parse({ days: '1' });
      expect(result.days).toBe(1);
    });

    it('should reject invalid string for days', () => {
      expect(() =>
        dailyCostsQuerySchema.parse({ days: 'abc' })
      ).toThrow();
    });
  });
});
