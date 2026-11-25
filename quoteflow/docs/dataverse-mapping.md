# Dataverse mapping

QuoteFlow now signs people in with Microsoft in the browser (MSAL) and runs OData
queries against the client's Dataverse environment. This page records what is live,
what is mirrored, and what is QuoteFlow-only, so every field can be traced both ways.

## Sign-in and data flow

1. `/login` loads `@azure/msal-browser` (`/vendor/msal-browser.min.js`) and calls
   `loginRedirect()` with the scope `<DATAVERSE_URL>/user_impersonation`.
   Public client, authorization code + PKCE, no client secret. The redirect URI is
   `<app origin>/login` and must be registered on the Entra app registration.
2. Microsoft returns to `/login`; the browser exchanges the code for a Dataverse token
   and posts it to `POST /api/auth/dataverse/session`.
3. The server calls `WhoAmI` + `systemusers(<id>)` to read the work email, matches it to
   a QuoteFlow user, and keeps the token in the session. Unknown emails are refused
   (`not-in-quoteflow`) — add them on the Users page first.
4. Every OData call then runs as that person, so Dataverse security roles still apply.

The original demo password accounts on `/login` still work, but they have no Dataverse
token, so live sync is unavailable for them until they sign in with Microsoft.

## Tables

| Dataverse table | Entity set | Mirror table in QuoteFlow | App surface |
| --- | --- | --- | --- |
| `cr714_quotelog` | `cr714_quotelogs` (resolved from metadata) | `cr714_quotelog` (migration 014) | “Quote Log” tab on the request log page; Dataverse overview on the dashboards |
| `cr714_mdmlog` | `cr714_mdmlogs` (resolved from metadata) | `cr714_mdmlog` (migration 014) | “MDM Log” tab on the request log page |

- Column names are identical on both sides. Nothing is renamed in transit, so a field
  in the app is the same field in Dataverse (`cr714_assignedto` in the UI reads
  `cr714_quotelog.cr714_assignedto`).
- `GET /api/dataverse/status` reports the org URL, the entity sets in use, and when the
  last sync ran. `POST /api/dataverse/sync` pulls both logs.
- Sync is additive/corrective: new rows are inserted, changed rows updated, and rows
  deleted in Dataverse are removed from the mirror (the mirror is a copy, not a record).
- The `.xlsx` import (`POST /api/request-log/import`) is kept as an offline fallback for
  environments where browser sign-in is not available yet.

## Sync limits

Every sync is bounded, and a sync that hits a bound changes nothing:

| Bound | Default | Behaviour when hit |
| --- | --- | --- |
| Rows per log | 20,000 (`DATAVERSE_SYNC_MAX_ROWS`) | Stops with `dataverse-too-large`; mirror untouched |
| Pages per log | 200 | Stops with `dataverse-too-large`; mirror untouched |
| Whole sync | 120 s (`DATAVERSE_SYNC_TIMEOUT_MS`) | Stops with `dataverse-timeout`; mirror untouched |
| One OData request | 45 s | The request aborts; the sync stops with nothing changed |
| Syncs per person | 1 at a time | A second request waits on the one already running |

A sync reads the whole table before writing, so a short read can never look like
“these rows were deleted in Dataverse”. Raise the row limit only when the table really
is larger than 20,000 rows; the CSV export is capped at 50,000 rows separately.

## Field mapping used by the app

`public/request-log-page.js` (`REQUEST_LOG_LABELS`) is the single label map: it turns any
`cr714_*` column into the heading shown in the UI and in the detail panel, which lists
every column exactly as stored. The dashboard metrics use these fields:

| App concept | Dataverse column(s) | Notes |
| --- | --- | --- |
| Quote number | `cr714_quotenumber`, `cr714_oldquotenumber`, `cr714_recordkey` | First non-empty wins |
| Company / customer | `cr714_companyname`, `cr714_customernumber`, `cr714_customerorlead` | |
| Submitter | `cr714_submittername`, `cr714_submitteremail`, `cr714_submittingagentrole` | |
| Assigned to | `cr714_assignedto`, `cr714_dateassigned` | Written back by “Save to Dataverse” |
| Priority | `cr714_requestpriority`, `cr714_asapapprovingmanager`, `cr714_asapnotes` | |
| Pipeline value | `cr714_wbsellpricetotal`, `cr714_wbsellpricetotal_base` | Base currency column kept as-is |
| Margin | `cr714_grossprofitpercent` | Stored as text; shown with a `%` |
| Items | `cr714_itemstoquote`, `cr714_totalitemsquoted` | |
| Source document | `cr714_sourcefile`, `cr714_sourcemodifiedon`, `cr714_sourcesheet`, `cr714_sourceid` | |
| Stage (this app) | derived, see below | QuoteFlow only, not a Dataverse column |

