// Microsoft Dataverse (OData v4.0) access for QuoteFlow.
//
// Sign-in happens in the browser through MSAL (@azure/msal-browser), exactly like the
// original single-page QuoteFlow did: authorization code + PKCE, token for
// <dataverse url>/user_impersonation. The browser then hands that token to the server
// (see dataverse-auth.js), this module keeps it in the session, and every OData call
// below runs as that person - so Dataverse security roles still decide what is visible.
//
// [Dataverse map] cr714_quotelog  -> Quote Log  (QuoteFlow "Quote Log" tab + dashboards)
// [Dataverse map] cr714_mdmlog    -> MDM Log    (QuoteFlow "MDM Log" tab)
// Both mirrors keep the client's exact table and column names, so a field in the app
// can always be traced back to Dataverse without a translation table. Anything that is
// QuoteFlow-only is marked "QuoteFlow-only" in the UI code. See docs/dataverse-mapping.md.
const { LOGS, rowHash } = require("./dataverse-logs");
const database = require("./db");

// Public client ids are not secrets: these are the same org and application the
// original QuoteFlow SPA shipped with. Override with environment variables.
const DEFAULTS = {
  baseUrl: "https://org23279050.crm.dynamics.com",
  tenantId: "9a7c474b-f702-4ae4-a2f9-b72a1e117401",
  clientId: "afe649b6-9c70-4b1a-8592-78588284c8ee",
};

const ANNOTATION = "@OData.Community.Display.V1.FormattedValue";
// Hard budget for one sync, so a huge or slow table can never read (or wait) forever.
// The whole table is read before anything is written, so a read that exceeds the
// budget fails without touching the mirror tables.
const MAX_PAGES = 200; // upper bound on paging, whatever the row limit says
const DEFAULT_MAX_ROWS = 20000; // per log, per sync (DATAVERSE_SYNC_MAX_ROWS)
const DEFAULT_TIMEOUT_MS = 120000; // whole sync (DATAVERSE_SYNC_TIMEOUT_MS)
const REQUEST_TIMEOUT_MS = 45000; // one OData request, so a hung connection fails

function syncLimits() {
  const maxRows = Number.parseInt(process.env.DATAVERSE_SYNC_MAX_ROWS, 10);
  const timeoutMs = Number.parseInt(process.env.DATAVERSE_SYNC_TIMEOUT_MS, 10);
  return {
    maxRows: Number.isFinite(maxRows) && maxRows > 0 ? Math.min(maxRows, 500000) : DEFAULT_MAX_ROWS,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 15 * 60 * 1000) : DEFAULT_TIMEOUT_MS,
  };
}

function requestSignal() {
  return typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined;
}

class DataverseError extends Error {
  constructor(message, status = 500, code = "dataverse-error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function config() {
  return {
    baseUrl: String(process.env.DATAVERSE_URL || DEFAULTS.baseUrl).replace(/\/+$/, ""),
    tenantId: String(process.env.AZURE_TENANT_ID || DEFAULTS.tenantId),
    clientId: String(process.env.AZURE_CLIENT_ID || DEFAULTS.clientId),
  };
}

function isConfigured() {
  const { tenantId, clientId } = config();
  return Boolean(tenantId && clientId);
}

function sessionToken(session) {
  return String(session?.dataverse?.accessToken || "");
}

function signedIn(session) {
  return Boolean(sessionToken(session));
}

// One OData call. `path` is relative to the org url unless it is already absolute
// (Dataverse's @odata.nextLink is absolute, so paging works unchanged).
async function odata(session, path, options = {}) {
  const token = sessionToken(session);
  if (!token) {
    throw new DataverseError("Sign in with Microsoft to read Dataverse.", 401, "dataverse-signin-required");
  }
  const { baseUrl } = config();
  const url = /^https?:/i.test(path) ? path : `${baseUrl}${path}`;
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal || requestSignal(),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: `odata.include-annotations="*",odata.maxpagesize=5000`,
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new DataverseError(`Dataverse could not be reached (${error.message}).`, 502, "dataverse-unreachable");
  }
  if (response.status === 401) {
    // The browser holds the refresh token; the page re-acquires a token and retries.
    throw new DataverseError("The Dataverse sign-in expired. Sign in with Microsoft again.", 401, "dataverse-token-expired");
  }
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      detail = body?.error?.message || detail;
    } catch {
      /* Dataverse did not send JSON; keep the status line. */
    }
    throw new DataverseError(`Dataverse said: ${detail}`, response.status, "dataverse-error");
  }
  if (response.status === 204) return {};
  return response.json();
}

