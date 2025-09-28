import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRouter from './routes/auth';
import userRequirementsRouter from './routes/userRequirements';
import systemRequirementsRouter from './routes/systemRequirements';
import tracesRouter from './routes/traces';
import testRunsRouter from './routes/testRuns';
import { initializeAuditRoutes } from './routes/audit';
import { initializeTestCaseRoutes } from './routes/testCases';
import { authenticateToken } from './middleware/auth';
import { testConnection, closePool } from './config/database';
import { initializeDatabase } from './config/dbInit';
import logger from './config/logger';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '1mb' })); // Reduced from 10MB to 1MB for security
app.use(cookieParser());


// Health check endpoint (must be before auth middleware)
app.get('/api/health', async (_req: Request, res: Response) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    message: 'Reqquli server is running',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', authRouter);
app.use('/api/user-requirements', authenticateToken, userRequirementsRouter);
app.use('/api/system-requirements', authenticateToken, systemRequirementsRouter);

// Initialize audit routes with database pool
import { pool } from './config/database';
const auditRouter = initializeAuditRoutes(pool);
app.use('/api/audit', auditRouter);

// Initialize test case routes with database pool - MUST be before generic /api routes
const testCaseRouter = initializeTestCaseRoutes(pool);
app.use('/api/test-cases', authenticateToken, testCaseRouter);

// Generic /api routes should be LAST to avoid catching specific routes
app.use('/api', authenticateToken, tracesRouter);
app.use('/api', authenticateToken, testRunsRouter);

app.use(express.static(path.join(__dirname, '../client')));


app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

async function startServer() {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.error('⚠️  Warning: Database connection failed. Server will start but database operations will not work.');
      console.log('💡 To start the database, run: docker-compose up -d');
    } else {
      // Initialize database if needed (only runs if schema doesn't exist)
      await initializeDatabase(pool);
    }
    const server = app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        database: connected ? 'connected' : 'disconnected'
      });
      console.log('### Server is running on port:', PORT)
    });
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        await closePool();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        await closePool();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();