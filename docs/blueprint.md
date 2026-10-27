# Memba Pilot Build Blueprint

Oct 26, 2026 · @Ina Conteh

This blueprint builds Release A, the version five pilot businesses use, between October 27 and November 13. It is one Next.js app on Supabase with no paid integrations, so it ships even if Monime or SMS access is delayed.

## 1. Scope and key decisions

**In the pilot build**

- Email + password login; you create each business and its owner account during setup
- Customers, invoices (with part-payments), payments (recorded by hand)
- CSV import with an error list
- Daily reminder queue; one tap opens WhatsApp with the message filled in
- Reminder states: `prepared → opened → owner_confirmed_sent` (plus `skipped`, `cancelled`)
- English templates (Krio added once a native speaker writes them)
- Dashboard: owed, overdue, collected, paid after a reminder
- Data export (CSV) for each business
- One segment-specific feature, chosen at the November 1 gate

**Not in the pilot build:** Monime pay links (added only if the sandbox spike works), automatic SMS, staff roles, offline mode, AI, subscription billing.

**Decisions that shape the code**

| Decision | Choice | Why |
| --- | --- | --- |
| Login | Email + password; accounts created by you with a script | Phone OTP needs an SMS provider from day one. Almost every Android user has a Gmail address. Add phone OTP later through Supabase's Send SMS hook. |
| Money | `bigint` minor units (1 NLe = 100); never floats | Matches Monime's convention; supports NLe 25.50 |
| Currency | New Leones (NLe) only | Old-Leone notebooks are 1,000× larger. The import flags any amount over a threshold you set. |
| Phone numbers | Stored in E.164 (`+232XXXXXXXX`) | Needed for `wa.me` links; one format avoids duplicates |
| Reminders | Rows created daily by a database function, one per invoice step, unique | Can't duplicate, survives restarts, gives an audit trail |
| Balances | Calculated from payments, never stored | One source of truth; no drift |
| Paid status | Set by a database trigger when the balance reaches zero | Reminders stop even if the app has a bug |
| Payments | Never deleted; voided with a reason | Keeps the record honest |
| Admin | A script, not an admin UI | Five businesses don't need an admin panel |

## 2. Stack, setup and repo structure

| Layer | Choice |
| --- | --- |
| App | Next.js (App Router) + TypeScript, server actions, mobile-first |
| UI | Tailwind CSS + shadcn/ui |
| Database / auth / cron | Supabase: Postgres, Auth, pg\_cron |
| Validation | zod |
| CSV import | Papa Parse (CSV only; owners "Save as CSV" from Excel) |
| Tests | Vitest (logic), pgTAP via `supabase test db` (database), Playwright (one end-to-end flow) |
| Hosting | Vercel (region London, `lhr1`) + Supabase (region London) |

**Setup**

```bash
npx create-next-app@latest memba --ts --tailwind --app --src-dir --eslint
cd memba
npm i @supabase/supabase-js @supabase/ssr zod papaparse
npm i -D supabase vitest @types/papaparse @playwright/test tsx
npx shadcn@latest init
npx supabase init
npx supabase start        # local Postgres + Auth (needs Docker)
git init && git checkout -b main
```

Use `main` plus short feature branches. Merge only when tests pass.

**Repo structure**