### Stage mapping (QuoteFlow-only, `quoteLogStatus` in `server.js`)

| Stage shown | Rule on the Dataverse row |
| --- | --- |
| Returned | `cr714_datereturnedorkilled` is set |
| Approved | `cr714_completiontime` is set |
| In revision | `cr714_sentforrevision` = true or `cr714_datesentforrevision` is set |
| Awaiting approval | `cr714_asapapprovingmanager` + `cr714_assignedto` + `cr714_datequalified` are set |
| Assigned | `cr714_assignedto` or `cr714_dateassigned` is set |
| Ready to assign | `cr714_datequalified` is set, nothing assigned |
| Submitted | none of the above |

MDM uses `cr714_datesentbacktorepmdm` (Sent back), `cr714_assignedto` / `cr714_quoter`
(Assigned) and otherwise New (`stageOf` in `dataverse-logs.js`).

## Brought over from the original single-page app

| Original feature | Where it lives now | Notes |
| --- | --- | --- |
| MSAL browser sign-in | `/login`, `public/msal-auth.js`, `dataverse-auth.js` | Same public client + Dataverse scope |
| Live Dataverse metrics (total, needs assignment, awaiting approval, pipeline value) | “Live Dataverse quote log” on each dashboard (`/api/dataverse/overview`) | Reads the mirrored `cr714_quotelog` |
| Quote queue / assignments / approvals | Request log page + role pages | Already existed; request log now reads Dataverse |
| Detail drawer with every column | Request log page detail panel | |
| “Save to Dataverse” assignment | `POST /api/dataverse/quote-log/:id/assign` + detail panel form | PATCHes `cr714_assignedto`, `cr714_dateassigned` |
| Export CSV of the full log | `GET /api/dataverse/log/:log/export` + “Export CSV” button | Column headers are the Dataverse names |
| Sync status / record count | Sync bar on the request log page | Shows org, entity set, last sync |
| Connection settings | Sync bar (`/api/dataverse/status`) | Read-only; set `DATAVERSE_URL`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` |
| Browser cache fallback | Not carried over | The mirror table + last-sync time replace it |

## QuoteFlow-only data with no Dataverse table

These surfaces still use the app's own database. They are marked `QuoteFlow-only` in the
code; each row says what would need to exist in Dataverse to move it across.

| Surface | Storage today | Dataverse table needed |
| --- | --- | --- |
| Submitted requests, line items, files | `quotes`, `quote_files`, `quote_lines` | A request table with a file column, plus `cr714_quotelog` write-back |
| Pricing / locked prices | `locked_prices`, `quote_pricing` | Price-lock table |
| OCR extraction results | `quote_files`, `line_items` | Attachment metadata on the request table |
| Templates, versions | `templates`, `template_versions` | Template table |
| Cross-reference runs | `xref_runs` | Not planned |
| Comments, notifications, coaching | `quote_comments`, `notifications`, `coaching` | Activity/notes tables |
| Users, roles, teams import | `users`, `user_roles` | Entra groups, or a users table |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATAVERSE_URL` | `https://org23279050.crm.dynamics.com` | Org URL used for OData and the token scope |
| `AZURE_CLIENT_ID` | original SPA's public client id | Entra app registration (public client) |
| `AZURE_TENANT_ID` | original SPA's tenant | Entra tenant |
| `APP_ORIGIN` | request origin | Only needed behind a proxy; builds the redirect URI |
| `DATAVERSE_SYNC_MAX_ROWS` | `20000` | Rows one log may have in a single sync |
| `DATAVERSE_SYNC_TIMEOUT_MS` | `120000` | How long a whole sync may take |

`AZURE_CLIENT_SECRET` / `AZURE_REDIRECT_URI` are only used by the older server-side
`/auth/microsoft` fallback flow, not by the browser flow.
