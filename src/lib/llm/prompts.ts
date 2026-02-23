/**
 * Prompt Management System
 */

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  systemPrompt?: string;
  variables: PromptVariable[];
  metadata: PromptMetadata;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  tags: string[];
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
  validation?: { pattern?: string; min?: number; max?: number; enum?: unknown[] };
}

export interface PromptMetadata {
  name: string;
  description: string;
  category: string;
  useCase: string;
  estimatedTokens: number;
  tags: string[];
}

export interface PromptTemplate {
  id: string;
  currentVersion: PromptVersion;
  versions: PromptVersion[];
  category: PromptCategory;
  isPublic: boolean;
  tenantId?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PromptCategory = 'system' | 'task-generation' | 'decision-making' | 'escalation' | 'summarization' | 'code-generation' | 'analysis' | 'creative' | 'custom';

export interface RenderedPrompt {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  variables: Record<string, unknown>;
  estimatedTokens: number;
}

export interface ABTest {
  id: string;
  name: string;
  templateId: string;
  variantA: string;
  variantB: string;
  config: ABTestConfig;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startedAt?: Date;
  endedAt?: Date;
  createdBy: string;
  tenantId: string;
}

export interface ABTestConfig {
  trafficSplit: number;
  sampleSize: number;
  primaryMetric: string;
  secondaryMetrics: string[];
  minConfidenceLevel: number;
  autoPromoteWinner: boolean;
  minRunDurationMs: number;
}

export class PromptRegistry {
  private templates = new Map<string, PromptTemplate>();
  private categoryIndex = new Map<string, Set<string>>();

  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    // Update category index
    if (!this.categoryIndex.has(template.category)) {
      this.categoryIndex.set(template.category, new Set());
    }
    this.categoryIndex.get(template.category)!.add(template.id);
  }

  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  getActiveVersion(promptId: string): PromptVersion | undefined {
    return this.templates.get(promptId)?.currentVersion;
  }

  getByCategory(category: string): PromptTemplate[] {
    const ids = this.categoryIndex.get(category);
    if (!ids) return [];
    return Array.from(ids).map(id => this.templates.get(id)!).filter(Boolean);
  }

  search(query: string, filters?: { category?: string; tags?: string[]; tenantId?: string }): PromptTemplate[] {
    let results = Array.from(this.templates.values());

    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(t =>
        t.id.toLowerCase().includes(lowerQuery) ||
        t.currentVersion.metadata.name.toLowerCase().includes(lowerQuery) ||
        t.currentVersion.metadata.description.toLowerCase().includes(lowerQuery)
      );
    }

    if (filters?.category) {
      results = results.filter(t => t.category === filters.category);
    }

    if (filters?.tags?.length) {
      results = results.filter(t =>
        filters.tags!.some(tag => t.currentVersion.tags.includes(tag))
      );
    }

    if (filters?.tenantId) {
      results = results.filter(t => t.tenantId === filters.tenantId || t.isPublic);
    }

    return results;
  }

  createVersion(promptId: string, content: string, options: { createdBy: string }): PromptVersion | undefined {
    const template = this.templates.get(promptId);
    if (!template) return undefined;
    const newVersion: PromptVersion = {
      id: `${promptId}-v${template.versions.length + 2}`,
      promptId,
      version: template.versions.length + 2,
      content,
      variables: template.currentVersion.variables,
      metadata: template.currentVersion.metadata,
      createdAt: new Date(),
      createdBy: options.createdBy,
      isActive: false,
      tags: template.currentVersion.tags,
    };
    template.versions.push(newVersion);
    return newVersion;
  }

  activateVersion(promptId: string, version: number): boolean {
    const template = this.templates.get(promptId);
    if (!template) return false;
    const target = template.versions.find(v => v.version === version);
    if (!target) return false;
    template.versions.forEach(v => v.isActive = false);
    target.isActive = true;
    template.currentVersion = target;
    return true;
  }

  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) return false;
    this.templates.delete(id);
    // Update category index
    this.categoryIndex.get(template.category)?.delete(id);
    return true;
  }
}

export const globalPromptRegistry = new PromptRegistry();

export class PromptRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptRenderError';
  }
}

export interface RenderOptions {
  allowMissing?: boolean;
  fallbackValues?: Record<string, unknown>;
  validateVariables?: boolean;
}

