/**
 * ACT CRM Stage 1
 * Selected-account header component
 *
 * Responsibilities:
 * - Display the selected account context
 * - Show approved account-identification fields
 * - Provide a safe empty state
 *
 * This component must not:
 * - Retrieve the account independently
 * - Store account information
 * - Determine account authorization
 * - Render account data through innerHTML
 */

import {
  setSafeText
} from "../security.js";

/**
 * Returns the first two useful initials from an account name.
 *
 * @param {unknown} accountName
 * @returns {string}
 */
function getAccountInitials(accountName) {
  if (typeof accountName !== "string") {
    return "--";
  }

  const words = accountName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "--";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Combines approved location fields for display.
 *
 * @param {Object} account
 * @returns {string}
 */
function getAccountLocation(account) {
  const locationParts = [
    account.city,
    account.state
  ].filter(
    (value) =>
      typeof value === "string" &&
      value.trim()
  );

  return locationParts.length > 0
    ? locationParts.join(", ")
    : "Location unavailable";
}

/**
 * Safely updates an optional display element.
 *
 * @param {string} selector
 * @param {unknown} value
 */
function updateDisplayElement(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    setSafeText(element, value);
  }
}

/**
 * Displays the selected account.
 *
 * The account object must come from the approved application
 * state after the API has confirmed access.
 *
 * @param {Object|null} account
 */
export function renderAccountHeader(account) {
  const accountHeader = document.querySelector(
    "[data-account-header]"
  );

  if (!accountHeader) {
    return;
  }

  if (!account || !account.accountId) {
    clearAccountHeader();
    return;
  }

  updateDisplayElement(
    "[data-account-name]",
    account.displayName || "Unnamed account"
  );

  updateDisplayElement(
    "[data-account-number]",
    account.accountNumber ||
      "Account number unavailable"
  );

  updateDisplayElement(
    "[data-account-location]",
    getAccountLocation(account)
  );

  updateDisplayElement(
    "[data-account-initials]",
    getAccountInitials(account.displayName)
  );

  const accountStatus =
    typeof account.statusLabel === "string" &&
    account.statusLabel.trim()
      ? account.statusLabel.trim()
      : "Status unavailable";

  updateDisplayElement(
    "[data-account-status]",
    accountStatus
  );

  accountHeader.hidden = false;
  accountHeader.dataset.accountId = String(
    account.accountId
  );
}

/**
 * Returns the account header to its safe empty state.
 */
export function clearAccountHeader() {
  const accountHeader = document.querySelector(
    "[data-account-header]"
  );

  if (!accountHeader) {
    return;
  }

  updateDisplayElement(
    "[data-account-name]",
    "Select an account"
  );

  updateDisplayElement(
    "[data-account-number]",
    "Account number unavailable"
  );

  updateDisplayElement(
    "[data-account-location]",
    "Location unavailable"
  );

  updateDisplayElement(
    "[data-account-initials]",
    "--"
  );

  updateDisplayElement(
    "[data-account-status]",
    "No account selected"
  );

  accountHeader.removeAttribute("data-account-id");
  accountHeader.hidden = false;
}

/**
 * Initializes the selected-account header.
 */
export function initializeAccountHeader() {
  clearAccountHeader();

  document.addEventListener(
    "act:state-change",
    (event) => {
      renderAccountHeader(
        event.detail?.selectedAccount || null
      );
    }
  );
}
