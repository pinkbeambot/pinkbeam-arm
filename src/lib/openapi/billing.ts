/**
 * OpenAPI 3.0 path definitions for Billing endpoints.
 *
 * Exports `billingPaths` object that can be merged
 * into the top-level `paths` section of an OpenAPI spec.
 */

export const billingPaths = {
  '/billing': {
    get: {
      operationId: 'getBillingInfo',
      summary: 'Get billing information',
      description:
        'Retrieve comprehensive billing information including subscription status, usage metrics, available plans, and recent invoices for the current tenant.',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Billing information retrieved successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      billing: {
                        $ref: '#/components/schemas/BillingInfo',
                      },
                      usage: {
                        $ref: '#/components/schemas/UsageWithLimits',
                      },
                      plans: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/SubscriptionTier',
                        },
                      },
                      invoices: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Invoice',
                        },
                      },
                    },
                  },
                },
                required: ['data'],
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
          description: 'Billing information not found.',
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
  '/billing/invoices': {
    get: {
      operationId: 'listInvoices',
      summary: 'List invoices',
      description:
        'Retrieve a paginated list of invoices for the current tenant. Supports filtering by status.',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Maximum number of invoices to return.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          description: 'Filter invoices by status.',
          schema: {
            type: 'string',
            enum: ['draft', 'open', 'paid', 'uncollectible', 'void'],
          },
        },
      ],
      responses: {
        '200': {
          description: 'Invoices retrieved successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      invoices: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Invoice',
                        },
                      },
                      count: {
                        type: 'integer',
                      },
                    },
                  },
                },
                required: ['data'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error.',
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
  '/billing/subscription': {
    get: {
      operationId: 'getSubscription',
      summary: 'Get subscription details',
      description:
        'Retrieve subscription details and usage metrics for the current tenant.',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Subscription details retrieved successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      subscription: {
                        type: 'object',
                        properties: {
                          status: {
                            type: 'string',
                            enum: ['trialing', 'active', 'canceled', 'past_due', 'unpaid'],
                          },
                          tier: {
                            type: 'string',
                          },
                          stripeCustomerId: {
                            type: 'string',
                            nullable: true,
                          },
                          stripeSubscriptionId: {
                            type: 'string',
                            nullable: true,
                          },
                          trialEndsAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                          },
                          currentPeriodStartsAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                          },
                          currentPeriodEndsAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                          },
                          cancelAtPeriodEnd: {
                            type: 'boolean',
                          },
                        },
                      },
                      usage: {
                        $ref: '#/components/schemas/UsageWithLimits',
                      },
                    },
                  },
                },
                required: ['data'],
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
          description: 'Subscription not found.',
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
    post: {
      operationId: 'createSubscription',
      summary: 'Create subscription',
      description:
        'Create a new Stripe subscription for the current tenant. Returns a checkout session URL to complete payment.',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                tier: {
                  type: 'string',
                  description: 'Subscription tier to upgrade to.',
                },
                successUrl: {
                  type: 'string',
                  format: 'uri',
                  description: 'URL to redirect after successful payment.',
                },
                cancelUrl: {
                  type: 'string',
                  format: 'uri',
                  description: 'URL to redirect if payment is canceled.',
                },
              },
              required: ['tier'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Checkout session created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      sessionId: {
                        type: 'string',
                      },
                      url: {
                        type: 'string',
                        format: 'uri',
                      },
                    },
                  },
                },
                required: ['data'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error or invalid tier.',
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
        '409': {
          description: 'Already subscribed.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '503': {
          description: 'Stripe is not configured.',
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
    patch: {
      operationId: 'updateSubscription',
      summary: 'Update subscription',
      description:
        'Update the current subscription to a different tier. Handles proration.',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                tier: {
                  type: 'string',
                  description: 'New subscription tier.',
                },
              },
              required: ['tier'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Subscription updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      subscription: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                          },
                          status: {
                            type: 'string',
                          },
                          tier: {
                            type: 'string',
                          },
                        },
                      },
                    },
                  },
                },
                required: ['data'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error or invalid tier.',
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
          description: 'No active subscription found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '503': {
          description: 'Stripe is not configured.',
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
    delete: {
      operationId: 'cancelSubscription',
      summary: 'Cancel subscription',
      description:
        'Cancel the current subscription at the end of the billing period.',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Subscription canceled successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      subscription: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                          },
                          status: {
                            type: 'string',
                          },
                          cancelAtPeriodEnd: {
                            type: 'boolean',
                          },
                          currentPeriodEnd: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                          },
                        },
                      },
                    },
                  },
                },
                required: ['data'],
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
          description: 'No active subscription found.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '503': {
          description: 'Stripe is not configured.',
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
  '/billing/checkout': {
    post: {
      operationId: 'createCheckoutSession',
      summary: 'Create checkout session',
      description:
        'Create a Stripe checkout session for upgrading to a paid plan.',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                tier: {
                  type: 'string',
                },
                successUrl: {
                  type: 'string',
                  format: 'uri',
                },
                cancelUrl: {
                  type: 'string',
                  format: 'uri',
                },
              },
              required: ['tier'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Checkout session created.',
        },
        '401': {
          description: 'Authentication required.',
        },
        '500': {
          description: 'Internal server error.',
        },
      },
    },
  },
  '/billing/portal': {
    post: {
      operationId: 'createPortalSession',
      summary: 'Create customer portal session',
      description:
        'Create a Stripe customer portal session for managing payment methods and viewing invoices.',
      tags: ['Billing'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Portal session created.',
        },
        '401': {
          description: 'Authentication required.',
        },
        '500': {
          description: 'Internal server error.',
        },
      },
    },
  },
};
