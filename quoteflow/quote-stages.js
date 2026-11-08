// Quote stages: the stage-by-stage quote screen.
//   1 Extract & verify   read each saved file with OCR, check every line against the file
//   2 Match our items    our item and UOM for each line; earlier matches are suggested
//   3 Pricing files      customer account, house account and costing report, one at a time
//   4 Price              in the quote's template layout; the cross-reference runs in the background
//   5 Review & submit    customer notes, totals, exports, submit
//
// The template the qualifier picked (quote-templates.js) decides the columns.
// Files are never deleted: removing one archives it, and it can still be opened.

const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const xref = require("./xref");
const ocr = require("./ocr");
const templates = require("./quote-templates");

// ---------------------------------------------------------------- the rules (pure, testable)

const MANUAL_TAGS = ["Combo pack", "Combo pack total", "Suggested alternative", "Item N/A", "Blind", "Couldn't quote section",
  "Look at this", "Current price on account", "Base cost"];
// Only "We don't carry" is offered on the page now; the others stay readable for older quotes.
const LINE_STATUSES = {
  "We don't carry": { ourItem: "Item Not Available", description: "N/A" },
  "Need more info": { ourItem: "NEED INFO", description: null },
  Furniture: { ourItem: "N/A", description: "Contact Sales Rep for Furniture Quote" },
  Tech: { ourItem: "N/A", description: "Contact Sales Rep for Tech Quote" },
  "Custom print": { ourItem: "N/A", description: "Contact Sales Rep for Custom Print Quote" },
  Exception: { ourItem: "N/A", description: "Item Not Available" },
};
const CUSTOMER_NOTES = [
  "*Difference in Unit of Measure", "*Closest Comparable Option", "*Suggested Alternative",
  "*Unit Of Measure Shown In Ounces/Sheets/Feet/Yield/Yards", "*Items Sold Separately",
  "*Competitor Price Updated to Reflect Current Amazon Price",
];
const LARGE_OPPORTUNITY_QTY = 20;
const LARGE_OPPORTUNITY_CATEGORY = /jan\s*-?\s*san|janitorial|food/i;
const PACK_SHIP_CATEGORY = /pack/i;
const CAPS_FIELDS = ["their_item", "their_uom", "our_item", "our_uom"];

const num = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const tagsOf = (line) => {
  try { return Array.isArray(line.tags) ? line.tags : JSON.parse(line.tags_json || "[]"); } catch { return []; }
};

// A line is priced when it has our item and isn't marked as something we don't quote.
function isPriced(line) {
  const tags = tagsOf(line);
  return Boolean(line.our_item && line.our_uom && !line.line_status && !tags.includes("Item N/A"));
}

// Every unit of measure each item has in the uploaded pricing files: { ITEM: Set(UOMs) }.
function uomsByItem(pricingFiles) {
  const found = new Map();
  for (const kind of ["account", "house", "costing"]) {
    const file = pricingFiles[kind];
    if (!file) continue;
    const { columns } = xref.mapColumns(file.headers, kind);
    if (!columns.item || !columns.uom) continue;
    for (const row of file.rows) {
      const item = String(row[columns.item] ?? "").trim().toUpperCase();
      const uom = String(row[columns.uom] ?? "").trim().toUpperCase();
      if (!item || !uom) continue;
      if (!found.has(item)) found.set(item, new Set());
      found.get(item).add(uom);
    }
  }
  return found;
}

