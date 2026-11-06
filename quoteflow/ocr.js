// OCR proof: reads a PDF or a photo and finds the item lines in it.
// Everything runs inside QuoteFlow. The file is read in memory and never saved or sent anywhere.
//
//   Digital PDFs (text can be selected) -> the text built into the PDF is read directly.
//   Photos, screenshots and scans       -> Tesseract.js (open-source OCR) turns the image into text.
//
// Later, the company's Azure AI Document Intelligence replaces this for invoices and tables.

const path = require("node:path");

// Units of measure the line finder recognizes. Add more as you find them.
const UOMS = new Set([
  "EA", "EACH", "BX", "BOX", "CS", "CASE", "CT", "CTN", "CARTON", "PK", "PKG", "PACK", "DZ", "DOZ", "RM", "REAM",
  "RL", "ROLL", "PR", "PAIR", "ST", "SET", "BG", "BAG", "CA", "GAL", "GL", "LB", "OZ", "FT", "YD", "TB", "TUBE",
  "BT", "BTL", "JR", "KT", "KIT", "PL", "PAIL", "DR", "DRUM", "SH", "SHEET", "PD", "PAD", "BK", "BOOK", "CD", "SL",
]);

// Lines containing these words are totals or headings, not items.
const SKIP_WORDS = /\b(sub\s*total|total|tax|shipping|freight|balance|amount due|invoice|page \d|remit|terms|thank you)\b/i;

const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".bmp": "image/bmp", ".webp": "image/webp", ".tif": "image/tiff", ".tiff": "image/tiff" };

// ---------------------------------------------------------------- reading text

// Rebuilds the lines of a digital PDF from the position of each piece of text.
function linesFromTextItems(items) {
  const rows = [];
  for (const item of items) {
    const text = String(item.str || "");
    if (!text.trim()) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 2.5);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, text, end: x + (item.width || text.length * 4) });
  }
  rows.sort((a, b) => b.y - a.y); // top of the page first
  return rows.map((row) => {
    row.parts.sort((a, b) => a.x - b.x);
    let line = "";
    let lastEnd = null;
    for (const part of row.parts) {
      if (lastEnd !== null) line += part.x - lastEnd > 12 ? "  " : " ";
      line += part.text.trim();
      lastEnd = part.end;
    }
    return line.trim();
  });
}

async function readPdf(buffer) {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const lines = [];
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    for (const text of linesFromTextItems(content.items)) lines.push({ text, page: number, confidence: null });
  }
  return { pages: pdf.numPages, lines };
}

// One OCR worker is reused, so only the first photo waits for it to start.
let workerPromise = null;
let queue = Promise.resolve();

function getWorker() {
  if (!workerPromise) {
    const { createWorker } = require("tesseract.js");
    workerPromise = createWorker("eng", 1, { cachePath: path.join(__dirname, "ocr-cache") });
  }
  return workerPromise;
}

function readImage(buffer) {
  const job = queue.then(async () => {
    const worker = await getWorker();
    const { data } = await worker.recognize(buffer);
    const lines = (data.lines && data.lines.length ? data.lines : String(data.text || "").split("\n").map((text) => ({ text })))
      .map((line) => ({ text: String(line.text || "").trim(), page: 1, confidence: line.confidence ?? null }))
      .filter((line) => line.text);
    return { pages: 1, lines, confidence: data.confidence ?? null };
  });
  queue = job.catch(() => {});
  return job;
}

// ---------------------------------------------------------------- finding item lines

function cleanMoney(token) {
  const t = token
    .replace(/[,;:]+$/, "")          // stray punctuation after a number ("$3.15,")
    .replace(/^S(?=\d)/, "$")        // OCR often reads $ as S
    .replace(/[,$]/g, "");
  if (!/^\(?-?\d+\.\d{2,4}\)?$/.test(t)) return null;
  const value = Number(t.replace(/[()]/g, ""));
  return t.startsWith("(") ? -value : value;
}