// Every page of a query, following @odata.nextLink, inside a hard budget.
// Exceeding the budget throws instead of returning a short list: the sync treats the
// fetched rows as the whole table and would otherwise delete everything it missed.
async function queryAll(session, path, budget = {}) {
  const limits = { ...syncLimits(), ...budget };
  const deadline = Date.now() + limits.timeoutMs;
  const rows = [];
  let next = path;
  for (let page = 0; next; page += 1) {
    if (page >= MAX_PAGES) {
      throw new DataverseError(
        `That Dataverse table needs more than ${MAX_PAGES} pages. Narrow the view or raise DATAVERSE_SYNC_MAX_ROWS.`,
        413,
        "dataverse-too-large",
      );
    }
    if (Date.now() > deadline) {
      throw new DataverseError(
        `The Dataverse read did not finish within ${Math.round(limits.timeoutMs / 1000)}s. It stopped with nothing changed; try again or raise DATAVERSE_SYNC_TIMEOUT_MS.`,
        504,
        "dataverse-timeout",
      );
    }
    const payload = await odata(session, next);
    if (Array.isArray(payload.value)) rows.push(...payload.value);
    if (rows.length > limits.maxRows) {
      throw new DataverseError(
        `That Dataverse table has more than ${limits.maxRows} rows, which is this sync's limit. Nothing was changed. Raise DATAVERSE_SYNC_MAX_ROWS to pull it all.`,
        413,
        "dataverse-too-large",
      );
    }
    next = payload["@odata.nextLink"] || null;
  }
  return rows;
}

const entitySets = new Map();
async function entitySetFor(session, logicalName) {
  if (entitySets.has(logicalName)) return entitySets.get(logicalName);
  const definition = await odata(
    session,
    `/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')?$select=EntitySetName`,
  );
  const name = definition?.EntitySetName;
  if (!name) {
    throw new DataverseError(`Dataverse has no table called ${logicalName}. Check the table name in your environment.`, 404, "dataverse-table-missing");
  }
  entitySets.set(logicalName, name);
  return name;
}

// Reads one attribute the way the client's Dataverse export flattens it.
// Order matters: choice/boolean labels first, then lookup display names, then the raw
// value (so money stays a number the dashboards can add up), then a formatted label.
function pick(row, column) {
  const labelled = row[`${column}name`];
  if (labelled !== undefined && labelled !== null) {
    return row[`${column}name${ANNOTATION}`] ?? labelled;
  }
  const lookup = row[`_${column}_value`];
  if (lookup !== undefined && lookup !== null) {
    return row[`_${column}_value${ANNOTATION}`] ?? lookup;
  }
  const direct = row[column];
  if (direct !== undefined && direct !== null) return direct;
  const annotated = row[`${column}${ANNOTATION}`];
  if (annotated !== undefined && annotated !== null) return annotated;
  return null;
}

// Mirrors store text, exactly like the .xlsx import did.
function text(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const raw = String(value).trim();
  return raw === "" ? null : raw;
}

// [Dataverse map] one Dataverse row -> one mirror row with the same column names.
function normalize(logKey, row) {
  const log = LOGS[logKey];
  const record = { [log.idColumn]: String(row[log.idColumn] || "").toLowerCase() };
  for (const column of log.columns) record[column] = text(pick(row, column));
  return record;
}

async function fetchFromDataverse(session, logKey) {
  const log = LOGS[logKey];
  const entitySet = await entitySetFor(session, log.table);
  // No $select on purpose: the export column lists include virtual/annotation
  // attributes (createdbyname, file columns) that Dataverse refuses to select,
  // and a full read keeps the mirror identical to the table itself.
  const rows = await queryAll(session, `/api/data/v9.2/${entitySet}`, syncLimits());
  const records = [];
  const seen = new Set();
  for (const row of rows) {
    const record = normalize(logKey, row);
    if (!record[log.idColumn] || seen.has(record[log.idColumn])) continue;
    seen.add(record[log.idColumn]);
    record.qf_row_hash = rowHash(record, log.columns);
    records.push(record);
  }
  return { entitySet, records };
}

