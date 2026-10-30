-- Change 1: a short payment reference per invoice ("M-" + 4 digits) that
-- customers quote when they pay. Issued by the database on insert, unique
-- per business, and fixed once issued.

alter table invoices add column reference text not null
  check (reference ~ '^M-[0-9]{4}$');
alter table invoices add constraint invoices_business_reference_key
  unique (business_id, reference);

-- Always issues a fresh reference; a value sent by the client is ignored.
create function assign_invoice_reference() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ref text;
begin
  -- One reference pick at a time per business, so concurrent inserts can't collide
  perform pg_advisory_xact_lock(hashtextextended('invoice_reference:' || new.business_id::text, 0));
  for attempt in 1..100 loop
    v_ref := 'M-' || lpad(floor(random() * 10000)::int::text, 4, '0');
    if not exists (
      select 1 from invoices where business_id = new.business_id and reference = v_ref
    ) then
      new.reference := v_ref;
      return new;
    end if;
  end loop;
  raise exception 'Could not find a free payment reference for business %', new.business_id
    using errcode = 'unique_violation';
end $$;
create trigger invoices_before_insert_reference before insert on invoices
  for each row execute function assign_invoice_reference();

create function keep_invoice_reference() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.reference is distinct from old.reference then
    raise exception 'An invoice reference cannot be changed' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger invoices_before_update_reference before update of reference on invoices
  for each row execute function keep_invoice_reference();

-- The view's i.* was expanded when 0001 created it, so rebuild it to include
-- reference. Same definition as 0001.
drop view invoice_balances;
create view invoice_balances with (security_invoker = true) as
select i.*,
  coalesce(sum(p.amount_minor) filter (where p.voided_at is null), 0) as paid_minor,
  i.amount_minor - coalesce(sum(p.amount_minor) filter (where p.voided_at is null), 0) as balance_minor
from invoices i
left join payments p on p.invoice_id = i.id
group by i.id;
