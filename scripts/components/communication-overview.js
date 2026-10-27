/**
 * ACT CRM Stage 1
 * Communication overview component
 *
 * Responsibilities:
 * - Calculate approved communication metrics
 * - Display metric values safely
 * - Support loading, empty, loaded, and error states
 *
 * This component must not:
 * - Retrieve records independently
 * - Store CRM records in localStorage
 * - Invent metric values
 * - Determine account authorization
 * - Insert record data through innerHTML
 */

import {
  setSafeText
} from "../security.js";

/**
 * Returns a valid array of communication records.
 *
 * @param {unknown} communications
 * @returns {Array<Object>}
 */
function normalizeCommunications(communications) {
  return Array.isArray(communications)
    ? communications
    : [];
}

/**
 * Parses a numeric duration safely.
 *
 * @param {unknown} value
 * @returns {number}
 */
function getDurationMinutes(value) {
  const duration = Number(value);

  return Number.isFinite(duration) && duration > 0
    ? duration
    : 0;
}

/**
 * Determines whether a communication is a call.
 *
 * @param {Object} communication
 * @returns {boolean}
 */
function isCall(communication) {
  return communication.type === "CALL";
}

/**
 * Determines whether a call was connected.
 *
 * @param {Object} communication
 * @returns {boolean}
 */
function isConnectedCall(communication) {
  return (
    isCall(communication) &&
    communication.outcomeCode === "CONNECTED"
  );
}

/**
 * Determines whether a communication is an outbound email.
 *
 * @param {Object} communication
 * @returns {boolean}
 */
function isOutboundEmail(communication) {
  return (
    communication.type === "EMAIL" &&
    communication.direction === "OUTBOUND"
  );
}

/**
 * Calculates approved Stage 1 communication metrics.
 *
 * The API may eventually provide authoritative aggregates.
 * Until then, this function calculates values only from records
 * already authorized and returned by the API.
 *
 * @param {Array<Object>} communications
 * @param {Array<Object>} followUps
 * @returns {Object}
 */
export function calculateCommunicationMetrics(
  communications = [],
  followUps = []
) {
  const records = normalizeCommunications(
    communications
  );

  const tasks = Array.isArray(followUps)
    ? followUps
    : [];

  const calls = records.filter(isCall);
  const connectedCalls = records.filter(
    isConnectedCall
  );
  const outboundEmails = records.filter(
    isOutboundEmail
  );

  const totalTalkTimeMinutes = connectedCalls.reduce(
    (total, communication) =>
      total +
      getDurationMinutes(
        communication.durationMinutes
      ),
    0
  );

  const averageTalkTimeMinutes =
    connectedCalls.length > 0
      ? Math.round(
          totalTalkTimeMinutes /
            connectedCalls.length
        )
      : 0;

  const connectionRate =
    calls.length > 0
      ? Math.round(
          (connectedCalls.length / calls.length) *
            100
        )
      : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const followUpsDue = tasks.filter(
    (followUp) => {
      if (
        followUp.completedAtUtc ||
        followUp.statusCode === "COMPLETED"
      ) {
        return false;
      }

      if (!followUp.dueAtUtc) {
        return false;
      }

      const dueDate = new Date(
        followUp.dueAtUtc
      );

      return (
        !Number.isNaN(dueDate.getTime()) &&
        dueDate <= today
      );
    }
  ).length;

  const validActivityDates = records
    .map((communication) =>
      new Date(communication.occurredAtUtc)
    )
    .filter(
      (date) => !Number.isNaN(date.getTime())
    )
    .sort(
      (first, second) =>
        second.getTime() - first.getTime()
    );

  const lastActivityAtUtc =
    validActivityDates.length > 0
      ? validActivityDates[0].toISOString()
      : null;

  return {
    
