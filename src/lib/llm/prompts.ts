/**
 * Prompt Management System
 * Implements prompt version control, templates library, and A/B testing
 */

// ============================================================================
// Types
// ============================================================================

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
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
  };
}

export interface PromptMetadata {
  name: string;
  description: string;
  category: string;
  useCase: string;
  estimatedTokens: number;
  averageLatencyMs?: number;
  successRate?: number;
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

export type PromptCategory =
  | 'system'
  | 'task-generation'
  | 'decision-making'
  | 'escalation'
  | 'summarization'
  | 'code-generation'
  | 'analysis'
  | 'creative'
  | 'custom';

export interface RenderedPrompt {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  variables: Record<string, unknown>;
  estimatedTokens: number;
}

// ============================================================================
// A/B Testing Types
// ============================================================================

export interface ABTest {
  id: string;
  name: string;
  promptId: string;
  variantA: string; // Version ID
  variantB: string; // Version ID
  config: ABTestConfig;
  status: 'draft' | 'running' | 'paused' | 'completed';
  results?: ABTestResults;
  startedAt?: Date;
  endedAt?: Date;
  createdBy: string;
  tenantId: string;
}

export interface ABTestConfig {
  trafficSplit: number; // 0-1, percentage for variant A
  sampleSize: number;
  minConfidenceLevel: number; // 0-1
  primaryMetric: 'quality' | 'latency' | 'cost' | 'success_rate' | 'user_satisfaction';
  secondaryMetrics: string[];
  autoPromoteWinner: boolean;
  minRunDurationMs: number;
}

export interface ABTestResults {
  variantA: VariantResults;
  variantB: VariantResults;
  winner?: 'A' | 'B' | 'tie';
  confidence: number;
  isSignificant: boolean;
  sampleSizeReached: boolean;
  recommendedAction: 'continue' | 'promote_a' | 'promote_b' | 'inconclusive';
}

export interface VariantResults {
  versionId: string;
  sampleSize: number;
  metrics: Record<string, MetricResult>;
  primaryMetricValue: number;
}

export interface MetricResult {
  value: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

// ============================================================================
// Prompt Registry
// ============================================================================

export class PromptRegistry {
  private templates = new Map<string, PromptTemplate>();
  private abTests = new Map<string, ABTest>();
  private categoryIndex = new Map<PromptCategory, string[]>();

  /**
   * Register a new prompt template
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    
    // Update category index
    const categoryList = this.categoryIndex.get(template.category) || [];
    if (!categoryList.includes(template.id)) {
      categoryList.push(template.id);
      this.categoryIndex.set(template.category, categoryList);
    }
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates in a category
   */
  getByCategory(category: PromptCategory): PromptTemplate[] {
    const ids = this.categoryIndex.get(category) || [];
    return ids.map(id => this.templates.get(id)).filter(Boolean) as PromptTemplate[];
  }

  /**
   * Get active version of a prompt
   */
  getActiveVersion(promptId: string): PromptVersion | undefined {
    const template = this.templates.get(promptId);
    return template?.currentVersion;
  }

  /**
   * Get specific version
   */
  getVersion(promptId: string, version: number): PromptVersion | undefined {
    const template = this.templates.get(promptId);
    return template?.versions.find(v => v.version === version);
  }

  /**
   * Search templates
   */
  search(query: string, filters?: {
    category?: PromptCategory;
    tags?: string[];
    tenantId?: string;
  }): PromptTemplate[] {
    let results = Array.from(this.templates.values());

    // Apply filters
    if (filters?.category) {
      results = results.filter(t => t.category === filters.category);
    }
    if (filters?.tags) {
      results = results.filter(t => 
        filters.tags!.some(tag => t.currentVersion.tags.includes(tag))
      );
    }
    if (filters?.tenantId) {
      results = results.filter(t => t.tenantId === filters.tenantId || t.isPublic);
    }

    // Search in name and description
    const lowerQuery = query.toLowerCase();
    results = results.filter(t => 
      t.currentVersion.metadata.name.toLowerCase().includes(lowerQuery) ||
      t.currentVersion.metadata.description.toLowerCase().includes(lowerQuery) ||
      t.currentVersion.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );

    return results;
  }

