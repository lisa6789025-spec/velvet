-- Set a specific user's plan by email.
-- Run this in the Supabase SQL editor.
--
-- EDIT THESE TWO LINES:
--   1. Replace 'xx@mail.com' with the real account email.
--   2. Set v_plan to one of: 'free', 'basic', 'pro', 'unlimited'

do $$
declare
  v_email text := 'xx@mail.com';
  v_plan  text := 'pro';
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    raise exception 'No user found with email %', v_email;
  end if;

  insert into public.profiles (id, email, plan, updated_at)
  values (v_user_id, v_email, v_plan, now())
  on conflict (id)
  do update set
    plan = excluded.plan,
    email = excluded.email,
    updated_at = now();

  raise notice 'Plan set to % for %', v_plan, v_email;
end;
$$;
