import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { env } from './config/env';
import { logger } from './lib/logger';
import { globalRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';

// Routes
import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { hospitalRouter } from './routes/hospital.routes';
import { junctionRouter } from './routes/junction.routes';
import { ambulanceRouter } from './routes/ambulance.routes';
import { routeRouter } from './routes/route.routes';
import { missionRouter } from './routes/mission.routes';
import { severityRouter } from './routes/severity.routes';
import { priorityRouter } from './routes/priority.routes';
import { cvRouter } from './routes/cv.routes';
import { signalRouter } from './routes/signal.routes';
import { simulationRouter } from './routes/simulation.routes';
import { reportRouter } from './routes/report.routes';
import { configRouter } from './routes/config.routes';
import { alertRouter } from './routes/alert.routes';
import { auditRouter } from './routes/audit.routes';

export function createApp(): Express {
  const app = express();

  // Request ID and security headers
  app.use((req, res, next) => {
    req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  app.use(helmet());
  app.use(
    cors({
      origin: [env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    })
  );

  // Pino HTTP request logger
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as any).requestId ?? (req.headers['x-request-id'] as string) ?? uuidv4(),
      autoLogging: {
        ignore: (req) => req.url === '/api/v1/health',
      },
    })
  );

  // Body parsers: up to 6MB for CV uploads, 1MB default
  app.use(express.json({ limit: '6mb' }));
  app.use(express.urlencoded({ extended: true, limit: '6mb' }));

  // Global rate limiter
  app.use(globalRateLimiter);

  // Mount API V1 routes
  const apiV1 = express.Router();
  apiV1.use(healthRouter);
  apiV1.use(authRouter);
  apiV1.use(hospitalRouter);
  apiV1.use(junctionRouter);
  apiV1.use(ambulanceRouter);
  apiV1.use(routeRouter);
  apiV1.use(missionRouter);
  apiV1.use(severityRouter);
  apiV1.use(priorityRouter);
  apiV1.use(cvRouter);
  apiV1.use(signalRouter);
  apiV1.use(simulationRouter);
  apiV1.use(reportRouter);
  apiV1.use(configRouter);
  apiV1.use(alertRouter);
  apiV1.use(auditRouter);

  app.use('/api/v1', apiV1);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
