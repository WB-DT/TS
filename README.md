# QuoteFlow — GitHub Pages site

This branch holds the published QuoteFlow site and nothing else: one static
`index.html`, a `404.html` that sends unknown paths back to it, and `.nojekyll`.

## Where it is served

GitHub Pages publishes this branch at:

    https://wb-dt.github.io/TS/

Configured in **Settings → Pages**: Source = **Deploy from a branch**,
Branch = **`quoteflow-pages`**, folder = **`/ (root)`**.

## Layout

    quoteflow-pages/
    ├── index.html
    ├── 404.html
    ├── .nojekyll
    ├── README.md
    └── FIX-JEKYLL-PAGES.md

## Entra ID registration

In the Daytona application registration (`afe649b6-9c70-4b1a-8592-78588284c8ee`):

1. Add a **Single-page application** platform.
2. Add this redirect URI exactly: `https://wb-dt.github.io/TS/`
3. Add the same URL under front-channel logout if desired.
4. Confirm delegated Microsoft Dataverse `user_impersonation` with tenant admin consent.
5. Do not add or expose a client secret.

The redirect URI must match the page URL exactly, trailing slash included,
because MSAL uses `location.origin + location.pathname`. The site is served
from `/TS/`, not `/TS/quoteflow/` — that path does not exist and would fail
with `AADSTS50011`.

## Updating the site

    git checkout quoteflow-pages
    # edit index.html
    git commit -am "Update QuoteFlow"
    git push

Pages rebuilds within about a minute. Keep this branch to static files only:
no `node_modules`, no `.env`, no server code, no workflows. The Node
application lives on `main`.

## What the app does

- Corporate Microsoft sign-in (MSAL Browser, authorization code + PKCE)
- `cr714_quotelog` synchronization through the Dataverse Web API
- Dashboard metrics, quote queue, assignment queue, approval-status queue
- Quote details and direct assignment updates on `cr714_quotelog`
- Browser cache for temporary offline viewing, CSV export with a UTF-8 BOM

Dataverse enforces each employee's own security role, so Conditional Access,
MFA and Dataverse permissions remain authoritative. The app makes browser-side
calls only; it contains no client secret.
