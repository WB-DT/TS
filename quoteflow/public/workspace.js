const iconMarkup = {
  list: '<svg viewBox="0 0 20 20" fill="none"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  assign: '<svg viewBox="0 0 20 20" fill="none"><path d="M4 4.5h12v11H4zM7 8h6M7 11h3" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/><path d="m12 13 1.5 1.5L16 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  workload: '<svg viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.8 15c.4-2.2 1.8-3.4 4.2-3.4s3.8 1.2 4.2 3.4M13 5.2a2.1 2.1 0 0 1 0 4.1m.8 2.4c1.8.3 2.8 1.4 3.2 3.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  metrics: '<svg viewBox="0 0 20 20" fill="none"><path d="M3.5 16V9.5h3V16m3 0V4h3v12m3 0V7h3v9" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  branding: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 3.2 11.6 7l4.1.3-3.1 2.8.9 4.1-3.5-2.1-3.5 2.1.9-4.1-3.1-2.8 4.1-.3L10 3.2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  screening: '<svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="m12 12 4 4M6.5 8.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  review: '<svg viewBox="0 0 20 20" fill="none"><path d="M4 3.5h12v13H4zM7 7h6M7 10h3" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/><path d="m11 13 1.3 1.3 2.2-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  quotes: '<svg viewBox="0 0 20 20" fill="none"><path d="M5.5 2.75h6l3.25 3.3v10.2H5.5V2.75Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.5 2.9v3.6h3.1M8 9.5h4.5M8 12.5h4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  upload: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 12.5v3A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  home: '<svg viewBox="0 0 20 20" fill="none"><path d="m3.5 9 6.5-5.5L16.5 9v7.5h-4.5V12h-4v4.5H3.5V9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  dashboard: '<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/></svg>',
  workspace: '<svg viewBox="0 0 20 20" fill="none"><path d="M3.5 4.5h13v8h-13zM6 16h8M10 12.5V16" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  templates: '<svg viewBox="0 0 20 20" fill="none"><path d="M4 3.5h12v13H4zM4 7.5h12M8 7.5v9" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  coaching: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 3.5c-3 0-5 1.8-5 4.2 0 1.5.8 2.6 1.8 3.4.6.5 1 1.3 1.2 2.1h4c.2-.8.6-1.6 1.2-2.1 1-.8 1.8-1.9 1.8-3.4 0-2.4-2-4.2-5-4.2ZM8 15.5h4M8.5 17.5h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  settings: '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M10 2.8v2M10 15.2v2M2.8 10h2M15.2 10h2M5 5l1.4 1.4M13.6 13.6 15 15M15 5l-1.4 1.4M6.4 13.6 5 15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

const pageCopy = {
   "/margin/cross-reference": ["Cross-reference", "Upload the files one at a time; every line is calculated like the Cross Reference Tool."],
  "/manager/cross-reference": ["Cross-reference", "Upload the files one at a time; every line is calculated like the Cross Reference Tool."],
  "/manager/read-document": ["Read a document", "Proof that QuoteFlow can read the item lines in a PDF or photo."],
  "/quoter/read-document": ["Read a document", "Proof that QuoteFlow can read the item lines in a PDF or photo."],
   "/manager/request-log": ["Request log", "The team's Quote Log and MDM Log, imported from Dataverse."],
  "/qualifier/request-log": ["Request log", "The team's Quote Log and MDM Log, imported from Dataverse."],
   "/margin/locked-prices": ["Locked prices", "Prices locked into customer accounts. Import CSV files and review margins."],
  "/margin/my-settings": ["My settings", "Adjust how QuoteFlow looks for you."],
  "/manager/teams-import": ["Import from Teams", "Bring new requests in from the Teams form's quote log."],
"/qualifier/teams-import": ["Import from Teams", "Bring new requests in from the Teams form's quote log."],
  "/qualifier/my-settings": ["My settings", "Adjust how QuoteFlow looks for you."],
"/manager/my-settings": ["My settings", "Adjust how QuoteFlow looks for you."],
"/quoter/my-settings": ["My settings", "Adjust how QuoteFlow looks for you."],
"/reviser/my-settings": ["My settings", "Adjust how QuoteFlow looks for you."],
  "/manager/new-request": ["New request (intake)", "Enter a request from the Teams form on a rep's behalf."],
"/qualifier/new-request": ["New request (intake)", "Enter a request from the Teams form on a rep's behalf."],
  "/rep/home": ["Dashboard", "Your requests at a glance."],
  "/rep/new-quote-request": ["New quote request", "Share the opportunity details so a Quoter can prepare a response."],
  "/rep/my-requests": ["My requests", "Track quote requests submitted from your account."],
  "/qualifier/home": ["Dashboard", "Your screening queue at a glance."],
  "/qualifier/screening-queue": ["Screening queue", "Review new submissions."],
  "/qualifier/quote-log": ["Quote log", "A read-only view of all submissions."],
  "/manager/home": ["Dashboard", "Your team's day at a glance."],
  "/manager/quote-log": ["Quote log", "A complete view of quote activity across the workspace."],
  "/manager/assignments": ["Assignments", "Review work that is ready to assign or already assigned."],
  "/manager/reports": ["Reports", "Pipeline, cycle time, and coaching reports."],
  "/manager/templates": ["Templates", "Build and publish quote export templates."],
  "/manager/coaching": ["Coaching", "Review and share coaching notes."],
  "/manager/settings": ["Settings", "Manage users, roles, and access."],
  "/quoter/home": ["Dashboard", "Your quote queue at a glance."],
  "/quoter/my-quotes": ["My quotes", "Track the quotes assigned to your account."],
  "/quoter/quote-workspace": ["Quote workspace", "Run extraction, manage files, and price the quote."],
  "/reviser/home": ["Dashboard", "Your review queue at a glance."],
  "/reviser/review-queue": ["Review queue", "Quotes waiting for your review."],
  "/manager/approval-queue": ["Approval queue", "Quotes waiting for approval."],
  "/reviser/approval-queue": ["Approval queue", "Quotes waiting for approval."],
};

const statusTone = {
  Submitted: "info",
  Qualifying: "info",
  "Needs info": "review",
  "Ready to assign": "info",
  Assigned: "info",
  "In progress": "info",
  "In revision": "review",
  "Awaiting approval": "review",
  Approved: "success",
  "Sent to customer": "success",
  Declined: "error",
  "Returned to quoter": "review",
  "Returned to reviser": "review",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function statusPill(status) {
  const tone = statusTone[status] || "info";
  return `<span class="status-pill status-pill--${tone}">${escapeHtml(status)}</span>`;
}

function quoteTable(quotes, heading, options = {}) {
  if (!quotes.length) {
    return '<section class="items-section empty-state"><p>No quotes in this view.</p></section>';
  }
  const { quoters = [], statusOptions = null, allowAssignment = false, rowLink = false } = options;
  const actionsHeading = allowAssignment || statusOptions ? "<th scope=\"col\">Workflow action</th>" : "";
  const rows = quotes.map((quote) => {
    const availableStatuses = statusOptions ? statusOptions(quote) : [];
    const statusAction = statusOptions
      ? availableStatuses.length
        ? `<td><form class="quote-action-form" data-action="status" data-quote-id="${escapeHtml(quote.databaseId)}"><label class="visually-hidden" for="status-${escapeHtml(quote.databaseId)}">Change status for ${escapeHtml(quote.id)}</label><select id="status-${escapeHtml(quote.databaseId)}" name="status" required>${availableStatuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join("")}</select><button class="table-action-button" type="submit">Update</button><span class="action-result" role="status"></span></form></td>`
        : "<td></td>"
      : "";
    const assignmentAction = allowAssignment
      ? `<td><form class="quote-action-form" data-action="assign" data-quote-id="${escapeHtml(quote.databaseId)}"><label class="visually-hidden" for="assign-${escapeHtml(quote.databaseId)}">Assign ${escapeHtml(quote.id)} to Quoter</label><select id="assign-${escapeHtml(quote.databaseId)}" name="quoterId" required><option value="">Choose Quoter</option>${quoters.map((quoter) => `<option value="${escapeHtml(quoter.id)}"${quoter.id === quote.assignedQuoterId ? " selected" : ""}>${escapeHtml(quoter.name)} (${escapeHtml(quoter.team)})</option>`).join("")}</select><button class="table-action-button" type="submit">Assign</button><span class="action-result" role="status"></span></form></td>`
      : "";
    return `<tr${rowLink ? ` class="quote-log-row" data-quote-id="${escapeHtml(quote.databaseId)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(quote.id)}"` : ""}>
      <td><strong class="quote-id">${escapeHtml(quote.id)}</strong><small class="table-secondary">Updated ${escapeHtml(quote.updated)}</small></td>
      <td>${escapeHtml(quote.supplier || "Not detected")}</td>
      <td>${escapeHtml(quote.owner)}</td>
      <td>${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(quote.amount)}</td>
      <td>${statusPill(quote.status)}</td>
      ${assignmentAction}${statusAction}
    </tr>`;
  }).join("");
  return `<section class="items-section" aria-label="${escapeHtml(heading)}">
    <div class="items-heading"><div><h2>${escapeHtml(heading)}</h2><p class="section-description">${quotes.length} ${quotes.length === 1 ? "quote" : "quotes"}</p></div><span class="item-count">LIVE DATA</span></div>
    <div class="table-scroll"><table><caption class="visually-hidden">${escapeHtml(heading)}</caption>
      <thead><tr><th scope="col">Quote</th><th scope="col">Supplier</th><th scope="col">Owner</th><th scope="col">Amount</th><th scope="col">Status</th>${actionsHeading}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
}

function metricCard(label, value, detail, tone = "info") {
  return `<article class="metric-card"><span class="metric-mark status-pill--${tone}" aria-hidden="true"></span><p>${escapeHtml(label)}</p><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`;
}

function renderMetrics(quotes, reports) {
  const cycleRows = reports.cycleTimes || [];
  const outcomes = reports.reviserOutcomes || [];
  const average = (key) => {
    const values = cycleRows.map((row) => Number(row[key]) || 0).filter((value) => value > 0);
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length / 86400).toFixed(1) : "0.0";
  };
  const approvalCount = outcomes.reduce((sum, row) => sum + Number(row.approved_count || 0), 0);
  const edited = (reports.ocrAccuracy || []).reduce((sum, row) => sum + Number(row.edited_field_count || 0), 0);
  const extracted = (reports.ocrAccuracy || []).reduce((sum, row) => sum + Number(row.extracted_field_count || 0), 0);
  const editedPercent = extracted ? `${(edited * 100 / extracted).toFixed(1)}%` : "0.0%";
  return `<div class="metric-grid">${metricCard("Quotes tracked", String(cycleRows.length), "All seeded and submitted quotes")}${metricCard("Avg. screening", `${average("screening_seconds")} d`, "Time recorded in screening", "info")}${metricCard("Approved decisions", String(approvalCount), "Recorded final outcomes", "success")}${metricCard("OCR fields edited", editedPercent, `${edited} of ${extracted} extracted fields`, "review")}</div>${quoteTable(quotes, "Recent quote activity")}`;
}

function renderWorkload(workload) {
  const cards = workload.map((person) => `<article class="workload-row"><span class="user-avatar" aria-hidden="true">${escapeHtml(person.quoter_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join(""))}</span><div class="workload-person"><strong>${escapeHtml(person.quoter_name)}</strong><small>${escapeHtml(person.quoter_email)} · ${escapeHtml(person.team)}</small></div><span class="workload-count">${Number(person.open_quotes)} ${Number(person.open_quotes) === 1 ? "open quote" : "open quotes"}</span></article>`).join("");
  return `<section class="items-section workload-list" aria-label="Quote workload"><div class="items-heading"><div><h2>Workload by owner</h2><p class="section-description">${workload.length} active Quoters · from v_quoter_workload</p></div><span class="item-count">LIVE DATA</span></div>${cards}</section>`;
}

function statusOptionsFor(page, quote, user) {
  if (page.href === "/qualifier/screening-queue") {
    if (quote.status === "Submitted") return ["Qualifying", "Declined"];
    if (quote.status === "Qualifying") return ["Ready to assign", "Needs info", "Declined"];
    if (quote.status === "Needs info") return ["Ready to assign", "Declined"];
    return [];
  }
  if (page.href === "/reviser/review-queue") return ["Awaiting approval", "Returned to quoter"];
  if (["/manager/approval-queue", "/reviser/approval-queue"].includes(page.href)) {
    // The person who revised a quote cannot also approve it.
    if (user && quote.finalReviewerId === user.id) return [];
    return ["Approved", "Returned to reviser"];
  }
  if (page.href === "/quoter/my-quotes") {
    if (["Assigned", "Returned to quoter"].includes(quote.status)) return ["In progress"];
    if (quote.status === "In progress") return ["In revision"];
    return [];
  }
  return [];
}

function renderBrandingPage(branding) {
  return `<section class="branding-panel" aria-labelledby="branding-title">
    <div class="panel-heading"><span class="icon-badge icon-badge--blue" aria-hidden="true">Q</span><div><h2 class="section-title" id="branding-title">Company identity</h2><p class="section-description">This name and logo appear on sign-in and throughout the workspace.</p></div></div>
    <form class="branding-form" id="company-form">
      <div class="branding-field"><label for="company-name-input">Company name</label><input id="company-name-input" name="companyName" type="text" value="${escapeHtml(branding.companyName)}" maxlength="120" required /></div>
      <div class="branding-field"><label for="company-logo-input">Company logo</label><img class="branding-logo-preview" id="branding-logo-preview" src="${escapeHtml(branding.logoPath)}" alt="Current company logo preview" /><input id="company-logo-input" name="logo" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="logo-file-help" /><p class="section-description" id="logo-file-help">PNG, JPEG, or WebP, up to 5 MB.</p></div>
      <p class="branding-feedback" id="branding-feedback" role="status" aria-live="polite"></p>
      <div class="branding-actions"><button class="analyze-button" type="submit"><span>Save branding</span></button></div>
    </form>
    <form id="branding-logo-form" hidden></form>
  </section>`;
}

function quoteLogRow(quote) {
  const isAsap = quote.priority === "ASAP";
  const neededBy = quote.neededBy ? new Date(`${quote.neededBy}T00:00:00`).toLocaleDateString("en-US") : "";
  return `<tr class="quote-log-row" data-quote-id="${escapeHtml(quote.databaseId)}" data-type="${escapeHtml(quote.quoteType)}" data-status="${escapeHtml(quote.status)}" data-priority="${escapeHtml(quote.priority)}" data-quoter="${escapeHtml(quote.assignedQuoterId || "")}" tabindex="0" role="button" aria-label="Open ${escapeHtml(quote.id)}">
    <td><strong class="quote-id">${escapeHtml(quote.id)}</strong></td>
    <td><span class="type-badge type-badge--${quote.quoteType === "MDM" ? "mdm" : "quote"}">${escapeHtml(quote.quoteType)}</span></td>
    <td>${escapeHtml(quote.accountNumber || "—")}</td>
    <td>${escapeHtml(quote.companyName || quote.accountName || "—")}</td>
    <td>${escapeHtml(quote.rep || "—")}</td>
    <td>${escapeHtml(quote.submitterRole || "—")}</td>
    <td>${isAsap ? `<span class="status-pill status-pill--error">ASAP${neededBy ? ` · ${escapeHtml(neededBy)}` : ""}</span>` : '<span class="status-pill status-pill--info">Standard</span>'}</td>
    <td>${statusPill(quote.status)}</td>
    <td>${escapeHtml(quote.assignedToName || "Unassigned")}</td>
    <td>${escapeHtml(quote.submitted)}</td>
  </tr>`;
}

function renderQuoteLog(quotes, quoters) {
  const statuses = [...new Set(quotes.map((quote) => quote.status))].sort();
  const rows = quotes.map(quoteLogRow).join("");
  return `<section class="items-section" aria-label="Quote log">
    <div class="items-heading"><div><h2>Quote log</h2><p class="section-description" id="quote-log-count">${quotes.length} submissions</p></div><span class="item-count">LIVE DATA</span></div>
    <div class="log-filters" role="group" aria-label="Filter quote log">
      <label>Type <select id="filter-type"><option value="">All</option><option>Quote</option><option>MDM</option></select></label>
      <label>Status <select id="filter-status"><option value="">All</option>${statuses.map((status) => `<option>${escapeHtml(status)}</option>`).join("")}</select></label>
      <label>Priority <select id="filter-priority"><option value="">All</option><option>Standard</option><option>ASAP</option></select></label>
      <label>Quoter <select id="filter-quoter"><option value="">All</option>${quoters.map((quoter) => `<option value="${escapeHtml(quoter.id)}">${escapeHtml(quoter.name)}</option>`).join("")}</select></label>
    </div>
    <div class="table-scroll"><table><caption class="visually-hidden">All quote submissions</caption>
      <thead><tr><th scope="col">Number</th><th scope="col">Type</th><th scope="col">Account</th><th scope="col">Company</th><th scope="col">Rep</th><th scope="col">Submitter role</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Assigned quoter</th><th scope="col">Submitted</th></tr></thead>
      <tbody id="quote-log-body">${rows}</tbody>
    </table></div>
    <div class="quote-detail-panel" id="quote-detail-panel" hidden></div>
  </section>`;
}

function bindQuoteLogFilters() {
  const filters = ["filter-type", "filter-status", "filter-priority", "filter-quoter"].map((id) => document.getElementById(id));
  const body = document.getElementById("quote-log-body");
  const count = document.getElementById("quote-log-count");
  const panel = document.getElementById("quote-detail-panel");

  function applyFilters() {
    const [type, status, priority, quoter] = filters.map((filter) => filter.value);
    let visible = 0;
    for (const row of body.querySelectorAll(".quote-log-row")) {
      const show = (!type || row.dataset.type === type)
        && (!status || row.dataset.status === status)
        && (!priority || row.dataset.priority === priority)
        && (!quoter || row.dataset.quoter === quoter);
      row.hidden = !show;
      if (show) visible += 1;
    }
    count.textContent = `${visible} submission${visible === 1 ? "" : "s"}`;
  }
  for (const filter of filters) filter.addEventListener("change", applyFilters);

  body.addEventListener("click", (event) => {
    const row = event.target.closest(".quote-log-row");
    if (row) openQuoteDetail(row.dataset.quoteId, panel);
  });
  body.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest(".quote-log-row");
    if (row) { event.preventDefault(); openQuoteDetail(row.dataset.quoteId, panel); }
  });
}

async function openQuoteDetail(quoteId, panel) {
  panel.hidden = false;
  panel.innerHTML = '<p class="section-description">Loading submission…</p>';
  try {
    const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`);
    const quote = await response.json();
    if (!response.ok) throw new Error(quote.error || "Could not load submission.");
    panel.innerHTML = renderQuoteDetail(quote);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    panel.innerHTML = `<p class="section-description is-error">${escapeHtml(error.message)}</p>`;
  }
}

