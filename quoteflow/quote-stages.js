// Quote stages: the stage-by-stage quote screen.
//   1 Extract & verify   read each saved file with OCR, check every line against the file
//   2 Match our items    our item and UOM for each line; matches are remembered for next time
//   3 Pricing files      customer account, house account and costing report, one at a time
//   4 Price              cross-reference engine (xref.js) + the quoter's sell prices and tags
//   5 Review & submit    totals, exports (customer file, internal file, favorites list, load form), submit
//
// Files are never deleted: removing one archives it, and it can still be opened.

const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const xref = require("./xref");
const ocr = require("./ocr");

// ---------------------------------------------------------------- the rules (pure, testable)

const MANUAL_TAGS = ["Combo pack", "Combo pack total", "Suggested alternative", "Item N/A", "Blind", "Couldn't quote section",
  "Look at this", "Current price on account", "Base cost"];
const LINE_STATUSES = {
  "Need more info": { ourItem: "NEED INFO", description: null },
  Furniture: { ourItem: "N/A", description: "Contact Sales Rep for Furniture Quote" },
  Tech: { ourItem: "N/A", description: "Contact Sales Rep for Tech Quote" },
  "Custom print": { ourItem: "N/A", description: "Contact Sales Rep for Custom Print Quote" },
  Exception: { ourItem: "N/A", description: "Item Not Available" },
  "We don't carry": { ourItem: "Item Not Available", description: "N/A" },
};
const CUSTOMER_NOTES = [
  "*Difference in Unit of Measure", "*Closest Comparable Option", "*Suggested Alternative",
  "*Unit Of Measure Shown In Ounces/Sheets/Feet/Yield/Yards", "*Items Sold Separately",
  "*Competitor Price Updated to Reflect Current Amazon Price",
];
const LARGE_OPPORTUNITY_QTY = 20;
const LARGE_OPPORTUNITY_CATEGORY = /jan\s*-?\s*san|janitorial|food/i;
const PACK_SHIP_CATEGORY = /pack/i;

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

// Runs the cross-reference engine on the quote's lines and adds the quoter's prices.
function computeQuote(lines, pricingFiles, costColumn) {
  const priced = lines.filter(isPriced);
  const files = {
    items: { headers: ["Items", "UMs", "Qty"], rows: priced.map((l) => ({ Items: l.our_item, UMs: l.our_uom, Qty: num(l.qty) ?? "" })) },
    ...pricingFiles,
  };
  const engine = xref.crossReference(files, { costColumn: costColumn ?? xref.DEFAULT_COSTING_COST_COLUMN });
  const byLineId = new Map(priced.map((line, index) => [line.id, engine.lines[index]]));

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
    if (sell !== null && cost !== null) { sellTotal += sell * units; costTotal += cost * units; }
    const blind = tags.includes("Blind");
    if (sell !== null && theirPrice !== null && !blind) savingsTotal += (theirPrice - sell) * units;
    return {
      ...line,
      tags,
      autoTags: auto,
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

  const naCount = out.filter((l) => l.tags.includes("Item N/A")).length;
  return {
    lines: out,
    summary: {
      lines: out.length,
      priced: out.filter((l) => l.calc).length,
      withSellPrice: out.filter((l) => num(l.sell_price) !== null).length,
      sellTotal, costTotal, gp: sellTotal - costTotal,
      margin: sellTotal ? (sellTotal - costTotal) / sellTotal : null,
      savingsTotal,
      negative: out.filter((l) => l.margin !== null && l.margin < 0).length,
      lookAt: out.filter((l) => l.tags.includes("Look at this")).length,
      naCount,
      couldntQuoteSection: naCount >= 3,
    },
  };
}

// Load form: 18 columns, no header row, one row per item and UOM. Pack Ship, N/A and status lines are left out.
// Columns C, J and L to Q are blank on the Load Form tab of the color key and stay blank here.
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
      details.contractNumber, details.description, "", date(details.startDate), date(details.endDate),
      details.contractType, details.classification, String(line.our_item).toUpperCase(), String(line.our_uom).toUpperCase(),
      "", String(price), "", "", "", "", "", "", details.contractOwner,
    ]);
  }
  return rows;
}

