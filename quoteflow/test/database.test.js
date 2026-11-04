const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const knexFactory = require("knex");
const createRepositories = require("../db/repositories");
const { installViews } = require("../db/views");
const { seed, statusNames } = require("../db/seed");

const makeField = (value, confidence = 0.94) => ({
  value,
  confidence,
  needsReview: confidence < 0.8,
});

test("database migrations, reporting, workflow, OCR edits, and duplicates", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "quotes-database-test-"));
  const filename = path.join(directory, "quotes.sqlite");
  const knex = knexFactory({
    client: "better-sqlite3",
    connection: { filename, options: { fileMustExist: false } },
    useNullAsDefault: true,
  });

  try {
    await knex.raw("PRAGMA foreign_keys = ON");
    await knex.raw("PRAGMA journal_mode = WAL");
    await knex.migrate.latest({ directory: path.join(__dirname, "..", "db", "migrations") });
    await installViews(knex);
    await seed(knex);
    const repositories = createRepositories(knex);
    const branding = await repositories.settings.get();
    assert.equal(branding.company_name, "QuoteFlow");
    assert.equal(branding.logo_path, "/quoteflow-logo.svg");
    assert.equal(branding.standard_lead_time_days, "14");

    const countFor = async (table) => {
      const row = await knex(table).count({ count: "id" }).first();
      return Number(row.count);
    };
    assert.equal(await countFor("users"), 9);
    assert.equal(await countFor("accounts"), 8);
    assert.equal(await countFor("quotes"), 30);
    const seededStatuses = await knex("quotes").distinct("status").pluck("status");
    assert.deepEqual(seededStatuses.sort(), [...statusNames].sort());
    const quoteDates = await knex("quotes").min({ oldest: "updated_at" }).max({ newest: "updated_at" }).first();
    assert.ok(Number(quoteDates.newest) - Number(quoteDates.oldest) >= 58 * 86400);
    assert.equal(await countFor("quote_files"), 30);
    // Seeded demo quotes each get a real sample file on disk for extraction.
    const seededWithoutStorage = await knex("quote_files").whereNull("storage_key").count({ count: "id" }).first();
    assert.equal(Number(seededWithoutStorage.count), 0);
    const seededFile = await knex("quote_files").whereNotNull("storage_key").first();
    assert.ok(seededFile.storage_key.startsWith("uploads/quotes/"));
    await fs.stat(path.join(__dirname, "..", seededFile.storage_key));
    const sampleDirectory = path.join(__dirname, "..", "sample-files");
    assert.ok((await fs.readdir(sampleDirectory)).some((name) => name.endsWith(".pdf")));
    assert.equal(await countFor("line_items"), 60);
    assert.equal(await countFor("quote_status_history"), 141);
    assert.equal((await knex("v_quote_cycle_times").select()).length, 30);
    assert.equal((await knex("v_quoter_workload").select()).length, 2);
    assert.equal((await knex("v_reviser_outcomes").select()).length, 2);
    assert.ok((await knex("v_ocr_accuracy").select()).length > 0);

    const manager = await repositories.users.findActiveByEmail("manager@demo.com");
    const quoter = await repositories.users.findActiveByEmail("quoter1@demo.com");
    const reviserOne = await repositories.users.findActiveByEmail("reviser1@demo.com");
    const reviserTwo = await repositories.users.findActiveByEmail("reviser2@demo.com");
    const rep = await repositories.users.findActiveByEmail("rep1@demo.com");
    assert.deepEqual(manager.roles, ["Manager"]);
    assert.deepEqual(quoter.roles, ["Quoter"]);
    assert.equal(Boolean(reviserTwo.can_approve), true);
    assert.equal(Boolean(reviserOne.can_approve), false);
    const requestOptions = await repositories.users.listRequestOptions(rep.id);
    assert.equal(requestOptions.accounts.length, 8);
    assert.equal(requestOptions.salesManagers.length, 1);
    assert.ok(requestOptions.accounts.every((account) => account.ppls.length >= 2));
    assert.equal((await repositories.quotes.listForWorkspace(manager)).length, 30);
    assert.equal((await repositories.quotes.listForWorkspace(quoter)).length, 20);
    assert.equal((await repositories.quotes.listForWorkspace(rep)).length, 0);

    const account = requestOptions.accounts[0];
    const requestPpl = account.ppls[0];
    const repRequest = await repositories.quotes.createRepRequest({
      user: rep,
      request: {
        requestType: "Existing customer",
        submitterRole: "AM1",
        quoteType: "Quote",
        accountNumber: account.account_number,
        companyName: account.account_name,
        customerNeeds: "Two cases of paper for next month's opening.",
        shipCity: "Springfield",
        shipState: "IL",
        shipZip: "62701",
        pplId: requestPpl.id,
        priority: "Standard",
        template: "invoice",
      },
      files: [{ id: "request-file-test", fileName: `${account.account_number}-${account.account_name}.pdf`, fileType: "application/pdf", fileHash: "a".repeat(64), storageKey: "uploads/quotes/request-file-test.pdf" }],
    });
    assert.match(repRequest.id, /^Q-\d{6}$/);
    assert.equal(repRequest.quoteType, "Quote");

    const mdmRequest = await repositories.quotes.createRepRequest({
      user: rep,
      request: {
        requestType: "Lead",
        submitterRole: "Hunter",
        quoteType: "MDM",
        companyName: "New MDM Prospect",
        customerNeeds: "MDM item onboarding.",
        priority: "Standard",
        template: "invoice",
      },
      files: [{ id: "request-file-mdm", fileName: "mdm-prospect.pdf", fileType: "application/pdf", fileHash: "b".repeat(64), storageKey: "uploads/quotes/request-file-mdm.pdf" }],
    });
    assert.match(mdmRequest.id, /^MDM-\d{6}$/);
    assert.equal(mdmRequest.quoteType, "MDM");
    const storedMdm = await knex("quotes").where({ id: mdmRequest.databaseId }).first();
    assert.equal(storedMdm.quote_type, "MDM");
    assert.equal(storedMdm.team, "MDM");

    await assert.rejects(
      repositories.quotes.createRepRequest({
        user: rep,
        request: { requestType: "Lead", submitterRole: "Hunter", quoteType: "Quote", companyName: "No Files Co", customerNeeds: "Nothing attached.", priority: "Standard" },
        files: [],
      }),
      (error) => error.status === 400,
    );
    const storedRepRequest = await knex("quotes").where({ id: repRequest.databaseId }).first();
    assert.equal(storedRepRequest.status, "Submitted");
    assert.equal(storedRepRequest.submitted_by_id, rep.id);
    assert.equal(storedRepRequest.submitter_role, "AM1");
    assert.equal(storedRepRequest.ppl_id, requestPpl.id);
    assert.equal(await knex("quote_status_history").where({ quote_id: repRequest.databaseId, to_status: "Submitted" }).count({ count: "id" }).first().then((row) => Number(row.count)), 1);
    assert.equal(await knex("quote_files").where({ quote_id: repRequest.databaseId, storage_key: "uploads/quotes/request-file-test.pdf" }).count({ count: "id" }).first().then((row) => Number(row.count)), 1);
    assert.equal((await repositories.quotes.listRequestsForRep(rep)).length, 2);

    const readyQuote = await knex("quotes").where({ status: "Ready to assign" }).first();
    const historyBefore = await countFor("quote_status_history");
    await repositories.quotes.assign({ quoteId: readyQuote.id, quoterId: quoter.id, changedBy: manager });
    assert.equal(await countFor("quote_status_history"), historyBefore + 1);

    const awaitingQuote = await knex("quotes").where({ status: "Awaiting approval" }).first();
    await assert.rejects(
      repositories.quotes.changeStatus({ quoteId: awaitingQuote.id, nextStatus: "Approved", user: reviserOne }),
      (error) => error.status === 403,
    );
    const approved = await repositories.quotes.changeStatus({ quoteId: awaitingQuote.id, nextStatus: "Approved", user: reviserTwo });
    assert.equal(approved.status, "Approved");
    assert.equal(approved.final_reviewer_id, reviserTwo.id);

    const qualifyingQuote = await knex("quotes").where({ status: "Qualifying" }).first();
    await assert.rejects(
      repositories.quotes.changeStatus({ quoteId: qualifyingQuote.id, nextStatus: "Declined", user: reviserTwo }),
      (error) => error.status === 403,
    );

    const result = {
      template: "invoice",
      fields: {
        quoteId: makeField("Q-TEST-DB-001"),
        accountNumber: makeField("C90210"),
        accountName: makeField("Sample Customer"),
        invoiceSource: makeField("Vendor Original"),
        invoiceDate: makeField("2026-10-10"),
        uploadDate: makeField("2026-10-31"),
        uploadedBy: makeField(quoter.name),
        contractPricing: makeField("No"),
        itemLineCount: makeField("1"),
        duplicateWarning: makeField("No duplicate found."),
        accountMismatch: makeField("No mismatch detected."),
      },
      details: {},
      lineItems: [{
        competitorItemNumber: makeField("COMP-1"),
        manufacturerPartNumber: makeField("MFR-1"),
        brand: makeField("Northstar"),
        description: makeField("Exact OCR description"),
        descriptionSummary: makeField("Short summary", 0.65),
        unitOfMeasure: makeField("dozen"),
        countPerUnit: makeField("12"),
        pricePerUnitOfMeasure: makeField("USD 24.00"),
        quantityPurchased: makeField("2"),
        extendedPrice: makeField("USD 48.00"),
        normalizedUnitPrice: makeField("USD 2.00"),
        sourcePageLine: makeField("Page 1, line 3", 0.75),
      }],
    };
    const file = {
      originalname: "C90210-Sample Customer.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.from("test invoice bytes"),
    };
    const created = await repositories.quotes.createFromAnalysis({ user: quoter, file, result });
    assert.equal(created.duplicate, false);

    const editedFields = { ...result.fields, invoiceSource: makeField("Vendor Corrected") };
    const editedLine = { ...result.lineItems[0], description: makeField("Corrected description") };
    const submitted = await repositories.quotes.submitReview({
      user: quoter,
      review: {
        databaseQuoteId: created.databaseQuoteId,
        databaseFileId: created.databaseFileId,
        template: "invoice",
        fields: editedFields,
        details: {},
        lineItems: [editedLine],
      },
    });
    assert.equal(submitted.status, "Submitted");
    assert.equal(submitted.edited, true);

    const edits = await knex("field_edits").where({ quote_file_id: created.databaseFileId });
    assert.equal(edits.length, 2);
    assert.equal(edits.find((edit) => edit.field_name === "description").original_value, "Exact OCR description");

    const duplicateResult = structuredClone(result);
    duplicateResult.fields.quoteId = makeField("Q-TEST-DB-002");
    const duplicate = await repositories.quotes.createFromAnalysis({ user: quoter, file, result: duplicateResult });
    assert.equal(duplicate.duplicate, true);

    // Manage files: add, replace, and remove all log to status history.
    const managedQuote = await knex("quotes").first();
    const historyCount = async (toStatus) => knex("quote_status_history")
      .where({ quote_id: managedQuote.id, to_status: toStatus })
      .count({ count: "id" })
      .first()
      .then((row) => Number(row.count));

    const added = await repositories.quotes.addFile({
      quoteId: managedQuote.id,
      user: quoter,
      file: { fileName: "extra-document.pdf", fileType: "application/pdf", fileHash: "c".repeat(64), storageKey: "uploads/quotes/extra-document.pdf" },
    });
    const addedRow = await knex("quote_files").where({ id: added.fileId }).first();
    assert.equal(addedRow.file_name, "extra-document.pdf");
    assert.equal(addedRow.storage_key, "uploads/quotes/extra-document.pdf");
    assert.equal(await historyCount("File added"), 1);

    const replaced = await repositories.quotes.replaceFile({
      quoteId: managedQuote.id,
      fileId: added.fileId,
      user: quoter,
      file: { fileName: "replacement.pdf", fileType: "application/pdf", fileHash: "d".repeat(64), storageKey: "uploads/quotes/replacement.pdf" },
    });
    assert.equal(replaced.previousStorageKey, "uploads/quotes/extra-document.pdf");
    const replacedRow = await knex("quote_files").where({ id: added.fileId }).first();
    assert.equal(replacedRow.file_name, "replacement.pdf");
    assert.equal(replacedRow.storage_key, "uploads/quotes/replacement.pdf");
    assert.equal(await historyCount("File replaced"), 1);

    const removed = await repositories.quotes.removeFile({ quoteId: managedQuote.id, fileId: added.fileId, user: quoter });
    assert.equal(removed.storageKey, "uploads/quotes/replacement.pdf");
    assert.equal(await knex("quote_files").where({ id: added.fileId }).count({ count: "id" }).first().then((row) => Number(row.count)), 0);
    assert.equal(await historyCount("File removed"), 1);
  } finally {
    await knex.destroy();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("user management, first-manager setup, and audit logging", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "quotes-users-test-"));
  const filename = path.join(directory, "quotes.sqlite");
  const knex = knexFactory({
    client: "better-sqlite3",
    connection: { filename, options: { fileMustExist: false } },
    useNullAsDefault: true,
  });

  try {
    await knex.raw("PRAGMA foreign_keys = ON");
    await knex.raw("PRAGMA journal_mode = WAL");
    await knex.migrate.latest({ directory: path.join(__dirname, "..", "db", "migrations") });
    await installViews(knex);
    await seed(knex);
    const repositories = createRepositories(knex);

    const manager = await repositories.users.findActiveByEmail("manager@demo.com");

    // First-manager setup: MANAGER_EMAILS grants the Manager role on startup.
    const granted = await repositories.users.applyManagerEmails("quoter1@demo.com, unknown@demo.com");
    assert.deepEqual(granted, ["quoter1@demo.com"]);
    const promoted = await repositories.users.findActiveByEmail("quoter1@demo.com");
    assert.deepEqual(promoted.roles, ["Manager", "Quoter"]);
    assert.equal(promoted.role, "Quoter");
    assert.equal((await repositories.users.applyManagerEmails("quoter1@demo.com")).length, 0);
    const grantAudit = await knex("user_audit").where({ user_id: "quoter-1", field: "roles" });
    assert.equal(grantAudit.length, 1);
    assert.equal(grantAudit[0].changed_by_id, null);
    assert.equal(grantAudit[0].old_value, "Quoter");
    assert.equal(grantAudit[0].new_value, "Manager, Quoter");

    // Add a user.
    await assert.rejects(
      repositories.users.createUser({ name: "No Roles", email: "noroles@demo.com", roles: [], team: "Quotes" }, manager),
      (error) => error.status === 400,
    );
    await assert.rejects(
      repositories.users.createUser({ name: "Bad Team", email: "badteam@demo.com", roles: ["Rep"], team: "Sales" }, manager),
      (error) => error.status === 400,
    );
    await assert.rejects(
      repositories.users.createUser({ name: "Duplicate", email: "rep1@demo.com", roles: ["Rep"], team: "Quotes" }, manager),
      (error) => error.status === 409,
    );
    const created = await repositories.users.createUser({ name: "New Quoter", email: "quoter3@demo.com", roles: ["Quoter", "Reviser"], team: "MDM" }, manager);
    assert.equal(created.role, "Quoter");
    assert.deepEqual(created.roles, ["Quoter", "Reviser"]);
    const createdAudit = await knex("user_audit").where({ user_id: created.id, field: "created" }).first();
    assert.equal(createdAudit.changed_by_id, manager.id);

    // A Manager can't remove their own Manager role.
    await assert.rejects(
      repositories.users.updateUserRoles({ userId: manager.id, roles: ["Reviser"], changedBy: manager }),
      (error) => error.status === 400 && /own Manager role/.test(error.message),
    );

    // Another Manager can remove it, since quoter-1 now holds the Manager role.
    const demoted = await repositories.users.updateUserRoles({ userId: manager.id, roles: ["Reviser"], changedBy: promoted });
    assert.deepEqual(demoted.roles, ["Reviser"]);
    assert.equal(demoted.role, "Reviser");

    // The last active Manager can't lose the Manager role...
    await assert.rejects(
      repositories.users.updateUserRoles({ userId: "quoter-1", roles: ["Quoter"], changedBy: manager }),
      (error) => error.status === 409 && /at least one active Manager/.test(error.message),
    );
    // ...and can't be deactivated.
    await assert.rejects(
      repositories.users.setUserActive({ userId: "quoter-1", active: false, changedBy: manager }),
      (error) => error.status === 409 && /at least one active Manager/.test(error.message),
    );

    // Deactivate and reactivate; sign-in follows the active flag.
    const deactivated = await repositories.users.setUserActive({ userId: "quoter-2", active: false, changedBy: manager });
    assert.equal(deactivated.active, false);
    assert.equal(await repositories.users.findActiveByEmail("quoter2@demo.com"), null);
    await repositories.users.setUserActive({ userId: "quoter-2", active: true, changedBy: manager });
    assert.ok(await repositories.users.findActiveByEmail("quoter2@demo.com"));
    const statusAudit = await knex("user_audit").where({ user_id: "quoter-2", field: "status" });
    assert.deepEqual(
      statusAudit.map((row) => `${row.old_value}->${row.new_value}`).sort(),
      ["active->inactive", "inactive->active"],
    );

    // A deactivated user's open quotes need reassignment on the Manager dashboard.
    await repositories.users.setUserActive({ userId: "quoter-2", active: false, changedBy: manager });
    const reassignments = await repositories.quotes.listNeedsReassignment();
    assert.equal(reassignments.length, 4);
    assert.ok(reassignments.every((quote) => quote.assignedTo === "quoter2@demo.com"));
    assert.ok(reassignments.every((quote) => !["Approved", "Sent to customer", "Declined"].includes(quote.status)));

    // Reassignment keeps the quote's current status.
    for (const quote of reassignments) {
      const reassigned = await repositories.quotes.assign({ quoteId: quote.databaseId, quoterId: "quoter-1", changedBy: manager });
      assert.equal(reassigned.status, quote.status);
      assert.equal(reassigned.assigned_quoter_id, "quoter-1");
    }
    assert.equal((await repositories.quotes.listNeedsReassignment()).length, 0);

    // The user detail panel includes the audit history.
    const detail = await repositories.users.getDetail("quoter-2");
    assert.equal(detail.active, false);
    assert.ok(detail.audit.length >= 3);
    assert.ok(detail.audit.every((entry) => entry.changedByName === "Morgan Lee"));

    // Sign-in timestamps are recorded.
    await repositories.users.recordSignIn("quoter-1");
    const afterSignIn = await knex("users").where({ id: "quoter-1" }).first();
    assert.ok(Number(afterSignIn.last_sign_in_at) > 0);

    // The users list includes inactive users with their roles.
    const all = await repositories.users.listAllWithRoles();
    assert.equal(all.length, 10);
    assert.ok(all.some((user) => !user.active));
    assert.deepEqual(all.find((user) => user.id === "quoter-1").roles, ["Manager", "Quoter"]);
  } finally {
    await knex.destroy();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("approval is a permission with separation of duties", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "quotes-approval-test-"));
  const filename = path.join(directory, "quotes.sqlite");
  const knex = knexFactory({
    client: "better-sqlite3",
    connection: { filename, options: { fileMustExist: false } },
    useNullAsDefault: true,
  });

  try {
    await knex.raw("PRAGMA foreign_keys = ON");
    await knex.raw("PRAGMA journal_mode = WAL");
    await knex.migrate.latest({ directory: path.join(__dirname, "..", "db", "migrations") });
    await installViews(knex);
    await seed(knex);
    const repositories = createRepositories(knex);

    const manager = await repositories.users.findActiveByEmail("manager@demo.com");
    const quoter = await repositories.users.findActiveByEmail("quoter1@demo.com");
    const reviserTwo = await repositories.users.findActiveByEmail("reviser2@demo.com");

    // Demo data: approver2 is gone and reviser2 holds the Can approve permission.
    assert.equal(await repositories.users.findActiveByEmail("approver2@demo.com"), null);
    assert.equal(Boolean(reviserTwo.can_approve), true);
    assert.deepEqual(reviserTwo.roles, ["Reviser"]);

    // Only a Reviser can be given the Can approve permission.
    await assert.rejects(
      repositories.users.createUser({ name: "Approve Rep", email: "aprep@demo.com", roles: ["Rep"], team: "Quotes", canApprove: true }, manager),
      (error) => error.status === 400 && /Can approve/.test(error.message),
    );
    await assert.rejects(
      repositories.users.updateUserRoles({ userId: "quoter-1", roles: ["Quoter"], canApprove: true, changedBy: manager }),
      (error) => error.status === 400 && /Can approve/.test(error.message),
    );

    // Grant Can approve to a Reviser; the change is audited.
    const granted = await repositories.users.updateUserRoles({ userId: "reviser-1", roles: ["Reviser"], canApprove: true, changedBy: manager });
    assert.equal(granted.can_approve, true);
    const permissionAudit = await knex("user_audit").where({ user_id: "reviser-1", field: "can_approve" }).first();
    assert.equal(permissionAudit.old_value, "No");
    assert.equal(permissionAudit.new_value, "Yes");
    assert.equal(permissionAudit.changed_by_id, manager.id);

    // A user without the permission cannot approve.
    const seededAwaiting = await knex("quotes").where({ status: "Awaiting approval" }).first();
    await assert.rejects(
      repositories.quotes.changeStatus({ quoteId: seededAwaiting.id, nextStatus: "Approved", user: quoter }),
      (error) => error.status === 403 && /Can approve/.test(error.message),
    );

    // A Reviser with the permission can approve a quote they did not revise.
    const approved = await repositories.quotes.changeStatus({ quoteId: seededAwaiting.id, nextStatus: "Approved", user: reviserTwo });
    assert.equal(approved.status, "Approved");
    assert.equal(approved.final_reviewer_id, reviserTwo.id);

    // The person who revised a quote cannot also approve it.
    const reviserOne = await repositories.users.findActiveByEmail("reviser1@demo.com");
    const inRevision = await knex("quotes").where({ status: "In revision", team: "Quotes" }).first();
    await repositories.quotes.changeStatus({ quoteId: inRevision.id, nextStatus: "Awaiting approval", user: reviserOne });
    await assert.rejects(
      repositories.quotes.changeStatus({ quoteId: inRevision.id, nextStatus: "Approved", user: reviserOne }),
      (error) => error.status === 403 && /cannot also approve/.test(error.message),
    );
    await assert.rejects(
      repositories.quotes.changeStatus({ quoteId: inRevision.id, nextStatus: "Returned to reviser", user: reviserOne, reason: "Please recheck." }),
      (error) => error.status === 403 && /cannot also approve/.test(error.message),
    );

    // A Manager approves by default.
    const managerApproved = await repositories.quotes.changeStatus({ quoteId: inRevision.id, nextStatus: "Approved", user: manager });
    assert.equal(managerApproved.status, "Approved");
    assert.equal(managerApproved.final_reviewer_id, manager.id);
  } finally {
    await knex.destroy();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
