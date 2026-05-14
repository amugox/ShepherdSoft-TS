# ShepherdSoft-TS

Vue 3 + NestJS rewrite of the **branch-user** surface of [ShepherdSoft](../../Net/ShepherdSoft).
Talks to the existing MySQL database and reuses every stored procedure.

The .NET Admin Area (`ShepherdSoft/Areas/Admin`) and the admin API endpoints
(`ShepherdSoft.Api/Areas/Admin/*`) stay on .NET — they are **out of scope** here.

## Prerequisites

- Node.js >= 20.10
- pnpm >= 9 (`npm i -g pnpm`)
- Access to the existing MySQL `shep_soft` database (read/write)

## First-time setup

The order matters — the backend pulls types from `@shepherd/shared` and won't
compile until that package's `dist/` exists.

```pwsh
pnpm install

# 1. Build the shared types package FIRST.
pnpm -F @shepherd/shared build

# 2. Backend env — copy and fill in real values.
cp backend/.env.example backend/.env
# Edit DATABASE_URL, JWT_KEY (must match the .NET appsettings during cutover),
# MAIL_*. The /bmat-tools skill can decrypt these from the .NET DbConnData.

# 3. Pull live schema into Prisma + generate client.
pnpm -F backend prisma:pull
pnpm -F backend prisma:generate

# 4. Smoke-test DB connectivity + SP availability.
pnpm -F backend exec ts-node --project tsconfig.scripts.json scripts/check-db.ts

# 5. Frontend env.
cp frontend/.env.example frontend/.env
```

## Verified test credentials

A branch user is pre-seeded for repeatable smoke tests:

| Username | Password   | Branch     | Notes                                  |
|----------|------------|------------|----------------------------------------|
| Admin1   | `Test@123` | 10 (KINOO) | reset via `scripts/set-test-pwd.ts`    |

The seed admin in the `users` table (`Admin1`, `Admin2`) has password `password`
(confirmed by `scripts/calibrate-hash.ts`) — not relevant to branch-user login,
listed only for hash-algorithm verification.

## Running locally

```pwsh
pnpm dev
# backend  → http://localhost:3000   (POST /api/v1/<area>/service)
# frontend → http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:3000`, so the SPA
makes same-origin requests and cookies just work.

## Project structure

```
packages/shared      types & action-code enum (used by both sides)
backend              NestJS — auth, data, guest, member modules
frontend             Vite + Vue 3 — branch-user SPA
```

## Key contracts

Every controller is one POST endpoint that dispatches on `act`:

```
POST /api/v1/{auth|data|guest|member}/service
Body:  { tsp, ver, act, content, caller }
Reply: { stat, msg, data, err_no?, ext? }
```

Action codes match `ShepherdSoft.DBL.Consts.HTTP_API_ACTION` verbatim (1, 2,
100–105, 200–209, plus `AUTH_CHANGE_PASS=101`).

JWT is issued in an **HttpOnly Secure** cookie named `shp_jwt`. The same JWT
is also returned in the response body of `/auth/login` (mirrors the .NET
`UserDataModel.AuthToken` field) so any code still reading the body keeps
working.

### Wire format — short JSON keys, NOT PascalCase

The .NET entities use `[JsonPropertyName("…")]` short aliases on every field, so
the over-the-wire JSON uses keys like `code`, `fname`, `vdt`, `u_code`, `gid`,
`cpass`, `tkn` — **not** `Guest_Code`, `First_Name`, etc.

The authoritative mapping lives in:

- `packages/shared/src/domain/guest.ts`
- `packages/shared/src/domain/member.ts`
- `packages/shared/src/domain/user.ts`
- `packages/shared/src/domain/branch.ts`

Each interface has comments showing the corresponding .NET C# property name.

## Stored procedures

The backend keeps every MySQL stored procedure as-is and calls them through
**mysql2** (not Prisma) because Prisma's MySQL driver loses column names for
`CALL` results — they come back as `f0..fN` positional. Two SPs
(`sp_CreateGuest`, `sp_AddGuestFollowUp`) emit columns in *different* orders
for their success vs. error branches, which only mysql2's named-column return
can handle.

Prisma is still used for SELECT-from-view queries (`vw_guests`, `vw_members`,
…) where it works fine.

