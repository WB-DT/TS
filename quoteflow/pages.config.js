'use strict';

/**
 * The one list of QuoteFlow pages.
 *
 * Three things used to keep their own copy of this list, and they drifted: the
 * navigation in auth.js, the page copy in public/workspace.js, and the PAGES /
 * PAGE_COPY arrays in pages/index.html. A page could be built, script-loaded and
 * reachable by URL while missing from the menu, and a new page could ship with a
 * route but no heading. Everything below is derived from this file instead:
 *
 *   auth.navigation          navigationByRole()
 *   /api/workspace "pages"   pagesByHref()
 *   pages/index.html         renderStaticCatalog()  (written by npm run pages:sync)
 *
 * test/pages-config.test.js checks the routes, the copy and the generated Pages
 * catalog, so a page that is missing from one of them fails npm test.
 *
 * Fields
 *   role        the role whose menu lists the page
 *   href        the route, which is also the page's identity in the app
 *   label       sidebar label
 *   icon        key in public/workspace.js iconMarkup
 *   title       page heading and breadcrumb
 *   description one sentence under the heading
 *   routable    false: has copy but is not a route and is not in any menu
 *               (Rep pages: reps use the Teams form; Templates: not wired up)
 *   hidden      true: in the menu data but not rendered (the My settings shortcut)
 *   pagesKey    the page key in the static GitHub Pages build, when it has one
 *   pagesGroup  the static build's sidebar group for that key
 *   pagesDescription  static build copy, when that build does something different
 */