```text
memba/
├─ CLAUDE.md                      # rules for Claude Code (section 9)
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_schema.sql            # tables, constraints, view
│  │  ├─ 0002_rls.sql               # row-level security
│  │  ├─ 0003_payments_triggers.sql # paid status, overpayment guard
│  │  └─ 0004_reminders.sql         # generator + pg_cron job
│  ├─ tests/                        # pgTAP: rls, reminders, payments
│  └─ seed.sql                      # fictional data only
├─ scripts/
│  └─ create-business.ts            # creates business, owner, default schedule + templates
├─ src/
│  ├─ app/
│  │  ├─ login/page.tsx
│  │  └─ (app)/                     # signed-in area, bottom nav
│  │     ├─ today/page.tsx          # reminder queue (home)
│  │     ├─ customers/[id]/page.tsx
│  │     ├─ customers/page.tsx
│  │     ├─ invoices/[id]/page.tsx
│  │     ├─ invoices/new/page.tsx
│  │     ├─ import/page.tsx
│  │     ├─ dashboard/page.tsx
│  │     └─ settings/page.tsx
│  ├─ actions/                      # server actions, one file per area
│  ├─ lib/
│  │  ├─ money.ts  phone.ts  templates.ts  whatsapp.ts
│  │  ├─ schemas.ts                 # zod schemas
│  │  └─ supabase/server.ts  supabase/client.ts
│  ├─ components/
│  └─ middleware.ts                 # refreshes session (proxy.ts on Next.js 16+)
└─ tests/
   ├─ unit/                         # money, phone, templates, whatsapp
   └─ e2e/pilot-flow.spec.ts
```

## 3. Database schema and row-level security

Every table carries `business_id`. Composite foreign keys stop an invoice from pointing at another business's customer, even if the app has a bug.

**`0001_schema.sql`**

```sql
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  segment text not null check (segment in ('school','wholesaler','property','agency','other')),
  pay_instructions text,            -- e.g. 'Orange Money merchant code 123456'
  default_language text not null default 'en' check (default_language in ('en','kri')),
  large_amount_warning_minor bigint not null default 10000000,  -- NLe 100,000: flags old-Leone typos
  created_at timestamptz not null default now()
);

create table memberships (
  business_id uuid not null references businesses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'owner' check (role in ('owner','staff')),
  primary key (business_id, user_id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  name text not null check (length(name) between 1 and 120),
  phone text check (phone ~ '^\+232[0-9]{8}$'),
  language text not null default 'en' check (language in ('en','kri')),
  group_label text,                 -- class 'JSS 2', delivery route, building
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, id)
);
create index on customers (business_id, name);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  name text not null,
  offsets_days int[] not null default '{0,3,7}',
  tones text[] not null default '{gentle,firm,final}',
  is_default boolean not null default false,
  check (cardinality(offsets_days) = cardinality(tones)),
  unique (business_id, id)
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  language text not null check (language in ('en','kri')),
  tone text not null check (tone in ('gentle','firm','final')),
  body text not null,
  unique (business_id, language, tone)
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  customer_id uuid not null,
  schedule_id uuid,
  description text not null,        -- 'Term 1 fees - Aminata (JSS 2)'
  amount_minor bigint not null check (amount_minor > 0),
  due_date date not null,
  status text not null default 'open' check (status in ('open','paid','written_off')),
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, customer_id) references customers (business_id, id),
  foreign key (business_id, schedule_id) references schedules (business_id, id)
);
create index on invoices (business_id, status, due_date);

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  invoice_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0),
  method text not null check (method in ('cash','orange_money','afrimoney','bank','other')),
  reference text,
  paid_on date not null default current_date,
  recorded_by uuid references auth.users,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text,
  foreign key (business_id, invoice_id) references invoices (business_id, id)
);
create index on payments (invoice_id);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  invoice_id uuid not null,
  step int not null,
  due_on date not null,
  tone text not null,
  status text not null default 'prepared'
    check (status in ('prepared','opened','owner_confirmed_sent','skipped','cancelled')),
  skip_reason text,
  message_body text,                -- rendered when opened
  opened_at timestamptz,
  sent_at timestamptz,
  actioned_by uuid references auth.users,
  created_at timestamptz not null default now(),
  unique (invoice_id, step),
  foreign key (business_id, invoice_id) references invoices (business_id, id)
);
create index on reminders (business_id, status, due_on);

create table events (               -- append-only audit trail
  id bigint generated always as identity primary key,
  business_id uuid references businesses on delete cascade,
  actor_id uuid,
  type text not null,               -- 'payment.recorded', 'reminder.opened', ...
  entity_id uuid,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create view invoice_balances with (security_invoker = true) as
select i.*,
  coalesce(sum(p.amount_minor) filter (where p.voided_at is null), 0) as paid_minor,
  i.amount_minor - coalesce(sum(p.amount_minor) filter (where p.voided_at is null), 0) as balance_minor
from invoices i
left join payments p on p.invoice_id = i.id
group by i.id;
```

