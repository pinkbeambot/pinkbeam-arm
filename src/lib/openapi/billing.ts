export const billingPaths = {
  '/billing': {
    get: {
      operationId: 'getBillingInfo',
      summary: 'Get billing information',
      description: 'Retrieve billing info, usage metrics, plans, and invoices',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': { description: 'Billing info retrieved' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Billing not found' },
      },
    },
  },
  '/billing/invoices': {
    get: {
      operationId: 'listInvoices',
      summary: 'List invoices',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'open', 'paid', 'uncollectible', 'void'] } },
      ],
      responses: {
        '200': { description: 'Invoices retrieved' },
        '401': { description: 'Unauthorized' },
      },
    },
  },
  '/billing/subscription': {
    get: {
      operationId: 'getSubscription',
      summary: 'Get subscription',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': { description: 'Subscription details' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Not found' },
      },
    },
    post: {
      operationId: 'createSubscription',
      summary: 'Create subscription',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', properties: { tier: { type: 'string' } }, required: ['tier'] } } },
      },
      responses: {
        '200': { description: 'Checkout session created' },
        '400': { description: 'Validation error' },
        '409': { description: 'Already subscribed' },
      },
    },
    patch: {
      operationId: 'updateSubscription',
      summary: 'Update subscription',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', properties: { tier: { type: 'string' } }, required: ['tier'] } } },
      },
      responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
    },
    delete: {
      operationId: 'cancelSubscription',
      summary: 'Cancel subscription',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      responses: { '200': { description: 'Canceled' }, '404': { description: 'Not found' } },
    },
  },
};
