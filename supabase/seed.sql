-- Local development data. Everything here is fictional: names, businesses,
-- merchant codes and phone numbers. Phones use the unallocated +232 00 range
-- so a stray WhatsApp tap can't reach a real person.
--
-- Owner logins (local Supabase only):
--   owner@hilltop.test     Hilltop Academy (school)
--   owner@riverside.test   Riverside Provisions (wholesaler)
-- Password for both: memba-local-dev

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'owner@hilltop.test',
   extensions.crypt('memba-local-dev', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'owner@riverside.test',
   extensions.crypt('memba-local-dev', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.id in ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

insert into businesses (id, name, phone, segment, pay_instructions) values
  ('10000000-0000-0000-0000-000000000001', 'Hilltop Academy', '+23200000100', 'school',
   'Pay by Orange Money to merchant code 000000.'),
  ('10000000-0000-0000-0000-000000000002', 'Riverside Provisions', '+23200000200', 'wholesaler',
   'Pay by Afrimoney to 000000 or cash at the shop.');

insert into memberships (business_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');

insert into schedules (id, business_id, name, is_default) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Default', true),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Default', true);

-- Default English templates (blueprint section 5, plus the reference line)
insert into templates (business_id, language, tone, body)
select b.id, 'en', t.tone, t.body
from businesses b
cross join (values
  ('gentle', 'Good day {customer_name}. This is a friendly reminder from {business_name}: {amount} for {description} was due on {due_date}. {pay_instructions} Thank you. Please use reference {reference} when you pay.'),
  ('firm', 'Hello {customer_name}. {business_name} has not yet received {amount} for {description}, due on {due_date}. Please pay this week. {pay_instructions} If you have already paid, please reply so we can update our records. Please use reference {reference} when you pay.'),
  ('final', 'Dear {customer_name}, {amount} for {description} remains unpaid since {due_date}. Please pay or call {business_name} by the end of this week to agree a plan. {pay_instructions} Please use reference {reference} when you pay.')
) as t(tone, body);

insert into customers (id, business_id, name, phone, group_label) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Fatmata Kamara', '+23200000101', 'JSS 2'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Mohamed Sesay', '+23200000102', 'JSS 1'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Isata Conteh', '+23200000103', 'SSS 1'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Abu Turay', null, 'JSS 2'),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Mariama Bah Shop', '+23200000201', 'East route'),
  ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Kargbo Mini Mart', '+23200000202', 'East route'),
  ('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'Sorie Traders', '+23200000203', 'West route');

-- Due dates relative to today so the Today queue always has work after a reset
insert into invoices (id, business_id, customer_id, schedule_id, description, amount_minor, due_date) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001', 'Term 1 fees - Hawa (JSS 2)', 150000, current_date - 8),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000001', 'Term 1 fees - Alhaji (JSS 1)', 150000, current_date - 4),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000001', 'Term 1 fees - Musu (SSS 1)', 175000, current_date),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000001', 'Term 1 fees - Sahr (JSS 2)', 150000, current_date - 8),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000002', '20 bags of rice on credit', 1250000, current_date - 5),
  ('50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000006',
   '30000000-0000-0000-0000-000000000002', 'Cooking oil, 10 jerrycans', 480050, current_date - 1),
  ('50000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000007',
   '30000000-0000-0000-0000-000000000002', 'Sugar and flour', 320000, current_date + 7);

insert into payments (business_id, invoice_id, amount_minor, method, reference, paid_on, recorded_by) values
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 50000, 'orange_money',
   'TEST-OM-0001', current_date - 2, '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', 250000, 'cash',
   null, current_date - 3, '20000000-0000-0000-0000-000000000002');

select generate_due_reminders();