// Runs the cross-reference engine on the quote's lines and adds the quoter's prices.
function computeQuote(lines, pricingFiles, costColumn) {
  const priced = lines.filter(isPriced);
  const files = {
    items: { headers: ["Items", "UMs", "Qty"], rows: priced.map((l) => ({ Items: l.our_item, UMs: l.our_uom, Qty: num(l.qty) ?? "" })) },
    ...pricingFiles,
  };
  const engine = xref.crossReference(files, { costColumn: costColumn ?? xref.DEFAULT_COSTING_COST_COLUMN });
  const byLineId = new Map(priced.map((line, index) => [line.id, engine.lines[index]]));
  const knownUoms = uomsByItem(pricingFiles);

  let sellTotal = 0; let costTotal = 0; let savingsTotal = 0;
  const out = lines.map((line) => {
    const x = byLineId.get(line.id) || null;
    const qty = num(line.qty);
    const units = qty ?? 1;
    const sell = num(line.sell_price);
    const cost = x ? x.financialCost : null;
    const theirPrice = num(line.their_price);
    const target = num(line.target_margin);
    const margin = sell && cost !== null ? (sell - cost) / sell : null;
    const tags = tagsOf(line);
    const auto = [];
    if (x?.reviewNeeded === "Yes") auto.push("Deviation");
    if (x && PACK_SHIP_CATEGORY.test(x.category || "")) auto.push("Pack Ship");
    if (qty !== null && qty >= LARGE_OPPORTUNITY_QTY && LARGE_OPPORTUNITY_CATEGORY.test(x?.category || "")) auto.push("Large opportunity");
    // Yellow: our item is in the pricing files, but not in the unit of measure on this line (CS vs CT).
    let uomMismatch = null;
    if (x && !x.found.account && !x.found.house && !x.found.costing) {
      const uoms = knownUoms.get(String(line.our_item).trim().toUpperCase());
      if (uoms && uoms.size && !uoms.has(String(line.our_uom).trim().toUpperCase())) uomMismatch = [...uoms].sort();
    }
    if (sell !== null && cost !== null) { sellTotal += sell * units; costTotal += cost * units; }
    const blind = tags.includes("Blind");
    if (sell !== null && theirPrice !== null && !blind) savingsTotal += (theirPrice - sell) * units;
    return {
      ...line,
      tags,
      autoTags: auto,
      uomMismatch,
      calc: x ? {
        ourDescription: x.description, category: x.category, accountPrice: x.price, cost, costSource: x.costSource,
        pricingMethod: x.pricingMethod, itemStatus: x.status, substitute: x.substitute, catalogPrice: x.catalogPrice,
        reviewNeeded: x.reviewNeeded, found: x.found,
      } : null,
      margin,
      gp: sell !== null && cost !== null ? (sell - cost) * units : null,
      priceAtTarget: target && cost !== null && target < 1 ? xref.roundUp2(cost / (1 - target)) : null,
      priceAt25Margin: cost !== null ? xref.roundUp2(cost / 0.75) : null,
      savings: sell !== null && theirPrice !== null && !blind ? theirPrice - sell : null,
    };
  });

  const naCount = out.filter((l) => l.tags.includes("Item N/A") || l.line_status === "We don't carry").length;
  return {
    lines: out,
    summary: {
      lines: out.length,
      priced: out.filter((l) => l.calc).length,
      withSellPrice: out.filter((l) => l.calc && num(l.sell_price) !== null).length,
      sellTotal, costTotal, gp: sellTotal - costTotal,
      margin: sellTotal ? (sellTotal - costTotal) / sellTotal : null,
      savingsTotal,
      negative: out.filter((l) => l.margin !== null && l.margin < 0).length,
      lookAt: out.filter((l) => l.tags.includes("Look at this")).length,
      uomMismatch: out.filter((l) => l.uomMismatch).length,
      naCount,
      couldntQuoteSection: naCount >= 3,
    },
  };
}

// Earlier matches for a competitor item, most used first (up to 3).
function suggestionsFor(line, matches) {
  const item = String(line.their_item || "").trim().toUpperCase();
  const uom = String(line.their_uom || "").trim().toUpperCase();
  if (!item) return [];
  return matches
    .filter((m) => m.their_item === item)
    .sort((a, b) => Number(b.their_uom === uom) - Number(a.their_uom === uom) || b.times_used - a.times_used)
    .filter((m) => !(String(line.our_item || "").toUpperCase() === m.our_item && String(line.our_uom || "").toUpperCase() === (m.our_uom || "")))
    .slice(0, 3)
    .map((m) => ({ ourItem: m.our_item, ourUom: m.our_uom, timesUsed: m.times_used, lastUsedBy: m.last_used_by, theirUom: m.their_uom }));
}

// Load form: 18 columns, no header row, one row per item and UOM. Pack Ship, N/A and status lines are left out.
// C = 1, J = 0, O = N, exactly like the team's load form CSV.
function loadFormRows(computed, details) {
  const date = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    return m ? `${Number(m[2])}/${Number(m[3])}/${m[1]}` : String(iso || "");
  };
  const seen = new Set();
  const rows = [];
  for (const line of computed.lines) {
    if (!isPriced(line) || num(line.sell_price) === null) continue;
    if (line.autoTags.includes("Pack Ship")) continue;
    const key = `${line.our_item}|${line.our_uom}`.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const price = Math.round(num(line.sell_price) * 100) / 100;
    rows.push([
      details.contractNumber, details.description, "1", date(details.startDate), date(details.endDate),
      details.contractType, details.classification, String(line.our_item).toUpperCase(), String(line.our_uom).toUpperCase(),
      "0", String(price), "", "", "", "N", "", "", details.contractOwner,
    ]);
  }
  return rows;
}

