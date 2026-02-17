/**
 * Unit tests for Task Validation Schemas
 * 
 * Tests all task-related Zod validation schemas to ensure:
 * - Valid data passes validation
 * - Invalid data is rejected with appropriate errors
 * - Edge cases are handled correctly
 */

import { describe, it, expect } from 'vitest';
import {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  unassignTaskSchema,
  createDependencySchema,
  removeDependencySchema,
  listTasksQuerySchema,
  enhancedListTasksQuerySchema,
  batchCreateTaskSchema,
  batchUpdateTaskSchema,
  batchDeleteTaskSchema,
  updateTaskProgressSchema,
  taskStatusTransitionSchema,
  taskIdParamSchema,
} from '@/lib/validation/task';

describe('Task Validation Schemas', () => {
  // ==========================================================================
  // Create Task Schema
  // ==========================================================================
  describe('createTaskSchema', () => {
    it('should validate minimal valid task', () => {
      const result = createTaskSchema.safeParse({
        title: 'Test Task',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Task');
        expect(result.data.priority).toBe('normal');
        expect(result.data.type).toBe('generic');
      }
    });

    it('should validate full task with all fields', () => {
      const result = createTaskSchema.safeParse({
        title: 'Complete Task',
        description: 'A detailed description',
        type: 'custom_type',
        assignee_id: '550e8400-e29b-41d4-a716-446655440000',
        priority: 'high',
        parent_task_id: '550e8400-e29b-41d4-a716-446655440001',
        inputs: { key: 'value', nested: { data: true } },
        expected_outputs: { result: 'output' },
        deadline_at: '2026-12-31T23:59:59Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const result = createTaskSchema.safeParse({
        title: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should reject title exceeding max length', () => {
      const result = createTaskSchema.safeParse({
        title: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for assignee_id', () => {
      const result = createTaskSchema.safeParse({
        title: 'Test',
        assignee_id: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid');
      }
    });

    it('should reject invalid priority', () => {
      const result = createTaskSchema.safeParse({
        title: 'Test',
        priority: 'super_high',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid deadline format', () => {
      const result = createTaskSchema.safeParse({
        title: 'Test',
        deadline_at: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Update Task Schema
  // ==========================================================================
  describe('updateTaskSchema', () => {
    it('should validate partial update', () => {
      const result = updateTaskSchema.safeParse({
        status: 'in_progress',
      });
      expect(result.success).toBe(true);
    });

    it('should validate full update', () => {
      const result = updateTaskSchema.safeParse({
        title: 'Updated Title',
        description: 'Updated description',
        status: 'completed',
        assignee_id: '550e8400-e29b-41d4-a716-446655440000',
        priority: 'urgent',
        progress_percent: 75,
        current_step: 'Final review',
        outputs: { result: 'completed' },
        deadline_at: '2026-12-31T23:59:59Z',
      });
      expect(result.success).toBe(true);
    });

    it('should allow clearing deadline with null', () => {
      const result = updateTaskSchema.safeParse({
        deadline_at: null,
      });
      expect(result.success).toBe(true);
    });

    it('should allow clearing assignee with null', () => {
      const result = updateTaskSchema.safeParse({
        assignee_id: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject progress less than 0', () => {
      const result = updateTaskSchema.safeParse({
        progress_percent: -10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject progress greater than 100', () => {
      const result = updateTaskSchema.safeParse({
        progress_percent: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer progress', () => {
      const result = updateTaskSchema.safeParse({
        progress_percent: 50.5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const result = updateTaskSchema.safeParse({
        title: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Assign Task Schema
  // ==========================================================================
  describe('assignTaskSchema', () => {
    it('should validate valid assignment', () => {
      const result = assignTaskSchema.safeParse({
        assignee_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should validate assignment with note', () => {
      const result = assignTaskSchema.safeParse({
        assignee_id: '550e8400-e29b-41d4-a716-446655440000',
        note: 'Please prioritize this task',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing assignee_id', () => {
      const result = assignTaskSchema.safeParse({
        note: 'Missing assignee',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid assignee_id', () => {
      const result = assignTaskSchema.safeParse({
        assignee_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject note exceeding max length', () => {
      const result = assignTaskSchema.safeParse({
        assignee_id: '550e8400-e29b-41d4-a716-446655440000',
        note: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Unassign Task Schema
  // ==========================================================================
  describe('unassignTaskSchema', () => {
    it('should validate empty unassignment', () => {
      const result = unassignTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate unassignment with reason', () => {
      const result = unassignTaskSchema.safeParse({
        reason: 'Agent is overloaded',
      });
      expect(result.success).toBe(true);
    });

    it('should reject reason exceeding max length', () => {
      const result = unassignTaskSchema.safeParse({
        reason: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Create Dependency Schema
  // ==========================================================================
  describe('createDependencySchema', () => {
    it('should validate blocking dependency', () => {
      const result = createDependencySchema.safeParse({
        depends_on_task_id: '550e8400-e29b-41d4-a716-446655440000',
        dependency_type: 'blocks',
      });
      expect(result.success).toBe(true);
    });

    it('should validate requires dependency', () => {
      const result = createDependencySchema.safeParse({
        depends_on_task_id: '550e8400-e29b-41d4-a716-446655440000',
        dependency_type: 'requires',
      });
      expect(result.success).toBe(true);
    });

    it('should validate optional dependency', () => {
      const result = createDependencySchema.safeParse({
        depends_on_task_id: '550e8400-e29b-41d4-a716-446655440000',
        dependency_type: 'optional',
      });
      expect(result.success).toBe(true);
    });

    it('should default to blocks type', () => {
      const result = createDependencySchema.safeParse({
        depends_on_task_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dependency_type).toBe('blocks');
      }
    });

    it('should reject invalid dependency type', () => {
      const result = createDependencySchema.safeParse({
        depends_on_task_id: '550e8400-e29b-41d4-a716-446655440000',
        dependency_type: 'invalid_type',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid task id', () => {
      const result = createDependencySchema.safeParse({
        depends_on_task_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Remove Dependency Schema
  // ==========================================================================
  describe('removeDependencySchema', () => {
    it('should validate removal by dependency_id', () => {
      const result = removeDependencySchema.safeParse({
        dependency_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should validate removal by depends_on_task_id', () => {
      const result = removeDependencySchema.safeParse({
        depends_on_task_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject when neither id is provided', () => {
      const result = removeDependencySchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should accept both ids', () => {
      const result = removeDependencySchema.safeParse({
        dependency_id: '550e8400-e29b-41d4-a716-446655440000',
        depends_on_task_id: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // List Tasks Query Schema
  // ==========================================================================
  describe('listTasksQuerySchema', () => {
    it('should validate empty query (defaults)', () => {
      const result = listTasksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should validate full query', () => {
      const result = listTasksQuerySchema.safeParse({
        status: 'in_progress',
        assignee_id: '550e8400-e29b-41d4-a716-446655440000',
        priority: 'high',
        due_after: '2026-01-01T00:00:00Z',
        due_before: '2026-12-31T23:59:59Z',
        page: 2,
        limit: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should reject due_before before due_after', () => {
      const result = listTasksQuerySchema.safeParse({
        due_after: '2026-12-31T23:59:59Z',
        due_before: '2026-01-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('after');
      }
    });

    it('should reject invalid page', () => {
      const result = listTasksQuerySchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit exceeding max', () => {
      const result = listTasksQuerySchema.safeParse({
        limit: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should coerce string page to number', () => {
      const result = listTasksQuerySchema.safeParse({
        page: '3',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
      }
    });
  });

  // ==========================================================================
  // Enhanced List Tasks Query Schema
  // ==========================================================================
  describe('enhancedListTasksQuerySchema', () => {
    it('should validate empty query', () => {
      const result = enhancedListTasksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should parse multiple statuses from comma-separated string', () => {
      const result = enhancedListTasksQuerySchema.safeParse({
        status: 'queued,in_progress,blocked',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toEqual(['queued', 'in_progress', 'blocked']);
      }
    });

    it('should filter out invalid statuses', () => {
      const result = enhancedListTasksQuerySchema.safeParse({
        status: 'queued,invalid_status,in_progress',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toEqual(['queued', 'in_progress']);
      }
    });

    it('should handle empty status string', () => {
      const result = enhancedListTasksQuerySchema.safeParse({
        status: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });

    it('should validate search query', () => {
      const result = enhancedListTasksQuerySchema.safeParse({
        search: 'test query',
      });
      expect(result.success).toBe(true);
    });

    it('should reject search exceeding max length', () => {
      const result = enhancedListTasksQuerySchema.safeParse({
        search: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should validate sorting options', () => {
      const result = enhancedListTasksQuerySchema.safeParse({
        sort: 'priority',
        order: 'asc',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid sort field', () => {
      const result = enhancedListTasksQuerySchema.safeParse({
        sort: 'invalid_field',
      });
      expect(result.success).toBe(false);
    });

    it('should allow null parent_id for root tasks', () => {
      const result = enhancedListTasksQuerySchema.safeParse({
        parent_id: null,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Batch Create Schema
  // ==========================================================================
  describe('batchCreateTaskSchema', () => {
    it('should validate batch of tasks', () => {
      const result = batchCreateTaskSchema.safeParse({
        tasks: [
          { title: 'Task 1' },
          { title: 'Task 2' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty batch', () => {
      const result = batchCreateTaskSchema.safeParse({
        tasks: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject batch exceeding max size', () => {
      const tasks = Array(101).fill({ title: 'Task' });
      const result = batchCreateTaskSchema.safeParse({ tasks });
      expect(result.success).toBe(false);
    });

    it('should reject invalid task in batch', () => {
      const result = batchCreateTaskSchema.safeParse({
        tasks: [
          { title: 'Valid Task' },
          { description: 'Missing title' },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Batch Update Schema
  // ==========================================================================
  describe('batchUpdateTaskSchema', () => {
    it('should validate batch updates', () => {
      const result = batchUpdateTaskSchema.safeParse({
        tasks: [
          { id: '550e8400-e29b-41d4-a716-446655440000', data: { status: 'in_progress' } },
          { id: '550e8400-e29b-41d4-a716-446655440001', data: { priority: 'high' } },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject batch with invalid task id', () => {
      const result = batchUpdateTaskSchema.safeParse({
        tasks: [
          { id: 'invalid-id', data: { status: 'in_progress' } },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Batch Delete Schema
  // ==========================================================================
  describe('batchDeleteTaskSchema', () => {
    it('should validate batch delete', () => {
      const result = batchDeleteTaskSchema.safeParse({
        ids: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should validate batch delete with force flag', () => {
      const result = batchDeleteTaskSchema.safeParse({
        ids: ['550e8400-e29b-41d4-a716-446655440000'],
        force: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty ids array', () => {
      const result = batchDeleteTaskSchema.safeParse({
        ids: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid ids', () => {
      const result = batchDeleteTaskSchema.safeParse({
        ids: ['invalid-id'],
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Update Progress Schema
  // ==========================================================================
  describe('updateTaskProgressSchema', () => {
    it('should validate progress update', () => {
      const result = updateTaskProgressSchema.safeParse({
        progress_percent: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should validate progress with step', () => {
      const result = updateTaskProgressSchema.safeParse({
        progress_percent: 75,
        current_step: 'Implementing feature X',
        outputs: { partial: 'result' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject progress without required field', () => {
      const result = updateTaskProgressSchema.safeParse({
        current_step: 'Step only',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Status Transition Schema
  // ==========================================================================
  describe('taskStatusTransitionSchema', () => {
    it('should validate status transition', () => {
      const result = taskStatusTransitionSchema.safeParse({
        status: 'in_progress',
      });
      expect(result.success).toBe(true);
    });

    it('should validate transition with reason', () => {
      const result = taskStatusTransitionSchema.safeParse({
        status: 'blocked',
        reason: 'Waiting for external API access',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = taskStatusTransitionSchema.safeParse({
        status: 'archived',
      });
      expect(result.success).toBe(false);
    });

    it('should reject reason exceeding max length', () => {
      const result = taskStatusTransitionSchema.safeParse({
        status: 'blocked',
        reason: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Task ID Param Schema
  // ==========================================================================
  describe('taskIdParamSchema', () => {
    it('should validate UUID param', () => {
      const result = taskIdParamSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = taskIdParamSchema.safeParse({
        id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = taskIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
