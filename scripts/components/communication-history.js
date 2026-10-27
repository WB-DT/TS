/**
 * ACT CRM Stage 1
 * Communication history component
 *
 * Responsibilities:
 * - Display authorized communication records
 * - Provide history loading, empty, error, and loaded states
 * - Render all CRM values as plain text
 *
 * This component must not:
 * - Retrieve records independently
 * - Store communication records
 * - Modify or delete records
 * - Determine authorization
 * - Render CRM data through innerHTML
 */

import {
  createSafeElement,
  setSafeText
} from "../security.js";

/**
 * Formats a UTC date for the user's locale.
 *
 * @param {unknown} value
 * @returns {string}
 */
function formatOccurredDate(value) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(date);
}

/**
 * Returns a safe display label.
 *
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function getDisplayValue(
  value,
  fallback = "Unavailable"
) {
  return (
    typeof value === "string" &&
    value.trim()
  )
    ? value.trim()
    : fallback;
}

/**
 * Clears the history list.
 *
 * @param {HTMLElement} historyList
 */
function clearHistoryList(historyList) {
  historyList.replaceChildren();
}

/**
 * Updates the history status message.
 *
 * @param {string} message
 * @param {"loading"|"empty"|"error"|"loaded"} state
 */
function updateHistoryStatus(
  message,
  state
) {
  const statusElement = document.querySelector(
    "[data-communication-history-status]"
  );

  if (!statusElement) {
    return;
  }

  setSafeText(statusElement, message);
  statusElement.dataset.state = state;
  statusElement.hidden =
    state === "loaded";
}

/**
 * Creates one safe history record.
 *
 * @param {Object} communication
 * @returns {HTMLLIElement}
 */
function createHistoryItem(communication) {
  const listItem =
    document.createElement("li");

  listItem.className =
    "communication-history-item";

  if (communication.communicationId) {
    listItem.dataset.communicationId =
      String(
        communication.communicationId
      );
  }

  const header =
    document.createElement("div");

  header.className =
    "communication-history-item-header";

  const typeLabel = createSafeElement(
    "strong",
    getDisplayValue(
      communication.typeLabel,
      getDisplayValue(
        communication.type,
        "Communication"
      )
    ),
    {
      className:
        "communication-history-type"
    }
  );

  const occurredDate = createSafeElement(
    "span",
    formatOccurredDate(
      communication.occurredAtUtc
    ),
    {
      className:
        "communication-history-date"
    }
  );

  header.append(
    typeLabel,
    occurredDate
  );

  const metadata =
    document.createElement("div");

  metadata.className =
    "communication-history-metadata";

  const direction = createSafeElement(
    "span",
    getDisplayValue(
      communication.directionLabel,
      communication.direction
    ),
    {
      className:
        "communication-history-direction"
    }
  );

  const outcome = createSafeElement(
    "span",
    getDisplayValue(
      communication.outcomeLabel,
      communication.outcomeCode
    ),
    {
      className:
        "communication-history-outcome"
    }
  );

  metadata.append(
    direction,
    outcome
  );

  const notes = createSafeElement(
    "p",
    getDisplayValue(
      communication.notes,
      "No notes recorded."
    ),
    {
      className:
        "communication-history-notes"
    }
  );

  const footer =
    document.createElement("div");

  footer.className =
    "communication-history-item-footer";

  const owner = createSafeElement(
    "span",
    getDisplayValue(
      communication.ownerDisplayName,
      "Owner unavailable"
    ),
    {
      className:
        "communication-history-owner"
    }
  );

  footer.append(owner);

  if (
    communication.durationMinutes !==
      null &&
    communication.durationMinutes !==
      undefined &&
    communication.durationMinutes !== ""
  ) {
    const duration = Number(
      communication.durationMinutes
    );

    if (
      Number.isFinite(duration) &&
      duration >= 0
    ) {
      const durationElement =
        createSafeElement(
          "span",
          `${duration} min`,
          {
            className:
              "communication-history-duration"
          }
        );

      footer.append(durationElement);
    }
  }

  listItem.append(
    header,
    metadata,
    notes,
    footer
  );

  return listItem;
}

/**
 * Displays communication history records.
 *
 * The records must already be authorized and returned by
 * the approved API.
 *
 * @param {Array<Object>} communications
 */
export function renderCommunicationHistory(
  communications = []
) {
  const historyList = document.querySelector(
    "[data-communication-history-list]"
  );

  if (!(historyList instanceof HTMLElement)) {
    return;
  }

  clearHistoryList(historyList);

  if (
    !Array.isArray(communications) ||
    communications.length === 0
  ) {
    updateHistoryStatus(
      "No communication history is available for this account.",
      "empty"
    );

    return;
  }

  const sortedCommunications = [
    ...communications
  ].sort((first, second) => {
    const firstDate = new Date(
      first.occurredAtUtc
    );

    const secondDate = new Date(
      second.occurredAtUtc
    );

    const firstTime =
      Number.isNaN(firstDate.getTime())
        ? 0
        : firstDate.getTime();

    const secondTime =
      Number.isNaN(secondDate.getTime())
        ? 0
        : secondDate.getTime();

    return secondTime - firstTime;
  });

  const fragment =
    document.createDocumentFragment();

  sortedCommunications.forEach(
    (communication) => {
      fragment.append(
        createHistoryItem(
          communication
        )
      );
    }
  );

  historyList.append(fragment);

  updateHistoryStatus(
    "",
    "loaded"
  );
}

/**
 * Displays the history-loading state.
 */
export function showCommunicationHistoryLoading() {
  const historyList = document.querySelector(
    "[data-communication-history-list]"
  );

  if (historyList) {
    clearHistoryList(historyList);
  }

  updateHistoryStatus(
    "Loading communication history…",
    "loading"
  );
}

/**
 * Displays a safe history-error state.
 *
 * Detailed technical errors should be logged through the
 * approved telemetry service, not displayed to the user.
 */
export function showCommunicationHistoryError() {
  const historyList = document.querySelector(
    "[data-communication-history-list]"
  );

  if (historyList) {
    clearHistoryList(historyList);
  }

  updateHistoryStatus(
    "Communication history could not be loaded. Try again.",
    "error"
  );
}

/**
 * Returns the history component to its empty state.
 */
export function clearCommunicationHistory() {
  renderCommunicationHistory([]);
}

/**
 * Initializes the communication-history component.
 */
export function initializeCommunicationHistory() {
  clearCommunicationHistory();

  document.addEventListener(
    "act:state-change",
    (event) => {
      const state = event.detail || {};

      if (state.ui?.loading) {
        showCommunicationHistoryLoading();
        return;
      }

      if (state.ui?.error) {
        showCommunicationHistoryError();
        return;
      }

      if (!state.selectedAccountId) {
        clearCommunicationHistory();
        return;
      }

      renderCommunicationHistory(
        state.communications
      );
    }
  );
}
