// Dataverse logs: reads the client's Quote Log and MDM Log exports (xlsx)
// and turns each row into a record with the exact Dataverse column names.
// This file only READS; saving happens in server.js.
const { createHash } = require("node:crypto");
const XLSX = require("xlsx");

// Same lists as db/migrations/014_dataverse_logs.js. If the client adds a column,
// add it in both places (and in a new migration).
const LOGS = {
  quote: {
    label: "Quote Log",
    table: "cr714_quotelog",
    idColumn: "cr714_quotelogid",
    columns: [
      "createdon", "modifiedon", "createdbyname", "modifiedbyname", "owneridyominame",
      "cr714_recordkey", "cr714_asapapprovingmanager", "cr714_asapnotes", "cr714_assignedto",
      "cr714_attachment", "cr714_attachmentcount", "cr714_category", "cr714_companyname",
      "cr714_competitor", "cr714_completiontime", "cr714_customernumber", "cr714_customerorlead",
      "cr714_dateassigned", "cr714_datequalified", "cr714_datereturnedorkilled", "cr714_datesentforrevision",
      "cr714_grossprofitpercent", "cr714_hasattachment", "cr714_hasattachmentname", "cr714_itemstoquote",
      "cr714_lockedindate", "cr714_multiplier", "cr714_numberofchanges", "cr714_oldquotenumber", "cr714_ppl",
      "cr714_qualifierquoternotes", "cr714_quotenumber", "cr714_requestnotes", "cr714_requestpriority",
      "cr714_revisionnotes", "cr714_sentforrevision", "cr714_sentforrevisionname", "cr714_sourcefile",
      "cr714_sourceid", "cr714_sourcemodifiedon", "cr714_sourcesheet", "cr714_starttime",
      "cr714_submitteremail", "cr714_submittername", "cr714_submittingagentrole", "cr714_totalitemsquoted",
      "cr714_wbsellpricetotal", "cr714_wbsellpricetotal_base",
    ],
  },
  mdm: {
    label: "MDM Log",
    table: "cr714_mdmlog",
    idColumn: "cr714_mdmlogid",
    columns: [
      "createdon", "modifiedon", "createdbyname", "modifiedbyname", "owneridname", "owneridyominame",
      "cr714_recordkey", "cr714_accountnumber", "cr714_amountawarded", "cr714_amountawarded_base",
      "cr714_assignedto", "cr714_bidduedate", "cr714_bidnotes", "cr714_branchwarehouse", "cr714_category",
      "cr714_competitor", "cr714_completedquoteattachment", "cr714_completedquoteattachmentcount",
      "cr714_completionnotes", "cr714_completiontime", "cr714_dateassigned", "cr714_datelockedin",
      "cr714_daterevised", "cr714_datesentbacktorepmdm", "cr714_datesentforrevision", "cr714_disposition",
      "cr714_fraudcheckcomplete", "cr714_fraudcheckcompletename", "cr714_fraudnotes", "cr714_grossprofitpercent",
      "cr714_hasanyattachment", "cr714_hasanyattachmentname", "cr714_hascompletedquoteattachment",
      "cr714_hascompletedquoteattachmentname", "cr714_hasrequestattachment", "cr714_hasrequestattachmentname",
      "cr714_isquoteneeded", "cr714_isquoteneededname", "cr714_itemsawarded", "cr714_itemstoquote",
      "cr714_mdmduedate", "cr714_multiplier", "cr714_numberofchanges", "cr714_ppl", "cr714_quoter",
      "cr714_quoterduedate", "cr714_requestattachment", "cr714_requestattachmentcount", "cr714_requestnotes",
      "cr714_requestorname", "cr714_requestsource", "cr714_revisedby", "cr714_sentinsentout", "cr714_sourcefile",
      "cr714_sourceid", "cr714_sourcemodifiedon", "cr714_sourcesheet", "cr714_starttime", "cr714_submitteremail",
      "cr714_submittername", "cr714_totalattachmentcount", "cr714_totalitemsquotedbid", "cr714_wbsellpricetotal",
      "cr714_wbsellpricetotal_base",
    ],
  },
};

