import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL or Key is missing. Check backend/.env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const memoryCache = new Map();
const cacheGet = (key) => {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
};
const cacheSet = (key, value, ttlMs = 60000) => {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};
const cacheInvalidate = (key) => {
  memoryCache.delete(key);
};
const cacheInvalidateAll = () => {
  memoryCache.clear();
};


const app = express();
app.use(compression());
const port = Number(process.env.PORT ?? 5000);

const asString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const asNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const asArray = (value) => (Array.isArray(value) ? value : []);
const asLower = (value) => (asString(value) ? asString(value).toLowerCase() : null);

const ACTOR_ROLE_SET = new Set(['cast', 'actor', 'actress', 'voice_actor', 'voice actor']);

const normalizeRoleLabel = (role) => {
  const normalized = asLower(role);
  if (!normalized) return 'Crew';

  return normalized
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const inferDepartment = (role, department) => {
  const declared = asString(department);
  if (declared) return declared;
  return ACTOR_ROLE_SET.has(asLower(role) ?? '') ? 'Cast' : 'Crew';
};

const normalizeDepartment = (department) => {
  const value = asLower(department);
  if (value === 'cast') return 'Cast';
  if (value === 'crew') return 'Crew';
  return asString(department) ?? 'Crew';
};

const hasMissingColumnError = (error, columnName) => {
  const text = String(error?.message ?? '').toLowerCase();
  const column = String(columnName ?? '').toLowerCase();
  return text.includes(column) && (text.includes('column') || text.includes('schema cache'));
};

const isMissingColumnError = (error) => {
  const text = String(error?.message ?? '').toLowerCase();
  return text.includes('column') || text.includes('schema cache');
};

const TITLE_BASE_SELECT = 'id, title, type, year, release_date, poster, backdrop, trailer, synopsis, runtime';
const TITLE_OPTIONAL_SELECT = ', censor_rating';
const TITLE_RELATION_SELECT = ', title_genres(title_id, genre_id, genres:genre_id(id, name))';

function buildTitleSelect(includeOptionalFields = true, includeRelations = false) {
  return `${TITLE_BASE_SELECT}${includeOptionalFields ? TITLE_OPTIONAL_SELECT : ''}${includeRelations ? TITLE_RELATION_SELECT : ''}`;
}

const hashString = (value) => {
  let hash = 0;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const buildLookup = (rows, key) => rows.reduce((map, row) => {
  const value = row?.[key];
  if (value) map.set(value, row);
  return map;
}, new Map());

function normalizeGenreRelations(rows) {
  return asArray(rows)
    .map((row) => {
      const genre = row?.genres ?? row?.genre ?? null;
      return {
        titleId: asString(row?.title_id),
        genreId: asString(row?.genre_id ?? genre?.id),
        name: asString(genre?.name),
      };
    })
    .filter((item) => item.titleId && item.genreId);
}

function normalizeCredits(creditRows) {
  return asArray(creditRows).map((credit) => {
    const personValue = credit?.people ?? credit?.person ?? null;
    const person = Array.isArray(personValue) ? personValue[0] : personValue;
    const roleRaw = asString(credit?.role);
    const department = normalizeDepartment(inferDepartment(roleRaw, credit?.department));

    return {
      personId: asString(credit?.person_id ?? person?.id),
      name: asString(person?.name),
      role: normalizeRoleLabel(roleRaw),
      roleKey: asLower(roleRaw),
      department,
      imageUrl: asString(person?.image_url ?? person?.image),
    };
  }).filter((item) => item.personId && item.name);
}

async function selectTitleCreditsWithPeople(titleId) {
  let query = supabase
    .from('title_credits')
    .select('title_id, person_id, role, department, people:person_id(id, name, image)')
    .eq('title_id', titleId);

  let response = await query;

  if (response.error && isMissingColumnError(response.error)) {
    response = await supabase
      .from('title_credits')
      .select('title_id, person_id, role, people:person_id(id, name, image)')
      .eq('title_id', titleId);
  }

  if (response.error && hasMissingColumnError(response.error, 'department')) {
    response = await supabase
      .from('title_credits')
      .select('title_id, person_id, role, people:person_id(id, name, image)')
      .eq('title_id', titleId);
  }

  if (response.error) throw response.error;
  return response.data ?? [];
}

function groupCredits(credits) {
  const cast = [];
  const crew = [];

  credits.forEach((credit) => {
    if (normalizeDepartment(credit.department) === 'Cast') cast.push(credit);
    else crew.push(credit);
  });

  return { Cast: cast, Crew: crew };
}

function derivePeoplePointers(credits) {
  const castIds = [];
  const writerIds = [];
  let directorId = null;
  let composerId = null;

  credits.forEach((credit) => {
    const role = credit.roleKey ?? '';
    if (ACTOR_ROLE_SET.has(role)) castIds.push(credit.personId);
    if (role === 'writer' || role === 'screenwriter') writerIds.push(credit.personId);
    if (role === 'director' && !directorId) directorId = credit.personId;
    if (role === 'composer' && !composerId) composerId = credit.personId;
  });

  return {
    castIds: [...new Set(castIds)],
    writerIds: [...new Set(writerIds)],
    directorId,
    composerId,
  };
}

function normalizeTitle(row, joinedCredits = null) {
  const genreRows = asArray(row.title_genres);
  const creditRows = joinedCredits ?? asArray(row.title_credits);
  const genres = genreRows.map((item) => asString(item.genre_id)).filter(Boolean);
  const primaryGenre = asString(row.genre);
  const credits = normalizeCredits(creditRows);
  const creditGroups = groupCredits(credits);
  const pointers = derivePeoplePointers(credits);

  const title = {
    id: asString(row.id),
    type: asString(row.type),
    title: asString(row.title),
    year: asNumber(row.year),
    releaseDate: asString(row.release_date),
    censor_rating: asString(row.censor_rating ?? row.rating),
    media: {
      poster: asString(row.poster),
      backdrop: asString(row.backdrop),
      trailer: asString(row.trailer),
    },
    details: {
      synopsis: asString(row.synopsis),
      runtime: asString(row.runtime),
    },
    classification: {
      genres: genres.length ? genres : (primaryGenre ? [primaryGenre] : []),
      rating: asString(row.rating ?? row.censor_rating),
    },
    people: {
      directorId: pointers.directorId,
      writerIds: pointers.writerIds,
      castIds: pointers.castIds,
      composerId: pointers.composerId,
    },
    credits,
    creditGroups,
    showMeta: null,
    episodes: [],
  };

  return title;
}

function normalizePerson(row) {
  return {
    id: asString(row.id),
    name: asString(row.name),
    roles: asArray(row.roles),
    image: asString(row.image ?? row.image_url),
    imageUrl: asString(row.image_url ?? row.image),
    image_url: asString(row.image_url ?? row.image),
  };
}

async function fetchPeopleRows() {
  let response = await supabase.from('people').select('id, name, image_url').order('name');

  if (response.error && isMissingColumnError(response.error)) {
    response = await supabase.from('people').select('id, name, image').order('name');
  }

  if (response.error) throw response.error;
  return response.data ?? [];
}

async function fetchPersonById(personId) {
  let response = await supabase
    .from('people')
    .select('id, name, image_url')
    .eq('id', personId)
    .single();

  if (response.error && isMissingColumnError(response.error)) {
    response = await supabase
      .from('people')
      .select('id, name, image')
      .eq('id', personId)
      .single();
  }

  if (response.error) throw response.error;
  return response.data;
}

async function insertPerson(payload) {
  let response = await supabase
    .from('people')
    .insert({
      id: asString(payload.id),
      name: asString(payload.name),
      image_url: asString(payload.image_url ?? payload.imageUrl ?? payload.image),
    })
    .select('*')
    .single();

  if (response.error && isMissingColumnError(response.error)) {
    response = await supabase
      .from('people')
      .insert({
        id: asString(payload.id),
        name: asString(payload.name),
        image: asString(payload.image_url ?? payload.imageUrl ?? payload.image),
      })
      .select('*')
      .single();
  }

  if (response.error) throw response.error;
  return response.data;
}

async function updatePersonById(personId, payload) {
  const patch = {
    name: asString(payload.name),
    image_url: asString(payload.image_url ?? payload.imageUrl ?? payload.image),
  };

  const cleanedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== null),
  );

  let response = await supabase
    .from('people')
    .update(cleanedPatch)
    .eq('id', personId)
    .select('*')
    .single();

  if (response.error && isMissingColumnError(response.error)) {
    const fallbackPatch = {
      name: patch.name,
      image: patch.image_url,
    };

    const cleanedFallback = Object.fromEntries(
      Object.entries(fallbackPatch).filter(([, value]) => value !== null),
    );

    response = await supabase
      .from('people')
      .update(cleanedFallback)
      .eq('id', personId)
      .select('*')
      .single();
  }

  if (response.error) throw response.error;
  return response.data;
}