**`0002_rls.sql`**

```sql
create function is_member(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.business_id = b and m.user_id = (select auth.uid())
  );
$$;

alter table businesses  enable row level security;
alter table memberships enable row level security;
alter table customers   enable row level security;
alter table schedules   enable row level security;
alter table templates   enable row level security;
alter table invoices    enable row level security;
alter table payments    enable row level security;
alter table reminders   enable row level security;
alter table events      enable row level security;

create policy biz_read   on businesses  for select using (is_member(id));
create policy biz_update on businesses  for update using (is_member(id)) with check (is_member(id));
create policy own_memberships on memberships for select using (user_id = (select auth.uid()));

-- full read/write for members
create policy members_all on customers for all using (is_member(business_id)) with check (is_member(business_id));
create policy members_all on schedules for all using (is_member(business_id)) with check (is_member(business_id));
create policy members_all on templates for all using (is_member(business_id)) with check (is_member(business_id));
create policy members_all on invoices  for all using (is_member(business_id)) with check (is_member(business_id));

-- payments: insert and void, never delete
create policy pay_read   on payments for select using (is_member(business_id));
create policy pay_insert on payments for insert with check (is_member(business_id) and recorded_by = (select auth.uid()));
create policy pay_void   on payments for update using (is_member(business_id)) with check (is_member(business_id));

-- reminders: created only by the generator; members read and update status
create policy rem_read   on reminders for select using (is_member(business_id));
create policy rem_update on reminders for update using (is_member(business_id)) with check (is_member(business_id));

-- events: append-only
create policy ev_read   on events for select using (is_member(business_id));
create policy ev_insert on events for insert with check (is_member(business_id) and actor_id = (select auth.uid()));
```

Customers are archived, never hard-deleted, until a business asks for its data to be erased. Erasure runs through the admin script.

## 4. Reminder engine

&#91;embedded content: reminder lifecycle · 5 states\]

The generator creates reminders; the owner moves them forward; the database cancels them when the money arrives. Opening WhatsApp is not proof of sending, so only the owner's confirmation counts.

**Rules**

- Once a day, each unpaid invoice gets **at most one** new reminder: the latest schedule step that is due. A late-entered invoice doesn't produce three reminders at once.
- `unique (invoice_id, step)` makes the generator safe to run any number of times.
- If the owner never opened yesterday's reminder and a newer step is due, the old one becomes `skipped` (superseded).
- Payments update status in the database, not the app. A full payment marks the invoice `paid` and cancels open reminders; voiding a payment reopens the invoice.
- Steps are numbered from 1. With the default schedule `{0,3,7}`, step 1 is due on the due date, step 2 three days later, step 3 seven days later.

All SQL below was run on PostgreSQL 16 and passed these checks: no duplicates on re-runs, superseding, part-payments, overpayment rejected, full payment cancelling reminders, void reopening, write-off cancelling, and one business unable to read or write another's data.

**`0003_payments_triggers.sql`**

