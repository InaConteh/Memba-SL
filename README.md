# Memba

Memba helps Sierra Leone businesses get back money they're owed. It keeps a record of customers and invoices, prepares friendly WhatsApp reminders that the owner approves and sends, and records what customers pay.

*We do the remembering, so you don't have to do the asking.*

Pilot phase: 5 businesses (schools and wholesalers). See [`docs/blueprint.md`](docs/blueprint.md) for scope and [`CLAUDE.md`](CLAUDE.md) for the rules the code follows.

## Stack

Next.js (App Router) + TypeScript · Tailwind + shadcn/ui · Supabase (Postgres, Auth, pg_cron) · zod · Papa Parse · Vitest, pgTAP, Playwright.

## Run it

```bash
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm ci
npx supabase start           # local Postgres + Auth (needs Docker)
npm run dev                  # http://localhost:3000
```

## Test it

```bash
npm run lint && npm run typecheck
npm test                     # Vitest
npx supabase test db         # pgTAP database tests
npx playwright test          # end to end
```

## Docs

| Doc | What it covers |
| --- | --- |
| [`docs/blueprint.md`](docs/blueprint.md) | Pilot build plan: scope, schema, decisions, build order |
| [`docs/brand.md`](docs/brand.md) | Logo, colours, type and voice |
| [`docs/design/app-screens.md`](docs/design/app-screens.md) | The designed screens and how they map to this app |
| [`docs/launch-plan.md`](docs/launch-plan.md) | Launch, channels, pricing and monetisation |
| [`docs/platform.md`](docs/platform.md) | Why Memba is an installable web app, not a native app (yet) |
| [`docs/payments-providers.md`](docs/payments-providers.md) | Monime vs Tenki Pay for pay links |
