// Locked prices: reads a CSV of prices locked into customer accounts
// and turns each row into a clean record. This file only READS; it never saves.

// Which CSV header feeds which field. Rename the text on the right to match your files.
// Each field lists the header names it accepts (not case-sensitive).
const LOCKED_PRICE_COLUMNS = {
  qNumber: ["Q-Number", "Q Number", "Quote Number"],
  accountNumber: ["Account Number", "Customer Number", "Account"],
  companyName: ["Company Name", "Customer Name", "Company"],
  ppl: ["PPL"],
  itemNumber: ["Item Number", "Item", "Item #", "SKU"],
  itemDescription: ["Item Description", "Description"],
  uom: ["UOM", "Unit of Measure", "UM"],
  sellPrice: ["Locked-in Sell Price", "Locked In Price", "Sell Price", "Price"],
  cost: ["Cost"],
  gpPercent: ["GP %", "GP%", "Margin", "GP"],
  lockedInDate: ["Locked-in Date", "Locked In Date", "Date Locked In", "Date"],
  approvedBy: ["Approved By", "Quoter"],
};

// These must be filled in, or the row is flagged and not imported.
const REQUIRED = {
  accountNumber: "account number",
  itemNumber: "item number",
  uom: "unit of measure",
  sellPrice: "sell price",
  lockedInDate: "locked-in date",
};

// Splits CSV text into rows of cells. Handles quotes, commas and line breaks inside quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

function normalize(text) {
  return String(text ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function text(value) {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}

function money(value) {
  const cleaned = String(value ?? "").replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

// Accepts 26.6%, 26.6 or 0.266 and always returns a fraction (0.266).
function percent(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/[%,\s]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return raw.includes("%") || Math.abs(parsed) > 1 ? parsed / 100 : parsed;
}

// Accepts 2026-11-02, 11/2/2026 or 11/2/26 and returns 2026-11-02.
function isoDate(value) {
  const raw = String(value ?? "").trim();
  let year;
  let month;
  let day;
  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) [, year, month, day] = match;
  match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    [, month, day, year] = match;
    if (year.length === 2) year = `20${year}`;
  }
  if (!year) return null;
  const check = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (check.getUTCMonth() !== Number(month) - 1) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function rowKey(record) {
  return [record.accountNumber, record.itemNumber, record.uom, record.lockedInDate].join("|");
}

// Main entry point: give it the CSV file's contents, get back the records it found.
function parseLockedPrices(buffer) {
  if (buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    const error = new Error("This looks like an Excel file. In Excel, use File > Save As > CSV, then upload the .csv file.");
    error.status = 400;
    throw error;
  }
  const rows = parseCsv(buffer.toString("utf8").replace(/^﻿/, ""));
  if (rows.length < 2) {
    const error = new Error("The file has no price rows under the header row.");
    error.status = 400;
    throw error;
  }

  const headers = rows[0].map(normalize);
  const columnIndex = {};
  const columnsMissing = [];
  for (const [field, names] of Object.entries(LOCKED_PRICE_COLUMNS)) {
    const index = headers.findIndex((header) => names.some((name) => normalize(name) === header));
    if (index === -1) columnsMissing.push(names[0]);
    else columnIndex[field] = index;
  }

  const seen = new Map();
  const records = rows.slice(1).map((cells, rowIndex) => {
    const get = (field) => (field in columnIndex ? cells[columnIndex[field]] : null);
    const record = {
      line: rowIndex + 2,
      qNumber: text(get("qNumber")),
      accountNumber: text(get("accountNumber"))?.toUpperCase() || null,
      companyName: text(get("companyName")),
      ppl: text(get("ppl")),
      itemNumber: text(get("itemNumber"))?.toUpperCase() || null,
      itemDescription: text(get("itemDescription")),
      uom: text(get("uom"))?.toUpperCase() || null,
      sellPrice: money(get("sellPrice")),
      cost: money(get("cost")),
      gpPercent: percent(get("gpPercent")),
      lockedInDate: isoDate(get("lockedInDate")),
      approvedBy: text(get("approvedBy")),
    };
    // Work out GP % when the file has price and cost but no GP %.
    if (record.gpPercent === null && record.sellPrice && record.cost !== null) {
      record.gpPercent = Math.round(((record.sellPrice - record.cost) / record.sellPrice) * 10000) / 10000;
    }

    record.problems = [];
    const typedDate = text(get("lockedInDate"));
    for (const [field, label] of Object.entries(REQUIRED)) {
      if (field === "lockedInDate" && typedDate) continue;
      if (record[field] === null || record[field] === "") record.problems.push(`Missing ${label}`);
    }
    if (typedDate && !record.lockedInDate) record.problems.push(`Date "${typedDate}" not recognized`);
    if (record.accountNumber && !/^C\d+$/.test(record.accountNumber)) {
      record.problems.push(`Account "${record.accountNumber}" is not C + digits`);
    }
    if (!record.problems.length) {
      const key = rowKey(record);
      if (seen.has(key)) record.problems.push(`Same item, UOM and date as line ${seen.get(key)}`);
      else seen.set(key, record.line);
    }
    record.status = record.problems.length ? "Needs attention" : "Ready";
    return record;
  });

  return { columnsMissing, records };
}

module.exports = { parseLockedPrices, rowKey, LOCKED_PRICE_COLUMNS };

// Run this file directly to check a CSV without starting the app:
//   node locked-prices.js sample-files/locked-prices.csv
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log("Usage: node locked-prices.js path/to/file.csv");
    process.exit(1);
  }
  const result = parseLockedPrices(require("node:fs").readFileSync(filePath));
  console.log(`Missing columns: ${result.columnsMissing.length ? result.columnsMissing.join(", ") : "none"}`);
  console.log(`Rows found: ${result.records.length}`);
  console.table(result.records.map((record) => ({
    Line: record.line,
    Account: record.accountNumber,
    Item: record.itemNumber,
    UOM: record.uom,
    Price: record.sellPrice,
    "GP %": record.gpPercent === null ? null : `${(record.gpPercent * 100).toFixed(1)}%`,
    Date: record.lockedInDate,
    Status: record.status,
  })));
  for (const record of result.records.filter((item) => item.problems.length)) {
    console.log(`Line ${record.line}: ${record.problems.join("; ")}`);
  }
}
