-- Change 1: invoice payment reference "M-" + 4 digits, unique per business.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into businesses (id, name, segment) values
  ('00000000-0000-0000-0000-0000000000a2', 'Test School A', 'school'),
  ('00000000-0000-0000-0000-0000000000b2', 'Test Wholesaler B', 'wholesaler'),
  ('00000000-0000-0000-0000-0000000000c2', 'Full Business C', 'other');
insert into customers (id, business_id, name) values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a2', 'Customer A'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b2', 'Customer B'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c2', 'Customer C');

-- A client-supplied reference is ignored
insert into invoices (id, business_id, customer_id, description, amount_minor, due_date, reference) values
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000a3', 'Fees', 100000, '2026-11-01', 'HELLO');
select matches((select reference from invoices where id = '00000000-0000-0000-0000-0000000000a5'),
  '^M-[0-9]{4}$', 'the database issues the reference as M- plus 4 digits');

select col_is_unique('public', 'invoices', array['business_id', 'reference'],
  'references are unique within a business');

-- The same reference can exist in two businesses
alter table invoices disable trigger invoices_before_insert_reference;
select lives_ok($$insert into invoices (business_id, customer_id, description, amount_minor, due_date, reference)
  select '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b3', 'Goods', 100000,
    '2026-11-01', reference from invoices where id = '00000000-0000-0000-0000-0000000000a5'$$,
  'another business may use the same reference');
alter table invoices enable trigger invoices_before_insert_reference;

-- 200 more picks for one business: collisions are likely and must be retried
insert into invoices (business_id, customer_id, description, amount_minor, due_date)
  select '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    'Fees ' || n, 100000, '2026-11-01'
  from generate_series(1, 200) n;
select is((select count(distinct reference) from invoices
  where business_id = '00000000-0000-0000-0000-0000000000a2')::int, 201,
  'every invoice in a business gets its own reference');

select throws_ok($$update invoices
  set reference = case when reference = 'M-0000' then 'M-0001' else 'M-0000' end
  where id = '00000000-0000-0000-0000-0000000000a5'$$,
  '23514', 'An invoice reference cannot be changed', 'a reference cannot be changed once issued');

-- A business with all 10,000 references in use gets a clear error
alter table invoices disable trigger invoices_before_insert_reference;
insert into invoices (business_id, customer_id, description, amount_minor, due_date, reference)
  select '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3',
    'Filler', 100, '2026-11-01', 'M-' || lpad(n::text, 4, '0')
  from generate_series(0, 9999) n;
alter table invoices enable trigger invoices_before_insert_reference;
select throws_ok($$insert into invoices (business_id, customer_id, description, amount_minor, due_date) values
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3', 'One too many', 100, '2026-11-01')$$,
  '23505', 'Could not find a free payment reference for business 00000000-0000-0000-0000-0000000000c2',
  'a business that has used every reference gets a clear error');

select has_column('public', 'invoice_balances', 'reference', 'invoice_balances includes the reference');

select * from finish();
rollback;