// Favorites list: each item and UOM quoted, once.
function favoritesRows(computed) {
  const seen = new Set();
  return computed.lines.filter((l) => l.our_item && l.our_uom && !l.line_status && !l.tags.includes("Item N/A")).filter((l) => {
    const key = `${l.our_item}|${l.our_uom}`.toUpperCase();
    return seen.has(key) ? false : seen.add(key);
  }).map((l) => [String(l.our_item).toUpperCase(), String(l.our_uom).toUpperCase()]);
}

const csvCell = (value) => (/[",\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value));

// The team's colors (Color Code Key). Row colors fill the whole line; cell colors fill one column.
const COLORS = {
  "Combo pack": "D9D9D9", "Combo pack total": "BFBFBF", "Suggested alternative": "C5E0B4", "Item N/A": "AEAAAA",
  "Pack Ship": "F4B084", Blind: "00FF00", Deviation: "8EA9DB", "Base cost": "92D050", "Current price on account": "FFE699",
  "Large opportunity": "00B0F0", "Look at this": "FF0000",
};
const ROW_TAGS = ["Item N/A", "Combo pack total", "Combo pack", "Suggested alternative"];

// Colors for one line: { row: hex|null, cells: { field: hex }, red: bool }.
function lineColors(line, audience) {
  const tags = [...(line.autoTags || []), ...(line.tags || [])];
  const rowTag = line.line_status === "We don't carry" ? "Item N/A" : ROW_TAGS.find((t) => tags.includes(t));
  const cells = {};
  if (tags.includes("Pack Ship")) cells.our_item = COLORS["Pack Ship"];
  if (tags.includes("Blind")) cells.our_item = COLORS.Blind;
  if (audience === "internal") {
    if (tags.includes("Deviation")) cells.cost = COLORS.Deviation;
    if (tags.includes("Base cost")) cells.cost = COLORS["Base cost"];
    if (tags.includes("Current price on account")) cells.sell = COLORS["Current price on account"];
    if (tags.includes("Large opportunity")) cells.qty = COLORS["Large opportunity"];
  }
  return { row: rowTag ? COLORS[rowTag] : null, cells, red: audience === "internal" && tags.includes("Look at this") };
}

// Builds the customer or internal workbook in the quote's template (ExcelJS keeps the colors).
async function templateWorkbook(state, audience) {
  const ExcelJS = require("exceljs");
  const t = state.template;
  const columns = audience === "internal" ? [...t.customer, ...t.internal] : t.customer;
  const book = new ExcelJS.Workbook();
  const sheetName = (state.quote.accountNumber || "Quote").replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Quote";
  const header = (sheet) => {
    sheet.getCell("A1").value = "Order with us today! Here are our Amazingly Low Prices!";
    sheet.getCell("A1").font = { bold: true, size: 14 };
    sheet.getCell("A2").value = [state.quote.accountNumber, state.quote.accountName].filter(Boolean).join(" - ");
    sheet.getCell("A3").value = `Date of Quote: ${new Date().toLocaleDateString("en-US")}`;
    sheet.getCell("A4").value = state.quote.repName ? `Personal Sales Representative: ${state.quote.repName}${state.quote.repEmail ? ` · ${state.quote.repEmail}` : ""}` : "";
    const row = sheet.getRow(5);
    columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true };
      cell.alignment = { wrapText: true, vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i >= t.customer.length ? "FFE7E6E6" : "FFDDEBF7" } };
    });
    columns.forEach((c, i) => { sheet.getColumn(i + 1).width = Math.min(Math.max(c.header.length * 0.9, 10), 32); });
  };
  const fill = (hex) => ({ type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } });
  const write = (sheet, lines) => {
    lines.forEach((line, i) => {
      const values = templates.lineValues(line, line.__index ?? i, t);
      const colors = lineColors(line, audience);
      const row = sheet.getRow(6 + i);
      columns.forEach((c, ci) => {
        const cell = row.getCell(ci + 1);
        const v = values[c.field];
        cell.value = v === null || v === undefined ? null : v;
        if (templates.PERCENT_FIELDS.has(c.field)) cell.numFmt = "0.0%";
        else if (templates.MONEY_FIELDS.has(c.field)) cell.numFmt = "$#,##0.00";
        const hex = colors.cells[c.field] || colors.row;
        if (hex) cell.fill = fill(hex);
        if (colors.red) cell.font = { color: { argb: "FFC00000" }, bold: true };
      });
      if (audience === "internal" && line.comment) row.getCell(1).note = String(line.comment);
      row.commit();
    });
  };

  const moved = (l) => audience === "customer" && ((state.summary.couldntQuoteSection && (l.tags.includes("Item N/A") || l.line_status === "We don't carry")) || l.tags.includes("Couldn't quote section"));
  const indexed = state.lines.map((l, i) => Object.assign(l, { __index: i }));
  const main = book.addWorksheet(sheetName);
  header(main);
  write(main, indexed.filter((l) => !moved(l)));
  const movedLines = indexed.filter(moved);
  if (movedLines.length) {
    const na = book.addWorksheet("N/A");
    header(na);
    write(na, movedLines);
  }
  return book.xlsx.writeBuffer();
}

