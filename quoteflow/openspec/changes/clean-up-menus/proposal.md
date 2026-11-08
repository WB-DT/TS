# Clean up the menus and pages

## Why

The app shows menu items that the team does not use, and two of them duplicate each other: "Quote log" and "Request log" show the same records. The request log also has an import block that nobody needs. Removing these makes the prototype clear enough to present on Tuesday.

## What changes

- Remove these menu items and their pages: New request (intake), Import from Teams, Read a document, Cross-reference (Margin Manager), Coaching, and the old Quote log page.
- Rename the Request log menu item and page title to "Quote log". The web address stays the same.
- Remove the import block from the request log page and its server route, `/api/request-log/import`.
- Remove the styles that only those pages used.

## Out of scope

- The cross-reference engine (`xref.js`) stays. The pricing step uses it.
- The OCR engine (`ocr.js`) stays. The quote stages use it.
- No database changes. Coaching data stays in the database and is not deleted.
- The quote log will have no data loaded after this change. Loading data is a separate change.
- Restyling. That happens after Tuesday.
