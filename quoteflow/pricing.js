// Pricing engine for QuoteFlow. Replicates the company's Cross Reference Tool.
// Every rule is documented inline so the pricing behavior can be audited.

const XLSX = require("xlsx");

// Column definitions for the two report types. A missing column produces a
// clear error that names the exact column so the file can be fixed.
const PRICE_REPORT_COLUMNS = [
  "Account Number",
  "Account Name",
  "Item Number",
  "Item Status",
  "New ItemID",
  "Item Description",
  "Item UOM",
  "Default UOM",
  "Current Price",
  "Current List",
  "Current Cost",
  "Pricing Method",
];

const COSTING_REPORT_COLUMNS = [
  "StockNumber",
  "Product Reference",
  "Target Item",
  "Status",
  "Description",
  "UOM",
  "DefaultUOM",
  "Product Category",
  "Loaded Cost",
  "Direct Cost",
  "Direct UOM",
  "Green",
  "Recycled",
  "Minority Owned",
  "Has Content",
  "In Alps Catalog",
  "IsOnWeb",
  "Stocked",
  "Current List Price",
  "Quantity On Hand",
  "Substitute Item",
  "Substitute Type",
  "Substitute To Sales Unit",
  "BOS-MA",
  "CEN-NJ",
  "COL-MD",
  "LIV-NY",
  "ORL-FL",
  "CTLGE_Price",
  "VendorName",
  "ItemSource",
  "AltItemStatus",
  "AltStatusDate",
];

// Item prefixes that never carry a cost (blank cost, by policy).
const DEFAULT_COST_EXEMPT_PREFIXES = ["CSI", "JSW", "NWL"];

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function roundUp2(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.ceil(value * 100) / 100;
}

// Parse an .xlsx or .csv buffer into an array of row objects keyed by the
// header row. Throws an error naming the first missing required column.
function parseReport(buffer, requiredColumns, reportLabel) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    const error = new Error(`${reportLabel} has no sheets.`);
    error.status = 422;
    throw error;
  }
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  if (!rows.length) {
    const error = new Error(`${reportLabel} is empty.`);
    error.status = 422;
    throw error;
  }
  const headers = Object.keys(rows[0]);
  const normalizedHeaders = new Map(headers.map((header) => [normalizeKey(header), header]));
  for (const column of requiredColumns) {
    if (!normalizedHeaders.has(normalizeKey(column))) {
      const error = new Error(`${reportLabel} is missing the required column "${column}".`);
      error.status = 422;
      error.missingColumn = column;
      throw error;
    }
  }
  // Remap every row onto the canonical column names.
  return rows.map((row) => {
    const mapped = {};
    for (const column of requiredColumns) {
      mapped[column] = row[normalizedHeaders.get(normalizeKey(column))];
    }
    return mapped;
  });
}

function parsePriceReport(buffer, label) {
  return parseReport(buffer, PRICE_REPORT_COLUMNS, label);
}

function parseCostingReport(buffer) {
  return parseReport(buffer, COSTING_REPORT_COLUMNS, "Costing report");
}

// Match key: item number + UOM together, per the cross-reference rule.
function matchKey(itemNumber, uom) {
  return `${normalizeKey(itemNumber)}|${normalizeKey(uom)}`;
}

function indexByItemAndUom(rows, itemColumn, uomColumn) {
  const index = new Map();
  for (const row of rows) {
    const key = matchKey(row[itemColumn], row[uomColumn]);
    if (!index.has(key)) index.set(key, row);
  }
  return index;
}

function isCostExempt(itemNumber, prefixes) {
  const item = String(itemNumber || "").trim().toUpperCase();
  return prefixes.some((prefix) => item.startsWith(String(prefix).toUpperCase()));
}

// Financial cost for a line: the lowest value above zero of four sources.
// Returns { cost, source } where source names which rule won, or
// { cost: null, source: "exempt" } for cost-exempt prefixes.
function financialCost({ costingRow, accountRow, houseRow, costingRowsForItem, accountRowsForItem, uom, exemptPrefixes }) {
  const candidates = [];

  // (a) Costing Direct Cost at this UOM.
  const directAtUom = toNumber(costingRow?.["Direct Cost"]);
  if (directAtUom !== null && directAtUom > 0) candidates.push({ cost: directAtUom, source: "costing-direct" });

  // (b) Account Current Cost at this UOM.
  const accountCostAtUom = toNumber(accountRow?.["Current Cost"]);
  if (accountCostAtUom !== null && accountCostAtUom > 0) candidates.push({ cost: accountCostAtUom, source: "account-cost" });

  // (c) Converted cost: base UOM = first costing row for the item with
  // Direct Cost > 0; ratio = account Current Cost at this UOM / account
  // Current Cost at base UOM; converted = base Direct Cost * ratio.
  const baseCosting = (costingRowsForItem || []).find((row) => toNumber(row["Direct Cost"]) > 0);
  if (baseCosting) {
    const baseUom = baseCosting["UOM"];
    const baseDirect = toNumber(baseCosting["Direct Cost"]);
    const accountAtBase = (accountRowsForItem || []).find((row) => normalizeKey(row["Item UOM"]) === normalizeKey(baseUom));
    const accountCostAtBase = toNumber(accountAtBase?.["Current Cost"]);
    if (baseDirect > 0 && accountCostAtUom !== null && accountCostAtUom > 0 && accountCostAtBase !== null && accountCostAtBase > 0) {
      const ratio = accountCostAtUom / accountCostAtBase;
      candidates.push({ cost: baseDirect * ratio, source: "converted" });
    }
  }

  // (d) House Current Cost at this UOM.
  const houseCostAtUom = toNumber(houseRow?.["Current Cost"]);
  if (houseCostAtUom !== null && houseCostAtUom > 0) candidates.push({ cost: houseCostAtUom, source: "house-cost" });

  if (!candidates.length) return { cost: null, source: "none" };
  const winner = candidates.reduce((lowest, candidate) => (candidate.cost < lowest.cost ? candidate : lowest));
  return { cost: roundUp2(winner.cost), source: winner.source };
}

