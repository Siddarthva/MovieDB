# MovieDB — Project Audit

Audit date: 2026-10-16. Branch `main`, commit `8e215d6`. Only `package-lock.json` was modified before work began.
No secrets appear in this document; env files were inspected by variable name only.

## 1. What was inspected

| Area | Result |
|---|---|
| Workspaces | npm workspaces: `backend`, `admin`, `montage`, `e2e`. Node v24, npm 11 locally. |
| Backend | Single 1075-line `backend/server.js` (Express 5, supabase-js 2). |
| Frontends | `montage` (React 19, Vite 8, Tailwind 4, framer-motion) and `admin` (React 19, react-router 7, Tailwind 4). |
| SQL | `database.sql`, `migration.sql`, `optimize_indexes.sql`, `supabase_indexes.sql`. |
| Deploy | `render.yaml` (backend only), `vercel.json` in both frontends. No Dockerfiles, no CI. |
| Tests | `e2e/` Playwright, 2 specs. No unit or integration tests. |
| Docker | Docker is **not installed** on the audit machine, so image builds cannot be verified here. |

## 2. Root cause of the known outage (verified)

The `fetch failed` errors, `/api/health` 503 and catalog 500s have one cause: **the Supabase project hostname configured in
`backend/.env`, `.env.local` and `.env.production` does not exist in DNS.**

Evidence (run 2026-10-16):

- `getaddrinfo ENOTFOUND <project-ref>.supabase.co` from Node.
- `Resolve-DnsName` returns "DNS name does not exist" via the system resolver and via 8.8.8.8. `supabase.com` and `api.supabase.com` resolve normally, so the machine is online.
- The URL is syntactically valid HTTPS; the key variable is set (46 characters).

Interpretation: the project was deleted, never finished provisioning, or the project ref was mistyped. A paused project is the other common cause, and a restore from the Supabase dashboard fixes it. **This needs the owner: check the dashboard and supply a valid project URL.** The code cannot fix it.

Consequences of the code design that made this hard to diagnose:

- The backend `/api/health` returned `error.message` verbatim. It did not say DNS vs. HTTP vs. RLS.
- `console.error('[api]', error)` plus a generic 500 gave no category.
- The `montage` client silently falls back to bundled local data when `/home` fails (see 3.4), so some failures looked like success.

Not verifiable until a database is reachable: that tables/columns exist, FK-embedding queries work, RLS state, real row counts.

## 3. Findings

### 3.1 Critical security

| # | Finding | Location |
|---|---|---|
| S1 | **Every write endpoint is unauthenticated** (POST/PUT/PATCH/DELETE on titles, people, credits, genres). Verified: unauthenticated `POST /api/people {}` reaches validation and returns 400 instead of 401. | `backend/server.js` |
| S2 | Backend talks to Supabase with the **anon key** under the name `VITE_SUPABASE_ANON_KEY`, and `database.sql` runs `DISABLE ROW LEVEL SECURITY` on all tables. Anyone who has the anon key (it is designed to be public) can write directly to the database via PostgREST, bypassing the API entirely. | `database.sql` §7 |
| S3 | `VITE_` prefix on backend variables invites copying them into frontend builds. Only public values may carry that prefix. | env files, `render.yaml` |
| S4 | CORS allow-list hardcodes `localhost:5174/5175`; no Helmet, no rate limiting, no body-size limit, no request timeout. | `server.js:438` |
| S5 | Global error handler returns `error.message` to the client, leaking DB internals. | `server.js:1069` |
| S6 | `.env.docker` sets `VITE_API_URL=http://backend:5000/api`. A browser cannot resolve a Docker service name. | `.env.docker` |

Positive: `.env*` files are gitignored and none are tracked (`git ls-files` confirms).

### 3.2 Correctness bugs

