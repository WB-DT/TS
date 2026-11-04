require("dotenv").config();

const express = require("express");
const multer = require("multer");
const { AzureKeyCredential } = require("@azure/core-auth");
const DocumentIntelligence = require("@azure-rest/ai-document-intelligence").default;
const { createHash, randomBytes } = require("node:crypto");
const fs = require("node:fs/promises");
const {
  getLongRunningPoller,
  isUnexpected,
} = require("@azure-rest/ai-document-intelligence");
const path = require("node:path");
const ExcelJS = require("exceljs");
const auth = require("./auth");
const fieldCatalog = require("./fields");
const pricing = require("./pricing");
const teamsImport = require("./teams-import");
const quoteTemplates = require("./templates");
const database = require("./db");

const app = express();
const port = process.env.PORT || 3000;
const brandImageTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);
const brandUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (!brandImageTypes.has(file.mimetype)) {
      const error = new Error("Upload a PNG, JPEG, or WebP logo.");
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});
const requestFileTypes = new Map([
  ["application/pdf", ".pdf"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/tiff", ".tiff"],
  ["image/bmp", ".bmp"],
  ["image/webp", ".webp"],
  ["application/vnd.ms-excel", ".xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["application/msword", ".doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
]);
const requestUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 10 },
  fileFilter(_request, file, callback) {
    if (!requestFileTypes.has(file.mimetype)) {
      const error = new Error("Use PDF, image, Excel, or Word files.");
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});
const reportFileTypes = new Map([
  ["application/vnd.ms-excel", ".xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["text/csv", ".csv"],
  ["application/csv", ".csv"],
]);
const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (!reportFileTypes.has(file.mimetype)) {
      const error = new Error("Upload an .xlsx or .csv report.");
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

app.use(express.json({ limit: "64kb" }));
app.use(auth.sessionMiddleware);
auth.registerAuthRoutes(app);
app.use(express.static(path.join(__dirname, "public"), { index: false }));

app.get("/login", auth.redirectIfAuthenticated, (_request, response) => {
  response.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/", auth.redirectHome);

app.get("/api/branding", async (_request, response) => {
  const settings = await database.settings.get();
  response.set("Cache-Control", "no-store");
  response.json({
    companyName: settings.company_name || "QuoteFlow",
    logoPath: settings.logo_path || "/quoteflow-logo.svg",
    standardLeadTimeDays: Number(settings.standard_lead_time_days || 14),
  });
});

app.put("/api/branding", auth.requireRole("Manager"), async (request, response) => {
  const companyName = String(request.body?.companyName || "").trim();
  if (!companyName || companyName.length > 120) {
    response.status(400).json({ error: "Company name is required and must be 120 characters or fewer." });
    return;
  }
  const settings = await database.settings.update({ company_name: companyName });
  response.json({ companyName: settings.company_name, logoPath: settings.logo_path });
});

app.post("/api/branding/logo", auth.requireRole("Manager"), brandUpload.single("logo"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "Choose a PNG, JPEG, or WebP logo." });
    return;
  }
  const extension = brandImageTypes.get(request.file.mimetype);
  const hash = createHash("sha256").update(request.file.buffer).digest("hex").slice(0, 20);
  const directory = path.join(__dirname, "public", "uploads", "brand");
  const filename = `logo-${hash}${extension}`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, filename), request.file.buffer);
  const logoPath = `/uploads/brand/${filename}`;
  await database.settings.update({ logo_path: logoPath });
  response.json({ logoPath });
});

app.get("/api/workspace", auth.requireAuth, async (request, response) => {
  const { user } = request;
  const [quotes, reports, settings] = await Promise.all([
    user.role === "Rep" ? database.quotes.listRequestsForRep(user) : database.quotes.listForWorkspace(user),
    user.role === "Manager"
      ? database.quotes.reportingData()
      : Promise.resolve({ cycleTimes: [], workload: [], reviserOutcomes: [], ocrAccuracy: [] }),
    database.settings.get(),
  ]);
  const quoters = user.role === "Manager" ? await database.users.listActiveQuoters() : [];
  const reassignments = user.role === "Manager" ? await database.quotes.listNeedsReassignment() : [];

  response.set("Cache-Control", "no-store");
  response.json({
    user,
    navigation: auth.navigationFor(user),
    quotes,
    reports,
    quoters,
    reassignments,
    branding: {
      companyName: settings.company_name || "QuoteFlow",
      logoPath: settings.logo_path || "/quoteflow-logo.svg",
      standardLeadTimeDays: Number(settings.standard_lead_time_days || 14),
    },
  });
});

// Import from Teams, step 1: read the uploaded quote log and preview it. Saves nothing.
// A row counts as "already imported" when its form response ID is already on a quote.
app.post("/api/teams-import/preview", auth.requireRole("Manager", "Qualifier"), reportUpload.single("log"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "Choose the quote log Excel file." });
    return;
  }
  let result;
  try {
    result = teamsImport.parseQuoteLog(request.file.buffer);
  } catch (error) {
    response.status(400).json({ error: error.status ? error.message : "That file could not be read. Make sure it is the quote log Excel file." });
    return;
  }
  const importedIds = new Set(await database.connection("quotes").whereNotNull("teams_response_id").pluck("teams_response_id"));
  const requests = result.requests.map((item) => ({
    ...item,
    alreadyImported: Boolean(item.responseId && importedIds.has(item.responseId)),
  }));
  const toReview = requests.filter((item) => !item.alreadyImported);
  response.json({
    sheetName: result.sheetName,
    columnsMissing: result.columnsMissing,
    summary: {
      total: requests.length,
      new: toReview.filter((item) => item.status === "Ready").length,
      alreadyImported: requests.length - toReview.length,
      needsAttention: toReview.filter((item) => item.status !== "Ready").length,
    },
    // Only the rows that matter for the preview, capped so a big log stays fast.
    requests: toReview.slice(0, 200),
  });
});
app.get("/api/request-options", auth.requireRole("Rep"), async (request, response) => {
  const options = await database.users.listRequestOptions(request.user.id);
  response.set("Cache-Control", "no-store");
  response.json({
    ...options,
    requestFields: fieldCatalog.fieldsForTemplate("invoice").requestFields,
  });
});

app.post("/api/ppls", auth.requireRole("Rep"), async (request, response) => {
  const ppl = await database.users.createPpl({
    accountNumber: request.body?.accountNumber,
    accountName: request.body?.accountName,
    name: request.body?.name,
  });
  response.status(201).json(ppl);
});

