import { createApp } from '../src/app.js';
import { createLogger } from '../src/logger.js';
import { loadConfig } from '../src/config.js';
import { SEED, createFakeDb, createFakeRepo } from '../dev/fakeRepo.js';

export { SEED, createFakeDb, createFakeRepo };

export const ADMIN = { id: 'u-admin', email: 'admin@example.test', role: 'admin' };
export const VIEWER = { id: 'u-viewer', email: 'viewer@example.test', role: null };

export function testConfig(overrides = {}) {
  return loadConfig({
    SUPABASE_URL: 'https://testproject.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test_key_not_real',
    NODE_ENV: 'test',
    CORS_ORIGINS: 'http://localhost:5174',
    LOG_LEVEL: 'error',
    ...overrides,
  }).config;
}

export const tokens = { 'admin-token': ADMIN, 'viewer-token': VIEWER };
export const verifyToken = async (token) => tokens[token] ?? null;

export async function startTestServer({ repo = createFakeRepo(), db = createFakeDb(), config = testConfig(), now } = {}) {
  const app = createApp({ config, logger: createLogger({ level: 'error', stream: () => {} }), db, repo, verifyToken, now });
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, { body, token, headers = {}, raw } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
    return { status: res.status, headers: res.headers, json, text };
  };
  return { repo, call, base, close: () => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }) };
}
