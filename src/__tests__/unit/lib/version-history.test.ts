import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateConfigDiff, formatDiffForDisplay, getChangeSummary, getChangedSections } from '@/lib/config-utils';
import { validateAgentConfig } from '@/lib/validation';
import type { AgentConfig } from '@/lib/validation/agent-config';

// ============================================================================
// Config Diff Tests
// ============================================================================

describe('generateConfigDiff', () => {
  const baseConfig: AgentConfig = {
    basic_info: {
      name: 'Test Agent',
      role: 'worker',
      description: 'A test agent',
    },
    instructions: {
      system_prompt: 'You are a test agent.',
      success_criteria: 'Task completed successfully',
    },
    advanced: {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      max_tokens: 2000,
    },
  };

  it('should return empty diff for identical configs', () => {
    const diff = generateConfigDiff(baseConfig, baseConfig);
    
    expect(diff.summary.totalChanges).toBe(0);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
  });

  it('should detect added fields', () => {
    const newConfig: AgentConfig = {
      ...baseConfig,
      tools: {
        enabled: ['web_search', 'calculator'],
        config: {},
      },
    };

    const diff = generateConfigDiff(baseConfig, newConfig);
    
    expect(diff.summary.totalChanges).toBeGreaterThan(0);
    expect(diff.added.length).toBeGreaterThan(0);
    expect(diff.added.some(c => c.path.includes('tools'))).toBe(true);
  });

  it('should detect removed fields', () => {
    const oldConfig: AgentConfig = {
      ...baseConfig,
      tools: {
        enabled: ['web_search'],
        config: {},
      },
    };

    const diff = generateConfigDiff(oldConfig, baseConfig);
    
    expect(diff.removed.some(c => c.path.includes('tools'))).toBe(true);
  });

  it('should detect modified fields', () => {
    const newConfig: AgentConfig = {
      ...baseConfig,
      basic_info: {
        ...baseConfig.basic_info,
        name: 'Updated Agent Name',
      },
    };

    const diff = generateConfigDiff(baseConfig, newConfig);
    
    const nameChange = diff.modified.find(c => c.path.includes('name'));
    expect(nameChange).toBeDefined();
    expect(nameChange?.oldValue).toBe('Test Agent');
    expect(nameChange?.newValue).toBe('Updated Agent Name');
  });

  it('should handle null/undefined configs', () => {
    const diff1 = generateConfigDiff(null, baseConfig);
    expect(diff1.added.length).toBeGreaterThan(0);

    const diff2 = generateConfigDiff(baseConfig, null);
    expect(diff2.removed.length).toBeGreaterThan(0);

    const diff3 = generateConfigDiff(undefined, undefined);
    expect(diff3.summary.totalChanges).toBe(0);
  });

  it('should detect nested changes', () => {
    const newConfig: AgentConfig = {
      ...baseConfig,
      advanced: {
        ...baseConfig.advanced,
        temperature: 0.9,
      },
    };

    const diff = generateConfigDiff(baseConfig, newConfig);
    
    const tempChange = diff.modified.find(c => c.path.includes('temperature'));
    expect(tempChange).toBeDefined();
    expect(tempChange?.oldValue).toBe(0.7);
    expect(tempChange?.newValue).toBe(0.9);
  });

  it('should track multiple changes correctly', () => {
    const newConfig: AgentConfig = {
      basic_info: {
        name: 'Completely Different',
        role: 'manager',
      },
      instructions: {
        system_prompt: 'New prompt',
      },
      tools: {
        enabled: ['new_tool'],
      },
    };

    const diff = generateConfigDiff(baseConfig, newConfig);
    
    expect(diff.summary.totalChanges).toBeGreaterThan(0);
    // Total changes should be sum of added, removed, and modified
    expect(diff.summary.addedCount + diff.summary.removedCount + diff.summary.modifiedCount).toBe(diff.summary.totalChanges);
  });
});

