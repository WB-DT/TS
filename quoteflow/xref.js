// Cross-reference engine: the same calculations as the "Usage or Consumption Items" tab
// of the Cross Reference Tool workbook. Shared by the Margin Manager's Cross-reference page
// and, later, the quote workspace stages.
//
// Inputs (uploaded one at a time):
//   items    the lines to price: Items, UMs, Qty
//   account  customer account pricing   (Current Price Tool Items)
//   house    house account pricing      (House CPT)
//   costing  costing report             (Costing Tool Data)
//
// Columns are found by their header NAME, never by position, so a moved column can't
// silently break a calculation.

// ---------------------------------------------------------------- settings

// Item numbers starting with these get no financial cost (same as the workbook).
const COST_EXEMPT_PREFIXES = ["CSI", "JSW", "NWL"];

// The costing report column used for cost candidate (a) and the converted cost (c).
// Each run can choose a different one on the page; this is the starting choice.
const DEFAULT_COSTING_COST_COLUMN = "DirectCost";

// Header names each file must have. Matching ignores capitals, spaces and punctuation.
const COLUMNS = {
  items: { item: ["Items", "Item", "Item Number", "Item #", "SKU"], uom: ["UMs", "UM", "UOM", "Item UOM", "Unit of Measure"], qty: ["Qty", "Quantity", "QTY"] },
  account: {
    accountNumber: ["Account Number"], accountName: ["Account Name"], item: ["Item Number"], status: ["Item Status"],
    newItem: ["New ItemID", "New Item ID"], description: ["Item Description"], uom: ["Item UOM"], price: ["Current Price"],
    list: ["Current List"], cost: ["Current Cost"], method: ["Pricing Method"],
  },
  costing: {
    item: ["stocknumber", "Stock Number"], uom: ["UOM"], category: ["Group_Description", "Group Description"],
    status: ["Status"], substitute: ["SubstituteItem", "Substitute Item"], green: ["Green"], recycled: ["Recycled"],
    hasContent: ["HasContent", "Has Content"], catalogPrice: ["CTLGE_Price", "Catalog Price"], description: ["Description"],
  },
};
COLUMNS.house = COLUMNS.account;
const REQUIRED = { items: ["item", "uom"], account: ["item", "uom", "price", "cost"], house: ["item", "uom", "cost"], costing: ["item", "uom"] };

// ---------------------------------------------------------------- helpers

const norm = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const keyOf = (item, uom) => `${String(item ?? "").trim().toUpperCase()}|${String(uom ?? "").trim().toUpperCase()}`;
const itemOf = (item) => String(item ?? "").trim().toUpperCase();

