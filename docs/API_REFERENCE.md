# MovieDB API Reference — current state (pre-2.0)

Discovered by reading `backend/server.js` and every frontend call site. "Verified" here means confirmed by code reading and, where noted, by running the server.
Live responses could **not** be verified because the configured Supabase host does not resolve (see `PROJECT_AUDIT.md` §2).
This file is rewritten alongside the 2.0 backend; the OpenAPI spec at `docs/openapi.yaml` supersedes it for the new contract.

Base path: `/api`. All bodies are JSON. **No endpoint requires authentication.**

## Read endpoints

| Method | Path | Notes | Used by |
|---|---|---|---|
| GET | `/health` | 200 `{ok,database:'online'}` or 503 `{ok:false,database:'offline',message}` after one `titles` query. | montage poll, e2e webServer |
| GET | `/home` | Array of 5 rows `{id,label,titles[]}`. Cached 5 min. Sorts on non-existent `metrics`. | montage |
| GET | `/titles` | Pruned list `{id,title,type,year,poster,classification,people}`. No pagination or filters. Cached 60 s. | montage, admin |
| GET | `/titles/:id` and `/title/:id` | Full title with genres and credits. Cached 60 s. Missing id yields 500, not 404. | montage, admin |
| GET | `/titles/:id/genres` | Join rows with genre names. | admin |
| GET | `/titles/:id/credits` | Normalised credits with person. | admin |
| GET | `/genres` | `{id,name}[]`, cached 10 min. | both |
| GET | `/people` | All people, cached 10 min. | both |
| GET | `/people/:id` | Missing id yields 500. | admin |
| GET | `/people/:id/credits` | Filmography rows. | admin |

## Write endpoints (all unauthenticated)

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/titles` | `id,title,type` required; `year,releaseDate,poster,backdrop,trailer,synopsis,runtime,censor_rating` | 201 raw DB row |
| PATCH | `/titles/:id` | any of the above | 200 raw row |
| DELETE | `/titles/:id` | — | 204 |
| POST | `/titles/:id/genres` | `genre_id` | 201 genre relations |
| DELETE | `/titles/:titleId/genres/:genreId` | — | 204 |
| POST | `/titles/:id/credits` | `person_id, role, department?` | 201 credits |
| DELETE | `/titles/:titleId/credits/:personId` | — | 204 (removes **all** roles for that person) |
| DELETE | `/titles/:id/credits` | `{personId, role}` | 204 |
| POST | `/people` | `id,name` required, `image_url?` | 201 |
| PUT, PATCH | `/people/:id` | `name?, image_url?` | 200 |
| DELETE | `/people/:id` | — | 204 |

## Error format (current)

Validation: `{ "message": "..." }` with 400. Everything else: 500 `{ "message": <raw error.message> }`, which can leak database internals.

## Frontend calls verified against routes

- `montage`: `/home`, `/titles`, `/people`, `/genres`, `/title/:id`, `/health` all exist. `/title/:id` is a duplicate alias of `/titles/:id`.
- `admin`: every function in `admin/src/api/index.js` maps to an existing route. `removeTitleCredit` uses the person-wide DELETE, so removing one role removes the person's other roles on that title (bug B-credit).