// Every value is stored as plain text, exactly as exported. Dates become "2026-11-02 14:05:00".
function cleanValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const pad = (part) => String(part).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  const text = String(value).trim();
  return text === "" ? null : text;
}

function rowHash(record, columns) {
  return createHash("sha256").update(JSON.stringify(columns.map((column) => record[column] ?? null))).digest("hex");
}

// Works out a simple stage for each row, for filters and counts.
function stageOf(logKey, record) {
  if (logKey === "quote") {
    if (record.cr714_datereturnedorkilled) return "Returned or killed";
    if (record.cr714_assignedto || record.cr714_dateassigned) return "Assigned";
    if (record.cr714_datequalified) return "Qualified";
    return "New";
  }
  if (record.cr714_datesentbacktorepmdm) return "Sent back";
  if (record.cr714_assignedto || record.cr714_quoter || record.cr714_dateassigned) return "Assigned";
  return "New";
}

// Main entry point: give it the xlsx file's contents. It finds the Quote Log and/or
// MDM Log tab by their ID column, whatever the tabs or the file are called.
function parseDataverseExport(buffer) {
  if (!(buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b)) {
    const error = new Error("Upload the .xlsx export (not a CSV or another file type).");
    error.status = 400;
    throw error;
  }
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const found = [];
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: true });
    if (!rows.length) continue;
    const headers = Object.keys(rows[0]).map((header) => header.trim());
    const logKey = Object.keys(LOGS).find((key) => headers.includes(LOGS[key].idColumn));
    if (!logKey) continue;
    const log = LOGS[logKey];
    const known = new Set([log.idColumn, ...log.columns]);
    const records = [];
    let skipped = 0;
    for (const row of rows) {
      const record = {};
      for (const [header, value] of Object.entries(row)) {
        const column = header.trim();
        if (known.has(column)) record[column] = cleanValue(value);
      }
      if (!record[log.idColumn]) {
        skipped += 1;
        continue;
      }
      record.qf_row_hash = rowHash(record, log.columns);
      records.push(record);
    }
    found.push({
      logKey,
      label: log.label,
      sheetName,
      records,
      skipped,
      missingColumns: log.columns.filter((column) => !headers.includes(column)),
      extraColumns: headers.filter((header) => !known.has(header)),
    });
  }
  if (!found.length) {
    const error = new Error(`No Quote Log or MDM Log found. The file needs a column named cr714_quotelogid or cr714_mdmlogid. Tabs found: ${workbook.SheetNames.join(", ")}.`);
    error.status = 400;
    throw error;
  }
  return found;
}

module.exports = { LOGS, parseDataverseExport, stageOf };

// Run directly to check an export without starting the app:
//   node dataverse-logs.js sample-files/your-export.xlsx
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log("Usage: node dataverse-logs.js path/to/export.xlsx");
    process.exit(1);
  }
  for (const result of parseDataverseExport(require("node:fs").readFileSync(filePath))) {
    console.log(`\n${result.label}  (tab "${result.sheetName}")`);
    console.log(`  Rows found: ${result.records.length}   Rows without an ID (skipped): ${result.skipped}`);
    console.log(`  Columns missing: ${result.missingColumns.length ? result.missingColumns.join(", ") : "none"}`);
    console.log(`  Extra columns (ignored): ${result.extraColumns.length ? result.extraColumns.join(", ") : "none"}`);
    const stages = {};
    for (const record of result.records) {
      const stage = stageOf(result.logKey, record);
      stages[stage] = (stages[stage] || 0) + 1;
    }
    console.log(`  Stages: ${Object.entries(stages).map(([stage, count]) => `${stage} ${count}`).join(", ")}`);
  }
}