app.post("/api/requests", auth.requireRole("Rep"), requestUpload.array("files", 10), async (request, response) => {
  const body = request.body || {};
  const requestType = String(body.requestType || "");
  const priority = String(body.priority || "");
  const submitterRole = String(body.submitterRole || "");
  const quoteType = String(body.quoteType || "Quote");
  const validTypes = new Set(["Existing customer", "Lead", "Win-back"]);
  const validQuoteTypes = new Set(["Quote", "MDM"]);
  const validSubmitterRoles = new Set(["Retention", "AM1", "AM2", "AM3", "Hunter", "Jackson office"]);
  const validReasons = new Set([
    "Customer deadline or bid due",
    "Competitor quote expiring",
    "At-risk account",
    "Large order opportunity",
    "Other",
  ]);
  const accountNumber = String(body.accountNumber || "").trim().toUpperCase();
  const companyName = String(body.companyName || "").trim();
  const customerNeeds = String(body.customerNeeds || "").trim();
  const asapItems = Array.isArray(body.asapItems) ? body.asapItems : body.asapItems ? [body.asapItems] : [];

  if (!validTypes.has(requestType)) {
    response.status(400).json({ error: "Choose Existing customer, Lead, or Win-back." });
    return;
  }
  if (!validQuoteTypes.has(quoteType)) {
    response.status(400).json({ error: "Choose Quote or MDM." });
    return;
  }
  if (!validSubmitterRoles.has(submitterRole)) {
    response.status(400).json({ error: "Choose a valid submitter role." });
    return;
  }
  if (["Existing customer", "Win-back"].includes(requestType) && !/^C\d+$/.test(accountNumber)) {
    response.status(400).json({ error: "Enter a valid customer number beginning with C." });
    return;
  }
  if (accountNumber && !/^C\d+$/.test(accountNumber)) {
    response.status(400).json({ error: "Customer numbers must begin with C and contain digits only." });
    return;
  }
  if (!companyName || companyName.length > 200 || !customerNeeds) {
    response.status(400).json({ error: "Company name and customer needs are required." });
    return;
  }
  if (priority !== "Standard" && priority !== "ASAP") {
    response.status(400).json({ error: "Choose Standard or ASAP priority." });
    return;
  }

  const neededBy = String(body.neededBy || "");
  const asapReason = String(body.asapReason || "");
  const notes = String(body.notes || "").trim();
  if (priority === "ASAP") {
    const date = new Date(`${neededBy}T00:00:00`);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (!neededBy || Number.isNaN(date.getTime()) || date < tomorrow) {
      response.status(400).json({ error: "ASAP requests need a future needed-by date." });
      return;
    }
    if (!validReasons.has(asapReason) || asapItems.length === 0) {
      response.status(400).json({ error: "Choose an ASAP reason and specify which items are urgent." });
      return;
    }
    if (asapReason === "Other" && !notes) {
      response.status(400).json({ error: "Add notes when the ASAP reason is Other." });
      return;
    }
    if (!body.asapApprovedBy) {
      response.status(400).json({ error: "Choose the approving sales manager for an ASAP request." });
      return;
    }
  }
  if (body.shipZip && !/^\d{5}(?:-\d{4})?$/.test(String(body.shipZip).trim())) {
    response.status(400).json({ error: "Enter a valid ZIP code." });
    return;
  }

  const uploadedFiles = Array.isArray(request.files) ? request.files : [];
  if (uploadedFiles.length === 0) {
    response.status(400).json({ error: "Attach at least one supporting document." });
    return;
  }

  const safePrefix = `${accountNumber ? `${accountNumber}-` : ""}${companyName}`
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 150);
  const uploadDirectory = path.join(__dirname, "uploads", "quotes");
  await fs.mkdir(uploadDirectory, { recursive: true });
  const files = [];
  try {
    for (const uploaded of uploadedFiles) {
      const fileHash = createHash("sha256").update(uploaded.buffer).digest("hex");
      const fileId = randomBytes(16).toString("hex");
      const fileName = `${safePrefix}${requestFileTypes.get(uploaded.mimetype)}`;
      const storageFile = `${fileId}-${fileName}`;
      await fs.writeFile(path.join(uploadDirectory, storageFile), uploaded.buffer, { flag: "wx" });
      files.push({
        id: fileId,
        fileName,
        fileType: uploaded.mimetype,
        fileHash,
        storageKey: `uploads/quotes/${storageFile}`,
        absolutePath: path.join(uploadDirectory, storageFile),
      });
    }

    const result = await database.quotes.createRepRequest({
      user: request.user,
      request: {
        ...body,
        requestType,
        submitterRole,
        priority,
        quoteType,
        accountNumber,
        companyName,
        customerNeeds,
        neededBy: priority === "ASAP" ? neededBy : null,
        asapReason: priority === "ASAP" ? asapReason : null,
        asapItems: priority === "ASAP" ? asapItems : [],
        asapApprovedBy: priority === "ASAP" ? body.asapApprovedBy : null,
        notes,
      },
      files,
    });
    response.status(201).json(result);
  } catch (error) {
    await Promise.all(files.map((file) => fs.rm(file.absolutePath, { force: true })));
    throw error;
  }
});

app.get("/api/quoters", auth.requireRole("Manager"), async (_request, response) => {
  response.json(await database.users.listActiveQuoters());
});

app.get("/api/field-definitions", auth.requireRole("Quoter"), (request, response) => {
  const definitionSet = fieldCatalog.fieldsForTemplate(request.query.template);
  response.set("Cache-Control", "no-store");
  response.json({
    templates: fieldCatalog.templates,
    template: definitionSet.template,
    headerFields: definitionSet.headerFields,
    lineItemFields: definitionSet.lineItemFields,
    detailFields: definitionSet.detailFields,
  });
});

app.post("/api/reviews", auth.requireRole("Quoter"), async (request, response) => {
  const review = request.body;
  if (!review || typeof review !== "object" || !review.fields || !Array.isArray(review.lineItems)) {
    response.status(400).json({ error: "The quote review payload is incomplete." });
    return;
  }
  if (review.lineItems.length > 200) {
    response.status(413).json({ error: "A quote can contain no more than 200 line items." });
    return;
  }

  const submitted = await database.quotes.submitReview({ user: request.user, review });
  response.status(201).json(submitted);
});

