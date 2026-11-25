'use strict';

/**
 * The files authored in public/ that need a byte-identical copy in pages/.
 *
 * scripts/publish-pages.js copies them across and test/pages-assets.test.js
 * fails npm test when the two copies differ, so this is the one place to
 * declare them. logo-mark-light.svg is left out: it belongs to the Express
 * login page, which GitHub Pages cannot serve.
 */
const ASSETS = ['styles.css', 'tokens.css', 'logo-mark.svg', 'quoteflow-logo.svg'];

module.exports = { ASSETS };