function parseItemLine(text) {
  if (SKIP_WORDS.test(text)) return null;
  const tokens = text.split(/\s+/).filter(Boolean);
  const money = tokens.map((token, index) => ({ index, value: cleanMoney(token) })).filter((m) => m.value !== null);
  if (!money.length) return null;

  const used = new Set(money.map((m) => m.index));
  const isCode = (token) => /\d/.test(token) && /^[A-Za-z0-9][A-Za-z0-9\-/.]{2,}$/.test(token) && cleanMoney(token) === null;
  const itemIndex = tokens.findIndex((token, index) => !used.has(index) && isCode(token) && !/^\d{1,4}$/.test(token));
  if (itemIndex === -1) return null; // no item number: not an item line
  used.add(itemIndex);

  // The unit of measure and quantity sit just before the first price, so search backward from there.
  // (Words like "lb" or "oz" inside the description are ignored this way.)
  const firstMoney = money[0].index;
  let uomIndex = -1;
  for (let index = firstMoney - 1; index > itemIndex; index -= 1) {
    const word = tokens[index].replace(/[^A-Za-z]/g, "").toUpperCase();
    if (UOMS.has(word) && tokens[index].length <= 6) { uomIndex = index; break; }
    if (firstMoney - index > 3) break;
  }
  if (uomIndex !== -1) used.add(uomIndex);

  let qtyIndex = -1;
  for (let index = firstMoney - 1; index > itemIndex; index -= 1) {
    if (!used.has(index) && /^\d{1,5}$/.test(tokens[index])) { qtyIndex = index; break; }
  }
  if (qtyIndex !== -1) used.add(qtyIndex);

  const unitPrice = money.length >= 2 ? money[money.length - 2].value : money[0].value;
  const extended = money.length >= 2 ? money[money.length - 1].value : null;
  const description = tokens.filter((_, index) => !used.has(index) && index > itemIndex && index < firstMoney).join(" ");
  const qty = qtyIndex === -1 ? null : Number(tokens[qtyIndex]);
  const uom = uomIndex === -1 ? null : tokens[uomIndex].replace(/[^A-Za-z]/g, "").toUpperCase();

  const notes = [];
  if (qty === null) notes.push("No quantity found");
  if (!uom) notes.push("No unit of measure found");
  if (qty !== null && extended !== null && Math.abs(qty * unitPrice - extended) > 0.02) {
    notes.push(`Qty × price = ${(qty * unitPrice).toFixed(2)}, line total says ${extended.toFixed(2)}`);
  }
  return { item: tokens[itemIndex].toUpperCase(), description, qty, uom, unitPrice, extended, notes };
}