app.get("/api/quotes/:id", auth.requireAuth, async (request, response) => {
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  const { user } = request;
  const isAssigned = detail.assigned_quoter_id === user.id;
  const isSubmitter = detail.submitted_by_rep === user.id || detail.submitted_by_id === user.id;
  if (user.role === "Quoter" && !isAssigned && !isSubmitter) {
    response.status(403).json({ error: "You do not have access to this quote." });
    return;
  }
  if (user.role === "Rep" && !isSubmitter) {
    response.status(403).json({ error: "You do not have access to this quote." });
    return;
  }
  response.set("Cache-Control", "no-store");
  // Reps never see cost, margin, or internal pricing columns.
  if (user.role === "Rep") {
    const sanitized = { ...detail };
    delete sanitized.contract_pricing;
    response.json(sanitized);
    return;
  }
  response.json(detail);
});

const quoteUploadDirectory = path.join(__dirname, "uploads", "quotes");

async function writeQuoteFile(uploaded, fileId) {
  const extension = requestFileTypes.get(uploaded.mimetype) || "";
  const baseName = String(uploaded.originalname || "document")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 150) || "document";
  const fileName = path.extname(baseName) ? baseName : `${baseName}${extension}`;
  const storageFile = `${fileId}-${fileName}`;
  await fs.mkdir(quoteUploadDirectory, { recursive: true });
  const absolutePath = path.join(quoteUploadDirectory, storageFile);
  if (path.dirname(absolutePath) !== quoteUploadDirectory) {
    const error = new Error("Invalid file identifier.");
    error.status = 400;
    throw error;
  }
  await fs.writeFile(absolutePath, uploaded.buffer);
  return {
    fileName,
    fileType: uploaded.mimetype,
    fileHash: createHash("sha256").update(uploaded.buffer).digest("hex"),
    storageKey: `uploads/quotes/${storageFile}`,
    absolutePath,
  };
}

async function removeStoredFile(storageKey) {
  if (!storageKey) return;
  const absolutePath = path.join(__dirname, storageKey);
  if (!absolutePath.startsWith(path.join(__dirname, "uploads"))) return;
  await fs.rm(absolutePath, { force: true });
}

app.post("/api/quotes/:id/files", auth.requireAuth, requestUpload.single("file"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "Choose a file to add." });
    return;
  }
  let stored = null;
  try {
    const detail = await database.quotes.getDetail(request.params.id);
    if (!detail) {
      response.status(404).json({ error: "Quote not found." });
      return;
    }
    const fileId = randomBytes(16).toString("hex");
    stored = await writeQuoteFile(request.file, fileId);
    const result = await database.quotes.addFile({
      quoteId: detail.id,
      user: request.user,
      file: { id: fileId, fileName: stored.fileName, fileType: stored.fileType, fileHash: stored.fileHash, storageKey: stored.storageKey },
    });
    response.status(201).json(result);
  } catch (error) {
    if (stored) await fs.rm(stored.absolutePath, { force: true });
    console.error(`File upload failed for quote ${request.params.id}:`, error);
    const status = Number(error.status) || 500;
    response.status(status).json({ error: status >= 500 ? "The file could not be uploaded. Please try again." : error.message });
  }
});

app.get("/api/quotes/:id/files/:fileId", auth.requireAuth, async (request, response) => {
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  const file = detail.files.find((entry) => entry.id === request.params.fileId);
  if (!file || !file.storageKey) {
    response.status(404).json({ error: "File not found." });
    return;
  }
  const absolutePath = path.join(__dirname, file.storageKey);
  if (!absolutePath.startsWith(path.join(__dirname, "uploads"))) {
    response.status(400).json({ error: "Invalid file location." });
    return;
  }
  response.set("Content-Type", file.fileType);
  response.set("Content-Disposition", `inline; filename="${String(file.fileName).replace(/"/g, "")}"`);
  response.sendFile(absolutePath);
});

app.post("/api/quotes/:id/files/:fileId/replace", auth.requireAuth, requestUpload.single("file"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "Choose a replacement file." });
    return;
  }
  let stored = null;
  try {
    stored = await writeQuoteFile(request.file, request.params.fileId);
    const result = await database.quotes.replaceFile({
      quoteId: request.params.id,
      fileId: request.params.fileId,
      user: request.user,
      file: { fileName: stored.fileName, fileType: stored.fileType, fileHash: stored.fileHash, storageKey: stored.storageKey },
    });
    if (result.previousStorageKey && result.previousStorageKey !== stored.storageKey) {
      await removeStoredFile(result.previousStorageKey);
    }
    response.json(result);
  } catch (error) {
    if (stored) await fs.rm(stored.absolutePath, { force: true });
    console.error(`File replace failed for quote ${request.params.id}:`, error);
    const status = Number(error.status) || 500;
    response.status(status).json({ error: status >= 500 ? "The file could not be replaced. Please try again." : error.message });
  }
});

app.post("/api/quotes/:id/files/:fileId/remove", auth.requireAuth, async (request, response) => {
  try {
    const result = await database.quotes.removeFile({
      quoteId: request.params.id,
      fileId: request.params.fileId,
      user: request.user,
    });
    await removeStoredFile(result.storageKey);
    response.json(result);
  } catch (error) {
    console.error(`File remove failed for quote ${request.params.id}:`, error);
    const status = Number(error.status) || 500;
    response.status(status).json({ error: status >= 500 ? "The file could not be removed. Please try again." : error.message });
  }
});

const REPORT_TYPES = {
  account: { label: "Account price report", parse: (buffer) => pricing.parsePriceReport(buffer, "Account price report") },
  house: { label: "House account price report", parse: (buffer) => pricing.parsePriceReport(buffer, "House account price report") },
  costing: { label: "Costing report", parse: (buffer) => pricing.parseCostingReport(buffer) },
};

app.post("/api/quotes/:id/pricing-reports/:type", auth.requireRole("Quoter"), reportUpload.single("report"), async (request, response) => {
  const reportType = REPORT_TYPES[request.params.type];
  if (!reportType) {
    response.status(400).json({ error: "Unknown report type." });
    return;
  }
  if (!request.file) {
    response.status(400).json({ error: `Choose a file for the ${reportType.label}.` });
    return;
  }
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  try {
    const rows = reportType.parse(request.file.buffer);
    await database.quotes.savePricingReport({
      quoteId: detail.id,
      reportType: request.params.type,
      fileName: request.file.originalname,
      userId: request.user.id,
      rows,
    });
    response.json({ reportType: request.params.type, fileName: request.file.originalname, rowCount: rows.length });
  } catch (error) {
    response.status(Number(error.status) || 422).json({ error: error.message });
  }
});

