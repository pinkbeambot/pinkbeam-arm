export const notificationPaths = {
  '/notifications/email': {
    post: {
      operationId: 'sendEmailNotification',
      summary: 'Send email notification',
      tags: ['Notifications'],
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'action', in: 'query', schema: { type: 'string', enum: ['task-complete'] } }],
      responses: {
        '200': { description: 'Email sent' },
        '400': { description: 'Invalid request' },
        '404': { description: 'Notification not found' },
      },
    },
  },
  '/notifications/digest': {
    post: {
      operationId: 'sendDigest',
      summary: 'Send digest email',
      tags: ['Notifications'],
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'type', in: 'query', required: true, schema: { type: 'string', enum: ['daily', 'weekly'] } }],
      responses: {
        '200': { description: 'Digest sent' },
        '400': { description: 'Invalid type' },
      },
    },
  },
  '/notifications/unsubscribe': {
    get: {
      operationId: 'unsubscribe',
      summary: 'Unsubscribe from emails',
      tags: ['Notifications'],
      parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Unsubscribed' }, '400': { description: 'Invalid token' } },
    },
  },
};
