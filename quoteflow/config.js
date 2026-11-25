'use strict';

/**
 * One place where environment variables become settings.
 *
 * The Dataverse identity below is the client's org and app registration. Those
 * values are public identifiers, not secrets, and they ship as defaults so a new
 * checkout runs against the right tenant; every one of them can be overridden with
 * the environment variable named next to it. Secrets (session secret, Azure keys,
 * SQL password) have no defaults.
 *
 * config.validate() lists what is missing or wrong. In production a missing secret
 * stops the server instead of silently signing everyone with a random key.
 */

require('dotenv').config();

const path = require('node:path');

function text(name, fallback = '') {
  const value = process.env[name];
  return value === undefined ? fallback : String(value).trim();
}

function integer(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(process.env[name], 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const env = text('NODE_ENV', 'development');
const isProduction = env === 'production';

const config = {
  env,
  isProduction,
  port: integer('PORT', 3000, { min: 1, max: 65535 }),
  appOrigin: text('APP_ORIGIN').replace(/\/+$/, ''),
  sessionSecret: text('SESSION_SECRET'),
  managerEmails: text('MANAGER_EMAILS'),
  seedDemoData: text('SEED_DEMO_DATA') === 'true',

  dataverse: {
    url: text('DATAVERSE_URL', 'https://org23279050.crm.dynamics.com').replace(/\/+$/, ''),
    tenantId: text('AZURE_TENANT_ID', '9a7c474b-f702-4ae4-a2f9-b72a1e117401'),
    clientId: text('AZURE_CLIENT_ID', 'afe649b6-9c70-4b1a-8592-78588284c8ee'),
  },

  azureDocumentIntelligence: {
    endpoint: text('AZURE_DI_ENDPOINT'),
    key: text('AZURE_DI_KEY'),
  },

  uploads: {
    // Files with no database row are removed by `npm run uploads:prune` after this many days.
    retentionDays: integer('UPLOAD_RETENTION_DAYS', 90, { min: 1, max: 3650 }),
    directory: path.join(__dirname, 'uploads'),
  },

  logging: {
    level: text('LOG_LEVEL', 'info'),
    format: text('LOG_FORMAT', isProduction ? 'json' : 'text'),
  },
};

/** Everything that would stop the app from being configured correctly. */
function problems() {
  const list = [];
  if (isProduction && (!config.sessionSecret || config.sessionSecret.length < 32)) {
    list.push('SESSION_SECRET must be set to at least 32 characters in production; otherwise every restart signs everyone out.');
  }
  if (isProduction && !config.appOrigin) {
    list.push('APP_ORIGIN must be set in production so the Microsoft sign-in redirect points at the real origin.');
  }
  if (!config.azureDocumentIntelligence.endpoint || !config.azureDocumentIntelligence.key) {
    list.push('AZURE_DI_ENDPOINT and AZURE_DI_KEY are not set, so document extraction is unavailable until they are.');
  }
  return list;
}

/**
 * Startup check. Missing production secrets throw; optional-feature gaps are
 * returned so the caller can log them as warnings.
 */
function validate() {
  const list = problems();
  const fatal = isProduction
    ? list.filter((problem) => !problem.includes('AZURE_DI_'))
    : [];
  if (fatal.length) {
    const error = new Error(`Configuration is incomplete:\n  - ${fatal.join('\n  - ')}`);
    error.status = 78; // EX_CONFIG
    throw error;
  }
  return list;
}

module.exports = { config, validate, problems };
