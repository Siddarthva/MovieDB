// In-memory stand-ins for the database. Used by unit tests and by the dev-only fake API server
// (`npm run dev:fake`). They are never imported by server.js.
export const SEED = {
  genres: [{ id: 'drama', name: 'Drama' }, { id: 'thriller', name: 'Thriller' }, { id: 'scifi', name: 'Sci-Fi' }],
  people: [
    { id: 'nolan', name: 'Christopher Nolan', image_url: 'https://img.test/nolan.jpg', roles: ['director'] },
    { id: 'bale', name: 'Christian Bale', image_url: null, image: 'https://img.test/bale.jpg' },
  ],
  titles: [
    { id: 'prestige_2006', title: 'The Prestige', type: 'movie', year: 2006, release_date: '2006-10-20', poster: 'https://img.test/p1.jpg', backdrop: null, trailer: null, synopsis: 'Rival magicians.', runtime: '130 min', genre: 'drama', censor_rating: 'PG-13', genres: ['drama', 'thriller'] },
    { id: 'dark_knight_2008', title: 'The Dark Knight', type: 'movie', year: 2008, release_date: '2008-07-18', poster: null, backdrop: null, trailer: null, synopsis: null, runtime: null, genre: 'thriller', censor_rating: 'PG-13', genres: ['thriller'] },
    { id: 'tenet_2020', title: 'Tenet', type: 'movie', year: 2020, release_date: '2020-09-03', poster: null, backdrop: null, trailer: null, synopsis: null, runtime: null, genre: null, censor_rating: null, genres: ['scifi'] },
  ],
  credits: [
    { title_id: 'prestige_2006', person_id: 'nolan', role: 'director', department: 'crew' },
    { title_id: 'prestige_2006', person_id: 'bale', role: 'actor', department: 'cast' },
    { title_id: 'dark_knight_2008', person_id: 'nolan', role: 'director', department: 'crew' },
    { title_id: 'dark_knight_2008', person_id: 'bale', role: 'actor', department: 'cast' },
  ],
};

/** In-memory stand-in for the Supabase repository. Records calls so tests can assert on them. */
export function createFakeRepo(seed = SEED) {
  const state = structuredClone(seed);
  const calls = [];
  const rec = (name) => calls.push(name);
  const withGenres = (t) => ({ ...t, title_genres: t.genres.map((genre_id) => ({ genre_id, genres: state.genres.find((g) => g.id === genre_id) ?? null })) });
  const creditRows = (titleId) => state.credits.filter((c) => c.title_id === titleId).map((c) => ({ ...c, people: state.people.find((p) => p.id === c.person_id) ?? null }));

  const repo = {
    calls,
    state,
    fail: null, // set to an Error to make every call reject
    async listCatalogSummary() { rec('listCatalogSummary'); if (repo.fail) throw repo.fail; return state.titles.map(withGenres); },
    async listGenres() { rec('listGenres'); if (repo.fail) throw repo.fail; return [...state.genres]; },
    async listTitles({ q, type, genre, status, today, limit = 50, offset = 0 }) {
      rec('listTitles'); if (repo.fail) throw repo.fail;
      let rows = state.titles.filter((t) => (!q || t.title.toLowerCase().includes(q.toLowerCase())) && (!type || t.type === type) && (!genre || t.genres.includes(genre)) && (!status || !today || ((t.release_date ?? `${t.year}-01-01`) > today) === (status === 'upcoming')));
      rows = rows.sort((a, b) => b.year - a.year);
      return { rows: rows.slice(offset, offset + limit).map(withGenres), total: rows.length };
    },
    async getTitleRow(id) { rec('getTitleRow'); if (repo.fail) throw repo.fail; const t = state.titles.find((x) => x.id === id); return t ? withGenres(t) : null; },
    async getTitleGenres(id) { return state.titles.find((t) => t.id === id)?.genres.map((genre_id) => ({ title_id: id, genre_id, genres: state.genres.find((g) => g.id === genre_id) })) ?? []; },
    async getTitleCredits(id) { rec('getTitleCredits'); return creditRows(id); },
    async insertTitle(row) { if (state.titles.some((t) => t.id === row.id)) { const { DatabaseError } = await import('../src/errors.js'); throw new DatabaseError({ code: '23505', message: 'duplicate key' }); } const t = { genres: [], ...row }; state.titles.push(t); return row; },
    async updateTitle(id, patch) { const t = state.titles.find((x) => x.id === id); if (!t) return null; Object.assign(t, patch); return t; },
    async deleteTitle(id) { const n = state.titles.length; state.titles = state.titles.filter((t) => t.id !== id); state.credits = state.credits.filter((c) => c.title_id !== id); return state.titles.length < n; },
    async upsertCredit(row) { state.credits = state.credits.filter((c) => !(c.title_id === row.title_id && c.person_id === row.person_id && c.role === row.role)); state.credits.push(row); },
    async deleteCredit({ titleId, personId, role }) { const n = state.credits.length; state.credits = state.credits.filter((c) => !(c.title_id === titleId && c.person_id === personId && (!role || c.role === role))); return n - state.credits.length; },
    async getPersonCredits(pid) { return state.credits.filter((c) => c.person_id === pid).map((c) => ({ ...c, titles: state.titles.find((t) => t.id === c.title_id) })); },
    async addTitleGenre(tid, gid) { const t = state.titles.find((x) => x.id === tid); if (!t.genres.includes(gid)) t.genres.push(gid); },
    async removeTitleGenre(tid, gid) { const t = state.titles.find((x) => x.id === tid); const had = t?.genres.includes(gid); if (had) t.genres = t.genres.filter((g) => g !== gid); return Boolean(had); },
    async insertGenre(row) { state.genres.push(row); return row; },
    async updateGenre(id, patch) { const g = state.genres.find((x) => x.id === id); if (!g) return null; Object.assign(g, patch); return g; },
    async deleteGenre(id) { const n = state.genres.length; state.genres = state.genres.filter((g) => g.id !== id); return state.genres.length < n; },
    async listPeople({ q, limit, offset = 0 } = {}) { rec('listPeople'); const rows = state.people.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())); return { rows: limit ? rows.slice(offset, offset + limit) : rows, total: rows.length }; },
    async getPerson(id) { return state.people.find((p) => p.id === id) ?? null; },
    async insertPerson(row) { state.people.push(row); return row; },
    async updatePerson(id, patch) { const p = state.people.find((x) => x.id === id); if (!p) return null; Object.assign(p, patch); return p; },
    async deletePerson(id) { const n = state.people.length; state.people = state.people.filter((p) => p.id !== id); return state.people.length < n; },
    async searchPeople(q) { return state.people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())); },
    async titleIdsByGenres(genreIds) { return state.titles.filter((t) => t.genres.some((g) => genreIds.includes(g))).map((t) => t.id); },
    async creditsByPeople(ids) { return state.credits.filter((c) => ids.includes(c.person_id)); },
    async titlesByIds(ids) { return state.titles.filter((t) => ids.includes(t.id)).map(withGenres); },
  };
  return repo;
}

/** A Supabase-like client whose tables all answer the health probe, or fail with `error`. */
export function createFakeDb({ error = null } = {}) {
  const chain = { select: () => chain, limit: async () => ({ data: [], error }) };
  return { from: () => chain };
}