const PAGES = [
  // Qualifier
  { role: 'Qualifier', href: '/qualifier/home', label: 'Dashboard', icon: 'dashboard',
    title: 'Dashboard', description: 'Your screening queue at a glance.' },
  { role: 'Qualifier', href: '/qualifier/screening-queue', label: 'Screening queue', icon: 'screening',
    title: 'Screening queue', description: 'Review new submissions.', pagesKey: 'screening', pagesGroup: 'WORKSPACE' },
  { role: 'Qualifier', href: '/qualifier/request-log', label: 'Quote Log', icon: 'list',
    title: 'Request log', description: "The team's Quote Log and MDM Log, read live from Dataverse.",
    pagesKey: 'request-log', pagesGroup: 'WORKSPACE' },
  { role: 'Qualifier', href: '/qualifier/teams-import', label: 'Teams import', icon: 'upload',
    title: 'Teams import', description: "Bring the team's Teams quote log into QuoteFlow.",
    pagesKey: 'teams-import', pagesGroup: 'ADMIN' },
  { role: 'Qualifier', href: '/qualifier/my-settings', label: 'My settings', icon: 'settings', hidden: true,
    title: 'My settings', description: 'Adjust how QuoteFlow looks for you.', pagesKey: 'my-settings', pagesGroup: 'ADMIN' },

  // Manager
  { role: 'Manager', href: '/manager/home', label: 'Dashboard', icon: 'dashboard',
    title: 'Dashboard', description: "Your team's day at a glance.", pagesKey: 'dashboard', pagesGroup: 'WORKSPACE' },
  { role: 'Manager', href: '/manager/request-log', label: 'Quote Log', icon: 'list',
    title: 'Request log', description: "The team's Quote Log and MDM Log, read live from Dataverse." },
  { role: 'Manager', href: '/manager/assignments', label: 'Assignments', icon: 'assign',
    title: 'Assignments', description: 'Review work that is ready to assign or already assigned.',
    pagesKey: 'assignments', pagesGroup: 'WORKSPACE' },
  { role: 'Manager', href: '/manager/approval-queue', label: 'Approval queue', icon: 'review',
    title: 'Approval queue', description: 'Quotes waiting for approval.',
    pagesKey: 'approval-queue', pagesGroup: 'WORKSPACE' },
  { role: 'Manager', href: '/manager/reports', label: 'Reports', icon: 'metrics',
    title: 'Reports', description: 'Pipeline, cycle time, and coaching reports.',
    pagesKey: 'reports', pagesGroup: 'WORKSPACE' },
  { role: 'Manager', href: '/manager/cross-reference', label: 'Cross-reference', icon: 'metrics',
    title: 'Cross-reference', description: 'Price a list of items against the account, house and costing reports.',
    pagesKey: 'cross-reference', pagesGroup: 'MARGIN' },
  { role: 'Manager', href: '/manager/read-document', label: 'Read a document', icon: 'upload',
    title: 'Read a document', description: 'Read a PDF or photo and find its item lines.',
    pagesKey: 'read-document', pagesGroup: 'MARGIN' },
  { role: 'Manager', href: '/manager/teams-import', label: 'Teams import', icon: 'upload',
    title: 'Teams import', description: "Bring the team's Teams quote log into QuoteFlow." },
  // Templates has a page component and an API, but no link and no finished UI, so
  // it keeps its copy here and stays off the routes rather than half-working.
  // Making it a real page is a follow-up: remove routable:false when it is wired up.
  { role: 'Manager', href: '/manager/templates', label: 'Templates', icon: 'templates', routable: false,
    title: 'Templates', description: 'Build and publish quote export templates.',
    pagesKey: 'templates', pagesGroup: 'WORKSPACE' },
  { role: 'Manager', href: '/manager/settings', label: 'Settings', icon: 'settings',
    title: 'Settings', description: 'Manage users, roles, and access.',
    pagesKey: 'settings', pagesGroup: 'ADMIN',
    pagesDescription: "Manage users, roles, access, and this browser's Dataverse connection." },
  { role: 'Manager', href: '/manager/branding', label: 'Branding', icon: 'settings',
    title: 'Branding', description: 'Set the company name and logo shown across the workspace.',
    pagesKey: 'branding', pagesGroup: 'ADMIN' },
  { role: 'Manager', href: '/manager/my-settings', label: 'My settings', icon: 'settings', hidden: true,
    title: 'My settings', description: 'Adjust how QuoteFlow looks for you.' },

  // Margin Manager
  { role: 'Margin Manager', href: '/margin/locked-prices', label: 'Locked prices', icon: 'metrics',
    title: 'Locked prices', description: 'Prices locked into customer accounts. Import CSV files and review margins.',
    pagesKey: 'locked-prices', pagesGroup: 'MARGIN' },
  { role: 'Margin Manager', href: '/margin/cross-reference', label: 'Cross-reference', icon: 'metrics',
    title: 'Cross-reference', description: 'Price a list of items against the account, house and costing reports.' },
  { role: 'Margin Manager', href: '/margin/my-settings', label: 'My settings', icon: 'settings', hidden: true,
    title: 'My settings', description: 'Adjust how QuoteFlow looks for you.' },

  // Quoter
  { role: 'Quoter', href: '/quoter/home', label: 'Dashboard', icon: 'dashboard',
    title: 'Dashboard', description: 'Your quote queue at a glance.' },
  { role: 'Quoter', href: '/quoter/my-quotes', label: 'My quotes', icon: 'quotes',
    title: 'My quotes', description: 'Track the quotes assigned to your account.',
    pagesKey: 'my-quotes', pagesGroup: 'WORKSPACE' },
  { role: 'Quoter', href: '/quoter/quote-workspace', label: 'Quote workspace', icon: 'quotes', hidden: true,
    title: 'Quote workspace', description: 'Run extraction, manage files, and price the quote.',
    pagesKey: 'quote-workspace', pagesGroup: 'WORKSPACE' },
  { role: 'Quoter', href: '/quoter/read-document', label: 'Read a document', icon: 'upload',
    title: 'Read a document', description: 'Read a PDF or photo and find its item lines.' },
  { role: 'Quoter', href: '/quoter/my-settings', label: 'My settings', icon: 'settings', hidden: true,
    title: 'My settings', description: 'Adjust how QuoteFlow looks for you.' },

  // Reviser
  { role: 'Reviser', href: '/reviser/home', label: 'Dashboard', icon: 'dashboard',
    title: 'Dashboard', description: 'Your review queue at a glance.' },
  { role: 'Reviser', href: '/reviser/review-queue', label: 'Review queue', icon: 'review',
    title: 'Review queue', description: 'Quotes waiting for your review.',
    pagesKey: 'review-queue', pagesGroup: 'WORKSPACE' },
  { role: 'Reviser', href: '/reviser/approval-queue', label: 'Approval queue', icon: 'review',
    title: 'Approval queue', description: 'Quotes waiting for approval.' },
  { role: 'Reviser', href: '/reviser/my-settings', label: 'My settings', icon: 'settings', hidden: true,
    title: 'My settings', description: 'Adjust how QuoteFlow looks for you.' },

  // Rep pages: copy only. Reps submit through the Teams form, so /rep/* is not a route.
  { role: 'Rep', href: '/rep/home', label: 'Dashboard', icon: 'dashboard', routable: false,
    title: 'Dashboard', description: 'Your requests at a glance.' },
  { role: 'Rep', href: '/rep/new-quote-request', label: 'New quote request', icon: 'upload', routable: false,
    title: 'New quote request', description: 'Share the opportunity details so a Quoter can prepare a response.' },
  { role: 'Rep', href: '/rep/my-requests', label: 'My requests', icon: 'list', routable: false,
    title: 'My requests', description: 'Track quote requests submitted from your account.' },
];