app.get("/api/quotes/:id/pricing", auth.requireRole("Quoter"), async (request, response) => {
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  const [reports, linePricing, settings] = await Promise.all([
    database.quotes.getPricingReports(detail.id),
    database.quotes.getLinePricingForQuote(detail.id),
    database.settings.get(),
  ]);
  const pricingSettings = {
    costExemptPrefixes: String(settings.cost_exempt_prefixes || pricing.DEFAULT_COST_EXEMPT_PREFIXES.join(",")).split(",").map((value) => value.trim()).filter(Boolean),
    defaultTargetMargin: Number(settings.default_target_margin || 0.25),
    minimumMargin: Number(settings.minimum_margin || 0.1),
  };
  response.set("Cache-Control", "no-store");
  response.json({
    reports: Object.fromEntries(Object.entries(reports).map(([key, value]) => [key, { fileName: value.fileName, uploadedAt: value.uploadedAt, rowCount: value.rows.length }])),
    linePricing,
    settings: pricingSettings,
    costingColumns: pricing.COSTING_REPORT_COLUMNS,
  });
});

app.post("/api/quotes/:id/pricing/compute", auth.requireRole("Quoter"), async (request, response) => {
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  const [reports, settings] = await Promise.all([
    database.quotes.getPricingReports(detail.id),
    database.settings.get(),
  ]);
  if (!reports.account || !reports.costing) {
    response.status(400).json({ error: "Upload the Account price report and Costing report before computing pricing." });
    return;
  }
  const pricingSettings = {
    costExemptPrefixes: String(settings.cost_exempt_prefixes || pricing.DEFAULT_COST_EXEMPT_PREFIXES.join(",")).split(",").map((value) => value.trim()).filter(Boolean),
    defaultTargetMargin: Number(settings.default_target_margin || 0.25),
    minimumMargin: Number(settings.minimum_margin || 0.1),
  };
  const indexes = pricing.buildIndexes(reports.account.rows, reports.house?.rows || [], reports.costing.rows);
  const lineItems = await database.connection("line_items as li")
    .join("quote_files as qf", "qf.id", "li.file_id")
    .select("li.*")
    .where("qf.quote_id", detail.id)
    .orderBy("li.line_number");
  const results = lineItems.map((line) => ({
    lineItemId: line.id,
    lineNumber: line.line_number,
    ...pricing.priceLine({ line, ...indexes, settings: pricingSettings }),
  }));
  response.json({ lines: results, settings: pricingSettings });
});

app.post("/api/quotes/:id/line-pricing", auth.requireRole("Quoter"), async (request, response) => {
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  const { lineItemId, finalPrice, unavailable, comment, targetMargin } = request.body || {};
  if (!lineItemId) {
    response.status(400).json({ error: "lineItemId is required." });
    return;
  }
  const line = await database.connection("line_items as li")
    .join("quote_files as qf", "qf.id", "li.file_id")
    .select("li.id", "qf.id as quoteFileId")
    .where("li.id", lineItemId)
    .andWhere("qf.quote_id", detail.id)
    .first();
  if (!line) {
    response.status(404).json({ error: "Line item not found for this quote." });
    return;
  }
  const values = {};
  if (finalPrice !== undefined) values.final_price = pricing.toNumber(finalPrice);
  if (unavailable !== undefined) values.unavailable = Boolean(unavailable);
  if (comment !== undefined) values.comment = String(comment || "");
  if (targetMargin !== undefined) values.target_margin = pricing.toNumber(targetMargin);
  const result = await database.quotes.upsertLinePricing({
    lineItemId,
    values,
    userId: request.user.id,
    quoteFileId: line.quoteFileId,
  });
  response.json(result);
});

function columnLetterToIndex(letter) {
  return letter.toUpperCase().split("").reduce((sum, char) => sum * 26 + (char.charCodeAt(0) - 64), 0);
}

app.get("/api/quotes/:id/export/:variant", auth.requireAuth, async (request, response) => {
  const variant = request.params.variant === "customer" ? "customer" : "internal";
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  // The internal version carries cost/margin and stays Quoter-only. A Rep may
  // download only the customer version of their own quote.
  if (request.user.role === "Rep") {
    const isSubmitter = detail.submitted_by_rep === request.user.id || detail.submitted_by_id === request.user.id;
    if (variant !== "customer" || !isSubmitter) {
      response.status(403).json({ error: "Reps can download only the customer version of their own quotes." });
      return;
    }
  } else if (request.user.role !== "Quoter" && request.user.role !== "Manager") {
    response.status(403).json({ error: "You do not have access to this export." });
    return;
  }
  const template = quoteTemplates.getTemplate(request.query.template);
  const columns = variant === "customer" ? template.columns.filter((column) => !column.internalOnly) : template.columns;

  const [reports, linePricing] = await Promise.all([
    database.quotes.getPricingReports(detail.id),
    database.quotes.getLinePricingForQuote(detail.id),
  ]);
  const pricingByLine = new Map(linePricing.map((row) => [row.line_item_id, row]));
  const lineItems = await database.connection("line_items as li")
    .join("quote_files as qf", "qf.id", "li.file_id")
    .select("li.*")
    .where("qf.quote_id", detail.id)
    .orderBy("li.line_number");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(template.label.slice(0, 31));

  // Account name and number in the top rows.
  sheet.getCell("A1").value = "Account";
  sheet.getCell("B1").value = detail.accountNumber || "";
  sheet.getCell("A2").value = "Account Name";
  sheet.getCell("B2").value = detail.accountName || detail.company_name || "";
  sheet.getCell("A3").value = "Quote";
  sheet.getCell("B3").value = detail.quote_number;

  const headerRowIndex = 5;
  const headerRow = sheet.getRow(headerRowIndex);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true };
  });
  headerRow.commit();

  // Only filled rows.
  const filled = lineItems.filter((line) => line.description_raw || line.competitor_item_no);
  filled.forEach((line, rowIndex) => {
    const pricingRow = pricingByLine.get(line.id) || {};
    const row = sheet.getRow(headerRowIndex + 1 + rowIndex);
    const values = {
      lineNumber: line.line_number,
      competitorItemNumber: line.competitor_item_no,
      description: line.description_raw,
      competitorUom: line.uom,
      competitorPrice: pricing.toNumber(line.price_per_uom),
      quantity: pricing.toNumber(line.quantity),
      ourUom: line.uom,
      cost: pricingRow.financial_cost,
      targetMargin: pricingRow.target_margin,
      pricingMethod: pricingRow.pricing_method,
      finalPrice: pricingRow.final_price,
      note: pricingRow.comment,
    };
    columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      const value = values[column.key];
      if (column.source === "calculated") {
        // Live formulas referencing this row's cells.
        const rowNumber = headerRowIndex + 1 + rowIndex;
        const cellFor = (key) => {
          const target = template.columns.find((candidate) => candidate.key === key);
          return target ? `${target.column}${rowNumber}` : null;
        };
        const formulas = {
          extendedCompetitor: () => `=${cellFor("competitorPrice")}*${cellFor("quantity")}`,
          ourPriceMatched: () => null,
          extendedOurs: () => `=${cellFor("ourPriceMatched")}*${cellFor("quantity")}`,
          savingsPercent: () => `=IF(${cellFor("competitorPrice")}=0,\"\",(${cellFor("competitorPrice")}-${cellFor("ourPriceMatched")})/${cellFor("competitorPrice")})`,
          savingsDollars: () => `=${cellFor("extendedCompetitor")}-${cellFor("extendedOurs")}`,
          extendedCost: () => null,
          margin: () => null,
          priceAtTargetMargin: () => `=IF(${cellFor("cost")}=\"\",\"\",CEILING(${cellFor("cost")}/(1-${cellFor("targetMargin")}),0.01))`,
        };
        const formula = formulas[column.key]?.();
        if (formula) cell.value = { formula };
      } else if (value !== null && value !== undefined && value !== "") {
        cell.value = value;
      }
      if (column.numberFormat) cell.numFmt = column.numberFormat;
    });
    row.commit();
  });

  response.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  response.set("Content-Disposition", `attachment; filename="${detail.quote_number}-${variant}.xlsx"`);
  await workbook.xlsx.write(response);
  response.end();
});