export function renderPrompt(
  version: PromptVersion,
  variables: Record<string, unknown> = {},
  options: RenderOptions = {}
): RenderedPrompt {
  const { allowMissing = false, fallbackValues = {}, validateVariables = true } = options;

  let content = version.content;
  for (const variable of version.variables) {
    let value = variables[variable.name] ?? variable.defaultValue;

    // Use fallback if value is still undefined
    if (value === undefined) {
      value = fallbackValues[variable.name];
    }

    // Validation
    if (validateVariables && variable.required && value === undefined && !allowMissing) {
      throw new PromptRenderError(`Missing required variable: ${variable.name}`);
    }

    // Type validation
    if (validateVariables && value !== undefined) {
      if (variable.type === 'number' && typeof value !== 'number') {
        throw new PromptRenderError(`Variable ${variable.name} must be a number`);
      }
      if (variable.type === 'boolean' && typeof value !== 'boolean') {
        throw new PromptRenderError(`Variable ${variable.name} must be a boolean`);
      }
      if (variable.type === 'string' && variable.validation?.pattern) {
        const regex = new RegExp(variable.validation.pattern);
        if (!regex.test(String(value))) {
          throw new PromptRenderError(`Variable ${variable.name} does not match pattern: ${variable.validation.pattern}`);
        }
      }
      if (variable.type === 'number' && variable.validation?.min !== undefined) {
        if (typeof value === 'number' && value < variable.validation.min) {
          throw new PromptRenderError(`Variable ${variable.name} must be at least ${variable.validation.min}`);
        }
      }
      if (variable.type === 'number' && variable.validation?.max !== undefined) {
        if (typeof value === 'number' && value > variable.validation.max) {
          throw new PromptRenderError(`Variable ${variable.name} must be at most ${variable.validation.max}`);
        }
      }
      if (variable.validation?.enum && !variable.validation.enum.includes(value)) {
        throw new PromptRenderError(`Variable ${variable.name} must be one of: ${variable.validation.enum.join(', ')}`);
      }
    }

    // Replace placeholder
    const finalValue = value === undefined ? `{{${variable.name}}}` : String(value);
    content = content.replace(new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g'), finalValue);
  }

  return {
    system: version.systemPrompt || '',
    messages: [{ role: 'user', content }],
    variables,
    estimatedTokens: Math.ceil(content.length / 4) + (version.systemPrompt ? Math.ceil(version.systemPrompt.length / 4) : 0),
  };
}

export interface ABTestResults {
  winner: 'A' | 'B' | 'tie';
  confidenceLevel: number;
  sampleSizeA: number;
  sampleSizeB: number;
  primaryMetricImprovement: number;
}

export class ABTestEngine {
  private tests = new Map<string, ABTest>();
  private assignments = new Map<string, 'A' | 'B'>(); // userId -> variant

  createTest(test: Omit<ABTest, 'id' | 'status'>): ABTest {
    const newTest: ABTest = { ...test, id: `ab-${Date.now()}`, status: 'draft' };
    this.tests.set(newTest.id, newTest);
    return newTest;
  }

  getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }

  startTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'draft') return false;
    test.status = 'running';
    test.startedAt = new Date();
    return true;
  }

  assignVariant(testId: string, requestId: string, userId?: string): 'A' | 'B' {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return 'A';

    // Consistent assignment for same user
    if (userId) {
      const existing = this.assignments.get(`${testId}:${userId}`);
      if (existing) return existing;
    }

    const variant = Math.random() < test.config.trafficSplit ? 'A' : 'B';
    if (userId) {
      this.assignments.set(`${testId}:${userId}`, variant);
    }
    return variant;
  }

  getVariantVersionId(testId: string, variant: 'A' | 'B'): string | undefined {
    const test = this.tests.get(testId);
    if (!test) return undefined;
    return variant === 'A' ? test.variantA : test.variantB;
  }

  getActiveTestsForPrompt(promptId: string): ABTest[] {
    return Array.from(this.tests.values()).filter(t => t.templateId === promptId && t.status === 'running');
  }

  completeTest(testId: string): ABTestResults | undefined {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return undefined;

    test.status = 'completed';
    test.endedAt = new Date();

    // Mock results for testing
    return {
      winner: Math.random() > 0.5 ? 'A' : 'B',
      confidenceLevel: 0.95,
      sampleSizeA: Math.floor(test.config.sampleSize * test.config.trafficSplit),
      sampleSizeB: Math.floor(test.config.sampleSize * (1 - test.config.trafficSplit)),
      primaryMetricImprovement: (Math.random() * 0.2) - 0.1,
    };
  }
}

export const globalABTestEngine = new ABTestEngine();