function renderQuoteDetail(quote) {
  const field = (label, value) => value ? `<div class="detail-field"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>` : "";
  const fileIcon = (type) => {
    if (type?.includes("pdf")) return "PDF";
    if (type?.includes("sheet") || type?.includes("excel")) return "XLS";
    if (type?.includes("word")) return "DOC";
    if (type?.includes("image")) return "IMG";
    return "FILE";
  };
  const files = (quote.files || []).map((file) => `<a class="file-chip" href="/api/quotes/${encodeURIComponent(quote.id)}/files/${encodeURIComponent(file.id)}" target="_blank" rel="noopener" aria-label="Preview ${escapeHtml(file.fileName)}"><span class="file-chip-icon" aria-hidden="true">${fileIcon(file.fileType)}</span><span class="file-chip-name">${escapeHtml(file.fileName)}</span></a>`).join("");
  return `<div class="quote-detail" role="region" aria-label="Submission details for ${escapeHtml(quote.quote_number)}">
    <div class="items-heading"><div><h3>${escapeHtml(quote.quote_number)} <span class="type-badge type-badge--${quote.quoteType === "MDM" ? "mdm" : "quote"}">${escapeHtml(quote.quoteType)}</span></h3><p class="section-description">${statusPill(quote.status)} · Submitted ${escapeHtml(quote.created_at ? new Date(Number(quote.created_at) * 1000).toLocaleDateString("en-US") : "")}</p></div><button class="secondary-button" type="button" onclick="this.closest('.quote-detail-panel').hidden = true">Close</button></div>
    <dl class="detail-grid">
      ${field("Account", quote.accountNumber ? `${quote.accountNumber} · ${quote.accountName || ""}` : quote.accountName)}
      ${field("Company", quote.company_name)}
      ${field("Rep", quote.submittedByName ? `${quote.submittedByName} (${quote.submittedByEmail})` : quote.submittedByEmail)}
      ${field("Submitter role", quote.submitter_role)}
      ${field("Request type", quote.request_type)}
      ${field("Priority", quote.priority)}
      ${field("Needed by", quote.needed_by)}
      ${field("ASAP reason", quote.asap_reason)}
      ${field("ASAP items", quote.asap_items)}
      ${field("Approving manager", quote.asapApprovedByName)}
      ${field("PPL", quote.pplName)}
      ${field("Ship to", [quote.ship_city, quote.ship_state, quote.ship_zip].filter(Boolean).join(", "))}
      ${field("Customer needs", quote.customer_needs)}
      ${field("Notes", quote.notes)}
      ${field("Assigned quoter", quote.assignedToName)}
    </dl>
    <div class="detail-files"><h4>Attached files</h4><div class="file-chip-list">${files || '<span class="section-description">No files attached.</span>'}</div></div>
  </div>`;
}


