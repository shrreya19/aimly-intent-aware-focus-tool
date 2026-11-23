import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';
import { testSupabaseConnection, isUsingLiveDb } from './config/supabase.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRouter from './routes/auth.js';
import sessionsRouter from './routes/sessions.js';
import relevanceRouter from './routes/relevance.js';
import settingsRouter from './routes/settings.js';
import analyticsRouter from './routes/analytics.js';
import rewardsRouter from './routes/rewards.js';
import demoRouter from './routes/demo.js';
import { seedDemoData } from './seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI and local scripts
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration for React Vite frontend and Chrome Extensions
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or extension background scripts)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('chrome-extension://') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      // In development / demo, allow local connections
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Date', 'X-Client-Timezone'],
  })
);

app.use(express.json());

// Documentation endpoint
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: isUsingLiveDb() ? 'supabase-postgres' : 'demo-in-memory',
    demo_mode: process.env.DEMO_MODE === 'true',
  });
});

// Mount Core Routers
app.use('/auth', authRouter);
app.use('/sessions', sessionsRouter);
app.use('/settings', settingsRouter);
app.use('/rewards', rewardsRouter);
app.use('/demo', demoRouter);
app.use('/', relevanceRouter);
app.use('/', analyticsRouter);

// Global Error Handler
app.use(errorHandler);

// Server Startup (only auto-listen when executed directly as entrypoint)
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('src\\index.js'));
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`\n🚀 Aimly Backend Server listening on port ${PORT}`);
    console.log(`📖 Swagger API Docs available at: http://localhost:${PORT}/docs`);
    console.log(`🩺 Health check available at: http://localhost:${PORT}/health`);
    await testSupabaseConnection();
    if (process.env.DEMO_MODE === 'true' || !isUsingLiveDb()) {
      await seedDemoData().catch(e => console.warn('Demo seeding deferred:', e.message));
    }
  });
}

export default app;
