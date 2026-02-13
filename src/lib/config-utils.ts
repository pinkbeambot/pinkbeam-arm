import { AgentConfig } from '@/lib/validation/agent-config';

// ============================================================================
// Configuration Diff Types
// ============================================================================

export interface ConfigDiffChange {
  path: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue?: unknown;
  newValue?: unknown;
}

export interface ConfigDiffResult {
  changes: ConfigDiffChange[];
  added: ConfigDiffChange[];
  removed: ConfigDiffChange[];
  modified: ConfigDiffChange[];
  summary: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
}

// ============================================================================
// Diff Generation Functions
// ============================================================================

/**
 * Generates a deep diff between two configuration objects
 */
export function generateConfigDiff(
  oldConfig: AgentConfig | null | undefined,
  newConfig: AgentConfig | null | undefined
): ConfigDiffResult {
  const changes: ConfigDiffChange[] = [];
  
  function compareValues(
    oldVal: unknown,
    newVal: unknown,
    path: string
  ): void {
    // Handle null/undefined
    if (oldVal === null && newVal === null) {
      changes.push({ path, type: 'unchanged', oldValue: oldVal, newValue: newVal });
      return;
    }
    
    if (oldVal === null || oldVal === undefined) {
      if (newVal !== null && newVal !== undefined) {
        changes.push({ path, type: 'added', newValue: newVal });
      }
      return;
    }
    
    if (newVal === null || newVal === undefined) {
      changes.push({ path, type: 'removed', oldValue: oldVal });
      return;
    }
    
    // Handle different types
    const oldType = typeof oldVal;
    const newType = typeof newVal;
    
    if (oldType !== newType) {
      changes.push({ path, type: 'modified', oldValue: oldVal, newValue: newVal });
      return;
    }
    
    // Handle arrays
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ path, type: 'modified', oldValue: oldVal, newValue: newVal });
      } else {
        changes.push({ path, type: 'unchanged', oldValue: oldVal, newValue: newVal });
      }
      return;
    }
    
    // Handle objects
    if (oldType === 'object' && oldVal !== null && newVal !== null) {
      const oldObj = oldVal as Record<string, unknown>;
      const newObj = newVal as Record<string, unknown>;
      
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
      
      for (const key of allKeys) {
        compareValues(
          oldObj[key],
          newObj[key],
          path ? `${path}.${key}` : key
        );
      }
      return;
    }
    
    // Handle primitives
    if (oldVal !== newVal) {
      changes.push({ path, type: 'modified', oldValue: oldVal, newValue: newVal });
    } else {
      changes.push({ path, type: 'unchanged', oldValue: oldVal, newValue: newVal });
    }
  }
  
  compareValues(oldConfig, newConfig, '');
  
  const added = changes.filter(c => c.type === 'added');
  const removed = changes.filter(c => c.type === 'removed');
  const modified = changes.filter(c => c.type === 'modified');
  
  return {
    changes,
    added,
    removed,
    modified,
    summary: {
      totalChanges: added.length + removed.length + modified.length,
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
    },
  };
}

/**
 * Formats a diff for human-readable display
 */
