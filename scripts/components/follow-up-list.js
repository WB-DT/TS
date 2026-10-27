/**
 * ACT CRM Stage 1
 * Follow-up list component
 *
 * Responsibilities:
 * - Display authorized follow-ups safely
 * - Identify upcoming, due-today, and overdue items
 * - Support loading, empty, error, and loaded states
 * - Emit a completion-request event
 *
 * This component must not:
 * - Retrieve follow-ups independently
 * - Store CRM records in browser storage
 * - Mark a follow-up complete without an API response
 * - Determine authorization
 * - Render CRM values through innerHTML
 */

import {
  createSafeElement,
  hasPermission,
  setSafeText
} from "../security.js";

/**
 * Converts a possible date value into a valid Date.
 *
 * @param {unknown} value
 * @returns {Date|null}
 */
function parseDate(value) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

/**
 * Formats a UTC date for the user's locale.
 *
 * @param {unknown} value
 * @returns {string}
 */
function formatDueDate(value) {
  const date = parseDate(value);

  if (!date) {
    return "Due date unavailable";
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
 * Returns the follow-up's display status.
 *
 * @param {Object} followUp
 * @returns {{
 *   code: string,
 *   label: string
 * }}
 */
function getFollowUpStatus(followUp) {
  if (
    followUp.completedAtUtc ||
    followUp.statusCode === "COMPLETED"
  ) {
    return {
      code: "completed",
      label: "Completed"
    };
  }

  const dueDate = parseDate(
    followUp.dueAtUtc
  );

  if (!dueDate) {
    return {
      code: "unscheduled",
      label: "No due date"
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDay = new Date(dueDate);
  dueDay.setHours(0, 0, 0, 0);

  if (dueDay < today) {
    return {
      code: "overdue",
      label: "Overdue"
    };
  }

  if (dueDay.getTime() === today.getTime()) {
    return {
      code: "due-today",
      label: "Due today"
    };
  }

  return {
    code: "upcoming",
    label: "Upcoming"
  };
}

/**
 * Returns a trimmed display value.
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
 * Clears the follow-up list.
 *
 * @param {HTMLElement} followUpList
 */
function clearFollowUpList(followUpList) {
  followUpList.replaceChildren();
}

/**
 * Updates the follow-up status region.
 *
 * @param {string} message
 * @param {"loading"|"empty"|"error"|"loaded"} state
 */
function updateFollowUpStatus(
  message,
  state
) {
  const statusElement = document.querySelector(
    "[data-follow-up-status]"
  );

  if (!statusElement) {
    return;
  }

  setSafeText(statusElement, message
