export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Aimly Focus Engine API',
    version: '1.0.0',
    description:
      'Backend API for Aimly: Forest-style focus app driven by ML-powered real-time intent verification.',
    contact: {
      name: 'Aimly HCI Course Project',
    },
  },
  servers: [
    {
      url: 'http://localhost:8000',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          goal: { type: 'string' },
          duration_minutes: { type: 'integer', minimum: 5, maximum: 180 },
          mode: { type: 'string', enum: ['soft', 'strict'] },
          started_at: { type: 'string', format: 'date-time' },
          ended_at: { type: 'string', format: 'date-time', nullable: true },
          paused_at: { type: 'string', format: 'date-time', nullable: true },
          total_paused_seconds: { type: 'integer' },
          status: { type: 'string', enum: ['active', 'paused', 'completed', 'discarded'] },
        },
      },
      UserSettings: {
        type: 'object',
        properties: {
          default_mode: { type: 'string', enum: ['soft', 'strict'] },
          default_duration: { type: 'integer' },
          sensitivity: { type: 'string', enum: ['low', 'medium', 'high'] },
          tracking_enabled: { type: 'boolean' },
          allowed_domains: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Server Health Check',
        responses: {
          200: {
            description: 'API is running',
          },
        },
      },
    },
    '/auth/signup': {
      post: {
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alex Morgan' },
                  email: { type: 'string', example: 'alex@example.com' },
                  password: { type: 'string', example: 'strongpass123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created successfully with JWT token' },
          400: { description: 'Validation error' },
          409: { description: 'Email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'demo@aimly.app' },
                  password: { type: 'string', example: 'demo1234' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get profile of authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Profile retrieved' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/sessions': {
      post: {
        summary: 'Start a new focus session',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['goal'],
                properties: {
                  goal: { type: 'string', example: 'Study Graph Algorithms for DSA' },
                  duration_minutes: { type: 'integer', example: 25 },
                  mode: { type: 'string', enum: ['soft', 'strict'], example: 'strict' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Session started' },
          409: { description: 'Active session already exists' },
        },
      },
      get: {
        summary: 'Get session history with pagination',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'mode', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of sessions' },
        },
      },
    },
    '/sessions/active': {
      get: {
        summary: 'Get current active or paused session',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Active session or null' },
        },
      },
    },
    '/sessions/last-goal': {
      get: {
        summary: 'Retrieve most recent session goal for quick restart',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Last session goal' },
        },
      },
    },
    '/sessions/{id}/pause': {
      post: {
        summary: 'Pause an ongoing session',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Session paused' },
        },
      },
    },
    '/sessions/{id}/resume': {
      post: {
        summary: 'Resume a paused session',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Session resumed' },
        },
      },
    },
    '/sessions/{id}/end': {
      post: {
        summary: 'End an active/paused session',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['completed', 'discarded'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Session ended' },
        },
      },
    },
    '/check-relevance': {
      post: {
        summary: 'Check if a visited web page is relevant to the active session goal',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['session_id', 'url'],
                properties: {
                  session_id: { type: 'string', format: 'uuid' },
                  url: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Relevance analysis result' },
        },
      },
    },
    '/feedback': {
      post: {
        summary: 'Submit relevance feedback for a page visit',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['domain', 'label'],
                properties: {
                  page_visit_id: { type: 'string', format: 'uuid' },
                  domain: { type: 'string' },
                  label: { type: 'string', enum: ['relevant', 'irrelevant'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Feedback stored' },
        },
      },
    },
    '/stats/weekly': {
      get: {
        summary: 'Get 7-day focus stats and minute split',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Weekly statistics' },
        },
      },
    },
    '/insights': {
      get: {
        summary: 'Get focus insights, top distractors, streak and trends',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Insights metrics' },
        },
      },
    },
    '/streak': {
      get: {
        summary: 'Get streak info and 12-week daily focus heatmap data',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Streak and heatmap' },
        },
      },
    },
    '/sessions/{id}/report': {
      get: {
        summary: 'Get detailed report and timeline for a finished session',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Detailed session report' },
        },
      },
    },
    '/settings': {
      get: {
        summary: 'Get user settings',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'User settings' } },
      },
      put: {
        summary: 'Update user settings',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserSettings' },
            },
          },
        },
        responses: { 200: { description: 'Settings updated' } },
      },
    },
    '/me/export': {
      get: {
        summary: 'Export complete JSON of user data (privacy compliance)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Full user data archive' } },
      },
    },
    '/me/data': {
      delete: {
        summary: 'Wipe all user sessions, visits and feedback',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Data successfully wiped' } },
      },
    },
    '/demo/reset': {
      post: {
        summary: 'Reset demo account with 3 weeks of mock data (dev only)',
        responses: { 200: { description: 'Demo data reset' } },
      },
    },
    '/rewards/summary': {
      get: {
        summary: 'Get focus rewards summary, levels, daily cap, streak, freezes, and streak_at_risk',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Rewards summary' } },
      },
    },
    '/rewards/history': {
      get: {
        summary: 'Get recent rewards and streak protection event history',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Rewards event history' } },
      },
    },
    '/rewards/buy-freeze': {
      post: {
        summary: 'Purchase a single-use streak freeze for 250 points (max 2 held)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Streak freeze purchased' },
          400: { description: 'Insufficient balance or already at max freezes' },
        },
      },
    },
    '/rewards/redeem-break': {
      post: {
        summary: 'Redeem 100 points for a guilt-free 5-minute break during an active session',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['session_id'],
                properties: {
                  session_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Break activated with break_ends_at and updated points_balance' },
          400: { description: 'Insufficient points, inactive session, active break, or max breaks reached' },
        },
      },
    },
  },
};