export function formatDiffForDisplay(diff: ConfigDiffResult): string {
  const lines: string[] = [];
  
  if (diff.summary.totalChanges === 0) {
    return 'No changes detected.';
  }
  
  lines.push(`Configuration Changes (${diff.summary.totalChanges} total):`);
  lines.push('');
  
  if (diff.added.length > 0) {
    lines.push('Added:');
    for (const change of diff.added) {
      const value = JSON.stringify(change.newValue).slice(0, 50);
      lines.push(`  + ${change.path}: ${value}${value.length >= 50 ? '...' : ''}`);
    }
    lines.push('');
  }
  
  if (diff.removed.length > 0) {
    lines.push('Removed:');
    for (const change of diff.removed) {
      const value = JSON.stringify(change.oldValue).slice(0, 50);
      lines.push(`  - ${change.path}: ${value}${value.length >= 50 ? '...' : ''}`);
    }
    lines.push('');
  }
  
  if (diff.modified.length > 0) {
    lines.push('Modified:');
    for (const change of diff.modified) {
      const oldValue = JSON.stringify(change.oldValue).slice(0, 30);
      const newValue = JSON.stringify(change.newValue).slice(0, 30);
      lines.push(`  ~ ${change.path}:`);
      lines.push(`    - ${oldValue}${oldValue.length >= 30 ? '...' : ''}`);
      lines.push(`    + ${newValue}${newValue.length >= 30 ? '...' : ''}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Gets a summary of what changed between two configs
 */
export function getChangeSummary(
  oldConfig: AgentConfig | null | undefined,
  newConfig: AgentConfig | null | undefined
): string {
  const diff = generateConfigDiff(oldConfig, newConfig);
  
  if (diff.summary.totalChanges === 0) {
    return 'No changes';
  }
  
  const parts: string[] = [];
  
  if (diff.added.length > 0) {
    parts.push(`${diff.added.length} added`);
  }
  if (diff.removed.length > 0) {
    parts.push(`${diff.removed.length} removed`);
  }
  if (diff.modified.length > 0) {
    parts.push(`${diff.modified.length} modified`);
  }
  
  return parts.join(', ');
}

/**
 * Gets the top-level sections that changed
 */
export function getChangedSections(
  oldConfig: AgentConfig | null | undefined,
  newConfig: AgentConfig | null | undefined
): string[] {
  const diff = generateConfigDiff(oldConfig, newConfig);
  const sections = new Set<string>();
  
  for (const change of [...diff.added, ...diff.removed, ...diff.modified]) {
    const topLevel = change.path.split('.')[0];
    if (topLevel) {
      sections.add(topLevel);
    }
  }
  
  return Array.from(sections);
}

// ============================================================================
// Configuration Sanitization
// ============================================================================

/**
 * Removes sensitive or internal fields from a config before returning to client
 */
export function sanitizeConfig(config: AgentConfig): AgentConfig {
  // Remove any internal fields that shouldn't be exposed
  const sanitized = JSON.parse(JSON.stringify(config)) as AgentConfig;
  
  // Remove any fields starting with underscore
  function removeInternalFields(obj: Record<string, unknown>): void {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('_')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        removeInternalFields(obj[key] as Record<string, unknown>);
      }
    }
  }
  
  removeInternalFields(sanitized as unknown as Record<string, unknown>);
  
  return sanitized;
}

/**
 * Strips empty or undefined values from a config
 */
export function stripEmptyValues(config: AgentConfig): AgentConfig {
  function strip(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return undefined;
    }
    
    if (Array.isArray(obj)) {
      const stripped = obj.map(strip).filter(v => v !== undefined);
      return stripped.length > 0 ? stripped : undefined;
    }
    
    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const strippedValue = strip(value);
        if (strippedValue !== undefined) {
          result[key] = strippedValue;
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    }
    
    return obj;
  }
  
  const stripped = strip(config);
  return (stripped || {}) as AgentConfig;
}

// ============================================================================
// Configuration Defaults
// ============================================================================

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  basic_info: {
    role: 'General Worker',
    description: '',
  },
  instructions: {
    system_prompt: 'You are a helpful AI assistant. Complete tasks efficiently and ask for clarification when needed.',
    success_criteria: 'Task completed to satisfaction',
  },
  tools: {
    enabled: [],
    config: {},
  },
  permissions: {
    data_access: { none: 'none', read: 'none', write: 'none', admin: 'none' },
    external_apis: [],
  },
  escalation: {
    triggers: {
      ambiguous_requirements: true,
      high_stakes: true,
    },
    thresholds: {
      confidence: 0.7,
    },
  },
  advanced: {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    max_tokens: 2000,
    timeout_seconds: 300,
  },
};

/**
 * Applies defaults to a partial config
 */
export function applyConfigDefaults(config: Partial<AgentConfig>): AgentConfig {
  return mergeDeep(DEFAULT_AGENT_CONFIG, config) as AgentConfig;
}

function mergeDeep(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      result[key] = mergeDeep(
        (result[key] as Record<string, unknown>) || {},
        source[key] as Record<string, unknown>
      );
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  
  return result;
}

// ============================================================================
// Template Application
// ============================================================================

/**
 * Applies a template to create a new config
 */
export function applyTemplate(
  templateConfig: AgentConfig,
  customizations: Partial<AgentConfig> = {},
  mergeStrategy: 'replace' | 'merge' = 'merge'
): AgentConfig {
  if (mergeStrategy === 'replace') {
    return { ...templateConfig, ...customizations };
  }
  
  return mergeDeep(
    templateConfig as Record<string, unknown>,
    customizations as Record<string, unknown>
  ) as AgentConfig;
}

/**
 * Extracts template variables from a config
 */
export function extractTemplateVariables(config: AgentConfig): string[] {
  const variables: string[] = [];
  const configStr = JSON.stringify(config);
  
  // Match {{variable}} pattern
  const matches = configStr.match(/\{\{(\w+)\}\}/g);
  if (matches) {
    for (const match of matches) {
      const varName = match.slice(2, -2); // Remove {{ and }}
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }
  }
  
  return variables;
}

/**
 * Substitutes template variables with actual values
 */
export function substituteTemplateVariables(
  config: AgentConfig,
  variables: Record<string, string>
): AgentConfig {
  const configStr = JSON.stringify(config);
  
  let result = configStr;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return JSON.parse(result) as AgentConfig;
}