If a new SP is added with PascalCase aliases (`RespStatus`, `Data1`), the
`normRow()` helper in `backend/src/db/sp/types.ts` automatically converts to
the canonical snake_case shape the wrappers consume.

## Password hash compatibility

The existing system uses `Bmat.Tools.Lite.SecurityManager`. The internal
algorithm has been confirmed via `scripts/calibrate-hash.ts` to be:

```
hash = Base64(SHA-256(password + salt))
```

This is what `backend/src/auth/crypto.ts` implements, and what
`backend/src/auth/crypto.spec.ts` asserts against the seed-admin hash.

If logins start failing against a fresh DB (different salt scheme, hash
rotation, etc.), run:

```pwsh
pnpm -F backend exec ts-node --project tsconfig.scripts.json scripts/calibrate-hash.ts
```

It walks PBKDF2 (1k/10k/100k iterations, SHA-1/256/512), plain digests, and
salt+pwd ordering variants. Update `crypto.ts` to the matching variant.

## Helper scripts (`backend/scripts/`)

| Script                | Purpose                                                     |
|-----------------------|-------------------------------------------------------------|
| `check-db.ts`         | Quick DB + SP smoke test (`bfp_GetListData`)                |
| `calibrate-hash.ts`   | Discover the live password-hash algorithm                   |
| `set-test-pwd.ts`     | Reset a branch user's password for repeatable test runs     |
| `unlock-test-user.ts` | Reset `branch_users.user_stat=0` after a lockout            |
| `smoke-all.ts`        | Walk every in-scope action code end-to-end (30 assertions)  |

All run via `pnpm -F backend exec ts-node --project tsconfig.scripts.json scripts/<name>.ts`.

`smoke-all.ts` expects the backend to be running (`pnpm -F backend start`) and
hits the local API. Synthetic records are named `sg_<ts>` / `sm_<ts>` /
`sfam_<ts>` and the script tears down the test guest at the end (the synthetic
member, family, and the promoted-guest are left behind — they're harmless and
cheap to clean by hand if needed).

## Tests + lint + typecheck

```pwsh
pnpm typecheck    # tsc --noEmit on every workspace
pnpm test         # jest (backend) + vitest (frontend)
pnpm lint         # eslint flat config, both sides
pnpm build        # full production build
```

All four should be green on a clean checkout.

## Deployment notes

In production the NestJS app **should** serve the built SPA via
`@nestjs/serve-static` to avoid CORS entirely. Until that's wired:

- set `ALLOWED_ORIGINS` in `backend/.env` to the SPA origin
- `COOKIE_SECURE=true` when serving over HTTPS
- if the SPA is on a different host than the API, also `SameSite=None`
- rotate `JWT_KEY` away from the dev value — both stacks need the same key
  during cutover, then can rotate independently

Reverse-proxy rules during the dual-stack period:

```
/api/v1/auth/*    → NestJS  (branch-user auth)
/api/v1/data/*    → NestJS
/api/v1/guest/*   → NestJS
/api/v1/member/*  → NestJS
/api/v1/admin/*   → .NET    (keep)
/*                → SPA (static)
```

## Security checklist before `git init`

`backend/.env` carries live secrets in this checkout. Before running `git init`
or copying the directory anywhere shared:

- Confirm `.gitignore` covers `.env` (it does — see root `.gitignore`).
- Rotate the Gmail App Password (`MAIL_PASS`) — it has been on local disk in
  plaintext and may have been included in screenshots, support tickets, or
  copy-paste history. Reissue from the Google Account security page and update
  `backend/.env` only.
- Replace `JWT_KEY` for production with a fresh `openssl rand -base64 48` value.
  Update both `backend/.env` AND `ShepherdSoft.Api/appsettings.Production.json`
  to the same key during cutover, then rotate independently afterwards.
- Replace `DATABASE_URL` with the production DSN — never deploy with the local
  dev credentials.

## Known limitations / open flags

- **Messaging view is stubbed** — no backend endpoint exists yet.
- **Session-table per-request check is skipped** — we trust the JWT. `sp_UserLogin`
  still writes a row to `user_sessions`, but `JwtAuthGuard` doesn't re-validate
  on every request. If the .NET admin needs cross-stack session revocation,
  add a per-request SP call.
- **Throttler is 10 req / 10 s** — fine for production, but smoke tests pace
  themselves under it (`smoke-all.ts` sleeps 1.1s between calls).
