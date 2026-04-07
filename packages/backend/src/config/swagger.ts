/**
 * OpenAPI/Swagger specification for the ShipSmart API.
 */

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ShipSmart API',
    version: '0.1.0',
    description: 'Shipping management platform API for rate shopping, label generation, returns, and order consolidation.',
    contact: {
      name: 'ShipSmart Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001/api',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Firebase ID token',
      },
    },
    schemas: {
      Address: {
        type: 'object',
        required: ['name', 'street1', 'city', 'state', 'zip', 'country'],
        properties: {
          name: { type: 'string' },
          street1: { type: 'string' },
          street2: { type: 'string', nullable: true },
          city: { type: 'string' },
          state: { type: 'string' },
          zip: { type: 'string' },
          country: { type: 'string' },
          phone: { type: 'string', nullable: true },
          email: { type: 'string', nullable: true },
        },
      },
      PackageDetail: {
        type: 'object',
        required: ['weight', 'length', 'width', 'height'],
        properties: {
          weight: { type: 'number', minimum: 0.1 },
          length: { type: 'number', minimum: 0.1 },
          width: { type: 'number', minimum: 0.1 },
          height: { type: 'number', minimum: 0.1 },
          declaredValue: { type: 'number', minimum: 0 },
        },
      },
      CarrierQuote: {
        type: 'object',
        properties: {
          carrier: { type: 'string', enum: ['ups', 'fedex', 'usps', 'shippo', 'ltl'] },
          serviceLevel: { type: 'string' },
          rate: { type: 'number' },
          currency: { type: 'string' },
          estimatedDays: { type: 'integer' },
          dimensionalWeight: { type: 'number' },
          billableWeight: { type: 'number' },
          isCheapest: { type: 'boolean' },
          isFastest: { type: 'boolean' },
          isBestValue: { type: 'boolean' },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          error: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          details: { type: 'object' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/rates/shop': {
      post: {
        summary: 'Shop rates across all carriers',
        tags: ['Rates'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fromAddress', 'toAddress', 'packages'],
                properties: {
                  fromAddress: { $ref: '#/components/schemas/Address' },
                  toAddress: { $ref: '#/components/schemas/Address' },
                  packages: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PackageDetail' },
                  },
                  shipDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Rate comparison response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiResponse',
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/labels/generate': {
      post: {
        summary: 'Generate a shipping label',
        tags: ['Labels'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['carrier', 'serviceLevel', 'fromAddress', 'toAddress', 'packages', 'userId'],
                properties: {
                  carrier: { type: 'string', enum: ['ups', 'fedex', 'usps', 'shippo', 'ltl'] },
                  serviceLevel: { type: 'string' },
                  fromAddress: { $ref: '#/components/schemas/Address' },
                  toAddress: { $ref: '#/components/schemas/Address' },
                  packages: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PackageDetail' },
                  },
                  reference: { type: 'string' },
                  userId: { type: 'string' },
                  orderId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Label generated successfully',
          },
          '400': {
            description: 'Validation error',
          },
        },
      },
    },
    '/labels/void': {
      post: {
        summary: 'Void a shipping label',
        tags: ['Labels'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['trackingNumber', 'carrier', 'userId'],
                properties: {
                  trackingNumber: { type: 'string' },
                  carrier: { type: 'string' },
                  userId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Label voided successfully',
          },
          '400': {
            description: 'Void failed',
          },
        },
      },
    },
    '/returns': {
      post: {
        summary: 'Create a return shipment',
        tags: ['Returns'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['originalOrderId', 'originalShipmentId', 'boxCount', 'boxes', 'carrier', 'fromAddress', 'toAddress'],
                properties: {
                  originalOrderId: { type: 'string' },
                  originalShipmentId: { type: 'string' },
                  boxCount: { type: 'integer', minimum: 1 },
                  boxes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        length: { type: 'number' },
                        width: { type: 'number' },
                        height: { type: 'number' },
                        weight: { type: 'number' },
                      },
                    },
                  },
                  carrier: { type: 'string' },
                  fromAddress: { $ref: '#/components/schemas/Address' },
                  toAddress: { $ref: '#/components/schemas/Address' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Return shipment created',
          },
          '400': {
            description: 'Validation error',
          },
        },
      },
      get: {
        summary: 'List return events',
        tags: ['Returns'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'orderId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of return events',
          },
        },
      },
    },
    '/shipments': {
      get: {
        summary: 'List shipments',
        tags: ['Shipments'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'orderId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of shipments',
          },
        },
      },
      post: {
        summary: 'Create a shipment',
        tags: ['Shipments'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId', 'fromAddress', 'toAddress', 'boxes'],
                properties: {
                  orderId: { type: 'string' },
                  fromAddress: { $ref: '#/components/schemas/Address' },
                  toAddress: { $ref: '#/components/schemas/Address' },
                  boxes: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PackageDetail' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Shipment created',
          },
        },
      },
    },
    '/orders': {
      get: {
        summary: 'List orders',
        tags: ['Orders'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'List of orders',
          },
        },
      },
    },
    '/orders/sync': {
      post: {
        summary: 'Sync orders from Shopify',
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Orders synced',
          },
        },
      },
    },
    '/consolidation/opportunities': {
      get: {
        summary: 'Get consolidation opportunities',
        tags: ['Consolidation'],
        parameters: [
          { name: 'maxDaysApart', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Consolidation analysis',
          },
        },
      },
      post: {
        summary: 'Find consolidation opportunities for orders',
        tags: ['Consolidation'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orders'],
                properties: {
                  orders: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                  maxDaysApart: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Consolidation analysis',
          },
        },
      },
    },
    '/consolidation/apply': {
      post: {
        summary: 'Apply consolidation to selected orders',
        tags: ['Consolidation'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderIds', 'boxes'],
                properties: {
                  orderIds: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  boxes: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PackageDetail' },
                  },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Consolidation applied',
          },
        },
      },
    },
  },
};

export const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts'],
};
