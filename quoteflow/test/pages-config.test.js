const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const manifest = require("../pages.config");
const { PAGES, navigationByRole, pagesByHref, findPage, staticPages, renderStaticCatalog } = manifest;

const root = path.join(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "pages", "index.html"), "utf8");

test("every page has a route, a heading and a description", () => {
  for (const page of PAGES) {
    assert.match(page.href, /^\/[a-z-]+\/[a-z-]+$/, `bad href on ${page.label}`);
    assert.ok(page.label && page.label.trim(), `missing label on ${page.href}`);
    assert.ok(page.title && page.title.trim(), `missing title on ${page.href}`);
    assert.ok(page.description && page.description.trim(), `missing description on ${page.href}`);
    assert.ok(page.icon && page.icon.trim(), `missing icon on ${page.href}`);
    assert.ok(page.role && page.role.trim(), `missing role on ${page.href}`);
  }
});

test("no two routable pages share a route", () => {
  const routable = PAGES.filter((page) => page.routable !== false);
  const hrefs = routable.map((page) => page.href);
  assert.equal(new Set(hrefs).size, hrefs.length, "two pages claim the same route");
});

test("every menu entry is a page that can actually be opened", () => {
  for (const [role, items] of Object.entries(navigationByRole())) {
    for (const item of items) {
      const page = findPage(item.href);
      assert.ok(page, `${role} menu links to ${item.href}, which is not a route`);
      assert.equal(page.role, role, `${role} menu links to ${item.href}, which belongs to ${page.role}`);
    }
  }
  for (const role of ["Qualifier", "Manager", "Margin Manager", "Quoter", "Reviser"]) {
    assert.ok(navigationByRole()[role].length > 0, `${role} has no menu`);
  }
});

test("every routable page has copy for the workspace", () => {
  const copy = new Map(pagesByHref().map((page) => [page.href, page]));
  for (const page of PAGES) {
    if (page.routable === false) continue;
    const entry = copy.get(page.href);
    assert.ok(entry, `${page.href} has no entry in the workspace copy`);
    assert.equal(entry.title, page.title);
    assert.equal(entry.description, page.description);
  }
});

test("hidden pages are in the menu data but not rendered", () => {
  const hidden = PAGES.filter((page) => page.hidden);
  assert.ok(hidden.length > 0);
  for (const page of hidden) {
    const menu = Object.values(navigationByRole()).flat();
    assert.ok(menu.some((item) => item.href === page.href && item.hidden === true), `${page.href} is not marked hidden in the menu`);
  }
});

test("Rep pages have copy but are not routes", () => {
  assert.equal(findPage("/rep/my-requests"), null, "Rep pages must stay unroutable: reps use the Teams form");
  assert.ok(pagesByHref().some((page) => page.href === "/rep/my-requests"));
});

test("the legacy quote log route stays gone", () => {
  assert.equal(findPage("/manager/quote-log"), null);
});

test("pages/index.html carries the catalog generated from pages.config.js", () => {
  const block = indexHtml.match(/\/\/ BEGIN PAGE CATALOG[^\n]*\n([\s\S]*?)\/\/ END PAGE CATALOG/);
  assert.ok(block, "pages/index.html has no PAGE CATALOG markers");
  assert.equal(
    block[1].replace(/\r\n/g, "\n"),
    `${renderStaticCatalog()}\n`,
    "pages/index.html page list is stale; run npm run pages:sync",
  );
});

test("every static page has a body to render", () => {
  for (const page of staticPages()) {
    assert.ok(
      indexHtml.includes(`page === "${page.key}"`),
      `pages/index.html lists ${page.key} in the menu but bodyFor() has no branch for it`,
    );
  }
});