function homeCard(label, value, filter, tone = "info") {
  return `<button class="metric-card metric-card--clickable" data-home-filter="${escapeHtml(filter)}" type="button"><span class="metric-mark status-pill--${tone}" aria-hidden="true"></span><p>${escapeHtml(label)}</p><strong>${escapeHtml(String(value))}</strong></button>`;
}

function isToday(dateValue) {
  if (!dateValue) return false;
  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}
function isOverdue(dateValue) {
  if (!dateValue) return false;
  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}
function isThisWeek(epochSeconds) {
  if (!epochSeconds) return false;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const weekStart = now.getTime() - now.getDay() * 86400000;
  const time = Number(epochSeconds) * 1000;
  return time >= weekStart;
}

const HOME_FILTERS = {
  dueToday: (quote) => isToday(quote.neededBy),
  overdue: (quote) => isOverdue(quote.neededBy) && !["Approved", "Sent to customer", "Declined"].includes(quote.status),
  asap: (quote) => quote.priority === "ASAP",
  open: (quote) => !["Approved", "Sent to customer", "Declined"].includes(quote.status),
};

function renderReassignments(reassignments, quoters) {
  const rows = reassignments.map((quote) => `<tr>
    <td><strong class="quote-id">${escapeHtml(quote.id)}</strong><small class="table-secondary">Updated ${escapeHtml(quote.updated)}</small></td>
    <td>${escapeHtml(quote.companyName || quote.accountName || "—")}</td>
    <td>${statusPill(quote.status)}</td>
    <td>${escapeHtml(quote.assignedToName || quote.assignedTo || "—")}<small class="table-secondary">Deactivated</small></td>
    <td><form class="quote-action-form" data-action="assign" data-quote-id="${escapeHtml(quote.databaseId)}"><label class="visually-hidden" for="reassign-${escapeHtml(quote.databaseId)}">Reassign ${escapeHtml(quote.id)} to Quoter</label><select id="reassign-${escapeHtml(quote.databaseId)}" name="quoterId" required><option value="">Choose Quoter</option>${quoters.map((quoter) => `<option value="${escapeHtml(quoter.id)}">${escapeHtml(quoter.name)} (${escapeHtml(quoter.team)})</option>`).join("")}</select><button class="table-action-button" type="submit">Assign</button><span class="action-result" role="status"></span></form></td>
  </tr>`).join("");
  return `<section class="items-section" id="reassignment-section" aria-label="Needs reassignment">
    <div class="items-heading"><div><h2>Needs reassignment</h2><p class="section-description">Open quotes owned by deactivated users. Assign them to an active Quoter.</p></div><span class="item-count">${reassignments.length} ${reassignments.length === 1 ? "QUOTE" : "QUOTES"}</span></div>
    <div class="table-scroll"><table><caption class="visually-hidden">Open quotes needing reassignment</caption>
      <thead><tr><th scope="col">Quote</th><th scope="col">Company</th><th scope="col">Status</th><th scope="col">Previous owner</th><th scope="col">Reassign</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">No quotes need reassignment.</td></tr>'}</tbody>
    </table></div>
  </section>`;
}

function renderRoleHome(role, quotes, user, reports, reassignments = [], quoters = []) {
  const mine = quotes.filter((quote) => quote.assignedQuoterId === user.id || quote.submittedBy === user.email);
  const open = quotes.filter(HOME_FILTERS.open);
  const dueToday = open.filter(HOME_FILTERS.dueToday);
  const overdue = open.filter(HOME_FILTERS.overdue);
  const asap = open.filter(HOME_FILTERS.asap);

  let cards = [];
  if (role === "Rep") {
    const myRequests = quotes.filter((quote) => quote.submittedBy === user.email);
    cards = [
      homeCard("My open requests", myRequests.filter(HOME_FILTERS.open).length, "open"),
      homeCard("Ready to send", myRequests.filter((q) => q.status === "Approved").length, "open", "success"),
      homeCard("Needs my fixes", myRequests.filter((q) => q.status === "Needs info").length, "open", "review"),
      homeCard("Avg turnaround", "—", "open"),
    ];
  } else if (role === "Qualifier") {
    const waiting = quotes.filter((q) => ["Submitted", "Qualifying"].includes(q.status));
    cards = [
      homeCard("Waiting to screen", waiting.length, "open"),
      homeCard("Oldest waiting", waiting.length ? "—" : "0", "open"),
      homeCard("Screened today", "0", "open", "success"),
      homeCard("Decline rate", "—", "open"),
      homeCard("Manual-entry rate", "—", "open"),
    ];
  } else if (role === "Manager") {
    const waitingApproval = quotes.filter((q) => q.status === "Awaiting approval");
    cards = [
      homeCard("Due today", dueToday.length, "dueToday", dueToday.length ? "review" : "info"),
      homeCard("Overdue", overdue.length, "overdue", overdue.length ? "error" : "info"),
      homeCard("ASAP", asap.length, "asap", asap.length ? "error" : "info"),
      homeCard("Open pipeline", open.length, "open"),
      homeCard("Needs reassignment", reassignments.length, "reassignment", reassignments.length ? "error" : "info"),
      homeCard("Avg cycle time", "—", "open"),
      homeCard("Throughput this week", quotes.filter((q) => isThisWeek(q.updatedAt)).length, "open", "success"),
      homeCard("On-time rate", "—", "open"),
      homeCard("Awaiting approval", waitingApproval.length, "open"),
      homeCard("ASAP waiting", waitingApproval.filter(HOME_FILTERS.asap).length, "asap", "error"),
      homeCard("Approved today", "0", "open", "success"),
      homeCard("Below margin floor", "0", "open", "review"),
    ];
  } else if (role === "Quoter") {
    cards = [
      homeCard("Assigned to me", mine.filter(HOME_FILTERS.open).length, "open"),
      homeCard("Due today", mine.filter(HOME_FILTERS.dueToday).length, "dueToday", "review"),
      homeCard("Overdue", mine.filter(HOME_FILTERS.overdue).length, "overdue", "error"),
      homeCard("ASAP", mine.filter(HOME_FILTERS.asap).length, "asap", "error"),
      homeCard("Returned by reviser", mine.filter((q) => q.status === "Returned to quoter").length, "open", "review"),
      homeCard("Completed this week", mine.filter((q) => ["Approved", "Sent to customer"].includes(q.status) && isThisWeek(q.updatedAt)).length, "open", "success"),
      homeCard("My avg time/quote", "—", "open"),
    ];
  } else if (role === "Reviser") {
    const waiting = quotes.filter((q) => ["In revision", "Returned to reviser"].includes(q.status));
    cards = [
      homeCard("Waiting for review", waiting.length, "open"),
      homeCard("Oldest waiting", waiting.length ? "—" : "0", "open"),
      homeCard("Reviewed today", "0", "open", "success"),
      homeCard("Edit rate", "—", "open"),
      homeCard("Return rate", "—", "open"),
    ];
  }

  const todayList = [...open.filter((q) => HOME_FILTERS.dueToday(q) || HOME_FILTERS.overdue(q))]
    .sort((a, b) => (b.priority === "ASAP") - (a.priority === "ASAP"));
  const todayRows = todayList.map((quote) => `<tr class="quote-log-row" data-quote-id="${escapeHtml(quote.databaseId)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(quote.id)}"><td><strong class="quote-id">${escapeHtml(quote.id)}</strong></td><td>${escapeHtml(quote.companyName || quote.accountName || "—")}</td><td>${quote.priority === "ASAP" ? '<span class="status-pill status-pill--error">ASAP</span>' : "Standard"}</td><td>${statusPill(quote.status)}</td></tr>`).join("");

  return `<section class="items-section" aria-label="Today"><div class="items-heading"><div><h2>Today</h2><p class="section-description">Due today, waiting on you, and overdue — ASAP first</p></div></div>
    <div class="table-scroll"><table><caption class="visually-hidden">Today's work</caption><thead><tr><th scope="col">Quote</th><th scope="col">Company</th><th scope="col">Priority</th><th scope="col">Status</th></tr></thead><tbody id="home-today-body">${todayRows || '<tr><td colspan="4">Nothing due today.</td></tr>'}</tbody></table></div>
  </section>
  <div class="metric-grid" id="home-cards">${cards.join("")}</div>
  ${role === "Manager" ? renderReassignments(reassignments, quoters) : ""}
  <section class="items-section" id="home-list-section" aria-label="Filtered list" hidden><div class="items-heading"><div><h2 id="home-list-title">Quotes</h2></div></div><div class="table-scroll"><table><caption class="visually-hidden">Filtered quotes</caption><thead><tr><th scope="col">Quote</th><th scope="col">Company</th><th scope="col">Priority</th><th scope="col">Status</th></tr></thead><tbody id="home-list-body"></tbody></table></div></section>
  <div class="quote-detail-panel" id="quote-detail-panel" hidden></div>`;
}