const csvCell = (value) => (/[",\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value));

module.exports = { computeQuote, loadFormRows, isPriced, MANUAL_TAGS, LINE_STATUSES, CUSTOMER_NOTES, register };

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

  async function fullState(quoteId) {
    const detail = await database.quotes.getDetail(quoteId);
    if (!detail) return null;
    const state = await ensureState(quoteId);
    const files = await knex("quote_files").where({ quote_id: quoteId }).orderBy("uploaded_at")
      .select("id", "file_name as fileName", "file_type as fileType", "uploaded_at as uploadedAt", "archived_at as archivedAt");
    const lines = await knex("qs_lines").where({ quote_id: quoteId }).orderBy("position");
    const pricing = await loadPricingFiles(quoteId);
    const computed = computeQuote(lines, pricing.files, state.cost_column);

    // Remembered matches for lines that don't have our item yet.
    const wanted = lines.filter((l) => l.their_item && !l.our_item).map((l) => String(l.their_item).toUpperCase());
    const matches = wanted.length ? await knex("item_matches").whereIn("their_item", [...new Set(wanted)]) : [];
    for (const line of computed.lines) {
      if (line.our_item || !line.their_item) continue;
      const item = String(line.their_item).toUpperCase();
      const uom = String(line.their_uom || "").toUpperCase();
      const match = matches.find((m) => m.their_item === item && m.their_uom === uom) || matches.find((m) => m.their_item === item);
      if (match) line.remembered = { ourItem: match.our_item, ourUom: match.our_uom, timesUsed: match.times_used, lastUsedBy: match.last_used_by };
    }

    return {
      quote: {
        id: detail.id, number: detail.quote_number, status: detail.status, type: detail.quoteType, template: detail.template,
        accountNumber: detail.accountNumber, accountName: detail.accountName, ppl: detail.pplName, assignedTo: detail.assignedToName,
      },
      stage: state.stage,
      costColumn: state.cost_column === null ? xref.DEFAULT_COSTING_COST_COLUMN : state.cost_column,
      costingHeaders: pricing.files.costing ? pricing.files.costing.headers : [],
      pricingFiles: pricing.info,
      files: files.map((f) => ({ ...f, url: `/api/quotes/${encodeURIComponent(quoteId)}/files/${encodeURIComponent(f.id)}` })),
      ...computed,
      options: { tags: MANUAL_TAGS, statuses: Object.keys(LINE_STATUSES), notes: CUSTOMER_NOTES },
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
    await knex.transaction(async (trx) => {
      await trx("qs_lines").where({ quote_id: request.params.id, file_id: file.id, confirmed: false }).delete();
      const last = await trx("qs_lines").where({ quote_id: request.params.id }).max({ max: "position" }).first();
      let position = Number(last?.max || 0);
      const rows = result.items.map((item) => ({
        id: randomUUID(), quote_id: request.params.id, position: (position += 1), file_id: file.id, source_text: item.source,
        their_item: item.item, description: item.description, qty: item.qty, their_uom: item.uom, their_price: item.unitPrice,
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

  // Save every line at once (the page always sends the full list).
  const EDITABLE = ["file_id", "source_text", "their_item", "description", "qty", "their_uom", "their_price", "their_extended", "confirmed",
    "our_item", "our_uom", "line_status", "sell_price", "target_margin", "comment", "customer_note"];
  app.put("/api/qs/:id/lines", access, async (request, response) => {
    const incoming = Array.isArray(request.body?.lines) ? request.body.lines.slice(0, 500) : null;
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
    return sendState(response, quote.id);
  });

  // Move between stages and choose the cost column. Leaving stage 2 remembers the matches.
  app.put("/api/qs/:id/state", access, async (request, response) => {
    const state = await ensureState(request.params.id);
    const changes = { updated_at: now() };
    const stage = Number(request.body?.stage);
    if (Number.isInteger(stage) && stage >= 1 && stage <= 5) changes.stage = stage;
    if (typeof request.body?.costColumn === "string") changes.cost_column = request.body.costColumn.slice(0, 80);
    if (typeof request.body?.submitNote === "string") changes.submit_note = request.body.submitNote.slice(0, 2000);
    await knex("qs_quotes").where({ quote_id: request.params.id }).update(changes);
    if (state.stage === 2 && changes.stage === 3) {
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

  // Exports: customer file, internal file and favorites list (Excel); load form (CSV, no header row).
  app.get("/api/qs/:id/export/:variant", access, async (request, response) => {
    const state = await fullState(request.params.id);
    if (!state) return fail(response, 404, "Quote not found.");
    const XLSX = require("xlsx");
    const book = XLSX.utils.book_new();
    const variant = request.params.variant;
    const money = (v) => (v === null || v === undefined ? "" : Math.round(v * 100) / 100);

    if (variant === "favorites") {
      const seen = new Set();
      const rows = state.lines.filter((l) => l.our_item && l.our_uom).filter((l) => {
        const key = `${l.our_item}|${l.our_uom}`.toUpperCase();
        return seen.has(key) ? false : seen.add(key);
      }).map((l) => ({ Item: String(l.our_item).toUpperCase(), UOM: String(l.our_uom).toUpperCase() }));
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Favorites list");
    } else if (variant === "internal") {
      const rows = state.lines.map((l, i) => ({
        "#": i + 1, "Their item": l.their_item, Description: l.description, Qty: num(l.qty), "Their UOM": l.their_uom, "Their price": money(num(l.their_price)),
        "Our item": l.our_item, "Our UOM": l.our_uom, "Our description": l.calc?.ourDescription || "", Status: l.line_status || "",
        "Financial cost": money(l.calc?.cost), "Cost from": l.calc?.costSource || "", "Account price": money(l.calc?.accountPrice),
        "Sell price": money(num(l.sell_price)), Margin: l.margin === null ? "" : Math.round(l.margin * 1000) / 10,
        "Target margin": num(l.target_margin) === null ? "" : num(l.target_margin) * 100, "Price at target": money(l.priceAtTarget),
        Savings: money(l.savings), Tags: [...l.tags, ...l.autoTags].join(", "), "Customer note": l.customer_note || "", "Internal comment": l.comment || "",
      }));
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Internal");
    } else if (variant === "customer") {
      const moved = (l) => (l.tags.includes("Item N/A") && state.summary.couldntQuoteSection) || l.tags.includes("Couldn't quote section");
      const row = (l, i) => {
        const status = l.line_status ? LINE_STATUSES[l.line_status] : null;
        const na = l.tags.includes("Item N/A");
        const blind = l.tags.includes("Blind");
        return {
          "#": i + 1, "Your item": l.their_item || "", "Your description": l.description || "", Qty: num(l.qty) ?? "", "Your UOM": l.their_uom || "",
          "Your price": blind ? "" : money(num(l.their_price)),
          "Our item": status ? status.ourItem : na ? "N/A" : (l.our_item || ""),
          "Our description": status ? (status.description || l.comment || "") : (l.calc?.ourDescription || ""),
          "Our UOM": status || na ? "" : (l.our_uom || ""),
          "Our price": status || na ? "" : money(num(l.sell_price)),
          Savings: blind || status || na ? "" : money(l.savings),
          "Extended savings": blind || status || na || l.savings === null || num(l.qty) === null ? "" : money(l.savings * num(l.qty)),
          Note: l.customer_note || "",
        };
      };
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(state.lines.filter((l) => !moved(l)).map(row)), "Quote");
      const movedLines = state.lines.filter(moved);
      if (movedLines.length) {
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(movedLines.map((l, i) => ({
          "#": i + 1, "Your item": l.their_item || "", "Your description": l.description || "", Note: "We weren't able to quote this item.",
        }))), "Items we couldn't quote");
      }
    } else {
      return fail(response, 404, "Unknown export.");
    }
    const safe = String(state.quote.number || "quote").replace(/[^A-Za-z0-9 _-]/g, "");
    const label = { customer: "customer quote", internal: "internal", favorites: "favorites list" }[variant];
    response.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.set("Content-Disposition", `attachment; filename="${safe} - ${label}.xlsx"`);
    return response.send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
  });

  app.post("/api/qs/:id/export/load-form", access, async (request, response) => {
    const state = await fullState(request.params.id);
    if (!state) return fail(response, 404, "Quote not found.");
    const b = request.body || {};
    const details = {
      contractNumber: String(b.contractNumber || "").trim(), description: String(b.description || "").trim(),
      startDate: String(b.startDate || "").trim(), endDate: String(b.endDate || "").trim(),
      contractType: String(b.contractType || "").trim(), classification: String(b.classification || "").trim(),
      contractOwner: String(b.contractOwner || "").trim(),
    };
    const missing = ["contractNumber", "startDate", "endDate", "contractType", "classification", "contractOwner"].filter((k) => !details[k]);
    if (missing.length) return fail(response, 400, "Fill in the contract number, dates, contract type, classification and contract owner.");
    const rows = loadFormRows(state, details);
    if (!rows.length) return fail(response, 400, "No lines are ready: each needs our item, UOM and a sell price.");
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
    const safe = String(state.quote.number || "quote").replace(/[^A-Za-z0-9 _-]/g, "");
    response.set("Content-Type", "text/csv");
    response.set("Content-Disposition", `attachment; filename="Load Form - ${state.quote.accountNumber || ""} - ${safe}.csv"`);
    return response.send(csv);
  });
}
