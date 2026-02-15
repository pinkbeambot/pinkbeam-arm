import { allPaths } from './openapi';

export const getApiDocs = async () => {
  const spec = {
      openapi: '3.0.0',
      info: {
        title: 'ARM API - Agent Relationship Management',
        version: '1.0.0',
        description: 'REST API for managing AI agents, tasks, decisions, escalations, and messages in the Pink Beam ARM platform. All endpoints require JWT authentication via Supabase Auth unless otherwise noted.',
        contact: {
          name: 'Pink Beam',
          url: 'https://pinkbeam.ai',
        },
      },
      servers: [
        {
          url: '/api/v1',
          description: 'ARM API Server (v1)',
        },
      ],
      tags: [
        { name: 'Agents', description: 'Agent management, configuration, and version history' },
        { name: 'Tasks', description: 'Task creation, assignment, tracking, batch operations, and dependency management' },
        { name: 'Decisions', description: 'Decision proposal, approval workflow, and audit trail' },
        { name: 'Escalations', description: 'Escalation handling, resolution, and statistics' },
        { name: 'Messages', description: 'Inter-agent messaging protocol (AAP)' },
        { name: 'Activities', description: 'Activity feed and event logging' },
        { name: 'Chats', description: 'User-agent chat conversations' },
        { name: 'Agent Templates', description: 'Reusable agent configuration templates' },
        { name: 'Analytics', description: 'Dashboard metrics, agent performance, leaderboards, and ROI analysis' },
        { name: 'Meta-Agent', description: 'VALIS natural language command interface for CEO operations' },
      ],
      paths: allPaths,
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Supabase JWT token',
          },
        },
        schemas: {
          // Agent Schemas
          Agent: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              tenant_id: { type: 'string', format: 'uuid' },
              parent_id: { type: 'string', format: 'uuid', nullable: true },
              root_id: { type: 'string', format: 'uuid', nullable: true },
              depth: { type: 'integer', minimum: 0 },
              name: { type: 'string', maxLength: 255 },
              slug: { type: 'string', maxLength: 100 },
              role: { type: 'string', enum: ['ceo', 'manager', 'worker', 'specialist', 'system'] },
              status: { type: 'string', enum: ['initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated'] },
              description: { type: 'string', nullable: true },
              avatar_url: { type: 'string', format: 'uri', nullable: true },
              capabilities: { type: 'array', items: { type: 'string' } },
              llm_config: {
                type: 'object',
                properties: {
                  provider: { type: 'string' },
                  model: { type: 'string' },
                  temperature: { type: 'number', minimum: 0, maximum: 2 },
                  max_tokens: { type: 'integer', minimum: 1 },
                },
              },
              limits: {
                type: 'object',
                properties: {
                  max_sub_agents: { type: 'integer', minimum: 1 },
                  escalation_threshold: { type: 'number', minimum: 0, maximum: 1 },
                  timeout_seconds: { type: 'integer', minimum: 1 },
                  max_tokens_per_task: { type: 'integer', minimum: 1 },
                  max_cost_per_task_usd: { type: 'number', minimum: 0 },
                },
              },
              current_task_id: { type: 'string', format: 'uuid', nullable: true },
              activated_at: { type: 'string', format: 'date-time', nullable: true },
              terminated_at: { type: 'string', format: 'date-time', nullable: true },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              stats: {
                type: 'object',
                properties: {
                  tasks_completed: { type: 'integer' },
                  tasks_failed: { type: 'integer' },
                  escalations_raised: { type: 'integer' },
                  avg_task_duration_seconds: { type: 'number' },
                  total_cost_usd: { type: 'number' },
                },
              },
            },
            required: ['id', 'tenant_id', 'name', 'role', 'status', 'depth', 'created_at', 'updated_at'],
          },
          CreateAgentInput: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 255 },
              slug: { type: 'string', maxLength: 100 },
              role: { type: 'string', enum: ['ceo', 'manager', 'worker', 'specialist', 'system'] },
              description: { type: 'string' },
              parent_id: { type: 'string', format: 'uuid' },
              capabilities: { type: 'array', items: { type: 'string' } },
              llm_config: {
                type: 'object',
                properties: {
                  provider: { type: 'string' },
                  model: { type: 'string' },
                  temperature: { type: 'number', minimum: 0, maximum: 2 },
                  max_tokens: { type: 'integer', minimum: 1 },
                },
              },
              limits: {
                type: 'object',
                properties: {
                  max_sub_agents: { type: 'integer', minimum: 1 },
                  escalation_threshold: { type: 'number', minimum: 0, maximum: 1 },
                  timeout_seconds: { type: 'integer', minimum: 1 },
                  max_tokens_per_task: { type: 'integer', minimum: 1 },
                  max_cost_per_task_usd: { type: 'number', minimum: 0 },
                },
              },
            },
            required: ['name', 'role'],
          },
          UpdateAgentInput: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 255 },
              description: { type: 'string' },
              status: { type: 'string', enum: ['initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated'] },
              capabilities: { type: 'array', items: { type: 'string' } },
              llm_config: {
                type: 'object',
                properties: {
                  provider: { type: 'string' },
                  model: { type: 'string' },
                  temperature: { type: 'number', minimum: 0, maximum: 2 },
                  max_tokens: { type: 'integer', minimum: 1 },
                },
              },
              limits: {
                type: 'object',
                properties: {
                  max_sub_agents: { type: 'integer', minimum: 1 },
                  escalation_threshold: { type: 'number', minimum: 0, maximum: 1 },
                  timeout_seconds: { type: 'integer', minimum: 1 },
                  max_tokens_per_task: { type: 'integer', minimum: 1 },
                  max_cost_per_task_usd: { type: 'number', minimum: 0 },
                },
              },
            },
          },
          // Task Schemas
          Task: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              tenant_id: { type: 'string', format: 'uuid' },
              title: { type: 'string', maxLength: 500 },
              description: { type: 'string', nullable: true },
              type: { type: 'string', maxLength: 100 },
              status: { type: 'string', enum: ['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled'] },
              priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
              assignee_id: { type: 'string', format: 'uuid', nullable: true },
              assigner_id: { type: 'string', format: 'uuid', nullable: true },
              parent_task_id: { type: 'string', format: 'uuid', nullable: true },
              depth: { type: 'integer', minimum: 0 },
              progress_percent: { type: 'integer', minimum: 0, maximum: 100 },
              current_step: { type: 'string' },
              inputs: { type: 'object', additionalProperties: true },
              outputs: { type: 'object', additionalProperties: true },
              expected_outputs: { type: 'object', additionalProperties: true },
              deadline_at: { type: 'string', format: 'date-time', nullable: true },
              started_at: { type: 'string', format: 'date-time', nullable: true },
              completed_at: { type: 'string', format: 'date-time', nullable: true },
              cost_usd: { type: 'number', minimum: 0 },
              tokens_used: { type: 'integer', minimum: 0 },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              assignee: { $ref: '#/components/schemas/Agent' },
              assigner: { $ref: '#/components/schemas/Agent' },
              parent: { $ref: '#/components/schemas/Task' },
              subtasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
              dependencies: { type: 'array', items: { type: 'object' } },
              blocked_by: { type: 'array', items: { type: 'object' } },
            },
            required: ['id', 'tenant_id', 'title', 'status', 'priority', 'created_at', 'updated_at'],
          },
          CreateTaskInput: {
            type: 'object',
            properties: {
              title: { type: 'string', minLength: 1, maxLength: 500 },
              description: { type: 'string' },
              type: { type: 'string', maxLength: 100, default: 'generic' },
              assignee_id: { type: 'string', format: 'uuid' },
              priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
              parent_task_id: { type: 'string', format: 'uuid' },
              inputs: { type: 'object', additionalProperties: true },
              expected_outputs: { type: 'object', additionalProperties: true },
              deadline_at: { type: 'string', format: 'date-time' },
            },
            required: ['title'],
          },
          UpdateTaskInput: {
            type: 'object',
            properties: {
              title: { type: 'string', minLength: 1, maxLength: 500 },
              description: { type: 'string' },
              status: { type: 'string', enum: ['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled'] },
              assignee_id: { type: 'string', format: 'uuid' },
              priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
              progress_percent: { type: 'integer', minimum: 0, maximum: 100 },
              current_step: { type: 'string' },
              outputs: { type: 'object', additionalProperties: true },
            },
          },
          // Decision Schemas
          Decision: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              tenant_id: { type: 'string', format: 'uuid' },
              agent_id: { type: 'string', format: 'uuid' },
              task_id: { type: 'string', format: 'uuid', nullable: true },
              status: { type: 'string', enum: ['proposed', 'approved', 'rejected', 'overridden', 'executed'] },
              category: { type: 'string', enum: ['action', 'resource', 'escalation', 'strategy', 'system'] },
              title: { type: 'string', maxLength: 500 },
              description: { type: 'string' },
              proposed_action: { type: 'object', additionalProperties: true },
              executed_action: { type: 'object', additionalProperties: true, nullable: true },
              outcome: { type: 'object', additionalProperties: true, nullable: true },
              reasoning: {
                type: 'object',
                properties: {
                  context: { type: 'string' },
                  analysis: { type: 'string' },
                  options_considered: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        pros: { type: 'array', items: { type: 'string' } },
                        cons: { type: 'array', items: { type: 'string' } },
                        estimated_outcome: { type: 'string' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 },
                      },
                    },
                  },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  risks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        likelihood: { type: 'string', enum: ['low', 'medium', 'high'] },
                        impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                        mitigation: { type: 'string' },
                      },
                    },
                  },
                },
              },
              self_authorized: { type: 'boolean' },
              immutable: { type: 'boolean' },
              proposed_at: { type: 'string', format: 'date-time' },
              decided_at: { type: 'string', format: 'date-time', nullable: true },
              executed_at: { type: 'string', format: 'date-time', nullable: true },
              overridden_by: { type: 'string', format: 'uuid', nullable: true },
              override_reason: { type: 'string', nullable: true },
              overridden_at: { type: 'string', format: 'date-time', nullable: true },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              agent: { $ref: '#/components/schemas/Agent' },
              task: { $ref: '#/components/schemas/Task' },
              overrider: { $ref: '#/components/schemas/Agent' },
            },
            required: ['id', 'tenant_id', 'agent_id', 'status', 'category', 'title', 'proposed_at', 'created_at', 'updated_at'],
          },
          CreateDecisionInput: {
            type: 'object',
            properties: {
              agent_id: { type: 'string', format: 'uuid' },
              task_id: { type: 'string', format: 'uuid' },
              category: { type: 'string', enum: ['action', 'resource', 'escalation', 'strategy', 'system'] },
              title: { type: 'string', minLength: 1, maxLength: 500 },
              description: { type: 'string' },
              proposed_action: { type: 'object', additionalProperties: true },
              reasoning: {
                type: 'object',
                properties: {
                  context: { type: 'string' },
                  analysis: { type: 'string' },
                  options_considered: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        pros: { type: 'array', items: { type: 'string' } },
                        cons: { type: 'array', items: { type: 'string' } },
                        estimated_outcome: { type: 'string' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 },
                      },
                    },
                  },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  risks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        likelihood: { type: 'string', enum: ['low', 'medium', 'high'] },
                        impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                        mitigation: { type: 'string' },
                      },
                    },
                  },
                },
              },
              self_authorized: { type: 'boolean', default: false },
            },
            required: ['agent_id', 'category', 'title', 'proposed_action', 'reasoning'],
          },
          UpdateDecisionInput: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['proposed', 'approved', 'rejected', 'overridden', 'executed'] },
              outcome: { type: 'object', additionalProperties: true },
              executed_action: { type: 'object', additionalProperties: true },
            },
          },
          OverrideDecisionInput: {
            type: 'object',
            properties: {
              reason: { type: 'string', minLength: 1 },
              correct_action: { type: 'object', additionalProperties: true },
            },
            required: ['reason'],
          },
          // Escalation Schemas
          Escalation: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              tenant_id: { type: 'string', format: 'uuid' },
              agent_id: { type: 'string', format: 'uuid' },
              task_id: { type: 'string', format: 'uuid', nullable: true },
              type: { type: 'string', enum: ['clarification', 'approval', 'error', 'edge_case', 'policy_violation'] },
              urgency: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] },
              status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'dismissed'] },
              title: { type: 'string', maxLength: 500 },
              description: { type: 'string' },
              situation_context: { type: 'object', additionalProperties: true },
              question: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  details: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                },
              },
              agent_analysis: {
                type: 'object',
                properties: {
                  what_i_know: { type: 'string' },
                  what_i_dont_know: { type: 'string' },
                  what_i_tried: { type: 'array', items: { type: 'string' } },
                  suggested_resolution: { type: 'string' },
                },
              },
              resolution_answer: { type: 'string' },
              resolution_type: { type: 'string' },
              resolution_resources: { type: 'object', additionalProperties: true },
              learning_notes: { type: 'string' },
              resolved_by: { type: 'string', format: 'uuid', nullable: true },
              resolved_at: { type: 'string', format: 'date-time', nullable: true },
              time_to_resolve_seconds: { type: 'integer', minimum: 0 },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              agent: { $ref: '#/components/schemas/Agent' },
              task: { $ref: '#/components/schemas/Task' },
              resolver: { $ref: '#/components/schemas/Agent' },
            },
            required: ['id', 'tenant_id', 'agent_id', 'type', 'urgency', 'status', 'title', 'description', 'created_at', 'updated_at'],
          },
          CreateEscalationInput: {
            type: 'object',
            properties: {
              agent_id: { type: 'string', format: 'uuid' },
              task_id: { type: 'string', format: 'uuid' },
              type: { type: 'string', enum: ['clarification', 'approval', 'error', 'edge_case', 'policy_violation'] },
              urgency: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
              title: { type: 'string', minLength: 1, maxLength: 500 },
              description: { type: 'string', minLength: 1 },
              situation_context: { type: 'object', additionalProperties: true },
              question: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  details: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                },
              },
              agent_analysis: {
                type: 'object',
                properties: {
                  what_i_know: { type: 'string' },
                  what_i_dont_know: { type: 'string' },
                  what_i_tried: { type: 'array', items: { type: 'string' } },
                  suggested_resolution: { type: 'string' },
                },
              },
            },
            required: ['agent_id', 'type', 'title', 'description'],
          },
          UpdateEscalationInput: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'dismissed'] },
              urgency: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] },
              title: { type: 'string', minLength: 1, maxLength: 500 },
              description: { type: 'string', minLength: 1 },
              resolution_answer: { type: 'string' },
            },
          },
          ResolveEscalationInput: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['resolved', 'dismissed'] },
              resolution_type: { type: 'string' },
              resolution_answer: { type: 'string', minLength: 1 },
              resolution_resources: { type: 'object', additionalProperties: true },
              learning_notes: { type: 'string' },
            },
            required: ['status', 'resolution_answer'],
          },
          // Message Schemas
          Message: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              tenant_id: { type: 'string', format: 'uuid' },
              protocol_version: { type: 'string', default: '1.0' },
              message_type: {
                type: 'string',
                enum: [
                  'spawn.request', 'spawn.response',
                  'task.assign', 'task.accept', 'task.reject', 'task.progress', 'task.complete', 'task.fail',
                  'decision.propose', 'decision.confirm', 'decision.override',
                  'escalate.request', 'escalate.response',
                  'message.direct', 'message.broadcast',
                  'system.ping', 'system.pong', 'system.config.update', 'system.error'
                ],
              },
              from_agent_id: { type: 'string', format: 'uuid', nullable: true },
              to_agent_id: { type: 'string', format: 'uuid', nullable: true },
              to_broadcast: { type: 'boolean', default: false },
              thread_id: { type: 'string', format: 'uuid', nullable: true },
              correlation_id: { type: 'string', format: 'uuid', nullable: true },
              payload: { type: 'object', additionalProperties: true },
              priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
              requires_ack: { type: 'boolean', default: false },
              acked_at: { type: 'string', format: 'date-time', nullable: true },
              trace: { type: 'array', items: { type: 'object' } },
              expires_at: { type: 'string', format: 'date-time', nullable: true },
              created_at: { type: 'string', format: 'date-time' },
              processed_at: { type: 'string', format: 'date-time', nullable: true },
              from_agent: { $ref: '#/components/schemas/Agent' },
              to_agent: { $ref: '#/components/schemas/Agent' },
            },
            required: ['id', 'tenant_id', 'message_type', 'priority', 'payload', 'created_at'],
          },
          CreateMessageInput: {
            type: 'object',
            properties: {
              message_type: {
                type: 'string',
                enum: [
                  'spawn.request', 'spawn.response',
                  'task.assign', 'task.accept', 'task.reject', 'task.progress', 'task.complete', 'task.fail',
                  'decision.propose', 'decision.confirm', 'decision.override',
                  'escalate.request', 'escalate.response',
                  'message.direct', 'message.broadcast',
                  'system.ping', 'system.pong', 'system.config.update', 'system.error'
                ],
              },
              from_agent_id: { type: 'string', format: 'uuid' },
              to_agent_id: { type: 'string', format: 'uuid' },
              to_broadcast: { type: 'boolean', default: false },
              thread_id: { type: 'string', format: 'uuid' },
              correlation_id: { type: 'string', format: 'uuid' },
              payload: { type: 'object', additionalProperties: true },
              priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
              requires_ack: { type: 'boolean', default: false },
              trace: { type: 'array', items: { type: 'object' } },
              expires_at: { type: 'string', format: 'date-time' },
              protocol_version: { type: 'string', default: '1.0' },
            },
            required: ['message_type', 'payload'],
          },
          UpdateMessageInput: {
            type: 'object',
            properties: {
              acked_at: { type: 'string', format: 'date-time' },
              processed_at: { type: 'string', format: 'date-time' },
              payload: { type: 'object', additionalProperties: true },
            },
          },
          // Activity Schemas
          Activity: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              tenant_id: { type: 'string', format: 'uuid' },
              agent_id: { type: 'string', format: 'uuid' },
              type: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string', nullable: true },
              metadata: { type: 'object', additionalProperties: true },
              actor_id: { type: 'string', format: 'uuid', nullable: true },
              actor_type: { type: 'string', enum: ['agent', 'user', 'system'] },
              target_id: { type: 'string', format: 'uuid', nullable: true },
              target_type: { type: 'string', enum: ['task', 'decision', 'escalation', 'agent'] },
              task_id: { type: 'string', format: 'uuid', nullable: true },
              sequence_number: { type: 'integer' },
              created_at: { type: 'string', format: 'date-time' },
              agent: { $ref: '#/components/schemas/Agent' },
            },
            required: ['id', 'tenant_id', 'agent_id', 'type', 'title', 'created_at'],
          },
          // Error Schemas
          ErrorResponse: {
            type: 'object',
            properties: {
              error: {
                oneOf: [
                  { type: 'string' },
                  {
                    type: 'object',
                    properties: {
                      code: { type: 'string' },
                      message: { type: 'string' },
                      details: { type: 'object' },
                    },
                  },
                ],
              },
              details: { type: 'array', items: { type: 'object' } },
            },
            required: ['error'],
          },
          ValidationError: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              path: { type: 'array', items: { type: 'string' } },
              code: { type: 'string' },
            },
          },
          // Pagination
          Pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', minimum: 1 },
              limit: { type: 'integer', minimum: 1, maximum: 100 },
              total: { type: 'integer', minimum: 0 },
              totalPages: { type: 'integer', minimum: 0 },
            },
            required: ['page', 'limit', 'total', 'totalPages'],
          },
          // Agent Config Schemas
          AgentConfig: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              agent_id: { type: 'string', format: 'uuid' },
              version: { type: 'integer' },
              config: { type: 'object', additionalProperties: true },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'agent_id', 'version', 'config'],
          },
          UpdateAgentConfigInput: {
            type: 'object',
            properties: {
              config: { type: 'object', additionalProperties: true },
              change_note: { type: 'string' },
            },
          },
          TestAgentConfigInput: {
            type: 'object',
            properties: {
              config: { type: 'object', additionalProperties: true },
            },
            required: ['config'],
          },
          ConfigVersion: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              agent_id: { type: 'string', format: 'uuid' },
              version: { type: 'integer' },
              config: { type: 'object', additionalProperties: true },
              change_note: { type: 'string', nullable: true },
              created_by: { type: 'string', format: 'uuid', nullable: true },
              created_at: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'agent_id', 'version', 'config', 'created_at'],
          },
        },
      },
      security: [
        {
          BearerAuth: [],
        },
      ],
  };
  return spec;
};
