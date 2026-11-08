# QuoteFlow

QuoteFlow is a working prototype of a quoting workspace for the quotes team. It takes a rep's quote request from intake to an approved, priced quote in one place: it reads the customer's files, compares prices against the account, house and cost data, checks the margin, and tracks every step so managers can see where work stands.

> **Status: prototype.** Built to show how the workflow could run and to gather feedback before a beta. It runs on test data and demo sign-ins, and it is not connected to production systems.

---

## What it does

| Area | What's built |
|---|---|
| **Roles** | Separate menus and dashboards for Manager, Qualifier, Quoter and Reviser. Approval is a permission given to managers (and optionally to revisers), not a separate role. A person who revised a quote cannot also approve it. |
| **Quote workspace** | Upload or open a quote's files, extract line items, verify them side by side with the file, price each line, and submit for review. |
| **Reading documents (OCR)** | Extracts items, quantities and prices from invoices. Uses Azure AI Document Intelligence when configured. |
| **Pricing** | `pricing.js` follows the team's existing cross-reference logic: it matches account price, house account price and cost reports by item and unit of measure, works out the financial cost, the margin and the price at target margin, and flags lines that need a deviation. |
| **Templates and export** | Exports each quote in the team's Excel template, as an internal version (with cost and margin) and a customer version (internal columns removed). |
| **Tracking** | Every status change is recorded with who and when, which powers turnaround, workload and quality reports. |
| **Settings** | Users and roles, minimum items, lead time, target margin and margin floor, reason lists, branding, and each person's own screen brightness and text size. |

### In progress

| Feature | Notes |
|---|---|
| **Request log** | Stores the team's Quote Log and MDM Log in tables named after the client's Dataverse tables (`cr714_quotelog`, `cr714_mdmlog`), loaded from an export for now. |
| **Locked prices** | A Margin Manager view of prices locked into customer accounts, loaded from CSV for now and saved automatically on approval later. |
| **Sign in with Microsoft** | Company sign-in through Entra ID. The code is in place and is waiting on IT approval. |
| **Open-source OCR** | Tesseract.js as a local, no-cost reader for scans and photos until Azure Document Intelligence is approved. |

---

## Run it

QuoteFlow runs on Node.js. In this repository it lives in the `quoteflow` folder, next to the account maintenance prototype.

1. Go into the folder:
   ```
   cd quoteflow
   ```
2. Install the packages (once per new codespace or computer):
   ```
   npm install
   ```
3. Create a `.env` file inside `quoteflow` (see **Settings** below). It is never committed.
4. Start the app:
   ```
   npm start
   ```
5. Open port **3000** and sign in. The demo accounts are listed on the sign-in page, and the password for all of them is `demo`.

The database is created and set up automatically the first time the app starts.

To run the automated checks:
```
npm test
```

---

## Settings (`.env`)

| Setting | Needed | What it does |
|---|---|---|
| `PORT` | Yes | The port the app runs on (3000) |
| `SESSION_SECRET` | Yes | A long random value that protects sign-in sessions |
| `DB_CLIENT` | Yes | `better-sqlite3` for the local prototype database |
| `SQLITE_PATH` | Yes | Where the local database file lives, for example `db/quotes.sqlite` |
| `MANAGER_EMAILS` | Optional | Work emails that are given the Manager role on startup |
| `AZURE_DI_ENDPOINT`, `AZURE_DI_KEY` | Optional | Azure AI Document Intelligence, for invoice reading |
| `AZURE_SQL_*` | Later | Only used if QuoteFlow's own database moves to Azure SQL |

The Microsoft sign-in values (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_REDIRECT_URI`) are stored as **Codespaces secrets**, not in `.env` and never in code.

---

## What's where

| Path | What it holds |
|---|---|
| `server.js` | The web server and every API route |
| `auth.js` | Sign-in, sessions, role menus and page access |
| `microsoft-auth.js` | Sign in with Microsoft (Entra ID) |
| `pricing.js` | The pricing and cross-reference rules |
| `templates.js`, `presets.js` | Export templates, units of measure and note presets |
| `fields.js` | Every field's label and plain-English definition, used for the in-app info icons |
| `teams-import.js` | Reads the team's quote log export |
| `db/` | Database setup: migrations (table changes, in order), seed data and queries |
| `public/` | What runs in the browser: page scripts, styles and logos |
| `views/` | The page shells (sign-in and workspace) |
| `docs/` | The data dictionary and the metrics guide |
| `test/` | Automated checks |
| `sample-data/` | Invented pricing reports for testing (see below) |
| `sample-files/` | Local test attachments. Never committed. |

---

## Data rules

This repository holds **code and invented sample data only**.

- **Everything in `sample-data/` is invented.** The account price, house account price and costing reports contain no real customer, pricing or cost information.
- **Real company data is never committed.** Exports, customer files and pricing stay in the company's own systems (Dataverse, SharePoint) and are only loaded into a running copy of the app.
- **The app's database file is never committed.** It lives only on the machine running QuoteFlow.
- **QuoteFlow only reads company systems.** It never writes back to Dataverse or SharePoint.
- **Secrets are never committed.** Keys and passwords live in `.env` or Codespaces secrets, and both are kept out of git by `.gitignore`.

Before every commit, run `git status` and confirm no `.env`, `.sqlite`, export or customer file is listed.

---

## Database

QuoteFlow uses Knex (a database toolkit) with SQLite for the prototype. The same tables and queries can run on Azure SQL by changing the `DB_CLIENT` setting and the `AZURE_SQL_*` values, with no code changes. Moving existing data between databases is a separate step.

- **Tables and columns:** [docs/data-dictionary.md](docs/data-dictionary.md)
- **How each metric is calculated:** [docs/metrics.md](docs/metrics.md)

---

## Known items before beta

- **Security warnings from `npm audit`:** `uuid`, used inside `exceljs`, has a moderate warning that doesn't affect how QuoteFlow uses it. It will be resolved when `exceljs` updates.
- **Company sign-in** replaces the demo accounts once IT approves the app.
- **Hosting** moves from Codespaces to the company's Azure environment.
- **OCR** moves to the company's own Azure Document Intelligence resource.