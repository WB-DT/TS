// Generates made-up sample pricing reports for local development and demos.
// Run: node sample-data/generate.js
const XLSX = require("xlsx");
const path = require("node:path");

const items = [
  { item: "NS1001", desc: "Copy paper, 20 lb, letter size", uom: "CT", category: "Paper", cost: 32.5, price: 42.5, list: 48.0, ctlge: 44.0 },
  { item: "NS1002", desc: "LED panel light, 2 x 4 ft, dimmable", uom: "EA", category: "Lighting", cost: 61.0, price: 86.25, list: 95.0, ctlge: 88.0 },
  { item: "CW2001", desc: "Nitrile exam gloves, medium, powder free", uom: "BX", category: "Safety", cost: 9.1, price: 12.8, list: 14.5, ctlge: 13.1 },
  { item: "PR3001", desc: "Shipping carton, double wall, 18 in", uom: "BD", category: "Packaging", cost: 24.0, price: 31.4, list: 35.0, ctlge: 32.0 },
  { item: "MR4001", desc: "Whiteboard marker, chisel tip, black", uom: "DZ", category: "Office", cost: 10.2, price: 15.6, list: 18.0, ctlge: 16.2 },
  { item: "CSI9001", desc: "Custom imprint service fee", uom: "EA", category: "Service", cost: 0, price: 25.0, list: 25.0, ctlge: 25.0 },
];

function priceReportRows(accountNumber, accountName, house = false) {
  return items.map((item, index) => ({
    "Account Number": accountNumber,
    "Account Name": accountName,
    "Item Number": item.item,
    "Item Status": index === 3 ? "Discontinued" : "Active",
    "New ItemID": index === 3 ? "PR3002" : "",
    "Item Description": item.desc,
    "Item UOM": item.uom,
    "Default UOM": item.uom,
    "Current Price": house ? item.list : item.price,
    "Current List": item.list,
    "Current Cost": house ? item.cost * 1.05 : item.cost,
    "Pricing Method": index % 2 === 0 ? "Contract" : "List less discount",
  }));
}

function costingRows() {
  return items.map((item, index) => ({
    StockNumber: `STK-${item.item}`,
    "Product Reference": item.item,
    "Target Item": item.item,
    Status: index === 3 ? "Inactive" : "Active",
    Description: item.desc,
    UOM: item.uom,
    DefaultUOM: item.uom,
    "Product Category": item.category,
    "Loaded Cost": item.cost * 1.02,
    "Direct Cost": item.cost,
    "Direct UOM": item.uom,
    Green: index % 2 === 0 ? "Y" : "N",
    Recycled: index % 3 === 0 ? "Y" : "N",
    "Minority Owned": "N",
    "Has Content": "Y",
    "In Alps Catalog": "Y",
    IsOnWeb: "Y",
    Stocked: "Y",
    "Current List Price": item.list,
    "Quantity On Hand": 100 + index * 25,
    "Substitute Item": index === 3 ? "PR3002" : "",
    "Substitute Type": index === 3 ? "Direct" : "",
    "Substitute To Sales Unit": "",
    "BOS-MA": 10 + index,
    "CEN-NJ": 8 + index,
    "COL-MD": 6 + index,
    "LIV-NY": 12 + index,
    "ORL-FL": 4 + index,
    CTLGE_Price: item.ctlge,
    VendorName: ["Northline", "Brighton", "Carewell", "Packright", "Meridian", "ServiceCo"][index],
    ItemSource: "Stock",
    AltItemStatus: "",
    AltStatusDate: "",
  }));
}

function writeWorkbook(rows, filename) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, path.join(__dirname, filename));
  console.log("wrote", filename, `(${rows.length} rows)`);
}

writeWorkbook(priceReportRows("C10420", "Northstar Paper Co."), "account-price-report.xlsx");
writeWorkbook(priceReportRows("HOUSE", "House Account", true), "house-account-price-report.xlsx");
writeWorkbook(costingRows(), "costing-report.xlsx");