describe('formatDiffForDisplay', () => {
  it('should return "no changes" message for empty diff', () => {
    const diff = generateConfigDiff({}, {});
    const formatted = formatDiffForDisplay(diff);
    
    expect(formatted).toContain('No changes');
  });

  it('should format added changes', () => {
    const diff: ReturnType<typeof generateConfigDiff> = {
      changes: [
        { path: 'basic_info.name', type: 'added', newValue: 'New Agent' },
      ],
      added: [{ path: 'basic_info.name', type: 'added', newValue: 'New Agent' }],
      removed: [],
      modified: [],
      summary: {
        totalChanges: 1,
        addedCount: 1,
        removedCount: 0,
        modifiedCount: 0,
      },
    };

    const formatted = formatDiffForDisplay(diff);
    
    expect(formatted).toContain('Added:');
    expect(formatted).toContain('basic_info.name');
    expect(formatted).toContain('New Agent');
  });

  it('should format removed changes', () => {
    const diff: ReturnType<typeof generateConfigDiff> = {
      changes: [
        { path: 'tools.enabled', type: 'removed', oldValue: ['tool1'] },
      ],
      added: [],
      removed: [{ path: 'tools.enabled', type: 'removed', oldValue: ['tool1'] }],
      modified: [],
      summary: {
        totalChanges: 1,
        addedCount: 0,
        removedCount: 1,
        modifiedCount: 0,
      },
    };

    const formatted = formatDiffForDisplay(diff);
    
    expect(formatted).toContain('Removed:');
    expect(formatted).toContain('tools.enabled');
  });

  it('should format modified changes', () => {
    const diff: ReturnType<typeof generateConfigDiff> = {
      changes: [
        { 
          path: 'advanced.temperature', 
          type: 'modified', 
          oldValue: 0.7, 
          newValue: 0.9 
        },
      ],
      added: [],
      removed: [],
      modified: [{ 
        path: 'advanced.temperature', 
        type: 'modified', 
        oldValue: 0.7, 
        newValue: 0.9 
      }],
      summary: {
        totalChanges: 1,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 1,
      },
    };

    const formatted = formatDiffForDisplay(diff);
    
    expect(formatted).toContain('Modified:');
    expect(formatted).toContain('advanced.temperature');
    expect(formatted).toContain('0.7');
    expect(formatted).toContain('0.9');
  });

  it('should truncate long values', () => {
    const longValue = 'a'.repeat(100);
    const diff: ReturnType<typeof generateConfigDiff> = {
      changes: [
        { path: 'long.field', type: 'added', newValue: longValue },
      ],
      added: [{ path: 'long.field', type: 'added', newValue: longValue }],
      removed: [],
      modified: [],
      summary: {
        totalChanges: 1,
        addedCount: 1,
        removedCount: 0,
        modifiedCount: 0,
      },
    };

    const formatted = formatDiffForDisplay(diff);
    
    expect(formatted).toContain('...');
  });
});

describe('getChangeSummary', () => {
  it('should return "No changes" for empty diff', () => {
    const diff = generateConfigDiff({}, {});
    const summary = getChangeSummary({}, {});
    
    expect(summary).toBe('No changes');
  });

  it('should summarize single change type', () => {
    const oldConfig: AgentConfig = {};
    const newConfig: AgentConfig = { basic_info: { name: 'Test' } };
    
    const summary = getChangeSummary(oldConfig, newConfig);
    
    expect(summary).toContain('added');
    expect(summary).toContain('1');
  });

  it('should summarize multiple change types', () => {
    const oldConfig: AgentConfig = { 
      basic_info: { name: 'Old', description: 'Old desc' },
      tools: { enabled: ['tool1'] },
    };
    const newConfig: AgentConfig = { 
      basic_info: { name: 'New', description: 'Old desc' },
      advanced: { temperature: 0.7 },
    };
    
    const summary = getChangeSummary(oldConfig, newConfig);
    
    expect(summary).toContain('modified');
    expect(summary).toContain('added');
    expect(summary).toContain('removed');
  });
});

describe('getChangedSections', () => {
  it('should return empty array for no changes', () => {
    const config: AgentConfig = { basic_info: { name: 'test' } };
    const sections = getChangedSections(config, config);
    expect(sections).toEqual([]);
  });

  it('should identify top-level sections', () => {
    const oldConfig: AgentConfig = { basic_info: {} };
    const newConfig: AgentConfig = {
      basic_info: { name: 'Test' },
      instructions: { system_prompt: 'Test' },
    };
    
    const sections = getChangedSections(oldConfig, newConfig);
    
    expect(sections).toContain('basic_info');
    expect(sections).toContain('instructions');
  });

  it('should not duplicate sections', () => {
    const oldConfig: AgentConfig = { basic_info: { name: 'Old' } };
    const newConfig: AgentConfig = { basic_info: { name: 'New', role: 'worker' } };
    
    const sections = getChangedSections(oldConfig, newConfig);
    
    expect(sections).toEqual(['basic_info']);
  });
});

// ============================================================================
// Config Validation Tests
// ============================================================================