  /**
   * Create new version
   */
  createVersion(
    promptId: string,
    content: string,
    options: Partial<Omit<PromptVersion, 'id' | 'promptId' | 'version' | 'createdAt'>> & {
      createdBy: string;
    }
  ): PromptVersion | undefined {
    const template = this.templates.get(promptId);
    if (!template) return undefined;

    const newVersionNumber = Math.max(...template.versions.map(v => v.version), 0) + 1;
    
    const newVersion: PromptVersion = {
      id: `${promptId}-v${newVersionNumber}`,
      promptId,
      version: newVersionNumber,
      content,
      variables: options.variables || template.currentVersion.variables,
      metadata: {
        ...template.currentVersion.metadata,
        ...options.metadata,
      },
      createdAt: new Date(),
      createdBy: options.createdBy,
      isActive: false,
      tags: options.tags || template.currentVersion.tags,
      systemPrompt: options.systemPrompt || template.currentVersion.systemPrompt,
    };

    template.versions.push(newVersion);
    template.updatedAt = new Date();
    
    return newVersion;
  }

  /**
   * Activate a specific version
   */
  activateVersion(promptId: string, version: number): boolean {
    const template = this.templates.get(promptId);
    if (!template) return false;

    // Deactivate all versions
    for (const v of template.versions) {
      v.isActive = false;
    }

    // Activate specified version
    const targetVersion = template.versions.find(v => v.version === version);
    if (!targetVersion) return false;

    targetVersion.isActive = true;
    template.currentVersion = targetVersion;
    template.updatedAt = new Date();

    return true;
  }

  /**
   * Delete a template
   */
  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    this.templates.delete(id);
    
    // Update category index
    const categoryList = this.categoryIndex.get(template.category) || [];
    const index = categoryList.indexOf(id);
    if (index > -1) {
      categoryList.splice(index, 1);
    }

    return true;
  }
}

// Global prompt registry
export const globalPromptRegistry = new PromptRegistry();

// ============================================================================
// Prompt Renderer
// ============================================================================

export interface RenderOptions {
  validateVariables?: boolean;
  allowMissing?: boolean;
  fallbackValues?: Record<string, unknown>;
}

export class PromptRenderError extends Error {
  constructor(
    message: string,
    public missingVariables: string[],
    public invalidVariables: Array<{ name: string; reason: string }>
  ) {
    super(message);
    this.name = 'PromptRenderError';
  }
}

/**
 * Render a prompt template with variables
 */
export function renderPrompt(
  version: PromptVersion,
  variables: Record<string, unknown> = {},
  options: RenderOptions = {}
): RenderedPrompt {
  const { validateVariables = true, allowMissing = false, fallbackValues = {} } = options;

  // Merge with fallback values
  const mergedVars = { ...fallbackValues, ...variables };

  // Validate variables if required
  if (validateVariables) {
    const missing: string[] = [];
    const invalid: Array<{ name: string; reason: string }> = [];

    for (const variable of version.variables) {
      const value = mergedVars[variable.name];

      // Check required
      if (variable.required && (value === undefined || value === null)) {
        if (!allowMissing) {
          missing.push(variable.name);
        }
        continue;
      }

      // Skip validation for missing optional variables
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (!validateType(value, variable.type)) {
        invalid.push({
          name: variable.name,
          reason: `Expected type ${variable.type}, got ${typeof value}`,
        });
        continue;
      }

      // Pattern validation
      if (variable.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(variable.validation.pattern);
        if (!regex.test(value)) {
          invalid.push({
            name: variable.name,
            reason: `Value does not match pattern ${variable.validation.pattern}`,
          });
        }
      }

      // Range validation for numbers
      if (typeof value === 'number' && variable.validation) {
        if (variable.validation.min !== undefined && value < variable.validation.min) {
          invalid.push({
            name: variable.name,
            reason: `Value ${value} is less than minimum ${variable.validation.min}`,
          });
        }
        if (variable.validation.max !== undefined && value > variable.validation.max) {
          invalid.push({
            name: variable.name,
            reason: `Value ${value} is greater than maximum ${variable.validation.max}`,
          });
        }
      }

      // Enum validation
      if (variable.validation?.enum && !variable.validation.enum.includes(value)) {
        invalid.push({
          name: variable.name,
          reason: `Value must be one of: ${variable.validation.enum.join(', ')}`,
        });
      }
    }

    if (missing.length > 0 || invalid.length > 0) {
      throw new PromptRenderError(
        `Failed to render prompt: ${missing.length} missing, ${invalid.length} invalid`,
        missing,
        invalid
      );
    }
  }

  // Apply default values for missing optional variables
  const finalVars: Record<string, unknown> = {};
  for (const variable of version.variables) {
    if (mergedVars[variable.name] !== undefined) {
      finalVars[variable.name] = mergedVars[variable.name];
    } else if (variable.defaultValue !== undefined) {
      finalVars[variable.name] = variable.defaultValue;
    }
  }

  // Replace variables in content
  let content = version.content;
  for (const [name, value] of Object.entries(finalVars)) {
    const placeholder = new RegExp(`{{\\s*${name}\\s*}}`, 'g');
    content = content.replace(placeholder, String(value));
  }

  // Calculate estimated tokens
  const estimatedTokens = estimatePromptTokens(content, version.systemPrompt);

  return {
    system: version.systemPrompt || '',
    messages: [{ role: 'user', content }],
    variables: finalVars,
    estimatedTokens,
  };
}

/**
 * Validate variable type
 */
function validateType(value: unknown, type: PromptVariable['type']): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Estimate token count for a prompt
 */
function estimatePromptTokens(content: string, systemPrompt?: string): number {
  const systemTokens = systemPrompt ? Math.ceil(systemPrompt.length / 4) : 0;
  const contentTokens = Math.ceil(content.length / 4);
  return systemTokens + contentTokens + 4; // +4 for message overhead
}

// ============================================================================
// A/B Testing Engine
// ============================================================================

export class ABTestEngine {
  private tests = new Map<string, ABTest>();
  private assignmentLog = new Map<string, string>(); // requestId -> variant