app.get("/api/quotes/:id/comments", auth.requireAuth, async (request, response) => {
  const comments = await database.quotes.listComments(request.params.id, { forRep: request.user.role === "Rep" });
  response.set("Cache-Control", "no-store");
  response.json({ comments });
});

app.post("/api/quotes/:id/comments", auth.requireAuth, async (request, response) => {
  const body = String(request.body?.body || "").trim();
  if (!body) {
    response.status(400).json({ error: "Comment text is required." });
    return;
  }
  const comment = await database.quotes.addComment({
    quoteId: request.params.id,
    authorId: request.user.id,
    body,
    visibleToRep: request.user.role !== "Rep" && Boolean(request.body?.visibleToRep),
  });
  response.status(201).json(comment);
});

app.get("/api/notifications", auth.requireAuth, async (request, response) => {
  const notifications = await database.quotes.listNotifications(request.user.id);
  response.set("Cache-Control", "no-store");
  response.json({ notifications, unread: notifications.filter((item) => !item.read).length });
});

app.post("/api/notifications/:id/read", auth.requireAuth, async (request, response) => {
  response.json(await database.quotes.markNotificationRead(request.user.id, request.params.id));
});

app.get("/api/coaching", auth.requireAuth, async (request, response) => {
  const filter = request.user.role === "Manager" ? {} : { quoterId: request.user.id, visibility: "shared" };
  const notes = await database.quotes.listCoachingNotes(filter);
  response.set("Cache-Control", "no-store");
  response.json({ notes });
});

app.post("/api/quotes/:id/lines/:lineId/edit", auth.requireRole("Reviser", "Manager"), async (request, response) => {
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  try {
    const result = await database.quotes.reviserEditLine({
      quoteId: detail.id,
      lineItemId: request.params.lineId,
      user: request.user,
      changes: request.body?.changes || {},
      reason: request.body?.reason,
      reasonNote: request.body?.reasonNote,
      coaching: Boolean(request.body?.coaching),
      coachingCategory: request.body?.coachingCategory,
    });
    response.json(result);
  } catch (error) {
    response.status(Number(error.status) || 500).json({ error: error.message });
  }
});

app.post("/api/quotes/:id/coaching", auth.requireRole("Reviser", "Manager"), async (request, response) => {
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  const settings = await database.settings.get();
  const shareImmediately = String(settings.coaching_visibility || "manager") === "immediate";
  const note = await database.quotes.addCoachingNote({
    quoteId: detail.id,
    lineItemId: request.body?.lineItemId,
    quoterId: detail.assigned_quoter_id,
    reviserId: request.user.id,
    category: String(request.body?.category || "other"),
    note: request.body?.note,
    visibility: shareImmediately ? "shared" : "archived",
  });
  if (shareImmediately && detail.assigned_quoter_id) {
    await database.quotes.notify({ userId: detail.assigned_quoter_id, quoteId: detail.id, kind: "coaching", message: "A coaching note was shared with you." });
  }
  response.status(201).json(note);
});

app.post("/api/coaching/:id/share", auth.requireRole("Manager"), async (request, response) => {
  const note = await database.quotes.shareCoachingNote(request.params.id, request.user.id);
  if (note?.quoter_id) {
    await database.quotes.notify({ userId: note.quoter_id, quoteId: note.quote_id, kind: "coaching", message: "A coaching note was shared with you." });
  }
  response.json({ id: request.params.id, visibility: "shared" });
});

app.post("/api/coaching/:id/archive", auth.requireRole("Manager"), async (request, response) => {
  response.json(await database.quotes.archiveCoachingNote(request.params.id));
});

app.get("/api/templates", auth.requireAuth, async (request, response) => {
  const includeInactive = request.user.role === "Manager";
  response.set("Cache-Control", "no-store");
  response.json({ templates: await database.quotes.listTemplates({ includeInactive }) });
});

app.get("/api/templates/versions/:versionId", auth.requireAuth, async (request, response) => {
  const version = await database.quotes.getTemplateVersion(request.params.versionId);
  if (!version) {
    response.status(404).json({ error: "Template version not found." });
    return;
  }
  response.json(version);
});

app.post("/api/templates", auth.requireRole("Manager"), async (request, response) => {
  const { name, fileName, columns } = request.body || {};
  if (!name || !Array.isArray(columns) || !columns.length) {
    response.status(400).json({ error: "A template name and at least one column are required." });
    return;
  }
  response.status(201).json(await database.quotes.createTemplate({ name, createdById: request.user.id, fileName, columns }));
});

