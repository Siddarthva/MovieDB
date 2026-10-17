import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..');

/**
 * Load .env from the backend directory first (independent of the current working
 * directory), then from the process cwd. dotenv never overrides variables that are
 * already set, so real environment variables always win.
 */
export function loadEnvFiles() {
  dotenv.config({ path: path.join(backendDir, '.env'), quiet: true });
  dotenv.config({ quiet: true });
}

export class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid configuration:\n - ${problems.join('\n - ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

/** Decode the (unverified) payload of a Supabase JWT key to learn its role. Never throws. */
export function detectKeyKind(key) {
  if (!key) return 'missing';
  if (key.startsWith('sb_secret_')) return 'service_role';
  if (key.startsWith('sb_publishable_')) return 'anon';
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (payload.role === 'service_role') return 'service_role';
      if (payload.role === 'anon') return 'anon';
    } catch {
      /* fall through */
    }
  }
  return 'unknown';
}

const toInt = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
};

const toList = (value) => String(value ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

/**
 * Parse and validate configuration. Returns `{ config, warnings }` or throws ConfigError
 * listing every problem. Messages name variables, never values.
 */
export function loadConfig(env = process.env) {
  const problems = [];
  const warnings = [];

  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const port = toInt(env.PORT, 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push('PORT must be an integer between 1 and 65535.');

  // Supabase credentials: new names first, legacy VITE_ names as a deprecated fallback.
  let supabaseUrl = env.SUPABASE_URL;
  let supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl && env.VITE_SUPABASE_URL) {
    supabaseUrl = env.VITE_SUPABASE_URL;
    warnings.push('Using deprecated VITE_SUPABASE_URL. Rename it to SUPABASE_URL.');
  }
  if (!supabaseKey && env.VITE_SUPABASE_ANON_KEY) {
    supabaseKey = env.VITE_SUPABASE_ANON_KEY;
    warnings.push('Using deprecated VITE_SUPABASE_ANON_KEY. Set SUPABASE_SERVICE_ROLE_KEY (server-side only) instead.');
  }

  let parsedUrl = null;
  if (!supabaseUrl) {
    problems.push('SUPABASE_URL is not set (expected https://<project-ref>.supabase.co).');
  } else {
    try {
      parsedUrl = new URL(supabaseUrl);
      const local = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname);
      if (!['https:', 'http:'].includes(parsedUrl.protocol) || (parsedUrl.protocol === 'http:' && !local)) {
        problems.push('SUPABASE_URL must use https (http is only accepted for localhost).');
      }
      if (/your-project|<project|example\.com/i.test(parsedUrl.hostname)) {
        problems.push('SUPABASE_URL still contains the placeholder from .env.example.');
      }
    } catch {
      problems.push('SUPABASE_URL is not a valid URL.');
    }
  }

  const keyKind = detectKeyKind(supabaseKey);
  if (!supabaseKey) {
    problems.push('SUPABASE_SERVICE_ROLE_KEY is not set.');
  } else if (/your-|<.*>/i.test(supabaseKey)) {
    problems.push('SUPABASE_SERVICE_ROLE_KEY still contains the placeholder from .env.example.');
  } else if (keyKind === 'anon') {
    warnings.push('The configured Supabase key is an anon/publishable key. Admin writes only work if Row Level Security is disabled, which is unsafe. Use the service-role key on the server.');
  }

  const corsOrigins = toList(env.CORS_ORIGINS);
  if (env.FRONTEND_URL) {
    corsOrigins.push(...toList(env.FRONTEND_URL));
    warnings.push('FRONTEND_URL is deprecated; use CORS_ORIGINS (comma-separated).');
  }
  if (!corsOrigins.length && !isProduction) corsOrigins.push('http://localhost:5174', 'http://localhost:5175');

  const dbTimeoutMs = toInt(env.DB_TIMEOUT_MS, 8000);
  if (!Number.isInteger(dbTimeoutMs) || dbTimeoutMs < 500) problems.push('DB_TIMEOUT_MS must be an integer >= 500.');

  const rateLimitPerMinute = toInt(env.RATE_LIMIT_PER_MINUTE, 300);
  const writeRateLimitPerMinute = toInt(env.WRITE_RATE_LIMIT_PER_MINUTE, 60);
  if (!Number.isInteger(rateLimitPerMinute) || rateLimitPerMinute < 1) problems.push('RATE_LIMIT_PER_MINUTE must be a positive integer.');
  if (!Number.isInteger(writeRateLimitPerMinute) || writeRateLimitPerMinute < 1) problems.push('WRITE_RATE_LIMIT_PER_MINUTE must be a positive integer.');

  if (problems.length) throw new ConfigError(problems);

  return {
    config: {
      nodeEnv,
      isProduction,
      port,
      supabaseUrl: parsedUrl.toString().replace(/\/$/, ''),
      supabaseHost: parsedUrl.hostname,
      supabaseKey,
      keyKind,
      corsOrigins,
      dbTimeoutMs,
      rateLimitPerMinute,
      writeRateLimitPerMinute,
      trustProxy: env.TRUST_PROXY ? (Number.isNaN(Number(env.TRUST_PROXY)) ? env.TRUST_PROXY : Number(env.TRUST_PROXY)) : false,
      logLevel: env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    },
    warnings,
  };
}
