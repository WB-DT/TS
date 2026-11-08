// The team's quote templates. The qualifier picks one at screening; it decides
// which columns each quote stage shows and how the customer and internal files look.
//
// Every template has the same shape (rows 1-4 customer header, row 5 column names).
// Columns up to Notes are what the customer sees ("customer"); the rest are internal.
// "{co}" in a header is replaced with the company name from Settings, so the files
// match the Excel templates exactly once that name is filled in.
//
// Each column names a FIELD. lineValues() below works out every field for a line.

const T = (header, field) => ({ header, field });

const INTERNAL_NO_QTY = [T("Cost", "cost"), T("Margin", "margin"), T("Target Margin", "target"), T("Price at Target Margin", "price_at_target"), T("Pricing Method", "pricing_method"), T("Line", "line")];
const INTERNAL_QTY = [T("Cost", "cost"), T("Extended Cost", "cost_ext"), T("Margin", "margin"), T("Target Margin", "target"), T("Price at Target Margin", "price_at_target"), T("Pricing Method", "pricing_method"), T("Line #", "line")];
const TIERS = [T("Tier 1", "tier"), T("Tier 2", "tier"), T("Tier 3", "tier"), T("Tier 4", "tier"), T("Tier 5", "tier")];

const TEMPLATES = [
  {
    key: "new-quote-gp", name: "New Quote with GP", kind: "competitor", qty: false,
    when: "Competitor item numbers and prices, no quantities",
    customer: [T("Competitor Item", "their_item"), T("{co} Item", "our_item"), T("{co} Item Description", "our_desc"), T("Competitor Item Unit of Measure", "their_uom"),
      T("{co} Item Unit of Measure", "our_uom"), T("Competitor Item Price", "their_price"), T("{co} Price in Competitor Items UM", "matched_price"),
      T("{co} Item Sell Price", "sell"), T("Savings %", "savings_pct"), T("Savings $", "savings_unit"), T("Notes", "note")],
    internal: INTERNAL_NO_QTY,
  },
  {
    key: "extended-qty-gp", name: "Extended Prices, Qty and GP", kind: "competitor", qty: true,
    when: "Competitor item numbers and prices, with quantities",
    customer: [T("Competitor Item", "their_item"), T("{co} Item", "our_item"), T("{co} Item Description", "our_desc"), T("Competitor Item Unit of Measure", "their_uom"),
      T("{co} Item Unit of Measure", "our_uom"), T("Qty", "qty"), T("Competitor Item Price", "their_price"), T("Extended Competitor Item Price", "their_ext"),
      T("Extended {co} Item Price Matched to Competitor", "matched_ext"), T("{co} Item Price Matched to Competitor Item", "matched_price"),
      T("{co} Item Sell Price", "sell"), T("Savings %", "savings_pct"), T("Savings $", "savings_ext"), T("Notes", "note")],
    internal: INTERNAL_QTY,
  },
  {
    key: "competitor-discounts", name: "Competitor Discounts", kind: "competitor", qty: false,
    when: "The competitor gives the customer a discount",
    customer: [T("Competitor Item", "their_item"), T("{co} Item", "our_item"), T("{co} Item Description", "our_desc"), T("Competitor Item Unit of Measure", "their_uom"),
      T("{co} Item Unit of Measure", "our_uom"), T("Competitor Item Price", "their_price"), T("{co} Price in Competitor Items UM", "matched_price"),
      T("{co} Item Sell Price", "sell"), T("Savings %", "savings_pct"), T("Savings $", "savings_unit"), T("Notes", "note")],
    internal: [...INTERNAL_NO_QTY, T("Competitor Discounts", "comp_discount")],
  },
  {
    key: "extended-competitor-discount", name: "Extended Competitor Discount", kind: "competitor", qty: true,
    when: "The competitor gives a discount, with quantities",
    customer: [T("Competitor Item", "their_item"), T("{co} Item", "our_item"), T("{co} Item Description", "our_desc"), T("Competitor Item Unit of Measure", "their_uom"),
      T("{co} Item Unit of Measure", "our_uom"), T("Qty", "qty"), T("Competitor Item Price", "their_price"), T("Extended Competitor Item Price", "their_ext"),
      T("Extended {co} Item Price Matched to Competitor", "matched_ext"), T("{co} Item Price Matched to Competitor Item", "matched_price"),
      T("{co} Item Sell Price", "sell"), T("Savings %", "savings_pct"), T("Savings $", "savings_ext"), T("Notes", "note")],
    internal: [...INTERNAL_QTY, T("Competitor Discounts", "comp_discount")],
  },
  {
    key: "blind-no-qty", name: "Blind, no Qty", kind: "blind", qty: false,
    when: "Descriptions only, no item numbers or quantities",
    customer: [T("Description of Item", "their_desc"), T("{co} Item", "our_item"), T("{co} Item Description", "our_desc"), T("{co} Item Unit of Measure", "our_uom"),
      T("{co} Item Sell Price", "sell"), T("Notes", "note")],
    internal: [T("Cost", "cost"), T("Target Margin", "target"), T("Price At Target Margin", "price_at_target"), T("Current Margin", "margin"), T("Pricing Method", "pricing_method"), T("Nominal", "blank")],
  },
  {
    key: "blind-qty-gp", name: "Blind, Qty with GP", kind: "blind", qty: true,
    when: "Descriptions with quantities (purchase counts)",
    customer: [T("Description of Item", "their_desc"), T("{co} Item", "our_item"), T("{co} Item Description", "our_desc"), T("{co} Item Unit of Measure", "our_uom"),
      T("Qty", "qty"), T("{co} Item Sell Price", "sell"), T("EXTENDED {co} Item Sell Price", "sell_ext"), T("Notes", "note")],
    internal: [T("Cost", "cost"), T("Extended Cost", "cost_ext"), T("Target Margin", "target"), T("Price at Target Margin", "price_at_target"), T("Current Margin", "margin"), T("Pricing Method", "pricing_method"), T("Nominal", "blank")],
  },
  {
    key: "comparison-pack-ship", name: "Comparison Pack Ship", kind: "competitor", qty: true, tiers: true,
    when: "Pack and ship items, with competitor items",
    customer: [T("Competitor Item", "their_item"), T("{co} Item", "our_item"), T("{co} Item Description", "our_desc"), T("Competitor Item Unit of Measure", "their_uom"),
      T("Comp. Qty", "qty"), T("{co} Item Unit of Measure", "our_uom"), T("{co} Equiv. Qty", "equiv_qty"), T("Competitor Unit Item Price", "their_price"),
      T("{co} Equivalent Unit Item Price", "matched_price"), T("Extended Competitor Item Price", "their_ext"), T("Extended {co} Item Price", "matched_ext"), ...TIERS,
      T("Savings %", "savings_pct"), T("Savings $", "savings_ext"), T("Actual Sell Price of {co} Item Number", "sell"), T("Notes", "note")],
    internal: [T("Cost", "cost"), T("Extended Cost", "cost_ext"), T("Margin", "margin"), T("Target Margin", "target"), T("Price at Target Margin", "price_at_target"), T("Pricing Method", "pricing_method"), T("Nominal", "blank")],
  },
  {
    key: "blind-pack-ship", name: "Blind Pack Ship", kind: "blind", qty: true, tiers: true,
    when: "Pack and ship items, descriptions only",
    customer: [T("Competitor Item Description", "their_desc"), T("{co} Item", "our_item"), T("{co} Item Description", "our_desc"), T("Qty", "qty"),
      T("{co} Item Unit of Measure", "our_uom"), ...TIERS, T("Actual Sell Price of {co} Item Number", "sell"), T("Total Price", "sell_ext"), T("Notes", "note")],
    internal: [T("Cost", "cost"), T("Extended Cost", "cost_ext"), T("Margin", "margin"), T("Target Margin", "target"), T("Price at Target Margin", "price_at_target"), T("Pricing Method", "pricing_method"), T("Nominal", "blank")],
  },
  {
    key: "u-line", name: "U-Line", kind: "competitor", qty: true, tiers: true,
    when: "The competitor is U-Line",
    customer: [T("U-Line Item #", "their_item"), T("{co} Item #", "our_item"), T("{co} Item Description", "our_desc"), T("U-Line Item Unit of Measure", "their_uom"),
      T("U-Line Qty", "qty"), T("{co} Item Unit of Measure", "our_uom"), T("{co} Equiv. Qty", "equiv_qty"), T("U-Line Unit Item Price", "their_price"),
      T("{co} Equivalent Unit Item Price", "matched_price"), T("Extended U-Line Item Price", "their_ext"), T("Extended {co} Item Price", "matched_ext"), ...TIERS,
      T("Savings %", "savings_pct"), T("Savings $", "savings_ext"), T("Actual Sell Price of {co} Item Number", "sell"), T("Notes", "note")],
    internal: [T("Cost", "cost"), T("Extended Cost", "cost_ext"), T("Margin", "margin"), T("Target Margin", "target"), T("Price at Target Margin", "price_at_target"), T("Pricing Method", "pricing_method"), T("Nominal", "blank")],
  },
  {
    key: "re-price", name: "Re-Price (Core List)", kind: "reprice", qty: true,
    when: "An existing customer's current items, priced again",
    customer: [T("{co} Item #", "our_item"), T("{co} Item Description", "our_desc"), T("UM", "our_uom"), T("Qty", "qty"), T("Current Price", "account_price"),
      T("Extended Current Price", "account_ext"), T("New Extended Sell Price", "sell_ext"), T("New Sell Price", "sell"), T("Savings %", "reprice_savings_pct"),
      T("Savings $", "reprice_savings_ext"), T("Notes", "note")],
    internal: [T("Cost", "cost"), T("Ext. Cost", "cost_ext"), T("Current Margin", "account_margin"), T("New Margin", "margin"), T("Pricing Method", "pricing_method"), T("Line #", "line")],
  },
];

