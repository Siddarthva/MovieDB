import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFakeSeed } from '../dev/fake-server.js';
import { buildSeedRows } from '../seed/transform.js';
import { GENRES } from '../data/genres.js';
import { PEOPLE } from '../data/people.js';
import { MOVIES } from '../data/movies.js';
import { SHOWS } from '../data/shows.js';

const rows = buildSeedRows({ GENRES, PEOPLE, MOVIES, SHOWS });

test('bundled catalog produces rows for every table', () => {
  for (const key of ['genres', 'people', 'titles', 'titleGenres', 'titleCredits']) assert.ok(rows[key].length > 0, key);
});

test('primary keys are unique and non-empty', () => {
  const unique = (list, key) => new Set(list.map(key)).size === list.length;
  assert.ok(unique(rows.genres, (r) => r.id));
  assert.ok(unique(rows.people, (r) => r.id));
  assert.ok(unique(rows.titles, (r) => r.id), 'duplicate title ids in movies.js/shows.js');
  assert.ok(unique(rows.titleGenres, (r) => `${r.title_id}/${r.genre_id}`));
  assert.ok(unique(rows.titleCredits, (r) => `${r.title_id}/${r.person_id}/${r.role}`));
});

test('foreign keys all resolve (the seed would not violate title_genres / title_credits constraints)', () => {
  const titles = new Set(rows.titles.map((r) => r.id));
  const genres = new Set(rows.genres.map((r) => r.id));
  const people = new Set(rows.people.map((r) => r.id));
  assert.ok(rows.titleGenres.every((r) => titles.has(r.title_id) && genres.has(r.genre_id)));
  assert.ok(rows.titleCredits.every((r) => titles.has(r.title_id) && people.has(r.person_id)));
});

test('required columns are present and enumerations are valid', () => {
  assert.ok(rows.titles.every((t) => t.title && ['movie', 'show'].includes(t.type)));
  assert.ok(rows.titleCredits.every((c) => ['cast', 'crew'].includes(c.department)));
  assert.ok(rows.titles.every((t) => t.release_date === null || /^\d{4}-\d{2}-\d{2}$/.test(t.release_date)), 'release_date must be YYYY-MM-DD');
});

test('the content rating is carried into censor_rating', () => {
  assert.ok(rows.titles.some((t) => t.censor_rating));
});

test('seed rows pass the API validation rules (so admin edits of seeded rows round-trip)', async () => {
  const { titleCreateBody } = await import('../src/validation.js');
  const failures = rows.titles
    .map((t) => ({ t, r: titleCreateBody.safeParse({ id: t.id, title: t.title, type: t.type, year: t.year, releaseDate: t.release_date, poster: t.poster, backdrop: t.backdrop, trailer: t.trailer, synopsis: t.synopsis, runtime: t.runtime, censor_rating: t.censor_rating }) }))
    .filter(({ r }) => !r.success)
    .map(({ t, r }) => `${t.id}: ${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`);
  assert.deepEqual(failures, []);
});

test('the fake dev seed is internally consistent', () => {
  const seed = buildFakeSeed();
  assert.equal(seed.titles.length, rows.titles.length);
  assert.ok(seed.titles.some((t) => t.genres.length > 0));
});