// The document's own item total, to check the lines against. A subtotal is preferred,
// because the final total usually includes tax and shipping.
function findStatedTotal(lines) {
  const lastMoney = (text) => {
    const values = text.split(/\s+/).map(cleanMoney).filter((value) => value !== null);
    return values.length ? values[values.length - 1] : null;
  };
  for (const [label, pattern] of [["Subtotal", /\bsub\s*-?\s*total\b/i], ["Total", /\b(total|amount due|balance due)\b/i]]) {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (pattern.test(lines[index].text)) {
        const value = lastMoney(lines[index].text);
        if (value !== null) return { label, value };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------- main entry point

async function readDocument({ buffer, fileName }) {
  const started = Date.now();
  const ext = path.extname(fileName || "").toLowerCase();
  let result;
  let engine;
  const warnings = [];

  if (ext === ".pdf" || (buffer[0] === 0x25 && buffer[1] === 0x50)) {
    engine = "PDF text";
    result = await readPdf(buffer);
    const characters = result.lines.reduce((sum, line) => sum + line.text.length, 0);
    if (characters < 20) {
      warnings.push("This PDF is a scanned image with no text inside. For the prototype, save the page as a PNG or JPG and upload that. The company's Azure reader handles scanned PDFs directly.");
    }
  } else if (IMAGE_TYPES[ext]) {
    engine = "Tesseract OCR";
    result = await readImage(buffer);
  } else if (ext === ".heic" || ext === ".heif") {
    const error = new Error("iPhone HEIC photos aren't supported. Take a screenshot of the photo, or set the camera to Most Compatible, and upload a JPG.");
    error.status = 400;
    throw error;
  } else {
    const error = new Error("Upload a PDF, PNG, JPG, TIFF, BMP or WebP file.");
    error.status = 400;
    throw error;
  }

  const items = [];
  result.lines.forEach((line, index) => {
    const parsed = parseItemLine(line.text);
    if (!parsed) return;
    if (line.confidence !== null && line.confidence < 70) parsed.notes.push(`Low OCR confidence (${Math.round(line.confidence)}%)`);
    items.push({ line: items.length + 1, page: line.page, sourceLine: index + 1, source: line.text, ...parsed,
      status: parsed.notes.length ? "Needs review" : "Found" });
  });

  const linesTotal = items.reduce((sum, item) => sum + (item.extended ?? (item.qty ?? 0) * item.unitPrice), 0);
  const statedTotal = findStatedTotal(result.lines);
  if (!items.length && !warnings.length) warnings.push("No item lines were found. Check the raw text below to see what was read.");

  return {
    fileName,
    engine,
    pages: result.pages,
    seconds: Math.round((Date.now() - started) / 100) / 10,
    confidence: result.confidence ?? null,
    items,
    summary: {
      found: items.length,
      needsReview: items.filter((item) => item.status === "Needs review").length,
      linesTotal: Math.round(linesTotal * 100) / 100,
      statedTotal: statedTotal ? statedTotal.value : null,
      statedTotalLabel: statedTotal ? statedTotal.label : null,
      totalsMatch: statedTotal ? Math.abs(statedTotal.value - linesTotal) < 0.05 : null,
    },
    warnings,
    text: result.lines.map((line) => line.text).join("\n").slice(0, 20000),
  };
}

async function shutdown() {
  if (workerPromise) await (await workerPromise).terminate();
}

module.exports = { readDocument, parseItemLine, linesFromTextItems, shutdown, UOMS };

// Run this file directly to try a document without starting the app:
//   node ocr.js sample-files/ocr/sample-invoice.pdf
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log("Usage: node ocr.js path/to/file.pdf (or .png / .jpg)");
    process.exit(1);
  }
  readDocument({ buffer: require("node:fs").readFileSync(filePath), fileName: path.basename(filePath) })
    .then(async (result) => {
      console.log(`Read with: ${result.engine} · ${result.pages} page(s) · ${result.seconds}s` + (result.confidence !== null ? ` · confidence ${Math.round(result.confidence)}%` : ""));
      console.log(`Item lines found: ${result.summary.found} (${result.summary.needsReview} need review)`);
      const stated = result.summary.statedTotal === null ? "not found" : `${result.summary.statedTotal.toFixed(2)} (${result.summary.statedTotalLabel})`;
      console.log(`Lines add up to: ${result.summary.linesTotal.toFixed(2)} · Document says: ${stated}` + (result.summary.totalsMatch ? " · Match" : ""));
      console.table(result.items.map((item) => ({ Item: item.item, Description: item.description.slice(0, 32), Qty: item.qty, UOM: item.uom, Price: item.unitPrice, Total: item.extended, Status: item.status })));
      for (const warning of result.warnings) console.log(`Note: ${warning}`);
      for (const item of result.items.filter((entry) => entry.notes.length)) console.log(`Line ${item.line}: ${item.notes.join("; ")}`);
      await shutdown();
    })
    .catch(async (error) => {
      console.error(error.message);
      await shutdown();
      process.exit(1);
    });
}
