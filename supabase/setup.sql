-- KrishiSetu database setup for a new Supabase project.
-- Paste this whole file into Supabase Dashboard -> SQL Editor -> New query -> Run.
-- It is safe to run more than once.
--
-- Creates:
--   farmers                 table (passwords stored as bcrypt hashes, never returned)
--   signup_farmer(...)      used by src/components/Signup.tsx
--   signin_farmer(...)      used by src/components/Login.tsx
--
-- Both functions return JSON: an array with the farmer on success, or a
-- message string on failure ("Phone number already registered" /
-- "Invalid phone number or password"), which is what the frontend expects.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  state text not null,
  acres numeric not null default 0,
  language text not null default 'English',
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Nobody can read or write the table directly with the public (anon) key;
-- all access goes through the two functions below.
alter table public.farmers enable row level security;

create or replace function public.signup_farmer(
  p_name text,
  p_phone text,
  p_state text,
  p_acres text,
  p_language text,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_farmer public.farmers;
begin
  if p_phone !~ '^[0-9]{10}$' then
    return to_json('Invalid phone number'::text);
  end if;

  if length(coalesce(p_password, '')) < 6 then
    return to_json('Password must be at least 6 characters'::text);
  end if;

  if exists (select 1 from public.farmers where phone = p_phone) then
    return to_json('Phone number already registered'::text);
  end if;

  insert into public.farmers (name, phone, state, acres, language, password_hash)
  values (
    trim(p_name),
    p_phone,
    p_state,
    coalesce(nullif(p_acres, '')::numeric, 0),
    coalesce(nullif(p_language, ''), 'English'),
    crypt(p_password, gen_salt('bf'))
  )
  returning * into new_farmer;

  return json_build_array(json_build_object(
    'id', new_farmer.id,
    'name', new_farmer.name,
    'phone', new_farmer.phone,
    'state', new_farmer.state,
    'acres', new_farmer.acres,
    'language', new_farmer.language,
    'created_at', new_farmer.created_at
  ));
end;
$$;

create or replace function public.signin_farmer(
  p_phone text,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  f public.farmers;
begin
  select * into f from public.farmers where phone = p_phone;

  if f.id is null or f.password_hash <> crypt(p_password, f.password_hash) then
    return to_json('Invalid phone number or password'::text);
  end if;

  return json_build_array(json_build_object(
    'id', f.id,
    'name', f.name,
    'phone', f.phone,
    'state', f.state,
    'acres', f.acres,
    'language', f.language,
    'created_at', f.created_at
  ));
end;
$$;

-- Let the app (anon / logged-in roles) call only these two functions.
revoke all on function public.signup_farmer(text, text, text, text, text, text) from public;
revoke all on function public.signin_farmer(text, text) from public;
grant execute on function public.signup_farmer(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.signin_farmer(text, text) to anon, authenticated;
