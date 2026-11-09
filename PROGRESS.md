# Progress / resume notes

_Last updated: 2026-11-08_

## What this is

Full stack "Consent Hub" app: social-service orgs share client records
category-by-category, only with explicit, revocable, audited client consent.
Self-contained in `consent/` (monorepo: `backend/` + `web/`).

## Status: working

- `backend/` — Express + TypeScript + Drizzle ORM, embedded Postgres via
  **PGlite** (no Docker required), JWT auth, Zod validation.
- `web/` — Next.js 16 App Router + React + Tailwind UI.
- Consent logic is centralized in `backend/src/lib/consent.ts`
  (`hasActiveConsent`) and unit tested.
- Every read/write/consent action is appended to the audit log.

Verified locally:
- `npm test` → 14 backend tests pass
- `npm run lint` → web lint clean
- `npm run build` → backend `tsc` + `next build` pass
- Full live flow tested: register 2 orgs → create client + records →
  grant consent → second org sees only consented category → revoke → hidden,
  with audit entries recorded.

## How to run

```bash
npm install
npm run dev        # API :4000, web :3000
# open http://localhost:3000
```

Web proxies `/api/*` → `http://localhost:4000`. Migrations run on API startup.
Reset DB: `rm -rf backend/.data`.

## Demo mode (showing clients)

- `npm run demo:seed` — seeds an empty DB with 3 fictional orgs, 5 clients,
  12 consents (active / expired / revoked) and a 96-entry backdated audit
  trail containing both ALLOWED and DENIED reads.
- `npm run demo:reset` — wipes `backend/.data` and reseeds, for a clean start
  before each meeting.
- Landing page has one-click sign-in buttons for each demo org.
- Demo accounts (password `demo1234`): `admin@riverside.test`,
  `admin@harbor.test`, `admin@northside.test`.
- Suggested demo: Riverside + Harbor in two windows, grant/revoke a category,
  then show the owner's access history with denied reads.
- Seed data lives in `backend/src/db/seed.ts`; reset in `backend/src/db/reset.ts`;
  accounts mirrored in `web/src/lib/demo.ts`.

## Key decisions / notes

- Backend code is ported from `../consent-hub/backend`; the only substantive
  change is the DB driver (`pg`/node-postgres → `@electric-sql/pglite`).
- `../consent-aware-gateway` was **not** used: it's a standalone PII-sanitizer
  demo, not a UI for this API. `consent/web` is a purpose-built UI.
- Added two API endpoints beyond the original: `GET /api/auth/me` and
  `GET /api/organizations` (needed by the UI).
- Dev `JWT_SECRET` has a default in `backend/src/env.ts`; set a real one in
  `backend/.env` before deploying.
- `consent/` is a git repo, committed and pushed to `origin/main`
  (github.com/JustinJ108/consent). `.gitignore` excludes `node_modules`,
  `.next`, `backend/dist`, `backend/.data`, `.env*`.
- Deployment targets **Vercel + Neon**. `DATABASE_URL` switches the DB driver
  to `@neondatabase/serverless` (`drizzle-orm/neon-http`); unset falls back to
  embedded PGlite for local development. Vercel zero-config Express detection
  uses the default export from `backend/src/app.ts`; local dev still runs
  `src/index.ts` (migrations + listener). Migrations/seed are run out-of-band
  against Neon with `DATABASE_URL=... npm run db:migrate|demo:seed|demo:reset`.
  See README → "Deploying (Vercel + Neon)".

## Possible next steps

- [ ] Client-facing consent portal (client self-serves / revokes consent)
- [ ] Staff invites so multiple users can join an existing org
- [ ] Let consented orgs propose write-backs with an approval workflow
- [ ] Rate limiting + request logging middleware
- [ ] Pagination/search on the client list
- [x] Deploy: managed Postgres (Neon) via `DATABASE_URL`, API + web on Vercel
      (set a real `JWT_SECRET` and `CORS_ORIGIN` in the Vercel dashboard)
- [ ] Optional: integrate the `consent-aware-gateway` sanitizer as an
      "export for downstream system" feature on the client detail page
