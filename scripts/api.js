/**
 * ACT CRM Stage 1
 * API service module
 *
 * Responsibilities:
 * - Send authenticated requests to the approved CRM API
 * - Parse successful responses
 * - Normalize API errors
 * - Carry correlation IDs for troubleshooting
 *
 * This module must not:
 * - Store authentication tokens in localStorage
 * - Invent permissions
 * - Use sample responses as production data
 * - Display errors directly in the interface
 */

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Represents a normalized API failure.
 */
export class ApiError extends Error {
  constructor({
    message,
    status = 0,
    code = "API_ERROR",
    correlationId = null,
    retryable = false
  }) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
    this.retryable = retryable;
  }
}

/**
 * Sends a request to the approved API.
 *
 * @param {string} url Relative or approved API URL.
 * @param {RequestInit} options Fetch configuration.
 * @returns
