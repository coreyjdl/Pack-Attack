# Supabase Setup

## 1) Create Project
1. Create a Supabase project.
2. Copy project URL and anon key.
3. Add them to local environment variables (see .env.example).

## 2) SQL Schema
Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.packing_lists (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  trip_type text not null check (trip_type in ('adv', 'overland', 'hike')),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.packing_lists enable row level security;

create policy "Owner can read own lists"
on public.packing_lists
for select
using (auth.uid() = owner_id);

create policy "Owner can insert own lists"
on public.packing_lists
for insert
with check (auth.uid() = owner_id);

create policy "Owner can update own lists"
on public.packing_lists
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
```

## 3) Auth
Enable Email/Password auth provider in Supabase Auth settings.

## 4) Run Apps
- Desktop: npm run dev:desktop
- Mobile: npm run dev:mobile

## 5) Export + Print
- In desktop app, use buttons:
  - Export Raw CSV
  - Export Checklist
  - Print Friendly
