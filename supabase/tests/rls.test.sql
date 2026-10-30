-- Two-business isolation: user A must not read or write business B's rows
-- in any table. Ids: …a1 user A, …a2 business A, …b1 user B, …b2 business B.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@example.test');
insert into businesses (id, name, segment) values
  ('00000000-0000-0000-0000-0000000000a2', 'Test School A', 'school'),
  ('00000000-0000-0000-0000-0000000000b2', 'Test Wholesaler B', 'wholesaler');
insert into memberships (business_id, user_id) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b1');
insert into customers (id, business_id, name, phone) values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a2', 'Customer A', '+23200000001'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b2', 'Customer B', '+23200000002');
insert into schedules (id, business_id, name, is_default) values
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a2', 'Default', true),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b2', 'Default', true);
insert into templates (business_id, language, tone, body) values
  ('00000000-0000-0000-0000-0000000000a2', 'en', 'gentle', 'Hello {customer_name}'),
  ('00000000-0000-0000-0000-0000000000b2', 'en', 'gentle', 'Hello {customer_name}');
insert into invoices (id, business_id, customer_id, schedule_id, description, amount_minor, due_date) values
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4', 'Fees A', 100000, '2026-11-01'),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000b2',
   '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b4', 'Goods B', 100000, '2026-11-01');
insert into payments (id, business_id, invoice_id, amount_minor, method) values
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000a5', 1000, 'cash'),
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000b2',
   '00000000-0000-0000-0000-0000000000b5', 1000, 'cash');
insert into reminders (id, business_id, invoice_id, step, due_on, tone) values
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000a5', 1, '2026-11-01', 'gentle'),
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-0000000000b2',
   '00000000-0000-0000-0000-0000000000b5', 1, '2026-11-01', 'gentle');
insert into events (business_id, actor_id, type) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'test.a'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b1', 'test.b');

-- Act as user A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- A sees its own rows, so the checks below aren't passing on an empty view
select ok(
  (select count(*) from businesses) = 1 and (select count(*) from memberships) = 1
  and (select count(*) from customers) = 1 and (select count(*) from schedules) = 1
  and (select count(*) from templates) = 1 and (select count(*) from invoices) = 1
  and (select count(*) from payments) = 1 and (select count(*) from reminders) = 1
  and (select count(*) from events) = 1 and (select count(*) from invoice_balances) = 1,
  'A sees exactly its own row in every table');

-- Read
select is((select count(*) from businesses where id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B businesses');
select is((select count(*) from memberships where business_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B memberships');
select is((select count(*) from customers where business_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B customers');
select is((select count(*) from schedules where business_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B schedules');
select is((select count(*) from templates where business_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B templates');
select is((select count(*) from invoices where business_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B invoices');
select is((select count(*) from invoice_balances where business_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B invoice_balances');
select is((select count(*) from payments where business_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B payments');
select is((select count(*) from reminders where business_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B reminders');
select is((select count(*) from events where business_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'A cannot read B events');

-- Insert into B
select throws_ok($$insert into businesses (name, segment) values ('Sneaky', 'other')$$,
  '42501', null, 'A cannot create businesses');
select throws_ok($$insert into memberships (business_id, user_id) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'A cannot join B');
select throws_ok($$insert into customers (business_id, name) values
  ('00000000-0000-0000-0000-0000000000b2', 'Sneaky')$$,
  '42501', null, 'A cannot insert B customers');
select throws_ok($$insert into schedules (business_id, name) values
  ('00000000-0000-0000-0000-0000000000b2', 'Sneaky')$$,
  '42501', null, 'A cannot insert B schedules');
select throws_ok($$insert into templates (business_id, language, tone, body) values
  ('00000000-0000-0000-0000-0000000000b2', 'en', 'firm', 'Sneaky')$$,
  '42501', null, 'A cannot insert B templates');
select throws_ok($$insert into invoices (business_id, customer_id, description, amount_minor, due_date) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b3', 'Sneaky', 100, '2026-11-01')$$,
  '42501', null, 'A cannot insert B invoices');
select throws_ok($$insert into payments (business_id, invoice_id, amount_minor, method, recorded_by) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b5', 100, 'cash',
   '00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'A cannot insert B payments');
select throws_ok($$insert into reminders (business_id, invoice_id, step, due_on, tone) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b5', 2, '2026-11-04', 'firm')$$,
  '42501', null, 'A cannot insert B reminders');
select throws_ok($$insert into events (business_id, actor_id, type) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'sneaky')$$,
  '42501', null, 'A cannot insert B events');

-- Update B (RLS hides the rows, so nothing is updated)
select is_empty($$update businesses set name = 'x' where id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot update B businesses');
select is_empty($$update memberships set role = 'staff' where business_id = '00000000-0000-0000-0000-0000000000b2' returning user_id$$, 'A cannot update B memberships');
select is_empty($$update customers set name = 'x' where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot update B customers');
select is_empty($$update schedules set name = 'x' where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot update B schedules');
select is_empty($$update templates set body = 'x' where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot update B templates');
select is_empty($$update invoices set description = 'x' where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot update B invoices');
select is_empty($$update payments set void_reason = 'x' where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot update B payments');
select is_empty($$update reminders set status = 'skipped' where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot update B reminders');
select is_empty($$update events set type = 'x' where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot update B events');

-- Delete B
select is_empty($$delete from businesses where id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot delete B businesses');
select is_empty($$delete from memberships where business_id = '00000000-0000-0000-0000-0000000000b2' returning user_id$$, 'A cannot delete B memberships');
select is_empty($$delete from customers where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot delete B customers');
select is_empty($$delete from schedules where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot delete B schedules');
select is_empty($$delete from templates where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot delete B templates');
select is_empty($$delete from invoices where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot delete B invoices');
select is_empty($$delete from payments where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot delete B payments');
select is_empty($$delete from reminders where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot delete B reminders');
select is_empty($$delete from events where business_id = '00000000-0000-0000-0000-0000000000b2' returning id$$, 'A cannot delete B events');

-- Moving A's own rows into B
select throws_ok($$update customers set business_id = '00000000-0000-0000-0000-0000000000b2'
  where id = '00000000-0000-0000-0000-0000000000a3'$$,
  '42501', null, 'A cannot move a customer into B');
select throws_ok($$update invoices set business_id = '00000000-0000-0000-0000-0000000000b2'
  where id = '00000000-0000-0000-0000-0000000000a5'$$,
  '42501', null, 'A cannot move an invoice into B');

-- Signed out
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select ok(
  (select count(*) from businesses) + (select count(*) from memberships)
  + (select count(*) from customers) + (select count(*) from schedules)
  + (select count(*) from templates) + (select count(*) from invoices)
  + (select count(*) from payments) + (select count(*) from reminders)
  + (select count(*) from events) + (select count(*) from invoice_balances) = 0,
  'a signed-out visitor sees no rows');

reset role;
select * from finish();
rollback;
