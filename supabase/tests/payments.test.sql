-- Payments drive invoice status and reminder cancellation in the database.
-- Actions run as the signed-in owner, the way the app's server actions will.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@example.test');
insert into businesses (id, name, segment) values
  ('00000000-0000-0000-0000-0000000000a2', 'Test School A', 'school');
insert into memberships (business_id, user_id) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1');
insert into customers (id, business_id, name, phone) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'Customer', '+23200000001');
insert into schedules (id, business_id, name, is_default) values
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a2', 'Default', true);
insert into invoices (id, business_id, customer_id, schedule_id, description, amount_minor, due_date) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'Term 1', 100000, '2026-11-01'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'Term 2', 50000, '2026-11-01');
do $$ begin perform generate_due_reminders('2026-11-01'); end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- Part payment
select lives_ok($$insert into payments (id, business_id, invoice_id, amount_minor, method, recorded_by) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000e1', 40000, 'orange_money', '00000000-0000-0000-0000-0000000000a1')$$,
  'a part payment is accepted');
select results_eq(
  $$select paid_minor, balance_minor, status from invoice_balances where id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$values (40000::numeric, 60000::numeric, 'open')$$,
  'a part payment reduces the balance and keeps the invoice open');
select is((select status from reminders where invoice_id = '00000000-0000-0000-0000-0000000000e1'),
  'prepared', 'a part payment leaves the reminder active');

-- Overpayment
select throws_ok($$insert into payments (business_id, invoice_id, amount_minor, method, recorded_by) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 70000, 'cash',
   '00000000-0000-0000-0000-0000000000a1')$$,
  '23514', 'Payment of 70000 exceeds balance of 60000', 'a payment above the balance is rejected');

-- Full payment
select lives_ok($$insert into payments (id, business_id, invoice_id, amount_minor, method, recorded_by) values
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000e1', 60000, 'afrimoney', '00000000-0000-0000-0000-0000000000a1')$$,
  'the remaining balance is accepted');
select results_eq(
  $$select balance_minor, status from invoice_balances where id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$values (0::numeric, 'paid')$$,
  'full payment marks the invoice paid');
select results_eq(
  $$select status, skip_reason from reminders where invoice_id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$values ('cancelled', 'paid')$$,
  'full payment cancels the open reminder');

-- Void
select lives_ok($$update payments set voided_at = now(), void_reason = 'Entered twice'
  where id = '00000000-0000-0000-0000-0000000000f2'$$,
  'the owner can void a payment');
select results_eq(
  $$select balance_minor, status from invoice_balances where id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$values (60000::numeric, 'open')$$,
  'voiding a payment reopens the invoice');
select is((select status from reminders where invoice_id = '00000000-0000-0000-0000-0000000000e1'),
  'cancelled', 'voiding does not bring back a cancelled reminder (known gap, see blueprint notes)');
select throws_ok($$update payments set voided_at = null where id = '00000000-0000-0000-0000-0000000000f2'$$,
  '23514', 'This payment is already voided', 'a voided payment cannot be un-voided');

-- Payments are never edited or deleted
select throws_ok($$update payments set amount_minor = 1 where id = '00000000-0000-0000-0000-0000000000f1'$$,
  '42501', null, 'the owner cannot edit a payment amount');
select is_empty($$delete from payments where id = '00000000-0000-0000-0000-0000000000f1' returning id$$,
  'the owner cannot delete a payment');

-- Paid status comes only from payments
select throws_ok($$update invoices set status = 'paid' where id = '00000000-0000-0000-0000-0000000000e1'$$,
  '23514', 'Invoice still has a balance of 60000; record a payment instead',
  'an invoice with a balance cannot be marked paid by hand');

-- Write-off
select lives_ok($$update invoices set status = 'written_off' where id = '00000000-0000-0000-0000-0000000000e2'$$,
  'the owner can write off an invoice');
select results_eq(
  $$select status, skip_reason from reminders where invoice_id = '00000000-0000-0000-0000-0000000000e2'$$,
  $$values ('cancelled', 'written_off')$$,
  'writing off cancels the open reminder');

-- Reminders: the owner changes status, not what the reminder is for
select throws_ok($$update reminders set invoice_id = '00000000-0000-0000-0000-0000000000e2'
  where invoice_id = '00000000-0000-0000-0000-0000000000e1'$$,
  '42501', null, 'the owner cannot move a reminder to another invoice');

-- Even the service role cannot change a payment's amount
reset role;
select throws_ok($$update payments set amount_minor = 1 where id = '00000000-0000-0000-0000-0000000000f1'$$,
  '23514', null, 'nobody can change a payment amount, even outside the app');

select * from finish();
rollback;
