import { z } from 'zod';

// ============================================================================
// Agent Configuration Validation
// ============================================================================

// Basic Info Schema
export const basicInfoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
});

// Instructions Schema
export const instructionsSchema = z.object({
  system_prompt: z.string().min(1).max(10000).optional(),
  success_criteria: z.string().max(2000).optional(),
  examples: z.array(
    z.object({
      input: z.string(),
      output: z.string(),
      description: z.string().optional(),
    })
  ).optional(),
});

// Tool Configuration Schema
export const toolConfigSchema = z.record(z.unknown());

export const toolsSchema = z.object({
  enabled: z.array(z.string()).optional(),
  config: toolConfigSchema.optional(),
});

// Permissions Schema
export const dataAccessSchema = z.record(
  z.enum(['none', 'read', 'write', 'admin'])
);

export const permissionsSchema = z.object({
  data_access: dataAccessSchema.optional(),
  external_apis: z.array(z.string()).optional(),
});

// Escalation Triggers Schema
export const escalationTriggerSchema = z.union([
  z.boolean(),
  z.object({ amount_usd: z.number().positive() }),
  z.object({ deal_size_usd: z.number().positive() }),
  z.object({ confidence_threshold: z.number().min(0).max(1) }),
]);

export const escalationTriggersSchema = z.record(escalationTriggerSchema).optional();

export const escalationSchema = z.object({
  triggers: escalationTriggersSchema,
  thresholds: z.object({
    confidence: z.number().min(0).max(1).optional(),
  }).optional(),
  quiet_hours: z.object({
    enabled: z.boolean().optional(),
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    timezone: z.string().optional(),
  }).optional(),
});

// Advanced Settings Schema
export const advancedSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  timeout_seconds: z.number().int().positive().optional(),
  json_mode: z.boolean().optional(),
});

// Full Configuration Schema
export const agentConfigSchema = z.object({
  basic_info: basicInfoSchema.optional(),
  instructions: instructionsSchema.optional(),
  tools: toolsSchema.optional(),
  permissions: permissionsSchema.optional(),
  escalation: escalationSchema.optional(),
  advanced: advancedSchema.optional(),
});

// ============================================================================
// API Input/Output Schemas
// ============================================================================

// Get Config - No body needed
// Update Config
export const updateAgentConfigSchema = z.object({
  config: agentConfigSchema,
  version_name: z.string().max(255).optional(),
  version_description: z.string().max(1000).optional(),
});

// Get Versions Query
export const listConfigVersionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Restore Version
export const restoreConfigVersionSchema = z.object({
  version_id: z.string().uuid().optional(),
  version_number: z.number().int().positive().optional(),
}).refine(
  (data) => data.version_id || data.version_number,
  { message: 'Either version_id or version_number must be provided' }
);

// Test Config
export const testAgentConfigSchema = z.object({
  test_input: z.string().min(1).max(5000),
  config: agentConfigSchema.optional(), // Optional - test unsaved config
  use_current: z.boolean().default(true), // Use current config if no config provided
});

// List Templates Query
export const listAgentTemplatesQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// Apply Template
export const applyTemplateSchema = z.object({
  template_id: z.string().uuid(),
  merge_with_existing: z.boolean().default(false),
});

// Compare Versions
export const compareVersionsQuerySchema = z.object({
  version_a: z.union([z.string().uuid(), z.number().int().positive()]),
  version_b: z.union([z.string().uuid(), z.number().int().positive()]),
});

// ============================================================================
// Type Exports
// ============================================================================

export type BasicInfo = z.infer<typeof basicInfoSchema>;
export type Instructions = z.infer<typeof instructionsSchema>;
export type Tools = z.infer<typeof toolsSchema>;
export type Permissions = z.infer<typeof permissionsSchema>;
export type Escalation = z.infer<typeof escalationSchema>;
export type Advanced = z.infer<typeof advancedSchema>;
export type AgentConfig = z.infer<typeof agentConfigSchema>;

