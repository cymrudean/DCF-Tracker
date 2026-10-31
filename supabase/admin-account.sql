-- Run AFTER schema.sql in the Supabase SQL Editor as project administrator.
-- Grants the requested role; it does not create an Auth user or set a password.
-- Register this email and confirm ownership, or create/invite it through Supabase Authentication.
insert into public.allowed_accounts(email,role)
values ('dean.davies@nantcelyn.net','admin')
on conflict(email) do update set role='admin';