function num(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Excel ROUNDUP(x, 2). Rounds to 6 places first so 1.1 stays 1.10 (1.1 * 100 is 110.00000000000001).
function roundUp2(value) {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.ceil(Math.round(value * 1e6) / 1e4) / 100;
}

// Finds which header holds each field. Returns { columns, missing }.
function mapColumns(headers, kind) {
  const columns = {};
  const lookup = new Map(headers.map((header) => [norm(header), header]));
  for (const [field, names] of Object.entries(COLUMNS[kind])) {
    const found = names.map(norm).find((name) => lookup.has(name));
    if (found) columns[field] = lookup.get(found);
  }
  const missing = REQUIRED[kind].filter((field) => !columns[field]).map((field) => COLUMNS[kind][field][0]);
  return { columns, missing };
}

// ---------------------------------------------------------------- the rules

// Review needed: kept exactly as the workbook prototype calculates it.
// Change the rule here, and only here.
function reviewNeeded({ financialCost, accountCost, houseCost }) {
  if (financialCost === null || accountCost === null || houseCost === null) return "";
  return financialCost < accountCost && financialCost === houseCost ? "Yes" : "";
}

// Financial cost: the lowest value above zero of four candidates, rounded up to the cent.
function financialCost({ item, uom, index, costColumn }) {
  if (COST_EXEMPT_PREFIXES.some((prefix) => itemOf(item).startsWith(prefix))) return { cost: null, source: "Exempt" };
  const key = keyOf(item, uom);
  const accountAt = (u) => num(index.account.get(keyOf(item, u))?.cost);
  const costingAt = (u) => num(index.costing.get(keyOf(item, u))?.raw?.[costColumn]);

  const candidates = [];
  const add = (cost, source) => { if (cost !== null && cost > 0) candidates.push({ cost, source }); };

  add(costingAt(uom), "Costing");                                   // (a)
  add(num(index.account.get(key)?.cost), "Account");                 // (b)
  const base = (index.costingByItem.get(itemOf(item)) || []).find((row) => num(row.raw[costColumn]) > 0);
  if (base) {                                                        // (c)
    const loadedBase = accountAt(base.uom);
    const loadedTarget = accountAt(uom);
    const ratio = loadedBase > 0 && loadedTarget > 0 ? loadedTarget / loadedBase : 0;
    add(num(base.raw[costColumn]) * ratio, "Converted");
  }
  add(num(index.house.get(key)?.cost), "House");                     // (d)

  if (!candidates.length) return { cost: null, source: "Not found" };
  const lowest = candidates.reduce((a, b) => (b.cost < a.cost ? b : a));
  return { cost: roundUp2(lowest.cost), source: lowest.source };
}

// ---------------------------------------------------------------- building the index

// files: { items, account, house, costing }, each { headers, rows } (rows are objects keyed by header).
function buildIndex(files) {
  const index = { account: new Map(), house: new Map(), costing: new Map(), costingByItem: new Map(), accountByItem: new Map() };
  for (const kind of ["account", "house"]) {
    const file = files[kind];
    if (!file) continue;
    const { columns } = mapColumns(file.headers, kind);
    for (const raw of file.rows) {
      const row = Object.fromEntries(Object.entries(columns).map(([field, header]) => [field, raw[header]]));
      if (!row.item) continue;
      const key = keyOf(row.item, row.uom);
      if (!index[kind].has(key)) index[kind].set(key, row); // first match wins, like XLOOKUP
      if (kind === "account" && !index.accountByItem.has(itemOf(row.item))) index.accountByItem.set(itemOf(row.item), row);
    }
  }
  if (files.costing) {
    const { columns } = mapColumns(files.costing.headers, "costing");
    for (const raw of files.costing.rows) {
      const row = { ...Object.fromEntries(Object.entries(columns).map(([field, header]) => [field, raw[header]])), raw };
      if (!row.item) continue;
      const key = keyOf(row.item, row.uom);
      if (!index.costing.has(key)) index.costing.set(key, row);
      const list = index.costingByItem.get(itemOf(row.item)) || [];
      list.push(row);
      index.costingByItem.set(itemOf(row.item), list);
    }
  }
  return index;
}

// ---------------------------------------------------------------- the calculation

// targets: { [lineNumber]: 0.25 } entered by the person pricing. Empty means no target.
function crossReference(files, { costColumn = DEFAULT_COSTING_COST_COLUMN, targets = {} } = {}) {
  if (!files.items) return { lines: [], summary: null };
  const index = buildIndex(files);
  const { columns } = mapColumns(files.items.headers, "items");
  const yes = (value) => /^(yes|y|true)$/i.test(String(value ?? "").trim());

  const lines = [];
  for (const raw of files.items.rows) {
    const item = String(raw[columns.item] ?? "").trim();
    if (!item) continue;
    const uom = String(raw[columns.uom] ?? "").trim().toUpperCase();
    const qty = num(raw[columns.qty]);
    const line = lines.length + 1;
    const key = keyOf(item, uom);
    const account = index.account.get(key) || null;
    const house = index.house.get(key) || null;
    const costing = index.costing.get(key) || null;
    const byItem = index.accountByItem.get(itemOf(item));
    const firstCosting = (index.costingByItem.get(itemOf(item)) || [])[0];

    const price = num(account?.price);
    const { cost, source } = financialCost({ item, uom, index, costColumn });
    const target = num(targets[line]);
    const margin = price && cost !== null ? (price - cost) / price : null;

    lines.push({
      line, item: item.toUpperCase(), uom, qty,
      description: byItem?.description ?? "",
      category: firstCosting?.category ?? "",
      price,
      extendedPrice: price !== null && qty !== null ? price * qty : null,
      financialCost: cost,
      costSource: source,
      extendedCost: cost !== null && qty !== null ? cost * qty : null,
      currentMargin: margin,
      targetMargin: target !== null && target > 0 ? target : null,
      priceAtTarget: target !== null && target > 0 && target < 1 && cost !== null ? roundUp2(cost / (1 - target)) : null,
      pricingMethod: account?.method ?? "",
      status: account?.status ?? "",
      substitute: account?.newItem ?? "",
      sustainable: costing ? (yes(costing.green) || yes(costing.recycled) ? "Yes" : "No") : "",
      hasContent: costing ? (yes(costing.hasContent) ? "Yes" : "No") : "",
      catalogPrice: num(costing?.catalogPrice),
      reviewNeeded: reviewNeeded({ financialCost: cost, accountCost: num(account?.cost), houseCost: num(house?.cost) }),
      found: { account: Boolean(account), house: Boolean(house), costing: Boolean(costing) },
    });
  }

  const sum = (field) => lines.reduce((total, l) => total + (l[field] ?? 0), 0);
  const priced = lines.filter((l) => l.extendedPrice !== null && l.extendedCost !== null);
  const pricedSales = priced.reduce((t, l) => t + l.extendedPrice, 0);
  const pricedCost = priced.reduce((t, l) => t + l.extendedCost, 0);
  return {
    lines,
    summary: {
      lines: lines.length,
      extendedPrice: sum("extendedPrice"),
      extendedCost: sum("extendedCost"),
      margin: pricedSales ? (pricedSales - pricedCost) / pricedSales : null,
      reviewNeeded: lines.filter((l) => l.reviewNeeded === "Yes").length,
      missingPrice: lines.filter((l) => l.price === null).length,
      missingCost: lines.filter((l) => l.financialCost === null && l.costSource !== "Exempt").length,
      found: {
        account: lines.filter((l) => l.found.account).length,
        house: lines.filter((l) => l.found.house).length,
        costing: lines.filter((l) => l.found.costing).length,
      },
    },
  };
}

// ---------------------------------------------------------------- reading files

// Reads an .xlsx or .csv upload into { headers, rows }. The header row is found
// automatically in the first 15 rows (the workbook's items tab starts on row 4).
function readUpload(buffer, kind) {
  const XLSX = require("xlsx");
  let book;
  try {
    book = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    const error = new Error("That file couldn't be read. Upload an .xlsx or .csv file.");
    error.status = 400;
    throw error;
  }
  // When a whole workbook is uploaded, look at the matching tab first (so the house file
  // can't be mistaken for the account file, which has the same columns).
  const prefer = { items: "usage", account: "current price", house: "house", costing: "costing" }[kind];
  const sheets = [...book.SheetNames].sort((a, b) => Number(!a.toLowerCase().includes(prefer)) - Number(!b.toLowerCase().includes(prefer)));
  for (const name of sheets) {
    const grid = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: "", raw: true, blankrows: false });
    for (let r = 0; r < Math.min(grid.length, 15); r += 1) {
      const headers = grid[r].map((cell) => String(cell ?? "").trim());
      if (!mapColumns(headers, kind).missing.length) {
        const itemColumn = headers.indexOf(mapColumns(headers, kind).columns.item);
        const rows = grid.slice(r + 1)
          .filter((cells) => String(cells[itemColumn] ?? "").trim() !== "") // skip rows with no item number
          .map((cells) => Object.fromEntries(headers.map((header, c) => [header, cells[c] ?? ""]).filter(([header]) => header)));
        return { sheet: name, headers: headers.filter(Boolean), rows };
      }
    }
  }
  const needed = REQUIRED[kind].map((field) => COLUMNS[kind][field][0]).join(", ");
  const error = new Error(`No sheet in this file has the columns needed: ${needed}.`);
  error.status = 400;
  throw error;
}

