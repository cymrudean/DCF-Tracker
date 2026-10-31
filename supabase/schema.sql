-- Run in your Supabase project's SQL Editor. No service-role key belongs in GitHub.
begin;
create table if not exists public.allowed_accounts (
 email text primary key check (email = lower(email)),
 role text not null check (role in ('staff','pupil'))
);
create table if not exists public.tracker_records (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check (jsonb_typeof(data) = 'object'),
 revision integer not null default 0
);
alter table public.allowed_accounts enable row level security;
alter table public.tracker_records enable row level security;
revoke all on public.allowed_accounts, public.tracker_records from anon;
revoke all on public.allowed_accounts from authenticated;
grant select on public.allowed_accounts to authenticated;
grant select, insert, update on public.tracker_records to authenticated;
drop policy if exists own_approval on public.allowed_accounts;
create policy own_approval on public.allowed_accounts for select to authenticated
 using (email = lower(auth.jwt()->>'email'));
drop policy if exists own_records on public.tracker_records;
create policy own_records on public.tracker_records for all to authenticated
 using (owner_id = auth.uid() and exists (select 1 from public.allowed_accounts))
 with check (owner_id = auth.uid() and exists (select 1 from public.allowed_accounts));
commit;
-- Add actual approved school emails in the SQL Editor, never in public source:
-- insert into public.allowed_accounts (email, role) values ('actual-school-email', 'staff');
-- Use role 'pupil' for pupil accounts. Revoke access by deleting the allowlist row.