module.exports = { computeQuote, loadFormRows, favoritesRows, isPriced, suggestionsFor, uomsByItem, lineColors, templateWorkbook,
  MANUAL_TAGS, LINE_STATUSES, CUSTOMER_NOTES, COLORS, register };

// ---------------------------------------------------------------- the routes

function register(app, { auth, database, multer, requestUpload, writeQuoteFile, uploadsRoot }) {
  const knex = database.connection;
  const access = auth.requireRole("Quoter", "Manager", "Qualifier", "Reviser", "Margin Manager");
  const pricingUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024, files: 1 } });
  const now = () => Math.floor(Date.now() / 1000);
  const fail = (response, status, message) => response.status(status).json({ error: message });

  async function ensureState(quoteId) {
    let state = await knex("qs_quotes").where({ quote_id: quoteId }).first();
    if (!state) {
      state = { quote_id: quoteId, stage: 1, cost_column: null, submit_note: null, updated_at: now() };
      await knex("qs_quotes").insert(state);
    }
    return state;
  }

  async function loadPricingFiles(quoteId) {
    const rows = await knex("qs_pricing_files").where({ quote_id: quoteId });
    const files = {};
    const info = {};
    for (const row of rows) {
      files[row.kind] = { headers: JSON.parse(row.headers_json || "[]"), rows: JSON.parse(row.rows_json || "[]") };
      info[row.kind] = { fileName: row.file_name, rows: row.row_count, uploadedAt: row.uploaded_at };
    }
    return { files, info };
  }

  async function companyName() {
    const row = await knex("settings").where({ key: "template_company_name" }).first();
    return row ? row.value : "";
  }

  async function fullState(quoteId) {
    const detail = await database.quotes.getDetail(quoteId);
    if (!detail) return null;
    const state = await ensureState(quoteId);
    const quoteRow = await knex("quotes").where({ id: quoteId }).first();
    const rep = quoteRow && quoteRow.submitted_by_rep ? await knex("users").where({ id: quoteRow.submitted_by_rep }).first() : null;
    const files = await knex("quote_files").where({ quote_id: quoteId }).orderBy("uploaded_at")
      .select("id", "file_name as fileName", "file_type as fileType", "uploaded_at as uploadedAt", "archived_at as archivedAt");
    const lines = await knex("qs_lines").where({ quote_id: quoteId }).orderBy("position");
    const pricing = await loadPricingFiles(quoteId);
    const computed = computeQuote(lines, pricing.files, state.cost_column);
    const template = templates.describe(templates.getTemplate(quoteRow ? quoteRow.template_key : null), await companyName());

    // Earlier matches for each competitor item: shown as suggestions under the line.
    const wanted = [...new Set(lines.filter((l) => l.their_item).map((l) => String(l.their_item).toUpperCase()))];
    const matches = wanted.length ? await knex("item_matches").whereIn("their_item", wanted) : [];
    computed.lines.forEach((line, index) => {
      line.suggestions = suggestionsFor(line, matches);
      line.view = templates.lineValues(line, index, template);
    });

    return {
      quote: {
        id: detail.id, number: detail.quote_number, status: detail.status, type: detail.quoteType,
        accountNumber: detail.accountNumber, accountName: detail.accountName || detail.company_name, ppl: detail.pplName, assignedTo: detail.assignedToName,
        assignedQuoterId: quoteRow ? quoteRow.assigned_quoter_id : null, specialty: quoteRow ? quoteRow.specialty : null,
        repName: rep ? rep.name : null, repEmail: rep ? rep.email : null,
      },
      template,
      templates: templates.TEMPLATES.map((t) => ({ key: t.key, name: t.name, when: t.when })),
      stage: state.stage,
      submitNote: state.submit_note || "",
      costColumn: state.cost_column === null ? xref.DEFAULT_COSTING_COST_COLUMN : state.cost_column,
      costingHeaders: pricing.files.costing ? pricing.files.costing.headers : [],
      pricingFiles: pricing.info,
      files: files.map((f) => ({ ...f, url: `/api/quotes/${encodeURIComponent(quoteId)}/files/${encodeURIComponent(f.id)}` })),
      ...computed,
      options: { tags: MANUAL_TAGS, notes: CUSTOMER_NOTES },
    };
  }

  const sendState = async (response, quoteId) => {
    const state = await fullState(quoteId);
    if (!state) return fail(response, 404, "Quote not found.");
    response.set("Cache-Control", "no-store");
    return response.json(state);
  };

  app.get("/api/qs/:id", access, async (request, response) => sendState(response, request.params.id));

  // Add a file. It's saved with the quote and never deleted.
  app.post("/api/qs/:id/files", access, requestUpload.single("file"), async (request, response) => {
    if (!request.file) return fail(response, 400, "Choose a file to add.");
    const detail = await database.quotes.getDetail(request.params.id);
    if (!detail) return fail(response, 404, "Quote not found.");
    const fileId = randomUUID();
    const stored = await writeQuoteFile(request.file, fileId);
    await database.quotes.addFile({ quoteId: detail.id, user: request.user,
      file: { id: fileId, fileName: stored.fileName, fileType: stored.fileType, fileHash: stored.fileHash, storageKey: stored.storageKey } });
    return sendState(response, request.params.id);
  });

  // Archive instead of delete: hidden from the working list, still saved and openable.
  app.post("/api/qs/:id/files/:fileId/archive", access, async (request, response) => {
    const archive = request.body?.archived !== false;
    await knex("quote_files").where({ id: request.params.fileId, quote_id: request.params.id })
      .update({ archived_at: archive ? now() : null, archived_by_id: archive ? request.user.id : null });
    return sendState(response, request.params.id);
  });

  // Read one file with OCR. Unconfirmed lines from the same file are replaced; confirmed lines are kept.
  app.post("/api/qs/:id/files/:fileId/extract", access, async (request, response) => {
    const file = await knex("quote_files").where({ id: request.params.fileId, quote_id: request.params.id }).first();
    if (!file || !file.storage_key) return fail(response, 404, "File not found.");
    const absolutePath = path.join(uploadsRoot, file.storage_key);
    if (!absolutePath.startsWith(path.join(uploadsRoot, "uploads"))) return fail(response, 400, "Invalid file location.");
    let result;
    try {
      result = await ocr.readDocument({ buffer: await fs.readFile(absolutePath), fileName: file.file_name });
    } catch (error) {
      return fail(response, error.status || 422, error.status ? error.message : "This file couldn't be read. Try a clearer copy.");
    }
    const up = (v) => (v === null || v === undefined || v === "" ? v : String(v).toUpperCase());
    await knex.transaction(async (trx) => {
      await trx("qs_lines").where({ quote_id: request.params.id, file_id: file.id, confirmed: false }).delete();
      const last = await trx("qs_lines").where({ quote_id: request.params.id }).max({ max: "position" }).first();
      let position = Number(last?.max || 0);
      const rows = result.items.map((item) => ({
        id: randomUUID(), quote_id: request.params.id, position: (position += 1), file_id: file.id, source_text: item.source,
        their_item: up(item.item), description: item.description, qty: item.qty, their_uom: up(item.uom), their_price: item.unitPrice,
        their_extended: item.extended, confirmed: false, tags_json: "[]", updated_by_id: request.user.id, updated_at: now(),
      }));
      for (let start = 0; start < rows.length; start += 50) await trx("qs_lines").insert(rows.slice(start, start + 50));
    });
    const state = await fullState(request.params.id);
    state.extraction = { fileName: file.file_name, engine: result.engine, found: result.summary.found, needsReview: result.summary.needsReview,
      confidence: result.confidence, warnings: result.warnings, totalsMatch: result.summary.totalsMatch, statedTotal: result.summary.statedTotal, linesTotal: result.summary.linesTotal };
    response.set("Cache-Control", "no-store");
    return response.json(state);
  });

  // Save every line at once (the page always sends the full list, in its saved order).
  const EDITABLE = ["file_id", "source_text", "their_item", "description", "qty", "their_uom", "their_price", "their_extended", "confirmed",
    "our_item", "our_uom", "line_status", "sell_price", "target_margin", "comment", "customer_note"];
  app.put("/api/qs/:id/lines", access, async (request, response) => {
    const incoming = Array.isArray(request.body?.lines) ? request.body.lines.slice(0, 1000) : null;
    if (!incoming) return fail(response, 400, "No lines sent.");
    const quote = await knex("quotes").where({ id: request.params.id }).first();
    if (!quote) return fail(response, 404, "Quote not found.");
    const text = (v, max) => (v === null || v === undefined || String(v).trim() === "" ? null : String(v).trim().slice(0, max));
    const rows = incoming.map((line, index) => {
      const row = { id: /^[0-9a-f-]{36}$/i.test(line.id || "") ? line.id : randomUUID(), quote_id: quote.id, position: index + 1,
        updated_by_id: request.user.id, updated_at: now() };
      for (const field of EDITABLE) {
        if (["qty", "their_price", "their_extended", "sell_price", "target_margin"].includes(field)) row[field] = num(line[field]);
        else if (field === "confirmed") row[field] = Boolean(line[field]);
        else if (["source_text", "description", "comment"].includes(field)) row[field] = text(line[field], 4000);
        else row[field] = text(line[field], field === "customer_note" ? 160 : 120);
        if (CAPS_FIELDS.includes(field) && row[field]) row[field] = row[field].toUpperCase();
      }
      if (row.line_status && !LINE_STATUSES[row.line_status]) row.line_status = null;
      if (row.target_margin !== null && !(row.target_margin > 0 && row.target_margin < 1)) row.target_margin = null;
      row.tags_json = JSON.stringify((Array.isArray(line.tags) ? line.tags : []).filter((tag) => MANUAL_TAGS.includes(tag)));
      return row;
    });
    await knex.transaction(async (trx) => {
      await trx("qs_lines").where({ quote_id: quote.id }).delete();
      for (let start = 0; start < rows.length; start += 50) await trx("qs_lines").insert(rows.slice(start, start + 50));
    });
    await knex("qs_quotes").where({ quote_id: quote.id }).update({ updated_at: now() });
    return sendState(response, quote.id);
  });

  // Move between stages, choose the cost column, keep the note for the reviser.
  // Leaving stage 2 remembers the matches for the next quote.
  app.put("/api/qs/:id/state", access, async (request, response) => {
    const state = await ensureState(request.params.id);
    const changes = { updated_at: now() };
    const stage = Number(request.body?.stage);
    if (Number.isInteger(stage) && stage >= 1 && stage <= 5) changes.stage = stage;
    if (typeof request.body?.costColumn === "string") changes.cost_column = request.body.costColumn.slice(0, 80);
    if (typeof request.body?.submitNote === "string") changes.submit_note = request.body.submitNote.slice(0, 2000);
    await knex("qs_quotes").where({ quote_id: request.params.id }).update(changes);
    if (typeof request.body?.templateKey === "string" && templates.TEMPLATES.some((t) => t.key === request.body.templateKey)) {
      await knex("quotes").where({ id: request.params.id }).update({ template_key: request.body.templateKey });
    }
    if (state.stage === 2 && changes.stage > 2) {
      const lines = await knex("qs_lines").where({ quote_id: request.params.id }).whereNotNull("their_item").whereNotNull("our_item");
      for (const line of lines) {
        const key = { their_item: String(line.their_item).toUpperCase(), their_uom: String(line.their_uom || "").toUpperCase() };
        const existing = await knex("item_matches").where(key).first();
        const values = { our_item: String(line.our_item).toUpperCase(), our_uom: line.our_uom ? String(line.our_uom).toUpperCase() : null,
          last_used_by: request.user.name, last_used_at: now() };
        if (existing) await knex("item_matches").where({ id: existing.id }).update({ ...values, times_used: existing.times_used + 1 });
        else await knex("item_matches").insert({ ...key, ...values, times_used: 1 });
      }
    }
    return sendState(response, request.params.id);
  });

  // Upload one pricing file: account, house or costing.
  app.post("/api/qs/:id/pricing/:kind", access, pricingUpload.single("file"), async (request, response) => {
    const { id, kind } = request.params;
    if (!["account", "house", "costing"].includes(kind)) return fail(response, 404, "Unknown file type.");
    if (!request.file) return fail(response, 400, "Choose an .xlsx or .csv file.");
    let parsed;
    try {
      parsed = xref.readUpload(request.file.buffer, kind);
    } catch (error) {
      return fail(response, error.status || 400, error.status ? error.message : "That file couldn't be read.");
    }
    await knex.transaction(async (trx) => {
      await trx("qs_pricing_files").where({ quote_id: id, kind }).delete();
      await trx("qs_pricing_files").insert({ quote_id: id, kind, file_name: request.file.originalname.slice(0, 255), row_count: parsed.rows.length,
        headers_json: JSON.stringify(parsed.headers), rows_json: JSON.stringify(parsed.rows), uploaded_by_id: request.user.id, uploaded_at: now() });
    });
    return sendState(response, id);
  });

  // Exports: customer and internal files in the quote's template, favorites list (Excel), load form (CSV, no header row).
  app.get("/api/qs/:id/export/:variant", access, async (request, response) => {
    const state = await fullState(request.params.id);
    if (!state) return fail(response, 404, "Quote not found.");
    const variant = request.params.variant;
    const safe = String(state.quote.number || "quote").replace(/[^A-Za-z0-9 _-]/g, "");
    let buffer;
    if (variant === "favorites") {
      const ExcelJS = require("exceljs");
      const book = new ExcelJS.Workbook();
      const sheet = book.addWorksheet("FAVORITE LIST");
      sheet.addRow(["Item #", "UOM"]).font = { bold: true };
      for (const row of favoritesRows(state)) sheet.addRow(row);
      sheet.getColumn(1).width = 18; sheet.getColumn(2).width = 10;
      buffer = await book.xlsx.writeBuffer();
    } else if (variant === "customer" || variant === "internal") {
      buffer = await templateWorkbook(state, variant);
    } else {
      return fail(response, 404, "Unknown export.");
    }
    await knex("quote_exports").insert({ id: randomUUID(), quote_id: state.quote.id, kind: variant, exported_by_id: request.user.id, exported_at: now() }).catch(() => {});
    const label = { customer: "customer quote", internal: "internal", favorites: "favorites list" }[variant];
    response.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.set("Content-Disposition", `attachment; filename="${safe} - ${label}.xlsx"`);
    return response.send(Buffer.from(buffer));
  });

  app.post("/api/qs/:id/export/load-form", access, async (request, response) => {
    const state = await fullState(request.params.id);
    if (!state) return fail(response, 404, "Quote not found.");
    const b = request.body || {};
    const details = {
      contractNumber: String(b.contractNumber || "").trim(), description: String(b.description || "").trim(),
      startDate: String(b.startDate || "").trim(), endDate: String(b.endDate || "").trim(),
      contractType: String(b.contractType || "").trim(), classification: String(b.classification || "").trim(),
      contractOwner: String(b.contractOwner || "Contract owner").trim(),
    };
    const missing = ["contractNumber", "startDate", "endDate", "contractType", "classification"].filter((k) => !details[k]);
    if (missing.length) return fail(response, 400, "Fill in the contract number, dates, contract type and classification.");
    const rows = loadFormRows(state, details);
    if (!rows.length) return fail(response, 400, "No lines are ready: each needs our item, UOM and a sell price.");
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
    await knex("quote_exports").insert({ id: randomUUID(), quote_id: state.quote.id, kind: "load-form", exported_by_id: request.user.id, exported_at: now() }).catch(() => {});
    const safe = String(state.quote.number || "quote").replace(/[^A-Za-z0-9 _-]/g, "");
    response.set("Content-Type", "text/csv");
    response.set("Content-Disposition", `attachment; filename="Load Form - ${state.quote.accountNumber || ""} - ${safe}.csv"`);
    return response.send(csv);
  });

  return { fullState };
}
