# Staff self-registration and senior-leader access

No Google Cloud registration or Google sign-in is needed. Staff register using any email address and a password. Supabase handles authentication, confirmation/recovery emails and protected database storage; GitHub Pages serves the frontend. Blank `auth-config.json` intentionally leaves the app locked.

## One-time setup

1. Create or use a school-managed Supabase project. In **Authentication → Providers**, enable Email/password and allow new registrations. Keep **Confirm email** enabled and anonymous sign-ins disabled. Set the minimum password length to at least 12. Google can be disabled.
2. Run the complete `supabase/schema.sql` in the SQL Editor. It migrates the previous Google version without deleting tracker records or existing approved accounts. New registrations are pending; metadata cannot choose a role.
3. In **Authentication → URL Configuration**, set Site URL and an allowed redirect to `https://cymrudean.github.io/DCF-Tracker/`. For testing, explicitly add `http://localhost:3000/`. Avoid wildcard production redirects. Use Supabase's default confirmation/recovery email link templates, which redirect with session tokens in the URL fragment; the app consumes and removes that fragment immediately. Existing custom PKCE/code templates must be reset to the default implicit email flow.
4. Configure school-approved SMTP under the project's authentication email settings. Supabase's default email service is restricted and is not suitable for unrestricted staff registration or production delivery. This requires an email provider, not Google Cloud. Configure its domain/DNS and test both confirmation and password reset delivery. Enter mail credentials only in Supabase settings, never in chat or GitHub.
5. Put only the project URL and public publishable key (or legacy anon key) into `auth-config.json`, and commit it. Never use a service-role/secret key.
6. Register your own account in the app and confirm your email. In Supabase SQL Editor, bootstrap your owner role with your actual lowercase email:

   ```sql
   insert into public.allowed_accounts(email,role)
   values ('your-actual-email-address', 'owner')
   on conflict(email) do update set role='owner';
   ```

   Sign out and back in. The **Senior-leader overview** will appear. Owner roles can only be granted by a database administrator, never through signup or the staff approval screen. Keep owner access limited to authorised leaders.
7. Ask staff to register and confirm their email. They can use any email provider. In your senior-leader overview, approve each known staff member. If approval fails, check email confirmation in Supabase. Pending or revoked accounts cannot read/write tracker data. Approval converts the account to staff; owner accounts are excluded from in-app approval/revocation.

## What the owner can see

- Staff names, email addresses, registration dates (database), approval status, learner totals and applied-in-context counts.
- Select a staff member to view their learner skills, strand/element charts, observations and evidence links in read-only mode. You can export the selected tracker.
- Approve staff or revoke access. Revocation preserves records for leadership review. Staff cannot see each other's records, change roles or approve accounts. The database enforces these boundaries even if somebody modifies the browser UI or makes API requests directly.
- Passwords are handled by Supabase and are never shown to the owner. Evidence files retain Google Drive/OneDrive sharing permissions: viewing a link does not grant access to the underlying file. Staff must share files with authorised leaders separately.

This is a single-school deployment: the owner can view all tracker records in this Supabase project, including migrated records. Do not share the same database with unrelated schools. Names supplied during registration are self-declared, so verify identity before approval. Existing approved pupil accounts remain compatible, but public registration is now a staff request, not pupil enrolment. Existing Google users may use Forgot password to set a password for the same confirmed email instead of creating duplicate accounts. Email-address changes are not offered by the app; if changed in Supabase, an administrator must reconcile the registration and approval email.

## Sessions and records

Tokens are held in sessionStorage per tab and refreshed as needed. Sign out clears local session tokens. Password recovery uses an emailed link and presents a new-password form before tracker access. Old anonymous browser records are not automatically migrated: export the old version's backup and restore as an approved staff member. Conflicting or failed saves stop editing and offer export so changes are not silently lost.

## Validation before real pupil records

Automated browser tests mock the authentication service. PostgreSQL policy tests execute the actual schema in an isolated PostgreSQL engine with simulated Supabase identities. Neither proves the configured hosted service and email delivery work. Test real registration, confirmation delivery, password login, password reset, pending denial, owner approval/revocation, staff isolation, owner read-only access and logout in your actual project. Do not use real pupil information until these pass.

Optional database regression:

```sh
# Install the test engine outside the repository; it is not an app dependency.
npm install --prefix /tmp/dcf-sql-test --no-audit --no-fund @electric-sql/pglite@0.3.14
PGLITE_MODULE=/tmp/dcf-sql-test/node_modules/@electric-sql/pglite node tests/database.cjs
```

## Exact school logo

Add the original PNG as `assets/school-logo.png` in GitHub. It will display on the login screen and sidebar. The inline chat image did not provide downloadable bytes to the workspace, so the school name is displayed until the exact file is added. Digital Den curriculum activity names are preserved.

## Dean Davies administrator account

The requested administrator email is `dean.davies@nantcelyn.net`, with role `admin`. This has the same protected leadership permissions as the existing `owner` role. Staff cannot grant either role through registration or the approval screen.

1. Complete Supabase configuration above and run the updated `supabase/schema.sql`.
2. Create the email account through the app's registration form and confirm the email, or create/invite the user in Supabase Authentication. Set a new private password there; no password is stored in source code.
3. Run `supabase/admin-account.sql` in the Supabase SQL Editor to grant Dean administrator access. Sign out and sign back in.

The SQL grant alone does not create the authentication account. The app cannot use this login until the backend is configured, the user exists, and the grant is applied. Use a new password rather than reusing one shared in chat.
