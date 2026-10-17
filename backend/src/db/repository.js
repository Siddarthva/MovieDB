import { DatabaseError } from '../errors.js';

/** Throw a classified DatabaseError for a failed Supabase result, otherwise return data. */
function unwrap({ data, error }) {
  if (error) throw new DatabaseError(error);
  return data;
}

/** Strip characters that carry meaning in PostgREST `ilike` patterns / `or()` expressions. */
export function likePattern(text) {
  return `%${String(text).replace(/[%_\\,()*]/g, ' ').trim().replace(/\s+/g, '%')}%`;
}

const TITLE_LIST_COLUMNS = 'id, title, type, year, release_date, poster, backdrop, censor_rating, genre';
const TITLE_DETAIL_COLUMNS = 'id, title, type, year, release_date, poster, backdrop, trailer, synopsis, runtime, genre, censor_rating, title_genres(genre_id, genres:genre_id(id, name))';
const CREDIT_COLUMNS = 'title_id, person_id, role, department, people:person_id(id, name, image_url, image)';

const SORTS = {
  year_desc: [['year', { ascending: false, nullsFirst: false }], ['release_date', { ascending: false, nullsFirst: false }], ['title', { ascending: true }]],
  year_asc: [['year', { ascending: true, nullsFirst: false }], ['title', { ascending: true }]],
  release_desc: [['release_date', { ascending: false, nullsFirst: false }], ['title', { ascending: true }]],
  title_asc: [['title', { ascending: true }]],
  title_desc: [['title', { ascending: false }]],
};

/**
 * Every database query the API makes lives here. The factory takes a Supabase client so
 * tests can supply a fake repository at a higher level instead.
 */
