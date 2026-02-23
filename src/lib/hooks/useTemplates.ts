import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AgentTemplate } from '@/types';

export function useTemplates(tenantId: string | null) {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!tenantId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error: fetchError } = await supabase
        .from('agent_templates')
        .select('*')
        .or(`is_system.eq.true,tenant_id.eq.${tenantId}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('usage_count', { ascending: false });

      if (fetchError) throw fetchError;
      
      setTemplates(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch templates'));
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, refetch: fetchTemplates };
}

export function useCreateAgentFromTemplate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createFromTemplate = useCallback(async (
    tenantId: string,
    templateId: string,
    overrides: { name?: string; description?: string } = {}
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get the template
      const { data: template, error: templateError } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;
      if (!template) throw new Error('Template not found');

      // Create agent with template config
      const config = template.config as Record<string, unknown>;
      const basicInfo = (config?.basic_info || {}) as Record<string, string>;
      
      const { data: agent, error: createError } = await supabase
        .from('agents')
        .insert({
          tenant_id: tenantId,
          name: overrides.name || template.name,
          role: (basicInfo.role || 'worker') as import("@/types").AgentRole,
          description: overrides.description || template.description || basicInfo.description || '',
          capabilities: template.capabilities || [],
          model: template.recommended_model,
          configuration: {
            ...config,
            template_id: templateId,
            template_name: template.name,
          },
          status: 'idle',
          depth: 1,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Increment usage count
      await supabase
        .from('agent_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', templateId);

      return agent;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create agent from template'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createFromTemplate, loading, error };
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: string;
  capabilities: string[];
  recommended_model?: string;
  system_prompt?: string;
}

export function useCreateTemplate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTemplate = useCallback(async (input: CreateTemplateInput) => {
    try {
      setLoading(true);
      setError(null);

      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const response = await fetch('/api/v1/agent-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          slug,
          description: input.description,
          category: input.category || 'custom',
          capabilities: input.capabilities,
          recommended_model: input.recommended_model,
          config: {
            instructions: {
              system_prompt: input.system_prompt || '',
            },
          },
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create template');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to create template');
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTemplate, loading, error };
}

export function getTemplateCategories(templates: AgentTemplate[]): string[] {
  const categories = new Set(templates.map(t => t.category));
  return Array.from(categories).sort();
}
