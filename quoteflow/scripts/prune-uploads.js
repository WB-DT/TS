#!/usr/bin/env node
'use strict';

/**
 * Stops the uploads folder from growing forever.
 *
 * Every file a quote owns is listed in quote_files.storage_key. Anything else in
 * uploads/quotes is left over from a failed upload, a removed file, or an older
 * version of the app, and nothing will ever read it again. This lists those files
 * and, with --delete, removes the ones older than the retention window.
 *
 *   node scripts/prune-uploads.js                list what would be removed
 *   node scripts/prune-uploads.js --delete       remove it
 *   node scripts/prune-uploads.js --days 30      override UPLOAD_RETENTION_DAYS
 *   node scripts/prune-uploads.js --delete --days 0
 *                                               everything unreferenced, however new
 *
 * The default is dry-run: nothing is deleted without --delete.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const database = require('../db');
const { config } = require('../config');

const QUOTES_DIR = path.join(__dirname, '..', 'uploads', 'quotes');

function daysArgument() {
  const index = process.argv.indexOf('--days');
  if (index === -1) return config.uploads.retentionDays;
  const days = Number.parseInt(process.argv[index + 1], 10);
  // 0 means "no age floor": every file with no database row, including today's.
  // That is for cleaning up after a test run or a bad import, not for a live folder
  // where an upload's row may still be committing.
  if (!Number.isFinite(days) || days < 0) throw new Error('--days needs a whole number of days, for example --days 30 (0 for no age floor).');
  return days;
}

async function main() {
  const remove = new Set(process.argv.slice(2)).has('--delete');
  const retentionDays = daysArgument();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  await database.initialize();
  const referenced = new Set(await database.connection('quote_files').whereNotNull('storage_key').pluck('storage_key'));

  let names = [];
  try {
    names = await fs.readdir(QUOTES_DIR);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.log(`No uploads folder at ${path.relative(process.cwd(), QUOTES_DIR)}; nothing to prune.`);
  }

  const orphans = [];
  let kept = 0;
  for (const name of names) {
    const filePath = path.join(QUOTES_DIR, name);
    const repoPath = `uploads/quotes/${name}`;
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || referenced.has(repoPath)) continue;
    if (stat.mtimeMs > cutoff) {
      kept += 1;
      continue;
    }
    orphans.push({ name, bytes: stat.size, ageDays: Math.floor((Date.now() - stat.mtimeMs) / 86400000) });
  }

  const bytes = orphans.reduce((total, file) => total + file.bytes, 0);
  for (const file of orphans) {
    console.log(`  ${remove ? 'removing' : 'would remove'} ${file.name} (${(file.bytes / 1024).toFixed(0)} KB, ${file.ageDays} days old)`);
    if (remove) await fs.rm(path.join(QUOTES_DIR, file.name), { force: true });
  }

  console.log(
    `${orphans.length} unreferenced file${orphans.length === 1 ? '' : 's'} older than ${retentionDays} days` +
      ` (${(bytes / 1024 / 1024).toFixed(2)} MB); ${kept} unreferenced file${kept === 1 ? '' : 's'} still inside the window.`,
  );
  if (!remove && orphans.length) console.log('Nothing was deleted. Run again with --delete to remove them.');
  await database.shutdown();
}

main().catch(async (error) => {
  console.error(`Upload pruning failed: ${error.message}`);
  process.exitCode = 1;
  await database.shutdown().catch(() => {});
});