app.post("/api/templates/:id/versions", auth.requireRole("Manager"), async (request, response) => {
  const { fileName, columns } = request.body || {};
  if (!Array.isArray(columns) || !columns.length) {
    response.status(400).json({ error: "At least one column is required." });
    return;
  }
  response.status(201).json(await database.quotes.createTemplateVersion({ templateId: request.params.id, fileName, columns }));
});

app.post("/api/templates/:id/active", auth.requireRole("Manager"), async (request, response) => {
  response.json(await database.quotes.setTemplateActive(request.params.id, Boolean(request.body?.active)));
});

app.post("/api/templates/parse", auth.requireRole("Manager"), reportUpload.single("template"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "Choose an Excel template file." });
    return;
  }
  try {
    const XLSX = require("xlsx");
    const workbook = XLSX.read(request.file.buffer, { type: "buffer", cellFormula: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const columns = [];
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      const headerCell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: columnIndex })];
      const header = headerCell ? String(headerCell.v) : "";
      if (!header) continue;
      const formulaCell = sheet[XLSX.utils.encode_cell({ r: range.s.r + 1, c: columnIndex })];
      columns.push({
        header,
        excelColumn: XLSX.utils.encode_col(columnIndex),
        formula: formulaCell?.f ? `=${formulaCell.f}` : null,
      });
    }
    response.json({ fileName: request.file.originalname, columns });
  } catch (error) {
    response.status(422).json({ error: "Could not read that template file." });
  }
});

app.get("/api/settings", auth.requireAuth, async (request, response) => {
  const [workspace, personal] = await Promise.all([
    request.user.role === "Manager" ? database.settings.get() : Promise.resolve(null),
    database.quotes.getUserSettings(request.user.id),
  ]);
  response.set("Cache-Control", "no-store");
  response.json({ workspace, personal });
});

app.put("/api/settings", auth.requireRole("Manager"), async (request, response) => {
  const allowed = ["company_name", "standard_lead_time_days", "on_time_target_percent", "default_target_margin", "minimum_margin", "minimum_item_count", "cost_exempt_prefixes", "coaching_visibility", "decline_reasons", "return_reasons", "edit_reasons", "note_presets", "uom_presets"];
  const values = {};
  for (const key of allowed) {
    if (request.body?.[key] !== undefined) values[key] = request.body[key];
  }
  response.json(await database.settings.update(values));
});

app.put("/api/settings/personal", auth.requireAuth, async (request, response) => {
  const allowed = ["notifications_enabled", "default_view", "table_columns", "default_submitter_role", "default_template", "display_theme", "display_text_size"];
  const values = {};
  for (const key of allowed) {
    if (request.body?.[key] !== undefined) values[key] = request.body[key];
  }
  response.json(await database.quotes.updateUserSettings(request.user.id, values));
});

app.get("/api/users", auth.requireRole("Manager"), async (_request, response) => {
  response.set("Cache-Control", "no-store");
  response.json({
    users: await database.users.listAllWithRoles(),
    roles: database.users.allRoles,
    teams: database.users.teams,
    fieldHelp: fieldCatalog.fields.filter((field) => field.group === "users"),
  });
});

app.post("/api/users", auth.requireRole("Manager"), async (request, response) => {
  const user = await database.users.createUser(request.body, request.user);
  auth.registerDemoPassword(user.email);
  response.status(201).json(user);
});

app.get("/api/users/:id", auth.requireRole("Manager"), async (request, response) => {
  const user = await database.users.getDetail(request.params.id);
  if (!user) {
    response.status(404).json({ error: "User not found." });
    return;
  }
  response.set("Cache-Control", "no-store");
  response.json(user);
});

app.put("/api/users/:id/roles", auth.requireRole("Manager"), async (request, response) => {
  const user = await database.users.updateUserRoles({
    userId: request.params.id,
    roles: request.body?.roles,
    canApprove: request.body?.canApprove,
    changedBy: request.user,
  });
  response.json(user);
});

app.put("/api/users/:id/status", auth.requireRole("Manager"), async (request, response) => {
  const user = await database.users.setUserActive({
    userId: request.params.id,
    active: request.body?.active,
    changedBy: request.user,
  });
  response.json(user);
});

app.get("/api/search", auth.requireAuth, async (request, response) => {
  response.set("Cache-Control", "no-store");
  response.json(await database.quotes.globalSearch(request.query.q));
});

app.post("/api/quotes/:id/assign", auth.requireRole("Manager"), async (request, response) => {
  const quote = await database.quotes.assign({
    quoteId: request.params.id,
    quoterId: request.body?.quoterId,
    changedBy: request.user,
  });
  response.json({ id: quote.id, status: quote.status, assignedQuoterId: quote.assigned_quoter_id });
});

app.post("/api/quotes/:id/status", auth.requireAuth, async (request, response) => {
  const quote = await database.quotes.changeStatus({
    quoteId: request.params.id,
    nextStatus: request.body?.status,
    user: request.user,
    reason: request.body?.reason,
  });
  response.json({ id: quote.id, status: quote.status });
});

app.get("/:role/:page", auth.requirePageAccess, (_request, response) => {
  response.sendFile(path.join(__dirname, "views", "app.html"));
});

function fieldValue(field) {
  if (!field) return "";
  if (field.valueCurrency) {
    const currency = field.valueCurrency;
    return [currency.currencyCode, currency.amount].filter(Boolean).join(" ");
  }
  if (field.valueAddress) {
    return Object.values(field.valueAddress).filter(Boolean).join(", ");
  }
  for (const key of [
    "valueString",
    "valueDate",
    "valueTime",
    "valueNumber",
    "valueInteger",
    "valueBoolean",
  ]) {
    if (field[key] !== undefined && field[key] !== null) return String(field[key]);
  }
  return field.content || "";
}

function makeField(value, confidence = 0, options = {}) {
  const score = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0;
  return {
    value: value === null || value === undefined ? "" : String(value),
    confidence: score,
    needsReview: options.needsReview ?? score < 0.8,
  };
}

function findAzureField(fields, key) {
  const definition = fieldCatalog.fields.find((field) => field.key === key);
  for (const azureName of definition?.azureFields || []) {
    if (fields[azureName]) return fields[azureName];
  }
  return null;
}

function normalizeAzureField(fields, key) {
  const field = findAzureField(fields, key);
  return makeField(fieldValue(field), field?.confidence || 0);
}

