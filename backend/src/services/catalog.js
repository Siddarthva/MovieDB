import { notFound } from '../errors.js';
import { buildHomeRows } from './home.js';
import { genreIdsOf, toCard, toCredits, toDetail, toFilmography, toGenreRelations, toListItem, toPerson } from './normalize.js';
import { peopleSignals, rankRelated } from './recommendations.js';

const TTL = { home: 300_000, list: 60_000, detail: 60_000, genres: 600_000, people: 600_000, related: 300_000 };

/**
 * Read-side use cases: repository + cache + pure mapping. Mutations live in `admin.js`
 * and call `cache.clear()` after every successful write.
 */
export function createCatalogService({ repo, cache, now = () => new Date() }) {
  const service = {
    async genres() {
      return cache.wrap('genres', TTL.genres, async () => (await repo.listGenres()).filter((g) => g.id).map((g) => ({ id: g.id, name: g.name })));
    },

    async home() {
      return cache.wrap('home', TTL.home, async () => {
        const [rows, genres] = await Promise.all([repo.listCatalogSummary(), service.genres()]);
        return buildHomeRows(rows, genres, now());
      });
    },

    async listTitles(query) {
      return cache.wrap(`titles:${now().toISOString().slice(0, 10)}:${JSON.stringify(query)}`, TTL.list, async () => {
        const today = now().toISOString().slice(0, 10);
        const { rows, total } = await repo.listTitles({ ...query, today });
        return { items: rows.map(toListItem).filter((t) => t.id), total };
      });
    },

    async getTitle(id) {
      return cache.wrap(`title:${id}`, TTL.detail, async () => {
        const [row, credits] = await Promise.all([repo.getTitleRow(id), repo.getTitleCredits(id)]);
        if (!row) throw notFound('Title');
        return toDetail(row, credits);
      });
    },

    async titleGenres(id) {
      return toGenreRelations(await repo.getTitleGenres(id));
    },

    async titleCredits(id) {
      return toCredits(await repo.getTitleCredits(id));
    },

    async people(query) {
      return cache.wrap(`people:${JSON.stringify(query)}`, TTL.people, async () => {
        const { rows, total } = await repo.listPeople(query);
        return { items: rows.map(toPerson).filter((p) => p.id), total };
      });
    },

    async person(id) {
      const row = await repo.getPerson(id);
      if (!row) throw notFound('Person');
      return toPerson(row);
    },

    async personCredits(id) {
      if (!(await repo.getPerson(id))) throw notFound('Person');
      return toFilmography(await repo.getPersonCredits(id));
    },

    async search(q, limit = 20) {
      const [titles, people] = await Promise.all([service.listTitles({ q, limit, offset: 0, sort: 'year_desc' }), repo.searchPeople(q, limit)]);
      return { query: q, titles: titles.items, people: people.map(toPerson).filter((p) => p.id) };
    },

    /** Related titles with data-backed reasons. Four queries regardless of catalog size. */
    async related(id, limit = 8) {
      return cache.wrap(`related:${id}:${limit}`, TTL.related, async () => {
        const [row, creditRows, genres] = await Promise.all([repo.getTitleRow(id), repo.getTitleCredits(id), service.genres()]);
        if (!row) throw notFound('Title');

        const credits = toCredits(creditRows);
        const signals = peopleSignals(credits);
        const target = { id, type: row.type, year: row.year, genres: genreIdsOf(row), ...signals };
        const keyPeople = [...new Set([...signals.directorIds, ...signals.writerIds, ...signals.castIds.slice(0, 15)])];

        const [byGenre, peopleCredits] = await Promise.all([repo.titleIdsByGenres(target.genres, 300), repo.creditsByPeople(keyPeople, 500)]);
        const ids = [...new Set([...byGenre, ...peopleCredits.map((c) => c.title_id)])].filter((x) => x !== id).slice(0, 400);
        const rows = await repo.titlesByIds(ids);

        const creditsByTitle = new Map();
        for (const c of peopleCredits) creditsByTitle.set(c.title_id, [...(creditsByTitle.get(c.title_id) ?? []), c]);

        const candidates = rows.map((r) => ({
          id: r.id, title: r.title, type: r.type, year: r.year, genres: genreIdsOf(r), ...peopleSignals(creditsByTitle.get(r.id) ?? []),
        }));
        const ranked = rankRelated(target, candidates, {
          limit,
          genreNames: new Map(genres.map((g) => [g.id, g.name])),
          personNames: new Map(credits.map((c) => [c.personId, c.name])),
        });

        const byId = new Map(rows.map((r) => [r.id, r]));
        return ranked.map((r) => ({ ...toCard(byId.get(r.id)), score: r.score, reasons: r.reasons }));
      });
    },
  };
  return service;
}
