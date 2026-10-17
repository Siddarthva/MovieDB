# MovieDB 2.0 — Implementation Plan

Status legend: ✅ done and verified · 🟡 done, not verifiable here · ⬜ not started. Updated at the end of each stage.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Server DB credential | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Legacy `VITE_SUPABASE_*` still read with a warning so existing `.env` files keep starting. | The anon key only works for writes because RLS is disabled — a hole. `VITE_` names invite leaking into frontend bundles. |
| Auth | Supabase Auth JWT in `Authorization: Bearer`; backend verifies with `auth.getUser(token)` and requires `app_metadata.role === 'admin'`. Writes are **denied** without it; there is no bypass flag. | Same vendor as the DB; no new service; roles set only server-side (`app_metadata` is not user-editable). |
| Validation | `zod` | Small, declarative, one dependency. |
| Logging/ids | Own 30-line JSON logger, `crypto.randomUUID()` | Avoids a dependency. |
| Tests | `node:test` + a fake repository; no network. | Zero deps, deterministic. |
| Ranking | Remove "Trending" and "Critically Acclaimed" rows (no data). Replace with labelled, data-backed rows: Latest Releases (by `release_date`), New Movies, New TV Shows, and per-genre rows. Each row carries `method`. | No popularity or critic data exists. |
| Collection responses | Existing list routes stay arrays; pagination via `limit`/`offset`, total in `X-Total-Count`. | Preserves contract. |
| Routing (montage) | Add `react-router-dom` (already used by admin). | URL-persisted filters and deep links require it. |
| Container base | `node:24-alpine` build, `nginx:alpine` for static | Node 24 is the local runtime; nginx for SPAs. |

## Stages

| Stage | Scope | Status |
|---|---|---|
| A | Audit, baseline, these docs | ✅ |
| B | Config validation, DB client with timeout, error classification, liveness/readiness/db health, structured logging | see log |
| C | Backend split, helmet, rate limit, CORS config, body limit, request ids, validation, consistent errors, auth on every write, cache invalidation, graceful shutdown, unit tests | see log |
| D | montage: remove silent fallback, router, tokens, error/empty states, a11y | see log |
| E | Server-side search/filter/pagination, deterministic related-titles with explanations, tests | see log |
| F | Admin: login, token attach, pagination/search, confirm deletes, error display | see log |
| G | Dockerfiles, compose, nginx proxy, healthchecks | see log (image build needs Docker) |
| H | GitHub Actions CI, deployment docs | see log |
| I | Full verification | see log |

## Out of scope until a database is reachable

Anything that requires real rows: E2E, integration tests against a test project, query-performance measurement, FK-embedding validation, RLS confirmation. Integration tests are written to run only when `TEST_SUPABASE_URL` is set and refuse to run against the production URL.

## Watchlist / personalisation

No end-user accounts exist. Per the brief, requirements are documented rather than built: end-user auth (Supabase Auth, separate from admin role), tables `watchlist(user_id, title_id, status, created_at)` with RLS `user_id = auth.uid()`, and `recently_viewed` kept client-side in `localStorage` (no PII). The client-side recently-viewed row is implementable without accounts and is included in Stage D if time permits.
