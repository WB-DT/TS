#!/usr/bin/env node
'use strict';

/**
 * Keeps the static GitHub Pages build in quoteflow/pages in step with the app.
 *
 * styles.css, tokens.css and the logos are authored in public/ and served by the
 * Express app. GitHub Pages cannot read outside quoteflow/pages, so this step
 * copies them across and republishes the quoteflow-pages branch, whose tree is
 * the contents of quoteflow/pages plus the Pages-only files (.nojekyll etc.).
 *
 *   node scripts/publish-pages.js              copy, then publish if anything changed
 *   node scripts/publish-pages.js --copy-only  copy only
 *   node scripts/publish-pages.js --dry-run    copy, then report what would publish
 *
 * PAGES_REMOTE and PAGES_BRANCH override the default remote and branch.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ASSETS } = require('./pages-assets');

const APP_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(APP_DIR, 'public');
const PAGES_DIR = path.join(APP_DIR, 'pages');
const REMOTE = process.env.PAGES_REMOTE || 'https://github.com/WB-DT/TS.git';
const BRANCH = process.env.PAGES_BRANCH || 'quoteflow-pages';

// Published but vendored: restored from node_modules when pages/ is missing it.
const MSAL = {
  dest: 'msal-browser.min.js',
  src: path.join(APP_DIR, 'node_modules', '@azure', 'msal-browser', 'lib', 'msal-browser.min.js')
};

// Files that live only on the quoteflow-pages branch. Everything else on that
// branch is generated from pages/, so a file deleted from pages/ is removed.
const PAGES_ONLY = ['.gitignore', '.nojekyll', '404.html', 'FIX-JEKYLL-PAGES.md', 'README.md'];

function git(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: options.cwd || APP_DIR,
    encoding: 'utf8',
    env: { ...process.env, ...options.env }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = `${result.stderr || ''}${result.stdout || ''}`.trim();
    throw new Error(`git ${args.join(' ')} failed${output ? `:\n${output}` : ''}`);
  }
  return (result.stdout || '').trim();
}

function gitMaybe(args, options) {
  try {
    return git(args, options);
  } catch {
    return null;
  }
}

function copyAssets() {
  let changed = false;
  for (const name of ASSETS) {
    const from = path.join(PUBLIC_DIR, name);
    const to = path.join(PAGES_DIR, name);
    if (!fs.existsSync(from)) throw new Error(`Missing source file public/${name}`);
    if (fs.existsSync(to) && fs.readFileSync(to).equals(fs.readFileSync(from))) {
      console.log(`  ${name} up to date`);
      continue;
    }
    fs.copyFileSync(from, to);
    console.log(`  ${name} copied from public/`);
    changed = true;
  }

  const msal = path.join(PAGES_DIR, MSAL.dest);
  if (!fs.existsSync(msal)) {
    if (!fs.existsSync(MSAL.src)) {
      throw new Error(`pages/${MSAL.dest} is missing and node_modules is not installed; run npm install first.`);
    }
    fs.copyFileSync(MSAL.src, msal);
    console.log(`  ${MSAL.dest} restored from node_modules`);
    changed = true;
  }
  return changed;
}

function publish({ dryRun }) {
  const repoRoot = git(['rev-parse', '--show-toplevel']);
  const gitDir = git(['rev-parse', '--absolute-git-dir']);

  const tip = git(['ls-remote', REMOTE, `refs/heads/${BRANCH}`], { cwd: repoRoot })
    .split('\n')
    .map((line) => line.split('\t')[0])
    .find(Boolean);
  if (!tip) throw new Error(`Branch ${BRANCH} was not found on ${REMOTE}; refusing to create it from scratch.`);
  const tipTree = git(['rev-parse', `${tip}^{tree}`], { cwd: repoRoot });

  // Build the new tree from pages/ alone, carrying the Pages-only files over
  // from the current tip; anything else that is not in pages/ is left behind.
  const indexFile = path.join(gitDir, 'pages-build.index');
  fs.rmSync(indexFile, { force: true });
  const indexEnv = { GIT_INDEX_FILE: indexFile };
  let tree;
  try {
    git(['read-tree', '--empty'], { cwd: repoRoot, env: indexEnv });
    const add = (name, blob) =>
      git(['update-index', '--add', '--cacheinfo', `100644,${blob},${name}`], { cwd: repoRoot, env: indexEnv });

    for (const name of PAGES_ONLY) {
      const blob = gitMaybe(['rev-parse', `${tip}:${name}`], { cwd: repoRoot });
      if (blob) add(name, blob);
    }
    for (const entry of fs.readdirSync(PAGES_DIR, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      // Hash through the file's own path so .gitattributes/autocrlf apply exactly
      // as "git add" would; hashing raw bytes would rewrite every CRLF file.
      const repoPath = path.relative(repoRoot, path.join(PAGES_DIR, entry.name)).split(path.sep).join('/');
      add(entry.name, git(['hash-object', '-w', repoPath], { cwd: repoRoot }));
    }
    tree = git(['write-tree'], { cwd: repoRoot, env: indexEnv });
  } finally {
    fs.rmSync(indexFile, { force: true });
  }

  if (tree === tipTree) {
    console.log(`Pages branch ${BRANCH} already matches quoteflow/pages (${tip.slice(0, 7)}); nothing to publish.`);
    return;
  }

  const changes = git(['diff-tree', '-r', '--name-status', tipTree, tree], { cwd: repoRoot })
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, name] = line.split('\t');
      return `${status === 'D' ? 'removed' : status === 'A' ? 'added' : 'updated'} ${name}`;
    })
    .join(', ');
  console.log(`Changed: ${changes}`);

  if (dryRun) {
    console.log(`Dry run: ${BRANCH} at ${tip.slice(0, 7)} would be replaced; nothing pushed.`);
    return;
  }

  const commit = git(
    [
      'commit-tree',
      tree,
      '-p',
      tip,
      '-m',
      'Publish QuoteFlow Pages build',
      '-m',
      `Copied from quoteflow/public: ${ASSETS.join(', ')}\n${changes}`
    ],
    { cwd: repoRoot }
  );
  git(['push', REMOTE, `${commit}:refs/heads/${BRANCH}`], { cwd: repoRoot });
  console.log(`Published ${commit.slice(0, 7)} to ${BRANCH}. Pages rebuilds in about 15 s: https://wb-dt.github.io/TS/`);
}

function main() {
  const args = new Set(process.argv.slice(2));
  console.log('Syncing static Pages assets from public/');
  const copied = copyAssets();

  if (args.has('--copy-only')) {
    console.log(copied ? 'pages/ updated; run "npm run pages:publish" to publish it.' : 'pages/ already matches public/.');
    return;
  }

  publish({ dryRun: args.has('--dry-run') });
}

try {
  main();
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
}
