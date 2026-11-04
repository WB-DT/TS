// Import from Teams page: upload the quote log and preview what QuoteFlow found.
// This step only previews. Nothing is saved until the next lesson adds "Create quotes".

function initializeTeamsImport() {
  const form = document.querySelector("#teams-import-form");
  if (!form || form.dataset.initialized === "true") return;
  form.dataset.initialized = "true";

  const fileInput = document.querySelector("#teams-import-file");
  const button = document.querySelector("#teams-import-preview");
  const status = document.querySelector("#teams-import-status");
  const results = document.querySelector("#teams-import-results");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function pill(request) {
    if (request.alreadyImported) return '<span class="status-pill">Already in QuoteFlow</span>';
    if (request.status !== "Ready") return '<span class="status-pill status-pill--review">Needs attention</span>';
    return '<span class="status-pill status-pill--success">New</span>';
  }

  function render(payload) {
    const { summary, requests, columnsMissing } = payload;
    const missing = columnsMissing.length
      ? `<p class="request-feedback is-error">These log columns were not found: ${escapeHtml(columnsMissing.join(", "))}.</p>`
      : "";
    const shownNote = summary.new + summary.needsAttention > requests.length
      ? `<p class="section-description">Showing the first ${requests.length} new or flagged rows.</p>`
      : "";
    const rows = requests.map((request) => `
      <tr>
        <td>${escapeHtml(request.responseId || "—")}</td>
        <td>${escapeHtml(request.companyName || "—")}</td>
        <td>${escapeHtml(request.accountNumber || (request.requestType === "Lead" ? "Lead" : "—"))}</td>
        <td>${escapeHtml(request.repName || "—")}</td>
        <td>${escapeHtml(request.requestType || "—")}</td>
        <td>${escapeHtml(request.priority)}</td>
        <td>${escapeHtml(request.submittedAt || "—")}</td>
        <td>${pill(request)}${request.problems.length ? `<small class="import-problem">${escapeHtml(request.problems.join("; "))}</small>` : ""}</td>
      </tr>`).join("");

    results.innerHTML = `
      <div class="import-summary" role="group" aria-label="Import summary">
        <div><strong>${summary.total}</strong><span>Rows in the log</span></div>
        <div><strong>${summary.new}</strong><span>New requests</span></div>
        <div><strong>${summary.alreadyImported}</strong><span>Already in QuoteFlow</span></div>
        <div><strong>${summary.needsAttention}</strong><span>Need attention</span></div>
      </div>
      ${missing}
      ${requests.length ? `${shownNote}<div class="table-scroll"><table>
        <caption class="visually-hidden">Requests found in the quote log</caption>
        <thead><tr><th scope="col">Form ID</th><th scope="col">Company</th><th scope="col">Account</th><th scope="col">Rep</th><th scope="col">Type</th><th scope="col">Priority</th><th scope="col">Submitted</th><th scope="col">Status</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`
        : '<p class="empty-items">Everything in this log is already in QuoteFlow.</p>'}`;
  }

  fileInput.addEventListener("change", () => {
    status.className = "request-feedback";
    status.textContent = fileInput.files[0] ? `Selected: ${fileInput.files[0].name}` : "";
    results.innerHTML = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!fileInput.files[0]) {
      status.className = "request-feedback is-error";
      status.textContent = "Choose the quote log Excel file first.";
      return;
    }
    button.disabled = true;
    status.className = "request-feedback";
    status.textContent = "Reading the log…";
    results.innerHTML = "";
    try {
      const body = new FormData();
      body.append("log", fileInput.files[0]);
      const response = await fetch("/api/teams-import/preview", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The log could not be read.");
      status.className = "request-feedback is-success";
      status.textContent = `Read ${payload.summary.total} rows from the "${payload.sheetName}" tab. Nothing has been saved.`;
      render(payload);
    } catch (error) {
      status.className = "request-feedback is-error";
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener("workspace:ready", initializeTeamsImport);
if (document.body.dataset.workspaceReady === "true") initializeTeamsImport();