function normalizePersonFilmography(rows) {
  return asArray(rows)
    .map((row) => {
      const titleValue = row?.titles ?? row?.title ?? null;
      const title = Array.isArray(titleValue) ? titleValue[0] : titleValue;
      const roleRaw = asString(row?.role);

      return {
        titleId: asString(row?.title_id ?? title?.id),
        title: asString(title?.title),
        year: asNumber(title?.year),
        type: asString(title?.type),
        role: normalizeRoleLabel(roleRaw),
        department: normalizeDepartment(inferDepartment(roleRaw, row?.department)),
      };
    })
    .filter((item) => item.titleId && item.title);
}

async function fetchCatalog() {
  const [genresRes, peopleRes, titlesRes] = await Promise.all([
    supabase.from('genres').select('*').order('name'),
    supabase.from('people').select('*').order('name'),
    supabase.from('titles').select(buildTitleSelect(true, false)).order('year', { ascending: false }),
  ]);

  const titlesResFallback = titlesRes.error && isMissingColumnError(titlesRes.error)
    ? await supabase.from('titles').select(buildTitleSelect(false, false)).order('year', { ascending: false })
    : titlesRes;

  const error = genresRes.error || peopleRes.error || titlesResFallback.error;
  if (error) throw error;

  const genres = (genresRes.data ?? []).map((genre) => ({
    id: asString(genre.id),
    name: asString(genre.name),
  })).filter((genre) => genre.id);

  const people = (peopleRes.data ?? []).map(normalizePerson).filter((person) => person.id);
  const titles = (titlesResFallback.data ?? [])
    .map((row) => normalizeTitle(row))
    .filter((title) => title.id);

  return {
    genres,
    people,
    titles,
    titleLookup: buildLookup(titles, 'id'),
    peopleLookup: buildLookup(people, 'id'),
  };
}

