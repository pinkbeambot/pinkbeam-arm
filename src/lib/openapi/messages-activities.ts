export const messagePaths = {
  '/messages': {
    get: {
      operationId: 'listMessages',
      summary: 'List messages',
      description:
        'Retrieve a paginated list of messages for the current tenant. Supports filtering by sender, recipient, message type, thread, read status, and priority.',
      tags: ['Messages'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'from_agent_id',
          in: 'query',
          required: false,
          description: 'Filter messages sent by this agent.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'to_agent_id',
          in: 'query',
          required: false,
          description: 'Filter messages addressed to this agent.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'message_type',
          in: 'query',
          required: false,
          description: 'Filter messages by AAP message type.',
          schema: {
            type: 'string',
            enum: [
              'spawn.request',
              'spawn.response',
              'task.assign',
              'task.accept',
              'task.reject',
              'task.progress',
              'task.complete',
              'task.fail',
              'decision.propose',
              'decision.confirm',
              'decision.override',
              'escalate.request',
              'escalate.response',
              'message.direct',
              'message.broadcast',
              'system.ping',
              'system.pong',
              'system.config.update',
              'system.error',
            ],
          },
        },
        {
          name: 'thread_id',
          in: 'query',
          required: false,
          description: 'Filter messages belonging to a specific thread.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'unread_only',
          in: 'query',
          required: false,
          description:
            'When set to "true", return only unread/unacknowledged messages.',
          schema: {
            type: 'string',
            enum: ['true', 'false'],
            default: 'false',
          },
        },
        {
          name: 'priority',
          in: 'query',
          required: false,
          description: 'Filter messages by priority level.',
          schema: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent'],
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
          description: 'Number of messages per page.',
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
          description: 'A paginated list of messages.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Message',
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
      operationId: 'sendMessage',
      summary: 'Send message',
      description:
        'Send a new message between agents using the Agent-to-Agent Protocol (AAP). Supports direct messages, broadcasts, threaded conversations, and acknowledgment tracking.',
      tags: ['Messages'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message_type: {
                  type: 'string',
                  description: 'The AAP message type.',
                  enum: [
                    'spawn.request',
                    'spawn.response',
                    'task.assign',
                    'task.accept',
                    'task.reject',
                    'task.progress',
                    'task.complete',
                    'task.fail',
                    'decision.propose',
                    'decision.confirm',
                    'decision.override',
                    'escalate.request',
                    'escalate.response',
                    'message.direct',
                    'message.broadcast',
                    'system.ping',
                    'system.pong',
                    'system.config.update',
                    'system.error',
                  ],
                },
                from_agent_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'The agent sending the message.',
                },
                to_agent_id: {
                  type: 'string',
                  format: 'uuid',
                  description:
                    'The target agent. Omit for broadcast messages.',
                },
                to_broadcast: {
                  type: 'boolean',
                  default: false,
                  description:
                    'When true, the message is broadcast to all agents in the tenant.',
                },
                thread_id: {
                  type: 'string',
                  format: 'uuid',
                  description:
                    'Thread identifier for grouping related messages.',
                },
                correlation_id: {
                  type: 'string',
                  format: 'uuid',
                  description:
                    'Correlation identifier linking request/response pairs.',
                },
                payload: {
                  type: 'object',
                  description:
                    'The message payload. Structure varies by message_type.',
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'normal', 'high', 'urgent'],
                  default: 'normal',
                  description: 'Message priority level.',
                },
                requires_ack: {
                  type: 'boolean',
                  default: false,
                  description:
                    'Whether the recipient must acknowledge receipt.',
                },
                trace: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description:
                    'Trace path of agent IDs this message has traversed.',
                },
                expires_at: {
                  type: 'string',
                  format: 'date-time',
                  description:
                    'Optional expiration time after which the message is no longer valid.',
                },
                protocol_version: {
                  type: 'string',
                  default: '1.0',
                  description: 'AAP protocol version.',
                },
              },
              required: ['message_type', 'payload'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Message sent successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    $ref: '#/components/schemas/Message',
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
          description:
            'Validation error. The request body failed schema or business-rule validation.',
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

  '/messages/{id}': {
    get: {
      operationId: 'getMessage',
      summary: 'Get message',
      description:
        'Retrieve a single message by its unique identifier, including expanded from_agent and to_agent references.',
      tags: ['Messages'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the message.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'The requested message with expanded agent references.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    allOf: [
                      { $ref: '#/components/schemas/Message' },
                      {
                        type: 'object',
                        properties: {
                          from_agent: {
                            $ref: '#/components/schemas/Agent',
                          },
                          to_agent: {
                            $ref: '#/components/schemas/Agent',
                          },
                        },
                      },
                    ],
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
          description: 'Message not found.',
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

  '/messages/{id}/read': {
    patch: {
      operationId: 'markMessageRead',
      summary: 'Mark message as read/acknowledged',
      description:
        'Mark a message as read or acknowledged by setting the acked_at and/or processed_at timestamps.',
      tags: ['Messages'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the message to mark as read.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                acked_at: {
                  type: 'string',
                  format: 'date-time',
                  description:
                    'Timestamp when the message was acknowledged by the recipient.',
                },
                processed_at: {
                  type: 'string',
                  format: 'date-time',
                  description:
                    'Timestamp when the message was fully processed by the recipient.',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Message marked as read/acknowledged.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    $ref: '#/components/schemas/Message',
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
          description: 'Message not found.',
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

  '/messages/thread/{id}': {
    get: {
      operationId: 'getMessageThread',
      summary: 'Get message thread',
      description:
        'Retrieve all messages belonging to a specific thread, ordered chronologically.',
      tags: ['Messages'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The thread identifier.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'All messages in the thread.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Message',
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
          description: 'Thread not found.',
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

export const activityPaths = {
  '/activities': {
    get: {
      operationId: 'listActivities',
      summary: 'List activities',
      description:
        'Retrieve a cursor-based paginated list of activities for the current tenant. Supports filtering by agent, entity type, action type, time range, and free-text search.',
      tags: ['Activities'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'agent_id',
          in: 'query',
          required: false,
          description: 'Filter activities by the agent that generated them.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'entity_type',
          in: 'query',
          required: false,
          description: 'Filter activities by entity type category.',
          schema: {
            type: 'string',
            enum: [
              'all',
              'tasks',
              'decisions',
              'escalations',
              'agents',
              'system',
            ],
          },
        },
        {
          name: 'action_type',
          in: 'query',
          required: false,
          description: 'Filter activities by specific action type.',
          schema: {
            type: 'string',
            enum: [
              'agent.spawned',
              'agent.status_changed',
              'agent.terminated',
              'task.created',
              'task.assigned',
              'task.started',
              'task.progress',
              'task.completed',
              'task.failed',
              'decision.proposed',
              'decision.made',
              'decision.overridden',
              'escalation.created',
              'escalation.resolved',
              'message.sent',
              'message.received',
              'system.error',
              'system.config_changed',
            ],
          },
        },
        {
          name: 'time_range',
          in: 'query',
          required: false,
          description: 'Predefined time range filter.',
          schema: {
            type: 'string',
            enum: ['1h', '24h', '7d', '30d', 'all'],
          },
        },
        {
          name: 'date_from',
          in: 'query',
          required: false,
          description: 'Filter activities created on or after this timestamp.',
          schema: {
            type: 'string',
            format: 'date-time',
          },
        },
        {
          name: 'date_to',
          in: 'query',
          required: false,
          description: 'Filter activities created on or before this timestamp.',
          schema: {
            type: 'string',
            format: 'date-time',
          },
        },
        {
          name: 'search',
          in: 'query',
          required: false,
          description:
            'Free-text search across activity descriptions and metadata.',
          schema: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
          },
        },
        {
          name: 'cursor',
          in: 'query',
          required: false,
          description:
            'Cursor for pagination. Pass the sequence_number from the last item in the previous page.',
          schema: {
            type: 'string',
          },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Number of activities per page.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
          },
        },
      ],
      responses: {
        '200': {
          description: 'A cursor-based paginated list of activities.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Activity',
                    },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
                      next_cursor: {
                        type: 'string',
                        nullable: true,
                        description:
                          'Cursor value to use for fetching the next page. Null when there are no more results.',
                      },
                    },
                    required: ['timestamp', 'next_cursor'],
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
      },
    },
  },
} as const;

export const chatPaths = {
  '/chats': {
    get: {
      operationId: 'listChats',
      summary: 'List chats',
      description:
        'Retrieve all chats for the currently authenticated user, ordered by most recent activity.',
      tags: ['Chats'],
      security: [{ BearerAuth: [] }],
      parameters: [],
      responses: {
        '200': {
          description: 'A list of the user\'s chats.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                          description: 'Unique identifier of the chat.',
                        },
                        agent_id: {
                          type: 'string',
                          format: 'uuid',
                          description:
                            'The agent this chat is associated with.',
                        },
                        user_id: {
                          type: 'string',
                          format: 'uuid',
                          description: 'The user who owns this chat.',
                        },
                        tenant_id: {
                          type: 'string',
                          format: 'uuid',
                          description: 'The tenant this chat belongs to.',
                        },
                        last_message_at: {
                          type: 'string',
                          format: 'date-time',
                          nullable: true,
                          description:
                            'Timestamp of the most recent message in this chat.',
                        },
                        created_at: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Timestamp when the chat was created.',
                        },
                        updated_at: {
                          type: 'string',
                          format: 'date-time',
                          description:
                            'Timestamp when the chat was last updated.',
                        },
                      },
                      required: [
                        'id',
                        'agent_id',
                        'user_id',
                        'tenant_id',
                        'created_at',
                        'updated_at',
                      ],
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
      },
    },
    post: {
      operationId: 'createChat',
      summary: 'Create or get chat with agent',
      description:
        'Create a new chat with an agent, or return the existing chat if one already exists for the given agent and user combination.',
      tags: ['Chats'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                agent_id: {
                  type: 'string',
                  format: 'uuid',
                  description:
                    'The agent to create or retrieve a chat with.',
                },
              },
              required: ['agent_id'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'An existing chat was found and returned.',
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
                        description: 'Unique identifier of the chat.',
                      },
                      agent_id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'The agent this chat is associated with.',
                      },
                      user_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The user who owns this chat.',
                      },
                      tenant_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The tenant this chat belongs to.',
                      },
                      last_message_at: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description:
                          'Timestamp of the most recent message in this chat.',
                      },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Timestamp when the chat was created.',
                      },
                      updated_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the chat was last updated.',
                      },
                    },
                    required: [
                      'id',
                      'agent_id',
                      'user_id',
                      'tenant_id',
                      'created_at',
                      'updated_at',
                    ],
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
        '201': {
          description: 'A new chat was created successfully.',
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
                        description: 'Unique identifier of the chat.',
                      },
                      agent_id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'The agent this chat is associated with.',
                      },
                      user_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The user who owns this chat.',
                      },
                      tenant_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The tenant this chat belongs to.',
                      },
                      last_message_at: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description:
                          'Timestamp of the most recent message in this chat.',
                      },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Timestamp when the chat was created.',
                      },
                      updated_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the chat was last updated.',
                      },
                    },
                    required: [
                      'id',
                      'agent_id',
                      'user_id',
                      'tenant_id',
                      'created_at',
                      'updated_at',
                    ],
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
          description:
            'Validation error. The request body failed schema or business-rule validation.',
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

  '/chats/{id}/messages': {
    get: {
      operationId: 'listChatMessages',
      summary: 'Get chat messages',
      description:
        'Retrieve messages in a chat, ordered by most recent first. Supports cursor-based pagination using the before parameter.',
      tags: ['Chats'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the chat.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Number of messages to return.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
          },
        },
        {
          name: 'before',
          in: 'query',
          required: false,
          description:
            'Return messages created before this timestamp for cursor-based pagination.',
          schema: {
            type: 'string',
            format: 'date-time',
          },
        },
      ],
      responses: {
        '200': {
          description: 'A list of chat messages.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                          description:
                            'Unique identifier of the chat message.',
                        },
                        chat_id: {
                          type: 'string',
                          format: 'uuid',
                          description:
                            'The chat this message belongs to.',
                        },
                        sender_type: {
                          type: 'string',
                          enum: ['user', 'agent'],
                          description:
                            'Whether the message was sent by a user or an agent.',
                        },
                        sender_id: {
                          type: 'string',
                          format: 'uuid',
                          description:
                            'The unique identifier of the sender (user or agent).',
                        },
                        content: {
                          type: 'string',
                          description: 'The message text content.',
                        },
                        created_at: {
                          type: 'string',
                          format: 'date-time',
                          description:
                            'Timestamp when the message was created.',
                        },
                        updated_at: {
                          type: 'string',
                          format: 'date-time',
                          description:
                            'Timestamp when the message was last updated.',
                        },
                      },
                      required: [
                        'id',
                        'chat_id',
                        'sender_type',
                        'sender_id',
                        'content',
                        'created_at',
                        'updated_at',
                      ],
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
          description: 'Chat not found.',
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
      operationId: 'sendChatMessage',
      summary: 'Send message in chat',
      description:
        'Send a new message in an existing chat conversation. The sender is determined by the authenticated user.',
      tags: ['Chats'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the chat.',
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
                content: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 4000,
                  description: 'The message text content.',
                },
              },
              required: ['content'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Chat message sent successfully.',
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
                        description:
                          'Unique identifier of the chat message.',
                      },
                      chat_id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'The chat this message belongs to.',
                      },
                      sender_type: {
                        type: 'string',
                        enum: ['user', 'agent'],
                        description:
                          'Whether the message was sent by a user or an agent.',
                      },
                      sender_id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'The unique identifier of the sender.',
                      },
                      content: {
                        type: 'string',
                        description: 'The message text content.',
                      },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the message was created.',
                      },
                      updated_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the message was last updated.',
                      },
                    },
                    required: [
                      'id',
                      'chat_id',
                      'sender_type',
                      'sender_id',
                      'content',
                      'created_at',
                      'updated_at',
                    ],
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
          description:
            'Validation error. The request body failed schema or business-rule validation.',
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
          description: 'Chat not found.',
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

  '/chats/{id}/messages/{messageId}': {
    get: {
      operationId: 'getChatMessage',
      summary: 'Get chat message',
      description:
        'Retrieve a single chat message by its unique identifier within a chat.',
      tags: ['Chats'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the chat.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'messageId',
          in: 'path',
          required: true,
          description: 'Unique identifier of the chat message.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'The requested chat message.',
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
                        description:
                          'Unique identifier of the chat message.',
                      },
                      chat_id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'The chat this message belongs to.',
                      },
                      sender_type: {
                        type: 'string',
                        enum: ['user', 'agent'],
                        description:
                          'Whether the message was sent by a user or an agent.',
                      },
                      sender_id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'The unique identifier of the sender.',
                      },
                      content: {
                        type: 'string',
                        description: 'The message text content.',
                      },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the message was created.',
                      },
                      updated_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the message was last updated.',
                      },
                    },
                    required: [
                      'id',
                      'chat_id',
                      'sender_type',
                      'sender_id',
                      'content',
                      'created_at',
                      'updated_at',
                    ],
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
          description: 'Chat or message not found.',
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
      operationId: 'deleteChatMessage',
      summary: 'Delete chat message',
      description:
        'Delete a chat message by its unique identifier within a chat.',
      tags: ['Chats'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the chat.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'messageId',
          in: 'path',
          required: true,
          description: 'Unique identifier of the chat message to delete.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'Chat message deleted successfully.',
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
                        description:
                          'The identifier of the deleted chat message.',
                      },
                      deleted: {
                        type: 'boolean',
                        description:
                          'Always true on successful deletion.',
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
          description: 'Chat or message not found.',
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

export const templatePaths = {
  '/agent-templates': {
    get: {
      operationId: 'listAgentTemplates',
      summary: 'List agent templates',
      description:
        'Retrieve a paginated list of agent templates, including both system-provided templates and tenant-specific custom templates. Supports filtering by category and free-text search.',
      tags: ['Agent Templates'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'category',
          in: 'query',
          required: false,
          description: 'Filter templates by category.',
          schema: {
            type: 'string',
          },
        },
        {
          name: 'search',
          in: 'query',
          required: false,
          description:
            'Free-text search across template name and description.',
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
          description: 'Number of templates per page.',
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
          description: 'A paginated list of agent templates.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                          description:
                            'Unique identifier of the template.',
                        },
                        tenant_id: {
                          type: 'string',
                          format: 'uuid',
                          nullable: true,
                          description:
                            'The tenant that owns this template. Null for system templates.',
                        },
                        name: {
                          type: 'string',
                          description: 'Display name of the template.',
                        },
                        description: {
                          type: 'string',
                          nullable: true,
                          description:
                            'Human-readable description of what the template provides.',
                        },
                        category: {
                          type: 'string',
                          nullable: true,
                          description:
                            'Category grouping for the template.',
                        },
                        role: {
                          type: 'string',
                          enum: [
                            'ceo',
                            'manager',
                            'worker',
                            'specialist',
                            'system',
                          ],
                          nullable: true,
                          description:
                            'Default agent role assigned by this template.',
                        },
                        config: {
                          type: 'object',
                          nullable: true,
                          description:
                            'Default configuration applied when using this template.',
                        },
                        is_system: {
                          type: 'boolean',
                          description:
                            'Whether this is a built-in system template.',
                        },
                        created_at: {
                          type: 'string',
                          format: 'date-time',
                          description:
                            'Timestamp when the template was created.',
                        },
                        updated_at: {
                          type: 'string',
                          format: 'date-time',
                          description:
                            'Timestamp when the template was last updated.',
                        },
                      },
                      required: [
                        'id',
                        'name',
                        'is_system',
                        'created_at',
                        'updated_at',
                      ],
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
      operationId: 'createAgentTemplate',
      summary: 'Create custom agent template',
      description:
        'Create a new custom agent template for the current tenant. Custom templates can be used as starting points when spawning new agents.',
      tags: ['Agent Templates'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Display name of the template.',
                },
                description: {
                  type: 'string',
                  nullable: true,
                  description:
                    'Human-readable description of what the template provides.',
                },
                category: {
                  type: 'string',
                  nullable: true,
                  description: 'Category grouping for the template.',
                },
                role: {
                  type: 'string',
                  enum: [
                    'ceo',
                    'manager',
                    'worker',
                    'specialist',
                    'system',
                  ],
                  nullable: true,
                  description:
                    'Default agent role assigned by this template.',
                },
                config: {
                  type: 'object',
                  nullable: true,
                  description:
                    'Default configuration applied when using this template.',
                },
              },
              required: ['name'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Agent template created successfully.',
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
                        description:
                          'Unique identifier of the template.',
                      },
                      tenant_id: {
                        type: 'string',
                        format: 'uuid',
                        nullable: true,
                        description:
                          'The tenant that owns this template.',
                      },
                      name: {
                        type: 'string',
                        description: 'Display name of the template.',
                      },
                      description: {
                        type: 'string',
                        nullable: true,
                        description:
                          'Human-readable description of what the template provides.',
                      },
                      category: {
                        type: 'string',
                        nullable: true,
                        description:
                          'Category grouping for the template.',
                      },
                      role: {
                        type: 'string',
                        enum: [
                          'ceo',
                          'manager',
                          'worker',
                          'specialist',
                          'system',
                        ],
                        nullable: true,
                        description:
                          'Default agent role assigned by this template.',
                      },
                      config: {
                        type: 'object',
                        nullable: true,
                        description:
                          'Default configuration applied when using this template.',
                      },
                      is_system: {
                        type: 'boolean',
                        description:
                          'Whether this is a built-in system template.',
                      },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the template was created.',
                      },
                      updated_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the template was last updated.',
                      },
                    },
                    required: [
                      'id',
                      'name',
                      'is_system',
                      'created_at',
                      'updated_at',
                    ],
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
          description:
            'Validation error. The request body failed schema or business-rule validation.',
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

  '/agent-templates/{id}': {
    get: {
      operationId: 'getAgentTemplate',
      summary: 'Get agent template details',
      description:
        'Retrieve a single agent template by its unique identifier, including full configuration details.',
      tags: ['Agent Templates'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent template.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'The requested agent template.',
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
                        description:
                          'Unique identifier of the template.',
                      },
                      tenant_id: {
                        type: 'string',
                        format: 'uuid',
                        nullable: true,
                        description:
                          'The tenant that owns this template. Null for system templates.',
                      },
                      name: {
                        type: 'string',
                        description: 'Display name of the template.',
                      },
                      description: {
                        type: 'string',
                        nullable: true,
                        description:
                          'Human-readable description of what the template provides.',
                      },
                      category: {
                        type: 'string',
                        nullable: true,
                        description:
                          'Category grouping for the template.',
                      },
                      role: {
                        type: 'string',
                        enum: [
                          'ceo',
                          'manager',
                          'worker',
                          'specialist',
                          'system',
                        ],
                        nullable: true,
                        description:
                          'Default agent role assigned by this template.',
                      },
                      config: {
                        type: 'object',
                        nullable: true,
                        description:
                          'Default configuration applied when using this template.',
                      },
                      is_system: {
                        type: 'boolean',
                        description:
                          'Whether this is a built-in system template.',
                      },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the template was created.',
                      },
                      updated_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the template was last updated.',
                      },
                    },
                    required: [
                      'id',
                      'name',
                      'is_system',
                      'created_at',
                      'updated_at',
                    ],
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
          description: 'Agent template not found.',
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
      operationId: 'updateAgentTemplate',
      summary: 'Update agent template',
      description:
        'Partially update an existing custom agent template. Only the fields provided in the request body are modified. System templates cannot be updated.',
      tags: ['Agent Templates'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent template to update.',
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
                name: {
                  type: 'string',
                  description: 'Display name of the template.',
                },
                description: {
                  type: 'string',
                  nullable: true,
                  description:
                    'Human-readable description of what the template provides.',
                },
                category: {
                  type: 'string',
                  nullable: true,
                  description: 'Category grouping for the template.',
                },
                config: {
                  type: 'object',
                  nullable: true,
                  description:
                    'Default configuration applied when using this template.',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Agent template updated successfully.',
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
                        description:
                          'Unique identifier of the template.',
                      },
                      tenant_id: {
                        type: 'string',
                        format: 'uuid',
                        nullable: true,
                        description:
                          'The tenant that owns this template.',
                      },
                      name: {
                        type: 'string',
                        description: 'Display name of the template.',
                      },
                      description: {
                        type: 'string',
                        nullable: true,
                        description:
                          'Human-readable description of what the template provides.',
                      },
                      category: {
                        type: 'string',
                        nullable: true,
                        description:
                          'Category grouping for the template.',
                      },
                      role: {
                        type: 'string',
                        enum: [
                          'ceo',
                          'manager',
                          'worker',
                          'specialist',
                          'system',
                        ],
                        nullable: true,
                        description:
                          'Default agent role assigned by this template.',
                      },
                      config: {
                        type: 'object',
                        nullable: true,
                        description:
                          'Default configuration applied when using this template.',
                      },
                      is_system: {
                        type: 'boolean',
                        description:
                          'Whether this is a built-in system template.',
                      },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the template was created.',
                      },
                      updated_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the template was last updated.',
                      },
                    },
                    required: [
                      'id',
                      'name',
                      'is_system',
                      'created_at',
                      'updated_at',
                    ],
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
          description: 'Agent template not found.',
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
      operationId: 'deleteAgentTemplate',
      summary: 'Delete agent template',
      description:
        'Delete a custom agent template. System templates cannot be deleted.',
      tags: ['Agent Templates'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the agent template to delete.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'Agent template deleted successfully.',
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
                        description:
                          'The identifier of the deleted template.',
                      },
                      deleted: {
                        type: 'boolean',
                        description:
                          'Always true on successful deletion.',
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
          description: 'Agent template not found.',
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

export const analyticsPaths = {
  '/analytics/overview': {
    get: {
      operationId: 'getAnalyticsOverview',
      summary: 'Dashboard metrics with trends',
      description:
        'Retrieve aggregated dashboard metrics including agent counts, task statistics, escalation data, cost totals, and trend comparisons. Results are cached for 5 minutes.',
      tags: ['Analytics'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'days',
          in: 'query',
          required: false,
          description: 'Number of days to include in the analytics window.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 90,
            default: 30,
          },
        },
      ],
      responses: {
        '200': {
          description:
            'Aggregated dashboard metrics with trend comparisons.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      agents: {
                        type: 'object',
                        properties: {
                          total: {
                            type: 'integer',
                            description:
                              'Total number of agents in the tenant.',
                          },
                          active: {
                            type: 'integer',
                            description:
                              'Number of agents currently in active status.',
                          },
                          idle: {
                            type: 'integer',
                            description:
                              'Number of agents currently in idle status.',
                          },
                          error: {
                            type: 'integer',
                            description:
                              'Number of agents currently in error status.',
                          },
                        },
                        required: ['total', 'active', 'idle', 'error'],
                      },
                      tasks: {
                        type: 'object',
                        properties: {
                          total: {
                            type: 'integer',
                            description:
                              'Total number of tasks in the analytics window.',
                          },
                          completed: {
                            type: 'integer',
                            description:
                              'Number of tasks completed in the analytics window.',
                          },
                          in_progress: {
                            type: 'integer',
                            description:
                              'Number of tasks currently in progress.',
                          },
                          failed: {
                            type: 'integer',
                            description:
                              'Number of tasks that failed in the analytics window.',
                          },
                          completion_rate: {
                            type: 'number',
                            format: 'float',
                            description:
                              'Percentage of tasks completed successfully (0-100).',
                          },
                        },
                        required: [
                          'total',
                          'completed',
                          'in_progress',
                          'failed',
                          'completion_rate',
                        ],
                      },
                      escalations: {
                        type: 'object',
                        properties: {
                          total: {
                            type: 'integer',
                            description:
                              'Total number of escalations in the analytics window.',
                          },
                          open: {
                            type: 'integer',
                            description:
                              'Number of currently open escalations.',
                          },
                          resolved: {
                            type: 'integer',
                            description:
                              'Number of escalations resolved in the analytics window.',
                          },
                          avg_resolution_time: {
                            type: 'number',
                            format: 'float',
                            description:
                              'Average escalation resolution time in seconds.',
                          },
                        },
                        required: [
                          'total',
                          'open',
                          'resolved',
                          'avg_resolution_time',
                        ],
                      },
                      cost: {
                        type: 'object',
                        properties: {
                          total_usd: {
                            type: 'number',
                            format: 'float',
                            description:
                              'Total cost in USD during the analytics window.',
                          },
                          avg_per_task: {
                            type: 'number',
                            format: 'float',
                            description:
                              'Average cost per task in USD.',
                          },
                        },
                        required: ['total_usd', 'avg_per_task'],
                      },
                      trends: {
                        type: 'object',
                        description:
                          'Trend comparisons against the previous period of equal length.',
                      },
                    },
                    required: [
                      'agents',
                      'tasks',
                      'escalations',
                      'cost',
                      'trends',
                    ],
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
                      cached: {
                        type: 'boolean',
                        description:
                          'Whether this response was served from cache.',
                      },
                    },
                    required: ['timestamp', 'cached'],
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
      },
    },
  },

  '/analytics/agents/{id}': {
    get: {
      operationId: 'getAgentAnalytics',
      summary: 'Agent performance analytics',
      description:
        'Retrieve detailed performance analytics for a specific agent, including task completion rates, cost breakdown, decision accuracy, and escalation metrics.',
      tags: ['Analytics'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description:
            'Unique identifier of the agent to retrieve analytics for.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'days',
          in: 'query',
          required: false,
          description: 'Number of days to include in the analytics window.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 90,
            default: 30,
          },
        },
      ],
      responses: {
        '200': {
          description: 'Detailed agent performance analytics.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      agent: {
                        $ref: '#/components/schemas/Agent',
                      },
                      tasks: {
                        type: 'object',
                        properties: {
                          completed: {
                            type: 'integer',
                            description:
                              'Number of tasks completed by this agent.',
                          },
                          failed: {
                            type: 'integer',
                            description:
                              'Number of tasks failed by this agent.',
                          },
                          avg_duration: {
                            type: 'number',
                            format: 'float',
                            description:
                              'Average task duration in seconds.',
                          },
                        },
                        required: [
                          'completed',
                          'failed',
                          'avg_duration',
                        ],
                      },
                      cost: {
                        type: 'object',
                        properties: {
                          total_usd: {
                            type: 'number',
                            format: 'float',
                            description:
                              'Total cost incurred by this agent in USD.',
                          },
                        },
                        required: ['total_usd'],
                      },
                      decisions: {
                        type: 'object',
                        properties: {
                          total: {
                            type: 'integer',
                            description:
                              'Total number of decisions made by this agent.',
                          },
                          approved_rate: {
                            type: 'number',
                            format: 'float',
                            description:
                              'Percentage of decisions that were approved (0-100).',
                          },
                        },
                        required: ['total', 'approved_rate'],
                      },
                      escalations: {
                        type: 'object',
                        properties: {
                          total: {
                            type: 'integer',
                            description:
                              'Total number of escalations involving this agent.',
                          },
                          resolution_rate: {
                            type: 'number',
                            format: 'float',
                            description:
                              'Percentage of escalations resolved (0-100).',
                          },
                        },
                        required: ['total', 'resolution_rate'],
                      },
                    },
                    required: [
                      'agent',
                      'tasks',
                      'cost',
                      'decisions',
                      'escalations',
                    ],
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

  '/analytics/leaderboard': {
    get: {
      operationId: 'getAgentLeaderboard',
      summary: 'Agent leaderboard',
      description:
        'Retrieve a ranked leaderboard of agents based on performance metrics. Supports sorting by tasks completed, success rate, average duration, or cost.',
      tags: ['Analytics'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'days',
          in: 'query',
          required: false,
          description: 'Number of days to include in the analytics window.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 90,
            default: 30,
          },
        },
        {
          name: 'sortBy',
          in: 'query',
          required: false,
          description: 'Metric to sort the leaderboard by.',
          schema: {
            type: 'string',
            enum: [
              'tasksCompleted',
              'successRate',
              'avgDuration',
              'cost',
            ],
            default: 'tasksCompleted',
          },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Number of agents to include in the leaderboard.',
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
          description: 'A ranked list of agent performance entries.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        rank: {
                          type: 'integer',
                          description:
                            'The agent\'s position in the leaderboard.',
                        },
                        agent_id: {
                          type: 'string',
                          format: 'uuid',
                          description: 'Unique identifier of the agent.',
                        },
                        agent_name: {
                          type: 'string',
                          description: 'Display name of the agent.',
                        },
                        agent_role: {
                          type: 'string',
                          enum: [
                            'ceo',
                            'manager',
                            'worker',
                            'specialist',
                            'system',
                          ],
                          description:
                            'The organizational role of the agent.',
                        },
                        tasks_completed: {
                          type: 'integer',
                          description:
                            'Number of tasks completed by this agent.',
                        },
                        success_rate: {
                          type: 'number',
                          format: 'float',
                          description:
                            'Task success rate percentage (0-100).',
                        },
                        avg_duration: {
                          type: 'number',
                          format: 'float',
                          description:
                            'Average task duration in seconds.',
                        },
                        total_cost_usd: {
                          type: 'number',
                          format: 'float',
                          description:
                            'Total cost incurred by this agent in USD.',
                        },
                      },
                      required: [
                        'rank',
                        'agent_id',
                        'agent_name',
                        'agent_role',
                        'tasks_completed',
                        'success_rate',
                        'avg_duration',
                        'total_cost_usd',
                      ],
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
      },
    },
  },

  '/analytics/bottlenecks': {
    get: {
      operationId: 'getBottleneckAnalysis',
      summary: 'System bottleneck analysis',
      description:
        'Identify system bottlenecks including blocked tasks, slow agents, overloaded agents, and escalation hotspots within the specified time window.',
      tags: ['Analytics'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'hours',
          in: 'query',
          required: false,
          description:
            'Number of hours to look back for bottleneck analysis.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 168,
            default: 24,
          },
        },
      ],
      responses: {
        '200': {
          description: 'System bottleneck analysis results.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      blocked_tasks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            task_id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'Unique identifier of the blocked task.',
                            },
                            task_title: {
                              type: 'string',
                              description: 'Title of the blocked task.',
                            },
                            blocked_since: {
                              type: 'string',
                              format: 'date-time',
                              description:
                                'Timestamp when the task became blocked.',
                            },
                            blocked_by: {
                              type: 'string',
                              nullable: true,
                              description:
                                'Description of what is blocking the task.',
                            },
                            assigned_agent_id: {
                              type: 'string',
                              format: 'uuid',
                              nullable: true,
                              description:
                                'Agent assigned to this task, if any.',
                            },
                          },
                          required: [
                            'task_id',
                            'task_title',
                            'blocked_since',
                          ],
                        },
                        description:
                          'Tasks that are currently in blocked status.',
                      },
                      slow_agents: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            agent_id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'Unique identifier of the slow agent.',
                            },
                            agent_name: {
                              type: 'string',
                              description: 'Display name of the agent.',
                            },
                            avg_task_duration: {
                              type: 'number',
                              format: 'float',
                              description:
                                'Average task duration in seconds, significantly above the norm.',
                            },
                            tasks_in_progress: {
                              type: 'integer',
                              description:
                                'Number of tasks currently in progress for this agent.',
                            },
                          },
                          required: [
                            'agent_id',
                            'agent_name',
                            'avg_task_duration',
                            'tasks_in_progress',
                          ],
                        },
                        description:
                          'Agents with task durations significantly above average.',
                      },
                      overloaded_agents: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            agent_id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'Unique identifier of the overloaded agent.',
                            },
                            agent_name: {
                              type: 'string',
                              description: 'Display name of the agent.',
                            },
                            active_tasks: {
                              type: 'integer',
                              description:
                                'Number of tasks currently assigned to this agent.',
                            },
                            max_concurrent: {
                              type: 'integer',
                              description:
                                'Maximum concurrent tasks configured for this agent.',
                            },
                          },
                          required: [
                            'agent_id',
                            'agent_name',
                            'active_tasks',
                            'max_concurrent',
                          ],
                        },
                        description:
                          'Agents that are at or above their maximum concurrent task limit.',
                      },
                      escalation_hotspots: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            agent_id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'Unique identifier of the agent with frequent escalations.',
                            },
                            agent_name: {
                              type: 'string',
                              description: 'Display name of the agent.',
                            },
                            escalation_count: {
                              type: 'integer',
                              description:
                                'Number of escalations involving this agent in the time window.',
                            },
                            unresolved_count: {
                              type: 'integer',
                              description:
                                'Number of unresolved escalations for this agent.',
                            },
                          },
                          required: [
                            'agent_id',
                            'agent_name',
                            'escalation_count',
                            'unresolved_count',
                          ],
                        },
                        description:
                          'Agents generating a disproportionate number of escalations.',
                      },
                    },
                    required: [
                      'blocked_tasks',
                      'slow_agents',
                      'overloaded_agents',
                      'escalation_hotspots',
                    ],
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
      },
    },
  },

  '/analytics/roi': {
    get: {
      operationId: 'getROIAnalysis',
      summary: 'ROI analysis',
      description:
        'Calculate return on investment by comparing agent operational costs against estimated human labor costs for the same work volume.',
      tags: ['Analytics'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'days',
          in: 'query',
          required: false,
          description: 'Number of days to include in the ROI calculation.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 90,
            default: 30,
          },
        },
        {
          name: 'hourlyRate',
          in: 'query',
          required: false,
          description:
            'Assumed human hourly rate in USD for comparison.',
          schema: {
            type: 'number',
            default: 50,
          },
        },
      ],
      responses: {
        '200': {
          description: 'ROI analysis results.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      total_cost: {
                        type: 'number',
                        format: 'float',
                        description:
                          'Total agent operational cost in USD during the period.',
                      },
                      estimated_human_hours: {
                        type: 'number',
                        format: 'float',
                        description:
                          'Estimated number of human hours required for the same work.',
                      },
                      estimated_human_cost: {
                        type: 'number',
                        format: 'float',
                        description:
                          'Estimated human labor cost in USD based on the hourly rate.',
                      },
                      roi_percentage: {
                        type: 'number',
                        format: 'float',
                        description:
                          'ROI percentage. Positive values indicate cost savings.',
                      },
                      cost_per_task: {
                        type: 'number',
                        format: 'float',
                        description:
                          'Average agent cost per task in USD.',
                      },
                    },
                    required: [
                      'total_cost',
                      'estimated_human_hours',
                      'estimated_human_cost',
                      'roi_percentage',
                      'cost_per_task',
                    ],
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
      },
    },
  },
} as const;

