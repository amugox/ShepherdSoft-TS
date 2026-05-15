# Cutover Plan — Branch-User Traffic (.NET → NestJS + Vue)

Status: drafted 2026-05-14. Awaiting team sign-off on §1 (hosting model) and §5 (MVC archival) before scheduling.

## Scope

Move the **branch-user** surface (`/auth`, `/`, `/guest/*`, `/membership/*`, `/messaging`) off `ShepherdSoft` (MVC) + `ShepherdSoft.Api` (controllers `Auth/Data/Guest/Member`) onto the new stack at `D:\Projects\Vue\ShepherdSoft-TS`. **Admin Area stays on .NET** — `ShepherdSoft/Areas/Admin/*` and `ShepherdSoft.Api/Areas/Admin/*` are untouched.

## 1 — Hosting model

Two options, pick one before the proxy rules are written.

### 1a. Same-origin (recommended)

NestJS serves the built SPA via `@nestjs/serve-static`. Single deploy unit; no CORS; cookie story trivial.

```pwsh
pnpm -F backend add @nestjs/serve-static
```

`backend/src/app.module.ts` — mount last so `/api/*` routes win:

```ts
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';

@Module({
  imports: [
    // ...existing modules
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ['/api/(.*)'],
    }),
  ],
})
export class AppModule {}
```

Build chain: `pnpm -F frontend build` → `pnpm -F backend build` → ship a single bundle. `frontend/dist/index.html` falls through for client-side router paths.

### 1b. Split origin

SPA on a CDN/static host, API on the Node host.

- `backend/.env` (prod): `ALLOWED_ORIGINS=https://app.shepherdsoft.example` (comma-sep for multiple)
- `backend/.env` (prod): `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`
- CSRF (double-submit token) **stays mandatory** — already wired.

## 2 — Reverse-proxy rules

Drop-in for nginx fronting both stacks during the transition:

```
location /api/v1/auth/   { proxy_pass http://nest:3000;  }
location /api/v1/data/   { proxy_pass http://nest:3000;  }
location /api/v1/guest/  { proxy_pass http://nest:3000;  }
location /api/v1/member/ { proxy_pass http://nest:3000;  }
location /api/v1/messaging/ { proxy_pass http://nest:3000;  }
location /api/v1/admin/  { proxy_pass http://dotnet:5000; }
location /                { try_files $uri /index.html;   } # same-origin: served by Nest
```

Same shape on IIS via `<rewrite>` rules or on Azure Front Door / CloudFront via route patterns.

## 3 — `ShepherdSoft.Api` config update

Edit `ShepherdSoft.Api/appsettings.json`:

```json
{
  "AllowedOrigins": "https://app.shepherdsoft.example"
}
```

Reason: the .NET admin SPA (still served from `ShepherdSoft/Areas/Admin`) needs its origin allow-listed so the admin browser can call `/api/v1/admin/*`. The dev value `http://localhost:5173` stays in `appsettings.Development.json`.

## 4 — JWT key rotation

- **During cutover** both stacks must use the **same** `JwtToken:Key` so an in-flight session minted by .NET keeps working through the swap.
  - .NET reads `appsettings.json → JwtToken.Key`
  - Nest reads `backend/.env → JWT_KEY`
  - Set both to a freshly generated 256-bit secret. Dev value `fvh8456...` is **not acceptable in prod** — rotate before the swap.
- **After cutover** (once .NET is no longer minting branch-user tokens) the keys can drift; .NET admin keeps its own key, Nest keeps its own.
- Generate: `openssl rand -base64 48` (drop padding/newlines).

## 5 — MVC archival (team confirmation required)

When parity is signed off, archive — don't delete — these so they can be revived if something regresses:

```
ShepherdSoft/Views/Auth/        (Login, ChangePass)
ShepherdSoft/Views/Home/        (Index, Privacy)
ShepherdSoft/Views/Guest/       (Index, Register, Guest, FollowUps + _Add* partials)
ShepherdSoft/Views/Membership/  (Index, Member, Depts, Flsps, Fams + _Add* partials)
ShepherdSoft/Views/Messaging/   (Index — stub)
ShepherdSoft/Controllers/{Auth,Home,Guest,Membership,Messaging}Controller.cs
ShepherdSoft.Api/Controllers/{Auth,Data,Guest,Member,Base}Controller.cs
```

Keep `ShepherdSoft.DBL/*` intact — it backs `ShepherdSoft.Api/Areas/Admin/*` which stays on .NET.

Suggested archive method: move to a `legacy/` folder inside the same projects with a `<Compile Remove>` in the csproj, OR cut a tag `pre-cutover-2026-MM-DD` and just delete from `master`. Decision: defer to whichever the team's release workflow already supports.

## 6 — Go-live checklist

In order:

- [ ] All four buckets closed (Verification, Browser walkthrough, Cleanup, Cutover plan reviewed).
- [ ] Hosting model picked (§1) — record the decision in the PR description.
- [ ] Prod `JWT_KEY` generated and set in both `.env` (Nest) and `appsettings.Production.json` (.NET).
- [ ] Prod `DATABASE_URL` set in Nest `.env` (production MySQL, **not** localhost).
- [ ] Prod `MAIL_*` set in Nest `.env`.
- [ ] `ALLOWED_ORIGINS` set in Nest `.env` (only relevant for split-origin §1b).
- [ ] `COOKIE_SECURE=true` and `COOKIE_DOMAIN=.shepherdsoft.example` if cross-subdomain.
- [ ] `ShepherdSoft.Api/appsettings.json AllowedOrigins` updated (§3).
- [ ] Reverse-proxy rules deployed (§2) — keep `/api/v1/admin/*` pointing at .NET.
- [ ] `pnpm -F @shepherd/shared build && pnpm -F backend build && pnpm -F frontend build` clean.
- [ ] `pnpm test` green (17 backend unit + 3 frontend + 13 e2e).
- [ ] `pnpm lint` clean.
- [ ] Smoke against prod: log in, register one guest, schedule + complete follow-up, promote, delete. Same record visible in MySQL via .NET admin.
- [ ] Roll proxy traffic 10% → 50% → 100% over a short window (skip if the rollback story is "flip nginx config back").
- [ ] Archive MVC views/controllers (§5) only after a clean week.

## 7 — Rollback

The rollback is the proxy rules. Flip:

```
location /api/v1/auth|data|guest|member|messaging/   → dotnet:5000   (was → nest:3000)
location /                                   → ShepherdSoft (MVC)
```

JWTs minted by Nest will still verify under .NET because the keys are equal during cutover (§4). No data migration needed — both stacks read the same MySQL.

## 8 — Open flags carried into cutover

These were in the plan and are still unresolved at cutover time. None block go-live; record the call so it doesn't drift:

1. **Messaging/Fellowships scope.** Implemented in TS stack (backend `/messaging/service`
   + SPA module). SMS gateway transport remains external integration work.