```sql
-- Reject payments larger than the remaining balance (row lock prevents two at once)
create function check_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  perform 1 from invoices where id = new.invoice_id for update;
  select balance_minor into v_balance from invoice_balances where id = new.invoice_id;
  if new.amount_minor > v_balance then
    raise exception 'Payment of % exceeds balance of %', new.amount_minor, v_balance
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger payments_before_insert before insert on payments
  for each row execute function check_payment();

-- Keep invoice status in step with its balance; stop reminders once paid
create function sync_invoice_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  select balance_minor into v_balance from invoice_balances where id = new.invoice_id;
  if v_balance <= 0 then
    update invoices set status = 'paid', updated_at = now()
      where id = new.invoice_id and status = 'open';
    update reminders set status = 'cancelled', skip_reason = 'paid'
      where invoice_id = new.invoice_id and status in ('prepared','opened');
  else
    update invoices set status = 'open', updated_at = now()
      where id = new.invoice_id and status = 'paid';   -- a voided payment reopens it
  end if;
  return null;
end $$;
create trigger payments_after_change after insert or update of voided_at on payments
  for each row execute function sync_invoice_status();

-- Writing off an invoice cancels its open reminders
create function cancel_reminders_on_writeoff() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'written_off' and old.status <> 'written_off' then
    update reminders set status = 'cancelled', skip_reason = 'written_off'
      where invoice_id = new.id and status in ('prepared','opened');
  end if;
  return null;
end $$;
create trigger invoices_after_status after update of status on invoices
  for each row execute function cancel_reminders_on_writeoff();
```

**`0004_reminders.sql`**

```sql
create function generate_due_reminders(
  p_today date default (now() at time zone 'Africa/Freetown')::date
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with due as (
    select distinct on (b.id)
      b.business_id, b.id as invoice_id, s.step::int as step,
      b.due_date + s.offset_days as due_on, s.tone
    from invoice_balances b
    join customers c  on c.id = b.customer_id
    join schedules sc on sc.id = b.schedule_id
    cross join lateral unnest(sc.offsets_days, sc.tones)
      with ordinality as s(offset_days, tone, step)
    where b.status = 'open'
      and b.balance_minor > 0
      and c.archived_at is null
      and c.phone is not null
      and b.due_date + s.offset_days <= p_today
    order by b.id, s.step desc
  ), ins as (
    insert into reminders (business_id, invoice_id, step, due_on, tone)
    select business_id, invoice_id, step, due_on, tone from due
    on conflict (invoice_id, step) do nothing
    returning invoice_id, step
  ), superseded as (
    update reminders r set status = 'skipped', skip_reason = 'superseded'
    from ins
    where r.invoice_id = ins.invoice_id and r.step < ins.step and r.status = 'prepared'
    returning r.id
  )
  select count(*) into v_count from ins;

  insert into events (type, data)
  values ('cron.reminders_generated', jsonb_build_object('count', v_count, 'day', p_today));
  return v_count;
end $$;

-- Only the scheduler may run it (Supabase grants functions to these roles by default)
revoke execute on function generate_due_reminders(date) from public, anon, authenticated;

-- Enable pg_cron in the Supabase dashboard first. Freetown is UTC+0 all year.
select cron.schedule('memba-daily-reminders', '0 6 * * *',
  $$select public.generate_due_reminders()$$);
```

**Owner actions (server-side, conditional updates so a double tap can't skip a state)**

| Action | Update | Only if current status is |
| --- | --- | --- |
| Open in WhatsApp | `status = 'opened'`, `opened_at`, `message_body` | `prepared` or `opened` (reopening is allowed) |
| Confirm sent | `status = 'owner_confirmed_sent'`, `sent_at` | `opened` |
| Skip | `status = 'skipped'`, `skip_reason = 'owner'` | `prepared` or `opened` |

Block **Open** if the balance is already zero; the trigger will have cancelled it, but the page may be stale.

## 5. App logic: money, phones, templates, WhatsApp

Four small, pure modules hold the rules most likely to cause a wrong message or a wrong amount. The code and tests below pass (9 tests, Vitest).

**`src/lib/money.ts`**

```ts
/** Amounts are stored as integer minor units: NLe 1 = 100. Never use floats for money. */
export function parseLeones(input: string): number {
  const s = input.trim().replace(/^(NLe|SLE|Le)\s*/i, '').replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid amount: "${input}"`);
  const [whole, frac = ''] = s.split('.');
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error(`Invalid amount: "${input}"`);
  return minor;
}

