/**
 * ACT CRM Stage 1
 * Application entry point
 * Midnight Calm Design System v2.0 alignment
 *
 * Responsibilities:
 * - Apply safe user-interface preferences before component startup
 * - Start the application
 * - Initialize approved Stage 1 interface components
 * - Coordinate application-level events
 * - Coordinate global keyboard, connectivity, and page-visibility events
 *
 * This file must not:
 * - Contain component rendering logic
 * - Store CRM records or sensitive account data
 * - Determine user authorization
 * - Calculate communication metrics
 * - Invent API responses or optimistic save results
 */
import {
  initializeAppShell,
  announceStatus
} from "./components/app-shell.js";
import {
  initializeAccountSearch
} from "./components/account-search.js";
import {
  initializeAccountHeader
} from "./components/account-header.js";
import {
  initializeCommunicationOverview
} from "./components/communication-overview.js";
import {
  initializeCommunicationForm
} from "./components/communication-form.js";
import {
  initializeCommunicationHistory
} from "./components/communication-history.js";
import {
  initializeFollowUpList
} from "./components/follow-up-list.js";
import {
  getState,
  updateState
} from "./state.js";

const APP_EVENT_PREFIX = "act:";
const COLOR_MODE_KEY = "color-mode";
const DENSITY_KEY = "density";
const SIDEBAR_KEY = "sidebar-collapsed";
const VALID_COLOR_MODES = new Set(["light", "dark", "system"]);
const VALID_DENSITIES = new Set(["comfortable", "compact", "touch"]);

let applicationInitialized = false;
let searchRequestSequence = 0;

/**
 * Reads a presentation-only preference.
 * Storage may be unavailable in private, restricted, or embedded contexts.
 */
function readPreference(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("UI preference storage is unavailable.", {
      key,
      errorName: error?.name || "UnknownError"
    });
    return null;
  }
}

/**
 * Resolves the effective light/dark theme while preserving "system" as the
 * user's preference. Components consume semantic CSS tokens only.
 */