function normalizeMatch(value) {
  return String(value || "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseAccountFromFilename(filename) {
  const leafName = String(filename || "").replace(/\\/g, "/").split("/").pop();
  const stem = leafName.replace(/\.(?:pdf|jpe?g|png|tiff?|bmp|heif)$/i, "").trim();
  const match = stem.match(/^(C\d+)[\s_-]+(.+)$/i);
  return match
    ? { number: match[1].toUpperCase(), name: match[2].trim() }
    : { number: "", name: "" };
}

function accountNameFromText(content) {
  const labeledLine = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /\b(?:customer(?:\s+name)?|account\s+name|bill\s+to|sold\s+to)\s*[:#-]\s*\S/i.test(line));
  const match = labeledLine?.match(/\b(?:customer(?:\s+name)?|account\s+name|bill\s+to|sold\s+to)\s*[:#-]\s*(.+)$/i);
  return match?.[1]?.trim() || "";
}

function accountDetailsFromDocument(content, fields, filenameAccount) {
  const azureNumber = fields.CustomerId || fields.CustomerNumber || fields.AccountNumber;
  const azureNumberValue = fieldValue(azureNumber);
  const textNumber = content.match(/\bC\d+\b/i)?.[0] || "";
  const documentNumber = azureNumberValue || textNumber;
  const azureName = fields.CustomerName;
  const azureNameValue = fieldValue(azureName);
  const normalizedContent = normalizeMatch(content);
  const filenameNameMatched = filenameAccount.name
    && normalizedContent.includes(normalizeMatch(filenameAccount.name));
  const labeledName = accountNameFromText(content);
  const documentName = filenameNameMatched
    ? filenameAccount.name
    : azureNameValue || labeledName;

  return {
    number: documentNumber,
    numberConfidence: azureNumberValue ? azureNumber.confidence || 0 : textNumber ? 0.82 : 0,
    name: documentName,
    nameConfidence: filenameNameMatched ? 0.92 : azureName?.confidence || (labeledName ? 0.78 : 0),
  };
}

function countPerUnit(unitOfMeasure, description) {
  const text = `${unitOfMeasure} ${description}`.toLocaleLowerCase();
  if (/\bgross\b/.test(text)) return { value: 144, confidence: 0.96 };
  if (/\bdozen\b|\bdoz\b/.test(text)) return { value: 12, confidence: 0.96 };
  if (/\bpair\b|\bpr\b/.test(text)) return { value: 2, confidence: 0.94 };
  const count = text.match(/\b(\d+(?:\.\d+)?)\s*(?:\/\s*)?(?:count|ct|pack|pk|piece|pc|unit)s?\b/i);
  if (count) return { value: Number(count[1]), confidence: 0.9 };
  if (/\beach\b|\beaches\b|\bunit\b/.test(text)) return { value: 1, confidence: 0.94 };
  return { value: 1, confidence: unitOfMeasure ? 0.58 : 0.45 };
}

function numericValue(field) {
  if (typeof field?.valueCurrency?.amount === "number") return field.valueCurrency.amount;
  for (const key of ["valueNumber", "valueInteger"]) {
    if (typeof field?.[key] === "number") return field[key];
  }
  const parsed = Number(fieldValue(field).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function currencyCode(field) {
  return field?.valueCurrency?.currencyCode || "";
}

function sourcePageLine(item, pages) {
  const region = item.boundingRegions?.[0];
  const pageNumber = region?.pageNumber;
  if (!pageNumber) return makeField("", 0);
  const page = pages.find((candidate) => candidate.pageNumber === pageNumber);
  const lines = page?.lines || [];
  const polygon = region.polygon || region.boundingPolygon || [];
  const itemY = polygon.length ? polygon.filter((_value, index) => index % 2 === 1).reduce((sum, y) => sum + y, 0) / (polygon.length / 2) : null;
  let closestLine = -1;
  let closestDistance = Infinity;

  lines.forEach((line, index) => {
    const linePolygon = line.polygon || line.boundingPolygon || [];
    if (itemY === null || !linePolygon.length) return;
    const lineY = linePolygon.filter((_value, coordinateIndex) => coordinateIndex % 2 === 1).reduce((sum, y) => sum + y, 0) / (linePolygon.length / 2);
    const distance = Math.abs(lineY - itemY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestLine = index + 1;
    }
  });

  return makeField(closestLine > 0 ? `Page ${pageNumber}, line ${closestLine}` : `Page ${pageNumber}`, closestLine > 0 ? 0.75 : 0.65);
}

function summarizeDescription(description) {
  const summary = String(description || "")
    .replace(/^\s*(?:[A-Z0-9][A-Z0-9._/-]{2,}\s+){1,2}(?=[A-Za-z])/, "")
    .split(/[;|\n]/)[0]
    .replace(/\s+/g, " ")
    .trim();
  return summary.length > 100 ? `${summary.slice(0, 97).trimEnd()}...` : summary;
}

function normalizeLineItem(item, pages) {
  const itemFields = item.valueObject || {};
  const values = {};
  for (const definition of fieldCatalog.fields.filter((field) => field.group === "line")) {
    const azureField = findAzureField(itemFields, definition.key);
    values[definition.key] = makeField(fieldValue(azureField), azureField?.confidence || 0);
  }

  const description = values.description.value;
  const summary = summarizeDescription(description);
  values.descriptionSummary = makeField(summary, summary ? 0.65 : 0, { needsReview: Boolean(summary) });

  const count = countPerUnit(values.unitOfMeasure.value, description);
  values.countPerUnit = makeField(count.value, count.confidence);

  const unitPriceField = findAzureField(itemFields, "pricePerUnitOfMeasure");
  const unitPrice = numericValue(unitPriceField);
  const normalizedPrice = unitPrice !== null && count.value > 0
    ? `${currencyCode(unitPriceField)}${currencyCode(unitPriceField) ? " " : ""}${(unitPrice / count.value).toFixed(2)}`
    : "";
  values.normalizedUnitPrice = makeField(normalizedPrice, normalizedPrice ? Math.min(unitPriceField?.confidence || 0, count.confidence) : 0);
  values.sourcePageLine = sourcePageLine(item, pages);
  return values;
}

function normalizeInvoice(document, request) {
  const documentFields = document?.fields || {};
  const items = documentFields.Items?.valueArray || [];
  const content = request.analyzeContent || "";
  const filenameAccount = parseAccountFromFilename(request.file.originalname);
  const documentAccount = accountDetailsFromDocument(content, documentFields, filenameAccount);
  const accountNumber = filenameAccount.number || documentAccount.number;
  const accountName = filenameAccount.name || documentAccount.name;
  const mismatches = [];

  if (filenameAccount.number && documentAccount.number && filenameAccount.number !== documentAccount.number.trim().toUpperCase()) {
    mismatches.push(`Filename account number ${filenameAccount.number} differs from document account number ${documentAccount.number}.`);
  }
  if (filenameAccount.name && documentAccount.name && normalizeMatch(filenameAccount.name) !== normalizeMatch(documentAccount.name)) {
    mismatches.push(`Filename account name ${filenameAccount.name} differs from document account name ${documentAccount.name}.`);
  }

  const canCompareAccount = Boolean(
    (filenameAccount.number || filenameAccount.name)
    && (documentAccount.number || documentAccount.name),
  );

  const source = normalizeAzureField(documentFields, "invoiceSource");
  const date = normalizeAzureField(documentFields, "invoiceDate");
  const description = content;
  const hasContractWords = /\bcontract(?:ual)?\b/i.test(description);
  const fields = {
    quoteId: makeField(`Q-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`, 1),
    accountNumber: makeField(accountNumber, filenameAccount.number ? 0.98 : documentAccount.numberConfidence, { needsReview: !accountNumber || mismatches.some((item) => item.includes("number")) }),
    accountName: makeField(accountName, filenameAccount.name ? 0.98 : documentAccount.nameConfidence, { needsReview: !accountName || mismatches.some((item) => item.includes("name")) }),
    invoiceSource: source,
    invoiceDate: makeField(date.value, date.value ? date.confidence : 0),
    uploadDate: makeField(new Date().toISOString().slice(0, 10), 1),
    uploadedBy: makeField(request.user.name, 1),
    contractPricing: makeField(hasContractWords ? "Yes" : "No", hasContractWords ? 0.94 : 0.68),
    itemLineCount: makeField(items.length, 0.98),
    duplicateWarning: makeField("Checking for duplicates...", 1, { needsReview: false }),
    accountMismatch: makeField(
      mismatches.join(" ") || (canCompareAccount ? "No mismatch detected." : "Could not compare: account details were not found in both filename and document."),
      mismatches.length || !canCompareAccount ? 0.65 : 1,
      { needsReview: Boolean(mismatches.length || !canCompareAccount) },
    ),
  };

  const details = {};
  for (const definition of fieldCatalog.fields.filter((field) => field.group === "detail")) {
    details[definition.key] = normalizeAzureField(documentFields, definition.key);
  }

  return {
    template: request.template,
    filename: request.file.originalname,
    fields,
    details,
    lineItems: items.map((item) => normalizeLineItem(item, request.pages || [])),
  };
}

async function analyzeBuffer({ buffer, mimetype, originalname, user, template }) {
  const endpoint = process.env.AZURE_DI_ENDPOINT;
  const key = process.env.AZURE_DI_KEY;
  if (!endpoint || !key) {
    const error = new Error("Azure Document Intelligence is not configured. Set AZURE_DI_ENDPOINT and AZURE_DI_KEY in .env.");
    error.status = 503;
    throw error;
  }

  const client = DocumentIntelligence(endpoint, new AzureKeyCredential(key), { apiVersion: "2024-11-30" });
  const initialResponse = await client
    .path("/documentModels/{modelId}:analyze", "prebuilt-invoice")
    .post({ contentType: mimetype, body: buffer });

  if (isUnexpected(initialResponse)) {
    throw new Error(initialResponse.body?.error?.message || "Azure could not analyze this document.");
  }

  const poller = getLongRunningPoller(client, initialResponse);
  const result = await poller.pollUntilDone();
  if (isUnexpected(result)) {
    throw new Error(result.body?.error?.message || "Document analysis failed.");
  }

  const analyzeResult = result.body.analyzeResult;
  const documents = analyzeResult?.documents || [];
  if (!documents.length) {
    const error = new Error("No invoice fields were found. Try a clearer invoice or quote.");
    error.status = 422;
    throw error;
  }

  return normalizeInvoice(documents[0], {
    file: { originalname, buffer, mimetype },
    user,
    template,
    analyzeContent: analyzeResult.content,
    pages: analyzeResult.pages || [],
  });
}

app.post("/api/quotes/:id/extract", auth.requireRole("Quoter"), async (request, response) => {
  const detail = await database.quotes.getDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ error: "Quote not found." });
    return;
  }
  if (detail.assigned_quoter_id !== request.user.id) {
    response.status(403).json({ error: "This quote is not assigned to your account." });
    return;
  }
  const file = detail.files.find((entry) => entry.id === request.body?.fileId) || detail.files[0];
  if (!file || !file.storageKey) {
    response.status(400).json({ error: "This quote has no attached file to extract from." });
    return;
  }
  const absolutePath = path.join(__dirname, file.storageKey);
  if (!absolutePath.startsWith(path.join(__dirname, "uploads"))) {
    response.status(400).json({ error: "Invalid file location." });
    return;
  }

  try {
    const buffer = await fs.readFile(absolutePath);
    const template = fieldCatalog.fieldsForTemplate(request.body?.template || detail.template).template.key;
    const quoteData = await analyzeBuffer({
      buffer,
      mimetype: file.fileType,
      originalname: file.fileName,
      user: request.user,
      template,
    });
    quoteData.databaseQuoteId = detail.id;
    quoteData.databaseFileId = file.id;
    response.json(quoteData);
  } catch (error) {
    const missingFile = error.code === "ENOENT";
    const status = missingFile ? 422 : Number(error.status) || 502;
    console.error(`Extraction failed for quote ${request.params.id}:`, error);
    response.status(status).json({
      error: missingFile
        ? "The attached file is missing from storage. Remove it and add it again."
        : status >= 500
          ? "Document analysis failed. Check your Azure configuration and try again."
          : error.message,
    });
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && ["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT"].includes(error.code)) {
    console.error("File upload rejected:", error.message);
    response.status(413).json({ error: error.code === "LIMIT_FILE_COUNT" ? "Attach no more than 10 files." : "Files must be 20 MB or smaller." });
    return;
  }
  const status = Number(error.status) || 500;
  if (status >= 500) console.error("Request failed:", error.message);
  response.status(status).json({
    error: status >= 500 ? "The request could not be completed." : error.message,
  });
});

database.initialize().then(() => {
  app.listen(port, () => {
    console.log(`QuoteFlow listening on http://localhost:${port}`);
  });
}).catch((error) => {
  console.error("Database initialization failed:", error.message);
  process.exit(1);
});