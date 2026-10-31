# Enable school Google sign-in

The app now fails closed: without authentication configuration, it shows setup information and does not load learner records. GitHub Pages can host the frontend; Supabase provides Google authentication and a database with row-level access rules.

## Administrator setup

1. Create a school-managed Supabase project. Run `supabase/schema.sql` in its SQL Editor. This creates the approval list and private account records with row-level security.
2. In Google Cloud Console, create a web OAuth client for the school. Configure the consent screen for your school organisation where possible. Register the callback URL displayed in Supabase's Google provider settings (normally `https://YOUR-PROJECT.supabase.co/auth/v1/callback`). A school administrator may need to approve the app for pupils.
3. In Supabase Authentication → Providers → Google, enable Google and enter the Google client ID and client secret. Keep the secret in Supabase, never in GitHub or this chat. Enable email verification/default provider identity protections; do not enable anonymous sign-ins.
4. In Supabase URL Configuration, set Site URL to `https://cymrudean.github.io/DCF-Tracker/` and add that exact address as an allowed redirect URL. For local development add `http://localhost:3000/` explicitly if needed; do not allow wildcard production redirects.
5. Update `auth-config.json` with the project URL and **publishable key** (or legacy anon key). These are intentionally public. Never use a secret or service-role key: it bypasses database access rules. The frontend rejects obvious secret-key configuration.
6. In the SQL Editor, approve individual real school email addresses:

   ```sql
   insert into public.allowed_accounts (email, role)
   values ('actual-staff-email-at-your-school', 'staff');
   ```

   Use lowercase email addresses, and role `pupil` for pupils. Only administrators change this list through Supabase. The app offers no self-service role selector. Deleting an approval row blocks subsequent database requests, even if a Google session remains active. Supabase project administrators remain responsible for access and retention.
7. Commit the public configuration and exact logo asset to GitHub. Verify Pages has deployed the new commit.

## What this version does

- OAuth authorisation-code flow with PKCE. The school Google password is entered only on Google's sign-in page.
- Approval-list check after Google login. An unapproved Google user may obtain an authentication session but cannot access tracker records.
- Data access rules require both approved email and matching authenticated owner ID. Accounts cannot read or update another account's records.
- Tokens stay in sessionStorage for the current tab. Access tokens refresh when needed; signing out clears the local session and calls the provider logout endpoint. Closing a tab ends its local session; signing out of this app does not sign out of Google itself.
- Records are stored per account in Supabase, with conflict detection to avoid silently overwriting another window's changes. On a failed save, editing stops and the current changes can be exported before reloading.
- Staff can add learner aliases and restore old JSON backups. Pupil UI omits those controls. Roles do not grant access to other accounts: shared teacher/pupil records, class assignment and teacher moderation are not implemented. Do not treat these UI controls as independent database permissions.
- Previous anonymous browser records are not automatically copied into a signed-in account. Export from the previous version first, then sign in as staff and restore the backup. The old `digital-den-v1` localStorage entry is left untouched.
- Curriculum statements are public static files. Learner records are protected database data, not public GitHub files.

## Required real-service validation before pupil use

Frontend tests use a mocked API. Real Google credentials/project configuration were unavailable during development. After configuring the project, test approved staff and pupil sign-in, denied accounts, logout, data persistence across devices, and attempted cross-account access using the database API (must return no other account's records). Also confirm deleting approval blocks reads/writes and that Google's school consent policy works for pupil accounts. Do not put production pupil information into an unverified deployment.

## School logo

The Digital Den header branding has been replaced with Nant Celyn. Supply the exact original PNG as `assets/school-logo.png`; it appears on the login screen and sidebar. The inline image in chat did not expose downloadable file bytes to the development tools, so no generated replacement is included. Until the file is added, the school name is shown without an invented crest. Digital Den activity names in the curriculum are preserved.
