import { describe, it, expect, beforeEach } from 'vitest';
import {
  PromptRegistry,
  renderPrompt,
  ABTestEngine,
  PromptRenderError,
  type PromptTemplate,
  type PromptVersion,
  type PromptVariable,
} from '@/lib/llm/prompts';

describe('PromptRegistry', () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
  });

  const createTestTemplate = (id: string, category: PromptTemplate['category'] = 'custom'): PromptTemplate => ({
    id,
    category,
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentVersion: {
      id: `${id}-v1`,
      promptId: id,
      version: 1,
      content: 'Hello {{name}}!',
      variables: [
        { name: 'name', type: 'string', required: true },
      ],
      metadata: {
        name: 'Test Prompt',
        description: 'A test prompt',
        category,
        useCase: 'testing',
        estimatedTokens: 10,
        tags: ['test'],
      },
      createdAt: new Date(),
      createdBy: 'test-user',
      isActive: true,
      tags: ['test'],
    },
    versions: [],
  });

  describe('registerTemplate', () => {
    it('should register a template', () => {
      const template = createTestTemplate('test-1');
      registry.registerTemplate(template);

      expect(registry.getTemplate('test-1')).toBe(template);
    });

    it('should update category index', () => {
      const template = createTestTemplate('test-1', 'system');
      registry.registerTemplate(template);

      const systemTemplates = registry.getByCategory('system');
      expect(systemTemplates).toContain(template);
    });
  });

  describe('getTemplate', () => {
    it('should return undefined for unknown template', () => {
      expect(registry.getTemplate('unknown')).toBeUndefined();
    });

    it('should return the template', () => {
      const template = createTestTemplate('test-1');
      registry.registerTemplate(template);

      expect(registry.getTemplate('test-1')).toBe(template);
    });
  });

  describe('getActiveVersion', () => {
    it('should return active version', () => {
      const template = createTestTemplate('test-1');
      registry.registerTemplate(template);

      const version = registry.getActiveVersion('test-1');
      expect(version).toBe(template.currentVersion);
    });

    it('should return undefined for unknown template', () => {
      expect(registry.getActiveVersion('unknown')).toBeUndefined();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      registry.registerTemplate(createTestTemplate('greeting', 'system'));
      registry.registerTemplate(createTestTemplate('farewell', 'system'));
      registry.registerTemplate(createTestTemplate('task-gen', 'task-generation'));
    });

    it('should search by name', () => {
      const results = registry.search('greeting');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('greeting');
    });

    it('should search by description', () => {
      const results = registry.search('test prompt');
      expect(results).toHaveLength(3);
    });

    it('should filter by category', () => {
      const results = registry.search('', { category: 'task-generation' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('task-gen');
    });

    it('should filter by tags', () => {
      const results = registry.search('', { tags: ['test'] });
      expect(results).toHaveLength(3);
    });

    it('should filter by tenant', () => {
      const tenantTemplate: PromptTemplate = {
        ...createTestTemplate('tenant-prompt'),
        tenantId: 'tenant-1',
        isPublic: false,
      };
      registry.registerTemplate(tenantTemplate);

      const results = registry.search('', { tenantId: 'tenant-1' });
      expect(results.some(t => t.id === 'tenant-prompt')).toBe(true);
    });
  });

  describe('createVersion', () => {
    it('should create a new version', () => {
      const template = createTestTemplate('test-1');
      registry.registerTemplate(template);

      const newVersion = registry.createVersion('test-1', 'Updated content', {
        createdBy: 'user-1',
      });

      expect(newVersion).toBeDefined();
      expect(newVersion?.version).toBe(2);
      expect(newVersion?.content).toBe('Updated content');
      expect(template.versions).toHaveLength(1);
    });

    it('should return undefined for unknown template', () => {
      const result = registry.createVersion('unknown', 'content', { createdBy: 'user' });
      expect(result).toBeUndefined();
    });
  });

  describe('activateVersion', () => {
    it('should activate a specific version', () => {
      const template = createTestTemplate('test-1');
      registry.registerTemplate(template);
      
      registry.createVersion('test-1', 'Version 2', { createdBy: 'user' });

      const result = registry.activateVersion('test-1', 2);
      expect(result).toBe(true);

      const activeVersion = registry.getActiveVersion('test-1');
      expect(activeVersion?.version).toBe(2);
    });

    it('should return false for unknown template', () => {
      expect(registry.activateVersion('unknown', 1)).toBe(false);
    });

    it('should return false for unknown version', () => {
      const template = createTestTemplate('test-1');
      registry.registerTemplate(template);

      expect(registry.activateVersion('test-1', 99)).toBe(false);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', () => {
      const template = createTestTemplate('test-1');
      registry.registerTemplate(template);

      const result = registry.deleteTemplate('test-1');
      expect(result).toBe(true);
      expect(registry.getTemplate('test-1')).toBeUndefined();
    });

    it('should return false for unknown template', () => {
      expect(registry.deleteTemplate('unknown')).toBe(false);
    });
  });
});

