# CRM Prototype

A clickable prototype of an internal CRM for sales reps: a rep dashboard and customer account pages. Plain HTML, CSS and JavaScript with no frameworks and no build step. All data is invented sample data, and nothing is saved: reload the page and it resets.

## Run it

- **On your computer:** open `index.html` in a browser.
- **On GitHub Pages:**
  1. Go to the repo's **Settings › Pages**.
  2. Under **Source**, choose **Deploy from a branch**.
  3. Pick `main` and `/ (root)`, then save.
  4. Your site appears at `https://<your-username>.github.io/<repo-name>/` after a minute or two.

## What's where

| File | What it does |
|---|---|
| `index.html` | The page shell. It loads the CSS and JS below, in that order. |
| `css/tokens.css` | Midnight Calm design tokens: colors, light and dark mode, and the five accent presets. Don't edit by hand; it comes from the design system. |
| `css/app.css` | Layout and components: sidebar, cards, tables, forms, modals, plus the tablet and phone breakpoints. |
| `js/icons.js` | The icon sprite. Icons are used in code as `I('icon-name', size)`. |
| `js/data.js` | **All sample data**: accounts, users, addresses, items, tasks, feed, promotions, requests and settings. Start here to change what you see. |
| `js/core.js` | Helpers, routing, the main menu, the rep dashboard, customers, planner, requests, modals, and the log-a-call, task and request forms. |
| `js/customers.js` | The My customers page: every account assigned to the rep, with tabs, filters, sorting, paging and CSV export. |
| `js/account.js` | Every account section (Summary, Users, Addresses, GP calculator, Opportunities, Settings, Specialty services and the rest), plus click handling and startup. |
| `tools/build-single-file.js` | Optional. `node tools/build-single-file.js` bundles everything into `dist/prototype.html`, one file you can share. |

## How it works

- **Routing:** the `go()` function in `core.js` picks the screen and keeps its own copy of the route, so links also work in file previews that block address changes. In a normal browser the address shows the route too, for example `#/dash/today`, `#/customers`, `#/a/104218/users/u2/settings`. Each section is a function that returns HTML.
- **State:** screen state lives in the `UI` object in `core.js`. Any change calls `render()`, which redraws the page.
- **Clicks:** buttons carry `data-a="actionName"`, which maps to a function in the `A` object in `account.js`. Typing uses `data-in` (the `IN` object) and dropdowns use `data-ch` (the `CH` object).
- **Design rules:** selected items use a tint plus a full border, never an edge bar. Colors always come from tokens.

## Ideas to try first

- Add an account to `ACCOUNTS` in `data.js` and find it in My customers.
- Change the 20% margin floor in `account.js` (`const FLOOR = 20`) and watch the GP calculator's margin check change.
- Add a menu item to `ACCT_MENU` in `core.js` and a matching section function in `account.js`.
- Assign an account to a different rep in `TEAM` (bottom of `data.js`) and watch My customers update.
