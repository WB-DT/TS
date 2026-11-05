// Locked prices page (Margin Manager): import CSV files and review the saved prices.

function initializeLockedPrices() {
  const root = document.querySelector("#locked-prices-root");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const fileInput = document.querySelector("#lp-file");
  const previewButton = document.querySelector("#lp-preview");
  const importButton = document.querySelector("#lp-import");
  const importStatus = document.querySelector("#lp-import-status");
  const previewArea = document.querySelector("#lp-preview-area");
  const filters = document.querySelector("#lp-filters");
  const totalsArea = document.querySelector("#lp-totals");
  const listArea = document.querySelector("#lp-list");
  let floor = 0.1;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }
  const dollars = (value) => (value === null || value === undefined || value === "" ? "—" : `$${Number(value).toFixed(2)}`);
  const pct = (value) => (value === null || value === undefined || value === "" ? "—" : `${(Number(value) * 100).toFixed(1)}%`);

  function setStatus(message, kind = "") {
    importStatus.className = `request-feedback${kind ? ` is-${kind}` : ""}`;
    importStatus.textContent = message;
  }

  async function sendFile(address) {
    const body = new FormData();
    body.append("file", fileInput.files[0]);
    const response = await fetch(address, { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The file could not be read.");
    return payload;
  }

  function renderPreview(payload) {
    const { summary, records, columnsMissing } = payload;
    const missing = columnsMissing.length
      ? `<p class="request-feedback">Not in this file (optional unless flagged below): ${escapeHtml(columnsMissing.join(", "))}.</p>`
      : "";
    const rows = records.map((record) => `
      <tr>
        <td>${record.line}</td>
        <td>${escapeHtml(record.accountNumber || "—")}</td>
        <td>${escapeHtml(record.itemNumber || "—")}</td>
        <td>${escapeHtml(record.uom || "—")}</td>
        <td>${dollars(record.sellPrice)}</td>
        <td>${pct(record.gpPercent)}</td>
        <td>${escapeHtml(record.lockedInDate || "—")}</td>
        <td>${record.status === "Ready" ? '<span class="status-pill status-pill--success">Ready</span>' : `<span class="status-pill status-pill--review">Needs attention</span><small class="lp-problem">${escapeHtml(record.problems.join("; "))}</small>`}</td>
      </tr>`).join("");
    previewArea.innerHTML = `
      <div class="lp-cards" role="group" aria-label="File summary">
        <div><strong>${summary.total}</strong><span>Rows in the file</span></div>
        <div><strong>${summary.ready}</strong><span>Ready to save</span></div>
        <div><strong>${summary.alreadySaved}</strong><span>Already saved</span></div>
        <div><strong>${summary.needsAttention}</strong><span>Need attention (skipped)</span></div>
      </div>
      ${missing}
      ${rows ? `<div class="table-scroll"><table><caption class="visually-hidden">Rows in the file</caption>
        <thead><tr><th scope="col">Line</th><th scope="col">Account</th><th scope="col">Item</th><th scope="col">UOM</th><th scope="col">Sell price</th><th scope="col">GP %</th><th scope="col">Locked-in date</th><th scope="col">Status</th></tr></thead>
        <tbody>${rows}</tbody></table></div>` : ""}`;
    importButton.hidden = summary.ready === 0;
    importButton.textContent = `Save ${summary.ready} price${summary.ready === 1 ? "" : "s"}`;
  }

  async function loadList() {
    const params = new URLSearchParams();
    if (filters.elements.search.value.trim()) params.set("search", filters.elements.search.value.trim());
    if (filters.elements.from.value) params.set("from", filters.elements.from.value);
    if (filters.elements.to.value) params.set("to", filters.elements.to.value);
    if (filters.elements.belowFloor.checked) params.set("belowFloor", "true");
    listArea.innerHTML = '<p class="section-description">Loading…</p>';
    try {
      const response = await fetch(`/api/locked-prices?${params}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Prices could not be loaded.");
      floor = payload.floor;
      totalsArea.innerHTML = `
        <div><strong>${payload.totals.prices}</strong><span>Locked-in prices</span></div>
        <div><strong>${payload.totals.accounts}</strong><span>Accounts</span></div>
        <div><strong>${payload.totals.belowFloor}</strong><span>Below ${pct(floor)} GP</span></div>`;
      if (!payload.rows.length) {
        listArea.innerHTML = '<p class="empty-items">No locked-in prices match. Import a CSV file above to get started.</p>';
        return;
      }
      const shown = payload.totals.matching > payload.rows.length
        ? `<p class="section-description">Showing the newest ${payload.rows.length} of ${payload.totals.matching}. Use the filters to narrow it down.</p>`
        : "";
      listArea.innerHTML = `${shown}<div class="table-scroll"><table><caption class="visually-hidden">Locked-in prices</caption>
        <thead><tr><th scope="col">Locked-in date</th><th scope="col">Account</th><th scope="col">Company</th><th scope="col">PPL</th><th scope="col">Item</th><th scope="col">Description</th><th scope="col">UOM</th><th scope="col">Sell price</th><th scope="col">Cost</th><th scope="col">GP %</th><th scope="col">Q-number</th><th scope="col">Approved by</th></tr></thead>
        <tbody>${payload.rows.map((row) => {
          const low = row.gp_percent !== null && Number(row.gp_percent) < floor;
          return `<tr>
            <td>${escapeHtml(row.locked_in_date)}</td>
            <td>${escapeHtml(row.account_number)}</td>
            <td>${escapeHtml(row.company_name || "—")}</td>
            <td>${escapeHtml(row.ppl || "—")}</td>
            <td>${escapeHtml(row.item_number)}</td>
            <td>${escapeHtml(row.item_description || "—")}</td>
            <td>${escapeHtml(row.uom)}</td>
            <td>${dollars(row.sell_price)}</td>
            <td>${dollars(row.cost)}</td>
            <td>${low ? `<span class="status-pill status-pill--review">${pct(row.gp_percent)} below floor</span>` : pct(row.gp_percent)}</td>
            <td>${escapeHtml(row.q_number || "—")}</td>
            <td>${escapeHtml(row.approved_by || "—")}</td>
          </tr>`;
        }).join("")}</tbody></table></div>`;
    } catch (error) {
      listArea.innerHTML = `<p class="request-feedback is-error">${escapeHtml(error.message)}</p>`;
    }
  }

  fileInput.addEventListener("change", () => {
    previewArea.innerHTML = "";
    importButton.hidden = true;
    setStatus(fileInput.files[0] ? `Selected: ${fileInput.files[0].name}` : "");
  });

  previewButton.addEventListener("click", async () => {
    if (!fileInput.files[0]) {
      setStatus("Choose a CSV file first.", "error");
      return;
    }
    previewButton.disabled = true;
    setStatus("Reading the file…");
    try {
      const payload = await sendFile("/api/locked-prices/preview");
      setStatus("Here's what the file holds. Nothing is saved until you click Save.", "success");
      renderPreview(payload);
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      previewButton.disabled = false;
    }
  });

  importButton.addEventListener("click", async () => {
    importButton.disabled = true;
    setStatus("Saving…");
    try {
      const payload = await sendFile("/api/locked-prices/import");
      setStatus(`Saved ${payload.saved} price${payload.saved === 1 ? "" : "s"}. Skipped ${payload.skipped} (already saved or needing attention).`, "success");
      previewArea.innerHTML = "";
      importButton.hidden = true;
      fileInput.value = "";
      loadList();
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      importButton.disabled = false;
    }
  });

  filters.addEventListener("submit", (event) => {
    event.preventDefault();
    loadList();
  });
  filters.elements.belowFloor.addEventListener("change", loadList);

  loadList();
}

document.addEventListener("workspace:ready", initializeLockedPrices);
if (document.body.dataset.workspaceReady === "true") initializeLockedPrices();
