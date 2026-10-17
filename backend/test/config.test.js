import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigError, detectKeyKind, loadConfig } from '../src/config.js';

const valid = { SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' };

test('accepts a valid configuration and applies defaults', () => {
  const { config, warnings } = loadConfig(valid);
  assert.equal(config.port, 5000);
  assert.equal(config.supabaseHost, 'abc.supabase.co');
  assert.equal(config.keyKind, 'service_role');
  assert.deepEqual(warnings, []);
  assert.deepEqual(config.corsOrigins, ['http://localhost:5174', 'http://localhost:5175']);
});

test('reports every problem at once without echoing values', () => {
  try {
    loadConfig({ SUPABASE_URL: 'not a url', PORT: 'abc', DB_TIMEOUT_MS: '10' });
    assert.fail('should throw');
  } catch (error) {
    assert.ok(error instanceof ConfigError);
    assert.equal(error.problems.length, 4);
    assert.ok(!error.message.includes('not a url'));
  }
});

test('rejects placeholder values copied from .env.example', () => {
  assert.throws(() => loadConfig({ SUPABASE_URL: 'https://your-project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }), /placeholder/);
});

test('rejects plain http except for localhost', () => {
  assert.throws(() => loadConfig({ ...valid, SUPABASE_URL: 'http://abc.supabase.co' }), /https/);
  assert.doesNotThrow(() => loadConfig({ ...valid, SUPABASE_URL: 'http://localhost:54321' }));
});

test('falls back to legacy VITE_ names with deprecation and anon-key warnings', () => {
  const { config, warnings } = loadConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc' });
  assert.equal(config.keyKind, 'anon');
  assert.equal(warnings.length, 3);
});

test('production has no default CORS origins', () => {
  assert.deepEqual(loadConfig({ ...valid, NODE_ENV: 'production' }).config.corsOrigins, []);
  assert.deepEqual(loadConfig({ ...valid, NODE_ENV: 'production', CORS_ORIGINS: 'https://a.test, https://b.test' }).config.corsOrigins, ['https://a.test', 'https://b.test']);
});

test('detectKeyKind reads the role claim of JWT keys', () => {
  const jwt = (role) => `h.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.s`;
  assert.equal(detectKeyKind(jwt('service_role')), 'service_role');
  assert.equal(detectKeyKind(jwt('anon')), 'anon');
  assert.equal(detectKeyKind('garbage'), 'unknown');
  assert.equal(detectKeyKind(undefined), 'missing');
});
