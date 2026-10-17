import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { AppError, DatabaseError } from './errors.js';
import { errorFields } from './logger.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

/** Attach a request id (accepting a sane inbound X-Request-Id) and log one line per request. */
export function requestContext(logger) {
  return (req, res, next) => {
    const inbound = req.get('x-request-id');
    req.id = inbound && REQUEST_ID_PATTERN.test(inbound) ? inbound : crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    req.log = logger.child({ requestId: req.id });

    const started = performance.now();
    res.on('finish', () => {
      // Path only: query strings and headers are never logged.
      const path = req.originalUrl.split('?')[0];
      const fields = { method: req.method, path, status: res.statusCode, ms: Math.round(performance.now() - started) };
      if (path === '/api/health/live') return;
      if (res.statusCode >= 500) req.log.error('request', fields);
      else req.log.info('request', fields);
    });
    next();
  };
}

export function createRateLimiters(config) {
  const base = { standardHeaders: 'draft-7', legacyHeaders: false, windowMs: 60_000 };
  const handler = (_req, _res, next) => next(new AppError(429, 'rate_limited', 'Too many requests. Please slow down.'));
  return {
    general: rateLimit({ ...base, limit: config.rateLimitPerMinute, handler, skip: (req) => req.path.startsWith('/health') }),
    write: rateLimit({ ...base, limit: config.writeRateLimitPerMinute, handler }),
  };
}

/**
 * Authentication and authorisation for write endpoints.
 * `verifyToken(token)` resolves to `{ id, email, role }` or null. Anything but role === 'admin' is rejected.
 */
export function requireAdmin(verifyToken) {
  return async (req, _res, next) => {
    try {
      const header = req.get('authorization') ?? '';
      const match = /^Bearer\s+(\S+)$/i.exec(header);
      if (!match) throw new AppError(401, 'unauthorized', 'Authentication required.');

      const user = await verifyToken(match[1]);
      if (!user) throw new AppError(401, 'unauthorized', 'Invalid or expired session.');
      if (user.role !== 'admin') throw new AppError(403, 'forbidden', 'Administrator access required.');

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Verify Supabase access tokens via the Auth server. Results are cached briefly so a burst of
 * admin requests does not hit Auth every time; invalid tokens are never cached as valid.
 * Role comes from `app_metadata.role`, which users cannot edit themselves.
 */
export function createSupabaseTokenVerifier(db, { ttlMs = 30_000, now = () => Date.now() } = {}) {
  const cache = new Map();
  return async (token) => {
    const hit = cache.get(token);
    if (hit && hit.expiresAt > now()) return hit.user;

    const { data, error } = await db.auth.getUser(token);
    if (error || !data?.user) {
      // Distinguish "Auth server unreachable" (our problem) from "bad token" (theirs).
      if (error && (error.status === undefined || error.status >= 500 || /fetch failed|timeout/i.test(error.message ?? ''))) {
        throw new DatabaseError(error);
      }
      return null;
    }

    const user = { id: data.user.id, email: data.user.email ?? null, role: data.user.app_metadata?.role ?? null };
    if (cache.size > 200) cache.clear();
    cache.set(token, { user, expiresAt: now() + ttlMs });
    return user;
  };
}

export function notFoundHandler(_req, _res, next) {
  next(new AppError(404, 'not_found', 'Route not found.'));
}

/** Single place that turns errors into the public error envelope. Internal details stay in the logs. */
export function errorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (error, req, res, _next) => {
    let appError = error;

    if (error?.type === 'entity.parse.failed') appError = new AppError(400, 'invalid_json', 'Request body is not valid JSON.');
    else if (error?.type === 'entity.too.large') appError = new AppError(413, 'payload_too_large', 'Request body is too large.');
    else if (!(error instanceof AppError)) appError = new AppError(500, 'internal_error', 'Internal server error.');

    const log = req.log ?? logger;
    const fields = { ...errorFields(error), status: appError.status, code: appError.code };
    if (error instanceof DatabaseError) Object.assign(fields, { category: error.category, hint: error.hint, source: error.source });

    if (appError.status >= 500) log.error('request failed', fields);
    else log.debug('request rejected', fields);

    if (res.headersSent) return;
    res.setHeader('Cache-Control', 'no-store');
    res.status(appError.status).json({
      error: { code: appError.code, message: appError.message, requestId: req.id, ...(appError.details ? { details: appError.details } : {}) },
      message: appError.message, // kept for 1.x clients that read `message`
    });
  };
}
