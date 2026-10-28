/**
 * ACT CRM Stage 1
 * API boundary
 *
 * Purpose:
 * - Translate application events into approved API requests
 * - Keep authentication, transport, validation, and error handling out of UI components
 * - Prevent mock data, guessed endpoints, and browser-side credential storage
 *
 * Important:
 * - No Dataverse URL is hard-coded here.
 * - No client secret, access token, or CRM record is stored in localStorage.
 * - Write operations are disabled until an approved endpoint explicitly enables them.
 */

const APP_EVENT_PREFIX = "act:";
const DEFAULT_TIMEOUT_MS = 15000;

const apiConfig = Object.freeze({
  baseUrl: readMetaContent("act-api-base-url"),
  csrfToken: readMetaContent("act-csrf-token"),
  allowWrites: readMetaContent("act-api-allow-writes") === "true",
  timeoutMs: DEFAULT_TIMEOUT_MS
});

let apiInitialized = false;
let activeSearchController = null;

function readMetaContent(name) {
  return document.querySelector(`meta[name="${name}"]`)?.content?.trim() || "";
}

function dispatch(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}${name}`, { detail }));
}

function createApiError(code, message, status = 0) {
  const error = new Error(message);
  error.name = "ApiError";
  error.code = code;
  error.status = status;
  return error;
}

function requireConfiguration() {
  if (!apiConfig.baseUrl) {
    throw createApiError(
      "API_NOT_CONFIGURED",
      "The approved CRM API endpoint has not been configured."
    );
  }
}

function buildUrl(path, query = {}) {
  requireConfiguration();

  const base = apiConfig.baseUrl.endsWith("/")
    ? apiConfig.baseUrl
    : `${apiConfig.baseUrl}/`;
  const url = new URL(path.replace(/^\//, ""), base);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function request(path, options = {}) {
  const {
    method = "GET",
    query,
    body,
    signal,
    timeoutMs = apiConfig.timeoutMs
  } = options;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort("timeout"), timeoutMs);
  const abortFromCaller = () => controller.abort(signal?.reason || "cancelled");

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason || "cancelled");
    } else {
      signal.addEventListener("abort", abortFromCaller, { once: true });
    }
  }

  const headers = new Headers({
    Accept: "application/json"
  });

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (apiConfig.csrfToken) {
    headers.set("X-CSRF-Token", apiConfig.csrfToken);
  }

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal
    });

    if (!response.ok) {
      throw createApiError(
        `HTTP_${response.status}`,
        "The CRM service could not complete the request.",
        response.status
      );
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw createApiError(
        "INVALID_RESPONSE",
        "The CRM service returned an unsupported response."
      );
    }

    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createApiError(
        "REQUEST_CANCELLED",
        "The CRM request was cancelled or timed out."
      );
    }

    if (error?.name === "ApiError") {
      throw error;
    }

    throw createApiError(
      "NETWORK_ERROR",
      "The CRM service is currently unavailable."
    );
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

function safeErrorDetail(error, context = {}) {
  return {
    ...context,
    code: error?.code || "UNKNOWN_ERROR",
    message: error?.message || "The request could not be completed.",
    status: Number.isInteger(error?.status) ? error.status : 0
  };
}

async function handleAccountSearch(event) {
  const requestId = String(event.detail?.requestId || "");
  const searchTerm = String(event.detail?.searchTerm || "").trim();

  if (!requestId || !searchTerm) {
    return;
  }

  activeSearchController?.abort("superseded");
  activeSearchController = new AbortController();

  try {
    const payload = await request("accounts/search", {
      query: { q: searchTerm },
      signal: activeSearchController.signal
    });

    dispatch("account-search-api-succeeded", {
      requestId,
      accounts: Array.isArray(payload?.accounts) ? payload.accounts : []
    });
  } catch (error) {
    if (error?.code === "REQUEST_CANCELLED") {
      return;
    }
    dispatch("account-search-api-failed", safeErrorDetail(error, { requestId }));
  }
}

async function handleAccountLoad(event) {
  const accountId = String(event.detail?.accountId || "").trim();
  if (!accountId) {
    return;
  }

  try {
    const account = await request(`accounts/${encodeURIComponent(accountId)}`);
    dispatch("account-load-succeeded", { accountId, account });
  } catch (error) {
    dispatch("account-load-failed", safeErrorDetail(error, { accountId }));
  }
}

async function handleCommunicationSubmit(event) {
  const communication = event.detail?.communication;
  if (!communication?.accountId) {
    return;
  }

  if (!apiConfig.allowWrites) {
    dispatch("communication-api-submit-failed", {
      code: "WRITES_DISABLED",
      message: "Communication saving has not been enabled for this environment.",
      status: 0
    });
    return;
  }

  try {
    const savedCommunication = await request("communications", {
      method: "POST",
      body: communication
    });
    dispatch("communication-api-submit-succeeded", { communication: savedCommunication });
  } catch (error) {
    dispatch("communication-api-submit-failed", safeErrorDetail(error));
  }
}

async function handleFollowUpCompletion(event) {
  const followUpId = String(event.detail?.followUpId || "").trim();
  if (!followUpId) {
    return;
  }

  if (!apiConfig.allowWrites) {
    dispatch("follow-up-api-completion-failed", {
      followUpId,
      code: "WRITES_DISABLED",
      message: "Follow-up changes have not been enabled for this environment.",
      status: 0
    });
    return;
  }

  try {
    const followUp = await request(
      `follow-ups/${encodeURIComponent(followUpId)}/complete`,
      { method: "POST", body: {} }
    );
    dispatch("follow-up-api-completion-succeeded", { followUpId, followUp });
  } catch (error) {
    dispatch(
      "follow-up-api-completion-failed",
      safeErrorDetail(error, { followUpId })
    );
  }
}

export function initializeApi() {
  if (apiInitialized) {
    return;
  }

  apiInitialized = true;
  document.addEventListener(
    `${APP_EVENT_PREFIX}account-search-api-requested`,
    handleAccountSearch
  );
  document.addEventListener(
    `${APP_EVENT_PREFIX}account-load-requested`,
    handleAccountLoad
  );
  document.addEventListener(
    `${APP_EVENT_PREFIX}communication-api-submit-requested`,
    handleCommunicationSubmit
  );
  document.addEventListener(
    `${APP_EVENT_PREFIX}follow-up-api-completion-requested`,
    handleFollowUpCompletion
  );

  dispatch("api-ready", {
    configured: Boolean(apiConfig.baseUrl),
    writesEnabled: apiConfig.allowWrites
  });
}

export function getApiStatus() {
  return Object.freeze({
    configured: Boolean(apiConfig.baseUrl),
    writesEnabled: apiConfig.allowWrites
  });
}
