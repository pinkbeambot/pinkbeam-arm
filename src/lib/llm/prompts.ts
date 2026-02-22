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
  autoPromoteWinner: boolean;
}

export class PromptRegistry {
  private templates = new Map<string, PromptTemplate>();

  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  getActiveVersion(promptId: string): PromptVersion | undefined {
    return this.templates.get(promptId)?.currentVersion;
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
}

export const globalPromptRegistry = new PromptRegistry();

export class PromptRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptRenderError';
  }
}

export function renderPrompt(version: PromptVersion, variables: Record<string, unknown> = {}): RenderedPrompt {
  let content = version.content;
  for (const variable of version.variables) {
    const value = variables[variable.name] ?? variable.defaultValue ?? '';
    content = content.replace(new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g'), String(value));
  }
  return {
    system: version.systemPrompt || '',
    messages: [{ role: 'user', content }],
    variables,
    estimatedTokens: Math.ceil(content.length / 4) + (version.systemPrompt ? Math.ceil(version.systemPrompt.length / 4) : 0),
  };
}

export class ABTestEngine {
  private tests = new Map<string, ABTest>();

  createTest(test: Omit<ABTest, 'id' | 'status'>): ABTest {
    const newTest: ABTest = { ...test, id: `ab-${Date.now()}`, status: 'draft' };
    this.tests.set(newTest.id, newTest);
    return newTest;
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
    return Math.random() < test.config.trafficSplit ? 'A' : 'B';
  }

  getActiveTestsForPrompt(promptId: string): ABTest[] {
    return Array.from(this.tests.values()).filter(t => t.templateId === promptId && t.status === 'running');
  }
}

export const globalABTestEngine = new ABTestEngine();
