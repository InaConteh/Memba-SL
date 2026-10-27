-- Placeholder so `supabase test db` has something to run until the real
-- pgTAP suites (rls, reminders, payments) land with the database block.
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);
select has_schema('public');
select * from finish();
rollback;