module.exports = { crossReference, readUpload, mapColumns, roundUp2, reviewNeeded, DEFAULT_COSTING_COST_COLUMN, COLUMNS };

// Run directly to check the engine against the prototype workbook (all four tabs in one file):
//   node xref.js "sample-files/xref/Cross_Reference_Tool_Prototype.xlsx"
if (require.main === module) {
  const XLSX = require("xlsx");
  const fs = require("node:fs");
  const filePath = process.argv[2];
  if (!filePath) {
    console.log('Usage: node xref.js "path/to/Cross_Reference_Tool_Prototype.xlsx" [costing cost column, or none]');
    process.exit(1);
  }
  const book = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });
  const tab = (match) => {
    const name = book.SheetNames.find((sheet) => sheet.toLowerCase().includes(match));
    if (!name) throw new Error(`No tab containing "${match}"`);
    const out = XLSX.write({ SheetNames: [name], Sheets: { [name]: book.Sheets[name] } }, { type: "buffer", bookType: "xlsx" });
    return out;
  };
  const files = {
    items: readUpload(tab("usage"), "items"),
    account: readUpload(tab("current price"), "account"),
    house: readUpload(tab("house"), "house"),
    costing: readUpload(tab("costing"), "costing"),
  };
  // "none" = don't use the costing report, which is how the prototype workbook calculates today.
  const costColumn = !process.argv[3] ? DEFAULT_COSTING_COST_COLUMN : process.argv[3].toLowerCase() === "none" ? "" : process.argv[3];
  const result = crossReference(files, { costColumn });
  const s = result.summary;
  console.log(`Lines: ${s.lines} · found in account ${s.found.account}, house ${s.found.house}, costing ${s.found.costing}`);
  console.log(`Extended price ${s.extendedPrice.toFixed(2)} · extended cost ${s.extendedCost.toFixed(2)} · margin ${(s.margin * 100).toFixed(1)}%`);
  console.log(`Review needed: ${s.reviewNeeded} · missing price: ${s.missingPrice} · missing cost: ${s.missingCost} · costing cost column: ${costColumn || "none"}`);
  const sources = {};
  for (const l of result.lines) sources[l.costSource] = (sources[l.costSource] || 0) + 1;
  console.log("Cost came from:", sources);
  console.table(result.lines.slice(0, 10).map((l) => ({ Item: l.item, UOM: l.uom, Qty: l.qty, Price: l.price, Cost: l.financialCost, From: l.costSource, Margin: l.currentMargin === null ? null : `${(l.currentMargin * 100).toFixed(1)}%`, Review: l.reviewNeeded })));
}
