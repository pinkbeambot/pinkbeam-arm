export const taskPaths = {
  '/tasks': {
    get: {
      tags: ['Tasks'],
      operationId: 'listTasks',
      summary: 'List tasks',
      description:
        'Retrieve a paginated list of tasks with advanced filtering, sorting, and search capabilities.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          description:
            'Comma-separated list of task statuses to filter by.',
          required: false,
          schema: {
            type: 'string',
            example: 'queued,in_progress',
          },
          explode: false,
          style: 'form',
        },
        {
          name: 'priority',
          in: 'query',
          description: 'Filter by task priority.',
          required: false,
          schema: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent'],
          },
        },
        {
          name: 'agent_id',
          in: 'query',
          description: 'Filter by the agent that created or owns the task.',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'assignee_id',
          in: 'query',
          description: 'Filter by the agent assigned to the task.',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'parent_id',
          in: 'query',
          description:
            'Filter by parent task ID. Use null to retrieve only root-level tasks.',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
        },
        {
          name: 'due_before',
          in: 'query',
          description:
            'Filter tasks with a deadline before this datetime (ISO 8601).',
          required: false,
          schema: {
            type: 'string',
            format: 'date-time',
          },
        },
        {
          name: 'due_after',
          in: 'query',
          description:
            'Filter tasks with a deadline after this datetime (ISO 8601).',
          required: false,
          schema: {
            type: 'string',
            format: 'date-time',
          },
        },
        {
          name: 'search',
          in: 'query',
          description:
            'Full-text search across task title and description.',
          required: false,
          schema: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
          },
        },
        {
          name: 'sort',
          in: 'query',
          description: 'Field to sort results by.',
          required: false,
          schema: {
            type: 'string',
            enum: ['created_at', 'updated_at', 'deadline_at', 'priority'],
            default: 'created_at',
          },
        },
        {
          name: 'order',
          in: 'query',
          description: 'Sort order.',
          required: false,
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
          },
        },
        {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination.',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Number of results per page.',
          required: false,
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
          description: 'A paginated list of tasks matching the filter criteria.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'meta', 'pagination'],
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Task',
                    },
                  },
                  meta: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Server timestamp of the response.',
                      },
                    },
                  },
                  pagination: {
                    $ref: '#/components/schemas/Pagination',
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Invalid query parameters.',
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
      },
    },
    post: {
      tags: ['Tasks'],
      operationId: 'createTask',
      summary: 'Create task',
      description: 'Create a new task with the provided details.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CreateTaskInput',
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Task created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'meta'],
                properties: {
                  data: {
                    $ref: '#/components/schemas/Task',
                  },
                  meta: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Server timestamp of the response.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Invalid request body.',
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
          description:
            'Referenced resource not found (assignee, parent task).',
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

  '/tasks/{id}': {
    get: {
      tags: ['Tasks'],
      operationId: 'getTask',
      summary: 'Get single task',
      description:
        'Retrieve a single task by ID, including its assignee, assigner, subtasks, and dependencies.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Unique identifier of the task.',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description:
            'Task details including assignee, assigner, subtasks, and dependencies.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'meta'],
                properties: {
                  data: {
                    allOf: [
                      {
                        $ref: '#/components/schemas/Task',
                      },
                      {
                        type: 'object',
                        properties: {
                          assignee: {
                            type: 'object',
                            nullable: true,
                            description:
                              'The agent assigned to this task.',
                            properties: {
                              id: {
                                type: 'string',
                                format: 'uuid',
                              },
                              name: {
                                type: 'string',
                              },
                              role: {
                                type: 'string',
                              },
                              status: {
                                type: 'string',
                              },
                            },
                          },
                          assigner: {
                            type: 'object',
                            nullable: true,
                            description:
                              'The agent that created or assigned this task.',
                            properties: {
                              id: {
                                type: 'string',
                                format: 'uuid',
                              },
                              name: {
                                type: 'string',
                              },
                              role: {
                                type: 'string',
                              },
                              status: {
                                type: 'string',
                              },
                            },
                          },
                          subtasks: {
                            type: 'array',
                            description:
                              'Direct child tasks of this task.',
                            items: {
                              $ref: '#/components/schemas/Task',
                            },
                          },
                          dependencies: {
                            type: 'array',
                            description:
                              'Tasks that this task depends on.',
                            items: {
                              type: 'object',
                              properties: {
                                id: {
                                  type: 'string',
                                  format: 'uuid',
                                },
                                depends_on_task_id: {
                                  type: 'string',
                                  format: 'uuid',
                                },
                                dependency_type: {
                                  type: 'string',
                                  enum: [
                                    'blocks',
                                    'requires',
                                    'optional',
                                  ],
                                },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                  meta: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Server timestamp of the response.',
                      },
                    },
                  },
                },
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
          description: 'Task not found.',
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
      tags: ['Tasks'],
      operationId: 'updateTask',
      summary: 'Update task',
      description: 'Update an existing task with partial data.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Unique identifier of the task.',
          required: true,
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
              $ref: '#/components/schemas/UpdateTaskInput',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Task updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'meta'],
                properties: {
                  data: {
                    $ref: '#/components/schemas/Task',
                  },
                  meta: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Server timestamp of the response.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Invalid request body.',
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
          description: 'Task not found.',
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
      tags: ['Tasks'],
      operationId: 'deleteTask',
      summary: 'Delete task',
      description:
        'Delete a task by ID. Returns confirmation of the deletion.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Unique identifier of the task.',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'Task deleted successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'meta'],
                properties: {
                  data: {
                    type: 'object',
                    required: ['id', 'deleted'],
                    properties: {
                      id: {
                        type: 'string',
                        format: 'uuid',
                        description:
                          'Unique identifier of the deleted task.',
                      },
                      deleted: {
                        type: 'boolean',
                        enum: [true],
                        description:
                          'Confirmation that the task was deleted.',
                      },
                    },
                  },
                  meta: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Server timestamp of the response.',
                      },
                    },
                  },
                },
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
          description: 'Task not found.',
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

  '/tasks/batch': {
    post: {
      tags: ['Tasks'],
      operationId: 'batchTaskOperations',
      summary: 'Batch operations',
      description:
        'Perform batch create, update, or delete operations on tasks. Supports up to 100 tasks per request.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              oneOf: [
                {
                  type: 'object',
                  title: 'Batch Create',
                  description:
                    'Create multiple tasks in a single request.',
                  required: ['tasks'],
                  properties: {
                    tasks: {
                      type: 'array',
                      description:
                        'Array of task creation inputs.',
                      minItems: 1,
                      maxItems: 100,
                      items: {
                        $ref: '#/components/schemas/CreateTaskInput',
                      },
                    },
                  },
                },
                {
                  type: 'object',
                  title: 'Batch Update',
                  description:
                    'Update multiple tasks in a single request.',
                  required: ['tasks'],
                  properties: {
                    tasks: {
                      type: 'array',
                      description:
                        'Array of task update objects containing the task ID and update data.',
                      minItems: 1,
                      maxItems: 100,
                      items: {
                        type: 'object',
                        required: ['id', 'data'],
                        properties: {
                          id: {
                            type: 'string',
                            format: 'uuid',
                            description:
                              'Unique identifier of the task to update.',
                          },
                          data: {
                            $ref: '#/components/schemas/UpdateTaskInput',
                          },
                        },
                      },
                    },
                  },
                },
                {
                  type: 'object',
                  title: 'Batch Delete',
                  description:
                    'Delete multiple tasks in a single request.',
                  required: ['ids'],
                  properties: {
                    ids: {
                      type: 'array',
                      description:
                        'Array of task IDs to delete.',
                      minItems: 1,
                      maxItems: 100,
                      items: {
                        type: 'string',
                        format: 'uuid',
                      },
                    },
                    force: {
                      type: 'boolean',
                      description:
                        'Force deletion even if tasks have active subtasks or dependencies.',
                      default: false,
                    },
                  },
                },
              ],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Batch operation completed successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'meta'],
                properties: {
                  data: {
                    oneOf: [
                      {
                        type: 'object',
                        title: 'Batch Create Result',
                        required: ['created'],
                        properties: {
                          created: {
                            type: 'array',
                            items: {
                              $ref: '#/components/schemas/Task',
                            },
                          },
                        },
                      },
                      {
                        type: 'object',
                        title: 'Batch Update Result',
                        required: ['updated'],
                        properties: {
                          updated: {
                            type: 'array',
                            items: {
                              $ref: '#/components/schemas/Task',
                            },
                          },
                        },
                      },
                      {
                        type: 'object',
                        title: 'Batch Delete Result',
                        required: ['deleted'],
                        properties: {
                          deleted: {
                            type: 'array',
                            items: {
                              type: 'object',
                              required: ['id', 'deleted'],
                              properties: {
                                id: {
                                  type: 'string',
                                  format: 'uuid',
                                },
                                deleted: {
                                  type: 'boolean',
                                  enum: [true],
                                },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                  meta: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Server timestamp of the response.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description:
            'Invalid request body or batch size exceeds the maximum of 100.',
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
      },
    },
  },

  '/tasks/tree': {
    get: {
      tags: ['Tasks'],
      operationId: 'getTaskTree',
      summary: 'Get task hierarchy tree',
      description:
        'Retrieve the hierarchical tree of tasks starting from a root task, with configurable depth and filtering options.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'root_id',
          in: 'query',
          description: 'UUID of the root task for the tree.',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          name: 'max_depth',
          in: 'query',
          description:
            'Maximum depth of the tree to traverse.',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            default: 10,
          },
        },
        {
          name: 'include_completed',
          in: 'query',
          description:
            'Whether to include completed tasks in the tree.',
          required: false,
          schema: {
            type: 'boolean',
            default: true,
          },
        },
      ],
      responses: {
        '200': {
          description:
            'Hierarchical tree of tasks rooted at the specified task.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'meta'],
                properties: {
                  data: {
                    type: 'object',
                    description:
                      'A task tree node containing the task data and its children recursively.',
                    properties: {
                      id: {
                        type: 'string',
                        format: 'uuid',
                      },
                      title: {
                        type: 'string',
                      },
                      status: {
                        type: 'string',
                        enum: [
                          'queued',
                          'in_progress',
                          'blocked',
                          'review',
                          'completed',
                          'failed',
                          'cancelled',
                        ],
                      },
                      priority: {
                        type: 'string',
                        enum: ['low', 'normal', 'high', 'urgent'],
                      },
                      assignee_id: {
                        type: 'string',
                        format: 'uuid',
                        nullable: true,
                      },
                      progress_percent: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 100,
                      },
                      depth: {
                        type: 'integer',
                        description:
                          'Depth of this node relative to the root.',
                      },
                      children: {
                        type: 'array',
                        description:
                          'Child task tree nodes.',
                        items: {
                          type: 'object',
                          description:
                            'Recursive task tree node (same structure as parent).',
                        },
                      },
                    },
                  },
                  meta: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Server timestamp of the response.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Invalid query parameters.',
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
          description: 'Root task not found.',
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

  '/tasks/{id}/dependencies': {
    get: {
      tags: ['Tasks'],
      operationId: 'getTaskDependencies',
      summary: 'Get task dependencies',
      description:
        'Retrieve all dependencies for a specific task, split into tasks it depends on and tasks it blocks.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Unique identifier of the task.',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        '200': {
          description: 'Task dependencies retrieved successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'meta'],
                properties: {
                  data: {
                    type: 'object',
                    required: ['depends_on', 'blocked_by'],
                    properties: {
                      depends_on: {
                        type: 'array',
                        description:
                          'Tasks that this task depends on (must complete before this task can proceed).',
                        items: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'Dependency record ID.',
                            },
                            task_id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'The current task ID.',
                            },
                            depends_on_task_id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'The task that must complete first.',
                            },
                            dependency_type: {
                              type: 'string',
                              enum: [
                                'blocks',
                                'requires',
                                'optional',
                              ],
                            },
                            task: {
                              $ref: '#/components/schemas/Task',
                            },
                          },
                        },
                      },
                      blocked_by: {
                        type: 'array',
                        description:
                          'Tasks that are blocked by this task (waiting for this task to complete).',
                        items: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'Dependency record ID.',
                            },
                            task_id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'The task that is blocked.',
                            },
                            depends_on_task_id: {
                              type: 'string',
                              format: 'uuid',
                              description:
                                'The current task ID.',
                            },
                            dependency_type: {
                              type: 'string',
                              enum: [
                                'blocks',
                                'requires',
                                'optional',
                              ],
                            },
                            task: {
                              $ref: '#/components/schemas/Task',
                            },
                          },
                        },
                      },
                    },
                  },
                  meta: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Server timestamp of the response.',
                      },
                    },
                  },
                },
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
          description: 'Task not found.',
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
      tags: ['Tasks'],
      operationId: 'addTaskDependency',
      summary: 'Add task dependency',
      description:
        'Add a dependency relationship between two tasks.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Unique identifier of the task to add the dependency to.',
          required: true,
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
              required: ['depends_on_task_id', 'dependency_type'],
              properties: {
                depends_on_task_id: {
                  type: 'string',
                  format: 'uuid',
                  description:
                    'UUID of the task that this task depends on.',
                },
                dependency_type: {
                  type: 'string',
                  enum: ['blocks', 'requires', 'optional'],
                  description:
                    'Type of dependency relationship. "blocks" means the dependency must complete before this task can start. "requires" means the dependency output is needed. "optional" means the dependency is informational.',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Task dependency created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'meta'],
                properties: {
                  data: {
                    type: 'object',
                    description: 'The created task dependency record.',
                    properties: {
                      id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'Unique identifier of the dependency.',
                      },
                      task_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The task that has the dependency.',
                      },
                      depends_on_task_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The task that is depended upon.',
                      },
                      dependency_type: {
                        type: 'string',
                        enum: ['blocks', 'requires', 'optional'],
                      },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                      },
                    },
                  },
                  meta: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Server timestamp of the response.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description:
            'Invalid request body or circular dependency detected.',
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
          description: 'Task or dependency target not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '409': {
          description: 'Dependency already exists between these tasks.',
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
