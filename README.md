# API Marketplace with Usage Metering

A full-stack marketplace where users can browse APIs, buy quota packs, and call metered endpoints with their personal key. Admins manage the catalog and watch global usage. Each call is logged, quotas decrement atomically, and a sliding-window rate limiter caps abuse.

## Stack

- **Backend:** Node.js + Express, PostgreSQL via Prisma ORM, JWT auth, in-memory rate limiting
- **Frontend:** React + Vite + Tailwind CSS
- **Security:** bcrypt password hashing, `crypto.randomBytes(32)` API keys, role-based middleware, helmet + CORS

---

## Setup

### 1. PostgreSQL

Either point `DATABASE_URL` at an existing Postgres, or spin up the bundled one:

```bash
docker compose up -d
```

Database `api_marketplace` becomes available at `postgres://postgres:postgres@localhost:5432/api_marketplace`.

### 2. Backend

```bash
cd backend
cp .env.example .env          # then edit DATABASE_URL / JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run dev
```

The server boots on `http://localhost:3000`. If the database has no users, it self-seeds on startup.

To re-seed manually:

```bash
npm run seed
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` and proxies API calls to the backend.

---

## Seeded credentials

| Role  | Email                     | Password    |
| ----- | ------------------------- | ----------- |
| ADMIN | admin@marketplace.com     | Admin@123   |
| USER  | user@marketplace.com      | User@123    |

5 sample APIs are seeded: `weather`, `joke`, `currency`, `quote`, `news`. Each has three quota packs (Starter / Pro / Enterprise).

---

## API summary

### Auth (public)
| Method | Path           | Body                  | Returns                  |
| ------ | -------------- | --------------------- | ------------------------ |
| POST   | `/auth/signup` | `{email, password}`   | `{token, user}` (201)    |
| POST   | `/auth/login`  | `{email, password}`   | `{token, user}`          |

### User (JWT)
| Method | Path                          | Notes                                                    |
| ------ | ----------------------------- | -------------------------------------------------------- |
| GET    | `/catalog`                    | Lists active APIs + your subscription state              |
| POST   | `/buy/:apiId`                 | Body `{packId}`; creates or tops up the subscription     |
| GET    | `/dashboard`                  | Subscriptions + last 10 calls                            |
| GET    | `/my-key`                     | Returns your API key                                     |
| POST   | `/regenerate-key`             | Issues a new key; old key invalidated immediately        |
| GET    | `/my-logs`                    | Paginated; filters: `apiId`, `status`, `from`, `to`      |
| GET    | `/my-logs.csv`                | Same filters; downloads CSV                              |

### Admin (JWT + ADMIN role)
| Method | Path                  | Notes                                                                 |
| ------ | --------------------- | --------------------------------------------------------------------- |
| POST   | `/admin/api`          | Create a CatalogAPI (validates slug + packs)                          |
| PUT    | `/admin/api/:id`      | Partial update                                                        |
| DELETE | `/admin/api/:id`      | Cascades subscriptions + logs                                         |
| GET    | `/admin/users`        | Paginated; filters: `email`, `role`                                   |
| GET    | `/admin/logs`         | Paginated; filters: `apiId`, `userId`, `status`, `from`, `to`         |
| GET    | `/admin/logs.csv`     | Same filters; CSV                                                     |
| GET    | `/admin/dashboard`    | Totals, top 5 APIs, top 5 users, recent activity                      |

### Metering engine (API key)
| Method     | Path           | Header              | Behavior                                                                                                  |
| ---------- | -------------- | ------------------- | --------------------------------------------------------------------------------------------------------- |
| ANY        | `/v1/:slug`    | `x-api-key: <key>`  | Validates key → rate-limit (10/sec) → subscription → quota → atomic decrement → returns `dummyResponse`. All branches log to `CallLog`. |

Errors (returned as `{error:{code,message}}`):
- `401 missing_api_key` / `401 invalid_api_key`
- `404 api_not_found`
- `429 rate_limited` (>10 calls/sec from one key)
- `403 no_subscription`
- `429 quota_exhausted`

### Example

```bash
curl -X POST http://localhost:3000/v1/weather \
  -H "x-api-key: <your-key>"
# {"success":true,"data":{"city":"San Francisco",...},"remainingCalls":999}
```

---

## Stretch features

- **Rate limiting:** 10 calls/second per API key, sliding-window in memory. Tunable via `RATE_LIMIT_PER_SECOND` env. Idle keys are GC'd every 60s.
- **Multiple quota packs:** Each CatalogAPI carries a `quotaPacks` JSON array. Users pick a pack at buy time; topping up an existing subscription adds calls.
- **CSV export:** Both user and admin log tables expose a CSV download endpoint that respects active filters.

---

## Notes on AI tools, hardest part, what I'd improve  (~200 words)

I built this with Claude Code as my primary copilot. It generated the bulk of the Prisma schema, the metering-engine flow, and the React/Tailwind UI from a single specification; my role was architecture (rate-limit shape, atomic decrement strategy, quotaPacks design), correctness review (catching that mounting an auth-guarded router at `/` would convert 404s into 401s), and iteration on the frontend layout.

The hardest part was the metering engine. Three constraints had to coexist: (1) every failure mode — bad subscription, exhausted quota, rate limit, missing API — must be logged exactly like a success, so admins see attempted abuse; (2) quota decrement must be safe under concurrent calls; (3) the response shape must remain predictable for clients. I settled on `prisma.subscription.updateMany({where:{remainingCalls:{gt:0}}})` and a check on the affected row count, which closes the read-then-write race without a transaction.

Given more time I'd add Redis for shared rate-limiting and caching, an integration test suite around the metering flow, OpenAPI spec generation, real payment integration on `buy`, an audit log of admin mutations, and a webhooks system so subscribers learn about quota thresholds before they hit them.