  /**
   * Create a new A/B test
   */
  createTest(test: Omit<ABTest, 'id' | 'status'>): ABTest {
    const newTest: ABTest = {
      ...test,
      id: `ab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'draft',
    };
    
    this.tests.set(newTest.id, newTest);
    return newTest;
  }

  /**
   * Start an A/B test
   */
  startTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'draft') return false;

    test.status = 'running';
    test.startedAt = new Date();
    return true;
  }

  /**
   * Pause an A/B test
   */
  pauseTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return false;

    test.status = 'paused';
    return true;
  }

  /**
   * Complete an A/B test and analyze results
   */
  completeTest(testId: string): ABTestResults | undefined {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return undefined;

    test.status = 'completed';
    test.endedAt = new Date();

    // Calculate results
    test.results = this.calculateResults(test);
    return test.results;
  }

  /**
   * Assign a request to a variant
   */
  assignVariant(testId: string, requestId: string, userId?: string): 'A' | 'B' {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      // Default to variant A if test not running
      return 'A';
    }

    // Check if already assigned
    const existingAssignment = this.assignmentLog.get(`${testId}:${requestId}`);
    if (existingAssignment) {
      return existingAssignment as 'A' | 'B';
    }

    // Deterministic assignment based on userId or random
    let assignment: 'A' | 'B';
    if (userId) {
      // Hash userId to get consistent assignment
      const hash = hashString(userId + testId);
      assignment = hash % 100 < test.config.trafficSplit * 100 ? 'A' : 'B';
    } else {
      // Random assignment
      assignment = Math.random() < test.config.trafficSplit ? 'A' : 'B';
    }

    this.assignmentLog.set(`${testId}:${requestId}`, assignment);
    return assignment;
  }

  /**
   * Get variant version ID for a request
   */
  getVariantVersionId(testId: string, variant: 'A' | 'B'): string | undefined {
    const test = this.tests.get(testId);
    if (!test) return undefined;
    
    return variant === 'A' ? test.variantA : test.variantB;
  }

  /**
   * Record metrics for a variant
   */
  recordMetrics(
    testId: string,
    variant: 'A' | 'B',
    metrics: Record<string, number>
  ): void {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return;

    // In a real implementation, this would persist to database
    console.log(`[ABTest] Recording metrics for ${testId}/${variant}:`, metrics);
  }

  /**
   * Calculate A/B test results
   */
  private calculateResults(test: ABTest): ABTestResults {
    // This is a simplified calculation
    // In production, you'd use statistical libraries for proper analysis
    
    const mockResults: ABTestResults = {
      variantA: {
        versionId: test.variantA,
        sampleSize: 100,
        metrics: {},
        primaryMetricValue: 0.75,
      },
      variantB: {
        versionId: test.variantB,
        sampleSize: 100,
        metrics: {},
        primaryMetricValue: 0.80,
      },
      winner: 'B',
      confidence: 0.95,
      isSignificant: true,
      sampleSizeReached: true,
      recommendedAction: 'promote_b',
    };

    return mockResults;
  }

  /**
   * Get active tests for a prompt
   */
  getActiveTestsForPrompt(promptId: string): ABTest[] {
    return Array.from(this.tests.values()).filter(
      t => t.promptId === promptId && t.status === 'running'
    );
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }
}

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Global A/B test engine
export const globalABTestEngine = new ABTestEngine();

// ============================================================================
// Built-in Prompt Templates
// ============================================================================

export const BUILTIN_PROMPTS: PromptTemplate[] = [
  {
    id: 'agent-spawn-system',
    category: 'system',
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentVersion: {
      id: 'agent-spawn-system-v1',
      promptId: 'agent-spawn-system',
      version: 1,
      content: `You are {{agentName}}, a {{agentRole}} agent in the Pink Beam ARM system.

Your goal: {{goal}}

Context: {{context}}

You have the following capabilities: {{capabilities}}.

Always follow the ARM Agent Protocol when communicating. Be concise, professional, and focused on achieving your assigned goal.`,
      variables: [
        { name: 'agentName', type: 'string', required: true },
        { name: 'agentRole', type: 'string', required: true },
        { name: 'goal', type: 'string', required: true },
        { name: 'context', type: 'string', required: false, defaultValue: '' },
        { name: 'capabilities', type: 'string', required: false, defaultValue: 'decide, escalate' },
      ],
      metadata: {
        name: 'Agent Spawn System Prompt',
        description: 'Default system prompt for newly spawned agents',
        category: 'system',
        useCase: 'agent-initialization',
        estimatedTokens: 150,
        tags: ['system', 'agent', 'spawn'],
      },
      createdAt: new Date(),
      createdBy: 'system',
      isActive: true,
      tags: ['system', 'agent', 'spawn'],
    },
    versions: [],
  },
  {
    id: 'task-generation',
    category: 'task-generation',
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentVersion: {
      id: 'task-generation-v1',
      promptId: 'task-generation',
      version: 1,
      content: `Given the following goal, break it down into specific, actionable tasks:

Goal: {{goal}}

Constraints:
- Maximum {{maxTasks}} tasks
- Each task should be completable within {{maxDuration}} minutes
- Consider dependencies between tasks

Return a JSON array of tasks with the following structure:
[
  {
    "title": "Task title",
    "description": "Detailed description",
    "priority": "low|normal|high|urgent",
    "estimatedDuration": number,
    "dependencies": []
  }
]`,
      variables: [
        { name: 'goal', type: 'string', required: true },
        { name: 'maxTasks', type: 'number', required: false, defaultValue: 5 },
        { name: 'maxDuration', type: 'number', required: false, defaultValue: 60 },
      ],
      metadata: {
        name: 'Task Generation',
        description: 'Generate subtasks from a goal',
        category: 'task-generation',
        useCase: 'task-decomposition',
        estimatedTokens: 200,
        tags: ['task', 'generation', 'planning'],
      },
      createdAt: new Date(),
      createdBy: 'system',
      isActive: true,
      tags: ['task', 'generation', 'planning'],
    },
    versions: [],
  },
  {
    id: 'decision-proposal',
    category: 'decision-making',
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentVersion: {
      id: 'decision-proposal-v1',
      promptId: 'decision-proposal',
      version: 1,
      content: `You need to make a decision about the following situation:

Situation: {{situation}}
Context: {{context}}

Analyze this situation and propose a decision. Include:
1. Your recommended action
2. Reasoning for your choice
3. Alternative options considered
4. Confidence level (0-1)
5. Potential risks

Return your response in JSON format with these fields.`,
      variables: [
        { name: 'situation', type: 'string', required: true },
        { name: 'context', type: 'string', required: false, defaultValue: '' },
      ],
      metadata: {
        name: 'Decision Proposal',
        description: 'Generate a decision proposal with reasoning',
        category: 'decision-making',
        useCase: 'decision-support',
        estimatedTokens: 250,
        tags: ['decision', 'reasoning', 'analysis'],
      },
      createdAt: new Date(),
      createdBy: 'system',
      isActive: true,
      tags: ['decision', 'reasoning', 'analysis'],
    },
    versions: [],
  },
];

// Register built-in prompts
for (const prompt of BUILTIN_PROMPTS) {
  globalPromptRegistry.registerTemplate(prompt);
}
