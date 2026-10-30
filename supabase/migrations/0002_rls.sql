create function is_member(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.business_id = b and m.user_id = (select auth.uid())
  );
$$;

alter table businesses  enable row level security;
alter table memberships enable row level security;
alter table customers   enable row level security;
alter table schedules   enable row level security;
alter table templates   enable row level security;
alter table invoices    enable row level security;
alter table payments    enable row level security;
alter table reminders   enable row level security;
alter table events      enable row level security;

create policy biz_read   on businesses  for select using (is_member(id));
create policy biz_update on businesses  for update using (is_member(id)) with check (is_member(id));
create policy own_memberships on memberships for select using (user_id = (select auth.uid()));

-- full read/write for members
create policy members_all on customers for all using (is_member(business_id)) with check (is_member(business_id));
create policy members_all on schedules for all using (is_member(business_id)) with check (is_member(business_id));
create policy members_all on templates for all using (is_member(business_id)) with check (is_member(business_id));
create policy members_all on invoices  for all using (is_member(business_id)) with check (is_member(business_id));

-- payments: insert and void, never delete
create policy pay_read   on payments for select using (is_member(business_id));
create policy pay_insert on payments for insert with check (is_member(business_id) and recorded_by = (select auth.uid()));
create policy pay_void   on payments for update using (is_member(business_id)) with check (is_member(business_id));

-- reminders: created only by the generator; members read and update status
create policy rem_read   on reminders for select using (is_member(business_id));
create policy rem_update on reminders for update using (is_member(business_id)) with check (is_member(business_id));

-- events: append-only
create policy ev_read   on events for select using (is_member(business_id));
create policy ev_insert on events for insert with check (is_member(business_id) and actor_id = (select auth.uid()));
