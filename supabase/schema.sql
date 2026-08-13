-- Run this in the Supabase SQL editor.

create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  email text,
  plan text not null default 'free' check (plan in ('free', 'basic', 'pro', 'unlimited')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists usage (
  user_id uuid references auth.users(id) not null,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  paypal_order_id text,
  plan text,
  amount numeric,
  currency text default 'USD',
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function increment_usage(p_user_id uuid, p_day date)
returns int as $$
declare
  new_count int;
begin
  insert into usage (user_id, day, count)
  values (p_user_id, p_day, 1)
  on conflict (user_id, day)
  do update set count = usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$ language plpgsql;

create or replace function get_profile_plan(p_user_id uuid)
returns text as $$
declare
  p text;
begin
  select plan into p from profiles where id = p_user_id;
  if p is null then
    p := 'free';
  end if;
  return p;
end;
$$ language plpgsql security definer set search_path = public;

alter table profiles enable row level security;
alter table usage enable row level security;
alter table payments enable row level security;

create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "read own usage" on usage for select using (auth.uid() = user_id);
create policy "read own payments" on payments for select using (auth.uid() = user_id);
