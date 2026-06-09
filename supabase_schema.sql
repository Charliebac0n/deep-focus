-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/oorwcblbqsvjcpuvsipp/sql)

-- ── Profiles ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text,
  birth_date  text,
  daily_goal  integer default 8,
  joined_at   timestamptz,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- ── Sessions ──────────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users on delete cascade not null,
  duration_seconds integer not null,
  date             text not null,   -- 'YYYY-MM-DD'
  recorded_at      timestamptz default now()
);
alter table public.sessions enable row level security;
create policy "own sessions select" on public.sessions for select using (auth.uid() = user_id);
create policy "own sessions insert" on public.sessions for insert with check (auth.uid() = user_id);

-- ── Tasks ─────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id             uuid primary key,
  user_id        uuid references auth.users on delete cascade not null,
  title          text not null,
  category       text,
  priority       text,
  estimate       text,
  subtasks       jsonb default '[]',
  focus_tip      text,
  pomodoro_count integer default 1,
  ai_generated   boolean default false,
  completed      boolean default false,
  created_at     timestamptz default now()
);
alter table public.tasks enable row level security;
create policy "own tasks select" on public.tasks for select using (auth.uid() = user_id);
create policy "own tasks insert" on public.tasks for insert with check (auth.uid() = user_id);
create policy "own tasks update" on public.tasks for update using (auth.uid() = user_id);
create policy "own tasks delete" on public.tasks for delete using (auth.uid() = user_id);
