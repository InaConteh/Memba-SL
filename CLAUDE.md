# Memba

Mobile-first web app that helps Sierra Leone businesses (schools, wholesalers) remind
customers who owe money, via WhatsApp messages the owner approves, and record payments.
Pilot phase: 5 businesses. Build the smallest working version; no speculative features.

## Stack
Next.js App Router + TypeScript, Tailwind + shadcn/ui, Supabase (Postgres, Auth, pg_cron),
zod, Papa Parse. Tests: Vitest, pgTAP (`npx supabase test db`), Playwright.

## Commands
- `npm run dev` — app on :3000 (needs `npx supabase start`)
- `npm test` — Vitest
- `npx supabase test db` — database tests
- `npx playwright test` — end-to-end
- `npx supabase migration new <name>` — new migration (never edit an applied one)

## Non-negotiable rules
- Money is integer minor units (`bigint`, NLe 1 = 100). Use `lib/money.ts`. Never floats.
- Phones are E.164 `+232XXXXXXXX`. Use `lib/phone.ts`.
- Every table has `business_id` and RLS. Never bypass RLS in app code.
- The service-role key is only for `scripts/`. Never import it in `src/`.
- Balances are computed (`invoice_balances` view), never stored.
- Invoice paid status and reminder cancellation happen in DB triggers. Don't duplicate in app code.
- Reminder status moves only: prepared → opened → owner_confirmed_sent, or → skipped/cancelled.
  Use conditional updates (`.in('status', [...])`).
- Opening WhatsApp is NOT proof of sending. Only owner confirmation sets owner_confirmed_sent.
- Never mark an invoice paid without a recorded payment.
- Payments are voided, never deleted.
- Every server action: zod-validate input, `auth.getUser()`, write an `events` row.
- Every screen handles loading, empty and error states. Design for 360px Android on 3G.
- No real customer data in seed files, fixtures or screenshots.

## How to work
- One feature per branch. Run all tests before saying a task is done.
- If a migration or test seems wrong, say so instead of changing it to pass.
- Ask before adding a dependency.