describe('renderPrompt', () => {
  const createVersion = (
    content: string,
    variables: PromptVariable[] = [],
    systemPrompt?: string
  ): PromptVersion => ({
    id: 'test-v1',
    promptId: 'test',
    version: 1,
    content,
    systemPrompt,
    variables,
    metadata: {
      name: 'Test',
      description: 'Test prompt',
      category: 'custom',
      useCase: 'testing',
      estimatedTokens: 10,
      tags: [],
    },
    createdAt: new Date(),
    createdBy: 'test',
    isActive: true,
    tags: [],
  });

  it('should render template with variables', () => {
    const version = createVersion('Hello {{name}}!', [
      { name: 'name', type: 'string', required: true },
    ]);

    const result = renderPrompt(version, { name: 'World' });
    expect(result.messages[0].content).toBe('Hello World!');
  });

  it('should handle system prompt', () => {
    const version = createVersion(
      'User message',
      [],
      'You are a helpful assistant'
    );

    const result = renderPrompt(version, {});
    expect(result.system).toBe('You are a helpful assistant');
  });

  it('should apply default values', () => {
    const version = createVersion('Hello {{name}}!', [
      { name: 'name', type: 'string', required: false, defaultValue: 'Friend' },
    ]);

    const result = renderPrompt(version, {});
    expect(result.messages[0].content).toBe('Hello Friend!');
  });

  it('should handle multiple variables', () => {
    const version = createVersion('{{greeting}} {{name}}! How is the {{timeOfDay}}?', [
      { name: 'greeting', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'timeOfDay', type: 'string', required: true },
    ]);

    const result = renderPrompt(version, {
      greeting: 'Good morning',
      name: 'Alice',
      timeOfDay: 'morning',
    });

    expect(result.messages[0].content).toBe('Good morning Alice! How is the morning?');
  });

  it('should throw error for missing required variables', () => {
    const version = createVersion('Hello {{name}}!', [
      { name: 'name', type: 'string', required: true },
    ]);

    expect(() => renderPrompt(version, {})).toThrow(PromptRenderError);
  });

  it('should throw error for invalid variable types', () => {
    const version = createVersion('Age: {{age}}', [
      { name: 'age', type: 'number', required: true },
    ]);

    expect(() => renderPrompt(version, { age: 'twenty' })).toThrow(PromptRenderError);
  });

  it('should validate string pattern', () => {
    const version = createVersion('Email: {{email}}', [
      { 
        name: 'email', 
        type: 'string', 
        required: true,
        validation: { pattern: '^[\\w\\.]+@[\\w\\.]+$' },
      },
    ]);

    expect(() => renderPrompt(version, { email: 'invalid' })).toThrow(PromptRenderError);
    
    const result = renderPrompt(version, { email: 'test@example.com' });
    expect(result.messages[0].content).toBe('Email: test@example.com');
  });

  it('should validate number range', () => {
    const version = createVersion('Score: {{score}}', [
      { 
        name: 'score', 
        type: 'number', 
        required: true,
        validation: { min: 0, max: 100 },
      },
    ]);

    expect(() => renderPrompt(version, { score: -1 })).toThrow(PromptRenderError);
    expect(() => renderPrompt(version, { score: 101 })).toThrow(PromptRenderError);
    
    const result = renderPrompt(version, { score: 50 });
    expect(result.messages[0].content).toBe('Score: 50');
  });

  it('should validate enum values', () => {
    const version = createVersion('Priority: {{priority}}', [
      { 
        name: 'priority', 
        type: 'string', 
        required: true,
        validation: { enum: ['low', 'medium', 'high'] },
      },
    ]);

    expect(() => renderPrompt(version, { priority: 'urgent' })).toThrow(PromptRenderError);
    
    const result = renderPrompt(version, { priority: 'high' });
    expect(result.messages[0].content).toBe('Priority: high');
  });

  it('should allow missing optional variables', () => {
    const version = createVersion('Hello {{name}}!', [
      { name: 'name', type: 'string', required: false },
    ]);

    const result = renderPrompt(version, {}, { allowMissing: true });
    expect(result.messages[0].content).toBe('Hello {{name}}!');
  });

  it('should use fallback values', () => {
    const version = createVersion('Hello {{name}}!', [
      { name: 'name', type: 'string', required: true },
    ]);

    const result = renderPrompt(version, {}, { 
      allowMissing: true,
      fallbackValues: { name: 'Anonymous' },
    });
    expect(result.messages[0].content).toBe('Hello Anonymous!');
  });

  it('should skip validation when disabled', () => {
    const version = createVersion('Age: {{age}}', [
      { name: 'age', type: 'number', required: true },
    ]);

    // Should not throw with validation disabled
    const result = renderPrompt(version, { age: 'not-a-number' }, { 
      validateVariables: false 
    });
    expect(result.messages[0].content).toBe('Age: not-a-number');
  });

  it('should estimate tokens', () => {
    const version = createVersion('Hello World!', [], 'System prompt');

    const result = renderPrompt(version, {});
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });
});