describe('validateAgentConfig', () => {
  it('should validate valid config', () => {
    const config: AgentConfig = {
      basic_info: { name: 'Test Agent' },
      instructions: { system_prompt: 'You are a helpful assistant with detailed instructions.' },
      advanced: { temperature: 0.7 },
    };

    const result = validateAgentConfig(config);
    
    expect(result.isValid).toBe(true);
    expect(result.errors.filter((e: { severity: string }) => e.severity === 'error')).toHaveLength(0);
  });

  it('should warn about short system prompt', () => {
    const config: AgentConfig = {
      instructions: { system_prompt: 'Hi' },
    };

    const result = validateAgentConfig(config);
    
    expect(result.errors.some((e: { field: string }) => e.field.includes('system_prompt'))).toBe(true);
  });

  it('should warn about high temperature', () => {
    const config: AgentConfig = {
      advanced: { temperature: 1.8 },
    };

    const result = validateAgentConfig(config);
    
    expect(result.errors.some((e: { field: string }) => e.field.includes('temperature'))).toBe(true);
  });

  it('should warn about low escalation threshold', () => {
    const config: AgentConfig = {
      escalation: { thresholds: { confidence: 0.2 } },
    };

    const result = validateAgentConfig(config);
    
    expect(result.errors.some((e: { field: string }) => e.field.includes('confidence'))).toBe(true);
  });
});

// ============================================================================
// API Response Type Tests
// ============================================================================

describe('Version History API Types', () => {
  it('should have correct version entry structure', () => {
    const mockVersion = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      version_number: 1,
      name: 'Initial setup',
      description: 'Created agent',
      change_type: 'manual' as const,
      change_source: 'api',
      changed_by: '123e4567-e89b-12d3-a456-426614174001',
      changed_by_name: 'John Doe',
      created_at: '2024-01-15T10:00:00Z',
      is_current: true,
      change_summary: {
        changed_fields: ['name', 'role'],
        is_initial: true,
      },
    };

    expect(mockVersion.version_number).toBe(1);
    expect(mockVersion.is_current).toBe(true);
    expect(mockVersion.change_summary?.changed_fields).toContain('name');
  });

  it('should handle restore version entry', () => {
    const mockRestoreVersion = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      version_number: 5,
      name: 'Restored from v3',
      description: 'Restored to version 3',
      change_type: 'restore' as const,
      change_source: 'ui',
      changed_by: '123e4567-e89b-12d3-a456-426614174001',
      changed_by_name: 'Jane Smith',
      created_at: '2024-01-20T14:30:00Z',
      is_current: true,
      change_summary: {
        restored_from_version: 3,
        previous_version: 4,
      },
    };

    expect(mockRestoreVersion.change_type).toBe('restore');
    expect(mockRestoreVersion.change_summary?.restored_from_version).toBe(3);
  });
});

// ============================================================================
// Restore Functionality Tests
// ============================================================================

describe('Restore Version Logic', () => {
  it('should not restore if already at version', () => {
    const currentVersion = 5;
    const targetVersion = 5;
    
    const canRestore = currentVersion !== targetVersion;
    
    expect(canRestore).toBe(false);
  });

  it('should allow restore to older version', () => {
    const versions = { current: 5, target: 3 };
    const canRestore = versions.current !== versions.target && versions.target < versions.current;
    
    expect(canRestore).toBe(true);
  });

  it('should calculate correct version numbers after restore', () => {
    const previousVersion = 5;
    const restoredFromVersion = 3;
    
    // After restore, should be version 6
    const newVersion = previousVersion + 1;
    
    expect(newVersion).toBe(6);
    expect(newVersion).toBeGreaterThan(previousVersion);
    expect(newVersion).toBeGreaterThan(restoredFromVersion);
  });
});

// ============================================================================
// Compare Versions Logic Tests
// ============================================================================

describe('Compare Versions Logic', () => {
  it('should require exactly two versions to compare', () => {
    const selectedVersions: number[] = [1];
    const canCompare = selectedVersions.length === 2;
    
    expect(canCompare).toBe(false);
  });

  it('should allow compare with two versions', () => {
    const selectedVersions: number[] = [1, 3];
    const canCompare = selectedVersions.length === 2;
    
    expect(canCompare).toBe(true);
  });

  it('should sort versions for comparison', () => {
    const selectedVersions = [5, 2];
    const [earlier, later] = selectedVersions.sort((a, b) => a - b);
    
    expect(earlier).toBe(2);
    expect(later).toBe(5);
  });

  it('should prevent selecting more than two versions', () => {
    const selectedVersions = [1, 3];
    const newVersion = 5;
    
    // Logic: if already have 2, replace the oldest one
    const updatedVersions = selectedVersions.length >= 2
      ? [selectedVersions[1], newVersion]
      : [...selectedVersions, newVersion];
    
    expect(updatedVersions).toHaveLength(2);
    expect(updatedVersions).toContain(3);
    expect(updatedVersions).toContain(5);
  });
});
