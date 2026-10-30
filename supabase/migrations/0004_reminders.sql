-- Not in the blueprint: cron.schedule below fails on a fresh database
-- (local, CI) unless the extension exists. On Supabase cloud this is a no-op
-- once pg_cron is enabled in the dashboard.
create extension if not exists pg_cron with schema pg_catalog;

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
