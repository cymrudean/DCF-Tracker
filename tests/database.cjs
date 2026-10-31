// Optional: PGLITE_MODULE=/path/to/@electric-sql/pglite node tests/database.cjs
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const {readFileSync}=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;`);
 const schema=readFileSync('supabase/schema.sql','utf8');await db.exec(schema);await db.exec(schema);await db.exec(readFileSync('supabase/admin-account.sql','utf8'));
 const owner='11111111-1111-4111-8111-111111111111',staff='22222222-2222-4222-8222-222222222222',pending='33333333-3333-4333-8333-333333333333';
 await db.exec(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('${owner}','dean.davies@nantcelyn.net',now(),'{"full_name":"Owner"}'),
 ('${staff}','staff@example.test',now(),'{"full_name":"Staff","role":"owner"}'),
 ('${pending}','pending@example.test',null,'{"full_name":"Pending"}');
`);
 assert.equal((await db.query('select * from public.staff_registrations')).rows.length,3);
 async function as(id,email){await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claims','${JSON.stringify({sub:id,email})}',false);`);}
 await as(staff,'staff@example.test');assert.equal((await db.query('select * from public.allowed_accounts')).rows.length,0);
 await assert.rejects(db.query(`select public.review_staff_account('${staff}',true)`));
 await assert.rejects(db.query(`insert into public.allowed_accounts values('staff@example.test','owner')`));
 await assert.rejects(db.query(`insert into public.tracker_records(owner_id,data) values('${staff}','{}')`));
 await as(owner,'dean.davies@nantcelyn.net');assert.equal((await db.query('select public.is_school_owner() as allowed')).rows[0].allowed,true);await db.query(`select public.review_staff_account('${staff}',true)`);
 await assert.rejects(db.query(`select public.review_staff_account('${pending}',true)`));
 await as(staff,'staff@example.test');await db.query(`insert into public.tracker_records(owner_id,data) values('${staff}','{"marker":"staff"}')`);
 await assert.rejects(db.query(`insert into public.tracker_records(owner_id,data) values('${owner}','{}')`));
 assert.equal((await db.query('select * from public.staff_registrations')).rows.length,1);
 await as(owner,'dean.davies@nantcelyn.net');assert.equal((await db.query('select * from public.tracker_records')).rows.length,1);
 assert.equal((await db.query(`update public.tracker_records set data='{}' where owner_id='${staff}' returning *`)).rows.length,0);
 await db.query(`insert into public.tracker_records(owner_id,data) values('${owner}','{}')`);
 await as(staff,'staff@example.test');assert.equal((await db.query('select * from public.tracker_records')).rows.length,1);
 await as(owner,'dean.davies@nantcelyn.net');await db.query(`select public.review_staff_account('${staff}',false)`);
 await as(staff,'staff@example.test');assert.equal((await db.query('select * from public.tracker_records')).rows.length,0);
 assert.equal((await db.query(`update public.tracker_records set data='{}' returning *`)).rows.length,0);
 await db.exec('reset role;set role anon;');await assert.rejects(db.query('select * from public.tracker_records'));
 await db.close();console.log('PostgreSQL policy checks passed: repeatable migration, registration trigger, no metadata escalation, owner-only approval, confirmed-email requirement, staff isolation, read-only leadership, revoked/anonymous denial.');
})().catch(e=>{console.error(e);process.exit(1)});
