# Design: Clean up the menus and pages

## Decisions

1. **Menus and pages are removed together.** Removing a menu entry alone would leave the page reachable by typing its address. Removing the page means nothing points to it.
2. **Rename the label, keep the address.** The request log becomes "Quote log" in the menu and page title. Its address `/request-log` stays the same, so the change is only a label change.
3. **The import is removed completely.** The page block and `/api/request-log/import` go. Nothing is kept for a later import.
4. **Engines stay.** `xref.js` and `ocr.js` are used by the pricing and quote stages, so only their menu entries and pages are removed.
5. **Coaching data stays in the database.** Only the routes and the menu item go. No migration is needed.
6. **Old Quote log page is flagged.** It was not in the original list. It is removed only after its file names are confirmed.

## Files touched

- `auth.js`: menu definitions for Qualifier, Manager, Quoter and Margin Manager.
- `public/workspace.js`: page titles for removed addresses; request log title becomes "Quote log".
- `public/request-log-page.js`: import markup and handler.
- `server.js`: import route, teams preview route, read-document route, cross-reference routes, coaching routes.
- `public/styles.css`: sections for removed pages.
- Page files for New request, Import from Teams, Read a document, Cross-reference, Coaching, and the old Quote log page.

## Not changed

Pricing, quote stages, OCR engine, cross-reference engine, database migrations.
