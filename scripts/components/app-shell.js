/**
 * ACT CRM Stage 1
 * Application shell component
 *
 * Responsibilities:
 * - Initialize shell-level controls
 * - Manage the user's visual theme preference
 * - Provide accessible application announcements
 *
 * This component must not:
 * - Load or store CRM records
 * - Determine user authorization
 * - Calculate communication metrics
 */

const THEME_STORAGE_KEY = "act-crm-theme";
const SUPPORTED_THEMES = new Set(["light", "dark"]);

/**
 * Returns the saved visual theme when the value is supported.
 *
 * Theme preference is non-sensitive interface data and may be stored
 * locally. CRM records and permission data must not be stored locally.
 *
 * @returns {"light"|"dark"}
 */
function getPreferredTheme() {
  const savedTheme = window.localStorage.getItem(
    THEME_STORAGE_KEY
  );

  if (SUPPORTED_THEMES.has(savedTheme)) {
    return savedTheme;
  }

  const prefersDarkTheme = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  return prefersDarkTheme ? "dark" : "light";
}

/**
 * Applies the selected theme to the document.
 *
 * @param {"light"|"dark"} theme
 */
function applyTheme(theme) {
  const approvedTheme = SUPPORTED_THEMES.has(theme)
    ? theme
    : "light";

  document.documentElement.dataset.theme = approvedTheme;

  const themeColor = document.querySelector(
    'meta[name="theme-color"]'
  );

  if (themeColor) {
    themeColor.setAttribute(
      "content",
      approvedTheme === "dark"
        ? "#13151F"
        : "#FAFBFC"
    );
  }

  const themeToggle = document.querySelector(
    "[data-theme-toggle]"
  );

  if (themeToggle) {
    const nextTheme =
      approvedTheme === "dark" ? "light" : "dark";

    themeToggle.setAttribute(
      "aria-label",
      `Switch to ${nextTheme} theme`
    );

    themeToggle.setAttribute(
      "aria-pressed",
      String(approvedTheme === "dark")
    );
  }
}

/**
 * Announces a short application status message.
 *
 * @param {string} message
 */
export function announceStatus(message) {
  const statusRegion = document.querySelector(
    "[data-app-status]"
  );

  if (!statusRegion) {
    return;
  }

  statusRegion.textContent = "";
  window.requestAnimationFrame(() => {
    statusRegion.textContent = String(message || "");
  });
}

/**
 * Initializes the shared application shell.
 */
export function initializeAppShell() {
  applyTheme(getPreferredTheme());

  const themeToggle = document.querySelector(
    "[data-theme-toggle]"
  );

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const currentTheme =
        document.documentElement.dataset.theme || "light";

      const nextTheme =
        currentTheme === "dark" ? "light" : "dark";

      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        nextTheme
      );

      applyTheme(nextTheme);
      announceStatus(
        `${nextTheme} theme activated.`
      );
    });
  }
}