// Current margin = (account price - cost) / account price.
function currentMargin(accountPrice, cost) {
  if (accountPrice === null || accountPrice === 0 || cost === null) return null;
  return (accountPrice - cost) / accountPrice;
}

// Price at target = ROUNDUP(cost / (1 - target), 2).
function priceAtTarget(cost, targetMargin) {
  if (cost === null || targetMargin === null || targetMargin >= 1) return null;
  return roundUp2(cost / (1 - targetMargin));
}

// Deviation needed = Yes when cost < account cost AND cost = house cost.
function deviationNeeded(cost, accountCost, houseCost) {
  if (cost === null || accountCost === null || houseCost === null) return "No";
  return cost < accountCost && cost === houseCost ? "Yes" : "No";
}

// Compute the full pricing result for one line item given the three reports.
function priceLine({ line, accountIndex, houseIndex, costingIndex, costingByItem, accountByItem, settings }) {
  const itemNumber = line.competitor_item_no || line.manufacturer_part_no || "";
  const uom = line.uom || "";
  const key = matchKey(itemNumber, uom);

  const accountRow = accountIndex.get(key) || null;
  const houseRow = houseIndex.get(key) || null;
  const costingRow = costingIndex.get(key) || null;

  const itemKey = normalizeKey(itemNumber);
  const costingRowsForItem = costingByItem.get(itemKey) || [];
  const accountRowsForItem = accountByItem.get(itemKey) || [];

  const accountPrice = toNumber(accountRow?.["Current Price"]);
  const accountCost = toNumber(accountRow?.["Current Cost"]);
  const houseCost = toNumber(houseRow?.["Current Cost"]);

  const exempt = isCostExempt(itemNumber, settings.costExemptPrefixes);
  const { cost, source } = exempt
    ? { cost: null, source: "exempt" }
    : financialCost({ costingRow, accountRow, houseRow, costingRowsForItem, accountRowsForItem, uom, exemptPrefixes: settings.costExemptPrefixes });

  const targetMargin = settings.defaultTargetMargin;
  const margin = currentMargin(accountPrice, cost);
  const atTarget = priceAtTarget(cost, targetMargin);

  return {
    description: accountRow?.["Item Description"] || costingRow?.["Description"] || line.description_raw || "",
    accountPrice,
    pricingMethod: accountRow?.["Pricing Method"] || "",
    itemStatus: accountRow?.["Item Status"] || "",
    substitute: accountRow?.["New ItemID"] || costingRow?.["Substitute Item"] || "",
    category: costingRow?.["Product Category"] || "",
    financialCost: cost,
    costSource: source,
    currentMargin: margin,
    targetMargin,
    priceAtTarget: atTarget,
    deviationNeeded: deviationNeeded(cost, accountCost, houseCost),
    ctlgePrice: toNumber(costingRow?.["CTLGE_Price"]),
    competitorPrice: toNumber(line.price_per_uom),
    costingRow,
  };
}

function buildIndexes(accountRows, houseRows, costingRows) {
  const accountIndex = indexByItemAndUom(accountRows, "Item Number", "Item UOM");
  const houseIndex = indexByItemAndUom(houseRows, "Item Number", "Item UOM");
  const costingIndex = indexByItemAndUom(costingRows, "Target Item", "UOM");

  const costingByItem = new Map();
  for (const row of costingRows) {
    const key = normalizeKey(row["Target Item"]);
    if (!costingByItem.has(key)) costingByItem.set(key, []);
    costingByItem.get(key).push(row);
  }
  const accountByItem = new Map();
  for (const row of accountRows) {
    const key = normalizeKey(row["Item Number"]);
    if (!accountByItem.has(key)) accountByItem.set(key, []);
    accountByItem.get(key).push(row);
  }
  return { accountIndex, houseIndex, costingIndex, costingByItem, accountByItem };
}

module.exports = {
  PRICE_REPORT_COLUMNS,
  COSTING_REPORT_COLUMNS,
  DEFAULT_COST_EXEMPT_PREFIXES,
  parsePriceReport,
  parseCostingReport,
  buildIndexes,
  priceLine,
  matchKey,
  toNumber,
  roundUp2,
  currentMargin,
  priceAtTarget,
  deviationNeeded,
  isCostExempt,
};
