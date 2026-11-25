const assert = require("node:assert/strict");
const test = require("node:test");
const XLSX = require("xlsx");

const { parseQuoteLog, QUOTE_LOG_COLUMNS } = require("../teams-import");

const HEADERS = Object.values(QUOTE_LOG_COLUMNS);
const FIELDS = Object.keys(QUOTE_LOG_COLUMNS);

/** Builds the workbook the Teams form produces, from field name to cell value. */
function logFile(rows) {
  const sheet = XLSX.utils.aoa_to_sheet([
    HEADERS,
    ...rows.map((row) => FIELDS.map((field) => row[field] ?? null)),
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Quote Log");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

const ready = (responseId, companyName) => ({
  responseId,
  companyName,
  repEmail: "rep1@demo.com",
  requestType: "Existing customer",
  accountNumber: "C10420",
  priority: "Standard",
  submittedAt: new Date("2026-10-27T20:48:00Z"),
});

test("a repeated form ID becomes one request and is counted", () => {
  const result = parseQuoteLog(logFile([
    ready("form-1", "Northstar Paper Co."),
    ready("form-2", "Harborview Medical"),
    ready("form-1", "Northstar Paper Co."),
    ready("form-1", "Northstar Paper Co."),
  ]));

  assert.equal(result.requests.length, 2);
  assert.deepEqual(result.requests.map((request) => request.responseId), ["form-1", "form-2"]);
  assert.equal(result.duplicateRows, 2);
  assert.ok(result.requests.every((request) => request.status === "Ready"));
});

test("a log without repeats reports no duplicates", () => {
  const result = parseQuoteLog(logFile([ready("form-1", "Northstar Paper Co.")]));
  assert.equal(result.requests.length, 1);
  assert.equal(result.duplicateRows, 0);
});

test("rows without a form ID are kept so nothing is silently dropped", () => {
  const result = parseQuoteLog(logFile([
    { companyName: "No Form ID Co.", repEmail: "rep1@demo.com" },
    { companyName: "No Form ID Co.", repEmail: "rep1@demo.com" },
  ]));
  assert.equal(result.requests.length, 2);
  assert.equal(result.duplicateRows, 0);
  assert.ok(result.requests.every((request) => request.problems.includes("No form response ID")));
});
