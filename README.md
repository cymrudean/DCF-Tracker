# Nant Celyn — Nursery DCF Tracker

A staff email-and-password sign-in app based on the 18 skills in Nursery DCF Tester.xlsx. Includes independent assessment stages, strand/element progress charts, dated observations, Google Drive/OneDrive evidence links, and JSON backup export. Supabase stores private account records.

**Authentication setup is required before use.** See [AUTH_SETUP.md](AUTH_SETUP.md). With blank `auth-config.json`, the app stays locked. Do not commit secret/service-role keys or OAuth client secrets.

## Development

Requires Python 3 and Node.js 18+. No application package dependencies.

```sh
npm start
npm test
```

The development server uses port 3000. Serve the app over HTTP rather than opening index.html directly. GitHub Pages hosts the public frontend; it does not itself provide login or private storage.

Staff can self-register with any email address, confirm it and await owner approval. Approved staff manage their own learner records. Senior leaders can approve/revoke staff and view all staff tracker records read-only. Password recovery is included. Existing approved pupil accounts remain compatible. Assignment delivery is future work. Evidence links open the original work under its existing cloud sharing permissions; no file picker or cloud upload is included.

Assessment stages are **Explored together**, **Practising with support**, and **Applied in context**. They are independent and do not imply one another. Charts calculate checks divided by the group's skill count, so stages can total more than 100%. Applied in context does not require independence. This records learning opportunities, not pass/fail judgements.

## Tests

`npm test` checks calculations, curriculum integrity, backup/URL validation and auth configuration. The optional browser regression uses a mocked authentication/data service; it does not prove production authentication or email delivery works:

```sh
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs
```

Start the server first. Browser tests use an isolated browser profile. PostgreSQL access-rule tests, real-service acceptance checks and logo installation are described in AUTH_SETUP.md.
