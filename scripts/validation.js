/**
 * ACT CRM Stage 1
 * Form and business-rule validation
 *
 * Responsibilities:
 * - Validate communication form fields
 * - Return consistent field-level errors
 * - Enforce conditional follow-up requirements
 *
 * Server-side validation remains authoritative.
 */

const ALLOWED_COMMUNICATION_TYPES = new Set([
  "CALL",
  "EMAIL",
  "MEETING",
  "NOTE"
]);

const ALLOWED_DIRECTIONS = new Set([
  "INBOUND",
  "OUTBOUND",
  "INTERNAL"
]);

const ALLOWED_OUTCOMES = new Set([
  "CONNECTED",
  "LEFT_VOICEMAIL",
  "NO_ANSWER",
  "EMAIL_SENT",
  "FOLLOW_UP_REQUIRED",
  "INFORMATION_ONLY",
  "WRONG_CONTACT",
  "DO_NOT_CONTACT",
  "RESOLVED"
]);

/**
 * Normalizes a text value for validation.
 *
 * @param {unknown} value
 * @returns {string}
 */
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Determines whether a value is a valid calendar date.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isValidDate(value) {
  if (!value) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
}

/**
 * Validates a communication record.
 *
 * @param {Object} communication
 * @returns {{
 *   isValid: boolean,
 *   errors: Record<string, string>
 * }}
 */
export function validateCommunication(communication = {}) {
  const errors = {};

  const accountId = normalizeText(communication.accountId);
  const type = normalizeText(communication.type).toUpperCase();
  const direction = normalizeText(communication.direction).toUpperCase();
  const outcomeCode = normalizeText(
    communication.outcomeCode
  ).toUpperCase();
  const notes = normalizeText(communication.notes);
  const followUpDate = normalizeText(communication.followUpDate);
  const followUpOwnerId = normalizeText(
    communication.followUpOwnerId
  );

  if (!accountId) {
    errors.accountId = "Select an account before logging communication.";
  }

  if (!ALLOWED_COMMUNICATION_TYPES.has(type)) {
    errors.type = "Select a valid communication type.";
  }

  if (!ALLOWED_DIRECTIONS.has(direction)) {
    errors.direction = "Select a valid communication direction.";
  }

  if (!ALLOWED_OUTCOMES.has(outcomeCode)) {
    errors.outcomeCode = "Select a valid communication outcome.";
  }

  if (!notes) {
    errors.notes = "Enter communication notes.";
  } else if (notes.length > 4000) {
    errors.notes = "Communication notes cannot exceed 4,000 characters.";
  }

  if (
    communication.durationMinutes !== undefined &&
    communication.durationMinutes !== null &&
    communication.durationMinutes !== ""
  ) {
    const duration = Number(communication.durationMinutes);

    if (!Number.isFinite(duration) || duration < 0) {
      errors.durationMinutes =
        "Duration must be zero or a positive number.";
    }
  }

  const followUpRequired =
    outcomeCode === "FOLLOW_UP_REQUIRED" ||
    communication.followUpRequired === true;

  if (followUpRequired) {
    if (!isValidDate(followUpDate)) {
      errors.followUpDate =
        "Enter a valid follow-up date.";
    }

    if (!followUpOwnerId) {
      errors.followUpOwnerId =
        "Assign an owner to the follow-up.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
