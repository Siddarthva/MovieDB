import { Router } from 'express';
import { checkDatabase } from './db/client.js';
import { AppError, notFound } from './errors.js';
import { toCredits, toGenreRelations, toPerson } from './services/normalize.js';
import {
  creditBody, creditDeleteBody, creditDeleteQuery, genreCreateBody, genrePatchBody, idParam, peopleListQuery,
  personCreateBody, personPatchBody, relatedQuery, searchQuery, titleCreateBody, titleCreditParams, titleGenreBody,
  titleGenreParams, titleListQuery, titlePatchBody, validate,
} from './validation.js';

const HEALTH_TTL_MS = 5000;

const pick = (obj, ...keys) => {
  for (const key of keys) if (obj[key] !== undefined) return obj[key];
  return undefined;
};

/** Convert API camelCase / legacy fields to database columns, skipping fields the client did not send. */
function titleRow(body) {
  const columns = {
    title: body.title,
    type: body.type,
    year: body.year,
    release_date: body.releaseDate,
    poster: body.poster,
    backdrop: body.backdrop,
    trailer: body.trailer,
    synopsis: body.synopsis,
    runtime: body.runtime,
    censor_rating: pick(body, 'censor_rating', 'censorRating'),
  };
  return Object.fromEntries(Object.entries(columns).filter(([, v]) => v !== undefined));
}

const personRow = (body) => {
  const image = pick(body, 'image_url', 'imageUrl', 'image');
  return Object.fromEntries(Object.entries({ name: body.name, image_url: image }).filter(([, v]) => v !== undefined));
};

const slugRole = (role) => role.trim().toLowerCase().replace(/\s+/g, '_');

function setTotal(res, total) {
  res.setHeader('X-Total-Count', String(total));
}

export function healthRoutes({ db, config }) {
  const router = Router();
  let last = null;

  const probe = async () => {
    if (last && Date.now() - last.at < HEALTH_TTL_MS) return last.result;
    const result = await checkDatabase(db);
    last = { at: Date.now(), result };
    return result;
  };

  // Liveness: the process answers. Says nothing about dependencies.
  router.get('/live', (_req, res) => res.json({ status: 'live' }));

  // Readiness: configuration valid AND the database answers queries against the expected schema.
  router.get('/ready', async (_req, res) => {
    const database = await probe();
    res.status(database.status === 'up' ? 200 : 503).json({ status: database.status === 'up' ? 'ready' : 'not_ready', database: database.status === 'up' ? 'online' : 'offline' });
  });

  // Detailed status for operators and the 1.x frontend contract (`ok`, `database`).
  router.get('/', async (_req, res) => {
    const database = await probe();
    const up = database.status === 'up';
    res.status(up ? 200 : 503).json({
      ok: up,
      database: up ? 'online' : 'offline',
      checks: {
        process: { status: 'up', uptimeSeconds: Math.round(process.uptime()) },
        config: { status: 'valid', supabaseHost: config.supabaseHost, keyKind: config.keyKind },
        database,
      },
    });
  });
  return router;
}

export function publicRoutes({ catalog }) {
  const router = Router();

  router.get('/home', async (_req, res) => res.json(await catalog.home()));
  router.get('/genres', async (_req, res) => res.json(await catalog.genres()));

  router.get('/titles', validate('query', titleListQuery), async (req, res) => {
    const { limit = 50, offset = 0, ...rest } = req.valid.query;
    const { items, total } = await catalog.listTitles({ ...rest, limit, offset });
    setTotal(res, total);
    res.json(items);
  });

  const titleDetail = async (req, res) => res.json(await catalog.getTitle(req.valid.params.id));
  router.get('/titles/:id', validate('params', idParam), titleDetail);
  router.get('/title/:id', validate('params', idParam), titleDetail); // 1.x alias
  router.get('/titles/:id/genres', validate('params', idParam), async (req, res) => res.json(await catalog.titleGenres(req.valid.params.id)));
  router.get('/titles/:id/credits', validate('params', idParam), async (req, res) => res.json(await catalog.titleCredits(req.valid.params.id)));
  router.get('/titles/:id/related', validate('params', idParam), validate('query', relatedQuery), async (req, res) => {
    res.json(await catalog.related(req.valid.params.id, req.valid.query.limit));
  });

  router.get('/people', validate('query', peopleListQuery), async (req, res) => {
    const { items, total } = await catalog.people(req.valid.query);
    setTotal(res, total);
    res.json(items);
  });
  router.get('/people/:id', validate('params', idParam), async (req, res) => res.json(await catalog.person(req.valid.params.id)));
  router.get('/people/:id/credits', validate('params', idParam), async (req, res) => res.json(await catalog.personCredits(req.valid.params.id)));

  router.get('/search', validate('query', searchQuery), async (req, res) => res.json(await catalog.search(req.valid.query.q, req.valid.query.limit)));

  return router;
}