let catalogPromise = null;

function invalidateCatalog() {
  catalogPromise = null;
  cacheInvalidateAll();
}

function invalidateTitleCache(titleId = null) {
  catalogPromise = null;
  cacheInvalidate('titles_all');
  cacheInvalidate('home');
  if (titleId) {
    cacheInvalidate(`title_detail_${titleId}`);
  }
}

function invalidatePeopleCache(personId = null) {
  catalogPromise = null;
  cacheInvalidate('people');
  if (personId) {
    cacheInvalidate(`person_detail_${personId}`);
  }
}

async function getCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetchCatalog();
  }
  return catalogPromise;
}

const allowedOrigins = [
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
}));
app.use(express.json());

app.get('/api/home', async (req, res, next) => {
  try {
    const cached = cacheGet('home');
    if (cached) {
      res.json(cached);
      return;
    }

    const { data: rawTitles, error } = await supabase
      .from('titles')
      .select('id, title, type, year, release_date, poster, backdrop, censor_rating')
      .order('year', { ascending: false });

    if (error) throw error;

    const titles = (rawTitles ?? []).map((row) => normalizeTitle(row));

    const cutoff = new Date('2026-04-05T00:00:00Z');

    const trending = titles
      .filter((t) => t.type === 'movie')
      .sort((a, b) => (b.metrics?.popularity ?? 0) - (a.metrics?.popularity ?? 0))
      .slice(0, 10);

    const latest = titles
      .filter((t) => t.releaseDate && new Date(t.releaseDate) <= cutoff)
      .sort((a, b) => b.year - a.year || new Date(b.releaseDate) - new Date(a.releaseDate))
      .slice(0, 10);

    const shows = titles
      .filter((t) => t.type === 'show')
      .sort((a, b) => (b.metrics?.popularity ?? 0) - (a.metrics?.popularity ?? 0))
      .slice(0, 10);

    const acclaimed = titles
      .sort((a, b) => (b.metrics?.ratings?.critic ?? 0) - (a.metrics?.ratings?.critic ?? 0))
      .slice(0, 10);

    const recent = titles
      .sort((a, b) => b.year - a.year)
      .slice(0, 10);

    const pruneHomeTitle = (t) => ({
      id: t.id,
      title: t.title,
      poster: t.poster ?? t.media?.poster ?? null,
      backdrop: t.backdrop ?? t.media?.backdrop ?? null,
      censor_rating: t.censor_rating ?? t.classification?.rating ?? 'NR',
      year: t.year,
      type: t.type
    });

    const result = [
      { id: 'trending_movies', label: 'Trending Movies', titles: trending.map(pruneHomeTitle) },
      { id: 'latest_releases', label: 'Latest Releases', titles: latest.map(pruneHomeTitle) },
      { id: 'popular_shows', label: 'Popular TV Shows', titles: shows.map(pruneHomeTitle) },
      { id: 'critically_acclaimed', label: 'Critically Acclaimed', titles: acclaimed.map(pruneHomeTitle) },
      { id: 'recently_added', label: 'Recently Added', titles: recent.map(pruneHomeTitle) },
    ];

    cacheSet('home', result, 300000); // 5 minutes TTL
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase
      .from('titles')
      .select('id')
      .limit(1);

    if (error) {
      res.status(503).json({ ok: false, database: 'offline', message: error.message });
      return;
    }

    res.json({ ok: true, database: 'online' });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'offline', message: error.message || 'Supabase is unreachable' });
  }
});

