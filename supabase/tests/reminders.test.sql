-- Reminder generator: at most one new reminder per invoice per run, safe to
-- re-run, older unopened steps superseded. Default schedule {0,3,7}.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- The generator works across all businesses, so start from empty tables:
-- `supabase db start` loads seed.sql first. Undone by the rollback below.
truncate businesses cascade;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@example.test');
insert into businesses (id, name, segment) values
  ('00000000-0000-0000-0000-0000000000a2', 'Test School A', 'school');
insert into memberships (business_id, user_id) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1');
insert into customers (id, business_id, name, phone, archived_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'With phone', '+23200000001', null),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a2', 'No phone', null, null),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a2', 'Archived', '+23200000003', now());
insert into schedules (id, business_id, name, is_default) values
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a2', 'Default', true);
insert into invoices (id, business_id, customer_id, schedule_id, description, amount_minor, due_date) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'Term 1', 100000, '2026-11-01');

select is(generate_due_reminders('2026-10-31'), 0, 'nothing is due before the due date');
select is(generate_due_reminders('2026-11-01'), 1, 'step 1 is created on the due date');
select results_eq(
  $$select step, tone, status, due_on from reminders where invoice_id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$values (1, 'gentle', 'prepared', '2026-11-01'::date)$$,
  'step 1 is a prepared gentle reminder');
select is(generate_due_reminders('2026-11-01'), 0, 'running again the same day creates nothing');
select is(generate_due_reminders('2026-11-02'), 0, 'nothing new before step 2 is due');
select is(generate_due_reminders('2026-11-04'), 1, 'step 2 is created three days later');
select results_eq(
  $$select step, status, skip_reason from reminders
    where invoice_id = '00000000-0000-0000-0000-0000000000e1' order by step$$,
  $$values (1, 'skipped', 'superseded'), (2, 'prepared', null::text)$$,
  'an unopened step 1 is superseded by step 2');

-- An opened reminder is the owner's to finish, so it is not superseded
update reminders set status = 'opened'
  where invoice_id = '00000000-0000-0000-0000-0000000000e1' and step = 2;
select is(generate_due_reminders('2026-11-08'), 1, 'step 3 is created seven days later');
select results_eq(
  $$select step, status from reminders
    where invoice_id = '00000000-0000-0000-0000-0000000000e1' order by step$$,
  $$values (1, 'skipped'), (2, 'opened'), (3, 'prepared')$$,
  'an opened step 2 is left alone when step 3 arrives');

-- A late-entered invoice gets only its latest due step; others get none
insert into invoices (id, business_id, customer_id, schedule_id, description, amount_minor, due_date, status) values
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'Entered late', 100000, '2026-10-20', 'open'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a4', 'No phone', 100000, '2026-10-20', 'open'),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a4', 'Archived customer', 100000, '2026-10-20', 'open'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'Written off', 100000, '2026-10-20', 'written_off'),
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'Paid in full', 100000, '2026-10-20', 'open');
insert into payments (business_id, invoice_id, amount_minor, method) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e6', 100000, 'cash');

select is(generate_due_reminders('2026-11-08'), 1, 'only the late-entered invoice gets a reminder');
select results_eq(
  $$select step, tone from reminders where invoice_id = '00000000-0000-0000-0000-0000000000e2'$$,
  $$values (3, 'final')$$,
  'a late-entered invoice gets only its latest due step');
select is(
  (select count(*) from reminders where invoice_id in (
    '00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e4',
    '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e6'))::int,
  0, 'no reminders for a customer without a phone, an archived customer, or a written-off or paid invoice');

select is(
  (select data from events where type = 'cron.reminders_generated' order by id desc limit 1),
  '{"count": 1, "day": "2026-11-08"}'::jsonb,
  'each run logs an event with its count and day');

-- Only the scheduler may run the generator
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok('select generate_due_reminders()', '42501', null,
  'signed-in users cannot run the generator');
reset role;

select * from finish();
rollback;
