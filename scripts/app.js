/**
 * ACT CRM Stage 1
 * Application entry point
 *
 * Responsibilities:
 * - Start the application
 * - Initialize the Stage 1 interface components
 * - Coordinate application-level events
 *
 * This file must not:
 * - Contain component rendering logic
 * - Store CRM records
 * - Determine user authorization
 * - Calculate communication metrics
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
 * Registers application-level event coordination.
 */
function registerApplicationEvents() {
  document.addEventListener(
    "act:account-search-requested",
    (event) => {
      const searchTerm =
        event.detail?.searchTerm || "";

      /*
       * The approved API connection will be added later.
       * Do not add invented account results here.
       */
      console.info(
        "Account search requested.",
        {
          searchTermLength:
            searchTerm.length
        }
      );
    }
  );

  document.addEventListener(
    "act:account-selected",
    (event) => {
      const accountId =
        event.detail?.accountId;

      if (!accountId) {
        return;
      }

      /*
       * The application will eventually request the selected
       * account from the approved API and update state only
       * after authorization is confirmed.
       */
      updateState({
        selectedAccountId:
          String(accountId),
        ui: {
          loading: true,
          error: null
        }
      });

      announceStatus(
        "Loading the selected account."
      );
    }
  );

  document.addEventListener(
    "act:communication-submit-requested",
    (event) => {
      const communication =
        event.detail?.communication;

      if (!communication) {
        return;
      }

      /*
       * The approved API save operation will be connected later.
       * Do not save the communication to localStorage.
       */
      console.info(
        "Communication submission requested.",
        {
          accountId:
            communication.accountId,
          type:
            communication.type,
          outcomeCode:
            communication.outcomeCode
        }
      );

      announceStatus(
        "Communication is ready to be submitted."
      );
    }
  );

  document.addEventListener(
    "act:follow-up-completion-requested",
    (event) => {
      const followUpId =
        event.detail?.followUpId;

      if (!followUpId) {
        return;
      }

      /*
       * The approved API completion operation will be
       * connected later. The interface must not mark the
       * follow-up complete before the API confirms success.
       */
      console.info(
        "Follow-up completion requested.",
        {
          followUpId
        }
      );

      announceStatus(
        "Follow-up completion is being requested."
      );
    }
  );
}

/**
 * Starts the ACT CRM Stage 1 application.
 */
function initializeApplication() {
  initializeComponents();
  registerApplicationEvents();

  /*
   * Dispatch the initial state so every component renders
   * its safe empty state consistently.
   */
  updateState(getState());

  announceStatus(
    "ACT CRM Stage 1 initialized."
  );

  console.info(
    "ACT CRM Stage 1 initialized."
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApplication,
    {
      once: true
    }
  );
} else {
  initializeApplication();
}
