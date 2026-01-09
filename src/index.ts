import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { initializeWebSocket } from './lib/websocket';

// Route imports
import authRouter from './routes/auth';
import callsRouter from './routes/calls';
import residentsRouter from './routes/residents';
import facilitiesRouter from './routes/facilities';
import webhooksRouter from './routes/webhooks';
import inboundRouter from './routes/inbound';
import segmentsRouter from './routes/segments';
import lifebooksRouter from './routes/lifebooks';
import lifebookRouter from './routes/lifebook';
import readinessRouter from './routes/readiness';
import booksRouter from './routes/books';
import viewerRouter from './routes/viewer';
import familyMembersRouter from './routes/family-members';
import familyCheckInsRouter from './routes/family-checkins';
import staffDashboardRouter from './routes/staff-dashboard';
import schedulingRouter from './routes/scheduling';
import exportsRouter from './routes/exports';
import patternsRouter from './routes/patterns';
import eventsRouter from './routes/events';
import callbacksRouter from './routes/callbacks';

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket
initializeWebSocket(httpServer);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || (env.NODE_ENV === 'development' ? '*' : false),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for lifebook demo)
app.use(express.static('public'));

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis connection
    await redis.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/calls', callsRouter);
app.use('/api/residents', lifebookRouter); // Lifebook routes (includes /:residentId/lifebook)
app.use('/api/residents', residentsRouter);
app.use('/api/facilities', facilitiesRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/inbound', inboundRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/lifebooks', lifebooksRouter);
app.use('/api/readiness', readinessRouter);
app.use('/api/books', booksRouter);
app.use('/api/family-members', familyMembersRouter);
app.use('/api/family-checkins', familyCheckInsRouter);
app.use('/api/staff', staffDashboardRouter);
app.use('/api/scheduling', schedulingRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/patterns', patternsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/callbacks', callbacksRouter);
app.use('/viewer', viewerRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = parseInt(env.PORT, 10);

console.log(`🔍 Attempting to bind to port ${PORT} on 0.0.0.0`);
console.log(`🔍 Raw PORT env var: ${process.env.PORT}`);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Linda Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🔌 WebSocket server ready`);
}).on('error', (err) => {
  console.error(`❌ Failed to start server:`, err);
  process.exit(1);
});
