/**
 * ACT CRM Stage 1
 * Account search component
 *
 * Responsibilities:
 * - Manage the account-search input
 * - Normalize the user's search term
 * - Emit an application event when a search is requested
 * - Display loading, empty, error, and restricted states
 *
 * This component must not:
 * - Invent account records
 * - Store account results in localStorage
 * - Determine whether the user may access an account
 * - Insert untrusted account data through innerHTML
 */

import {
  createSafeElement,
  setSafeText
} from "../security.js";

const MINIMUM_SEARCH_LENGTH = 2;

/**
 * Removes unnecessary spacing from a search term.
 *
 * @param {unknown} value
 * @returns {string}
 */
function normalizeSearchTerm(value) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
}

/**
 * Clears the account-search results region.
 *
 * @param {HTMLElement} resultsRegion
 */
function clearResults(resultsRegion) {
  resultsRegion.replaceChildren();
}

/**
 * Displays a message in the account-search results region.
 *
 * @param {HTMLElement} resultsRegion
 * @param {string} message
 * @param {string} state
 */
function showSearchMessage(
  resultsRegion,
  message,
  state = "information"
) {
  clearResults(resultsRegion);

  const messageElement = createSafeElement(
    "p",
    message,
    {
      className: `account-search-message is-${state}`
    }
  );

  resultsRegion.append(messageElement);
}

/**
 * Displays account-search results safely.
 *
 * The future API must return only accounts the signed-in user
 * is authorized to discover.
 *
 * @param {HTMLElement} resultsRegion
 * @param {Array<Object>} accounts
 */
export function renderAccountSearchResults(
  resultsRegion,
  accounts = []
) {
  if (!(resultsRegion instanceof HTMLElement)) {
    throw new TypeError(
      "A valid account-search results region is required."
    );
  }

  clearResults(resultsRegion);

  if (!Array.isArray(accounts) || accounts.length === 0) {
    showSearchMessage(
      resultsRegion,
      "No authorized accounts matched the search.",
      "empty"
    );

    return;
  }

  const resultList = document.createElement("ul");
  resultList.className = "account-search-results-list";
  resultList.setAttribute("role", "listbox");
  resultList.setAttribute(
    "aria-label",
    "Account search results"
  );

  accounts.forEach((account) => {
    const resultItem = document.createElement("li");
    resultItem.className = "account-search-result-item";
    resultItem.setAttribute("role", "option");

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "account-search-result";

    const accountName = createSafeElement(
      "strong",
      account.displayName || "Unnamed account",
      {
        className: "account-search-result-name"
      }
    );

    const accountDetails = createSafeElement(
      "span",
      [
        account.accountNumber,
        account.city,
        account.state
      ]
        .filter(Boolean)
        .join(" · "),
      {
        className: "account-search-result-details"
      }
    );

    selectButton.append(
      accountName,
      accountDetails
    );

    selectButton.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("act:account-selected", {
          detail: {
            accountId: String(account.accountId || "")
          }
        })
      );
    });

    resultItem.append(selectButton);
    resultList.append(resultItem);
  });

  resultsRegion.append(resultList);
}

/**
 * Initializes the account-search component.
 */
export function initializeAccountSearch() {
  const searchForm = document.querySelector(
    "[data-account-search-form]"
  );

  const searchInput = document.querySelector(
    "[data-account-search-input]"
  );

  const resultsRegion = document.querySelector(
    "[data-account-search-results]"
  );

  if (!searchForm || !searchInput || !resultsRegion) {
    return;
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const searchTerm = normalizeSearchTerm(
      searchInput.value
    );

    if (searchTerm.length < MINIMUM_SEARCH_LENGTH) {
      showSearchMessage(
        resultsRegion,
        `Enter at least ${MINIMUM_SEARCH_LENGTH} characters.`,
        "validation"
      );

      searchInput.focus();
      return;
    }

    showSearchMessage(
      resultsRegion,
      "Searching authorized accounts…",
      "loading"
    );

    document.dispatchEvent(
      new CustomEvent("act:account-search-requested", {
        detail: {
          searchTerm
        }
      })
    );
  });

  searchInput.addEventListener("input", () => {
    if (!normalizeSearchTerm(searchInput.value)) {
      clearResults(resultsRegion);
    }
  });
}