function bindRoleHome(quotes) {
  const panel = document.getElementById("quote-detail-panel");
  const openRow = (container, event) => {
    const row = event.target.closest(".quote-log-row");
    if (row) openQuoteDetail(row.dataset.quoteId, panel);
  };
  document.getElementById("home-today-body").addEventListener("click", (event) => openRow(null, event));
  document.getElementById("home-cards").addEventListener("click", (event) => {
    const card = event.target.closest("[data-home-filter]");
    if (!card) return;
    if (card.dataset.homeFilter === "reassignment") {
      document.getElementById("reassignment-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const filter = HOME_FILTERS[card.dataset.homeFilter];
    const listSection = document.getElementById("home-list-section");
    const listBody = document.getElementById("home-list-body");
    const filtered = quotes.filter(filter);
    document.getElementById("home-list-title").textContent = card.querySelector("p").textContent;
    listBody.innerHTML = filtered.map((quote) => `<tr class="quote-log-row" data-quote-id="${escapeHtml(quote.databaseId)}" tabindex="0" role="button"><td><strong class="quote-id">${escapeHtml(quote.id)}</strong></td><td>${escapeHtml(quote.companyName || quote.accountName || "—")}</td><td>${quote.priority === "ASAP" ? '<span class="status-pill status-pill--error">ASAP</span>' : "Standard"}</td><td>${statusPill(quote.status)}</td></tr>`).join("") || '<tr><td colspan="4">No quotes match.</td></tr>';
    listSection.hidden = false;
    listSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("home-list-body").addEventListener("click", (event) => openRow(null, event));
}

function screeningChecklistRow(label, ok, hint) {
  const state = ok === null ? "pending" : ok ? "pass" : "fail";
  const icon = state === "pass" ? "✓" : state === "fail" ? "✕" : "•";
  return `<li class="checklist-item checklist-item--${state}"><span class="checklist-icon" aria-hidden="true">${icon}</span><span class="checklist-label">${escapeHtml(label)}</span>${hint ? `<small class="checklist-hint">${escapeHtml(hint)}</small>` : ""}</li>`;
}

function renderScreeningPanel(quote, settings) {
  const minItemCount = Number(settings?.minimum_item_count || 1);
  const fileCount = (quote.files || []).length;
  const hasAccount = Boolean(quote.accountNumber || quote.company_name);
  const hasNeeds = Boolean(String(quote.customer_needs || "").trim());
  const hasContact = Boolean(quote.submittedByEmail || quote.submittedByName);
  const requiredInfo = hasAccount && hasNeeds && hasContact;
  const itemCount = Number(quote.item_line_count || quote.itemLineCount || 0);
  const meetsMinItems = itemCount >= minItemCount;
  const filesReadable = fileCount > 0;
  const duplicate = String(quote.duplicate_warning || "").toLowerCase().includes("duplicate");

  const fileChips = (quote.files || []).map((file) => `<a class="file-chip" href="/api/quotes/${encodeURIComponent(quote.id)}/files/${encodeURIComponent(file.id)}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(file.fileName)} to confirm it is readable"><span class="file-chip-icon" aria-hidden="true">${file.fileType?.includes("pdf") ? "PDF" : file.fileType?.includes("image") ? "IMG" : "FILE"}</span><span class="file-chip-name">${escapeHtml(file.fileName)}</span></a>`).join("");

  return `<div class="quote-detail screening-panel" role="region" aria-label="Screening checklist for ${escapeHtml(quote.quote_number)}">
    <div class="items-heading"><div><h3>${escapeHtml(quote.quote_number)} <span class="type-badge type-badge--${quote.quoteType === "MDM" ? "mdm" : "quote"}">${escapeHtml(quote.quoteType)}</span></h3><p class="section-description">${statusPill(quote.status)} · ${escapeHtml(quote.company_name || quote.accountName || "")}</p></div><button class="secondary-button" type="button" data-close-panel>Close</button></div>
    ${duplicate ? `<p class="status-pill status-pill--error screening-duplicate">Possible duplicate submission</p>` : ""}
    <div class="screening-grid">
      <div>
        <h4 class="screening-subhead">Checklist</h4>
        <ul class="checklist" id="screening-checklist">
          ${screeningChecklistRow("Belongs to this department", null, quote.team ? `Team: ${quote.team}` : "")}
          ${screeningChecklistRow(`At least ${minItemCount} item${minItemCount === 1 ? "" : "s"}`, itemCount ? meetsMinItems : null, itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"} detected` : "Run extraction to count items")}
          ${screeningChecklistRow("All required info present", requiredInfo, [hasAccount ? null : "account/company", hasNeeds ? null : "customer needs", hasContact ? null : "submitter"].filter(Boolean).join(" missing: ") || "Account, needs, and submitter present")}
          ${screeningChecklistRow("Files open and are readable", filesReadable ? true : false, filesReadable ? `${fileCount} file${fileCount === 1 ? "" : "s"} attached — open to confirm` : "No files attached")}
        </ul>
        <div class="detail-files"><h4 class="screening-subhead">Files</h4><div class="file-chip-list">${fileChips || '<span class="section-description">No files attached.</span>'}</div></div>
      </div>
      <div>
        <h4 class="screening-subhead">Outcome</h4>
        <form class="screening-form" data-quote-id="${escapeHtml(quote.id)}" data-database-id="${escapeHtml(quote.databaseId || quote.id)}">
          <fieldset class="screening-outcomes"><legend class="visually-hidden">Screening outcome</legend>
            <label class="screening-outcome"><input type="radio" name="outcome" value="Ready to assign" /><span>Approve</span></label>
            <label class="screening-outcome"><input type="radio" name="outcome" value="Ready to assign" data-manual="true" /><span>Approve – manual entry</span></label>
            <label class="screening-outcome"><input type="radio" name="outcome" value="Needs info" /><span>Request more info</span></label>
            <label class="screening-outcome"><input type="radio" name="outcome" value="Declined" /><span>Decline</span></label>
          </fieldset>
          <div class="screening-field" id="screening-reason-field" hidden>
            <label for="screening-reason">Reason <span aria-hidden="true">*</span></label>
            <textarea id="screening-reason" name="reason" rows="3" aria-describedby="screening-reason-help"></textarea>
            <small id="screening-reason-help">Required for Request more info and Decline. The Rep is notified and the clock pauses for Needs info.</small>
          </div>
          <p class="screening-feedback" role="status" aria-live="polite"></p>
          <div class="review-actions"><button class="analyze-button" type="submit"><span>Submit outcome</span></button></div>
        </form>
      </div>
    </div>
  </div>`;
}

async function openScreeningPanel(quoteId, panel, settings) {
  panel.hidden = false;
  panel.innerHTML = '<p class="section-description">Loading submission…</p>';
  try {
    const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`);
    const quote = await response.json();
    if (!response.ok) throw new Error(quote.error || "Could not load submission.");
    panel.innerHTML = renderScreeningPanel(quote, settings);
    bindScreeningForm(panel);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    panel.innerHTML = `<p class="section-description is-error">${escapeHtml(error.message)}</p>`;
  }
}

