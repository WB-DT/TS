/**
 * ACT CRM Stage 1
 * Application entry point
 *
 * Responsibilities:
 * - Start the application
 * - Initialize shared application services
 * - Load the signed-in user context
 * - Initialize account selection
 * - Initialize Stage 1 communication components
 *
 * Business data, permissions, and API logic do not belong in this file.
 */

function initializeApplication() {
  console.info("ACT CRM Stage 1 initialized.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication);
} else {
  initializeApplication();
}
