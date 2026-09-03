# SignatureOps

Privacy-first email signature management — Google signatures are **stored** in Gmail; Microsoft signatures are **applied in Outlook at compose time**.

## Local development

```bash
docker compose up -d
cp .env.example apps/web/.env.local
cp .env.example packages/db/.env
# set AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in apps/web/.env.local

npx pnpm@9.15.0 install
npx pnpm@9.15.0 db:migrate:deploy
npx pnpm@9.15.0 db:seed
npx pnpm@9.15.0 dev
```

Open http://localhost:3000/tr

Google OAuth redirect: `http://localhost:3000/api/auth/callback/google`.

Set `AUTH_BYPASS=true` in `.env.local` only if you need to skip Google login locally. It is always off in production.

Public site: `/tr`. Admin panel: `/tr/app/{slug}`. Privacy: `/tr/gizlilik`.

## Staging / production (Vercel + Neon + R2 + Inngest)

1. Create a GitHub repo and push this project.
2. Neon: create a Postgres database; copy the connection string to `DATABASE_URL`.
3. Cloudflare R2: bucket + API token; public hostname (`R2_PUBLIC_BASE_URL`, HTTPS).
4. Vercel: import the GitHub repo (root of the monorepo). Set env vars from `.env.example` (`AUTH_SECRET`, `GOOGLE_*`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `AUTH_URL`, `R2_*`).
5. Google Cloud OAuth client authorized redirect: `https://<domain>/api/auth/callback/google`.
6. Inngest: sync the app at `/api/inngest` (needed for Gmail deploy and directory sync jobs).
7. Deploy hook / first release should run `pnpm db:migrate:deploy`.

Sentry (`SENTRY_DSN`) is optional.

## Google Workspace deploy

Platform env: `GOOGLE_SA_CLIENT_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `GOOGLE_SA_CLIENT_ID`.

A Workspace admin adds that client ID under **Domain-wide delegation** with the scopes shown on Settings. Then save the impersonation admin email and run directory sync + Deploy to Gmail. After each write we read the signature back — Gmail sanitizes HTML.

## Microsoft / Outlook add-in

Graph has **no** signature write API. Download the unified manifest (web / new Windows) or the add-in-only manifest (Mac / mobile) from Settings and deploy via Microsoft 365 Integrated Apps. `OnMessageFromChanged` requires Mailbox 1.13.

## Structure

```
apps/web              Next.js admin console + tRPC + Inngest
apps/outlook-addin    Office.js event-based add-in (built into public/addin)
packages/schema       Template & rule Zod schemas
packages/compiler     Email-safe HTML compiler
packages/linter       Quality Score
packages/rules        Rule engine + simulator
packages/db           Prisma + PostgreSQL
packages/adapters-google      Directory + Gmail sendAs
packages/adapters-microsoft   Graph directory (no signature write)
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web dev server |
| `pnpm build` | Build packages + web |
| `pnpm test` | Unit tests (Playwright is `pnpm --filter @signatureops/web test:e2e`) |
| `pnpm db:up` | Start local Postgres |
| `pnpm db:migrate:deploy` | Apply Prisma migrations |
| `pnpm db:seed` | Seed demo org (blocked in production) |
