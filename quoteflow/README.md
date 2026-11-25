# QuoteFlow

QuoteFlow is the Node/Express workspace in this folder. People sign in with Microsoft Entra ID in the browser through MSAL Browser (public client, authorization code + PKCE, no client secret), and the app then runs OData queries against the client's Dataverse environment to read the live Quote Log (`cr714_quotelog`) and MDM Log (`cr714_mdmlog`). Dataverse still enforces each employee's security role.

- Sign-in, sync, write-back and the full field mapping: [docs/dataverse-mapping.md](docs/dataverse-mapping.md)
- Configuration: `DATAVERSE_URL`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` (defaults are the original org and app registration). The Entra app registration needs `<app origin>/login` as a redirect URI on its single-page application platform.
- The original single-file `index.html` from the GitHub Pages build is kept as a reference; `/` now opens the Express app and redirects to `/login`.

## Static GitHub Pages build

`pages/` is the browser-only build served at https://wb-dt.github.io/TS/ (MSAL plus direct Dataverse calls, no Node). It cannot read outside `pages/`, so `styles.css`, `tokens.css` and the logos there are copies of the ones in `public/`. Edit the `public/` files, then run:

```bash
npm run pages:sync      # copy styles.css, tokens.css and the logos into pages/
npm run pages:publish   # copy, then push the result to the quoteflow-pages branch
```

`pages:publish` only pushes when the result differs from the branch tip, prints the changed files and the new commit, and leaves the Pages-only files (`.nojekyll`, `404.html`, `README.md`, `FIX-JEKYLL-PAGES.md`, `.gitignore`) alone. Use `node scripts/publish-pages.js --dry-run` to see what would change without pushing. `PAGES_REMOTE` and `PAGES_BRANCH` override the default remote and branch.

## Original standalone build

The notes below describe the first, single-file `index.html` version, which authenticated directly with Microsoft Entra ID through MSAL Browser and called the Microsoft Dataverse Web API with the signed-in employee's delegated permissions.

## Included functionality

- Corporate Microsoft sign-in
- `cr714_quotelog` synchronization
- Dashboard metrics
- Quote queue
- Assignment queue
- Approval-status queue derived from Quote Log fields
- Quote details
- Direct Dataverse assignment updates
- Browser cache for temporary offline viewing

The app contains no client secret. Tenant ID, application ID, and Dataverse URL are public identifiers. Dataverse continues to enforce each employee's security role.

## Repository placement

In `WB-DT/TS`, place the files as:

```text
TS/
├── .github/workflows/pages.yml
└── quoteflow/index.html
```

Copy this package's `index.html` to `TS/quoteflow/index.html` and copy `.github/workflows/pages.yml` to the repository root workflow folder.

## Entra registration

In the Daytona application registration (`afe649b6-9c70-4b1a-8592-78588284c8ee`):

1. Add a **Single-page application** platform.
2. Add the exact GitHub Pages URL as a redirect URI. For repository `WB-DT/TS`, the expected URL is:

   `https://wb-dt.github.io/TS/quoteflow/`

3. Add the same URL under front-channel logout if desired.
4. Confirm delegated Microsoft Dataverse `user_impersonation` permission and tenant admin consent.
5. Do not add or expose a client secret.

The redirect URI is case-sensitive and must match the actual Pages URL exactly.

## Publish

From the root of a local `WB-DT/TS` checkout:

```powershell
git add quoteflow/index.html .github/workflows/pages.yml
git commit -m "Publish QuoteFlow as GitHub Pages SPA"
git push origin main
```

In GitHub, open **Settings > Pages** and set **Source** to **GitHub Actions**. Then open **Actions > Deploy QuoteFlow to GitHub Pages** and run the workflow if the push did not start it automatically.

## Security and operating boundaries

- The app uses authorization-code flow with PKCE through MSAL Browser.
- Tokens are cached in the browser's local storage for the selected GitHub Pages origin.
- The app calls Dataverse directly, so corporate Conditional Access, MFA, and Dataverse roles remain authoritative.
- Assignment writes patch `cr714_assignedto` and `cr714_dateassigned` on `cr714_quotelog`.
- OCR, local SQLite, server-generated Excel/PDF exports, and filesystem uploads are not included because static GitHub Pages cannot execute Node.js server code.
- Power Automate approval actions are not fabricated. The Approvals page currently derives status from the verified Quote Log fields.

## CSV export

After sign-in and Dataverse synchronization, select **Export CSV** in the top toolbar. The browser downloads the currently synchronized Quote Log dataset as a UTF-8 CSV file named `QuoteFlow-QuoteLog-<timestamp>.csv`. The export includes identifiers, customer details, status, assignment, totals, dates, and notes. CSV quoting is applied for commas, quotation marks, and line breaks, and a UTF-8 BOM is included for reliable opening in Microsoft Excel.