export function formatLeones(minor: number): string {
  if (!Number.isSafeInteger(minor)) throw new Error('Amount must be an integer in minor units');
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100).toLocaleString('en-US');
  const cents = abs % 100;
  return `${sign}NLe ${whole}${cents ? '.' + String(cents).padStart(2, '0') : ''}`;
}
```

**`src/lib/phone.ts`**

```ts
/** Normalises a Sierra Leone mobile number to E.164 (+232XXXXXXXX), or returns null. */
export function normalizeSLPhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+232')) d = d.slice(4);
  else if (d.startsWith('00232')) d = d.slice(5);
  else if (d.startsWith('232') && d.length === 11) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^\d{8}$/.test(d) ? `+232${d}` : null;
}
```

**`src/lib/templates.ts`**

```ts
import { formatLeones } from './money';

export type TemplateVars = {
  customer_name: string;
  business_name: string;
  balance_minor: number;
  description: string;
  due_date: string;          // 'YYYY-MM-DD'
  pay_instructions?: string | null;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** Replaces {placeholders}. Unknown placeholders throw, so a typo never reaches a customer. */
export function renderTemplate(body: string, v: TemplateVars): string {
  const values: Record<string, string> = {
    customer_name: v.customer_name.trim(),
    business_name: v.business_name.trim(),
    amount: formatLeones(v.balance_minor),
    description: v.description.trim(),
    due_date: formatDate(v.due_date),
    pay_instructions: v.pay_instructions?.trim() ?? '',
  };
  const out = body.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`Unknown placeholder {${key}}`);
    return values[key];
  });
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
```

**`src/lib/whatsapp.ts`**

```ts
/** Click-to-chat link: the owner's own WhatsApp opens with the text filled in. */
export function whatsappLink(e164Phone: string, message: string): string {
  if (!/^\+232\d{8}$/.test(e164Phone)) throw new Error('Phone must be +232XXXXXXXX');
  return `https://wa.me/${e164Phone.slice(1)}?text=${encodeURIComponent(message)}`;
}
```

**Tests (`tests/unit/lib.test.ts`) cover:** `1,500.5 → 150050`; `NLe 25.50 → 2550`; rejecting `-5`, `0`, `1.234`, `1e5`; round-trips; five phone formats (`076 123456`, `+232 76 123456`, `0023276123456`, `23276123456`, `76-123-456`) normalising to `+23276123456`; wrong lengths and UK numbers rejected; unknown placeholders throwing; `&` encoded in links.

**Default English templates** (seeded by `create-business.ts`; the business can edit them)

| Tone | Body |
| --- | --- |
| gentle | Good day {customer\_name}. This is a friendly reminder from {business\_name}: {amount} for {description} was due on {due\_date}. {pay\_instructions} Thank you. |
| firm | Hello {customer\_name}. {business\_name} has not yet received {amount} for {description}, due on {due\_date}. Please pay this week. {pay\_instructions} If you have already paid, please reply so we can update our records. |
| final | Dear {customer\_name}, {amount} for {description} remains unpaid since {due\_date}. Please pay or call {business\_name} by the end of this week to agree a plan. {pay\_instructions} |

**Krio templates:** have a native Krio speaker write all three, then test them with two pilot owners before switching them on. Don't machine-translate.

## 6. Screens and server actions

Six screens behind a bottom nav (Today, Customers, Dashboard, Settings). Design for a 360 px Android screen, thumbs, and a slow connection: server-rendered pages, no charts library, big tap targets.

**Screens**

| Screen | Shows | Main actions | Empty / error state |
| --- | --- | --- | --- |
| **Today** (home) | Reminders `prepared`/`opened`, oldest first: customer, amount, days overdue, tone | Open in WhatsApp → I sent it / Skip; Record payment | "Nobody to remind today" + total owed |
| **Customers** | Search, list with balance owed | Add customer, open customer | "Add your first customer or import a list" |
| **Customer** | Phone, language, invoices, payments, reminder history | New invoice, record payment, archive | — |
| **Invoice** | Amount, paid, balance, due date, reminders, payments | Record payment, void payment, write off | — |
| **Import** | Upload CSV → map columns → preview with errors → confirm | Import valid rows | Lists every rejected row and why |
| **Dashboard** | Owed, overdue, collected this month, paid within 7 days of a confirmed reminder | Export data (CSV) | Zeros, not blanks |
| **Settings** | Business name, payment instructions, schedule, templates | Edit; preview a template with sample data | — |

Every form shows a pending state while saving and keeps the user's input on error.

**Server actions** (`src/actions/*`, each validates with zod, checks the session, and writes an `events` row)

| Action | Does | Guards |
| --- | --- | --- |
| `createCustomer` / `updateCustomer` | Saves customer; normalises phone | Phone must normalise; warn on duplicate phone in same business |
| `archiveCustomer` | Sets `archived_at` | Open invoices stay; reminders stop (generator filters archived) |
| `createInvoice` | Saves invoice with the business's default schedule | Amount via `parseLeones`; warn above `large_amount_warning_minor` |
| `recordPayment` | Inserts payment | DB rejects overpayment; show its message plainly |
| `voidPayment` | Sets `voided_at`, `void_reason` | Reason required |
| `writeOffInvoice` | `status = 'written_off'` | Confirm dialog |
| `openReminder` | Renders message, sets `opened`, returns `wa.me` link | Balance > 0; customer has phone |
| `confirmReminderSent` | `owner_confirmed_sent` | Only from `opened` |
| `skipReminder` | `skipped`, reason `owner` | Only from `prepared`/`opened` |
| `importCsv` | Validates all rows, inserts valid ones in one transaction (via an RPC) | Max 2,000 rows; returns row-level errors |
| `exportData` | CSV of customers, invoices, payments | Owner only |

**Example: `src/actions/reminders.ts`**

```ts
'use server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { renderTemplate } from '@/lib/templates';
import { whatsappLink } from '@/lib/whatsapp';

const Id = z.string().uuid();

export async function openReminder(reminderId: string) {
  const id = Id.parse(reminderId);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  // RLS limits this to the user's own business
  const { data: r, error } = await supabase
    .from('reminders')
    .select(`id, status, tone, business_id, invoice_id,
      invoice:invoice_balances!inner(description, due_date, balance_minor,
        customer:customers!inner(name, phone, language)),
      business:businesses!inner(name, pay_instructions)`)
    .eq('id', id)
    .single();
  if (error || !r) return { error: 'Reminder not found.' };
  if (!['prepared', 'opened'].includes(r.status)) return { error: 'This reminder is no longer active.' };
  if (r.invoice.balance_minor <= 0) return { error: 'This invoice is already paid.' };
  if (!r.invoice.customer.phone) return { error: 'Add a phone number for this customer first.' };

  const { data: t } = await supabase
    .from('templates')
    .select('body')
    .eq('business_id', r.business_id)
    .eq('language', r.invoice.customer.language)
    .eq('tone', r.tone)
    .single();
  if (!t) return { error: 'No message template for this language and tone.' };

  const message = renderTemplate(t.body, {
    customer_name: r.invoice.customer.name,
    business_name: r.business.name,
    balance_minor: r.invoice.balance_minor,
    description: r.invoice.description,
    due_date: r.invoice.due_date,
    pay_instructions: r.business.pay_instructions,
  });

  // Conditional update: a stale page or double tap can't move a cancelled reminder
  const { data: updated } = await supabase
    .from('reminders')
    .update({ status: 'opened', opened_at: new Date().toISOString(),
              message_body: message, actioned_by: user.id })
    .eq('id', id)
    .in('status', ['prepared', 'opened'])
    .select('id');
  if (!updated?.length) return { error: 'This reminder changed. Refresh the page.' };

  await supabase.from('events').insert({
    business_id: r.business_id, actor_id: user.id,
    type: 'reminder.opened', entity_id: id,
  });

  return { url: whatsappLink(r.invoice.customer.phone, message) };
}
```

The client calls `openReminder`, then `window.location.href = url`. When the owner comes back to the app, the card shows **I sent it** / **I didn't send it**. The embedded-select syntax above depends on how Supabase infers relationships through the view; if it complains, fetch the invoice and customer in a second query rather than fighting it.

## 7. Security, testing and deployment

**Security rules**

- The service-role key lives only in `scripts/` and your machine's `.env.local`. Never in `src/`, never in Vercel's public variables.
- Every server action calls `supabase.auth.getUser()` and relies on RLS; no action takes a `business_id` from the client without checking membership.
- Security-definer functions set `search_path = public` and are revoked from `anon`/`authenticated` unless users need them.
- Payments are never deleted; erasure for a business that leaves runs through the admin script and is logged.
- Real pilot data only in production. Local and preview environments use `seed.sql` (fictional).
- Run `npx supabase db lint` and the Supabase dashboard's Security Advisor before each deploy.

**Admin script: `scripts/create-business.ts`** (run with `npx tsx`)

1. Create the auth user with `auth.admin.createUser({ email, password, email_confirm: true })`.
2. Insert the business, the owner membership, a default schedule `{0,3,7}` and the three English templates.
3. Print the login details to hand over in person; the owner changes the password on first login.

**Tests**

| Layer | Tool | What |
| --- | --- | --- |
| Logic | Vitest | `money`, `phone`, `templates`, `whatsapp` (section 5) |
| Database | pgTAP (`npx supabase test db`) | The checks in section 4: no duplicates, supersede, part/over/full payment, void, write-off, two-business isolation |
| End to end | Playwright, mobile viewport | Sign in → add customer → invoice → run generator → open reminder → confirm sent → record full payment → reminder cancelled |
| Manual | Real Android phone on 3G | Every screen loads under 3 s; WhatsApp opens with the message intact, including `&`, accents and new lines |

CI (GitHub Actions): lint, type-check, Vitest and pgTAP on every push. Playwright on merges to `main`.

**Environments and variables**

| Variable | Where | Secret |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key) | Vercel + local | No (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your machine only, for scripts | **Yes** |
| `SENTRY_DSN` | Vercel | No |

**Deployment**

1. Create the Supabase project in London; enable pg\_cron.
2. `npx supabase link` then `npx supabase db push` to apply migrations.
3. Connect the GitHub repo to Vercel; set the function region to London (`lhr1`).
4. Use a paid Supabase plan for the pilot. Free projects pause after a week of inactivity, and you need reliable backups once real data is in. Check current pricing and what backups your plan includes; if none, schedule a nightly `pg_dump` to private storage.
5. Add Sentry for errors. Check the `events` table each morning for today's `cron.reminders_generated` row; if it's missing, the cron didn't run.

**Before the first pilot business logs in**

- [ ] pgTAP isolation test passes against production schema
- [ ] Backups confirmed by restoring one into a scratch project
- [ ] Data export works for a test business
- [ ] Your support phone number shown in the app
- [ ] Pilot agreement signed

## 8. Build schedule with Claude Code prompts

One block per day or two, each ending with passing tests and a merge to `main`. Keep interviewing in the mornings until the November 1 gate. Use Claude Code to build and Codex to review each block's diff before merging.

**Oct 27 — Monime spike (throwaway repo)**

- [ ] One sandbox payment, one verified webhook, written notes on the merchant model and fees

```text
In a new throwaway Next.js repo, call the Monime sandbox API to create one payment link for NLe 10.00 (1000 minor units), and add one webhook route that verifies the signature and logs the event. Read Monime's docs first and cite the endpoints you use. No database. Write NOTES.md with what worked, what didn't, and open questions for Monime.
```

**Oct 28 — Repo and tooling**

- [ ] Next.js app, Supabase local, CLAUDE.md (section 9), Vitest, CI

```text
Read CLAUDE.md. Set up the repo exactly as in the blueprint's section 2: folders, Supabase local, Vitest, Playwright, GitHub Actions running lint, type-check, Vitest and `supabase test db`. Add src/lib/money.ts, phone.ts, templates.ts, whatsapp.ts and their tests from the blueprint unchanged. Stop when CI is green.
```

**Oct 29–30 — Database**

- [ ] Migrations 0001–0004 from sections 3–4
- [ ] pgTAP tests for every check listed in section 4
- [ ] `seed.sql` with two fictional businesses

```text
Add the four migrations from the blueprint exactly as written. Then write pgTAP tests in supabase/tests for: generator idempotency, superseding, part payment, overpayment rejection, full payment cancelling reminders, void reopening, write-off cancelling, and user A unable to read or write business B's rows in every table. Don't change migrations to make tests pass without telling me why.
```

**Oct 31 — Auth and shell**

- [ ] Email/password login, session refresh, signed-in layout with bottom nav
- [ ] `scripts/create-business.ts`

```text
Add Supabase SSR auth (email + password, no sign-up page), the session-refresh middleware, a signed-in layout with a bottom nav (Today, Customers, Dashboard, Settings), and scripts/create-business.ts as described in the blueprint section 7. Mobile-first, 360px wide.
```

**Nov 1 — Gate: decide the segment.** Only continue if 5 deposits are in. Note the segment-specific feature for Nov 9.

**Nov 2–3 — Customers, invoices, payments**

- [ ] Customers list/detail, invoice create/detail, record and void payment, write off

```text
Build the Customers, Customer, and Invoice screens and the server actions createCustomer, updateCustomer, archiveCustomer, createInvoice, recordPayment, voidPayment and writeOffInvoice per blueprint section 6. Validate with zod, use parseLeones/normalizeSLPhone, write an events row per action, and show loading, empty and error states. Add a Playwright test for create invoice → part payment → full payment.
```

**Nov 4 — CSV import**

- [ ] Upload, column mapping, preview with row errors, transactional insert

```text
Build the Import screen: upload CSV (Papa Parse), map columns to name, phone, description, amount, due date, group; preview every row with errors (bad phone, bad amount, amount above the business's warning threshold, missing due date); insert valid rows in one transaction via a Postgres function. Max 2,000 rows. Test with a fixture containing 5 good and 5 bad rows.
```

**Nov 5–6 — Today queue and WhatsApp**

- [ ] Today screen, openReminder / confirmReminderSent / skipReminder
- [ ] pg\_cron job scheduled in local Supabase

```text
Build the Today screen and the reminder actions from blueprint sections 4 and 6, using the openReminder example as the pattern. After returning from WhatsApp, the card asks "I sent it" / "I didn't send it". Use conditional updates so a double tap or stale page can't skip a state. Extend the Playwright test through generator → open → confirm → payment → cancelled.
```

**Nov 7 — Settings and templates**

- [ ] Business details, payment instructions, schedule editor, template editor with live preview

**Nov 8 — Dashboard and export**

- [ ] Owed, overdue, collected this month, paid within 7 days of a confirmed reminder; CSV export

**Nov 9 — Segment feature**

- [ ] Schools: bulk-create term invoices for a class (`group_label`). Wholesalers: quick-add invoice from the Customer screen in 3 taps.

**Nov 10 — Hardening**

- [ ] Codex security review of the full diff; fix findings
- [ ] Real Android phone on 3G; Lighthouse mobile check

```text
Review the whole repo as a security reviewer: RLS gaps, server actions trusting client input, service-role key exposure, missing auth checks, money handled as floats, and anything that could send a reminder for a paid invoice. List findings by severity with file and line. Don't fix anything yet.
```

**Nov 11 — Production**

- [ ] Supabase project (London), migrations pushed, pg\_cron on, Vercel deploy, Sentry, backups verified
- [ ] Full dry run with a fictional business on a real phone

**Nov 12–13 — Buffer**

- [ ] Fix dry-run issues. If the Monime spike worked, add pay links behind a feature flag; otherwise leave them for after the pilot.

**Nov 14 — First pilot setup**

## 9. CLAUDE.md for the repo

Put this at the repo root on October 28. Claude Code reads it at the start of every session.

```markdown
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
```