function bindScreeningForm(panel) {
  const form = panel.querySelector(".screening-form");
  if (!form) return;
  const reasonField = form.querySelector("#screening-reason-field");
  const reasonInput = form.querySelector("#screening-reason");
  const feedback = form.querySelector(".screening-feedback");

  panel.querySelector("[data-close-panel]")?.addEventListener("click", () => { panel.hidden = true; });

  form.querySelectorAll("input[name='outcome']").forEach((input) => {
    input.addEventListener("change", () => {
      const needsReason = ["Needs info", "Declined"].includes(input.value);
      reasonField.hidden = !needsReason;
      reasonInput.required = needsReason;
      if (needsReason) reasonInput.focus();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = form.querySelector("input[name='outcome']:checked");
    if (!selected) {
      feedback.textContent = "Choose an outcome.";
      feedback.className = "screening-feedback is-error";
      return;
    }
    const status = selected.value;
    const reason = reasonInput.value.trim();
    if (["Needs info", "Declined"].includes(status) && !reason) {
      feedback.textContent = "A reason is required for this outcome.";
      feedback.className = "screening-feedback is-error";
      reasonInput.focus();
      return;
    }
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    feedback.textContent = "Saving…";
    feedback.className = "screening-feedback";
    try {
      const response = await fetch(`/api/quotes/${encodeURIComponent(form.dataset.databaseId)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Outcome could not be saved.");
      feedback.textContent = `Saved. Status is now ${payload.status}.`;
      feedback.className = "screening-feedback is-success";
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = "screening-feedback is-error";
      button.disabled = false;
    }
  });
}

const EDIT_REASONS = ["wrong item match", "wrong unit of measure", "pricing error", "missed item", "better price available", "formatting", "other"];

function reviserFileIcon(type) {
  if (type?.includes("pdf")) return "PDF";
  if (type?.includes("image")) return "IMG";
  if (type?.includes("sheet") || type?.includes("excel")) return "XLS";
  if (type?.includes("word")) return "DOC";
  return "FILE";
}

function renderReviserPanel(quote) {
  const fileTabs = (quote.files || []).map((file, index) => `<button class="reviser-file-tab${index === 0 ? " is-active" : ""}" data-file-url="/api/quotes/${encodeURIComponent(quote.id)}/files/${encodeURIComponent(file.id)}" data-file-type="${escapeHtml(file.fileType)}" type="button" role="tab" aria-selected="${index === 0}"><span class="file-chip-icon" aria-hidden="true">${reviserFileIcon(file.fileType)}</span>${escapeHtml(file.fileName)}</button>`).join("");

  const lineRows = (quote.lineItems || []).map((line) => `<tr data-line-id="${escapeHtml(line.id)}" class="${line.editedByQuoter ? "reviser-line--edited" : ""}">
    <td>${escapeHtml(line.lineNumber)}</td>
    <td>${escapeHtml(line.itemNumber || line.partNumber || "—")}</td>
    <td class="reviser-cell" data-field="description" data-value="${escapeHtml(line.description || "")}">${escapeHtml(line.description || "—")}</td>
    <td class="reviser-cell" data-field="uom" data-value="${escapeHtml(line.uom || "")}">${escapeHtml(line.uom || "—")}</td>
    <td class="reviser-cell" data-field="quantity" data-value="${escapeHtml(line.quantity ?? "")}">${escapeHtml(line.quantity ?? "—")}</td>
    <td class="reviser-cell" data-field="price" data-value="${escapeHtml(line.price ?? "")}">${escapeHtml(line.price ?? "—")}</td>
    <td><button class="table-action-button reviser-edit-line" type="button" aria-label="Edit line ${escapeHtml(line.lineNumber)}">Edit</button></td>
  </tr>`).join("");

  const changeRows = (quote.changeLog || []).map((entry) => `<tr>
    <td>${escapeHtml(entry.editorName || "—")}</td>
    <td>${escapeHtml(entry.field || "")}${entry.lineNumber ? ` <small class="table-secondary">line ${escapeHtml(entry.lineNumber)}</small>` : ""}</td>
    <td>${escapeHtml(entry.oldValue ?? "")}</td>
    <td>${escapeHtml(entry.newValue ?? "")}</td>
    <td>${escapeHtml(entry.reason || "—")}${entry.reasonNote ? `<small class="table-secondary"> ${escapeHtml(entry.reasonNote)}</small>` : ""}</td>
    <td>${entry.coaching ? `<span class="status-pill status-pill--review">Coaching${entry.coachingCategory ? `: ${escapeHtml(entry.coachingCategory)}` : ""}</span>` : "—"}</td>
    <td>${escapeHtml(entry.editedAt ? new Date(entry.editedAt).toLocaleString("en-US") : "")}</td>
  </tr>`).join("");

  const firstFile = (quote.files || [])[0];
  const viewer = firstFile
    ? (firstFile.fileType?.includes("image")
      ? `<img class="reviser-viewer-img" src="/api/quotes/${encodeURIComponent(quote.id)}/files/${encodeURIComponent(firstFile.id)}" alt="Source file ${escapeHtml(firstFile.fileName)}" />`
      : firstFile.fileType?.includes("pdf")
        ? `<iframe class="reviser-viewer-frame" src="/api/quotes/${encodeURIComponent(quote.id)}/files/${encodeURIComponent(firstFile.id)}" title="Source file ${escapeHtml(firstFile.fileName)}"></iframe>`
        : `<p class="section-description">Preview not available for this file type. <a href="/api/quotes/${encodeURIComponent(quote.id)}/files/${encodeURIComponent(firstFile.id)}" target="_blank" rel="noopener">Open ${escapeHtml(firstFile.fileName)}</a></p>`)
    : '<p class="section-description">No source file attached.</p>';

  return `<div class="quote-detail reviser-panel" role="region" aria-label="Review workspace for ${escapeHtml(quote.quote_number)}">
    <div class="items-heading"><div><h3>${escapeHtml(quote.quote_number)} <span class="type-badge type-badge--${quote.quoteType === "MDM" ? "mdm" : "quote"}">${escapeHtml(quote.quoteType)}</span></h3><p class="section-description">${statusPill(quote.status)} · ${escapeHtml(quote.company_name || quote.accountName || "")}</p></div><button class="secondary-button" type="button" data-close-panel>Close</button></div>
    <div class="reviser-split">
      <div class="reviser-source">
        <div class="reviser-file-tabs" role="tablist" aria-label="Source files">${fileTabs}</div>
        <div class="reviser-viewer" id="reviser-viewer">${viewer}</div>
      </div>
      <div class="reviser-quote">
        <h4 class="screening-subhead">Line items</h4>
        <div class="table-scroll"><table><caption class="visually-hidden">Quote line items</caption><thead><tr><th scope="col">#</th><th scope="col">Item</th><th scope="col">Description</th><th scope="col">UOM</th><th scope="col">Qty</th><th scope="col">Price</th><th scope="col"><span class="visually-hidden">Edit</span></th></tr></thead><tbody>${lineRows || '<tr><td colspan="7">No line items extracted yet.</td></tr>'}</tbody></table></div>
      </div>
    </div>
    <div class="reviser-changelog">
      <h4 class="screening-subhead">Change log</h4>
      <div class="table-scroll"><table><caption class="visually-hidden">Tracked changes</caption><thead><tr><th scope="col">Who</th><th scope="col">Field</th><th scope="col">Old value</th><th scope="col">New value</th><th scope="col">Reason</th><th scope="col">Coaching</th><th scope="col">Time</th></tr></thead><tbody>${changeRows || '<tr><td colspan="7">No changes recorded yet.</td></tr>'}</tbody></table></div>
    </div>
    <div class="reviser-actions">
      <form class="reviser-action-form" data-action="Returned to quoter" data-database-id="${escapeHtml(quote.id)}">
        <label>Return to quoter <span aria-hidden="true">*</span><input type="text" name="reason" placeholder="Reason (required)" required /></label>
        <button class="secondary-button" type="submit">Return to quoter</button>
      </form>
      <form class="reviser-action-form" data-action="Awaiting approval" data-database-id="${escapeHtml(quote.id)}">
        <button class="analyze-button" type="submit"><span>Forward to approver</span></button>
      </form>
      <p class="screening-feedback" role="status" aria-live="polite"></p>
    </div>
  </div>`;
}

async function openReviserPanel(quoteId, panel) {
  panel.hidden = false;
  panel.innerHTML = '<p class="section-description">Loading review workspace…</p>';
  try {
    const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`);
    const quote = await response.json();
    if (!response.ok) throw new Error(quote.error || "Could not load quote.");
    panel.innerHTML = renderReviserPanel(quote);
    bindReviserPanel(panel, quote);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    panel.innerHTML = `<p class="section-description is-error">${escapeHtml(error.message)}</p>`;
  }
}

function bindReviserPanel(panel, quote) {
  panel.querySelector("[data-close-panel]")?.addEventListener("click", () => { panel.hidden = true; });

  // Source-file tabs switch the preview.
  const viewer = panel.querySelector("#reviser-viewer");
  panel.querySelectorAll(".reviser-file-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      panel.querySelectorAll(".reviser-file-tab").forEach((candidate) => { candidate.classList.remove("is-active"); candidate.setAttribute("aria-selected", "false"); });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      const url = tab.dataset.fileUrl;
      const type = tab.dataset.fileType;
      if (type?.includes("image")) viewer.innerHTML = `<img class="reviser-viewer-img" src="${url}" alt="Source file" />`;
      else if (type?.includes("pdf")) viewer.innerHTML = `<iframe class="reviser-viewer-frame" src="${url}" title="Source file"></iframe>`;
      else viewer.innerHTML = `<p class="section-description">Preview not available. <a href="${url}" target="_blank" rel="noopener">Open file</a></p>`;
    });
  });

  // Per-line edit with required reason and optional coaching flag.
  panel.querySelectorAll(".reviser-edit-line").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("tr");
      const lineId = row.dataset.lineId;
      const cells = row.querySelectorAll(".reviser-cell");
      const form = document.createElement("form");
      form.className = "reviser-edit-form";
      form.innerHTML = `<fieldset><legend>Edit line ${escapeHtml(row.children[0].textContent)}</legend>
        ${[...cells].map((cell) => `<label>${escapeHtml(cell.dataset.field)}<input type="text" name="${escapeHtml(cell.dataset.field)}" value="${escapeHtml(cell.dataset.value)}" /></label>`).join("")}
        <label>Reason <span aria-hidden="true">*</span><select name="reason" required><option value="">Choose a reason</option>${EDIT_REASONS.map((reason) => `<option>${escapeHtml(reason)}</option>`).join("")}</select></label>
        <label>Note <span aria-hidden="true">*</span><textarea name="reasonNote" rows="2" required></textarea></label>
        <label class="reviser-coaching"><input type="checkbox" name="coaching" /> Coaching opportunity<input type="text" name="coachingCategory" placeholder="Category" aria-label="Coaching category" /></label>
        <p class="screening-feedback" role="status" aria-live="polite"></p>
        <div class="review-actions"><button class="secondary-button" type="button" data-cancel>Cancel</button><button class="analyze-button" type="submit"><span>Save edit</span></button></div>
      </fieldset>`;
      const host = document.createElement("tr");
      host.className = "reviser-edit-row";
      const hostCell = document.createElement("td");
      hostCell.colSpan = 7;
      hostCell.append(form);
      host.append(hostCell);
      row.after(host);
      button.disabled = true;
      form.querySelector("[data-cancel]").addEventListener("click", () => { host.remove(); button.disabled = false; });
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const feedback = form.querySelector(".screening-feedback");
        const data = new FormData(form);
        const changes = {};
        for (const cell of cells) {
          const value = String(data.get(cell.dataset.field) ?? "");
          if (value !== cell.dataset.value) changes[cell.dataset.field] = value;
        }
        if (!Object.keys(changes).length) {
          feedback.textContent = "Change at least one value before saving.";
          feedback.className = "screening-feedback is-error";
          return;
        }
        const submitButton = form.querySelector("button[type='submit']");
        submitButton.disabled = true;
        feedback.textContent = "Saving edit…";
        feedback.className = "screening-feedback";
        try {
          const response = await fetch(`/api/quotes/${encodeURIComponent(quote.id)}/lines/${encodeURIComponent(lineId)}/edit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              changes,
              reason: data.get("reason"),
              reasonNote: data.get("reasonNote"),
              coaching: Boolean(data.get("coaching")),
              coachingCategory: data.get("coachingCategory"),
            }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Edit could not be saved.");
          feedback.textContent = "Edit saved.";
          feedback.className = "screening-feedback is-success";
          window.setTimeout(() => window.location.reload(), 700);
        } catch (error) {
          feedback.textContent = error.message;
          feedback.className = "screening-feedback is-error";
          submitButton.disabled = false;
        }
      });
    });
  });

  // Return to quoter / forward to approver.
  panel.querySelectorAll(".reviser-action-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const feedback = panel.querySelector(".reviser-actions .screening-feedback");
      const button = form.querySelector("button[type='submit']");
      button.disabled = true;
      feedback.textContent = "Saving…";
      feedback.className = "screening-feedback";
      try {
        const response = await fetch(`/api/quotes/${encodeURIComponent(form.dataset.databaseId)}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: form.dataset.action, reason: form.elements.reason?.value || "" }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Action could not be saved.");
        feedback.textContent = `Saved. Status is now ${payload.status}.`;
        feedback.className = "screening-feedback is-success";
        window.setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        feedback.textContent = error.message;
        feedback.className = "screening-feedback is-error";
        button.disabled = false;
      }
    });
  });
}

