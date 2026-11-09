# Consent Hub — full stack app

Share social-service client information across organizations **with the
client's explicit, revocable, audited consent** — instead of either siloing
data completely or sharing it wholesale.

This repository is the complete, runnable application:

| Folder | What it is |
|---|---|
| [`backend/`](backend) | Express + TypeScript API, Drizzle ORM, embedded Postgres (PGlite), JWT auth, Zod validation, Vitest |
| [`web/`](web) | Next.js (App Router) + React + Tailwind UI that talks to the API |

It is the integration of two earlier pieces: the API is derived from
`consent-hub/backend`, and the front end is a purpose-built UI for that API
(the original `consent-aware-gateway` was a standalone PII-sanitizing demo
that never connected to the API).

## Quickstart

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

- API runs at `http://localhost:4000`
- Web runs at `http://localhost:3000` and proxies `/api/*` → the API
- The database is **embedded** (PGlite — real Postgres compiled to WASM,
  persisted under `backend/.data/pglite`). No Docker or external Postgres
  required.
- Migrations run automatically on API startup.

### Try the multi-org flow

The whole point is sharing *between* organizations, so you need two:

1. In a normal window, **register** an org (e.g. "Riverside Shelter") —
   you become its admin.
2. In a private/incognito window, register a second org (e.g. "Harbor Clinic").
3. Back in the first window: create a client, add some category records,
   then **grant consent** to Harbor Clinic for a specific category.
4. In the second window: the client now appears under "Shared with you" and
   only the consented category is visible, read-only.
5. Revoke the consent in window one; it disappears from window two — and
   every read/write attempt, allowed or denied, is in the audit log.

## How the consent model works

- A client has one master record, split into categories: `contact`, `housing`,
  `health`, `financial`, `legal`, `other`.
- The **owning org** (the one that created the client) can read/write every
  category and grant or revoke consent.
- Another org can read a category **only** while it holds an active,
  unexpired, unrevoked consent for that `(client, category)`.
- The decision itself lives in one place
  (`backend/src/lib/consent.ts` → `hasActiveConsent`) and is unit tested
  independently of the database, HTTP layer, and auth.
- Every read/write/consent action is written to an append-only audit log;
  the owning org's admins can review it.

## Scripts

Run from the repository root:

| Command | What it does |
|---|---|
| `npm run dev` | Run API + web together (concurrently) |
| `npm run dev:api` / `npm run dev:web` | Run just one side |
| `npm run build` | Build backend (`tsc`) and web (`next build`) |
| `npm test` | Run backend unit tests (no database needed) |
| `npm run lint` | Lint the web app |
| `npm run db:migrate` | Apply migrations manually |
| `npm run start` | Run both in production mode (after `build`) |

Reset the local database at any time:

```bash
rm -rf backend/.data
```

## API overview

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | Creates a new org + its first admin |
| POST | `/api/auth/login` | Returns a JWT |
| GET | `/api/auth/me` | Current staff + organization |
| GET | `/api/organizations` | Other orgs, for choosing who to share with |
| POST | `/api/clients` | Create a client, owned by the caller's org |
| GET | `/api/clients` | List clients the caller's org owns or has consent into |
| GET | `/api/clients/:id` | Client info + every category the caller can read |
| PUT | `/api/clients/:id/records` | Upsert a category record (owning org only) |
| POST | `/api/consents` | Grant another org consent for one category |
| DELETE | `/api/consents/:id` | Revoke a consent |
| GET | `/api/consents/client/:clientId` | List a client's consents (owning org only) |
| GET | `/api/audit-log/client/:clientId` | Full access history (owning org admins only) |

Authenticate with `Authorization: Bearer <token>`.

## Deliberately out of scope

- **No client-facing consent portal.** Consent is recorded by a caseworker at
  the owning org (e.g. during intake, with the client present), not self-served
  by the client through their own login.
- **Consented orgs can't write back.** A sharing org gets read access only.
- **No staff invites / multi-user orgs yet.** Registration creates the first
  (admin) user; joining an existing org is future work.
- **Prototype authorization.** The consent logic is real and tested, but this
  is not a certified compliance product.
