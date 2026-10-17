import test from 'node:test';
import assert from 'node:assert/strict';
import { peopleSignals, rankRelated } from '../src/services/recommendations.js';

const target = { id: 't', type: 'movie', year: 2010, genres: ['drama', 'thriller'], directorIds: ['d1'], castIds: ['a1', 'a2'], writerIds: ['w1'] };

test('ranks by genre overlap, shared people and period', () => {
  const out = rankRelated(target, [
    { id: 'weak', title: 'Weak', type: 'movie', year: 1960, genres: ['drama', 'comedy', 'war'] },
    { id: 'strong', title: 'Strong', type: 'movie', year: 2011, genres: ['drama', 'thriller'], directorIds: ['d1'], castIds: ['a1'] },
    { id: 'mid', title: 'Mid', type: 'show', year: 2009, genres: ['thriller'] },
  ]);
  assert.deepEqual(out.map((r) => r.id), ['strong', 'mid', 'weak']);
});

test('excludes the target itself and collapses duplicate candidates', () => {
  const dup = { id: 'x', title: 'X', genres: ['drama'] };
  const out = rankRelated(target, [{ id: 't', genres: ['drama'] }, dup, { ...dup }, dup]);
  assert.deepEqual(out.map((r) => r.id), ['x']);
});

test('candidates with no content signal are excluded even if type and year match', () => {
  const out = rankRelated(target, [{ id: 'same-era', type: 'movie', year: 2010, genres: ['horror'] }]);
  assert.deepEqual(out, []);
});

test('handles missing metadata everywhere without throwing', () => {
  assert.deepEqual(rankRelated({ id: 't' }, [{ id: 'a' }, { id: 'b', genres: ['x'] }, null, {}]), []);
  assert.deepEqual(rankRelated({ id: 't', genres: ['x'] }, [{ id: 'b', genres: ['x'] }]).map((r) => r.id), ['b']);
  assert.deepEqual(rankRelated(target, undefined), []);
  assert.deepEqual(rankRelated(target, []), []);
});

test('reasons only mention data that supports them', () => {
  const [r] = rankRelated(target, [{ id: 'c', type: 'show', year: 1990, genres: ['drama'] }]);
  assert.deepEqual(r.reasons.map((x) => x.type), ['genre']); // no director/cast/format/period claims
});

test('uses names when available, plain labels otherwise', () => {
  const candidate = { id: 'c', genres: ['drama'], directorIds: ['d1'], castIds: ['a1', 'a2'] };
  const named = rankRelated(target, [candidate], { genreNames: new Map([['drama', 'Drama']]), personNames: new Map([['d1', 'Dee'], ['a1', 'Ann'], ['a2', 'Al']]) })[0];
  assert.deepEqual(named.reasons.map((x) => x.label), ['Shared genres: Drama', 'Same director: Dee', 'Shared cast: Ann, Al']);
  const plain = rankRelated(target, [candidate])[0];
  assert.deepEqual(plain.reasons.map((x) => x.label), ['Shared genres', 'Same director', '2 shared cast members']);
});

test('cast bonus is capped', () => {
  const big = { ...target, castIds: ['1', '2', '3', '4', '5', '6'] };
  const a = rankRelated(big, [{ id: 'c', castIds: ['1', '2', '3', '4', '5', '6'] }])[0].score;
  const b = rankRelated(big, [{ id: 'c', castIds: ['1', '2', '3'] }])[0].score;
  assert.equal(a, b);
});

test('is deterministic and breaks ties by year, title, id', () => {
  const cands = [
    { id: 'b', title: 'Same', year: 2000, genres: ['drama', 'thriller'] },
    { id: 'a', title: 'Same', year: 2000, genres: ['drama', 'thriller'] },
    { id: 'c', title: 'Alpha', year: 2000, genres: ['drama', 'thriller'] },
  ];
  const first = rankRelated(target, cands).map((r) => r.id);
  assert.deepEqual(first, ['c', 'a', 'b']);
  assert.deepEqual(rankRelated(target, [...cands].reverse()).map((r) => r.id), first);
});

test('respects limit', () => {
  const cands = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, genres: ['drama'] }));
  assert.equal(rankRelated(target, cands, { limit: 5 }).length, 5);
});

test('peopleSignals groups credit rows by role', () => {
  const s = peopleSignals([
    { person_id: 'd', role: 'director' }, { personId: 'w', roleKey: 'screenwriter' },
    { person_id: 'a', role: 'actor' }, { person_id: 'b', role: 'x', department: 'cast' }, { person_id: 'a', role: 'cast' },
  ]);
  assert.deepEqual(s, { directorIds: ['d'], writerIds: ['w'], castIds: ['a', 'b'] });
});
