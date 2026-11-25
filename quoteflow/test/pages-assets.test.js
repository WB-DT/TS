const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// The list publish-pages.js copies, so the two cannot drift apart.
const { ASSETS } = require("../scripts/pages-assets");

const root = path.join(__dirname, "..");

for (const name of ASSETS) {
  test(`pages/${name} matches public/${name}`, () => {
    const source = path.join(root, "public", name);
    const copy = path.join(root, "pages", name);
    assert.ok(fs.existsSync(source), `missing source file public/${name}`);
    assert.ok(fs.existsSync(copy), `missing Pages copy pages/${name}; run npm run pages:sync`);
    const sourceBytes = fs.readFileSync(source);
    const copyBytes = fs.readFileSync(copy);
    assert.ok(
      sourceBytes.equals(copyBytes),
      `pages/${name} differs from public/${name}; run npm run pages:publish`,
    );
  });
}