const DEFAULT_TEMPLATE = "extended-qty-gp";

// Which of the quoter's line fields stage 1 (extract & verify) shows for each kind of template.
const STAGE1_FIELDS = {
  competitor: ["their_item", "description", "qty", "their_uom", "their_price", "their_extended"],
  blind: ["description", "qty", "their_uom"],
  reprice: ["their_item", "description", "qty", "their_uom", "their_price"],
};

function getTemplate(key) {
  return TEMPLATES.find((t) => t.key === key) || TEMPLATES.find((t) => t.key === DEFAULT_TEMPLATE);
}

// The template as the page needs it: headers with the company name filled in.
function describe(template, companyName) {
  const co = String(companyName || "").trim() || "Our";
  const fill = (cols) => cols.map((c) => ({ header: c.header.replace(/\{co\}/g, co), field: c.field }));
  const stage1 = STAGE1_FIELDS[template.kind].filter((f) => template.qty || !["qty", "their_extended"].includes(f));
  return { key: template.key, name: template.name, kind: template.kind, qty: template.qty, tiers: Boolean(template.tiers), when: template.when,
    customer: fill(template.customer), internal: fill(template.internal), stage1 };
}

const num = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const upper = (v) => (v === null || v === undefined ? "" : String(v).trim().toUpperCase());

