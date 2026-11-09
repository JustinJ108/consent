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

## Key decisions / notes

- Backend code is ported from `../consent-hub/backend`; the only substantive
  change is the DB driver (`pg`/node-postgres → `@electric-sql/pglite`).
- `../consent-aware-gateway` was **not** used: it's a standalone PII-sanitizer
  demo, not a UI for this API. `consent/web` is a purpose-built UI.
- Added two API endpoints beyond the original: `GET /api/auth/me` and
  `GET /api/organizations` (needed by the UI).
- Dev `JWT_SECRET` has a default in `backend/src/env.ts`; set a real one in
  `backend/.env` before deploying.
- `consent/` is not yet a git repo (`git init` needed). `.gitignore` already
  excludes `node_modules`, `.next`, `backend/dist`, `backend/.data`, `.env*`.

## Possible next steps

- [ ] Client-facing consent portal (client self-serves / revokes consent)
- [ ] Staff invites so multiple users can join an existing org
- [ ] Let consented orgs propose write-backs with an approval workflow
- [ ] Rate limiting + request logging middleware
- [ ] Pagination/search on the client list
- [ ] Deploy: swap PGlite for managed Postgres (`pg` driver) via env switch,
      set real `JWT_SECRET`, host API + web
- [ ] Optional: integrate the `consent-aware-gateway` sanitizer as an
      "export for downstream system" feature on the client detail page