function renderSendToCustomerPanel(quote, user) {
  const customerName = quote.company_name || quote.accountName || "Customer";
  const exportUrl = `/api/quotes/${encodeURIComponent(quote.id)}/export/customer`;
  const subject = `Your quote ${quote.quote_number} from QuoteFlow`;
  const body = [
    `Hello ${customerName},`,
    "",
    `Thank you for the opportunity. Please find your quote ${quote.quote_number} attached.`,
    "",
    "This quote is based on the details you shared. Let me know if you have any questions or would like to move forward.",
    "",
    "Best regards,",
    user.name,
    user.email,
  ].join("\n");
  return `<div class="quote-detail send-composer" role="region" aria-label="Send quote ${escapeHtml(quote.quote_number)} to customer">
    <div class="items-heading"><div><h3>Send ${escapeHtml(quote.quote_number)} to customer</h3><p class="section-description">${escapeHtml(customerName)} · ${statusPill(quote.status)}</p></div><button class="secondary-button" type="button" data-close-panel>Close</button></div>
    <form class="send-composer-form" data-database-id="${escapeHtml(quote.id)}">
      <div class="send-composer-grid">
        <div class="send-composer-field"><label for="send-to">To</label><input id="send-to" name="to" type="email" placeholder="customer@example.com" required /></div>
        <div class="send-composer-field"><label for="send-cc">CC</label><input id="send-cc" name="cc" type="text" value="${escapeHtml(user.email)}" readonly aria-readonly="true" /><small class="field-hint">You are CC'd automatically.</small></div>
        <div class="send-composer-field send-composer-field--wide"><label for="send-subject">Subject</label><input id="send-subject" name="subject" type="text" value="${escapeHtml(subject)}" required /></div>
        <div class="send-composer-field send-composer-field--wide"><label for="send-body">Message</label><textarea id="send-body" name="body" rows="8" required>${escapeHtml(body)}</textarea></div>
        <div class="send-composer-field send-composer-field--wide"><span class="send-attachment-label">Attachment</span><a class="file-chip" href="${exportUrl}" download aria-label="Download customer version of ${escapeHtml(quote.quote_number)}"><span class="file-chip-icon" aria-hidden="true">XLS</span><span class="file-chip-name">${escapeHtml(quote.quote_number)}-customer.xlsx</span></a><small class="field-hint">The customer version (no cost or margin) is attached.</small></div>
      </div>
      <p class="screening-feedback" role="status" aria-live="polite"></p>
      <div class="review-actions">
        <button class="secondary-button" type="button" data-close-panel>Cancel</button>
        <button class="analyze-button" type="submit"><span>Send to customer</span></button>
      </div>
    </form>
  </div>`;
}

