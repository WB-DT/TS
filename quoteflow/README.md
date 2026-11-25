# QuoteFlow

QuoteFlow is the quote workspace for the sales-support team. It runs on Node/Express
with a SQLite (or Azure SQL) database, signs people in against Microsoft Entra ID,
and reads the live Quote Log (`cr714_quotelog`) and MDM Log (`cr714_mdmlog`) from
the client's Dataverse environment.

- Sign-in, sync, write-back and the full field mapping: [docs/dataverse-mapping.md](docs/dataverse-mapping.md)
- Every setting, with defaults and which ones production requires: [.env.example](.env.example) and `config.js`.
- The one list of pages (routes, menu entries, headings, static-build keys): `pages.config.js`.

## Run it locally

You need Node 20 or newer. No database server, no Entra credentials:

```bash
cd quoteflow
npm install
npm start                 # http://localhost:3000
```

The first start creates `db/quotes.sqlite`, runs every migration, and seeds the
demo sign-in accounts. To also load the sample workspace (quotes, uploads, locked
prices) copy `.env.example` to `.env`, which sets `SEED_DEMO_DATA=true`, or run
`npm run db:reset -- --yes`. Sign in with any demo account and the password `demo`:

| Email | Role |
| --- | --- |
| `qualifier1@demo.com` | Qualifier: screening queue |
| `manager@demo.com` | Manager: assignments, approvals, reports, settings, branding |
| `quoter1@demo.com` | Quoter: quote workspace |
| `reviser1@demo.com` | Reviser: review queue (approval with `Can approve`) |
| `margin1@demo.com` | Margin Manager: locked prices, cross-reference |

Reps do not sign in: they submit requests through the Teams form, and those requests
arrive through the Teams import.

### Everyday commands

```bash
npm start                 # run the server
npm test                  # node --test: database, workflow, export, Pages drift, page manifest
npm run db:setup          # migrate + install views + seed (safe to repeat)
npm run db:reset -- --yes # delete the demo database and rebuild it from the seed
npm run uploads:prune     # list uploaded files no quote references
npm run uploads:prune -- --delete   # remove the ones older than UPLOAD_RETENTION_DAYS (90)
```

`db:reset` refuses to touch Azure SQL, only ever deletes the SQLite file named by
`SQLITE_PATH`, and always rebuilds the sample workspace. `uploads:prune` is a dry
run unless you pass `--delete`.

## Configuration

`config.js` is the only place environment variables are read. It ships the client's
public identifiers (Dataverse org, tenant id, app registration) as defaults and
validates the rest at startup: in production a missing `SESSION_SECRET` or
`APP_ORIGIN` stops the server with an `EX_CONFIG` message instead of running
misconfigured, while optional gaps (document reading, demo seed) are logged as
warnings. Copy `.env.example` to `.env` to override anything.

Two settings are worth knowing:

- `SESSION_SECRET`: sessions are stored in the database (table `sessions`), so a
  restart keeps people signed in. Without a secret in development, a random one is
  made per start, so local restarts sign you out.
- `UPLOAD_RETENTION_DAYS`: how old an unreferenced upload must be before
  `uploads:prune` will remove it.

## Health and logs

- `GET /healthz` needs no sign-in and checks the database. It answers
  `{"status":"ok"}` with `200`, or `503` when the database cannot be reached.
- Every request gets an `id`, echoed as the `X-Request-Id` response header and
  logged with method, path, status, duration and signed-in user. `LOG_FORMAT=json`
  emits one JSON object per line for a log collector; `LOG_LEVEL=error` quiets it.

## Tests and CI

`npm test` runs the suite with `node --test`:

- database, workflow, approval rules, CSV export layout and duplicates;
- `pages/` copies of `styles.css`, `tokens.css` and the logos still match `public/`;
- `pages/index.html` still carries the page catalog generated from `pages.config.js`;
- every page in the manifest has a route, a heading, a description and (where it
  belongs to a menu) an entry that can actually be opened.

`.github/workflows/quoteflow-tests.yml` runs the same suite on Node 20 and 22 for
every change under `quoteflow/`. It needs no secrets: SQLite is created by the tests.

## What runs where

The Express app is the product. `pages/` is the older browser-only build published
at https://wb-dt.github.io/TS/ for people who cannot reach the server; it talks to
Dataverse from the browser and has no Node process behind it. Both builds share
`public/styles.css`, `public/tokens.css` and the logos.

| Feature | Express app (`npm start`) | Static Pages build |
| --- | --- | --- |
| Sign-in | Entra ID (MSAL) or demo accounts | Entra ID (MSAL) in the browser |
| Quote Log / MDM Log | Dataverse sync, cached in the database | read live from Dataverse |
| Screening, assignment, approvals, reports | yes | preview only: sample rows, no writes |
| Teams import | reads the workbook and shows what would be created | reading the workbook needs the Node app |
| Locked prices | imports CSV files into the database | previews a CSV in the browser, saves nothing |
| Cross-reference | prices against account, house and costing reports | collects and labels the four files only; pricing needs the Node app |
| Read a document (OCR) | Azure Document Intelligence, server side | needs the Node app (the key never reaches a browser) |
| Settings, branding, users | yes | settings page explains it needs the Node app |
| CSV export of the log | yes | yes, in the browser |

Pages the static build cannot serve say so on the page itself, and nothing in its
menu links to a page it does not have.

## Publishing the static build

`pages/` may not read outside itself, so its `styles.css`, `tokens.css` and logos are
copies of the files in `public/`, and its page list is generated from
`pages.config.js`. Never edit the copies by hand:

```bash
npm run pages:sync      # refresh public/ copies and the page catalog in pages/index.html
npm run pages:publish   # sync, then push the result to the quoteflow-pages branch
```

`pages:publish` pushes only when the result differs from the branch tip, prints the
changed files and the new commit, and leaves the Pages-only files (`.nojekyll`,
`404.html`, `README.md`, `FIX-JEKYLL-PAGES.md`, `.gitignore`) alone. Use
`node scripts/publish-pages.js --dry-run` to see what would change without pushing;
`PAGES_REMOTE` and `PAGES_BRANCH` override the remote and branch.

## Security and operating boundaries

- The browser build uses authorization-code flow with PKCE through MSAL Browser and
  calls Dataverse directly, so Conditional Access, MFA and Dataverse security roles
  stay authoritative.
- The server never holds a user's Dataverse token beyond their session, and the
  Azure Document Intelligence key never reaches a browser.
- Assignment writes patch `cr714_assignedto` and `cr714_dateassigned` on
  `cr714_quotelog`; nothing else in Dataverse is written.
- Approvals are a permission (`Can approve`) with separation of duties, not a
  fabricated Power Automate action.
- Sessions live in the `sessions` table and expire with the 8-hour cookie.
- Uploaded files live in `uploads/quotes/` and are referenced by `quote_files`;
  `uploads:prune` removes what nothing references.

## CSV export

**Export CSV** in the top toolbar downloads the synchronized Quote Log as a UTF-8 CSV
named `QuoteFlow-QuoteLog-<timestamp>.csv`. It includes identifiers, customer
details, status, assignment, totals, dates and notes, quotes commas, quotation marks
and line breaks, and starts with a UTF-8 BOM so Excel opens it cleanly.
