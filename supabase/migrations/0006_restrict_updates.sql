-- Narrows what app users can change. The RLS policies in 0002 decide which
-- rows a member may update; these grants and triggers decide which columns
-- and transitions are allowed. The service role (scripts/) is unaffected by
-- the grants.

-- Payments: only voiding is an allowed change. Without this, a member could
-- edit amount_minor or invoice_id, skipping the overpayment check (insert
-- only) and the paid-status trigger (fires on voided_at only).
revoke update on payments from anon, authenticated;
grant update (voided_at, void_reason) on payments to authenticated;

create function guard_payment_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if (new.business_id, new.invoice_id, new.amount_minor)
     is distinct from (old.business_id, old.invoice_id, old.amount_minor) then
    raise exception 'A payment''s amount and invoice cannot be changed; void it instead'
      using errcode = 'check_violation';
  end if;
  if old.voided_at is not null then
    raise exception 'This payment is already voided' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger payments_before_update before update on payments
  for each row execute function guard_payment_update();

-- Reminders: members move status forward; the generator owns everything else.
revoke update on reminders from anon, authenticated;
grant update (status, skip_reason, message_body, opened_at, sent_at, actioned_by)
  on reminders to authenticated;

-- Invoices: 'paid' only when the recorded payments cover the amount.
create function guard_invoice_paid() returns trigger
language plpgsql set search_path = public as $$
declare v_balance bigint;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    select balance_minor into v_balance from invoice_balances where id = new.id;
    if v_balance > 0 then
      raise exception 'Invoice still has a balance of %; record a payment instead', v_balance
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger invoices_before_status before update of status on invoices
  for each row execute function guard_invoice_paid();