async function openSendToCustomerPanel(quoteId, panel, user) {
  panel.hidden = false;
  panel.innerHTML = '<p class="section-description">Preparing composer…</p>';
  try {
    const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`);
    const quote = await response.json();
    if (!response.ok) throw new Error(quote.error || "Could not load quote.");
    panel.innerHTML = renderSendToCustomerPanel(quote, user);
    bindSendToCustomerPanel(panel);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    panel.innerHTML = `<p class="section-description is-error">${escapeHtml(error.message)}</p>`;
  }
}

function bindSendToCustomerPanel(panel) {
  const form = panel.querySelector(".send-composer-form");
  if (!form) return;
  panel.querySelectorAll("[data-close-panel]").forEach((button) => button.addEventListener("click", () => { panel.hidden = true; }));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const feedback = form.querySelector(".screening-feedback");
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    feedback.textContent = "Sending…";
    feedback.className = "screening-feedback";
    try {
      // Generate the pre-written email in the default mail client (no real send yet).
      const to = form.elements.to.value.trim();
      const cc = form.elements.cc.value.trim();
      const subject = form.elements.subject.value;
      const body = form.elements.body.value;
      const mailto = `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;

      const response = await fetch(`/api/quotes/${encodeURIComponent(form.dataset.databaseId)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Sent to customer", reason: "Quote sent to customer by the Rep." }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Status could not be updated.");
      feedback.textContent = "Email draft opened and quote marked Sent to customer.";
      feedback.className = "screening-feedback is-success";
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = "screening-feedback is-error";
      button.disabled = false;
    }
  });
}

function renderPageContent(page, quotes, user, reports, quoters, branding, reassignments = []) {
  const [title, description] = pageCopy[page.href];
  const pageContent = document.querySelector("#page-content");
  pageContent.innerHTML = `<section class="intro" aria-labelledby="page-title"><div><p class="eyebrow">${escapeHtml(user.role.toUpperCase())} WORKSPACE</p><h1 id="page-title">${escapeHtml(title)}</h1><p class="intro-copy">${escapeHtml(description)}</p></div><span class="page-index">${escapeHtml(user.role.toUpperCase())}</span></section><div id="page-body"></div><footer class="footer"><span>QUOTEFLOW DOCUMENT WORKSPACE</span><span>${escapeHtml(user.role.toUpperCase())} VIEW</span></footer>`;
  const pageBody = document.querySelector("#page-body");
 if (page.href.endsWith("/cross-reference")) {
    pageBody.innerHTML = `
      <div id="xref-root">
        <section class="request-section items-section" aria-labelledby="xref-runs-title">
          <div class="items-heading"><div><h2 class="section-title" id="xref-runs-title">Runs</h2><p class="section-description">Each run prices one list of items, such as an account or a quote. Its files are kept with it.</p></div></div>
          <form class="xr-new" id="xref-new">
            <label class="visually-hidden" for="xref-new-name">Run name</label>
            <input id="xref-new-name" name="name" maxlength="160" placeholder="Name, for example C1234566 or Q-34721" />
            <button class="settings-save-button" type="submit">Start a run</button>
            <p class="request-feedback" id="xref-new-status" role="status" aria-live="polite"></p>
          </form>
          <div id="xref-runs"></div>
        </section>
        <section class="xr-detail" id="xref-detail" aria-live="polite" hidden></section>
      </div>`;
    return;
  }

  if (page.href.endsWith("/read-document")) {
    pageBody.innerHTML = `
      <div id="ocr-root">
        <section class="request-section items-section" aria-labelledby="ocr-title">
          <div class="items-heading"><div><h2 class="section-title" id="ocr-title">Read a PDF or photo</h2><p class="section-description">Upload an invoice, quote or price list. QuoteFlow finds the item lines: item number, description, quantity, unit and price. The file is read inside QuoteFlow and is not saved.</p></div></div>
          <div class="ocr-upload-row">
            <label class="visually-hidden" for="ocr-file">Document (PDF, PNG, JPG, TIFF, BMP or WebP)</label>
            <input id="ocr-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp" />
            <button class="settings-save-button" id="ocr-read" type="button">Read document</button>
            <p class="request-feedback" id="ocr-status" role="status" aria-live="polite"></p>
          </div>
        </section>
        <div id="ocr-results" aria-live="polite"></div>
      </div>`;
    return;
  }

   if (page.href.endsWith("/request-log")) {
    pageBody.innerHTML = `
      <div id="request-log-root">
        <section class="request-section items-section" aria-labelledby="rl-import-title">
          <div class="items-heading"><div><h2 class="section-title" id="rl-import-title">Import the Dataverse export</h2><p class="section-description">Upload the .xlsx export of the Quote Log, the MDM Log, or both. New rows are added and changed rows are updated. Nothing is ever deleted.</p></div></div>
          <div class="rl-import-row">
            <label class="visually-hidden" for="rl-file">Dataverse export (.xlsx)</label>
            <input id="rl-file" type="file" accept=".xlsx" />
            <button class="settings-save-button" id="rl-import" type="button">Import</button>
            <p class="request-feedback" id="rl-import-status" role="status" aria-live="polite"></p>
          </div>
        </section>
        <div class="rl-tabs" role="tablist" aria-label="Log">
          <button type="button" role="tab" aria-selected="true" data-log-tab="quote">Quote Log</button>
          <button type="button" role="tab" aria-selected="false" data-log-tab="mdm">MDM Log</button>
        </div>
        <div class="rl-cards" id="rl-cards" role="group" aria-label="Rows by stage"></div>
        <form class="rl-search" id="rl-search" role="search">
          <label class="visually-hidden" for="rl-search-box">Search the log</label>
          <input id="rl-search-box" name="search" type="search" placeholder="Search Q-number, company, account, person or PPL" />
          <button class="secondary-button" type="submit">Search</button>
        </form>
        <div id="rl-list"></div>
        <section class="rl-detail" id="rl-detail" aria-live="polite" hidden></section>
      </div>`;
    return;
  }

  if (page.href === "/margin/locked-prices") {
    pageBody.innerHTML = `
      <div id="locked-prices-root">
        <section class="request-section items-section" aria-labelledby="lp-import-title">
          <div class="items-heading"><div><h2 class="section-title" id="lp-import-title">Import a CSV file</h2><p class="section-description">Preview first. Rows already saved are skipped, so the same file can be uploaded twice safely.</p></div></div>
          <div class="lp-import-row">
            <label class="visually-hidden" for="lp-file">Locked prices CSV file</label>
            <input id="lp-file" type="file" accept=".csv" />
            <button class="secondary-button" id="lp-preview" type="button">Preview</button>
            <button class="settings-save-button" id="lp-import" type="button" hidden>Save prices</button>
            <p class="request-feedback" id="lp-import-status" role="status" aria-live="polite"></p>
          </div>
          <div id="lp-preview-area"></div>
        </section>
        <div class="lp-cards" id="lp-totals" role="group" aria-label="Locked-in price totals"></div>
        <form class="lp-filters" id="lp-filters" role="search">
          <label>Search<input name="search" type="search" placeholder="Account, company, item, PPL or Q-number" /></label>
          <label>From<input name="from" type="date" /></label>
          <label>To<input name="to" type="date" /></label>
          <label class="lp-check"><input name="belowFloor" type="checkbox" /> Below margin floor only</label>
          <button class="secondary-button" type="submit">Apply</button>
        </form>
        <div id="lp-list"></div>
      </div>`;
    return;
  }
    if (page.href.endsWith("/teams-import")) {
    pageBody.innerHTML = `
      <section class="request-section items-section" aria-labelledby="teams-import-title">
        <div class="items-heading"><div><h2 class="section-title" id="teams-import-title">Upload the quote log</h2><p class="section-description">Choose the Excel file the Teams form fills. QuoteFlow shows what it found before anything is saved.</p></div></div>
        <form class="teams-import-form" id="teams-import-form">
          <label class="visually-hidden" for="teams-import-file">Quote log Excel file</label>
          <input id="teams-import-file" type="file" accept=".xlsx,.xls" />
          <button class="settings-save-button" id="teams-import-preview" type="submit">Preview import</button>
          <p class="request-feedback" id="teams-import-status" role="status" aria-live="polite"></p>
        </form>
      </section>
      <div id="teams-import-results"></div>`;
    return;
  }
    if (page.href.endsWith("/my-settings")) {
    pageBody.innerHTML = `
      <form class="my-settings" id="my-settings-form">
        <section class="request-section items-section" aria-labelledby="brightness-title">
          <div class="items-heading"><div><h2 class="section-title" id="brightness-title">Screen brightness</h2><p class="section-description">Choose what is most comfortable for your eyes.</p></div></div>
          <div class="priority-options" role="radiogroup" aria-labelledby="brightness-title">
            <label class="priority-option"><input type="radio" name="theme" value="light" /><span><strong>Light</strong><small>Bright and crisp. The default.</small></span></label>
            <label class="priority-option"><input type="radio" name="theme" value="medium" /><span><strong>Medium</strong><small>Dimmer soft gray for light sensitivity.</small></span></label>
            <label class="priority-option"><input type="radio" name="theme" value="dark" /><span><strong>Dark</strong><small>Lowest brightness.</small></span></label>
          </div>
        </section>
        <section class="request-section items-section" aria-labelledby="text-size-title">
          <div class="items-heading"><div><h2 class="section-title" id="text-size-title">Text size</h2><p class="section-description">Makes text a little larger. The page layout stays the same.</p></div></div>
          <div class="priority-options" role="radiogroup" aria-labelledby="text-size-title">
            <label class="priority-option"><input type="radio" name="textSize" value="standard" /><span><strong>Standard</strong><small>The default size.</small></span></label>
            <label class="priority-option"><input type="radio" name="textSize" value="comfortable" /><span><strong>Comfortable</strong><small>About 6% larger.</small></span></label>
            <label class="priority-option"><input type="radio" name="textSize" value="large" /><span><strong>Large</strong><small>About 12% larger.</small></span></label>
          </div>
        </section>
        <div class="my-settings-actions"><button class="settings-save-button" id="my-settings-save" type="submit">Save changes</button><p class="request-feedback" id="my-settings-status" role="status" aria-live="polite"></p></div>
      </form>`;
    return;
  }

  if (page.href.endsWith("/new-request")) {
    pageBody.append(document.querySelector("#rep-request-template").content.cloneNode(true));
    return;
  }
  if (page.href === "/manager/branding") {
    pageBody.innerHTML = renderBrandingPage(branding);
    return;
  }
  if (page.href === "/quoter/quote-workspace") {
    window.__workspaceQuotes = quotes;
    pageBody.append(document.querySelector("#quote-workspace-template").content.cloneNode(true));
    return;
  }
  if (page.href === "/manager/quote-log") {
    pageBody.innerHTML = renderQuoteLog(quotes, quoters);
    bindQuoteLogFilters(quotes);
    return;
  }
  if (page.href === "/manager/settings") {
    pageBody.innerHTML = '<div class="users-page" id="users-root"><p class="section-description">Loading users…</p></div>';
    return;
  }
  const homePages = {
    "/rep/home": "Rep",
    "/qualifier/home": "Qualifier",
    "/manager/home": "Manager",
    "/quoter/home": "Quoter",
    "/reviser/home": "Reviser",
  };
  if (homePages[page.href]) {
    pageBody.innerHTML = renderRoleHome(homePages[page.href], quotes, user, reports, reassignments, quoters);
    bindRoleHome(quotes);
    return;
  }

  if (page.href === "/manager/assignments") {
    quotes = quotes.filter((quote) => ["Ready to assign", "Assigned"].includes(quote.status));
  } else if (page.href === "/qualifier/screening-queue") {
    quotes = quotes.filter((quote) => ["Submitted", "Qualifying", "Needs info"].includes(quote.status));
  } else if (page.href === "/reviser/review-queue") {
    quotes = quotes.filter((quote) => ["In revision", "Returned to reviser"].includes(quote.status));
  } else if (["/manager/approval-queue", "/reviser/approval-queue"].includes(page.href)) {
    quotes = quotes.filter((quote) => quote.status === "Awaiting approval");
  }

  if (page.href === "/qualifier/screening-queue") {
    pageBody.innerHTML = quoteTable(quotes, title, { quoters, rowLink: true }) + '<div class="quote-detail-panel" id="quote-detail-panel" hidden></div>';
    const panel = document.getElementById("quote-detail-panel");
    let screeningSettings = null;
    fetch("/api/settings").then((response) => response.ok ? response.json() : null).then((payload) => { screeningSettings = payload?.workspace || null; }).catch(() => {});
    const openRow = (event) => {
      const row = event.target.closest(".quote-log-row");
      if (row) openScreeningPanel(row.dataset.quoteId, panel, screeningSettings);
    };
    const tableBody = pageBody.querySelector("tbody");
    tableBody.addEventListener("click", openRow);
    tableBody.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest(".quote-log-row")) { event.preventDefault(); openRow(event); }
    });
    return;
  }

  if (page.href === "/reviser/review-queue") {
    pageBody.innerHTML = quoteTable(quotes, title, { quoters, rowLink: true }) + '<div class="quote-detail-panel" id="quote-detail-panel" hidden></div>';
    const panel = document.getElementById("quote-detail-panel");
    const openRow = (event) => {
      const row = event.target.closest(".quote-log-row");
      if (row) openReviserPanel(row.dataset.quoteId, panel);
    };
    const tableBody = pageBody.querySelector("tbody");
    tableBody.addEventListener("click", openRow);
    tableBody.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest(".quote-log-row")) { event.preventDefault(); openRow(event); }
    });
    return;
  }

  if (page.href === "/rep/my-requests") {
    const rows = quotes.map((quote) => {
      const sendButton = quote.status === "Approved"
        ? `<button class="analyze-button send-to-customer-button" data-quote-id="${escapeHtml(quote.databaseId)}" type="button"><span>Send to customer</span></button>`
        : "";
      return `<tr>
        <td><strong class="quote-id">${escapeHtml(quote.id)}</strong><small class="table-secondary">Updated ${escapeHtml(quote.updated)}</small></td>
        <td>${escapeHtml(quote.supplier || "New request")}</td>
        <td>${quote.priority === "ASAP" ? '<span class="status-pill status-pill--error">ASAP</span>' : "Standard"}</td>
        <td>${statusPill(quote.status)}</td>
        <td>${sendButton}</td>
      </tr>`;
    }).join("");
    pageBody.innerHTML = `<section class="items-section" aria-label="My requests">
      <div class="items-heading"><div><h2>My requests</h2><p class="section-description">${quotes.length} ${quotes.length === 1 ? "request" : "requests"}</p></div><span class="item-count">LIVE DATA</span></div>
      <div class="table-scroll"><table><caption class="visually-hidden">My quote requests</caption>
        <thead><tr><th scope="col">Quote</th><th scope="col">Company</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Action</span></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">No requests yet. Submit a new quote request to get started.</td></tr>'}</tbody>
      </table></div>
      <div class="quote-detail-panel" id="quote-detail-panel" hidden></div>
    </section>`;
    const panel = document.getElementById("quote-detail-panel");
    pageBody.querySelectorAll(".send-to-customer-button").forEach((button) => {
      button.addEventListener("click", () => openSendToCustomerPanel(button.dataset.quoteId, panel, user));
    });
    return;
  }

  if (page.href === "/manager/reports") {
    pageBody.innerHTML = renderMetrics(quotes, reports) + renderWorkload(reports.workload || []);
  } else {
    pageBody.innerHTML = quoteTable(quotes, title, {
      quoters,
      allowAssignment: page.href === "/manager/assignments",
      statusOptions: ["/manager/approval-queue", "/reviser/approval-queue", "/quoter/my-quotes"].includes(page.href)
        ? (quote) => statusOptionsFor(page, quote, user)
        : null,
    });
  }
}

function renderNavigation(user, navigation, currentPath, branding) {
  const menu = document.querySelector("#sidebar-menu");
  menu.innerHTML = `<p class="sidebar-label">WORKSPACE</p>${navigation.filter((item) => !item.hidden).map((item) => `<a class="sidebar-link${item.href === currentPath ? " is-active" : ""}" href="${item.href}"${item.href === currentPath ? ' aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${iconMarkup[item.icon] || iconMarkup.list}</span><span>${escapeHtml(item.label)}</span></a>`).join("")}`;
  document.querySelector("#user-name").textContent = user.name;
  const roleElement = document.querySelector("#user-role");
  if (Array.isArray(user.roles) && user.roles.length > 1) {
    roleElement.innerHTML = `<label class="visually-hidden" for="role-switcher">Active role</label><select id="role-switcher" class="role-switcher">${user.roles.map((role) => `<option value="${escapeHtml(role)}"${role === user.role ? " selected" : ""}>${escapeHtml(role)}</option>`).join("")}</select>`;
    document.querySelector("#role-switcher").addEventListener("change", async (event) => {
      const response = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: event.target.value }),
      });
      const payload = await response.json();
      if (response.ok && payload.redirect) window.location.assign(payload.redirect);
    });
  } else {
    roleElement.textContent = user.role;
  }
  document.querySelector("#user-email").textContent = user.email;
  document.querySelector("#user-avatar").textContent = user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
    const settingsHref = navigation.find((item) => item.href.endsWith("/my-settings"))?.href || "#";
  document.querySelector("#user-avatar").href = settingsHref;
  document.querySelector("#user-name").href = settingsHref;
  document.querySelector("#breadcrumb").innerHTML = `Documents <span aria-hidden="true">/</span> ${escapeHtml(pageCopy[currentPath][0])}`;
  const companyLogo = document.querySelector("#brand-logo");
  const hasCompanyLogo = branding.logoPath && !branding.logoPath.includes("quoteflow-logo.svg");
  companyLogo.hidden = !hasCompanyLogo;
  if (hasCompanyLogo) companyLogo.src = branding.logoPath;
  companyLogo.alt = "";
  document.title = `${branding.companyName} | QuoteFlow`;
}

async function loadWorkspace() {
  try {
    const response = await fetch("/api/workspace", { headers: { Accept: "application/json" } });
    if (response.status === 401) {
      window.location.replace("/login");
      return;
    }
    if (!response.ok) throw new Error("Workspace could not be loaded.");

    const workspace = await response.json();
    const path = window.location.pathname;
    const page = workspace.navigation.find((item) => item.href === path);
    if (!page) {
      window.location.replace("/");
      return;
    }

    renderNavigation(workspace.user, workspace.navigation, path, workspace.branding);
    renderPageContent(page, workspace.quotes, workspace.user, workspace.reports, workspace.quoters, workspace.branding, workspace.reassignments);
    document.body.dataset.workspaceReady = "true";
    document.body.classList.remove("auth-loading");
    document.dispatchEvent(new Event("workspace:ready"));
    document.querySelector("#signout-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button");
      button.disabled = true;
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/login");
      } catch {
        button.disabled = false;
        button.setAttribute("aria-label", "Sign out failed. Try again.");
      }
    });
    if (path === "/manager/branding") bindBrandingForms(workspace.branding);
    for (const form of document.querySelectorAll(".quote-action-form")) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const actionForm = event.currentTarget;
        const button = actionForm.querySelector("button[type='submit']");
        const result = actionForm.querySelector(".action-result");
        button.disabled = true;
        result.textContent = "Saving...";
        const isAssignment = actionForm.dataset.action === "assign";
        try {
          const response = await fetch(`/api/quotes/${encodeURIComponent(actionForm.dataset.quoteId)}/${isAssignment ? "assign" : "status"}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(new FormData(actionForm))),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Update failed.");
          result.textContent = "Saved";
          window.location.reload();
        } catch (error) {
          result.textContent = error.message;
          button.disabled = false;
        }
      });
    }
  } catch {
    document.body.classList.remove("auth-loading");
    document.querySelector("#page-content").textContent = "Workspace could not be loaded. Refresh to try again.";
  }
}