app.get('/api/genres', async (req, res, next) => {
  try {
    const cached = cacheGet('genres');
    if (cached) {
      res.json(cached);
      return;
    }
    const { data, error } = await supabase.from('genres').select('id, name').order('name');
    if (error) throw error;
    const result = (data ?? []).map((genre) => ({ id: asString(genre.id), name: asString(genre.name) })).filter((genre) => genre.id);
    cacheSet('genres', result, 600000);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/people', async (req, res, next) => {
  try {
    const cached = cacheGet('people');
    if (cached) {
      res.json(cached);
      return;
    }
    const peopleRows = await fetchPeopleRows();
    const result = peopleRows.map(normalizePerson).filter((person) => person.id);
    cacheSet('people', result, 600000);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/people/:id', async (req, res, next) => {
  try {
    const personId = req.params.id;
    const row = await fetchPersonById(personId);
    res.json(normalizePerson(row));
  } catch (error) {
    next(error);
  }
});

app.get('/api/people/:id/credits', async (req, res, next) => {
  try {
    const personId = req.params.id;

    let response = await supabase
      .from('title_credits')
      .select('title_id, role, department, titles:title_id(id, title, year, type)')
      .eq('person_id', personId);

    if (response.error && hasMissingColumnError(response.error, 'department')) {
      response = await supabase
        .from('title_credits')
        .select('title_id, role, titles:title_id(id, title, year, type)')
        .eq('person_id', personId);
    }

    if (response.error) throw response.error;

    res.json(normalizePersonFilmography(response.data));
  } catch (error) {
    next(error);
  }
});

app.post('/api/people', async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    const row = {
      id: asString(payload.id),
      name: asString(payload.name),
      image_url: asString(payload.image_url ?? payload.imageUrl ?? payload.image),
    };

    if (!row.id || !row.name) {
      res.status(400).json({ message: 'id and name are required' });
      return;
    }

    const data = await insertPerson(row);

    invalidatePeopleCache(row.id);
    res.status(201).json(normalizePerson(data));
  } catch (error) {
    next(error);
  }
});

