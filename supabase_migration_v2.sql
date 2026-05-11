-- ============================================================
-- MOVE GO — Database Migration v2
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Update crew_members table — new roles and auth link
alter table crew_members
  add column if not exists role_type text default 'helper'
    check (role_type in ('manager', 'foreman', 'helper', 'driver')),
  add column if not exists auth_user_id uuid references auth.users(id),
  add column if not exists is_active boolean default true,
  add column if not exists email text;

-- 2. Update jobs table — contract fields
alter table jobs
  add column if not exists bl_number text,           -- Bill of Lading number
  add column if not exists start_time text,          -- "8:00 AM"
  add column if not exists end_time text,            -- "10:00 AM"
  add column if not exists break_minutes int default 0,
  add column if not exists actual_hours numeric,
  add column if not exists payment_type text default 'cash' check (payment_type in ('cash', 'card', 'square')),
  add column if not exists actual_total numeric,
  add column if not exists deposit_amount numeric default 0,
  add column if not exists travel_fee_actual numeric,
  add column if not exists insurance_option text default 'A' check (insurance_option in ('A','B','C')),
  add column if not exists insurance_value numeric default 0,
  add column if not exists apt_number text,
  add column if not exists origin_city text,
  add column if not exists origin_state text default 'WA',
  add column if not exists origin_zip text,
  add column if not exists dest_address text,
  add column if not exists dest_city text,
  add column if not exists dest_state text default 'WA',
  add column if not exists dest_zip text,
  add column if not exists dest_apt text,
  add column if not exists has_elevator_origin boolean default false,
  add column if not exists has_elevator_dest boolean default false,
  add column if not exists flights_origin text default 'N/A',
  add column if not exists flights_dest text default 'N/A',
  add column if not exists customer_phone2 text,
  add column if not exists num_trucks int default 1,
  add column if not exists customer_comments text;

-- 3. Contract signatures table
create table if not exists contract_signatures (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references jobs(id) on delete cascade,
  sig_type text not null check (sig_type in (
    'shipper_origin',      -- signature at origin (start)
    'estimate_agree',      -- agrees to estimate
    'insurance',           -- declaration of value
    'customer_release',    -- customer release at end
    'carrier_release',     -- carrier rep signature
    'job_complete_customer', -- job complete customer sig
    'job_complete_carrier'   -- job complete carrier sig
  )),
  signature_data text,     -- base64 canvas image
  signed_at timestamptz default now(),
  signed_by text,          -- name of who signed
  created_at timestamptz default now()
);

alter table contract_signatures enable row level security;
create policy "Authenticated users can access signatures"
  on contract_signatures for all using (auth.role() = 'authenticated');

-- 4. Packing items per job
create table if not exists job_packing_items (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references jobs(id) on delete cascade,
  item_name text not null,
  quantity int default 0,
  rate numeric not null,
  amount numeric generated always as (quantity * rate) stored
);

alter table job_packing_items enable row level security;
create policy "Authenticated users can access packing items"
  on job_packing_items for all using (auth.role() = 'authenticated');

-- 5. Auto-generate B/L number for new jobs
create or replace function generate_bl_number()
returns trigger as $$
begin
  if new.bl_number is null then
    new.bl_number := 'BL-' || to_char(now(), 'YYYYMMDD') || '-' ||
                     lpad(floor(random() * 9000 + 1000)::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_bl_number on jobs;
create trigger set_bl_number
  before insert on jobs
  for each row execute procedure generate_bl_number();

-- 6. RLS: crew members see only their own assigned jobs
-- This is enforced at the app level via crew_member_id lookup
-- But we add a helper view for convenience:
create or replace view crew_job_assignments as
  select
    ja.crew_member_id,
    j.*,
    c.full_name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email
  from job_assignments ja
  join jobs j on j.id = ja.job_id
  join customers c on c.id = j.customer_id;

-- 7. Update sample crew with role_types
update crew_members set role_type = 'foreman' where role = 'lead';
update crew_members set role_type = 'driver'  where role = 'driver';
update crew_members set role_type = 'helper'  where role = 'mover';

-- 8. Public insert policies (for future booking form if needed)
create policy if not exists "Public can create customers"
  on public.customers for insert with check (true);
create policy if not exists "Public can create jobs"
  on public.jobs for insert with check (true);