export type UpdateAgentConfigInput = z.infer<typeof updateAgentConfigSchema>;
export type ListConfigVersionsQuery = z.infer<typeof listConfigVersionsQuerySchema>;
export type RestoreConfigVersionInput = z.infer<typeof restoreConfigVersionSchema>;
export type TestAgentConfigInput = z.infer<typeof testAgentConfigSchema>;
export type ListAgentTemplatesQuery = z.infer<typeof listAgentTemplatesQuerySchema>;
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;
export type CompareVersionsQuery = z.infer<typeof compareVersionsQuerySchema>;

// ============================================================================
// Configuration Validation Helpers
// ============================================================================

export interface ConfigValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
}

/**
 * Validates an agent configuration and returns detailed error information
 */
export function validateAgentConfig(config: unknown): ConfigValidationResult {
  const result = agentConfigSchema.safeParse(config);
  
  if (result.success) {
    // Additional semantic validation
    const errors: ConfigValidationError[] = [];
    const validated = result.data;
    
    // Check system prompt length
    if (validated.instructions?.system_prompt) {
      const promptLength = validated.instructions.system_prompt.length;
      if (promptLength < 50) {
        errors.push({
          field: 'instructions.system_prompt',
          message: 'System prompt is very short. Consider providing more detailed instructions.',
          severity: 'warning',
        });
      }
      if (promptLength > 8000) {
        errors.push({
          field: 'instructions.system_prompt',
          message: 'System prompt is very long. Consider condensing for better performance.',
          severity: 'warning',
        });
      }
    }
    
    // Check temperature range recommendation
    if (validated.advanced?.temperature !== undefined) {
      const temp = validated.advanced.temperature;
      if (temp > 1.5) {
        errors.push({
          field: 'advanced.temperature',
          message: 'Temperature above 1.5 may produce unpredictable results.',
          severity: 'warning',
        });
      }
      if (temp < 0.1) {
        errors.push({
          field: 'advanced.temperature',
          message: 'Temperature below 0.1 may produce overly deterministic responses.',
          severity: 'warning',
        });
      }
    }
    
    // Check escalation threshold
    if (validated.escalation?.thresholds?.confidence !== undefined) {
      const confidence = validated.escalation.thresholds.confidence;
      if (confidence < 0.3) {
        errors.push({
          field: 'escalation.thresholds.confidence',
          message: 'Very low escalation threshold may cause excessive escalations.',
          severity: 'warning',
        });
      }
      if (confidence > 0.95) {
        errors.push({
          field: 'escalation.thresholds.confidence',
          message: 'Very high escalation threshold may prevent necessary escalations.',
          severity: 'warning',
        });
      }
    }
    
    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }
  
  // Convert Zod errors to our format
  const errors: ConfigValidationError[] = result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    severity: 'error',
  }));
  
  return {
    isValid: false,
    errors,
  };
}

/**
 * Recursively strip empty values (null, undefined, empty strings) from an object
 */
export function stripEmptyValues<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .map(stripEmptyValues)
      .filter((item) => item !== null && item !== undefined && item !== '') as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const stripped = stripEmptyValues(value);
    if (stripped !== null && stripped !== undefined && stripped !== '') {
      result[key] = stripped;
    }
  }
  return result as T;
}

/**
 * Deep merge two configuration objects
 */
export function mergeConfigs(
  base: AgentConfig,
  override: AgentConfig,
  strategy: 'deep' | 'shallow' = 'deep'
): AgentConfig {
  if (strategy === 'shallow') {
    return { ...base, ...override };
  }
  
  // Deep merge
  const merged: AgentConfig = { ...base };
  
  for (const key of Object.keys(override) as Array<keyof AgentConfig>) {
    const baseValue = base[key];
    const overrideValue = override[key];
    
    if (
      typeof baseValue === 'object' &&
      typeof overrideValue === 'object' &&
      baseValue !== null &&
      overrideValue !== null &&
      !Array.isArray(overrideValue)
    ) {
      merged[key] = mergeConfigs(
        baseValue as AgentConfig,
        overrideValue as AgentConfig,
        'deep'
      ) as unknown as typeof merged[typeof key];
    } else if (overrideValue !== undefined) {
      merged[key] = overrideValue;
    }
  }
  
  return merged;
}
