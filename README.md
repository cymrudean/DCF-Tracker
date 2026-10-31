# Digital Den — Nursery DCF Tracker

A local browser prototype based on **Nursery DCF Tester.xlsx**. All 18 Nursery Skills Ladder rows are preserved in `data/skills.json`, including exact DCF statements, child-friendly interpretations, elements, Digital Den activities, suggested AoLEs and beyond-Digital-Den examples.

## Run

Requires Python 3 and Node.js 18+ for tests. No application dependencies or install step.

```sh
cd /workspace/DCF-Tracker
npm start
```

The server uses port 3000. Open the served app using your development environment's browser access. Do not open `index.html` directly: the app fetches its skill data over HTTP. Stop the server with Ctrl+C.

## Use

1. Add a learner alias or select a learner.
2. Check any of the three independent stages for each skill. Checks can be removed. Stages do not imply one another.
3. Expand **Skill details & evidence** to see the original statement and activity context, and add dated observations, next steps and optional links to specific work.
4. Use **Progress overview** to see percentages by strand and element. Each percentage is stage checks divided by the number of skills in that group; independent stages can total more than 100%.
5. Export records regularly. Restore accepts the app's JSON backups and explicitly asks before replacing current records.

Stage labels are **Explored together**, **Practising with support**, and **Applied in context**. The last stage does not require independence: support can remain appropriate. This is a record of learning opportunities, not a pass/fail judgement.

## Evidence and storage boundaries

Google Drive, Google Docs, OneDrive and school SharePoint HTTPS links are supported. Links are stored against the selected learner and exact skill ID. They open the original work; the app does not upload, copy, inspect, validate existence/ownership of, or grant access to cloud files. Share a specific file using school-managed permissions. There is no cloud file picker, assignment delivery, sign-in, teacher approval or device synchronisation in this prototype.

Records live in localStorage for the current browser profile and origin. Clearing browser data, changing origin/port or using another browser does not carry records over. Export/restore is the transfer mechanism. Use aliases and sample observations while reviewing the prototype. Shared school use needs authentication, authorisation, server-side storage and school-approved handling of pupil records.

The app makes no external font, analytics or cloud API requests. The local server is for development, not production hosting. No workbook contents are executed as instructions. Spreadsheet calculations were replaced with direct calculations; the original formulas contain invalid COUNTIF criteria arithmetic.

## Validation

```sh
npm test
```

Four Node tests cover curriculum integrity, independent percentages, evidence URL validation and backup validation.

Optional browser checks require Playwright and Chromium, supplied by this cloud environment:

```sh
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs
```

Start the server first. The browser test uses an isolated browser profile and checks assessment persistence, observations, chart values, separate learner records, search and mobile overflow. It writes screenshots to `/tmp`.
