/**
 * ACT CRM Stage 1
 * Front-end security helpers
 *
 * Responsibilities:
 * - Render untrusted values as text
 * - Validate application URLs
 * - Interpret permissions returned by the approved API
 *
 * This module does not replace:
 * - Server-side authentication
 * - Server-side authorization
 * - Server-side validation
 * - Audit logging
 */

/**
 * Safely writes a value into an element as plain text.
 *
 * Do not replace textContent with innerHTML when rendering
 * account data, communication notes, contact data, or API errors.
 *
 * @param {Element} element
 * @param {unknown} value
 */
export function setSafeText(element, value) {
  if (!(element instanceof Element)) {
    throw new TypeError("A valid DOM element is required.");
  }

  element.textContent =
    value === null || value === undefined
      ? ""
      : String(value);
}

/**
 * Creates an element containing plain text.
 *
 * @param {string} tagName
 * @param {unknown} text
 * @param {Object} options
 * @param {string} [options.className]
 * @param {Record<string, string>} [options.attributes]
 * @returns {HTMLElement}
 */
export function createSafeElement(
  tagName,
  text = "",
  {
    className = "",
    attributes = {}
  } = {}
) {
  const allowedTagNames = new Set([
    "a",
    "button",
    "div",
    "li",
    "p",
    "small",
    "span",
    "strong"
  ]);

  const normalizedTagName = String(tagName).toLowerCase();

  if (!allowedTagNames.has(normalizedTagName)) {
    throw new Error(
      `The element type "${normalizedTagName}" is not allowed.`
    );
  }

  const element = document.createElement(normalizedTagName);

  if (className) {
    element.className = className;
  }

  setSafeText(element, text);

  Object.entries(attributes).forEach(([name, value]) => {
    if (
      name.startsWith("on") ||
      name === "style" ||
      name === "srcdoc"
    ) {
      throw new Error(
        `The attribute "${name}" is not allowed.`
      );
    }

    element.setAttribute(name, String(value));
  });

  return element;
}

/**
 * Converts a possible URL into an approved application URL.
 *
 * Only same-origin HTTP or HTTPS URLs are accepted.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
export function getSafeApplicationUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value, window.location.origin);

    const usesApprovedProtocol =
      url.protocol === "https:" ||
      (
        url.protocol === "http:" &&
        window.location.protocol === "http:"
      );

    const usesApprovedOrigin =
      url.origin === window.location.origin;

    if (!usesApprovedProtocol || !usesApprovedOrigin) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

/**
 * Checks a permission received from the approved API.
 *
 * This helper only controls the interface presentation.
 * The API must independently authorize every operation.
 *
 * @param {Record<string, boolean>} permissions
 * @param {string} permissionName
 * @returns {boolean}
 */
export function hasPermission(
  permissions,
  permissionName
) {
  if (
    !permissions ||
    typeof permissions !== "object" ||
    typeof permissionName !== "string"
  ) {
    return false;
  }

  return permissions[permissionName] === true;
}
