'use strict';

/**
 * Structured logging with request ids.
 *
 * One line per event, so a failed Dataverse sync can be traced from the browser's
 * X-Request-Id header to the exact log line. LOG_FORMAT=json emits one JSON object
 * per line for a log collector; the default text format stays readable in a terminal.
 * LOG_LEVEL=error silences everything below error.
 */

const { randomUUID } = require('node:crypto');
const { config } = require('./config');

const LEVELS = { error: 0, warn: 1, info: 2 };
const threshold = LEVELS[config.logging.level] ?? LEVELS.info;
const asJson = config.logging.format === 'json';
const useColor = !asJson && process.stdout.isTTY;

const COLORS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m' };
const RESET = '\x1b[0m';

function detail(fields) {
  const pairs = Object.entries(fields || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!pairs.length) return '';
  return ` ${pairs.map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`).join(' ')}`;
}

function write(level, message, fields = {}) {
  if ((LEVELS[level] ?? LEVELS.info) > threshold) return;
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), level, message, ...fields })}\n`);
    return;
  }
  const label = `${COLORS[level] || ''}${level.toUpperCase().padEnd(5)}${useColor ? RESET : ''}`;
  const line = `${label} ${message}${detail(fields)}`;
  if (level === 'error') console.error(line);
  else console.log(line);
}

const logger = {
  info: (message, fields) => write('info', message, fields),
  warn: (message, fields) => write('warn', message, fields),
  error: (message, fields) => write('error', message, fields),
  /** Logs an Error with its type and, outside production, its stack. */
  exception: (message, error, fields = {}) => {
    write('error', message, {
      ...fields,
      error: error?.message || String(error || 'unknown error'),
      ...(config.isProduction ? {} : { stack: error?.stack }),
    });
  },
};

/** Gives every request an id, echoes it, and logs one line when the response finishes. */
function requestLogger(request, response, next) {
  const incoming = String(request.get('x-request-id') || '').trim();
  request.id = /^[A-Za-z0-9._-]{1,64}$/.test(incoming) ? incoming : randomUUID();
  response.set('X-Request-Id', request.id);
  const started = process.hrtime.bigint();

  response.on('finish', () => {
    const milliseconds = Number(process.hrtime.bigint() - started) / 1e6;
    const level = response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info';
    write(level, 'request', {
      id: request.id,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      ms: Math.round(milliseconds),
      user: request.session?.user?.email,
    });
  });

  next();
}

module.exports = { logger, requestLogger };
