-- =============================================
-- MoveDesk — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (company admins / dispatchers)
-- =============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text default 'admin' check (role in ('admin', 'dispatcher', 'crew')),
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================
-- CUSTOMERS
-- =============================================
create table customers (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  email text,
  phone text not null,
  notes text,
  created_at timestamptz default now()
);

alter table customers enable row level security;
create policy "Authenticated users can access customers"
  on customers for all using (auth.role() = 'authenticated');

-- =============================================
-- JOBS (moving orders)
-- =============================================
create table jobs (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references customers(id) on delete cascade,
  status text default 'new' check (status in ('new', 'quoted', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  move_date date not null,
  from_address text not null,
  to_address text not null,
  apt_type text default '1br' check (apt_type in ('studio', '1br', '2br', '3br', 'house')),
  distance_miles numeric default 0,
  movers_count int default 2,
  estimated_hours numeric,
  base_rate numeric,
  travel_fee numeric default 0,
  materials_fee numeric default 0,
  total_price numeric,
  deposit_paid numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table jobs enable row level security;
create policy "Authenticated users can access jobs"
  on jobs for all using (auth.role() = 'authenticated');

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger jobs_updated_at before update on jobs
  for each row execute procedure update_updated_at();

-- =============================================
-- CREW MEMBERS
-- =============================================
create table crew_members (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  phone text,
  role text default 'mover' check (role in ('driver', 'mover', 'lead')),
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table crew_members enable row level security;
create policy "Authenticated users can access crew"
  on crew_members for all using (auth.role() = 'authenticated');

-- =============================================
-- JOB ASSIGNMENTS (crew to job)
-- =============================================
create table job_assignments (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references jobs(id) on delete cascade,
  crew_member_id uuid references crew_members(id) on delete cascade,
  created_at timestamptz default now(),
  unique(job_id, crew_member_id)
);

alter table job_assignments enable row level security;
create policy "Authenticated users can access assignments"
  on job_assignments for all using (auth.role() = 'authenticated');

-- =============================================
-- SAMPLE DATA (for testing)
-- =============================================
insert into customers (full_name, phone, email) values
  ('John Miller', '(917) 555-0112', 'john.miller@email.com'),
  ('Sara Ross', '(646) 555-0177', 'sara.ross@email.com'),
  ('David Kim', '(917) 555-0134', 'david.kim@email.com'),
  ('Amy Lee', '(201) 555-0155', 'amy.lee@email.com'),
  ('Tom White', '(516) 555-0143', 'tom.white@email.com');

insert into crew_members (full_name, phone, role) values
  ('Mike Rodriguez', '(917) 555-0201', 'lead'),
  ('James Torres', '(718) 555-0202', 'mover'),
  ('Dan Liu', '(646) 555-0203', 'driver'),
  ('Kevin Park', '(201) 555-0204', 'mover'),
  ('Alex Adams', '(212) 555-0205', 'mover');
