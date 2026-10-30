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
