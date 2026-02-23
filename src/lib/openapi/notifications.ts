/**
 * OpenAPI 3.0 path definitions for Notifications endpoints.
 *
 * Exports `notificationPaths` object that can be merged
 * into the top-level `paths` section of an OpenAPI spec.
 */

export const notificationPaths = {
  '/notifications/email': {
    post: {
      operationId: 'sendEmailNotification',
      summary: 'Send email notification',
      description:
        'Trigger email notification for a specific notification or for task completion events. Checks user preferences before sending.',
      tags: ['Notifications'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'action',
          in: 'query',
          required: false,
          description: 'Action type. Use "task-complete" for task completion emails.',
          schema: {
            type: 'string',
            enum: ['task-complete'],
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    notification_id: {
                      type: 'string',
                      format: 'uuid',
                      description: 'ID of the notification to send via email.',
                    },
                  },
                  required: ['notification_id'],
                },
                {
                  type: 'object',
                  properties: {
                    task_id: {
                      type: 'string',
                      format: 'uuid',
                    },
                    task_title: {
                      type: 'string',
                      minLength: 1,
                    },
                    agent_name: {
                      type: 'string',
                      minLength: 1,
                    },
                    completed_at: {
                      type: 'string',
                    },
                    duration: {
                      type: 'string',
                    },
                  },
                  required: ['task_id', 'task_title', 'agent_name', 'completed_at'],
                },
              ],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Email notification processed.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                  },
                  sent: {
                    type: 'integer',
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                  error: {
                    type: 'string',
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
          description: 'Notification not found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error.',
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
  '/notifications/digest': {
    post: {
      operationId: 'sendDigest',
      summary: 'Send digest email',
      description:
        'Trigger daily or weekly digest emails for the tenant. Typically called by a scheduled job (cron).',
      tags: ['Notifications'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'type',
          in: 'query',
          required: true,
          description: 'Type of digest to send.',
          schema: {
            type: 'string',
            enum: ['daily', 'weekly'],
          },
        },
      ],
      responses: {
        '200': {
          description: 'Digest emails sent successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                  },
                  type: {
                    type: 'string',
                    enum: ['daily', 'weekly'],
                  },
                  sent: {
                    type: 'integer',
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                },
                required: ['success', 'type', 'sent'],
              },
            },
          },
        },
        '400': {
          description: 'Invalid digest type.',
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
        '500': {
          description: 'Internal server error.',
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
  '/notifications/unsubscribe': {
    get: {
      operationId: 'unsubscribe',
      summary: 'Unsubscribe from emails',
      description:
        'Unsubscribe from notification emails using a token. Token is provided in email footer.',
      tags: ['Notifications'],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: true,
          description: 'Unsubscribe token encoded with tenant and user information.',
          schema: {
            type: 'string',
          },
        },
      ],
      responses: {
        '200': {
          description: 'Successfully unsubscribed.',
          content: {
            'text/html': {
              schema: {
                type: 'string',
              },
            },
          },
        },
        '400': {
          description: 'Invalid or missing token.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error.',
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
};