const ORDER = ['Qualifier', 'Manager', 'Margin Manager', 'Quoter', 'Reviser', 'Rep'];

/** The menu for each role, in list order. */
function navigationByRole() {
  const menus = {};
  for (const role of ORDER) menus[role] = [];
  for (const page of PAGES) {
    if (page.routable === false) continue; // copy only: not a route, so not in any menu
    const item = { label: page.label, href: page.href, icon: page.icon };
    if (page.hidden) item.hidden = true;
    (menus[page.role] || (menus[page.role] = [])).push(item);
  }
  return menus;
}

/** Heading and one-line description for every page, keyed by href, for the app's page copy. */
function pagesByHref() {
  const byHref = new Map();
  for (const page of PAGES) {
    if (!byHref.has(page.href)) byHref.set(page.href, { href: page.href, title: page.title, description: page.description });
  }
  return [...byHref.values()];
}

/** The page a route serves, or null when no routable page owns that path. */
function findPage(pathname) {
  const page = PAGES.find((candidate) => candidate.href === pathname && candidate.routable !== false);
  return page ? { ...page } : null;
}

/** The static build's sidebar groups, in the order they are shown. */
const STATIC_GROUPS = ['WORKSPACE', 'MARGIN', 'ADMIN'];

/** The static build keeps one page per key; the first manifest entry with that key wins. */
function staticPages() {
  const seen = new Map();
  for (const page of PAGES) {
    if (!page.pagesKey || seen.has(page.pagesKey)) continue;
    seen.set(page.pagesKey, {
      key: page.pagesKey,
      label: page.label,
      icon: page.icon,
      group: page.pagesGroup,
      title: page.title,
      description: page.pagesDescription || page.description,
    });
  }
  const rank = (page) => STATIC_GROUPS.indexOf(page.group);
  return [...seen.values()].sort((a, b) => rank(a) - rank(b));
}

/**
 * The PAGES and PAGE_COPY declarations for pages/index.html, exactly as written
 * between the catalog markers. scripts/publish-pages.js writes this text and
 * test/pages-config.test.js fails npm test when the file has drifted from it.
 */
function renderStaticCatalog() {
  const pages = staticPages();
  const list = pages.map((page) =>
    `  { key: ${JSON.stringify(page.key)}, label: ${JSON.stringify(page.label)}, icon: ${JSON.stringify(page.icon)}, group: ${JSON.stringify(page.group)} },`
  );
  const copy = pages.map((page) =>
    `  ${JSON.stringify(page.key)}: [${JSON.stringify(page.title)}, ${JSON.stringify(page.description)}],`
  );
  return [
    'const PAGES = [',
    ...list,
    '];',
    '',
    '// Headings and one-sentence descriptions, from the same manifest.',
    'const PAGE_COPY = {',
    ...copy,
    '};',
  ].join('\n');
}

module.exports = { PAGES, navigationByRole, pagesByHref, findPage, staticPages, renderStaticCatalog };
