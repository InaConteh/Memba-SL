-- Migration 0007: reference default, customer_balances, trigger function grants.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Start from empty tables: `supabase db start` loads seed.sql first. Undone by the rollback.
truncate businesses cascade;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@example.test');
insert into businesses (id, name, segment) values
  ('00000000-0000-0000-0000-0000000000a2', 'Test School A', 'school'),
  ('00000000-0000-0000-0000-0000000000b2', 'Test Wholesaler B', 'wholesaler');
insert into memberships (business_id, user_id) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1');
insert into customers (id, business_id, name, phone) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'Owes money', '+23200000001'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a2', 'Owes nothing', null),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b2', 'Other business', null);
insert into invoices (id, business_id, customer_id, description, amount_minor, due_date) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c1', 'Overdue, part paid', 1000, '2026-10-01'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c1', 'Not due yet', 500, '2099-01-01'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c1', 'Paid in full', 300, '2026-10-01');
insert into payments (business_id, invoice_id, amount_minor, method) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 400, 'cash'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e3', 300, 'cash');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- The app inserts invoices without a reference
select lives_ok($$insert into invoices (id, business_id, customer_id, description, amount_minor, due_date) values
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c2', 'Created by the app', 700, '2099-01-01')$$,
  'a member can create an invoice without sending a reference');
select matches((select reference from invoices where id = '00000000-0000-0000-0000-0000000000e4'),
  '^M-[0-9]{4}$', 'the database still issues the reference');

select results_eq(
  $$select owed_minor, overdue_minor, oldest_due_date, open_invoices from customer_balances
    where id = '00000000-0000-0000-0000-0000000000c1'$$,
  $$values (1100::bigint, 600::bigint, '2026-10-01'::date, 2::bigint)$$,
  'customer_balances sums open balances, overdue only past the due date, and skips paid invoices');
select results_eq(
  $$select name, owed_minor, overdue_minor, open_invoices from customer_balances
    where id = '00000000-0000-0000-0000-0000000000c2'$$,
  $$values ('Owes nothing', 700::bigint, 0::bigint, 1::bigint)$$,
  'customer_balances carries the customer columns and shows zeros, not blanks');
select is((select count(*) from customer_balances where business_id = '00000000-0000-0000-0000-0000000000b2')::int,
  0, 'A cannot see B''s customers in customer_balances');
reset role;

select ok(not has_function_privilege('authenticated', 'check_payment()', 'execute')
  and not has_function_privilege('anon', 'check_payment()', 'execute'),
  'check_payment() cannot be called through the API');
select ok(not has_function_privilege('authenticated', 'sync_invoice_status()', 'execute')
  and not has_function_privilege('anon', 'sync_invoice_status()', 'execute'),
  'sync_invoice_status() cannot be called through the API');
select ok(not has_function_privilege('authenticated', 'cancel_reminders_on_writeoff()', 'execute')
  and not has_function_privilege('anon', 'cancel_reminders_on_writeoff()', 'execute'),
  'cancel_reminders_on_writeoff() cannot be called through the API');
select ok(not has_function_privilege('authenticated', 'assign_invoice_reference()', 'execute')
  and not has_function_privilege('anon', 'assign_invoice_reference()', 'execute'),
  'assign_invoice_reference() cannot be called through the API');

select * from finish();
rollback;