export function createRepository(db) {
  return {
    // ── titles ────────────────────────────────────────────────────────────
    async listTitles({ q, type, genre, status, today, year, yearFrom, yearTo, sort = 'year_desc', limit = 50, offset = 0 } = {}) {
      const genreFilter = Boolean(genre);
      const columns = `${TITLE_LIST_COLUMNS}, title_genres${genreFilter ? '!inner' : ''}(genre_id)`;
      let query = db.from('titles').select(columns, { count: 'exact' });

      if (q) query = query.ilike('title', likePattern(q));
      if (type) query = query.eq('type', type);
      if (year) query = query.eq('year', year);
      if (yearFrom) query = query.gte('year', yearFrom);
      if (yearTo) query = query.lte('year', yearTo);
      if (genreFilter) query = query.eq('title_genres.genre_id', genre);
      if (status && today) {
        // release_date is YYYY-MM-DD text, so lexicographic comparison is chronological.
        // Titles without a release_date fall back to their year; titles with neither match neither status.
        const thisYear = Number(today.slice(0, 4));
        query = status === 'upcoming'
          ? query.or(`release_date.gt.${today},and(release_date.is.null,year.gt.${thisYear})`)
          : query.or(`release_date.lte.${today},and(release_date.is.null,year.lte.${thisYear})`);
      }

      for (const [column, options] of SORTS[sort] ?? SORTS.year_desc) query = query.order(column, options);
      query = query.order('id', { ascending: true }).range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw new DatabaseError(error);
      return { rows: data ?? [], total: count ?? (data ?? []).length };
    },

    /** Lightweight whole-catalog list used to build home rows (bounded). */
    async listCatalogSummary(max = 1000) {
      return unwrap(await db
        .from('titles')
        .select(`${TITLE_LIST_COLUMNS}, title_genres(genre_id)`)
        .order('year', { ascending: false, nullsFirst: false })
        .order('id', { ascending: true })
        .limit(max)) ?? [];
    },

    async getTitleRow(id) {
      return unwrap(await db.from('titles').select(TITLE_DETAIL_COLUMNS).eq('id', id).maybeSingle());
    },

    async getTitleGenres(titleId) {
      return unwrap(await db.from('title_genres').select('title_id, genre_id, genres:genre_id(id, name)').eq('title_id', titleId).order('genre_id')) ?? [];
    },

    async insertTitle(row) {
      return unwrap(await db.from('titles').insert(row).select('*').single());
    },

    async updateTitle(id, patch) {
      return unwrap(await db.from('titles').update(patch).eq('id', id).select('*').maybeSingle());
    },

    async deleteTitle(id) {
      // title_genres / title_credits cascade via ON DELETE CASCADE (database.sql).
      const rows = unwrap(await db.from('titles').delete().eq('id', id).select('id'));
      return (rows ?? []).length > 0;
    },

    // ── credits ───────────────────────────────────────────────────────────
    async getTitleCredits(titleId) {
      return unwrap(await db.from('title_credits').select(CREDIT_COLUMNS).eq('title_id', titleId)) ?? [];
    },

    async upsertCredit(row) {
      unwrap(await db.from('title_credits').upsert(row, { onConflict: 'title_id,person_id,role' }));
    },

    async deleteCredit({ titleId, personId, role }) {
      let query = db.from('title_credits').delete().eq('title_id', titleId).eq('person_id', personId);
      if (role) query = query.eq('role', role);
      const rows = unwrap(await query.select('title_id'));
      return (rows ?? []).length;
    },

    async getPersonCredits(personId) {
      return unwrap(await db.from('title_credits').select('title_id, role, department, titles:title_id(id, title, year, type, poster)').eq('person_id', personId)) ?? [];
    },

    // ── title genres ──────────────────────────────────────────────────────
    async addTitleGenre(titleId, genreId) {
      unwrap(await db.from('title_genres').upsert({ title_id: titleId, genre_id: genreId }, { onConflict: 'title_id,genre_id' }));
    },

    async removeTitleGenre(titleId, genreId) {
      const rows = unwrap(await db.from('title_genres').delete().eq('title_id', titleId).eq('genre_id', genreId).select('title_id'));
      return (rows ?? []).length > 0;
    },

    // ── genres ────────────────────────────────────────────────────────────
    async listGenres() {
      return unwrap(await db.from('genres').select('id, name').order('name')) ?? [];
    },
    async insertGenre(row) {
      return unwrap(await db.from('genres').insert(row).select('id, name').single());
    },
    async updateGenre(id, patch) {
      return unwrap(await db.from('genres').update(patch).eq('id', id).select('id, name').maybeSingle());
    },
    async deleteGenre(id) {
      const rows = unwrap(await db.from('genres').delete().eq('id', id).select('id'));
      return (rows ?? []).length > 0;
    },

    // ── people ────────────────────────────────────────────────────────────
    async listPeople({ q, limit, offset } = {}) {
      let query = db.from('people').select('id, name, image_url, image, roles', { count: 'exact' }).order('name').order('id');
      if (q) query = query.ilike('name', likePattern(q));
      if (limit) query = query.range(offset ?? 0, (offset ?? 0) + limit - 1);
      const { data, error, count } = await query;
      if (error) throw new DatabaseError(error);
      return { rows: data ?? [], total: count ?? (data ?? []).length };
    },
    async getPerson(id) {
      return unwrap(await db.from('people').select('id, name, image_url, image, roles').eq('id', id).maybeSingle());
    },
    async insertPerson(row) {
      return unwrap(await db.from('people').insert(row).select('*').single());
    },
    async updatePerson(id, patch) {
      return unwrap(await db.from('people').update(patch).eq('id', id).select('*').maybeSingle());
    },
    async deletePerson(id) {
      const rows = unwrap(await db.from('people').delete().eq('id', id).select('id'));
      return (rows ?? []).length > 0;
    },

    // ── search & related ──────────────────────────────────────────────────
    async searchPeople(q, limit) {
      return unwrap(await db.from('people').select('id, name, image_url, image').ilike('name', likePattern(q)).order('name').limit(limit)) ?? [];
    },

    /** Ids of titles sharing at least one of `genreIds`. */
    async titleIdsByGenres(genreIds, limit) {
      if (!genreIds.length) return [];
      const rows = unwrap(await db.from('title_genres').select('title_id').in('genre_id', genreIds).order('title_id').limit(limit)) ?? [];
      return [...new Set(rows.map((r) => r.title_id))];
    },

    /** Credit rows (title_id, person_id, role, department) for any of `personIds`. */
    async creditsByPeople(personIds, limit) {
      if (!personIds.length) return [];
      return unwrap(await db.from('title_credits').select('title_id, person_id, role, department').in('person_id', personIds).order('title_id').limit(limit)) ?? [];
    },

    /** Fetched in chunks so the `in.(...)` filter never exceeds URL length limits. */
    async titlesByIds(ids) {
      const chunks = [];
      for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
      const parts = await Promise.all(chunks.map(async (chunk) => unwrap(await db.from('titles').select(`${TITLE_LIST_COLUMNS}, title_genres(genre_id)`).in('id', chunk)) ?? []));
      return parts.flat();
    },
  };
}
