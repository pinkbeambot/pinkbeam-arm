import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse, type AuthContext } from '@/lib/api/auth';
import { rateLimitService } from '@/lib/rate-limit';
import { testAgentConfigSchema, type AgentConfig } from '@/lib/validation';
import { generateConfigDiff, type ConfigDiffResult } from '@/lib/config-utils';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// LLM API configuration - SECURE: Only accessed server-side
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

// Security constants
const RATE_LIMIT_REQUESTS = 5; // Stricter limit for config testing
const RATE_LIMIT_WINDOW_MINUTES = 1;
const MAX_TEST_INPUT_LENGTH = 5000;
const MAX_CONFIG_SIZE = 100000; // 100KB max config size

// SSRF protection: Blocked patterns
const SSRF_BLOCKED_PATTERNS = [
  // Private IP ranges
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // Link-local
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  // Localhost variants
  /localhost/i,
  /\.local$/i,
  // Cloud metadata endpoints
  /169\.254\.169\.254/, // AWS, GCP, Azure metadata
  /metadata\.google\.internal/,
  /metadata\.azure\.internal/,
  // Internal hostnames
  /\.internal$/i,
  /\.private$/i,
  /\.corp$/i,
];

// Suspicious config patterns that might indicate SSRF attempts
const SSRF_CONFIG_PATTERNS = [
  /url\s*:\s*["']?https?:/i,
  /endpoint\s*:\s*["']?https?:/i,
  /api_url\s*:\s*["']?https?:/i,
  /webhook\s*:\s*["']?https?:/i,
  /callback\s*:\s*["']?https?:/i,
];

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

interface AuditLogEntry {
  id: string;
  tenant_id: string;
  agent_id: string;
  user_id: string;
  action: 'config_test';
  ip_address: string;
  user_agent: string;
  test_input_preview: string;
  success: boolean;
  config_hash: string;
  metadata: {
    response_time_ms?: number;
    tokens_used?: number;
    cost_usd?: number;
    model_used?: string;
    error_message?: string;
    rate_limited?: boolean;
    ssrf_detected?: boolean;
    validation_failed?: boolean;
  };
  created_at: string;
}

/**
 * Hash a string for audit logging (prevents storing full configs)
 */
function hashConfig(config: unknown): string {
  try {
    const str = JSON.stringify(config);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  } catch {
    return 'invalid';
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real client IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip',
    'x-forwarded',
    'forwarded-for',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Take the first IP if multiple are present
      const ip = value.split(',')[0].trim();
      if (ip && !ip.startsWith('127.') && ip !== '::1') {
        return ip;
      }
    }
  }

  // Fallback to a hash of the request headers
  return 'unknown';
}

/**
 * Validate config for SSRF attack patterns
 */
function validateConfigForSSRF(config: AgentConfig): { valid: boolean; reason?: string } {
  try {
    const configStr = JSON.stringify(config);

    // Check config size
    if (configStr.length > MAX_CONFIG_SIZE) {
      return { valid: false, reason: 'Config size exceeds maximum allowed' };
    }

    // Check for suspicious patterns in config
    for (const pattern of SSRF_CONFIG_PATTERNS) {
      if (pattern.test(configStr)) {
        // Extract potential URLs and validate them
        const urlMatches = configStr.match(/https?:\/\/[^"'\s]+/gi);
        if (urlMatches) {
          for (const url of urlMatches) {
            if (isUrlBlocked(url)) {
              return { valid: false, reason: 'Config contains blocked URL patterns' };
            }
          }
        }
      }
    }

    // Validate system prompt for injection attempts
    if (config.instructions?.system_prompt) {
      const prompt = config.instructions.system_prompt.toLowerCase();
      
      // Check for attempts to override system behavior
      const dangerousPatterns = [
        'ignore previous instructions',
        'ignore all previous',
        'disregard all',
        'system override',
        'admin mode',
        'developer mode',
        'ignore your instructions',
        'new instructions:',
        'override protocol',
      ];

      for (const pattern of dangerousPatterns) {
        if (prompt.includes(pattern)) {
          return { valid: false, reason: 'System prompt contains potentially malicious patterns' };
        }
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Failed to validate config' };
  }
}

/**
 * Check if a URL is in the blocked list
 */
function isUrlBlocked(url: string): boolean {
  try {
    const lowerUrl = url.toLowerCase();
    
    for (const pattern of SSRF_BLOCKED_PATTERNS) {
      if (pattern.test(lowerUrl)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return true; // Block on error
  }
}

/**
 * Log audit event for config test
 */
async function logAuditEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  entry: Omit<AuditLogEntry, 'id' | 'created_at'>
): Promise<void> {
  try {
    await supabase.from('security_audit_log').insert({
      tenant_id: entry.tenant_id,
      user_id: entry.user_id,
      action: entry.action,
      resource_type: 'agent_config_test',
      resource_id: entry.agent_id,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      details: {
        test_input_preview: entry.test_input_preview,
        config_hash: entry.config_hash,
        success: entry.success,
        ...entry.metadata,
      },
    });
  } catch (e) {
    // Fail silently - don't block the request due to logging failure
    console.error('[SecurityAudit] Failed to log audit event:', e);
  }
}

/**
 * Apply stricter rate limiting for config test endpoint
 */
async function checkStrictRateLimit(
  tenantId: string,
  userId: string,
  ipAddress: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Create composite key for stricter limiting
  const compositeKey = `${tenantId}:${userId}:${ipAddress}`;
  
  // Use a stricter limit for config testing
  const result = await rateLimitService.checkLimit(
    `config-test:${compositeKey}`,
    'free',
    RATE_LIMIT_REQUESTS
  );

  if (!result.allowed) {
    return {
      allowed: false,
      retryAfter: result.retryAfter || RATE_LIMIT_WINDOW_MINUTES * 60,
    };
  }

  return { allowed: true };
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
    // Validate API key is configured
    if (!CLAUDE_API_KEY) {
      throw new Error('LLM API not configured');
    }

    // Build system prompt from config
    const systemPrompt = buildSystemPrompt(config);

    // Call LLM API
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
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
      // SECURE: Don't expose API key or internal details in error
      const errorStatus = response.status;
      let errorMessage = 'LLM API request failed';
      
      // Only expose safe error information
      if (errorStatus === 429) {
        errorMessage = 'Rate limit exceeded by LLM provider';
      } else if (errorStatus === 401 || errorStatus === 403) {
        errorMessage = 'LLM API authentication failed';
      } else if (errorStatus >= 500) {
        errorMessage = 'LLM provider error';
      }

      return {
        success: false,
        output: '',
        response_time_ms: responseTime,
        model_used: model,
        error_message: errorMessage,
        error_details: { status: errorStatus },
      };
    }

    const data = await response.json();

    // Calculate approximate cost (Claude 3.5 Sonnet rates)
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015);

    return {
      success: true,
      output: data.content?.[0]?.text || '',
      response_time_ms: responseTime,
      tokens_used: totalTokens,
      cost_usd: Math.round(costUsd * 10000) / 10000,
      model_used: model,
    };
  } catch (error) {
    // SECURE: Don't expose internal error details
    const isConfigError = error instanceof Error && error.message === 'LLM API not configured';
    
    return {
      success: false,
      output: '',
      response_time_ms: Date.now() - startTime,
      model_used: model,
      error_message: isConfigError 
        ? 'LLM API not configured' 
        : 'Failed to process test request',
      error_details: null,
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
 * GET /api/agents/:id/config/test
 * Get test history for an agent
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Apply strict rate limiting
    const rateLimit = await checkStrictRateLimit(tenantId, userId, clientIP);
    if (!rateLimit.allowed) {
      // Log rate limit event
      await logAuditEvent(createServiceRoleClient(), {
        tenant_id: tenantId,
        agent_id: id,
        user_id: userId,
        action: 'config_test',
        ip_address: clientIP,
        user_agent: userAgent,
        test_input_preview: '[GET request - rate limited]',
        success: false,
        config_hash: 'n/a',
        metadata: { rate_limited: true },
      });

      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${Math.ceil((rateLimit.retryAfter || 60) / 60)} minutes.`
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 60),
          }
        }
      );
    }

    // Verify agent exists and belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Fetch test history
    const { data: testResults, error: resultsError } = await supabase
      .from('config_test_results')
      .select('*')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (resultsError) {
      console.error('Error fetching test results:', resultsError);
      return NextResponse.json(
        { error: 'Failed to fetch test history' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('config_test_results')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', id)
      .eq('tenant_id', tenantId);

    if (countError) {
      console.error('Error counting test results:', countError);
    }

    return NextResponse.json({
      data: testResults || [],
      meta: {
        pagination: {
          limit,
          offset,
          total: totalCount || 0,
          hasMore: (totalCount || 0) > offset + limit,
        },
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/agents/:id/config/test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/:id/config/test
 * Test an agent's configuration with a dry run
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let requestBody: unknown = null;

  try {
    // Parse request body early for audit logging
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Apply strict rate limiting (per tenant + user + IP)
    const rateLimit = await checkStrictRateLimit(tenantId, userId, clientIP);
    if (!rateLimit.allowed) {
      // Log rate limit event
      await logAuditEvent(createServiceRoleClient(), {
        tenant_id: tenantId,
        agent_id: id,
        user_id: userId,
        action: 'config_test',
        ip_address: clientIP,
        user_agent: userAgent,
        test_input_preview: '[POST request - rate limited]',
        success: false,
        config_hash: 'n/a',
        metadata: { rate_limited: true },
      });

      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many config test requests. Try again in ${Math.ceil((rateLimit.retryAfter || 60) / 60)} minutes.`
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 60),
          }
        }
      );
    }

    // Validate request body
    let validatedData;
    try {
      validatedData = testAgentConfigSchema.parse(requestBody);
    } catch (validationError) {
      // Log validation failure
      await logAuditEvent(createServiceRoleClient(), {
        tenant_id: tenantId,
        agent_id: id,
        user_id: userId,
        action: 'config_test',
        ip_address: clientIP,
        user_agent: userAgent,
        test_input_preview: String((requestBody as { test_input?: string } | null)?.test_input || '').slice(0, 100),
        success: false,
        config_hash: 'n/a',
        metadata: { validation_failed: true },
      });

      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: validationError.issues },
          { status: 400 }
        );
      }
      throw validationError;
    }

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
      configToTest = (agent.config as AgentConfig) || {};
    } else if (validatedData.config) {
      configToTest = validatedData.config;
    } else {
      const { data: currentConfig } = await supabase
        .from('agent_configs')
        .select('config')
        .eq('agent_id', id)
        .eq('tenant_id', tenantId)
        .single();

      configToTest = (currentConfig?.config as AgentConfig) || {};
    }

    // SECURITY: Validate config for SSRF attacks
    const ssrfCheck = validateConfigForSSRF(configToTest);
    if (!ssrfCheck.valid) {
      // Log security event
      await logAuditEvent(createServiceRoleClient(), {
        tenant_id: tenantId,
        agent_id: id,
        user_id: userId,
        action: 'config_test',
        ip_address: clientIP,
        user_agent: userAgent,
        test_input_preview: validatedData.test_input.slice(0, 100),
        success: false,
        config_hash: hashConfig(configToTest),
        metadata: { ssrf_detected: true },
      });

      return NextResponse.json(
        { error: 'Security validation failed', message: ssrfCheck.reason },
        { status: 400 }
      );
    }

    // Generate config hash for audit logging
    const configHash = hashConfig(configToTest);
    const testInputPreview = validatedData.test_input.slice(0, 100);

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

      // Log successful audit event
      await logAuditEvent(createServiceRoleClient(), {
        tenant_id: tenantId,
        agent_id: id,
        user_id: userId,
        action: 'config_test',
        ip_address: clientIP,
        user_agent: userAgent,
        test_input_preview: testInputPreview,
        success: true,
        config_hash: configHash,
        metadata: {
          response_time_ms: simulatedResult.response_time_ms,
          tokens_used: simulatedResult.tokens_used,
          cost_usd: simulatedResult.cost_usd,
          model_used: simulatedResult.model_used,
        },
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

    // Log audit event
    await logAuditEvent(createServiceRoleClient(), {
      tenant_id: tenantId,
      agent_id: id,
      user_id: userId,
      action: 'config_test',
      ip_address: clientIP,
      user_agent: userAgent,
      test_input_preview: testInputPreview,
      success: testResult.success,
      config_hash: configHash,
      metadata: {
        response_time_ms: testResult.response_time_ms,
        tokens_used: testResult.tokens_used,
        cost_usd: testResult.cost_usd,
        model_used: testResult.model_used,
        error_message: testResult.error_message,
      },
    });

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

    // Log unexpected error
    console.error('Unexpected error in POST /api/agents/:id/config/test:', error);

    // SECURE: Don't expose internal error details to client
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
  supabase: AuthContext['supabase'],
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
    // Fail silently - don't block the response due to storage failure
    console.error('Failed to store test result:', e);
  }
}