describe('ABTestEngine', () => {
  let engine: ABTestEngine;

  beforeEach(() => {
    engine = new ABTestEngine();
  });

  describe('createTest', () => {
    it('should create a test', () => {
      const test = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a',
        variantB: 'version-b',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      expect(test.id).toBeDefined();
      expect(test.status).toBe('draft');
      expect(test.name).toBe('Test 1');
    });
  });

  describe('startTest', () => {
    it('should start a draft test', () => {
      const test = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a',
        variantB: 'version-b',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      const result = engine.startTest(test.id);
      expect(result).toBe(true);
      expect(engine.getTest(test.id)?.status).toBe('running');
    });

    it('should return false for non-draft test', () => {
      const test = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a',
        variantB: 'version-b',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      engine.startTest(test.id);
      expect(engine.startTest(test.id)).toBe(false); // Already running
    });
  });

  describe('assignVariant', () => {
    it('should return A when test not running', () => {
      const test = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a',
        variantB: 'version-b',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      expect(engine.assignVariant(test.id, 'req-1')).toBe('A');
    });

    it('should consistently assign same user to same variant', () => {
      const test = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a',
        variantB: 'version-b',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      engine.startTest(test.id);

      const variant = engine.assignVariant(test.id, 'req-1', 'user-1');
      
      // Same user should get same variant
      expect(engine.assignVariant(test.id, 'req-2', 'user-1')).toBe(variant);
      expect(engine.assignVariant(test.id, 'req-3', 'user-1')).toBe(variant);
    });

    it('should respect traffic split', () => {
      const test = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a',
        variantB: 'version-b',
        config: {
          trafficSplit: 0.7, // 70% to A
          sampleSize: 1000,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      engine.startTest(test.id);

      let aCount = 0;
      let bCount = 0;

      // Run many assignments
      for (let i = 0; i < 1000; i++) {
        const variant = engine.assignVariant(test.id, `req-${i}`, `user-${i}`);
        if (variant === 'A') aCount++;
        else bCount++;
      }

      // Should be roughly 70/30 split
      expect(aCount / 1000).toBeGreaterThan(0.65);
      expect(aCount / 1000).toBeLessThan(0.75);
    });
  });

  describe('getVariantVersionId', () => {
    it('should return correct version ID', () => {
      const test = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a-id',
        variantB: 'version-b-id',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      engine.startTest(test.id);

      expect(engine.getVariantVersionId(test.id, 'A')).toBe('version-a-id');
      expect(engine.getVariantVersionId(test.id, 'B')).toBe('version-b-id');
    });
  });

  describe('getActiveTestsForPrompt', () => {
    it('should return only running tests', () => {
      const test1 = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a',
        variantB: 'version-b',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      const test2 = engine.createTest({
        name: 'Test 2',
        templateId: 'prompt-1',
        variantA: 'version-c',
        variantB: 'version-d',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      engine.startTest(test1.id);
      // test2 stays in draft

      const activeTests = engine.getActiveTestsForPrompt('prompt-1');
      expect(activeTests).toHaveLength(1);
      expect(activeTests[0].id).toBe(test1.id);
    });
  });

  describe('completeTest', () => {
    it('should complete test and calculate results', () => {
      const test = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a',
        variantB: 'version-b',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      engine.startTest(test.id);
      
      const results = engine.completeTest(test.id);
      
      expect(results).toBeDefined();
      expect(engine.getTest(test.id)?.status).toBe('completed');
    });

    it('should return undefined for non-running test', () => {
      const test = engine.createTest({
        name: 'Test 1',
        templateId: 'prompt-1',
        variantA: 'version-a',
        variantB: 'version-b',
        config: {
          trafficSplit: 0.5,
          sampleSize: 100,
          minConfidenceLevel: 0.95,
          primaryMetric: 'success_rate',
          secondaryMetrics: [],
          autoPromoteWinner: false,
          minRunDurationMs: 86400000,
        },
        createdBy: 'user-1',
        tenantId: 'tenant-1',
      });

      // Test is in draft, not running
      expect(engine.completeTest(test.id)).toBeUndefined();
    });
  });
});
