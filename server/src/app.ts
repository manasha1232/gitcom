import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import 'dotenv/config';

import projectRoutes from './routes/project.routes';
import githubRoutes from './routes/github.routes';
import { getSettings, updateSettings, getDashboardStats } from './controllers/settings.controller';
import { sseService } from './services/sseService';
import { prisma } from './prisma';

const app = express();

// Middleware
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/github', githubRoutes);
app.get('/api/settings', getSettings);
app.put('/api/settings', updateSettings);
app.get('/api/dashboard/stats', getDashboardStats);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// SSE endpoint for real-time logs & events
app.get('/events', (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  const clientId = randomUUID();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  sseService.addClient(clientId, res, projectId);

  // Keep-alive ping every 25s
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseService.removeClient(clientId);
  });
});

import path from 'path';

// Serve static frontend files in production mode
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/events') {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

export default app;
