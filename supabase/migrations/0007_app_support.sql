-- Support for the Customers, Invoice and Payment screens.

-- The trigger from 0005 always issues the reference; with a default the app
-- can leave it out. If the trigger were ever missing, '' fails the format check.
alter table invoices alter column reference set default '';

-- Per-customer totals for the Customers list. Computed, never stored; zeros
-- (not nulls) for customers who owe nothing.
create view customer_balances with (security_invoker = true) as
select c.*,
  coalesce(sum(b.balance_minor) filter (where b.status = 'open'), 0)::bigint as owed_minor,
  coalesce(sum(b.balance_minor) filter (
    where b.status = 'open' and b.due_date < (now() at time zone 'Africa/Freetown')::date
  ), 0)::bigint as overdue_minor,
  min(b.due_date) filter (where b.status = 'open' and b.balance_minor > 0) as oldest_due_date,
  count(b.id) filter (where b.status = 'open') as open_invoices
from customers c
left join invoice_balances b on b.customer_id = c.id
group by c.id;

-- Security-definer trigger functions are not for calling through the API
-- (blueprint section 7). Triggers still fire: Postgres doesn't check EXECUTE
-- when a trigger runs its function.
revoke execute on function check_payment(), sync_invoice_status(),
  cancel_reminders_on_writeoff(), assign_invoice_reference()
  from public, anon, authenticated;
