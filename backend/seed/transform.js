/**
 * Pure conversion of the bundled catalog files (movies.js, shows.js, people.js, genres.js)
 * into database rows. Shared by `seed.js` (writes to Supabase) and the dev fake API.
 */

const str = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const arr = (value) => (Array.isArray(value) ? value : null);

export function buildGenres(GENRES) {
  return Object.entries(GENRES).map(([id, name]) => ({ id: str(id), name: str(name) })).filter((g) => g.id && g.name);
}

export function buildPeople(PEOPLE) {
  return PEOPLE.map((p) => ({ id: str(p?.id), name: str(p?.name), roles: arr(p?.roles), image: str(p?.image) })).filter((p) => p.id && p.name);
}

export function buildTitles(titles, genreIds) {
  return titles
    .map((t) => {
      const genres = (Array.isArray(t?.classification?.genres) ? t.classification.genres : []).map(str).filter((g) => g && genreIds.has(g));
      return {
        id: str(t?.id),
        type: str(t?.type),
        title: str(t?.title),
        year: num(t?.year),
        release_date: str(t?.releaseDate),
        poster: str(t?.media?.poster),
        backdrop: str(t?.media?.backdrop),
        trailer: str(t?.media?.trailer),
        synopsis: str(t?.details?.synopsis),
        runtime: str(t?.details?.runtime),
        genre: genres[0] ?? null,
        censor_rating: str(t?.classification?.rating),
      };
    })
    .filter((t) => t.id && t.title && t.type);
}

export function buildTitleGenres(titles, genreIds) {
  const rows = [];
  const unknown = new Set();
  for (const t of titles) {
    const titleId = str(t?.id);
    if (!titleId) continue;
    for (const raw of Array.isArray(t?.classification?.genres) ? t.classification.genres : []) {
      const genreId = str(raw);
      if (!genreId) continue;
      if (genreIds.has(genreId)) rows.push({ title_id: titleId, genre_id: genreId });
      else unknown.add(genreId);
    }
  }
  return { rows: [...new Map(rows.map((r) => [`${r.title_id}::${r.genre_id}`, r])).values()], unknown: [...unknown] };
}

export function buildTitleCredits(titles, personIds) {
  const rows = [];
  const unknown = new Set();
  const add = (titleId, personRaw, role, department) => {
    const personId = str(personRaw);
    if (!personId) return;
    if (personIds.has(personId)) rows.push({ title_id: titleId, person_id: personId, role, department });
    else unknown.add(personId);
  };

  for (const t of titles) {
    const titleId = str(t?.id);
    if (!titleId) continue;
    add(titleId, t?.people?.directorId, 'director', 'crew');
    add(titleId, t?.people?.composerId, 'composer', 'crew');
    for (const id of Array.isArray(t?.people?.writerIds) ? t.people.writerIds : []) add(titleId, id, 'writer', 'crew');
    for (const id of Array.isArray(t?.people?.castIds) ? t.people.castIds : []) add(titleId, id, 'cast', 'cast');
  }
  return { rows: [...new Map(rows.map((r) => [`${r.title_id}::${r.person_id}::${r.role}`, r])).values()], unknown: [...unknown] };
}

/** Everything the seeder writes, plus the ids it had to skip. */
export function buildSeedRows({ GENRES, PEOPLE, MOVIES, SHOWS }) {
  const source = [...MOVIES, ...SHOWS];
  const genres = buildGenres(GENRES);
  const genreIds = new Set(genres.map((g) => g.id));
  const people = buildPeople(PEOPLE);
  const personIds = new Set(people.map((p) => p.id));
  const titles = buildTitles(source, genreIds);
  const tg = buildTitleGenres(source, genreIds);
  const tc = buildTitleCredits(source, personIds);
  return { genres, people, titles, titleGenres: tg.rows, titleCredits: tc.rows, skipped: { genres: tg.unknown, people: tc.unknown } };
}
