# SignatureOps

Privacy-first email signature management platform — Web-First MVP.

## Quick Start

```bash
# Install dependencies
npx pnpm@9.15.0 install

# Setup database
npx pnpm@9.15.0 db:push
npx pnpm@9.15.0 db:seed

# Development
npx pnpm@9.15.0 dev
```

Open http://localhost:3000/tr

Copy `.env.example` into `apps/web/.env.local` and set `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. Google OAuth redirect: `http://localhost:3000/api/auth/callback/google`.

Public site: `/tr` (sign up / sign in). Each org admin panel: `/tr/app/{slug}`.

## Structure

```
apps/web          Next.js admin console (tRPC + next-intl TR/EN)
packages/schema   Template & rule Zod schemas
packages/compiler Email-safe HTML compiler
packages/linter   Quality Score linter
packages/rules    Rule engine + simulator
packages/db       Prisma + SQLite seed data
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web dev server |
| `pnpm dev:clean` | Clear `.next` cache and start dev (fixes Internal Server Error) |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests (unit + e2e) |
| `pnpm db:seed` | Seed demo org data |

## MVP Features

- Template block editor with live preview + lint score
- Rule builder (conditions, actions, priority)
- Simulator with explanation trace timeline
- Directory (seed users, read-only)
- Campaigns list
- Public audit tool (client-side only, no server storage)
- TR/EN i18n

## Architectural Notes

- Google signatures are **stored** via Gmail API (deploy — coming soon)
- Microsoft signatures are **applied at compose time** via Outlook add-in (coming soon)
- Template JSON is source of truth; HTML is generated output

See `docs/build-plan.md` for full production plan.
