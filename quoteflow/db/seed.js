const { randomUUID, createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const users = [
  { id: "rep-1", email: "rep1@demo.com", name: "Alex Parker", role: "Rep", team: "Quotes", active: true },
  { id: "rep-2", email: "rep2@demo.com", name: "Sam Rivera", role: "Rep", team: "MDM", active: true },
  { id: "qualifier-1", email: "qualifier1@demo.com", name: "Robin Sato", role: "Qualifier", team: "Quotes", active: true },
  { id: "qualifier-2", email: "qualifier2@demo.com", name: "Pat Kim", role: "Qualifier", team: "MDM", active: true },
  { id: "manager", email: "manager@demo.com", name: "Morgan Lee", role: "Manager", team: "Quotes", active: true },
  { id: "quoter-1", email: "quoter1@demo.com", name: "Jordan Ellis", role: "Quoter", team: "Quotes", active: true },
  { id: "quoter-2", email: "quoter2@demo.com", name: "Taylor Ellis", role: "Quoter", team: "MDM", active: true },
  { id: "reviser-1", email: "reviser1@demo.com", name: "Riley Morgan", role: "Reviser", team: "Quotes", active: true },
  { id: "reviser-2", email: "reviser2@demo.com", name: "Casey Morgan", role: "Reviser", team: "MDM", active: true, can_approve: true },
];

// Users may hold more than one role. Approval is a permission, not a role:
// Managers can approve by default, and reviser-2 has the Can approve permission.
const userRoles = {
  "rep-1": ["Rep"],
  "rep-2": ["Rep"],
  "qualifier-1": ["Qualifier"],
  "qualifier-2": ["Qualifier"],
  "manager": ["Manager"],
  "quoter-1": ["Quoter"],
  "quoter-2": ["Quoter"],
  "reviser-1": ["Reviser"],
  "reviser-2": ["Reviser"],
};

const accountNames = [
  ["C10420", "Northstar Paper Co."],
  ["C21775", "Harborview Medical"],
  ["C30814", "Pine & Peak Builders"],
  ["C41906", "Redwood County Schools"],
  ["C52031", "Atlas Food Services"],
  ["C63188", "Bluewater Logistics"],
  ["C74215", "Crescent City Library"],
  ["C85309", "Summit Property Group"],
];

const salesManagers = [
  { id: "sales-manager-1", name: "Dana Brooks" },
  { id: "sales-manager-2", name: "Jamie Chen" },
  { id: "sales-manager-3", name: "Morgan Patel" },
  { id: "sales-manager-4", name: "Reese Thompson" },
];

const pplNames = [
  ["General Supplies", "Facilities"],
  ["Clinical Products", "Office Essentials"],
  ["Building Materials", "Safety"],
  ["Classroom Essentials", "Technology"],
  ["Foodservice Equipment", "Disposables"],
  ["Packaging", "Fleet Supplies"],
  ["Library Systems", "Office Products"],
  ["Property Maintenance", "Lighting"],
];

const statusNames = [
  "Submitted",
  "Qualifying",
  "Needs info",
  "Ready to assign",
  "Assigned",
  "In progress",
  "In revision",
  "Awaiting approval",
  "Approved",
  "Sent to customer",
  "Declined",
  "Returned to quoter",
  "Returned to reviser",
];

const statusPath = {
  Submitted: ["Submitted"],
  Qualifying: ["Submitted", "Qualifying"],
  "Needs info": ["Submitted", "Qualifying", "Needs info"],
  "Ready to assign": ["Submitted", "Qualifying", "Ready to assign"],
  Assigned: ["Submitted", "Qualifying", "Ready to assign", "Assigned"],
  "In progress": ["Submitted", "Qualifying", "Ready to assign", "Assigned", "In progress"],
  "In revision": ["Submitted", "Qualifying", "Ready to assign", "Assigned", "In progress", "In revision"],
  "Awaiting approval": ["Submitted", "Qualifying", "Ready to assign", "Assigned", "In progress", "In revision", "Awaiting approval"],
  Approved: ["Submitted", "Qualifying", "Ready to assign", "Assigned", "In progress", "In revision", "Awaiting approval", "Approved"],
  "Sent to customer": ["Submitted", "Qualifying", "Ready to assign", "Assigned", "In progress", "In revision", "Awaiting approval", "Approved", "Sent to customer"],
  Declined: ["Submitted", "Qualifying", "Declined"],
  "Returned to quoter": ["Submitted", "Qualifying", "Ready to assign", "Assigned", "In progress", "In revision", "Returned to quoter"],
  "Returned to reviser": ["Submitted", "Qualifying", "Ready to assign", "Assigned", "In progress", "In revision", "Awaiting approval", "Returned to reviser"],
};

const vendors = ["Northline Office", "Meridian Supply Co.", "Alder & Row", "Westfield Systems", "Harbor & Pine"];
const products = [
  { description: "Copy paper, 20 lb, letter size", brand: "Northline", uom: "case", count: 10, price: 42.5 },
  { description: "LED panel light, 2 x 4 ft, dimmable", brand: "Brighton", uom: "each", count: 1, price: 86.25 },
  { description: "Nitrile exam gloves, medium, powder free", brand: "Carewell", uom: "box", count: 100, price: 12.8 },
  { description: "Shipping carton, double wall, 18 in", brand: "Packright", uom: "bundle", count: 25, price: 31.4 },
  { description: "Whiteboard marker, chisel tip, black", brand: "Meridian", uom: "dozen", count: 12, price: 15.6 },
];

function accountId(accountNumber) {
  return `account-${accountNumber.slice(1).toLowerCase()}`;
}

function extractFieldRow({ quoteFileId, lineItemId = null, fieldGroup, fieldName, template, value, confidence = 0.92, needsReview = false, extractedAt }) {
  const normalizedValue = value === null || value === undefined ? "" : String(value);
  return {
    id: randomUUID(),
    quote_file_id: quoteFileId,
    line_item_id: lineItemId,
    field_group: fieldGroup,
    field_name: fieldName,
    template,
    original_value: normalizedValue,
    current_value: normalizedValue,
    confidence,
    needs_review: needsReview,
    extracted_at: extractedAt,
  };
}

function valuesForProduct(product, index, lineNumber) {
  const quantity = index % 3 + 1;
  const extendedPrice = Number((product.price * quantity).toFixed(2));
  return {
    competitorItemNumber: `V-${String(3200 + lineNumber).padStart(5, "0")}`,
    manufacturerPartNumber: `MP-${String(800 + lineNumber).padStart(5, "0")}`,
    brand: product.brand,
    description: product.description,
    descriptionSummary: product.description.split(",")[0],
    unitOfMeasure: product.uom,
    countPerUnit: product.count,
    pricePerUnitOfMeasure: product.price,
    quantityPurchased: quantity,
    extendedPrice,
    normalizedUnitPrice: Number((product.price / product.count).toFixed(4)),
    sourcePageLine: `Page 1, line ${lineNumber + 1}`,
  };
}

function databaseLine(values, fileId, lineNumber, edited) {
  return {
    id: randomUUID(),
    file_id: fileId,
    line_number: lineNumber,
    competitor_item_no: values.competitorItemNumber,
    manufacturer_part_no: values.manufacturerPartNumber,
    brand: values.brand,
    description_raw: values.description,
    description_summary: values.descriptionSummary,
    uom: values.unitOfMeasure,
    count_per_unit: values.countPerUnit,
    price_per_uom: values.pricePerUnitOfMeasure,
    quantity: values.quantityPurchased,
    extended_price: values.extendedPrice,
    normalized_unit_price: values.normalizedUnitPrice,
    source_page: values.sourcePageLine,
    confidence_min: edited ? 0.66 : 0.9,
    needs_review: edited || lineNumber % 2 === 0,
    edited_by_quoter: edited,
  };
}

const SAMPLE_FILES_DIRECTORY = path.join(__dirname, "..", "sample-files");
const QUOTE_UPLOADS_DIRECTORY = path.join(__dirname, "..", "uploads", "quotes");

function escapePdfText(value) {
  return String(value)
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildSampleInvoicePdf({ accountNumber, accountName, vendor, lines }) {
  const rows = [
    { size: 18, text: `${vendor} - INVOICE` },
    { size: 12, text: `Customer: ${accountNumber} ${accountName}` },
    { size: 12, text: "Invoice date: 2026-10-15" },
    { size: 12, text: "" },
    { size: 12, text: "Item                 Description                                      UOM      Qty   Price" },
    ...lines.map((line) => ({ size: 11, text: line })),
    { size: 12, text: "" },
    { size: 12, text: "Thank you for your business." },
  ];
  let content = "";
  let y = 740;
  for (const row of rows) {
    content += `BT /F1 ${row.size} Tf 1 0 0 1 72 ${y} Tm (${escapePdfText(row.text)}) Tj ET\n`;
    y -= row.size + 10;
  }
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, index) => {
    offsets[index] = Buffer.byteLength(pdf);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 0; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

async function ensureSampleFiles() {
  await fs.mkdir(SAMPLE_FILES_DIRECTORY, { recursive: true });
  const sampleNames = accountNames.map(([accountNumber, accountName]) => `${accountNumber}-${accountName}.pdf`);
  for (let index = 0; index < accountNames.length; index += 1) {
    const [accountNumber, accountName] = accountNames[index];
    const filePath = path.join(SAMPLE_FILES_DIRECTORY, sampleNames[index]);
    try {
      await fs.access(filePath);
    } catch {
      const vendor = vendors[index % vendors.length];
      const lines = [0, 1].map((lineIndex) => {
        const product = products[(index + lineIndex) % products.length];
        const itemNo = `V-${String(3200 + lineIndex).padStart(5, "0")}`;
        return `${itemNo}  ${product.description}  ${product.uom}  ${lineIndex + 1}  $${product.price.toFixed(2)}`;
      });
      await fs.writeFile(filePath, buildSampleInvoicePdf({ accountNumber, accountName, vendor, lines }));
    }
  }
  return sampleNames;
}

// Seeded quotes need a real file on disk so extraction and preview work.
async function attachSampleFiles(knex) {
  const missing = await knex("quote_files").whereNull("storage_key").select("id", "file_name");
  if (!missing.length) return 0;
  const sampleNames = await ensureSampleFiles();
  await fs.mkdir(QUOTE_UPLOADS_DIRECTORY, { recursive: true });
  const fallback = sampleNames[0];
  for (const row of missing) {
    const sampleName = sampleNames.includes(row.file_name) ? row.file_name : fallback;
    const buffer = await fs.readFile(path.join(SAMPLE_FILES_DIRECTORY, sampleName));
    const storageFile = `${row.id}-${row.file_name}`;
    await fs.writeFile(path.join(QUOTE_UPLOADS_DIRECTORY, storageFile), buffer);
    await knex("quote_files").where({ id: row.id }).update({ storage_key: `uploads/quotes/${storageFile}` });
  }
  return missing.length;
}

function getActor(status, previousStatus, usersForQuote) {
  if (status === "Assigned") return "manager";
  if (["Qualifying", "Needs info", "Ready to assign", "Declined"].includes(status)) return usersForQuote.qualifier;
  if (["In revision", "Returned to quoter"].includes(status)) return usersForQuote.reviser;
  if (["Awaiting approval", "Returned to reviser"].includes(status)) return usersForQuote.reviser;
  if (["Approved", "Sent to customer"].includes(status)) return usersForQuote.approver;
  return usersForQuote.quoter;
}

async function seed(knex) {
  const defaultSettings = {
    company_name: "QuoteFlow",
    logo_path: "/quoteflow-logo.svg",
    standard_lead_time_days: "14",
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = await knex("settings").where({ key }).first();
    if (!existing) await knex("settings").insert({ key, value });
  }

  for (const user of users) {
    const existing = await knex("users").where({ id: user.id }).first("id");
    if (!existing) await knex("users").insert(user);
    for (const role of userRoles[user.id] || [user.role]) {
      const existingRole = await knex("user_roles").where({ user_id: user.id, role }).first();
      if (!existingRole) await knex("user_roles").insert({ user_id: user.id, role });
    }
  }

  const accounts = accountNames.map(([account_number, account_name]) => ({
    id: accountId(account_number),
    account_number,
    account_name,
  }));
  for (const account of accounts) {
    const existing = await knex("accounts").where({ id: account.id }).first("id");
    if (!existing) await knex("accounts").insert(account);
  }
  for (const manager of salesManagers) {
    const existing = await knex("sales_managers").where({ id: manager.id }).first("id");
    if (!existing) await knex("sales_managers").insert(manager);
  }
  const repManagers = { "rep-1": "sales-manager-1", "rep-2": "sales-manager-2" };
  for (const [repId, managerId] of Object.entries(repManagers)) {
    const existing = await knex("rep_sales_managers").where({ rep_id: repId }).first("rep_id");
    if (!existing) await knex("rep_sales_managers").insert({ rep_id: repId, sales_manager_id: managerId });
  }
  for (let accountIndex = 0; accountIndex < accountNames.length; accountIndex += 1) {
    const account = accounts[accountIndex];
    for (let pplIndex = 0; pplIndex < pplNames[accountIndex].length; pplIndex += 1) {
      const ppl = {
        id: `${account.id}-ppl-${pplIndex + 1}`,
        account_id: account.id,
        name: pplNames[accountIndex][pplIndex],
      };
      const existing = await knex("ppls").where({ id: ppl.id }).first("id");
      if (!existing) await knex("ppls").insert(ppl);
    }
  }

  const [{ count }] = await knex("quotes").count({ count: "id" });
  if (Number(count) > 0) {
    await attachSampleFiles(knex);
    return { seeded: false, quotes: 0 };
  }

  // Seed the "Extended Prices – Qty & GP Margin" template into the builder tables.
  const existingTemplate = await knex("templates").where({ name: "Extended Prices – Qty & GP Margin" }).first();
  if (!existingTemplate) {
    const templateColumns = [
      ["Line", "A", "calculated", "lineNumber", "rowIndex + 1", false],
      ["Competitor Item #", "B", "ocr", "competitorItemNumber", null, false],
      ["Description", "C", "ocr", "description", null, false],
      ["Competitor UOM", "D", "ocr", "competitorUom", null, false],
      ["Competitor Price", "E", "ocr", "competitorPrice", null, false],
      ["Qty", "F", "ocr", "quantity", null, false],
      ["Extended Competitor", "G", "calculated", "extendedCompetitor", "competitorPrice * quantity", false],
      ["Our UOM", "H", "crossReference", "ourUom", null, false],
      ["Our Price (Matched UOM)", "I", "calculated", "ourPriceMatched", "(ourSellPrice / ourCountPerUom) * competitorCountPerUom", false],
      ["Extended Ours", "J", "calculated", "extendedOurs", "ourPriceMatched * quantity", false],
      ["Savings %", "K", "calculated", "savingsPercent", "(competitorPrice - ourPriceMatched) / competitorPrice", false],
      ["Savings $", "L", "calculated", "savingsDollars", "extendedCompetitor - extendedOurs", false],
      ["Cost", "M", "priceReport", "cost", null, true],
      ["Extended Cost", "N", "calculated", "extendedCost", "(extendedOurs / ourSellPrice) * cost", true],
      ["Margin", "O", "calculated", "margin", "(sell - cost) / sell", true],
      ["Target Margin", "P", "quoter", "targetMargin", null, true],
      ["Price at Target Margin", "Q", "calculated", "priceAtTargetMargin", "ROUNDUP(cost / (1 - targetMargin), 2)", true],
      ["Pricing Method", "R", "priceReport", "pricingMethod", null, true],
      ["Final Price", "S", "quoter", "finalPrice", null, false],
      ["Note", "T", "quoter", "note", null, false],
    ];
    const templateId = randomUUID();
    await knex("templates").insert({ id: templateId, name: "Extended Prices – Qty & GP Margin", active: true, created_by_id: "manager" });
    const versionId = randomUUID();
    await knex("template_versions").insert({ id: versionId, template_id: templateId, version: 1, file_name: "extended-prices-qty-gp.xlsx", published_at: Math.floor(Date.now() / 1000) });
    for (let index = 0; index < templateColumns.length; index += 1) {
      const [header, excelColumn, source, fieldKey, formula, internalOnly] = templateColumns[index];
      await knex("template_columns").insert({
        id: randomUUID(),
        version_id: versionId,
        position: index + 1,
        header,
        excel_column: excelColumn,
        source,
        field_key: fieldKey,
        formula,
        internal_only: internalOnly,
      });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  await knex.transaction(async (trx) => {
    let quoteSequence = 0;
    let mdmSequence = 0;
    for (let index = 0; index < 30; index += 1) {
      const currentStatus = statusNames[index % statusNames.length];
      const path = statusPath[currentStatus];
      const account = accountNames[index % accountNames.length];
      const accountKey = account[0];
      const quoteId = randomUUID();
      const quoteType = index % 3 === 2 ? "MDM" : "Quote";
      if (quoteType === "MDM") {
        mdmSequence += 1;
      } else {
        quoteSequence += 1;
      }
      const sequence = quoteType === "MDM" ? mdmSequence : quoteSequence;
      const quoteNumber = `${quoteType === "MDM" ? "MDM" : "Q"}-${String(sequence).padStart(6, "0")}`;
      const quoter = quoteType === "MDM" ? users.find((u) => u.id === "quoter-2") : users.find((u) => u.id === "quoter-1");
      const qualifier = quoteType === "MDM" ? users.find((u) => u.id === "qualifier-2") : users.find((u) => u.id === "qualifier-1");
      const reviser = quoteType === "MDM" ? users.find((u) => u.id === "reviser-2") : users.find((u) => u.id === "reviser-1");
      const approver = users.find((u) => u.id === "manager");
      const updatedAt = now - ((index * 2) % 60) * 86400;
      const stageStep = 3 * 3600;
      const createdAt = updatedAt - (path.length - 1) * stageStep;
      const assigned = path.some((status) => ["Assigned", "In progress", "In revision", "Awaiting approval", "Approved", "Sent to customer", "Returned to quoter", "Returned to reviser"].includes(status));
      const screened = path.some((status) => ["Ready to assign", "Assigned", "In progress", "In revision", "Awaiting approval", "Approved", "Sent to customer", "Returned to quoter", "Returned to reviser"].includes(status));
      const decided = ["Approved", "Sent to customer", "Declined"].includes(currentStatus);
      const contractPricing = index % 4 === 0;
      const template = ["invoice", "receipt", "image", "full"][index % 4];

      await trx("quotes").insert({
        id: quoteId,
        quote_number: quoteNumber,
        quote_type: quoteType,
        account_id: accountId(accountKey),
        submitted_by_rep: quoter.id,
        team: quoteType === "MDM" ? "MDM" : "Quotes",
        template,
        status: currentStatus,
        assigned_quoter_id: assigned ? quoter.id : null,
        screened_by_id: screened ? qualifier.id : null,
        final_reviewer_id: decided ? approver.id : null,
        contract_pricing: contractPricing,
        created_at: createdAt,
        updated_at: updatedAt,
      });

      const quoteFileId = randomUUID();
      const fileName = `${account[0]}-${account[1]}.pdf`;
      const vendor = vendors[index % vendors.length];
      const invoiceDate = new Date((updatedAt - 86400 * ((index % 20) + 1)) * 1000).toISOString().slice(0, 10);
      const fileHash = createHash("sha256").update(`${quoteNumber}:${fileName}`).digest("hex");
      await trx("quote_files").insert({
        id: quoteFileId,
        quote_id: quoteId,
        file_name: fileName,
        file_type: "application/pdf",
        file_hash: fileHash,
        uploaded_by_id: quoter.id,
        uploaded_at: createdAt,
        invoice_source: vendor,
        invoice_date: invoiceDate,
      });

      for (let historyIndex = 0; historyIndex < path.length; historyIndex += 1) {
        const toStatus = path[historyIndex];
        const fromStatus = historyIndex === 0 ? null : path[historyIndex - 1];
        await trx("quote_status_history").insert({
          id: randomUUID(),
          quote_id: quoteId,
          from_status: fromStatus,
          to_status: toStatus,
          changed_by_id: getActor(toStatus, fromStatus, { quoter: quoter.id, qualifier: qualifier.id, reviser: reviser.id, approver: approver.id }),
          changed_at: createdAt + historyIndex * stageStep,
          reason: historyIndex === 0 ? "Quote created from seeded sample submission." : "Seeded workflow status transition.",
        });
      }

      const headerValues = {
        quoteId: quoteNumber,
        accountNumber: account[0],
        accountName: account[1],
        invoiceSource: vendor,
        invoiceDate,
        uploadDate: new Date(createdAt * 1000).toISOString().slice(0, 10),
        uploadedBy: quoter.name,
        contractPricing: contractPricing ? "Yes" : "No",
        itemLineCount: "2",
        duplicateWarning: "No duplicate found.",
        accountMismatch: "No mismatch detected.",
      };
      const headerFieldRows = Object.entries(headerValues).map(([fieldName, value]) => extractFieldRow({
        quoteFileId,
        fieldGroup: "header",
        fieldName,
        template,
        value,
        confidence: fieldName === "accountMismatch" ? 0.99 : 0.94,
        extractedAt: createdAt,
      }));
      const detailValues = template === "full" ? { tax: "USD 18.42", shipping: "USD 12.00", fees: "USD 4.50" } : {};
      const detailFieldRows = Object.entries(detailValues).map(([fieldName, value]) => extractFieldRow({
        quoteFileId,
        fieldGroup: "detail",
        fieldName,
        template,
        value,
        confidence: 0.91,
        extractedAt: createdAt,
      }));

      const extractedRows = [...headerFieldRows, ...detailFieldRows];
      const lineFieldRows = [];
      const savedLineItems = [];
      for (let lineIndex = 0; lineIndex < 2; lineIndex += 1) {
        const values = valuesForProduct(products[(index + lineIndex) % products.length], index, lineIndex);
        const edited = index % 5 === 0 && lineIndex === 0;
        const originalDescription = values.description;
        if (edited) values.description = `${values.description} - verified specification`;
        const lineItem = databaseLine(values, quoteFileId, lineIndex + 1, edited);
        await trx("line_items").insert(lineItem);
        savedLineItems.push({ ...lineItem, originalDescription, edited });

        for (const [fieldName, value] of Object.entries(values)) {
          const originalValue = fieldName === "description" && edited ? originalDescription : value;
          lineFieldRows.push(extractFieldRow({
            quoteFileId,
            lineItemId: lineItem.id,
            fieldGroup: "line",
            fieldName,
            template,
            value: originalValue,
            confidence: fieldName === "description" && edited ? 0.66 : 0.9,
            needsReview: fieldName === "description" && edited,
            extractedAt: createdAt,
          }));
        }
      }

      extractedRows.push(...lineFieldRows);
      await trx("quote_extracted_fields").insert(extractedRows);

      for (const savedLine of savedLineItems.filter((line) => line.edited)) {
        const extractedDescription = lineFieldRows.find((field) => field.line_item_id === savedLine.id && field.field_name === "description");
        if (!extractedDescription) continue;
        await trx("quote_extracted_fields").where({ id: extractedDescription.id }).update({
          current_value: savedLine.description_raw,
        });
        await trx("field_edits").insert({
          id: randomUUID(),
          line_item_id: savedLine.id,
          quote_file_id: quoteFileId,
          extracted_field_id: extractedDescription.id,
          field_name: "description",
          original_value: savedLine.originalDescription,
          new_value: savedLine.description_raw,
          edited_by_id: quoter.id,
          edited_at: updatedAt,
        });
      }
    }
  });

  await attachSampleFiles(knex);
  return { seeded: true, quotes: 30, quoteFiles: 30 };
}

module.exports = { seed, users, accountNames, statusNames, salesManagers, pplNames };
