-- Run as project administrator in Supabase SQL Editor (also migrates the previous Google version).
begin;
create table if not exists public.allowed_accounts (
 email text primary key check (email = lower(email)),
 role text not null
);
alter table public.allowed_accounts drop constraint if exists allowed_accounts_role_check;
alter table public.allowed_accounts add constraint allowed_accounts_role_check check (role in ('staff','pupil','owner'));
create table if not exists public.tracker_records (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check (jsonb_typeof(data) = 'object'),
 revision integer not null default 0
);
create table if not exists public.staff_registrations (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique,
 full_name text not null,
 created_at timestamptz not null default now()
);
-- Only database administrators can grant owner access. Signup metadata never supplies roles.
create or replace function public.is_school_owner() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.allowed_accounts where email=lower(auth.jwt()->>'email') and role='owner');
$$;
revoke all on function public.is_school_owner() from public;
grant execute on function public.is_school_owner() to authenticated;
create or replace function public.register_staff_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.email is not null then
  insert into public.staff_registrations(id,email,full_name)
  values(new.id,lower(new.email),left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Staff member'),100));
 end if;
 return new;
end; $$;
revoke all on function public.register_staff_account() from public;
drop trigger if exists register_dcf_staff on auth.users;
create trigger register_dcf_staff after insert on auth.users for each row execute function public.register_staff_account();
-- Preserve and expose existing accounts to the owner during migration.
insert into public.staff_registrations(id,email,full_name)
select id,lower(email),left(coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),'Staff member'),100)
from auth.users where email is not null on conflict (id) do nothing;
create or replace function public.review_staff_account(account_id uuid, approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare account_email text; confirmed timestamptz;
begin
 if not public.is_school_owner() then raise exception 'Owner access required'; end if;
 select email,email_confirmed_at into account_email,confirmed from auth.users where id=account_id;
 if account_email is null then raise exception 'Account not found'; end if;
 if exists(select 1 from public.allowed_accounts where email=lower(account_email) and role='owner') then
  raise exception 'Owner accounts must be managed by a database administrator';
 end if;
 if approve then
  if confirmed is null then raise exception 'Email confirmation required before approval'; end if;
  insert into public.allowed_accounts(email,role) values(lower(account_email),'staff')
  on conflict(email) do update set role='staff';
 else
  delete from public.allowed_accounts where email=lower(account_email);
 end if;
end; $$;
revoke all on function public.review_staff_account(uuid,boolean) from public;
grant execute on function public.review_staff_account(uuid,boolean) to authenticated;
alter table public.allowed_accounts enable row level security;
alter table public.tracker_records enable row level security;
alter table public.staff_registrations enable row level security;
revoke all on public.allowed_accounts,public.tracker_records,public.staff_registrations from anon;
revoke all on public.allowed_accounts,public.staff_registrations from authenticated;
grant select on public.allowed_accounts,public.staff_registrations to authenticated;
grant select,insert,update on public.tracker_records to authenticated;
drop policy if exists own_approval on public.allowed_accounts;
create policy own_approval on public.allowed_accounts for select to authenticated
 using(email=lower(auth.jwt()->>'email') or public.is_school_owner());
drop policy if exists registration_visibility on public.staff_registrations;
create policy registration_visibility on public.staff_registrations for select to authenticated
 using(id=auth.uid() or public.is_school_owner());
drop policy if exists own_records on public.tracker_records;
drop policy if exists read_records on public.tracker_records;
create policy read_records on public.tracker_records for select to authenticated
 using(public.is_school_owner() or (owner_id=auth.uid() and exists(select 1 from public.allowed_accounts where email=lower(auth.jwt()->>'email'))));
drop policy if exists insert_own_records on public.tracker_records;
create policy insert_own_records on public.tracker_records for insert to authenticated
 with check(owner_id=auth.uid() and exists(select 1 from public.allowed_accounts where email=lower(auth.jwt()->>'email')));
drop policy if exists update_own_records on public.tracker_records;
create policy update_own_records on public.tracker_records for update to authenticated
 using(owner_id=auth.uid() and exists(select 1 from public.allowed_accounts where email=lower(auth.jwt()->>'email')))
 with check(owner_id=auth.uid() and exists(select 1 from public.allowed_accounts where email=lower(auth.jwt()->>'email')));
commit;
-- Bootstrap the actual senior leader AFTER registering and confirming their email:
-- insert into public.allowed_accounts(email,role) values ('your-actual-email','owner')
-- on conflict(email) do update set role='owner';