function resolveColorMode(preference) {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Applies document-level Midnight Calm preferences before components render.
 */
function applyInterfacePreferences() {
  const root = document.documentElement;
  const storedColorMode = readPreference(COLOR_MODE_KEY);
  const colorMode = VALID_COLOR_MODES.has(storedColorMode)
    ? storedColorMode
    : "system";
  const storedDensity = readPreference(DENSITY_KEY);
  const storedSidebarState = readPreference(SIDEBAR_KEY);
  const isTouchLayout = window.matchMedia?.("(max-width: 1279px)").matches;
  const density = isTouchLayout
    ? "touch"
    : VALID_DENSITIES.has(storedDensity)
      ? storedDensity
      : "comfortable";

  root.dataset.theme = resolveColorMode(colorMode);
  root.dataset.colorMode = colorMode;
  root.dataset.density = density;
  root.dataset.connection = navigator.onLine ? "online" : "offline";

  if (storedSidebarState === "true" || storedSidebarState === "false") {
    root.dataset.sidebarCollapsed = storedSidebarState;
  }
}

/**
 * Keeps a System theme synchronized when the operating-system preference
 * changes. Explicit Light and Dark choices are never overwritten.
 */
function registerThemePreferenceListener() {
  const colorScheme = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!colorScheme) {
    return;
  }

  colorScheme.addEventListener("change", () => {
    if (document.documentElement.dataset.colorMode !== "system") {
      return;
    }

    document.documentElement.dataset.theme = resolveColorMode("system");
    document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}theme-changed`, {
      detail: {
        theme: document.documentElement.dataset.theme,
        source: "system"
      }
    }));
  });
}

/**
 * Initializes all approved Stage 1 components.
 */
function initializeComponents() {
  initializeAppShell();
  initializeAccountSearch();
  initializeAccountHeader();
  initializeCommunicationOverview();
  initializeCommunicationForm();
  initializeCommunicationHistory();
  initializeFollowUpList();
}

/**
 * Creates a request identifier for coordinating asynchronous search results.
 * It is not a CRM record identifier and is not persisted.
 */
function createRequestId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  searchRequestSequence += 1;
  return `${prefix}-${Date.now()}-${searchRequestSequence}`;
}

/**
 * Registers application-level CRM event coordination.
 */
function registerApplicationEvents() {
  document.addEventListener(`${APP_EVENT_PREFIX}account-search-requested`, (event) => {
    const searchTerm = String(event.detail?.searchTerm || "").trim();
    if (!searchTerm) {
      return;
    }

    const requestId = createRequestId("account-search");

    updateState({
      ui: {
        loading: true,
        error: null
      },
      search: {
        requestId,
        queryLength: searchTerm.length
      }
    });

    /*
     * The approved API connection will be added later.
     * Do not log the search term or add invented account results here.
     */
    console.info("Account search requested.", {
      requestId,
      searchTermLength: searchTerm.length
    });

    document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}account-search-api-requested`, {
      detail: {
        requestId,
        searchTerm
      }
    }));
  });

  document.addEventListener(`${APP_EVENT_PREFIX}account-selected`, (event) => {
    const accountId = event.detail?.accountId;
    if (!accountId) {
      return;
    }

    /*
     * Request the selected account only through the approved data service.
     * State remains loading until authorization and the API response succeed.
     */
    updateState({
      selectedAccountId: String(accountId),
      ui: {
        loading: true,
        error: null
      }
    });

    announceStatus("Loading the selected account.");

    document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}account-load-requested`, {
      detail: {
        accountId: String(accountId)
      }
    }));
  });

  document.addEventListener(`${APP_EVENT_PREFIX}communication-submit-requested`, (event) => {
    const communication = event.detail?.communication;
    if (!communication?.accountId) {
      return;
    }

    /*
     * The approved API save operation will be connected later.
     * Do not persist communications in localStorage or mark them saved before
     * the API confirms success.
     */
    updateState({
      ui: {
        loading: true,
        error: null
      }
    });

    console.info("Communication submission requested.", {
      hasAccountId: Boolean(communication.accountId),
      type: communication.type || null,
      outcomeCode: communication.outcomeCode || null
    });

    announceStatus("Communication is being submitted.");

    document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}communication-api-submit-requested`, {
      detail: {
        communication
      }
    }));
  });

  document.addEventListener(`${APP_EVENT_PREFIX}follow-up-completion-requested`, (event) => {
    const followUpId = event.detail?.followUpId;
    if (!followUpId) {
      return;
    }

    /*
     * The interface must not mark the follow-up complete until the approved
     * API confirms success.
     */
    updateState({
      ui: {
        loading: true,
        error: null
      }
    });

    console.info("Follow-up completion requested.", {
      hasFollowUpId: true
    });

    announceStatus("Follow-up completion is being requested.");

    document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}follow-up-api-completion-requested`, {
      detail: {
        followUpId: String(followUpId)
      }
    }));
  });
}

/**
 * Registers the global shortcuts defined by Midnight Calm.
 * Every shortcut dispatches an event so the responsible component owns the UI.
 */
function registerKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isEditable = target instanceof HTMLElement && (
      target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    );

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}global-search-open-requested`));
      return;
    }

    if (!isEditable && event.key === "/") {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}page-search-focus-requested`));
      return;
    }

    if (!isEditable && event.key === "?") {
      document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}shortcuts-open-requested`));
      return;
    }

    if (event.key === "Escape") {
      document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}dismiss-top-layer-requested`));
    }
  });
}

/**
 * Exposes connectivity changes without pretending that queued writes succeeded.
 */
function registerConnectivityEvents() {
  const updateConnection = () => {
    const connection = navigator.onLine ? "online" : "offline";
    document.documentElement.dataset.connection = connection;

    document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}connection-changed`, {
      detail: {
        connection
      }
    }));

    announceStatus(
      connection === "online"
        ? "Connection restored."
        : "You are offline. Some data may be unavailable."
    );
  };

  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);
}

/**
 * Notifies components when the page becomes active again so they can request a
 * refresh through their approved data services.
 */
function registerVisibilityEvents() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    document.dispatchEvent(new CustomEvent(`${APP_EVENT_PREFIX}application-resumed`));
  });
}

/**
 * Starts the ACT CRM Stage 1 application once.
 */
function initializeApplication() {
  if (applicationInitialized) {
    return;
  }

  applicationInitialized = true;
  applyInterfacePreferences();
  initializeComponents();
  registerApplicationEvents();
  registerKeyboardShortcuts();
  registerConnectivityEvents();
  registerVisibilityEvents();
  registerThemePreferenceListener();

  /*
   * Dispatch the initial state so every component renders its safe empty state
   * consistently. No CRM data is synthesized here.
   */
  updateState(getState());
  announceStatus("ACT CRM Stage 1 initialized.");
  console.info("ACT CRM Stage 1 initialized.", {
    theme: document.documentElement.dataset.theme,
    density: document.documentElement.dataset.density,
    connection: document.documentElement.dataset.connection
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication, {
    once: true
  });
} else {
  initializeApplication();
}
