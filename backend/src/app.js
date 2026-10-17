import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createCache } from './cache.js';
import { createRepository } from './db/repository.js';
import { createRateLimiters, errorHandler, notFoundHandler, requestContext, requireAdmin } from './middleware.js';
import { adminRoutes, healthRoutes, publicRoutes } from './routes.js';
import { createCatalogService } from './services/catalog.js';

/**
 * Build the Express app from injected dependencies so tests can supply fakes.
 * @param {object} deps
 * @param {object} deps.config   validated config
 * @param {object} deps.logger
 * @param {object} deps.db       Supabase client (used for health checks only)
 * @param {object} [deps.repo]   repository (defaults to the Supabase-backed one)
 * @param {Function} deps.verifyToken  (token) => Promise<{id,email,role}|null>
 */
export function createApp({ config, logger, db, repo = createRepository(db), verifyToken, cache = createCache(), now }) {
  const app = express();
  const limiters = createRateLimiters(config);
  const catalog = createCatalogService({ repo, cache, now });

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(requestContext(logger));
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
    maxAge: 600,
  }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRoutes({ db, config }));
  app.use('/api', limiters.general);

  // Public, read-only.
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    next();
  });
  app.use('/api', publicRoutes({ catalog }));

  // Anything that mutates, plus /auth/me, requires an authenticated admin. Deny by default:
  // new write routes added to adminRoutes are protected automatically.
  const adminRouter = express.Router();
  adminRouter.use(limiters.write, requireAdmin(verifyToken), (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  }, adminRoutes({ repo, cache }));
  const isAdminRequest = (req) => !['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/auth/me';
  app.use('/api', (req, res, next) => (isAdminRequest(req) ? adminRouter(req, res, next) : next()));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
