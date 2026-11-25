'use strict';

/**
 * A session store backed by the app's own database.
 *
 * express-session's default MemoryStore loses every sign-in when the process
 * restarts and leaks in a multi-process setup. Sessions here live in the
 * `sessions` table (db/migrations/017_sessions.js) next to the rest of the data,
 * so a restart keeps people signed in and the store survives more than one process.
 *
 * The store talks to knex, so it works with both SQLite and Azure SQL.
 */

const { Store } = require('express-session');

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // matches the cookie lifetime in auth.js
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

class KnexSessionStore extends Store {
  constructor({ knex, ttlMs = DEFAULT_TTL_MS }) {
    super();
    this.knex = knex;
    this.ttlMs = ttlMs;
    this.lastCleanup = 0;
  }

  /** Sessions expire with the cookie; a session without an expiry gets the default lifetime. */
  expiryFor(session) {
    const expires = session?.cookie?.expires;
    const when = expires ? new Date(expires).getTime() : Date.now() + this.ttlMs;
    return Number.isFinite(when) ? when : Date.now() + this.ttlMs;
  }

  get(sid, callback) {
    this.knex('sessions')
      .where({ id: sid })
      .first()
      .then((row) => {
        if (!row) return callback(null, null);
        if (Number(row.expires) <= Date.now()) {
          return this.destroy(sid, () => callback(null, null));
        }
        let session;
        try {
          session = JSON.parse(row.sess);
        } catch {
          return callback(null, null);
        }
        return callback(null, session);
      })
      .catch((error) => callback(error));
  }

  set(sid, session, callback = () => {}) {
    const row = { id: sid, sess: JSON.stringify(session), expires: this.expiryFor(session) };
    // Update, then insert when the row is new. An upsert would be shorter, but knex
    // cannot express onConflict on Azure SQL, and the app runs on both dialects.
    this.knex
      .transaction(async (trx) => {
        const updated = await trx('sessions').where({ id: sid }).update({ sess: row.sess, expires: row.expires });
        if (!updated) await trx('sessions').insert(row);
      })
      .then(() => {
        this.cleanupExpired();
        callback(null);
      })
      .catch((error) => callback(error));
  }

  touch(sid, session, callback = () => {}) {
    this.knex('sessions')
      .where({ id: sid })
      .update({ expires: this.expiryFor(session) })
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  destroy(sid, callback = () => {}) {
    this.knex('sessions')
      .where({ id: sid })
      .del()
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  /** Expired rows are dropped in the background, at most once per interval. */
  cleanupExpired() {
    const now = Date.now();
    if (now - this.lastCleanup < CLEANUP_INTERVAL_MS) return;
    this.lastCleanup = now;
    this.knex('sessions')
      .where('expires', '<=', now)
      .del()
      .catch((error) => console.error('Session cleanup failed:', error.message));
  }
}

module.exports = { KnexSessionStore };
