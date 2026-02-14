export const agentPaths = {
  '/agents': {
    get: {
      operationId: 'listAgents',
      summary: 'List agents',
      description:
        'Retrieve a paginated list of agents for the current tenant. Supports filtering by status, role, and free-text search.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          required: false,
          description: 'Filter agents by lifecycle status.',
          schema: {
            type: 'string',
            enum: [
              'initializing',
              'idle',
              'active',
              'paused',
              'blocked',
              'error',
              'escaped',
              'terminated',
            ],
          },
        },
        {
          name: 'role',
          in: 'query',
          required: false,
          description: 'Filter agents by organizational role.',
          schema: {
            type: 'string',
            enum: ['ceo', 'manager', 'worker', 'specialist', 'system'],
          },
        },
        {
          name: 'search',
          in: 'query',
          required: false,
          description:
            'Free-text search across agent name, slug, and description.',
          schema: {
            type: 'string',
          },
        },
        {
          name: 'page',
          in: 'query',
          required: false,
          description: 'Page number for pagination.',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Number of agents per page.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
      ],
      responses: {
        '200': {
          description: 'A paginated list of agents.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Agent',
                    },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
                    },
                    required: ['timestamp'],
                  },
                  pagination: {
                    $ref: '#/components/schemas/Pagination',
                  },
                },
                required: ['data', 'meta', 'pagination'],
              },
            },
          },
        },
        '401': {
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
    post: {
      operationId: 'createAgent',
      summary: 'Create agent',
      description:
        'Create a new agent within the current tenant. The agent is placed in the hierarchy under the specified parent, or at the root if no parent_id is provided.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CreateAgentInput',
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Agent created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    $ref: '#/components/schemas/Agent',
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
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
          description: 'Validation error. The request body failed schema or business-rule validation.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError',
              },
            },
          },
        },
        '401': {
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
  },

  '/agents/{id}': {
    get: {
      operationId: 'getAgent',
      summary: 'Get agent',
      description:
        'Retrieve a single agent by its unique identifier, including full configuration and hierarchy metadata.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'The requested agent.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    $ref: '#/components/schemas/Agent',
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
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
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '404': {
          description: 'Agent not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
    patch: {
      operationId: 'updateAgent',
      summary: 'Update agent',
      description:
        'Partially update an existing agent. Only the fields provided in the request body are modified; all other fields remain unchanged.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent to update.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UpdateAgentInput',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Agent updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    $ref: '#/components/schemas/Agent',
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
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
              schema: {
                $ref: '#/components/schemas/ValidationError',
              },
            },
          },
        },
        '401': {
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '404': {
          description: 'Agent not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
    delete: {
      operationId: 'deleteAgent',
      summary: 'Delete agent',
      description:
        'Permanently delete an agent. Any child agents must be reassigned or deleted before this operation can succeed.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent to delete.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'Agent deleted successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The identifier of the deleted agent.',
                      },
                      deleted: {
                        type: 'boolean',
                        description: 'Always true on successful deletion.',
                        enum: [true],
                      },
                    },
                    required: ['id', 'deleted'],
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
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
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '404': {
          description: 'Agent not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
  },

  '/agents/{id}/config': {
    get: {
      operationId: 'getAgentConfig',
      summary: 'Get agent configuration',
      description:
        'Retrieve the current active configuration for an agent, including LLM settings, capability limits, and behavioral parameters.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'The current agent configuration.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    $ref: '#/components/schemas/AgentConfig',
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
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
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '404': {
          description: 'Agent not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
    patch: {
      operationId: 'updateAgentConfig',
      summary: 'Update agent configuration',
      description:
        'Partially update the configuration for an agent. A new configuration version is created automatically, preserving the previous version for rollback.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UpdateAgentConfigInput',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Agent configuration updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    $ref: '#/components/schemas/AgentConfig',
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
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
              schema: {
                $ref: '#/components/schemas/ValidationError',
              },
            },
          },
        },
        '401': {
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '404': {
          description: 'Agent not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
  },

  '/agents/{id}/config/test': {
    post: {
      operationId: 'testAgentConfig',
      summary: 'Test agent configuration',
      description:
        'Validate an agent configuration without persisting it. Returns any errors or warnings detected during validation, allowing you to verify changes before applying them.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent whose context is used for validation.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/TestAgentConfigInput',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Configuration validation result.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      valid: {
                        type: 'boolean',
                        description: 'Whether the configuration passed all validation checks.',
                      },
                      errors: {
                        type: 'array',
                        items: {
                          type: 'string',
                        },
                        description: 'List of validation errors that must be fixed.',
                      },
                      warnings: {
                        type: 'array',
                        items: {
                          type: 'string',
                        },
                        description: 'List of non-blocking warnings about the configuration.',
                      },
                    },
                    required: ['valid', 'errors', 'warnings'],
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
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
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '404': {
          description: 'Agent not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
  },

  '/agents/{id}/config/versions': {
    get: {
      operationId: 'listConfigVersions',
      summary: 'List config versions',
      description:
        'Retrieve a paginated history of configuration versions for an agent, ordered from most recent to oldest. Each version captures a snapshot of the configuration at the time it was changed.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'page',
          in: 'query',
          required: false,
          description: 'Page number for pagination.',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Number of versions per page.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
      ],
      responses: {
        '200': {
          description: 'A paginated list of configuration versions.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/ConfigVersion',
                    },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
                    },
                    required: ['timestamp'],
                  },
                  pagination: {
                    $ref: '#/components/schemas/Pagination',
                  },
                },
                required: ['data', 'meta', 'pagination'],
              },
            },
          },
        },
        '401': {
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '404': {
          description: 'Agent not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
  },

  '/agents/{id}/config/restore': {
    post: {
      operationId: 'restoreConfigVersion',
      summary: 'Restore config version',
      description:
        'Restore the agent configuration to a previously saved version. The restored version becomes the new active configuration and a new version entry is created for audit purposes.',
      tags: ['Agents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                version_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'The identifier of the configuration version to restore.',
                },
              },
              required: ['version_id'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Configuration restored successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    $ref: '#/components/schemas/AgentConfig',
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
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
          description: 'Invalid version_id or version not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '401': {
          description: 'Authentication required.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '404': {
          description: 'Agent not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
  },
} as const;
