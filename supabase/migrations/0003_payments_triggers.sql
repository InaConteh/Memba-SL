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