function bindBrandingForms(branding) {
  const companyForm = document.querySelector("#company-form");
  const logoInput = document.querySelector("#company-logo-input");
  const preview = document.querySelector("#branding-logo-preview");
  const feedback = document.querySelector("#branding-feedback");
  let uploadedLogoPath = branding.logoPath;

  logoInput.addEventListener("change", () => {
    const [file] = logoInput.files;
    if (file) preview.src = URL.createObjectURL(file);
  });

  companyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = companyForm.querySelector("button[type='submit']");
    button.disabled = true;
    feedback.className = "branding-feedback";
    feedback.textContent = "Saving...";
    try {
      const companyName = companyForm.elements.companyName.value.trim();
      const response = await fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Branding could not be saved.");

      const [logo] = logoInput.files;
      if (logo) {
        const formData = new FormData();
        formData.append("logo", logo);
        const logoResponse = await fetch("/api/branding/logo", { method: "POST", body: formData });
        const logoResult = await logoResponse.json();
        if (!logoResponse.ok) throw new Error(logoResult.error || "Logo could not be saved.");
        uploadedLogoPath = logoResult.logoPath;
      }
      feedback.classList.add("is-success");
      feedback.textContent = "Branding saved.";
      const companyLogo = document.querySelector("#brand-logo");
      companyLogo.src = uploadedLogoPath;
      companyLogo.hidden = !uploadedLogoPath || uploadedLogoPath.includes("quoteflow-logo.svg");
      document.title = `${result.companyName} | QuoteFlow`;
      preview.src = uploadedLogoPath;
      logoInput.value = "";
    } catch (error) {
      feedback.classList.add("is-error");
      feedback.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

loadWorkspace();
