import test, { after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseError } from '../src/errors.js';
import { createFakeDb, createFakeRepo, startTestServer, testConfig } from './helpers.js';

describe('health', () => {
  let ok;
  let down;
  before(async () => {
    ok = await startTestServer();
    down = await startTestServer({ db: createFakeDb({ error: { message: 'TypeError: fetch failed', details: 'getaddrinfo ENOTFOUND x.supabase.co' } }) });
  });
  after(async () => { await ok.close(); await down.close(); });

  test('liveness is 200 even when the database is down', async () => {
    assert.equal((await down.call('GET', '/api/health/live')).status, 200);
  });

  test('readiness and detail report a healthy database', async () => {
    const ready = await ok.call('GET', '/api/health/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.json.status, 'ready');
    const detail = await ok.call('GET', '/api/health');
    assert.equal(detail.status, 200);
    assert.equal(detail.json.ok, true);
    assert.equal(detail.json.checks.database.status, 'up');
  });

  test('readiness fails with 503 and an actionable category when the database is unreachable', async () => {
    const ready = await down.call('GET', '/api/health/ready');
    assert.equal(ready.status, 503);
    assert.equal(ready.json.status, 'not_ready');
    const detail = await down.call('GET', '/api/health');
    assert.equal(detail.status, 503);
    assert.equal(detail.json.ok, false);
    assert.equal(detail.json.checks.database.category, 'dns');
    assert.match(detail.json.checks.database.hint, /hostname/);
  });

  test('health output never contains the API key', async () => {
    const { text } = await ok.call('GET', '/api/health');
    assert.ok(!text.includes('sb_secret'));
  });
});

describe('public catalog', () => {
  let s;
  before(async () => { s = await startTestServer({ now: () => new Date('2026-01-01T00:00:00Z') }); });
  after(() => s.close());

  test('GET /api/home returns labelled rows', async () => {
    const res = await s.call('GET', '/api/home');
    assert.equal(res.status, 200);
    assert.equal(res.json[0].id, 'latest_releases');
    assert.ok(res.json[0].method);
    assert.equal(res.json[0].titles[0].id, 'tenet_2020');
  });

  test('GET /api/titles keeps the array contract and exposes the total in a header', async () => {
    const res = await s.call('GET', '/api/titles');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.equal(res.headers.get('x-total-count'), '3');
    assert.deepEqual(res.json[0].classification.genres, ['scifi']);
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.ok(res.headers.get('x-request-id'));
  });

  test('titles support search, filters and pagination', async () => {
    const byQ = await s.call('GET', '/api/titles?q=prestige');
    assert.deepEqual(byQ.json.map((t) => t.id), ['prestige_2006']);
    const byGenre = await s.call('GET', '/api/titles?genre=thriller');
    assert.equal(byGenre.json.length, 2);
    const page = await s.call('GET', '/api/titles?limit=1&offset=1');
    assert.equal(page.json.length, 1);
    assert.equal(page.headers.get('x-total-count'), '3');
    assert.equal((await s.call('GET', '/api/titles?q=nothing-matches')).json.length, 0);
  });

  test('invalid query parameters produce a 400 with field details', async () => {
    for (const bad of ['?limit=0', '?limit=abc', '?type=podcast', '?sort=random', '?offset=-1', '?year=1']) {
      const res = await s.call('GET', `/api/titles${bad}`);
      assert.equal(res.status, 400, bad);
      assert.equal(res.json.error.code, 'validation_failed');
      assert.ok(res.json.error.details.length);
    }
  });

  test('title detail includes credits grouped into cast and crew; legacy alias works', async () => {
    const res = await s.call('GET', '/api/titles/prestige_2006');
    assert.equal(res.status, 200);
    assert.equal(res.json.people.directorId, 'nolan');
    assert.deepEqual(res.json.people.castIds, ['bale']);
    assert.equal(res.json.creditGroups.Cast[0].name, 'Christian Bale');
    assert.equal(res.json.classification.genreNames[0], 'Drama');
    assert.equal((await s.call('GET', '/api/title/prestige_2006')).status, 200);
  });

  test('missing title/person are 404, not 500', async () => {
    assert.equal((await s.call('GET', '/api/titles/nope')).status, 404);
    assert.equal((await s.call('GET', '/api/people/nope')).status, 404);
    assert.equal((await s.call('GET', '/api/people/nope/credits')).status, 404);
    assert.equal((await s.call('GET', '/api/titles/nope/related')).status, 404);
    assert.equal((await s.call('GET', '/api/does-not-exist')).status, 404);
  });

  test('ids with unsafe characters are rejected', async () => {
    assert.equal((await s.call('GET', '/api/titles/a%20b')).status, 400);
    assert.equal((await s.call('GET', '/api/titles/..%2Fetc')).status, 400);
  });

  test('people, genres, credits and filmography', async () => {
    assert.equal((await s.call('GET', '/api/genres')).json.length, 3);
    const people = await s.call('GET', '/api/people');
    assert.equal(people.json.length, 2);
    assert.equal(people.json[1].imageUrl, 'https://img.test/bale.jpg');
    const credits = await s.call('GET', '/api/people/nolan/credits');
    assert.deepEqual(credits.json.map((c) => c.titleId), ['dark_knight_2008', 'prestige_2006']);
    assert.equal(credits.json[0].role, 'Director');
    assert.equal((await s.call('GET', '/api/titles/prestige_2006/credits')).json.length, 2);
    assert.equal((await s.call('GET', '/api/titles/prestige_2006/genres')).json.length, 2);
  });

  test('search requires 2+ characters and returns titles and people', async () => {
    assert.equal((await s.call('GET', '/api/search?q=a')).status, 400);
    const res = await s.call('GET', '/api/search?q=christian');
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.people.map((p) => p.id), ['bale']);
    assert.deepEqual((await s.call('GET', '/api/search?q=dark')).json.titles.map((t) => t.id), ['dark_knight_2008']);
  });

  test('related titles are ranked with data-backed reasons', async () => {
    const res = await s.call('GET', '/api/titles/prestige_2006/related');
    assert.equal(res.status, 200);
    assert.equal(res.json[0].id, 'dark_knight_2008');
    const kinds = res.json[0].reasons.map((r) => r.type);
    assert.ok(kinds.includes('genre') && kinds.includes('director') && kinds.includes('cast'));
    assert.ok(res.json.every((r) => r.id !== 'prestige_2006'));
    assert.ok(!res.json.some((r) => r.id === 'tenet_2020'), 'no shared genre/people, so excluded');
  });

  test('read responses carry cache headers; errors do not', async () => {
    assert.match((await s.call('GET', '/api/genres')).headers.get('cache-control'), /max-age=30/);
    assert.equal((await s.call('GET', '/api/titles/nope')).headers.get('cache-control'), 'no-store');
  });

  test('security headers are present', async () => {
    const res = await s.call('GET', '/api/genres');
    assert.ok(res.headers.get('x-content-type-options'));
    assert.ok(res.headers.get('content-security-policy'));
  });

  test('CORS allows only configured origins', async () => {
    const allowed = await s.call('GET', '/api/genres', { headers: { origin: 'http://localhost:5174' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5174');
    const denied = await s.call('GET', '/api/genres', { headers: { origin: 'https://evil.test' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  });
});

describe('database failure handling', () => {
  test('database outage -> 503 envelope without internals; stays consistent for every read route', async () => {
    const repo = createFakeRepo();
    repo.fail = new DatabaseError({ message: 'TypeError: fetch failed', details: 'getaddrinfo ENOTFOUND secret-host.supabase.co' });
    const s = await startTestServer({ repo });
    try {
      for (const path of ['/api/home', '/api/titles', '/api/genres', '/api/titles/prestige_2006']) {
        const res = await s.call('GET', path);
        assert.equal(res.status, 503, path);
        assert.equal(res.json.error.code, 'database_unavailable');
        assert.ok(res.json.error.requestId);
        assert.ok(!res.text.includes('secret-host'));
        assert.ok(!res.text.includes('ENOTFOUND'));
      }
    } finally { await s.close(); }
  });

  test('unexpected exceptions become a generic 500 without leaking the message', async () => {
    const repo = createFakeRepo();
    repo.fail = new Error('boom: internal detail /srv/app/secret.js');
    const s = await startTestServer({ repo });
    try {
      const res = await s.call('GET', '/api/genres');
      assert.equal(res.status, 500);
      assert.equal(res.json.error.code, 'internal_error');
      assert.ok(!res.text.includes('boom'));
      assert.ok(!res.text.includes('secret.js'));
    } finally { await s.close(); }
  });
});

describe('admin authorization', () => {
  let s;
  before(async () => { s = await startTestServer(); });
  after(() => s.close());

  const writes = [
    ['POST', '/api/titles', { id: 'new_1', title: 'New', type: 'movie' }],
    ['PATCH', '/api/titles/tenet_2020', { title: 'x' }],
    ['DELETE', '/api/titles/tenet_2020'],
    ['POST', '/api/titles/tenet_2020/genres', { genre_id: 'drama' }],
    ['DELETE', '/api/titles/tenet_2020/genres/scifi'],
    ['POST', '/api/titles/tenet_2020/credits', { person_id: 'nolan', role: 'director' }],
    ['DELETE', '/api/titles/prestige_2006/credits/nolan'],
    ['DELETE', '/api/titles/prestige_2006/credits', { personId: 'nolan', role: 'director' }],
    ['POST', '/api/people', { id: 'p1', name: 'P' }],
    ['PUT', '/api/people/nolan', { name: 'x' }],
    ['PATCH', '/api/people/nolan', { name: 'x' }],
    ['DELETE', '/api/people/nolan'],
    ['POST', '/api/genres', { id: 'g1', name: 'G' }],
    ['PATCH', '/api/genres/drama', { name: 'x' }],
    ['DELETE', '/api/genres/drama'],
    ['GET', '/api/auth/me'],
  ];

  test('every write endpoint rejects anonymous requests with 401 and changes nothing', async () => {
    for (const [method, path, body] of writes) {
      const res = await s.call(method, path, { body });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
    assert.equal(s.repo.state.titles.length, 3);
    assert.equal(s.repo.state.people.length, 2);
  });

  test('invalid tokens are 401; authenticated non-admins are 403 on every write', async () => {
    for (const [method, path, body] of writes) {
      assert.equal((await s.call(method, path, { body, token: 'garbage' })).status, 401, `bad token ${method} ${path}`);
      assert.equal((await s.call(method, path, { body, token: 'viewer-token' })).status, 403, `viewer ${method} ${path}`);
    }
    assert.equal(s.repo.state.titles.length, 3);
  });

  test('malformed Authorization headers are rejected', async () => {
    for (const header of ['admin-token', 'Basic admin-token', 'Bearer', 'Bearer a b']) {
      const res = await s.call('POST', '/api/genres', { body: { id: 'g', name: 'G' }, headers: { authorization: header } });
      assert.equal(res.status, 401, header);
    }
  });

  test('admin can read their own identity', async () => {
    const res = await s.call('GET', '/api/auth/me', { token: 'admin-token' });
    assert.equal(res.status, 200);
    assert.equal(res.json.role, 'admin');
  });

  test('auth does not affect public reads, and unknown GETs are 404 not 401', async () => {
    assert.equal((await s.call('GET', '/api/genres')).status, 200);
    assert.equal((await s.call('GET', '/api/nope')).status, 404);
  });
});

describe('admin CRUD, validation and cache invalidation', () => {
  let s;
  before(async () => { s = await startTestServer(); });
  after(() => s.close());
  const admin = (extra = {}) => ({ token: 'admin-token', ...extra });

  test('create -> visible immediately in lists (cache invalidated)', async () => {
    assert.equal((await s.call('GET', '/api/titles')).headers.get('x-total-count'), '3'); // primes the cache
    await s.call('GET', '/api/home');
    const created = await s.call('POST', '/api/titles', admin({ body: { id: 'new_one_2026', title: 'New One', type: 'movie', year: 2026, releaseDate: '2026-12-01', poster: 'https://img.test/n.jpg' } }));
    assert.equal(created.status, 201);
    assert.equal(created.json.release_date, '2026-12-01');
    const list = await s.call('GET', '/api/titles');
    assert.equal(list.headers.get('x-total-count'), '4');
    assert.ok(list.json.some((t) => t.id === 'new_one_2026'));
  });

  test('update changes detail immediately and can clear a field with null', async () => {
    await s.call('GET', '/api/titles/prestige_2006'); // prime
    const patched = await s.call('PATCH', '/api/titles/prestige_2006', admin({ body: { id: 'prestige_2006', title: 'The Prestige (Remastered)', synopsis: null } }));
    assert.equal(patched.status, 200);
    const detail = await s.call('GET', '/api/titles/prestige_2006');
    assert.equal(detail.json.title, 'The Prestige (Remastered)');
    assert.equal(detail.json.details.synopsis, null);
  });

  test('people edits are reflected in cached title credits', async () => {
    await s.call('GET', '/api/titles/prestige_2006');
    await s.call('GET', '/api/people');
    assert.equal((await s.call('PUT', '/api/people/bale', admin({ body: { name: 'Christian Charles Bale' } }))).status, 200);
    assert.equal((await s.call('GET', '/api/titles/prestige_2006')).json.creditGroups.Cast[0].name, 'Christian Charles Bale');
    assert.equal((await s.call('GET', '/api/people')).json.find((p) => p.id === 'bale').name, 'Christian Charles Bale');
  });

  test('duplicate id is a 409, not a 500', async () => {
    const res = await s.call('POST', '/api/titles', admin({ body: { id: 'tenet_2020', title: 'Dup', type: 'movie' } }));
    assert.equal(res.status, 409);
    assert.equal(res.json.error.code, 'conflict');
  });

  test('validation rejects bad bodies with field-level details', async () => {
    const cases = [
      [{ id: 'x y', title: 'T', type: 'movie' }, 'id'],
      [{ id: 'ok1', title: '', type: 'movie' }, 'title'],
      [{ id: 'ok1', title: 'T', type: 'game' }, 'type'],
      [{ id: 'ok1', title: 'T', type: 'movie', poster: 'javascript:alert(1)' }, 'poster'],
      [{ id: 'ok1', title: 'T', type: 'movie', releaseDate: '12/01/2026' }, 'releaseDate'],
      [{ id: 'ok1', title: 'T', type: 'movie', year: 1500 }, 'year'],
      [{ id: 'ok1', title: 'T', type: 'movie', admin: true }, ''],
    ];
    for (const [body, field] of cases) {
      const res = await s.call('POST', '/api/titles', admin({ body }));
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.json.error.code, 'validation_failed');
      if (field) assert.ok(res.json.error.details.some((d) => d.field === field), `${field} in ${JSON.stringify(res.json.error.details)}`);
    }
    assert.equal((await s.call('PATCH', '/api/titles/tenet_2020', admin({ body: {} }))).status, 400);
    assert.equal((await s.call('POST', '/api/titles/tenet_2020/credits', admin({ body: { role: 'director' } }))).status, 400);
  });

  test('malformed JSON -> 400, oversized body -> 413', async () => {
    const bad = await s.call('POST', '/api/genres', admin({ raw: '{nope', headers: { 'content-type': 'application/json' } }));
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error.code, 'invalid_json');
    const huge = await s.call('POST', '/api/genres', admin({ body: { id: 'g', name: 'x'.repeat(200_000) } }));
    assert.equal(huge.status, 413);
  });

  test('credits: add normalises role/department, remove one role or all', async () => {
    const added = await s.call('POST', '/api/titles/tenet_2020/credits', admin({ body: { person_id: 'nolan', role: 'Executive Producer' } }));
    assert.equal(added.status, 201);
    assert.equal(added.json[0].role, 'Executive Producer');
    assert.equal(added.json[0].department, 'Crew');
    await s.call('POST', '/api/titles/tenet_2020/credits', admin({ body: { personId: 'nolan', role: 'director' } }));
    assert.equal((await s.call('DELETE', '/api/titles/tenet_2020/credits/nolan?role=Executive%20Producer', admin())).status, 204);
    assert.equal((await s.call('GET', '/api/titles/tenet_2020/credits')).json.length, 1);
    assert.equal((await s.call('DELETE', '/api/titles/tenet_2020/credits/nolan', admin())).status, 204);
    assert.equal((await s.call('GET', '/api/titles/tenet_2020/credits')).json.length, 0);
    assert.equal((await s.call('DELETE', '/api/titles/tenet_2020/credits/nolan', admin())).status, 404);
  });

  test('genre assignment and genre CRUD', async () => {
    const assigned = await s.call('POST', '/api/titles/tenet_2020/genres', admin({ body: { genre_id: 'drama' } }));
    assert.equal(assigned.status, 201);
    assert.deepEqual(assigned.json.map((g) => g.genreId).sort(), ['drama', 'scifi']);
    assert.equal((await s.call('DELETE', '/api/titles/tenet_2020/genres/drama', admin())).status, 204);
    assert.equal((await s.call('POST', '/api/genres', admin({ body: { id: 'horror', name: 'Horror' } }))).status, 201);
    assert.ok((await s.call('GET', '/api/genres')).json.some((g) => g.id === 'horror'));
    assert.equal((await s.call('PATCH', '/api/genres/horror', admin({ body: { name: 'Scary' } }))).json.name, 'Scary');
    assert.equal((await s.call('DELETE', '/api/genres/horror', admin())).status, 204);
    assert.equal((await s.call('DELETE', '/api/genres/horror', admin())).status, 404);
  });

  test('delete removes the title and its cached detail', async () => {
    await s.call('GET', '/api/titles/dark_knight_2008');
    assert.equal((await s.call('DELETE', '/api/titles/dark_knight_2008', admin())).status, 204);
    assert.equal((await s.call('GET', '/api/titles/dark_knight_2008')).status, 404);
    assert.equal((await s.call('DELETE', '/api/titles/dark_knight_2008', admin())).status, 404);
  });

  test('people CRUD including 404 on missing', async () => {
    assert.equal((await s.call('POST', '/api/people', admin({ body: { id: 'p_new', name: 'New Person', image_url: '' } }))).status, 201);
    assert.equal((await s.call('PATCH', '/api/people/missing', admin({ body: { name: 'x' } }))).status, 404);
    assert.equal((await s.call('DELETE', '/api/people/p_new', admin())).status, 204);
  });
});

describe('rate limiting', () => {
  test('returns 429 in the standard error envelope after the limit', async () => {
    const s = await startTestServer({ config: testConfig({ RATE_LIMIT_PER_MINUTE: '3' }) });
    try {
      const statuses = [];
      for (let i = 0; i < 5; i += 1) statuses.push((await s.call('GET', '/api/genres')).status);
      assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
      assert.equal((await s.call('GET', '/api/genres')).json.error.code, 'rate_limited');
      assert.equal((await s.call('GET', '/api/health/live')).status, 200, 'health is exempt');
    } finally { await s.close(); }
  });
});

describe('status filter', () => {
  test('released/upcoming split follows the injected clock', async () => {
    const repo = createFakeRepo();
    repo.state.titles.push({ id: 'soon_2026', title: 'Soon', type: 'movie', year: 2026, release_date: '2026-07-17', genres: ['drama'] });
    const s = await startTestServer({ repo, now: () => new Date('2026-01-01T00:00:00Z') });
    try {
      assert.deepEqual((await s.call('GET', '/api/titles?status=upcoming')).json.map((t) => t.id), ['soon_2026']);
      assert.equal((await s.call('GET', '/api/titles?status=released')).json.length, 3);
      assert.equal((await s.call('GET', '/api/titles?status=bogus')).status, 400);
    } finally { await s.close(); }
    const later = await startTestServer({ repo, now: () => new Date('2026-12-01T00:00:00Z') });
    try {
      assert.equal((await later.call('GET', '/api/titles?status=upcoming')).json.length, 0);
    } finally { await later.close(); }
  });
});
