import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { testAgentConfigSchema, type AgentConfig } from '@/lib/validation';
import { generateConfigDiff, type ConfigDiffResult } from '@/lib/config-utils';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// LLM API configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface TestResult {
  success: boolean;
  output: string;
  response_time_ms: number;
  tokens_used?: number;
  cost_usd?: number;
  model_used: string;
  error_message?: string;
  error_details?: unknown;
}

/**
 * Helper to create Supabase client with auth
 */
async function createAuthClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return supabase;
}

/**
 * Helper to get tenant ID from user
 */
async function getTenantId(supabase: NonNullable<Awaited<ReturnType<typeof createAuthClient>>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !userProfile || !(userProfile as { tenant_id: string }).tenant_id) {
    return null;
  }

  return { tenantId: userProfile.tenant_id, user };
}

/**
 * Test a configuration with LLM
 */
async function testConfigWithLLM(
  config: AgentConfig,
  testInput: string,
  model: string = CLAUDE_MODEL
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Build system prompt from config
    const systemPrompt = buildSystemPrompt(config);

    // Call LLM API
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: config.advanced?.max_tokens || 1000,
        temperature: config.advanced?.temperature ?? 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: testInput,
          },
        ],
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        output: '',
        response_time_ms: responseTime,
        model_used: model,
        error_message: errorData.error?.message || `API error: ${response.status}`,
        error_details: errorData,
      };
    }

    const data = await response.json();
    
    // Calculate approximate cost (Claude 3.5 Sonnet rates)
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015); // $3/MTok input, $15/MTok output

    return {
      success: true,
      output: data.content?.[0]?.text || '',
      response_time_ms: responseTime,
      tokens_used: totalTokens,
      cost_usd: Math.round(costUsd * 10000) / 10000,
      model_used: model,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      response_time_ms: Date.now() - startTime,
      model_used: model,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_details: error,
    };
  }
}

/**
 * Build system prompt from agent config
 */
function buildSystemPrompt(config: AgentConfig): string {
  const parts: string[] = [];

  // Add role description
  if (config.basic_info?.role) {
    parts.push(`You are a ${config.basic_info.role}.`);
  }

  // Add main instructions
  if (config.instructions?.system_prompt) {
    parts.push(config.instructions.system_prompt);
  }

  // Add success criteria
  if (config.instructions?.success_criteria) {
    parts.push(`\nSuccess criteria: ${config.instructions.success_criteria}`);
  }

  // Add examples if provided
  if (config.instructions?.examples && config.instructions.examples.length > 0) {
    parts.push('\nHere are some examples of how you should respond:');
    for (const example of config.instructions.examples.slice(0, 3)) {
      parts.push(`\nInput: ${example.input}`);
      parts.push(`Output: ${example.output}`);
    }
  }

  // Add escalation guidance
  if (config.escalation?.triggers) {
    const triggers = Object.entries(config.escalation.triggers)
      .filter(([, value]) => value)
      .map(([key]) => key.replace(/_/g, ' '));
    
    if (triggers.length > 0) {
      parts.push(`\nEscalate to human when: ${triggers.join(', ')}`);
    }
  }

  return parts.join('\n\n');
}