// Every field a template column can ask for, for one computed line (from computeQuote).
// Lines we don't quote (We don't carry, Item N/A) show the team's standard wording.
function lineValues(line, index, template) {
  const qty = num(line.qty);
  const units = qty ?? 1;
  const sell = num(line.sell_price);
  const theirPrice = num(line.their_price);
  const theirUom = upper(line.their_uom);
  const ourUom = upper(line.our_uom);
  const blind = (line.tags || []).includes("Blind");
  const notCarried = line.line_status === "We don't carry";
  const na = (line.tags || []).includes("Item N/A") || Boolean(line.line_status);
  // Our price in the competitor's unit: the same as our sell price when both units match.
  // Different units need a conversion (after Tuesday), so the cell stays empty.
  const matched = sell !== null && (!theirUom || !ourUom || theirUom === ourUom) ? sell : null;
  const savingsUnit = !blind && matched !== null && theirPrice !== null ? theirPrice - matched : null;
  const accountPrice = line.calc ? line.calc.accountPrice : null;
  const cost = line.calc ? line.calc.cost : null;
  const r2 = (v) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);

  const values = {
    line: index + 1,
    their_item: upper(line.their_item),
    their_desc: line.description || "",
    their_uom: theirUom,
    their_price: blind ? null : theirPrice,
    their_ext: blind || theirPrice === null ? null : r2(num(line.their_extended) ?? theirPrice * units),
    qty,
    our_item: notCarried ? "Item Not Available" : na ? "N/A" : upper(line.our_item),
    our_desc: notCarried ? "N/A" : na ? "Item Not Available" : (line.calc?.ourDescription || ""),
    our_uom: na ? "" : ourUom,
    sell: na ? null : sell,
    sell_ext: na || sell === null ? null : r2(sell * units),
    matched_price: na || blind ? null : matched,
    matched_ext: na || blind || matched === null ? null : r2(matched * units),
    savings_pct: na || savingsUnit === null || !theirPrice ? null : savingsUnit / theirPrice,
    savings_unit: na ? null : r2(savingsUnit),
    savings_ext: na || savingsUnit === null ? null : r2(savingsUnit * units),
    account_price: accountPrice,
    account_ext: accountPrice === null ? null : r2(accountPrice * units),
    reprice_savings_pct: na || sell === null || !accountPrice ? null : (accountPrice - sell) / accountPrice,
    reprice_savings_ext: na || sell === null || accountPrice === null ? null : r2((accountPrice - sell) * units),
    note: line.customer_note || "",
    equiv_qty: qty,
    tier: null,
    comp_discount: null,
    blank: null,
    cost,
    cost_ext: cost === null ? null : r2(cost * units),
    margin: line.margin,
    account_margin: accountPrice && cost !== null ? (accountPrice - cost) / accountPrice : null,
    target: num(line.target_margin),
    price_at_target: line.priceAtTarget,
    pricing_method: line.calc?.pricingMethod || "",
  };
  if (template && template.kind === "reprice") {
    values.our_item = values.our_item || upper(line.their_item);
    values.our_uom = values.our_uom || theirUom;
  }
  return values;
}

// Percent fields are shown and exported as percentages.
const PERCENT_FIELDS = new Set(["savings_pct", "reprice_savings_pct", "margin", "account_margin", "target"]);
const MONEY_FIELDS = new Set(["their_price", "their_ext", "sell", "sell_ext", "matched_price", "matched_ext", "savings_unit", "savings_ext",
  "account_price", "account_ext", "reprice_savings_ext", "cost", "cost_ext", "price_at_target", "tier"]);

module.exports = { TEMPLATES, DEFAULT_TEMPLATE, getTemplate, describe, lineValues, PERCENT_FIELDS, MONEY_FIELDS };