export const metaAgentPaths = {
  '/meta-agent/process': {
    post: {
      operationId: 'processMetaAgentMessage',
      summary: 'Process CEO message through natural language interface',
      description:
        'Send a natural language message to the VALIS meta-agent for processing. VALIS interprets the intent, executes any required actions (agent spawning, task creation, etc.), and returns a natural language response.',
      tags: ['Meta-Agent'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description:
                    'The natural language message to process.',
                },
                session_id: {
                  type: 'string',
                  format: 'uuid',
                  description:
                    'Optional session identifier to continue a previous conversation. If omitted, a new session is created.',
                },
              },
              required: ['message'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Meta-agent processing result.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      response: {
                        type: 'string',
                        description:
                          'The natural language response from VALIS.',
                      },
                      intent: {
                        type: 'string',
                        description:
                          'The detected intent classification of the input message.',
                      },
                      actions_taken: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: {
                              type: 'string',
                              description:
                                'The type of action performed (e.g., agent.spawn, task.create).',
                            },
                            description: {
                              type: 'string',
                              description:
                                'Human-readable description of the action taken.',
                            },
                            entity_id: {
                              type: 'string',
                              format: 'uuid',
                              nullable: true,
                              description:
                                'The identifier of the entity created or modified, if applicable.',
                            },
                          },
                          required: ['type', 'description'],
                        },
                        description:
                          'List of actions the meta-agent performed in response to the message.',
                      },
                      session_id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'The session identifier for this conversation.',
                      },
                    },
                    required: [
                      'response',
                      'intent',
                      'actions_taken',
                      'session_id',
                    ],
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
          description:
            'Validation error. The request body failed schema or business-rule validation.',
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

  '/meta-agent/sessions': {
    get: {
      operationId: 'listMetaAgentSessions',
      summary: 'List meta-agent sessions',
      description:
        'Retrieve all VALIS meta-agent sessions for the current user, ordered by most recent activity.',
      tags: ['Meta-Agent'],
      security: [{ BearerAuth: [] }],
      parameters: [],
      responses: {
        '200': {
          description: 'A list of meta-agent sessions.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                          description:
                            'Unique identifier of the session.',
                        },
                        user_id: {
                          type: 'string',
                          format: 'uuid',
                          description:
                            'The user who owns this session.',
                        },
                        tenant_id: {
                          type: 'string',
                          format: 'uuid',
                          description:
                            'The tenant this session belongs to.',
                        },
                        title: {
                          type: 'string',
                          nullable: true,
                          description:
                            'Auto-generated or user-provided title summarizing the session.',
                        },
                        status: {
                          type: 'string',
                          enum: ['active', 'archived'],
                          description:
                            'Current status of the session.',
                        },
                        command_count: {
                          type: 'integer',
                          description:
                            'Total number of commands processed in this session.',
                        },
                        last_activity_at: {
                          type: 'string',
                          format: 'date-time',
                          nullable: true,
                          description:
                            'Timestamp of the most recent activity in this session.',
                        },
                        created_at: {
                          type: 'string',
                          format: 'date-time',
                          description:
                            'Timestamp when the session was created.',
                        },
                        updated_at: {
                          type: 'string',
                          format: 'date-time',
                          description:
                            'Timestamp when the session was last updated.',
                        },
                      },
                      required: [
                        'id',
                        'user_id',
                        'tenant_id',
                        'status',
                        'command_count',
                        'created_at',
                        'updated_at',
                      ],
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
      },
    },
  },

  '/meta-agent/sessions/{id}': {
    get: {
      operationId: 'getMetaAgentSession',
      summary: 'Get meta-agent session with command history',
      description:
        'Retrieve a single meta-agent session by its unique identifier, including the full command history and responses.',
      tags: ['Meta-Agent'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the meta-agent session.',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description:
            'The requested meta-agent session with command history.',
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
                        description:
                          'Unique identifier of the session.',
                      },
                      user_id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'The user who owns this session.',
                      },
                      tenant_id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'The tenant this session belongs to.',
                      },
                      title: {
                        type: 'string',
                        nullable: true,
                        description:
                          'Auto-generated or user-provided title summarizing the session.',
                      },
                      status: {
                        type: 'string',
                        enum: ['active', 'archived'],
                        description:
                          'Current status of the session.',
                      },
                      command_count: {
                        type: 'integer',
                        description:
                          'Total number of commands processed in this session.',
                      },
                      last_activity_at: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description:
                          'Timestamp of the most recent activity in this session.',
                      },
                      commands: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'Unique identifier of the command.',
                            },
                            message: {
                              type: 'string',
                              description:
                                'The user\'s input message.',
                            },
                            response: {
                              type: 'string',
                              description:
                                'The VALIS response to the command.',
                            },
                            intent: {
                              type: 'string',
                              description:
                                'The detected intent classification.',
                            },
                            actions_taken: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  type: {
                                    type: 'string',
                                    description:
                                      'The type of action performed.',
                                  },
                                  description: {
                                    type: 'string',
                                    description:
                                      'Human-readable description of the action.',
                                  },
                                  entity_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    nullable: true,
                                    description:
                                      'The identifier of the entity created or modified.',
                                  },
                                },
                                required: ['type', 'description'],
                              },
                              description:
                                'Actions performed for this command.',
                            },
                            created_at: {
                              type: 'string',
                              format: 'date-time',
                              description:
                                'Timestamp when the command was processed.',
                            },
                          },
                          required: [
                            'id',
                            'message',
                            'response',
                            'intent',
                            'actions_taken',
                            'created_at',
                          ],
                        },
                        description:
                          'The full command history for this session, ordered chronologically.',
                      },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the session was created.',
                      },
                      updated_at: {
                        type: 'string',
                        format: 'date-time',
                        description:
                          'Timestamp when the session was last updated.',
                      },
                    },
                    required: [
                      'id',
                      'user_id',
                      'tenant_id',
                      'status',
                      'command_count',
                      'commands',
                      'created_at',
                      'updated_at',
                    ],
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
          description: 'Session not found.',
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
      operationId: 'continueMetaAgentSession',
      summary: 'Continue meta-agent session',
      description:
        'Send a follow-up message within an existing VALIS meta-agent session, maintaining conversation context.',
      tags: ['Meta-Agent'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description:
            'Unique identifier of the meta-agent session to continue.',
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
                message: {
                  type: 'string',
                  description:
                    'The natural language follow-up message to process.',
                },
              },
              required: ['message'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Meta-agent session continued successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      response: {
                        type: 'string',
                        description:
                          'The natural language response from VALIS.',
                      },
                      intent: {
                        type: 'string',
                        description:
                          'The detected intent classification of the input message.',
                      },
                      actions_taken: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: {
                              type: 'string',
                              description:
                                'The type of action performed.',
                            },
                            description: {
                              type: 'string',
                              description:
                                'Human-readable description of the action taken.',
                            },
                            entity_id: {
                              type: 'string',
                              format: 'uuid',
                              nullable: true,
                              description:
                                'The identifier of the entity created or modified, if applicable.',
                            },
                          },
                          required: ['type', 'description'],
                        },
                        description:
                          'List of actions the meta-agent performed in response to the message.',
                      },
                    },
                    required: [
                      'response',
                      'intent',
                      'actions_taken',
                    ],
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
          description:
            'Validation error. The request body failed schema or business-rule validation.',
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
          description: 'Session not found.',
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