/**
 * POST /api/agents/:id/config/test
 * Test an agent's configuration with a dry run
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createAuthClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantResult = await getTenantId(supabase);
    if (!tenantResult) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    const { tenantId, user } = tenantResult;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = testAgentConfigSchema.parse(body);

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Verify agent exists and belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, config, llm_config')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Determine which config to test
    let configToTest: AgentConfig;
    
    if (validatedData.use_current && !validatedData.config) {
      // Use current config from agent
      configToTest = (agent.config as AgentConfig) || {};
    } else if (validatedData.config) {
      // Use provided config
      configToTest = validatedData.config;
    } else {
      // Get current config from agent_configs table
      const { data: currentConfig } = await supabase
        .from('agent_configs')
        .select('config')
        .eq('agent_id', id)
        .eq('tenant_id', tenantId)
        .single();
      
      configToTest = (currentConfig?.config as AgentConfig) || {};
    }

    // Check if we have LLM API access
    if (!CLAUDE_API_KEY) {
      // Return simulated test result for development
      const simulatedResult: TestResult = {
        success: true,
        output: `[SIMULATED RESPONSE]\n\nWith this configuration, I would respond to "${validatedData.test_input}" based on the following system prompt:\n\n${buildSystemPrompt(configToTest).slice(0, 500)}...\n\n[Note: LLM API key not configured. This is a simulated response for testing purposes.]`,
        response_time_ms: 150,
        tokens_used: 250,
        cost_usd: 0.00375,
        model_used: 'simulated',
      };

      // Store test result
      await storeTestResult(supabase, {
        tenant_id: tenantId,
        agent_id: id,
        test_input: validatedData.test_input,
        test_output: simulatedResult.output,
        success: simulatedResult.success,
        response_time_ms: simulatedResult.response_time_ms,
        tokens_used: simulatedResult.tokens_used,
        cost_usd: simulatedResult.cost_usd,
        model_used: simulatedResult.model_used,
        error_message: simulatedResult.error_message,
      });

      return NextResponse.json({
        data: {
          test_input: validatedData.test_input,
          result: simulatedResult,
          config_tested: {
            system_prompt_preview: buildSystemPrompt(configToTest).slice(0, 200) + '...',
            model: configToTest.advanced?.model || CLAUDE_MODEL,
            temperature: configToTest.advanced?.temperature ?? 0.7,
          },
        },
        meta: {
          simulated: true,
          message: 'LLM API key not configured. Using simulated response.',
        },
      });
    }

    // Run actual LLM test
    const model = configToTest.advanced?.model || agent.llm_config?.model || CLAUDE_MODEL;
    const testResult = await testConfigWithLLM(configToTest, validatedData.test_input, model);

    // Store test result
    await storeTestResult(supabase, {
      tenant_id: tenantId,
      agent_id: id,
      test_input: validatedData.test_input,
      test_output: testResult.output,
      success: testResult.success,
      response_time_ms: testResult.response_time_ms,
      tokens_used: testResult.tokens_used,
      cost_usd: testResult.cost_usd,
      model_used: testResult.model_used,
      error_message: testResult.error_message,
      error_details: testResult.error_details,
    });

    // Update last_tested_at on agent config
    await supabase
      .from('agent_configs')
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_result: {
          success: testResult.success,
          test_input: validatedData.test_input.slice(0, 100),
          response_time_ms: testResult.response_time_ms,
        },
      })
      .eq('agent_id', id)
      .eq('tenant_id', tenantId);

    return NextResponse.json({
      data: {
        test_input: validatedData.test_input,
        result: testResult,
        config_tested: {
          system_prompt_preview: buildSystemPrompt(configToTest).slice(0, 200) + '...',
          model: model,
          temperature: configToTest.advanced?.temperature ?? 0.7,
          max_tokens: configToTest.advanced?.max_tokens || 1000,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/agents/:id/config/test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Store test result in database
 */
async function storeTestResult(
  supabase: Awaited<ReturnType<typeof createAuthClient>>,
  result: {
    tenant_id: string;
    agent_id: string;
    test_input: string;
    test_output?: string;
    success: boolean;
    response_time_ms: number;
    tokens_used?: number;
    cost_usd?: number;
    model_used?: string;
    error_message?: string;
    error_details?: unknown;
  }
) {
  if (!supabase) return;
  try {
    await supabase.from('config_test_results').insert({
      tenant_id: result.tenant_id,
      agent_id: result.agent_id,
      test_input: result.test_input,
      test_output: result.test_output,
      success: result.success,
      response_time_ms: result.response_time_ms,
      tokens_used: result.tokens_used,
      cost_usd: result.cost_usd,
      model_used: result.model_used,
      error_message: result.error_message,
      error_details: result.error_details,
    });
  } catch (e) {
    console.error('Failed to store test result:', e);
  }
}
