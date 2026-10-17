/**
 * Deterministic "related titles" ranking using only data that exists in the schema:
 * genres, credits (director / cast / writer), media type and release year.
 * No external services, no randomness: same input -> same output.
 */

export const WEIGHTS = {
  genre: 45, // scaled by Jaccard overlap of genre sets
  director: 20,
  castEach: 5, // per shared cast member…
  castMax: 15, // …capped
  writer: 5,
  sameType: 5, // only counted when another signal already exists
  year: 10, // scaled by proximity within YEAR_WINDOW years
};
export const YEAR_WINDOW = 15;

const intersect = (a, b) => a.filter((x) => b.includes(x));

/**
 * @typedef {{id:string,title?:string,type?:string|null,year?:number|null,
 *   genres?:string[],directorIds?:string[],castIds?:string[],writerIds?:string[]}} Entry
 * @param {Entry} target
 * @param {Entry[]} candidates
 * @param {{limit?:number,genreNames?:Map<string,string>,personNames?:Map<string,string>}} opts
 */
export function rankRelated(target, candidates, { limit = 8, genreNames = new Map(), personNames = new Map() } = {}) {
  const tGenres = [...new Set(target.genres ?? [])];
  const seen = new Set([target.id]);
  const scored = [];

  for (const c of candidates ?? []) {
    if (!c?.id || seen.has(c.id)) continue; // drops the target itself and duplicate candidates
    seen.add(c.id);

    const cGenres = [...new Set(c.genres ?? [])];
    const sharedGenres = intersect(tGenres, cGenres);
    const sharedDirectors = intersect(target.directorIds ?? [], c.directorIds ?? []);
    const sharedCast = intersect(target.castIds ?? [], c.castIds ?? []);
    const sharedWriters = intersect(target.writerIds ?? [], c.writerIds ?? []);

    // A candidate needs a real content signal; type/year alone are not a relationship.
    if (!sharedGenres.length && !sharedDirectors.length && !sharedCast.length && !sharedWriters.length) continue;

    const union = new Set([...tGenres, ...cGenres]).size;
    let score = union ? (sharedGenres.length / union) * WEIGHTS.genre : 0;
    if (sharedDirectors.length) score += WEIGHTS.director;
    score += Math.min(sharedCast.length * WEIGHTS.castEach, WEIGHTS.castMax);
    if (sharedWriters.length) score += WEIGHTS.writer;

    const reasons = [];
    const names = (ids, map) => ids.map((id) => map.get(id)).filter(Boolean);
    const genreLabels = names(sharedGenres, genreNames);
    if (sharedGenres.length) reasons.push({ type: 'genre', label: genreLabels.length ? `Shared genres: ${genreLabels.join(', ')}` : 'Shared genres', ids: sharedGenres });
    if (sharedDirectors.length) {
      const n = names(sharedDirectors, personNames);
      reasons.push({ type: 'director', label: n.length ? `Same director: ${n.join(', ')}` : 'Same director', ids: sharedDirectors });
    }
    if (sharedCast.length) {
      const n = names(sharedCast, personNames).slice(0, 3);
      reasons.push({ type: 'cast', label: n.length ? `Shared cast: ${n.join(', ')}` : `${sharedCast.length} shared cast member${sharedCast.length > 1 ? 's' : ''}`, ids: sharedCast });
    }
    if (sharedWriters.length) {
      const n = names(sharedWriters, personNames);
      reasons.push({ type: 'writer', label: n.length ? `Same writer: ${n.join(', ')}` : 'Same writer', ids: sharedWriters });
    }

    if (target.type && c.type && target.type === c.type) {
      score += WEIGHTS.sameType;
      reasons.push({ type: 'format', label: c.type === 'show' ? 'Also a TV show' : 'Also a movie' });
    }
    if (Number.isInteger(target.year) && Number.isInteger(c.year)) {
      const gap = Math.abs(target.year - c.year);
      if (gap <= YEAR_WINDOW) {
        score += WEIGHTS.year * (1 - gap / (YEAR_WINDOW + 1));
        if (gap <= 5) reasons.push({ type: 'period', label: gap === 0 ? `Released the same year (${c.year})` : `Released within ${gap} year${gap > 1 ? 's' : ''} (${c.year})` });
      }
    }

    scored.push({ id: c.id, score: Math.round(score * 100) / 100, reasons, year: c.year ?? 0, title: c.title ?? '' });
  }

  return scored
    .sort((a, b) => b.score - a.score || b.year - a.year || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map(({ id, score, reasons }) => ({ id, score, reasons }));
}

const creditIds = (credits, predicate) => [...new Set(credits.filter(predicate).map((c) => c.personId ?? c.person_id))];
const roleOf = (c) => String(c.roleKey ?? c.role ?? '').toLowerCase().replace(/\s+/g, '_');
const CAST_ROLES = new Set(['cast', 'actor', 'actress', 'voice_actor']);

/** Collapse credit rows into the id lists rankRelated expects. */
export function peopleSignals(credits) {
  return {
    directorIds: creditIds(credits, (c) => roleOf(c) === 'director'),
    writerIds: creditIds(credits, (c) => ['writer', 'screenwriter'].includes(roleOf(c))),
    castIds: creditIds(credits, (c) => CAST_ROLES.has(roleOf(c)) || String(c.department ?? '').toLowerCase() === 'cast'),
  };
}
