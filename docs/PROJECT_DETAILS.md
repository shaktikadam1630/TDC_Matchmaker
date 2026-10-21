# TDC Matchmaker Dashboard

An internal tool for matchmakers: sign in, see your customers and their journey stage, open a full biodata view, get **AI-explained match suggestions** from a pool of 240 dummy profiles, record notes, and **send a match** (mock email).

**Stack:** React 18 (Vite) · Node 20 / Express · MongoDB (Mongoose) · OpenAI (optional) · Docker · AWS (App Runner + S3/CloudFront)

## Run it

### Docker (everything)

```bash
cp .env.example .env        # set JWT_SECRET (and OPENAI_API_KEY if you want AI)
docker compose up --build
```

Open <http://localhost:8080>. Demo data is seeded automatically on first boot (`AUTO_SEED=true`).

### Local dev (hot reload)

```bash
docker compose up mongo -d                    # just the database
cd backend && cp .env.example .env && npm install && npm run dev      # API on :4000
cd frontend && npm install && npm run dev                              # UI on :5173
```

`npm run seed` in `backend/` wipes and reseeds. `npm test` in `backend/` runs the engine unit tests.

### Demo credentials

| Username | Password | Customers |
|---|---|---|
| `matchmaker1` | `Match@123` | 16 |
| `matchmaker2` | `Match@123` | 8 |

Each matchmaker only sees their own customers. Customer 2 and 3 in the seed are deliberate edge cases: a sparse profile (missing data → lower confidence) and one awaiting divorce (matching paused).

## Architecture

```
frontend/src
  api/client.js          fetch wrapper (token, errors, 401 → sign-out)
  context/               Auth + Toast providers
  hooks/                 useFetch (abortable), useDebounce
  components/            MatchCard, SendMatchModal, Biodata, NotesPanel, SentList, common
  pages/                 Login, Dashboard (list), Customer (tabs)

backend/src
  config/                env validation (zod, fail-fast), Mongo connection with retry
  models/                Matchmaker, Customer, Profile (pool), MatchAction (audit)
  middleware/            auth (JWT), validate (zod), loadCustomer (ownership), error (one JSON shape)
  controllers/ routes/   thin HTTP layer
  services/
    matching/            constants (weights), factors (pure scorers), engine (rank), insights (fallback text)
    ai/aiService.js      OpenAI: insights + intro, schema-validated, cached, timeout, graceful fallback
    matchService.js      retrieve → score → (AI) enrich
    emailService.js      mock provider (swap for SES)
  seed/                  deterministic generator (240 profiles) + demo users
```

Key decisions you can defend in review:

- **Pure matching engine, no I/O.** Easy to test and to move into a worker. Weights are config, per customer gender.
- **Three-stage funnel** (indexed Mongo filter → in-memory scoring → LLM on top 10) keeps cost flat as the pool grows.
- **AI never blocks.** No key, timeout, bad JSON → rule-based explanations/template email. UI shows rule results instantly, then upgrades them.
- **Explainability.** Every score has a per-factor breakdown with a reason.
- **Data integrity.** Unique index on (customer, profile) makes double-sends impossible, even with concurrent clicks. Customers are scoped to their matchmaker at the query level.
- **Privacy.** Match cards never include phone, email or exact DOB.

Matching logic, AI usage and assumptions: [docs/MATCHING_LOGIC.md](docs/MATCHING_LOGIC.md).

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login` | rate limited; returns JWT |
| GET | `/api/auth/me` | |
| GET | `/api/customers?q=&status=&page=&limit=` | search + pagination |
| GET | `/api/customers/stats` | counts per status |
| GET | `/api/customers/:id` | full biodata + notes |
| PATCH | `/api/customers/:id/status` | journey stage |
| POST / DELETE | `/api/customers/:id/notes[/:noteId]` | |
| GET | `/api/customers/:id/matches?limit=&minScore=&ai=` | ranked matches (`ai=1` adds LLM insights) |
| POST | `/api/customers/:id/matches/:profileId/intro` | drafts the email (AI or template) |
| POST | `/api/customers/:id/matches/:profileId/send` | sends once; 409 on repeat |
| GET | `/api/customers/:id/sent` | history incl. full email |
| GET | `/api/health` | liveness/readiness |

## Edge cases handled

Env validation at boot; Mongo connection retry; graceful shutdown; invalid ids (400) vs other users' ids (404); regex-escaped search; pagination bounds; expired/invalid JWT (UI signs out); login brute-force limit and no user enumeration; malformed JSON and oversized bodies; missing profile data (skipped, lower confidence); awaiting-divorce customers; kids / strict-religion / age-range / relocation deal-breakers; duplicate and concurrent sends; email delivery failure rolls back the send record; HTML stripped from email text; prompt-injection-resistant LLM prompts; stale-response protection in the UI (abortable requests); modal Escape/focus handling; error boundary.

## Deploy to AWS

See [deploy/aws/README.md](deploy/aws/README.md) and the GitHub Actions workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Known limitations

- JWT is kept in `localStorage` (use an httpOnly cookie + CSRF for production).
- Email is mocked; AI result cache and rate limiter are in-memory (use Redis when running multiple instances).
- Factor weights are expert-set; with outcome data they should be learned.
