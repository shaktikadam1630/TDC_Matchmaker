import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { AppError } from './utils/AppError.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // behind ALB / nginx: needed for correct client IPs in rate limiting
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // No Origin header = same-origin / curl / health checks.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new AppError(403, 'Origin not allowed', 'CORS'));
      },
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '50kb' }));
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use(
    '/api',
    rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }),
    routes,
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