app.put('/api/people/:id', async (req, res, next) => {
  try {
    const personId = req.params.id;
    const payload = req.body ?? {};

    const hasName = asString(payload.name);
    const hasImage = payload.image_url !== undefined || payload.imageUrl !== undefined || payload.image !== undefined;

    if (!hasName && !hasImage) {
      res.status(400).json({ message: 'No valid fields provided for update' });
      return;
    }

    const data = await updatePersonById(personId, payload);

    invalidatePeopleCache(personId);
    res.json(normalizePerson(data));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/people/:id', async (req, res, next) => {
  try {
    const personId = req.params.id;
    const payload = req.body ?? {};

    const hasName = asString(payload.name);
    const hasImage = payload.image_url !== undefined || payload.imageUrl !== undefined || payload.image !== undefined;

    if (!hasName && !hasImage) {
      res.status(400).json({ message: 'No valid fields provided for update' });
      return;
    }

    const data = await updatePersonById(personId, payload);

    invalidatePeopleCache(personId);
    res.json(normalizePerson(data));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/people/:id', async (req, res, next) => {
  try {
    const personId = req.params.id;

    const { error: creditsError } = await supabase
      .from('title_credits')
      .delete()
      .eq('person_id', personId);
    if (creditsError) throw creditsError;

    const { error: personError } = await supabase
      .from('people')
      .delete()
      .eq('id', personId);
    if (personError) throw personError;

    invalidatePeopleCache(personId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/titles', async (req, res, next) => {
  try {
    const cached = cacheGet('titles_all');
    if (cached) {
      res.json(cached);
      return;
    }
    const { data, error } = await supabase
      .from('titles')
      .select('id, title, type, year, poster, genre')
      .order('year', { ascending: false });

    if (error) throw error;

    const titles = (data ?? []).map((row) => ({
      id: asString(row.id),
      title: asString(row.title),
      type: asString(row.type),
      year: asNumber(row.year),
      poster: asString(row.poster),
      classification: {
        genres: row.genre ? [row.genre] : [],
        rating: 'NR'
      },
      people: {
        directorId: null,
        writerIds: [],
        castIds: []
      }
    })).filter((title) => title.id);

    cacheSet('titles_all', titles, 60000);
    res.json(titles);
  } catch (error) {
    next(error);
  }
});

const getTitleDetail = async (req, res, next) => {
  try {
    const titleId = req.params.id;
    const cacheKey = `title_detail_${titleId}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [titleRes, creditsRes] = await Promise.all([
      supabase
        .from('titles')
        .select(buildTitleSelect(true, true))
        .eq('id', titleId)
        .single(),
      supabase
        .from('title_credits')
        .select('title_id, person_id, role, people:person_id(id, name, image)')
        .eq('title_id', titleId),
    ]);

    const titleResFallback = titleRes.error && isMissingColumnError(titleRes.error)
      ? await supabase
        .from('titles')
        .select(buildTitleSelect(false, true))
        .eq('id', titleId)
        .single()
      : titleRes;

    if (titleResFallback.error) throw titleResFallback.error;
    if (creditsRes.error) throw creditsRes.error;

    if (!titleResFallback.data) {
      res.status(404).json({ message: 'Title not found' });
      return;
    }

    const title = normalizeTitle(titleResFallback.data, creditsRes.data ?? []);
    cacheSet(cacheKey, title, 60000); // 1 min TTL
    res.json(title);
  } catch (error) {
    next(error);
  }
};

app.get('/api/title/:id', getTitleDetail);
app.get('/api/titles/:id', getTitleDetail);

app.get('/api/titles/:id/genres', async (req, res, next) => {
  try {
    const titleId = req.params.id;
    const { data, error } = await supabase
      .from('title_genres')
      .select('title_id, genre_id, genres:genre_id(id, name)')
      .eq('title_id', titleId)
      .order('genre_id');

    if (error) throw error;

    res.json(normalizeGenreRelations(data));
  } catch (error) {
    next(error);
  }
});

app.get('/api/titles/:id/credits', async (req, res, next) => {
  try {
    const titleId = req.params.id;
    const rows = await selectTitleCreditsWithPeople(titleId);
    const credits = normalizeCredits(rows);
    res.status(200).json(credits);
  } catch (error) {
    next(error);
  }
});

app.post('/api/titles/:id/genres', async (req, res, next) => {
  try {
    const titleId = req.params.id;
    const payload = req.body ?? {};
    const genreId = asString(payload.genre_id ?? payload.genreId ?? payload.id);

    if (!titleId || !genreId) {
      res.status(400).json({ message: 'title id and genreId are required' });
      return;
    }

    const { error } = await supabase
      .from('title_genres')
      .upsert({ title_id: titleId, genre_id: genreId }, { onConflict: 'title_id,genre_id' });

    if (error) throw error;

    const { data, error: fetchError } = await supabase
      .from('title_genres')
      .select('title_id, genre_id, genres:genre_id(id, name)')
      .eq('title_id', titleId)
      .order('genre_id');

    if (fetchError) throw fetchError;

    invalidateTitleCache(titleId);
    res.status(201).json(normalizeGenreRelations(data));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/titles/:titleId/genres/:genreId', async (req, res, next) => {
  try {
    const { titleId, genreId } = req.params;

    if (!titleId || !genreId) {
      res.status(400).json({ message: 'titleId and genreId are required' });
      return;
    }

    const { error } = await supabase
      .from('title_genres')
      .delete()
      .eq('title_id', titleId)
      .eq('genre_id', genreId);

    if (error) throw error;

    invalidateTitleCache(titleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/api/titles/:id/credits', async (req, res, next) => {
  try {
    const titleId = req.params.id;
    const payload = req.body ?? {};
    const role = asString(payload.role);
    const personId = asString(payload.person_id ?? payload.personId);
    const department = normalizeDepartment(inferDepartment(role, payload.department));

    if (!titleId || !personId || !role) {
      res.status(400).json({ message: 'title id, personId, and role are required' });
      return;
    }

    const row = {
      title_id: titleId,
      person_id: personId,
      role: role.toLowerCase().replace(/\s+/g, '_'),
      department: department.toLowerCase(),
    };

    let { error } = await supabase
      .from('title_credits')
      .upsert(row, { onConflict: 'title_id,person_id,role' });

    if (error && hasMissingColumnError(error, 'department')) {
      const fallbackRow = {
        title_id: titleId,
        person_id: personId,
        role: role.toLowerCase().replace(/\s+/g, '_'),
      };

      ({ error } = await supabase
        .from('title_credits')
        .upsert(fallbackRow, { onConflict: 'title_id,person_id,role' }));
    }

    if (error) throw error;

    invalidateTitleCache(titleId);

    const rows = await selectTitleCreditsWithPeople(titleId);
    const credits = normalizeCredits(rows);
    res.status(201).json(credits);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/titles/:titleId/credits/:personId', async (req, res, next) => {
  try {
    const { titleId, personId } = req.params;

    if (!titleId || !personId) {
      res.status(400).json({ message: 'titleId and personId are required' });
      return;
    }

    const { error } = await supabase
      .from('title_credits')
      .delete()
      .eq('title_id', titleId)
      .eq('person_id', personId);

    if (error) throw error;

    invalidateTitleCache(titleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.delete('/api/titles/:id/credits', async (req, res, next) => {
  try {
    const titleId = req.params.id;
    const payload = req.body ?? {};
    const personId = asString(payload.personId);
    const role = asString(payload.role);

    if (!titleId || !personId || !role) {
      res.status(400).json({ message: 'title id, personId, and role are required' });
      return;
    }

    const { error } = await supabase
      .from('title_credits')
      .delete()
      .eq('title_id', titleId)
      .eq('person_id', personId)
      .eq('role', role.toLowerCase().replace(/\s+/g, '_'));

    if (error) throw error;

    invalidateTitleCache(titleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/api/titles', async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    const row = {
      id: asString(payload.id),
      title: asString(payload.title),
      type: asString(payload.type),
      year: asNumber(payload.year),
      release_date: asString(payload.releaseDate),
      poster: asString(payload.poster),
      backdrop: asString(payload.backdrop),
      trailer: asString(payload.trailer),
      synopsis: asString(payload.synopsis),
      runtime: asString(payload.runtime),
      censor_rating: asString(payload.censor_rating ?? payload.censorRating),
    };

    if (!row.id || !row.title || !row.type) {
      res.status(400).json({ message: 'id, title, and type are required' });
      return;
    }

    let response = await supabase
      .from('titles')
      .insert(row)
      .select('*')
      .single();

    if (response.error) throw response.error;

    invalidateTitleCache(row.id);
    res.status(201).json(response.data);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/titles/:id', async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    const patch = {
      title: asString(payload.title),
      type: asString(payload.type),
      year: asNumber(payload.year),
      release_date: asString(payload.releaseDate),
      poster: asString(payload.poster),
      backdrop: asString(payload.backdrop),
      trailer: asString(payload.trailer),
      synopsis: asString(payload.synopsis),
      runtime: asString(payload.runtime),
      censor_rating: asString(payload.censor_rating ?? payload.censorRating),
    };

    const cleanedPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== null),
    );

    if (!Object.keys(cleanedPatch).length) {
      res.status(400).json({ message: 'No valid fields provided for update' });
      return;
    }

    let response = await supabase
      .from('titles')
      .update(cleanedPatch)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (response.error) throw response.error;

    invalidateTitleCache(req.params.id);
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/titles/:id', async (req, res, next) => {
  try {
    const titleId = req.params.id;

    const { error: creditsError } = await supabase
      .from('title_credits')
      .delete()
      .eq('title_id', titleId);
    if (creditsError) throw creditsError;

    const { error: genresError } = await supabase
      .from('title_genres')
      .delete()
      .eq('title_id', titleId);
    if (genresError) throw genresError;

    const { error: titleError } = await supabase
      .from('titles')
      .delete()
      .eq('id', titleId);
    if (titleError) throw titleError;

    invalidateTitleCache(titleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error('[api]', error);
  res.status(500).json({ message: error.message || 'Internal server error' });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Express API listening on http://localhost:${port}`);
});