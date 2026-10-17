# MovieDB Architecture

## 1. Current (pre-2.0) topology

```mermaid
flowchart LR
  B1[Browser: montage SPA :5174] -->|VITE_API_URL| API
  B2[Browser: admin SPA :5175] -->|VITE_API_URL, no auth| API
  API[Express server.js :5000<br/>in-memory cache] -->|supabase-js, anon key<br/>RLS disabled| SB[(Supabase Postgres)]
  B1 -.fallback on /home failure.-> LOCAL[bundled movies.js / people.js]
```

Problems this topology has are listed in `PROJECT_AUDIT.md`.

## 2. Target (2.0) topology

```mermaid
flowchart LR
  subgraph Browser
    M[montage SPA]
    A[admin SPA]
  end
  subgraph "Docker Compose / any container host"
    W1[nginx: montage static + /api proxy]
    W2[nginx: admin static + /api proxy]
    API[Express API :5000<br/>helmet, rate-limit, request id, JSON logs]
  end
  M --> W1 -->|/api same-origin| API
  A --> W2 -->|/api same-origin| API
  A -.login (anon key, public).-> AUTH[Supabase Auth]
  API -->|service-role key, server only| SB[(Supabase Postgres)]
  API -->|verify JWT, role=admin| AUTH
```

Rules:
- Browsers only talk to their own origin (`/api/...`); the web container proxies to `backend:5000` over the internal network, so no Docker hostname reaches a browser and no CORS is needed in production.
- The service-role key exists only in the backend container environment. Frontends receive only the public Supabase URL and anon key (admin login only).
- Backend is the sole database gateway, so RLS can be enabled with no public policies (migration provided, not auto-applied).

## 3. Backend modules

```
backend/server.js            entry: config -> app -> listen, graceful shutdown
backend/src/config.js        env parsing + validation (actionable errors, no secrets)
backend/src/logger.js        JSON logger
backend/src/errors.js        AppError + database error classification
backend/src/cache.js         TTL cache with tag-free explicit invalidation
backend/src/db/client.js     supabase client with request timeout; diagnose()
backend/src/db/repository.js every query in one place
backend/src/services/        normalisation, home rows, recommendations
backend/src/middleware/      request id, auth, validation, errors
backend/src/routes/          health, public catalog, admin writes
backend/test/                node:test suites with a fake repository
```

## 4. Request lifecycle

```mermaid
sequenceDiagram
  participant C as Client
  participant MW as Middleware
  participant R as Route
  participant S as Service
  participant D as Repository
  participant DB as Supabase
  C->>MW: HTTP request
  MW->>MW: request id, helmet, rate limit, body limit
  alt write route
    MW->>MW: verify bearer JWT and admin role (401/403)
  end
  MW->>R: validated input (400 on failure)
  R->>S: call service
  S->>D: cache miss
  D->>DB: PostgREST query, timeout
  DB-->>D: rows or error
  D-->>S: rows / classified error
  S-->>R: normalised DTO
  R-->>C: JSON, or {error:{code,message,requestId}}
```

## 5. Health model

| Endpoint | Meaning | Status |
|---|---|---|
| `GET /api/health/live` | process is up | always 200 |
| `GET /api/health/ready` | config valid and database answers a query | 200 or 503 |
| `GET /api/health` | detailed, includes `checks.database.{status,latencyMs,category}` | 200 or 503 |

Database failure categories: `dns`, `tls`, `timeout`, `connection`, `auth`, `schema`, `unknown`. Messages never include keys.
