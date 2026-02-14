/**
 * OpenAPI 3.0 path definitions for Decision and Escalation endpoints.
 *
 * Exports `decisionPaths` and `escalationPaths` objects that can be merged
 * into the top-level `paths` section of an OpenAPI spec.
 *
 * Schema references (e.g. Decision, Escalation, ErrorResponse, Pagination)
 * are expected to live under `#/components/schemas/` in the root spec
 * (see swagger.ts for definitions).
 */

// ---------------------------------------------------------------------------
// Decision Paths
// ---------------------------------------------------------------------------

export const decisionPaths = {
  '/api/decisions': {
    get: {
      operationId: 'listDecisions',
      summary: 'List decisions',
      description:
        'Retrieve a paginated list of decisions with optional filtering by agent, status, category, date range, confidence, and full-text search.',
      tags: ['Decisions'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'agent_id',
          in: 'query',
          required: false,
          description: 'Filter by the agent that proposed the decision.',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          description: 'Filter by decision status.',
          schema: {
            type: 'string',
            enum: ['proposed', 'approved', 'rejected', 'overridden', 'executed'],
          },
        },
        {
          name: 'category',
          in: 'query',
          required: false,
          description: 'Filter by decision category.',
          schema: {
            type: 'string',
            enum: ['action', 'resource', 'escalation', 'strategy', 'system'],
          },
        },
        {
          name: 'date_from',
          in: 'query',
          required: false,
          description: 'Return decisions proposed on or after this datetime (ISO 8601).',
          schema: { type: 'string', format: 'date-time' },
        },
        {
          name: 'date_to',
          in: 'query',
          required: false,
          description: 'Return decisions proposed on or before this datetime (ISO 8601).',
          schema: { type: 'string', format: 'date-time' },
        },
        {
          name: 'confidence_min',
          in: 'query',
          required: false,
          description: 'Minimum reasoning confidence score (0-1).',
          schema: { type: 'number', minimum: 0, maximum: 1 },
        },
        {
          name: 'search',
          in: 'query',
          required: false,
          description: 'Full-text search across decision title and description.',
          schema: { type: 'string', minLength: 1, maxLength: 200 },
        },
        {
          name: 'page',
          in: 'query',
          required: false,
          description: 'Page number (1-indexed).',
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Number of results per page.',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        '200': {
          description: 'A paginated list of decisions.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Decision' },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' },
                },
                required: ['data', 'meta', 'pagination'],
              },
            },
          },
        },
        '400': {
          description: 'Invalid query parameters.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    post: {
      operationId: 'createDecision',
      summary: 'Create decision',
      description:
        'Propose a new decision on behalf of an agent. The decision starts in the `proposed` status unless `self_authorized` is true.',
      tags: ['Decisions'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateDecisionInput' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Decision created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Decision' },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Referenced agent or task not found.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/decisions/{id}': {
    get: {
      operationId: 'getDecision',
      summary: 'Get decision with history',
      description:
        'Retrieve a single decision by ID including expanded agent, task, and overrider relations.',
      tags: ['Decisions'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Decision UUID.',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': {
          description: 'Decision details with relations.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Decision' },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Decision not found.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    patch: {
      operationId: 'updateDecision',
      summary: 'Update decision status or override',
      description:
        'Update the status, outcome, or executed action of a decision. To override a decision, supply `reason` (and optionally `correct_action`) instead of `status`.',
      tags: ['Decisions'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Decision UUID.',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              oneOf: [
                { $ref: '#/components/schemas/UpdateDecisionInput' },
                { $ref: '#/components/schemas/OverrideDecisionInput' },
              ],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Decision updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Decision' },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error or invalid state transition.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Decision not found.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/decisions/{id}/context': {
    get: {
      operationId: 'getDecisionContext',
      summary: 'Get decision context',
      description:
        'Retrieve the full context surrounding a decision, including related tasks, escalations, and the proposing agent\'s recent decision history.',
      tags: ['Decisions'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Decision UUID.',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': {
          description: 'Decision context with related entities.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      decision: { $ref: '#/components/schemas/Decision' },
                      related_tasks: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Task' },
                      },
                      related_escalations: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Escalation' },
                      },
                      agent_history: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Decision' },
                      },
                    },
                    required: [
                      'decision',
                      'related_tasks',
                      'related_escalations',
                      'agent_history',
                    ],
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Decision not found.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/decisions/stats': {
    get: {
      operationId: 'getDecisionStats',
      summary: 'Get decision statistics',
      description:
        'Retrieve aggregate decision statistics for the tenant over a configurable time window.',
      tags: ['Decisions'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'days',
          in: 'query',
          required: false,
          description: 'Number of days to look back for statistics.',
          schema: { type: 'integer', minimum: 1, default: 30 },
        },
      ],
      responses: {
        '200': {
          description: 'Decision statistics.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      total: {
                        type: 'integer',
                        minimum: 0,
                        description: 'Total number of decisions in the period.',
                      },
                      by_status: {
                        type: 'object',
                        properties: {
                          proposed: { type: 'integer', minimum: 0 },
                          approved: { type: 'integer', minimum: 0 },
                          rejected: { type: 'integer', minimum: 0 },
                          overridden: { type: 'integer', minimum: 0 },
                          executed: { type: 'integer', minimum: 0 },
                        },
                        additionalProperties: { type: 'integer' },
                      },
                      by_category: {
                        type: 'object',
                        properties: {
                          action: { type: 'integer', minimum: 0 },
                          resource: { type: 'integer', minimum: 0 },
                          escalation: { type: 'integer', minimum: 0 },
                          strategy: { type: 'integer', minimum: 0 },
                          system: { type: 'integer', minimum: 0 },
                        },
                        additionalProperties: { type: 'integer' },
                      },
                      avg_confidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        description: 'Average reasoning confidence across decisions.',
                      },
                      self_authorized_count: {
                        type: 'integer',
                        minimum: 0,
                        description: 'Number of decisions that were self-authorized.',
                      },
                    },
                    required: [
                      'total',
                      'by_status',
                      'by_category',
                      'avg_confidence',
                      'self_authorized_count',
                    ],
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '400': {
          description: 'Invalid query parameters.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Escalation Paths
// ---------------------------------------------------------------------------

export const escalationPaths = {
  '/api/escalations': {
    get: {
      operationId: 'listEscalations',
      summary: 'List escalations',
      description:
        'Retrieve a paginated list of escalations with optional filtering by status, urgency, type, agent, and full-text search.',
      tags: ['Escalations'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          required: false,
          description: 'Filter by escalation status.',
          schema: {
            type: 'string',
            enum: ['open', 'in_progress', 'resolved', 'dismissed'],
          },
        },
        {
          name: 'urgency',
          in: 'query',
          required: false,
          description: 'Filter by urgency level.',
          schema: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'critical'],
          },
        },
        {
          name: 'type',
          in: 'query',
          required: false,
          description: 'Filter by escalation type.',
          schema: {
            type: 'string',
            enum: ['clarification', 'approval', 'error', 'edge_case', 'policy_violation'],
          },
        },
        {
          name: 'agent_id',
          in: 'query',
          required: false,
          description: 'Filter by the agent that raised the escalation.',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'search',
          in: 'query',
          required: false,
          description: 'Full-text search across escalation title and description.',
          schema: { type: 'string', minLength: 1, maxLength: 200 },
        },
        {
          name: 'page',
          in: 'query',
          required: false,
          description: 'Page number (1-indexed).',
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Number of results per page.',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        '200': {
          description: 'A paginated list of escalations.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Escalation' },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' },
                },
                required: ['data', 'meta', 'pagination'],
              },
            },
          },
        },
        '400': {
          description: 'Invalid query parameters.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    post: {
      operationId: 'createEscalation',
      summary: 'Create escalation',
      description:
        'Raise a new escalation on behalf of an agent. The escalation starts in the `open` status with the specified urgency.',
      tags: ['Escalations'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateEscalationInput' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Escalation created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Escalation' },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Referenced agent or task not found.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/escalations/{id}': {
    get: {
      operationId: 'getEscalation',
      summary: 'Get escalation details',
      description:
        'Retrieve a single escalation by ID including expanded agent, task, and resolver relations.',
      tags: ['Escalations'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Escalation UUID.',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': {
          description: 'Escalation details with relations.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Escalation' },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Escalation not found.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    patch: {
      operationId: 'updateEscalation',
      summary: 'Update escalation',
      description:
        'Update mutable fields of an escalation such as status, urgency, title, and description.',
      tags: ['Escalations'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Escalation UUID.',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateEscalationInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Escalation updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Escalation' },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error or invalid state transition.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Escalation not found.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/escalations/{id}/resolve': {
    post: {
      operationId: 'resolveEscalation',
      summary: 'Resolve escalation',
      description:
        'Resolve or dismiss an escalation by providing a resolution answer, type, optional resources, and learning notes.',
      tags: ['Escalations'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Escalation UUID.',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResolveEscalationInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Escalation resolved successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Escalation' },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error or escalation already resolved.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Escalation not found.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/api/escalations/stats': {
    get: {
      operationId: 'getEscalationStats',
      summary: 'Get escalation statistics',
      description:
        'Retrieve aggregate escalation statistics for the tenant over a configurable time window.',
      tags: ['Escalations'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'days',
          in: 'query',
          required: false,
          description: 'Number of days to look back for statistics.',
          schema: { type: 'integer', minimum: 1, default: 30 },
        },
      ],
      responses: {
        '200': {
          description: 'Escalation statistics.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      total: {
                        type: 'integer',
                        minimum: 0,
                        description: 'Total number of escalations in the period.',
                      },
                      by_status: {
                        type: 'object',
                        properties: {
                          open: { type: 'integer', minimum: 0 },
                          in_progress: { type: 'integer', minimum: 0 },
                          resolved: { type: 'integer', minimum: 0 },
                          dismissed: { type: 'integer', minimum: 0 },
                        },
                        additionalProperties: { type: 'integer' },
                      },
                      by_urgency: {
                        type: 'object',
                        properties: {
                          low: { type: 'integer', minimum: 0 },
                          normal: { type: 'integer', minimum: 0 },
                          high: { type: 'integer', minimum: 0 },
                          critical: { type: 'integer', minimum: 0 },
                        },
                        additionalProperties: { type: 'integer' },
                      },
                      by_type: {
                        type: 'object',
                        properties: {
                          clarification: { type: 'integer', minimum: 0 },
                          approval: { type: 'integer', minimum: 0 },
                          error: { type: 'integer', minimum: 0 },
                          edge_case: { type: 'integer', minimum: 0 },
                          policy_violation: { type: 'integer', minimum: 0 },
                        },
                        additionalProperties: { type: 'integer' },
                      },
                      avg_resolution_time_seconds: {
                        type: 'number',
                        minimum: 0,
                        description:
                          'Average time in seconds from escalation creation to resolution.',
                      },
                    },
                    required: [
                      'total',
                      'by_status',
                      'by_urgency',
                      'by_type',
                      'avg_resolution_time_seconds',
                    ],
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['timestamp'],
                  },
                },
                required: ['data', 'meta'],
              },
            },
          },
        },
        '400': {
          description: 'Invalid query parameters.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
} as const;
