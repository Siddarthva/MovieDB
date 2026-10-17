import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseError, classifyDbError } from '../src/errors.js';

const cases = [
  [{ message: 'TypeError: fetch failed', details: 'Error: getaddrinfo ENOTFOUND x.supabase.co' }, 'dns', 503],
  [{ message: 'fetch failed', cause: { code: 'ECONNREFUSED' } }, 'connection', 503],
  [{ message: 'The operation was aborted due to timeout', name: 'TimeoutError' }, 'timeout', 504],
  [{ message: 'unable to verify the first certificate' }, 'tls', 503],
  [{ message: 'TypeError: fetch failed' }, 'connection', 503],
  [{ code: 'PGRST116', message: 'no rows' }, 'not_found', 404],
  [{ code: '23505', message: 'duplicate key value' }, 'conflict', 409],
  [{ code: '23503', message: 'fk violation' }, 'reference', 409],
  [{ code: '42501', message: 'permission denied for table titles' }, 'permission', 500],
  [{ message: 'new row violates row-level security policy' }, 'permission', 500],
  [{ message: 'Invalid API key', status: 401 }, 'auth', 500],
  [{ code: '42703', message: 'column titles.censor_rating does not exist' }, 'schema', 500],
  [{ code: 'PGRST200', message: 'Could not find a relationship' }, 'schema', 500],
  [{ message: 'something odd' }, 'unknown', 500],
];

for (const [input, category, status] of cases) {
  test(`classifies ${category} (${input.code ?? input.message})`, () => {
    const result = classifyDbError(input);
    assert.equal(result.category, category);
    assert.equal(result.status, status);
  });
}

test('network errors are not confused with SQL/schema errors', () => {
  assert.notEqual(classifyDbError({ message: 'fetch failed', details: 'ENOTFOUND' }).category, 'schema');
});

test('DatabaseError never exposes source text in its public message', () => {
  const error = new DatabaseError({ message: 'secret detail: column foo does not exist', code: '42703' });
  assert.ok(!error.message.includes('secret'));
  assert.equal(error.category, 'schema');
  assert.equal(error.source.code, '42703');
});
