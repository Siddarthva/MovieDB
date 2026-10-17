import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHomeRows } from '../src/services/home.js';

const t = (id, type, release_date, genres = [], year = release_date ? Number(release_date.slice(0, 4)) : null) =>
  ({ id, title: id, type, year, release_date, poster: null, backdrop: null, censor_rating: null, title_genres: genres.map((g) => ({ genre_id: g })) });
const NOW = new Date('2026-06-01T12:00:00Z');

test('never emits fabricated trending / acclaimed rows and labels each row with its method', () => {
  const rows = buildHomeRows([t('a', 'movie', '2020-01-01')], [], NOW);
  assert.ok(rows.every((r) => r.method && !/trending|acclaimed|popular/i.test(r.id + r.label)));
});

test('splits released and upcoming using the injected clock, not a hard-coded date', () => {
  const data = [t('old', 'movie', '2020-05-01'), t('new', 'movie', '2026-05-31'), t('soon', 'movie', '2026-07-17'), t('later', 'show', '2027-01-01')];
  const rows = Object.fromEntries(buildHomeRows(data, [], NOW).map((r) => [r.id, r.titles.map((x) => x.id)]));
  assert.deepEqual(rows.latest_releases, ['new', 'old']);
  assert.deepEqual(rows.upcoming, ['soon', 'later']);
  assert.deepEqual(rows.new_movies, ['new', 'old']);
  assert.equal(rows.new_shows, undefined); // empty rows are omitted
  const later = buildHomeRows(data, [], new Date('2027-02-01T00:00:00Z')).find((r) => r.id === 'latest_releases');
  assert.equal(later.titles.length, 4);
});

test('falls back to year when release_date is missing and skips undated titles', () => {
  const rows = buildHomeRows([t('y', 'movie', null, [], 2010), t('none', 'movie', null, [], null)], [], NOW);
  assert.deepEqual(rows.find((r) => r.id === 'latest_releases').titles.map((x) => x.id), ['y']);
});

test('genre rows need enough titles, are capped, and use genre names', () => {
  const data = ['1', '2', '3', '4', '5'].map((n) => t(`d${n}`, 'movie', `201${n}-01-01`, ['drama']));
  data.push(t('x', 'movie', '2019-01-01', ['rare']));
  const rows = buildHomeRows(data, [{ id: 'drama', name: 'Drama' }], NOW);
  const genre = rows.filter((r) => r.id.startsWith('genre_'));
  assert.deepEqual(genre.map((r) => r.label), ['Drama']);
  assert.equal(genre[0].titles[0].id, 'd5');
});

test('rows are capped at 12 cards with stable card shape; empty input gives no rows', () => {
  const data = Array.from({ length: 30 }, (_, i) => t(`m${i}`, 'movie', `2000-01-${String((i % 28) + 1).padStart(2, '0')}`));
  const latest = buildHomeRows(data, [], NOW).find((r) => r.id === 'latest_releases');
  assert.equal(latest.titles.length, 12);
  assert.deepEqual(Object.keys(latest.titles[0]).sort(), ['backdrop', 'censor_rating', 'id', 'poster', 'releaseDate', 'title', 'type', 'year']);
  assert.deepEqual(buildHomeRows([], [], NOW), []);
});
