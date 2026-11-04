// Quote export templates. Each template lists its columns in Excel order.
// Per column: key, header text (copied EXACTLY from the source Excel file),
// Excel column letter, source (ocr | priceReport | crossReference | quoter |
// calculated), formula, and internalOnly (true for columns hidden from the
// customer export). Add more templates by following the same shape.

const templates = [
  {
    key: "extended-prices-qty-gp",
    label: "Extended Prices – Qty & GP Margin",
    columns: [
      { key: "lineNumber", header: "Line", column: "A", source: "calculated", formula: "rowIndex + 1" },
      { key: "competitorItemNumber", header: "Competitor Item #", column: "B", source: "ocr" },
      { key: "description", header: "Description", column: "C", source: "ocr" },
      { key: "competitorUom", header: "Competitor UOM", column: "D", source: "ocr" },
      { key: "competitorPrice", header: "Competitor Price", column: "E", source: "ocr", numberFormat: "$#,##0.00" },
      { key: "quantity", header: "Qty", column: "F", source: "ocr", numberFormat: "0" },
      { key: "extendedCompetitor", header: "Extended Competitor", column: "G", source: "calculated", formula: "competitorPrice * quantity", numberFormat: "$#,##0.00" },
      { key: "ourUom", header: "Our UOM", column: "H", source: "crossReference" },
      { key: "ourPriceMatched", header: "Our Price (Matched UOM)", column: "I", source: "calculated", formula: "(ourSellPrice / ourCountPerUom) * competitorCountPerUom", numberFormat: "$#,##0.00" },
      { key: "extendedOurs", header: "Extended Ours", column: "J", source: "calculated", formula: "ourPriceMatched * quantity", numberFormat: "$#,##0.00" },
      { key: "savingsPercent", header: "Savings %", column: "K", source: "calculated", formula: "(competitorPrice - ourPriceMatched) / competitorPrice", numberFormat: "0.0%" },
      { key: "savingsDollars", header: "Savings $", column: "L", source: "calculated", formula: "extendedCompetitor - extendedOurs", numberFormat: "$#,##0.00" },
      { key: "cost", header: "Cost", column: "M", source: "priceReport", internalOnly: true, numberFormat: "$#,##0.00" },
      { key: "extendedCost", header: "Extended Cost", column: "N", source: "calculated", formula: "(extendedOurs / ourSellPrice) * cost", internalOnly: true, numberFormat: "$#,##0.00" },
      { key: "margin", header: "Margin", column: "O", source: "calculated", formula: "(sell - cost) / sell", internalOnly: true, numberFormat: "0.0%" },
      { key: "targetMargin", header: "Target Margin", column: "P", source: "quoter", internalOnly: true, numberFormat: "0.0%" },
      { key: "priceAtTargetMargin", header: "Price at Target Margin", column: "Q", source: "calculated", formula: "ROUNDUP(cost / (1 - targetMargin), 2)", internalOnly: true, numberFormat: "$#,##0.00" },
      { key: "pricingMethod", header: "Pricing Method", column: "R", source: "priceReport", internalOnly: true },
      { key: "finalPrice", header: "Final Price", column: "S", source: "quoter", numberFormat: "$#,##0.00" },
      { key: "note", header: "Note", column: "T", source: "quoter" },
    ],
  },
];

function getTemplate(key) {
  return templates.find((template) => template.key === key) || templates[0];
}

module.exports = { templates, getTemplate };
