// Teams import: reads the quote log Excel file (filled by the Teams form)
// and turns each row into a QuoteFlow request. This file only READS the log;
// it never changes the database.
const XLSX = require("xlsx");

// Which log column feeds which QuoteFlow field.
// If the form's questions are ever renamed, update the text on the right.
const QUOTE_LOG_COLUMNS = {
  // Answers from the Teams form
  responseId: "ID",
  submittedAt: "Completion time",
  repEmail: "Email",
  repName: "Name",
  quoteNumber: "Q-Number",
  oldQuoteNumber: "Old Q-Number",
  requestType: "Customer or Lead",
  accountNumber: "Customer Number",
  companyName: "Company Name",
  priority: "ASAP or Standard Request",
  asapApprovedBy: "Manager that Approved ASAP",
  submitterRole: "Role of Agent Submitting Quote",
  notes: "Notes",
  attachments: "Attachments",
  asapNotes: "ASAP Notes",
  // Filled in by hand by the team today (used for the history import)
  dateQualified: "Date Qualified",
  category: "Category",
  competitor: "Competitor",
  itemsToQuote: "# of Items to Quote",
  assignedTo: "Assigned To",
  dateAssigned: "Date Assigned",
  teamNotes: "Qualifier/Quoter Notes",
  multiplier: "Multiplier",
  itemsQuoted: "Total Items Quoted",
  sellPriceTotal: "Sell Price TOTAL",
  gpPercent: "GP %",
  dateReturned: "Date Returned to Rep or Killed",
  sentForRevision: "Sent for Revision",
  dateSentForRevision: "Date Sent for Revision",
  numberOfChanges: "# of Changes",
  revisionNotes: "Revision Notes",
  ppl: "PPL",
  lockedInDate: "Locked In Date",
};

const REQUEST_TYPES = { customer: "Existing customer", lead: "Lead", "win back": "Win-back", "win-back": "Win-back" };

// Makes headers comparable: lower case, single spaces, no hidden characters.
function normalize(text) {
  return String(text ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

// Finds the log column for each field: exact match first, then "starts with", then "contains".
function matchColumns(headers, wanted) {
  const normalized = headers.map(normalize);
  const found = {};
  const missing = [];
  for (const [field, label] of Object.entries(wanted)) {
    const target = normalize(label);
    let index = normalized.indexOf(target);
    if (index === -1) index = normalized.findIndex((header) => header.startsWith(target));
    if (index === -1) index = normalized.findIndex((header) => header.includes(target));
    if (index === -1) missing.push(label);
    else found[field] = headers[index];
  }
  return { found, missing };
}

function text(value) {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

// Excel dates have no time zone, so keep them exactly as typed: "2026-10-27 20:48".
function date(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const pad = (part) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function toRequest(row, columns) {
  const get = (field) => (columns[field] ? row[columns[field]] : null);
  const rawType = text(get("requestType"));
  const rawPriority = text(get("priority"));
  const request = {
    responseId: text(get("responseId")),
    submittedAt: date(get("submittedAt")),
    repEmail: text(get("repEmail"))?.toLowerCase() || null,
    repName: text(get("repName")),
    quoteNumber: text(get("quoteNumber")),
    oldQuoteNumber: text(get("oldQuoteNumber")),
    requestType: rawType ? REQUEST_TYPES[normalize(rawType)] || rawType : null,
    accountNumber: text(get("accountNumber"))?.toUpperCase() || null,
    companyName: text(get("companyName")),
    priority: rawPriority && normalize(rawPriority).startsWith("asap") ? "ASAP" : "Standard",
    asapApprovedBy: text(get("asapApprovedBy")),
    submitterRole: text(get("submitterRole")),
    notes: text(get("notes")),
    attachmentLinks: (text(get("attachments")) || "").split(/[\s;]+/).filter((link) => link.startsWith("http")),
    asapNotes: text(get("asapNotes")),
    history: {
      dateQualified: date(get("dateQualified")),
      category: text(get("category")),
      competitor: text(get("competitor")),
      itemsToQuote: number(get("itemsToQuote")),
      assignedTo: text(get("assignedTo")),
      dateAssigned: date(get("dateAssigned")),
      teamNotes: text(get("teamNotes")),
      multiplier: number(get("multiplier")),
      itemsQuoted: number(get("itemsQuoted")),
      sellPriceTotal: number(get("sellPriceTotal")),
      gpPercent: number(get("gpPercent")),
      dateReturned: date(get("dateReturned")),
      sentForRevision: text(get("sentForRevision")),
      dateSentForRevision: date(get("dateSentForRevision")),
      numberOfChanges: number(get("numberOfChanges")),
      revisionNotes: text(get("revisionNotes")),
      ppl: text(get("ppl")),
      lockedInDate: date(get("lockedInDate")),
    },
  };

  // Flag anything a person should look at before this row becomes a quote.
  request.problems = [];
  if (!request.responseId) request.problems.push("No form response ID");
  if (!request.companyName) request.problems.push("No company name");
  if (!request.repEmail) request.problems.push("No rep email");
  if (request.requestType && !Object.values(REQUEST_TYPES).includes(request.requestType)) {
    request.problems.push(`Unknown request type "${request.requestType}"`);
  }
  if (request.accountNumber && !/^C\d+$/.test(request.accountNumber)) {
    request.problems.push(`Account number "${request.accountNumber}" does not look like C + digits`);
  }
  request.status = request.problems.length ? "Needs attention" : "Ready";
  return request;
}

// Main entry point: give it the Excel file's contents, get back the requests it found.
function parseQuoteLog(buffer, sheetName = "Quote Log") {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    const error = new Error(`This file has no "${sheetName}" tab. Tabs found: ${workbook.SheetNames.join(", ")}.`);
    error.status = 400;
    throw error;
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const { found, missing } = matchColumns(headers, QUOTE_LOG_COLUMNS);
  const requests = rows.map((row) => toRequest(row, found)).filter((request) => request.responseId || request.companyName);
  return { sheetName, columnsMissing: missing, requests };
}

module.exports = { parseQuoteLog, QUOTE_LOG_COLUMNS };

// Run this file directly to check a log file without starting the app:
//   node teams-import.js sample-files/your-file.xlsx
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log("Usage: node teams-import.js path/to/quote-log.xlsx");
    process.exit(1);
  }
  const result = parseQuoteLog(require("node:fs").readFileSync(filePath));
  console.log(`Tab: ${result.sheetName}`);
  console.log(`Missing columns: ${result.columnsMissing.length ? result.columnsMissing.join(", ") : "none"}`);
  console.log(`Requests found: ${result.requests.length}`);
  console.table(result.requests.map((request) => ({
    "Form ID": request.responseId,
    "Q-number": request.quoteNumber,
    Type: request.requestType,
    Account: request.accountNumber,
    Company: request.companyName,
    Priority: request.priority,
    PPL: request.history.ppl,
    Status: request.status,
  })));
  for (const request of result.requests.filter((item) => item.problems.length)) {
    console.log(`Form ID ${request.responseId}: ${request.problems.join("; ")}`);
  }
}