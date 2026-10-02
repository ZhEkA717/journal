-- Схема Supabase для приложения «Журналы» (ТЗ 11).
-- Выполнить в SQL Editor проекта Supabase до подключения приложения.
--
-- Схема идентична локальной Dexie (ТЗ 5), но с колонкой `user_id` для RLS.
-- Все даты — Unix ms (bigint), даты приёма/инструктажей — date (ISO).

-- 11.1. Таблицы ---------------------------------------------------------------

create table organizations (
  id uuid primary key,
  user_id uuid references auth.users not null,
  name text not null,
  inn text,
  address text,
  responsible_person text,
  created_at bigint,
  updated_at bigint,
  deleted_at bigint
);

create table employees (
  id uuid primary key,
  user_id uuid references auth.users not null,
  org_id uuid references organizations not null,
  full_name text not null,
  position text,
  birth_date date,
  hired_at date,
  fired_at date,
  signature text,
  created_at bigint,
  updated_at bigint,
  deleted_at bigint
);

create table templates (
  id uuid primary key,
  user_id uuid references auth.users,
  org_id uuid references organizations,
  name text not null,
  category text,
  columns jsonb not null,
  legal_ref text,
  is_system boolean default false,
  icon_name text,
  color text,
  created_at bigint,
  updated_at bigint
);

create table journals (
  id uuid primary key,
  user_id uuid references auth.users not null,
  org_id uuid references organizations not null,
  template_id uuid references templates not null,
  title text not null,
  started_at date,
  closed_at date,
  responsible_person text,
  created_at bigint,
  updated_at bigint,
  deleted_at bigint
);

create table entries (
  id uuid primary key,
  user_id uuid references auth.users not null,
  journal_id uuid references journals not null,
  employee_id uuid references employees not null,
  data jsonb not null,
  created_at bigint,
  updated_at bigint,
  deleted_at bigint
);

create index on employees (user_id, updated_at);
create index on journals (user_id, updated_at);
create index on entries (user_id, updated_at);

-- 11.2. RLS-политики ----------------------------------------------------------
-- Каждая таблица: видны и изменяемы только строки текущего пользователя.

alter table organizations enable row level security;

create policy "own_rows_select" on organizations
  for select using (auth.uid() = user_id);

create policy "own_rows_insert" on organizations
  for insert with check (auth.uid() = user_id);

create policy "own_rows_update" on organizations
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_rows_delete" on organizations
  for delete using (auth.uid() = user_id);

alter table employees enable row level security;

create policy "own_rows_select" on employees
  for select using (auth.uid() = user_id);

create policy "own_rows_insert" on employees
  for insert with check (auth.uid() = user_id);

create policy "own_rows_update" on employees
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_rows_delete" on employees
  for delete using (auth.uid() = user_id);

alter table templates enable row level security;

create policy "own_rows_select" on templates
  for select using (auth.uid() = user_id);

create policy "own_rows_insert" on templates
  for insert with check (auth.uid() = user_id);

create policy "own_rows_update" on templates
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_rows_delete" on templates
  for delete using (auth.uid() = user_id);

alter table journals enable row level security;

create policy "own_rows_select" on journals
  for select using (auth.uid() = user_id);

create policy "own_rows_insert" on journals
  for insert with check (auth.uid() = user_id);

create policy "own_rows_update" on journals
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_rows_delete" on journals
  for delete using (auth.uid() = user_id);

alter table entries enable row level security;

create policy "own_rows_select" on entries
  for select using (auth.uid() = user_id);

create policy "own_rows_insert" on entries
  for insert with check (auth.uid() = user_id);

create policy "own_rows_update" on entries
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_rows_delete" on entries
  for delete using (auth.uid() = user_id);

-- 11.3. Синхронизация ---------------------------------------------------------
-- Pull: select * from <table> where user_id = auth.uid() and updated_at > :since
-- Push: upsert через Supabase client; конфликты — last-write-wins по updated_at.