| # | Finding |
|---|---|
| B1 | `/api/home` sorts by `metrics.popularity` and `metrics.ratings.critic`. **Those fields do not exist** in the schema or in `normalizeTitle`, so "Trending", "Popular Shows" and "Critically Acclaimed" are all unsorted/identical orderings, labelled as if they carried signal. This violates the no-invented-metrics rule. |
| B2 | `/api/home` selects `censor_rating`, which `migration.sql`-era schemas may lack; code elsewhere has retry-on-missing-column fallbacks, but not here. |
| B3 | `/api/titles` returns a pruned shape: genre is the single `titles.genre` text column, `rating` is hard-coded `'NR'`, and `people` pointers are always empty. The frontend search and recommendation engines read exactly those fields, so they operate on empty data. |
| B4 | Hard-coded `cutoff = new Date('2026-04-05')` in both the API and the client defines "released". |
| B5 | `optimize_indexes.sql` / `supabase_indexes.sql` create `idx_titles_cine_score`, but `migration.sql` drops `cine_score`. Running them in that order fails; `supabase_indexes.sql` also lacks `IF NOT EXISTS`. |
| B6 | `POST /api/titles/:id/genres` is documented to accept three key spellings and the client sends one; harmless but untested. |
| B7 | `PATCH /api/titles/:id` cannot clear a field (null values are stripped). |
| B8 | `GET /api/people/:id` for a missing id returns 500 (`.single()` error), not 404. |
| B9 | `invalidateTitleCache` leaves `genres`/`people` caches stale; `invalidatePeopleCache` leaves title-detail caches (which embed people names) and `home` stale. |
| B10 | Port is read twice (`port` constant vs `process.env.PORT || 5000`); startup exits only if Supabase vars are missing, never validates URL shape. |
| B11 | `DELETE /api/titles/:id` performs three dependent deletes without a transaction (partial deletion possible). The FKs already declare `ON DELETE CASCADE`, so the manual deletes are redundant. |

### 3.3 Architecture and technical debt

- Backend is one file mixing config, caching, normalization, queries and routes. Schema drift is handled by repeated "retry without column X" blocks, which also mask genuine errors (`isMissingColumnError` matches any message containing the word "column").
- Duplicated seed data: `movies.js`, `people.js`, `genres.js` exist in both the repo root and `backend/data/`; the copies differ. `montage` imports the root copies and `backend/data/shows.js` by relative path outside its own package, which breaks isolated Docker builds.
- `backend/data/store.txt` and the root-level data files are not referenced by the running system except as noted.
- Seed data quality: most titles share one placeholder poster/backdrop/trailer, synopses are empty, and one poster is a Google Images redirect URL.
- `montage/src/App.jsx`, `App.css`, `index.css` and `utils/styles/globals.css` are unused Vite-template or duplicate files (`App.jsx` imports assets that do not exist).
- `render.yaml` runs `npm run build --workspace=backend`, but `backend` has no `build` script.
- No logging structure, no request IDs, no graceful shutdown, no timeouts.
- `montage` navigation is an in-memory history array. Pages have no URLs, no deep links, no browser back button, and search state cannot be shared.
- The client polls `/health` every 8 s and `useCatalog` re-fetches the full catalog every 8 s forever.

### 3.4 Fake-data masking (rule 9)

`montage/src/api/index.js` `loadCatalog()` catches any failure of `/home` and returns `loadLocalCatalog()` built from bundled JS files. The user then sees a catalog that looks healthy while the backend is down, and the "System Offline" banner can never be driven by a failed catalog request. The bundled data is also a stale, different dataset from the database. This must be removed; failures should surface as an explicit error state.

### 3.5 Frontend quality

- `eslint` on `montage`: 2 errors (`react-hooks/set-state-in-effect` in `TitleView.jsx`) and 1 warning. `admin` has no lint config.
- Production builds pass: `montage` main chunk 404 kB (123 kB gzip) with per-view lazy chunks; `admin` 267 kB (81 kB gzip).
- Styling mixes inline style objects with Tailwind and three CSS files. A token file exists only partially (`constants/designSystem.js`).

### 3.6 Database (from SQL files only; live schema unverified)

Tables: `genres`, `people`, `titles`, `title_genres`, `title_credits`. See `docs/DATABASE.md` once written. Notable: `titles.release_date` is `TEXT`, `titles.runtime` is `TEXT`, `titles.genre` duplicates `title_genres`, `people.image` and `people.image_url` duplicate each other, and there is no `updated_at` or created-by column. There are no popularity or rating columns.

### 3.7 Tests and CI

One E2E file adds a title through the admin UI (writes to whichever database the backend points at), and one checks hover overlays. Both depend on a live database and on unauthenticated writes. No CI exists.

## 4. Baseline results (before any change)

| Check | Result |
|---|---|
| `npm run build -w montage` | pass |
| `npm run build -w admin` | pass |
| `npm run lint -w montage` | **fail**: 2 errors, 1 warning |
| Backend start | starts, listens |
| `GET /api/health`, `/home`, `/titles`, `/genres` | no usable response (DNS failure on every Supabase call) |
| Unauthenticated `POST /api/people` | reaches handler (400 validation) — no auth |
| E2E | not run: needs a reachable database |
| Docker build | not possible, Docker not installed |

## 5. Prioritised risk list

1. Valid Supabase project / credentials (blocks all live verification).
2. Unauthenticated writes + RLS disabled + anon key on the server.
3. Silent local-data fallback in `montage`.
4. Fabricated ranking metrics on the home page.
5. Monolithic backend with swallowed schema errors.
6. No tests, no CI, no container build.
