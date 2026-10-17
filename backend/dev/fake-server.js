/**
 * DEV-ONLY fake API. Serves the project's bundled seed catalog from memory through the REAL
 * Express app, so the frontends and E2E tests can run without a Supabase project.
 *
 *   npm run dev:fake --workspace=backend
 *
 * It is NOT a fallback: production code never imports this file, every response carries
 * `X-Data-Source: fake`, and all writes are lost on restart. Admin writes accept only the
 * fixed development token below.
 */
import { pathToFileURL } from 'node:url';
import express from 'express';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/logger.js';
import { loadConfig } from '../src/config.js';
import { buildSeedRows } from '../seed/transform.js';
import { GENRES } from '../data/genres.js';
import { PEOPLE } from '../data/people.js';
import { MOVIES } from '../data/movies.js';
import { SHOWS } from '../data/shows.js';
import { createFakeDb, createFakeRepo } from './fakeRepo.js';

export const DEV_ADMIN_TOKEN = 'dev-admin-token';

export function buildFakeSeed() {
  const rows = buildSeedRows({ GENRES, PEOPLE, MOVIES, SHOWS });
  const genresByTitle = new Map();
  for (const tg of rows.titleGenres) genresByTitle.set(tg.title_id, [...(genresByTitle.get(tg.title_id) ?? []), tg.genre_id]);
  return {
    genres: rows.genres,
    people: rows.people.map((p) => ({ ...p, image_url: p.image })),
    titles: rows.titles.map((t) => ({ ...t, genres: genresByTitle.get(t.id) ?? [] })),
    credits: rows.titleCredits,
  };
}

export function startFakeServer({ port = Number(process.env.PORT ?? 5000), quiet = false } = {}) {
  const { config } = loadConfig({
    SUPABASE_URL: 'https://fake.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_fake_for_dev_only',
    NODE_ENV: 'development',
    LOG_LEVEL: quiet ? 'error' : 'info',
  });
  const app = createApp({
    config,
    logger: createLogger({ level: config.logLevel }),
    db: createFakeDb(),
    repo: createFakeRepo(buildFakeSeed()),
    verifyToken: async (token) => (token === DEV_ADMIN_TOKEN ? { id: 'dev-admin', email: 'dev-admin@local.test', role: 'admin' } : null),
  });
  const outer = express();
  outer.use((_req, res, next) => { res.setHeader('X-Data-Source', 'fake'); next(); });
  outer.use(app);
  return new Promise((resolve) => {
    const server = outer.listen(port, () => {
      if (!quiet) console.log(`\n⚠  FAKE API on http://localhost:${port}/api — in-memory seed data, NOT Supabase. Admin token: ${DEV_ADMIN_TOKEN}\n`);
      resolve(server);
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startFakeServer();
}
