#!/usr/bin/env node
'use strict';

/**
 * Rebuilds the local demo database from scratch.
 *
 * Migrations and the demo seed make the database reproducible, but a demo that has
 * been clicked through no longer matches them. This deletes the SQLite file, runs
 * every migration and seeds the demo people, quotes and sample files again.
 *
 *   node scripts/reset-demo.js          explains what it would do
 *   node scripts/reset-demo.js --yes    actually deletes and rebuilds
 *
 * It refuses to run against Azure SQL (DB_CLIENT=mssql) and it only ever touches
 * the SQLite file named by SQLITE_PATH (db/quotes.sqlite by default).
 */

process.env.SEED_DEMO_DATA = 'true'; // the rebuild is meant to contain the demo workspace

const fs = require('node:fs');
const path = require('node:path');
const configuration = require('../db/config');

async function main() {
  const confirmed = new Set(process.argv.slice(2)).has('--yes');

  if (configuration.client !== 'better-sqlite3') {
    throw new Error('This only rebuilds the local SQLite demo database; DB_CLIENT is not better-sqlite3.');
  }
  const filename = configuration.connection.filename;
  const files = [filename, `${filename}-shm`, `${filename}-wal`].filter((file) => fs.existsSync(file));

  if (!files.length) console.log(`No database at ${filename}; the next start creates and seeds one.`);
  for (const file of files) console.log(`  ${confirmed ? 'deleting' : 'would delete'} ${path.relative(process.cwd(), file)}`);

  if (!confirmed) {
    console.log('Nothing was deleted. Run again with --yes to rebuild the demo database.');
    return;
  }

  for (const file of files) fs.rmSync(file, { force: true });

  const database = require('../db');
  try {
    await database.initialize();
    const [quotes, users] = await Promise.all([
      database.connection('quotes').count({ count: 'id' }).first(),
      database.connection('users').count({ count: 'id' }).first(),
    ]);
    console.log(`Demo database rebuilt: ${Number(users.count)} users, ${Number(quotes.count)} quotes.`);
    console.log('Sign in with manager@demo.com / demo, or quoter1@demo.com / demo.');
  } finally {
    await database.shutdown();
  }
}

main().catch((error) => {
  console.error(`Demo reset failed: ${error.message}`);
  process.exitCode = 1;
});