// Pulls one log into its mirror table. Dataverse is the source of truth, so rows
// deleted there are removed here too (unlike the .xlsx import, which only adds).
async function syncLog(session, logKey) {
  const log = LOGS[logKey];
  const { entitySet, records } = await fetchFromDataverse(session, logKey);
  const existing = new Map(
    (await database.connection(log.table).select(log.idColumn, "qf_row_hash")).map((row) => [row[log.idColumn], row.qf_row_hash]),
  );
  const now = Math.floor(Date.now() / 1000);
  const live = new Set(records.map((record) => record[log.idColumn]));
  const toInsert = [];
  const toUpdate = [];
  for (const record of records) {
    const savedHash = existing.get(record[log.idColumn]);
    if (savedHash === undefined) toInsert.push({ ...record, qf_imported_at: now });
    else if (savedHash !== record.qf_row_hash) toUpdate.push({ ...record, qf_imported_at: now });
  }
  const removed = [...existing.keys()].filter((id) => !live.has(id));
  await database.connection.transaction(async (trx) => {
    for (let start = 0; start < toInsert.length; start += 25) {
      await trx(log.table).insert(toInsert.slice(start, start + 25));
    }
    for (const record of toUpdate) {
      const { [log.idColumn]: id, ...changes } = record;
      await trx(log.table).where(log.idColumn, id).update(changes);
    }
    for (let start = 0; start < removed.length; start += 100) {
      await trx(log.table).whereIn(log.idColumn, removed.slice(start, start + 100)).del();
    }
  });
  return {
    log: log.label,
    table: log.table,
    entitySet,
    fetched: records.length,
    added: toInsert.length,
    updated: toUpdate.length,
    unchanged: records.length - toInsert.length - toUpdate.length,
    removed: removed.length,
  };
}

// Last sync per person: the mirror is shared, but "when did this user refresh it"
// belongs to the session so two people do not hammer Dataverse.
const syncState = new Map();
function syncKey(session) {
  return String(session?.user?.id || session?.dataverse?.email || "anonymous");
}
function lastSync(session) {
  return syncState.get(syncKey(session)) || null;
}

// One sync per person at a time: two page loads must not both pull the whole org.
const syncInFlight = new Map();

async function sync(session) {
  const key = syncKey(session);
  if (syncInFlight.has(key)) return syncInFlight.get(key);
  const run = (async () => {
    const summary = [];
    for (const logKey of Object.keys(LOGS)) summary.push(await syncLog(session, logKey));
    const state = { at: Date.now(), summary };
    syncState.set(key, state);
    return state;
  })();
  syncInFlight.set(key, run);
  try {
    return await run;
  } finally {
    syncInFlight.delete(key);
  }
}

async function syncIfStale(session, maxAgeMs = 5 * 60 * 1000) {
  const state = syncState.get(syncKey(session));
  if (!state || Date.now() - state.at > maxAgeMs) return sync(session);
  return state;
}

// WhoAmI -> the signed-in person's work email, used to match a QuoteFlow account.
async function identify(session) {
  const who = await odata(session, "/api/data/v9.2/WhoAmI");
  const userId = who?.UserId;
  if (!userId) throw new DataverseError("Dataverse did not recognise that sign-in.", 401, "dataverse-signin-required");
  const user = await odata(
    session,
    `/api/data/v9.2/systemusers(${userId})?$select=domainname,fullname,internalemailaddress,isdisabled`,
  );
  const email = String(user?.internalemailaddress || user?.domainname || "").trim().toLowerCase();
  return { userId, email, name: user?.fullname || email };
}

// Write-back: the original SPA's "Save to Dataverse" for an assignment.
// [Dataverse map] cr714_quotelog.cr714_assignedto + cr714_dateassigned.
async function assignQuoteLog(session, id, assignedTo) {
  const entitySet = await entitySetFor(session, "cr714_quotelog");
  const dateAssigned = new Date().toISOString();
  await odata(session, `/api/data/v9.2/${entitySet}(${id})`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "If-Match": "*" },
    body: JSON.stringify({ cr714_assignedto: assignedTo || null, cr714_dateassigned: dateAssigned }),
  });
  // Keep the mirror in step so the page shows the change without waiting for a sync.
  await database
    .connection("cr714_quotelog")
    .where("cr714_quotelogid", String(id).toLowerCase())
    .update({ cr714_assignedto: assignedTo || null, cr714_dateassigned: dateAssigned });
  return { assignedTo: assignedTo || null, dateAssigned };
}

function status(session) {
  const { baseUrl } = config();
  const state = lastSync(session);
  return {
    configured: isConfigured(),
    signedIn: signedIn(session),
    baseUrl,
    email: session?.dataverse?.email || null,
    lastSyncAt: state?.at || null,
    lastSync: state?.summary || null,
    limits: syncLimits(),
    tables: Object.fromEntries(
      Object.entries(LOGS).map(([key, log]) => [key, { label: log.label, table: log.table, idColumn: log.idColumn }]),
    ),
  };
}

module.exports = {
  DataverseError,
  LOGS,
  assignQuoteLog,
  config,
  identify,
  isConfigured,
  lastSync,
  odata,
  queryAll,
  signedIn,
  status,
  sync,
  syncIfStale,
  syncLimits,
};