/** Every route here is mounted behind requireAdmin and the write rate limiter. */
export function adminRoutes({ repo, cache }) {
  const router = Router();
  const changed = () => cache.clear();

  router.get('/auth/me', (req, res) => res.json({ id: req.user.id, email: req.user.email, role: req.user.role }));

  // titles
  router.post('/titles', validate('body', titleCreateBody), async (req, res) => {
    const row = await repo.insertTitle({ id: req.valid.body.id, ...titleRow(req.valid.body) });
    changed();
    res.status(201).json(row);
  });
  router.patch('/titles/:id', validate('params', idParam), validate('body', titlePatchBody), async (req, res) => {
    const patch = titleRow(req.valid.body);
    if (!Object.keys(patch).length) throw new AppError(400, 'bad_request', 'No valid fields provided for update.');
    const row = await repo.updateTitle(req.valid.params.id, patch);
    if (!row) throw notFound('Title');
    changed();
    res.json(row);
  });
  router.delete('/titles/:id', validate('params', idParam), async (req, res) => {
    if (!(await repo.deleteTitle(req.valid.params.id))) throw notFound('Title');
    changed();
    res.status(204).end();
  });

  // title <-> genres
  router.post('/titles/:id/genres', validate('params', idParam), validate('body', titleGenreBody), async (req, res) => {
    const { id } = req.valid.params;
    await repo.addTitleGenre(id, pick(req.valid.body, 'genre_id', 'genreId', 'id'));
    changed();
    res.status(201).json(toGenreRelations(await repo.getTitleGenres(id)));
  });
  router.delete('/titles/:titleId/genres/:genreId', validate('params', titleGenreParams), async (req, res) => {
    if (!(await repo.removeTitleGenre(req.valid.params.titleId, req.valid.params.genreId))) throw notFound('Genre assignment');
    changed();
    res.status(204).end();
  });

  // credits
  router.post('/titles/:id/credits', validate('params', idParam), validate('body', creditBody), async (req, res) => {
    const { id } = req.valid.params;
    const body = req.valid.body;
    const department = body.department ? body.department.toLowerCase() : (['cast', 'actor', 'actress', 'voice_actor'].includes(slugRole(body.role)) ? 'cast' : 'crew');
    await repo.upsertCredit({ title_id: id, person_id: pick(body, 'person_id', 'personId'), role: slugRole(body.role), department });
    changed();
    res.status(201).json(toCredits(await repo.getTitleCredits(id)));
  });
  // Removes one role when ?role= is given, otherwise every role the person has on the title.
  router.delete('/titles/:titleId/credits/:personId', validate('params', titleCreditParams), validate('query', creditDeleteQuery), async (req, res) => {
    const { titleId, personId } = req.valid.params;
    const role = req.valid.query.role ? slugRole(req.valid.query.role) : undefined;
    if (!(await repo.deleteCredit({ titleId, personId, role }))) throw notFound('Credit');
    changed();
    res.status(204).end();
  });
  router.delete('/titles/:id/credits', validate('params', idParam), validate('body', creditDeleteBody), async (req, res) => {
    const { personId, role } = req.valid.body;
    if (!(await repo.deleteCredit({ titleId: req.valid.params.id, personId, role: slugRole(role) }))) throw notFound('Credit');
    changed();
    res.status(204).end();
  });

  // people
  router.post('/people', validate('body', personCreateBody), async (req, res) => {
    const row = await repo.insertPerson({ id: req.valid.body.id, ...personRow(req.valid.body) });
    changed();
    res.status(201).json(toPerson(row));
  });
  const updatePerson = async (req, res) => {
    const patch = personRow(req.valid.body);
    if (!Object.keys(patch).length) throw new AppError(400, 'bad_request', 'No valid fields provided for update.');
    const row = await repo.updatePerson(req.valid.params.id, patch);
    if (!row) throw notFound('Person');
    changed();
    res.json(toPerson(row));
  };
  router.put('/people/:id', validate('params', idParam), validate('body', personPatchBody), updatePerson);
  router.patch('/people/:id', validate('params', idParam), validate('body', personPatchBody), updatePerson);
  router.delete('/people/:id', validate('params', idParam), async (req, res) => {
    // title_credits rows cascade (ON DELETE CASCADE).
    if (!(await repo.deletePerson(req.valid.params.id))) throw notFound('Person');
    changed();
    res.status(204).end();
  });

  // genres
  router.post('/genres', validate('body', genreCreateBody), async (req, res) => {
    const row = await repo.insertGenre(req.valid.body);
    changed();
    res.status(201).json(row);
  });
  router.patch('/genres/:id', validate('params', idParam), validate('body', genrePatchBody), async (req, res) => {
    const row = await repo.updateGenre(req.valid.params.id, req.valid.body);
    if (!row) throw notFound('Genre');
    changed();
    res.json(row);
  });
  router.delete('/genres/:id', validate('params', idParam), async (req, res) => {
    if (!(await repo.deleteGenre(req.valid.params.id))) throw notFound('Genre');
    changed();
    res.status(204).end();
  });

  return router;
}
