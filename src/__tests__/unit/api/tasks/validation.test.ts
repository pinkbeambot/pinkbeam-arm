/**
 * Unit tests for Task Validation Schemas
 */

import { describe, it, expect } from 'vitest';
import {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  listTasksQuerySchema,
  enhancedListTasksQuerySchema,
  batchCreateTaskSchema,
  batchDeleteTaskSchema,
  updateTaskProgressSchema,
  taskStatusTransitionSchema,
  taskIdParamSchema,
} from '@/lib/validation';

describe('Task Validation Schemas', () => {
  describe('createTaskSchema', () => {
    it('should validate minimal valid task', () => {
      const result = createTaskSchema.safeParse({ title: 'Test Task' });
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const result = createTaskSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTaskSchema', () => {
    it('should validate partial update', () => {
      const result = updateTaskSchema.safeParse({ status: 'in_progress' });
      expect(result.success).toBe(true);
    });

    it('should allow null assignee_id', () => {
      const result = updateTaskSchema.safeParse({ assignee_id: null });
      expect(result.success).toBe(true);
    });
  });

  describe('assignTaskSchema', () => {
    it('should validate assignment', () => {
      const result = assignTaskSchema.safeParse({
        assignee_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('listTasksQuerySchema', () => {
    it('should validate empty query', () => {
      const result = listTasksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('batch operations', () => {
    it('should validate batch create', () => {
      const result = batchCreateTaskSchema.safeParse({
        tasks: [{ title: 'Task 1' }, { title: 'Task 2' }],
      });
      expect(result.success).toBe(true);
    });

    it('should validate batch delete', () => {
      const result = batchDeleteTaskSchema.safeParse({
        ids: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('progress and status', () => {
    it('should validate progress update', () => {
      const result = updateTaskProgressSchema.safeParse({ progress_percent: 50 });
      expect(result.success).toBe(true);
    });

    it('should validate status transition', () => {
      const result = taskStatusTransitionSchema.safeParse({ status: 'in_progress' });
      expect(result.success).toBe(true);
    });
  });

  describe('taskIdParamSchema', () => {
    it('should validate UUID', () => {
      const result = taskIdParamSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });
  });
});
