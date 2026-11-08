// Cross-reference page (Margin Manager): upload four files one at a time and see the workbook's
// calculations for every line. Target margins are typed in here; nothing else is edited.

function initializeXref() {
  const root = document.querySelector("#xref-root");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const runList = document.querySelector("#xref-runs");
  const newForm = document.querySelector("#xref-new");
  const newStatus = document.querySelector("#xref-new-status");
  const detail = document.querySelector("#xref-detail");
  let current = null;      // the loaded run
  let showMore = false;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (value) => (value === null || value === undefined ? "—" : `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const pct = (value) => (value === null || value === undefined ? "—" : `${(value * 100).toFixed(1)}%`);
  const when = (seconds) => new Date(seconds * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const STEPS = [
    ["items", "Items to price", "Items, UMs and Qty columns, like the Usage or Consumption tab"],
    ["account", "Customer account pricing", "The Current Price Tool Items file for the account"],
    ["house", "House account pricing", "The House CPT file"],
    ["costing", "Costing report", "The Costing Tool Data file"],
  ];

  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  async function loadRuns() {
    try {
      const { runs } = await api("/api/xref/runs");
      runList.innerHTML = runs.length ? `
        <div class="table-scroll"><table><caption class="visually-hidden">Cross-reference runs</caption>
          <thead><tr><th scope="col">Run</th><th scope="col">Files</th><th scope="col">Created by</th><th scope="col">Last changed</th></tr></thead>
          <tbody>${runs.map((run) => `
            <tr class="xr-run${current && current.run.id === run.id ? " is-active" : ""}" tabindex="0" data-run="${escapeHtml(run.id)}">
              <td><strong>${escapeHtml(run.name)}</strong></td><td>${run.kinds.length} of 4</td>
              <td>${escapeHtml(run.created_by_name || "—")}</td><td>${when(run.updated_at)}</td></tr>`).join("")}</tbody></table></div>`
        : '<p class="empty-items">No runs yet. Start one above.</p>';
    } catch (error) {
      runList.innerHTML = `<p class="request-feedback is-error">${escapeHtml(error.message)}</p>`;
    }
  }

  async function openRun(id) {
    detail.hidden = false;
    detail.innerHTML = '<p class="request-feedback">Loading…</p>';
    try {
      current = await api(`/api/xref/runs/${encodeURIComponent(id)}`);
      history.replaceState(null, "", `?run=${encodeURIComponent(id)}`);
      renderDetail();
      loadRuns();
    } catch (error) {
      detail.innerHTML = `<p class="request-feedback is-error">${escapeHtml(error.message)}</p>`;
    }
  }

  function stepCard([kind, title, hint], number) {
    const file = current.files[kind];
    const lines = current.summary ? current.summary.lines : 0;
    const coverage = kind !== "items" && file && current.summary ? `Found for ${current.summary.found[kind]} of ${lines} lines` : "";
    return `
      <div class="xr-step${file ? " is-done" : ""}">
        <div class="xr-step-head"><span class="xr-num">${file ? "✓" : number}</span><div><strong>${title}</strong><span>${hint}</span></div></div>
        ${file ? `<p class="xr-file">${escapeHtml(file.fileName)} · ${file.rows.toLocaleString()} rows${coverage ? ` · ${coverage}` : ""}</p>` : ""}
        <div class="xr-upload">
          <label class="visually-hidden" for="xr-file-${kind}">${title} file</label>
          <input id="xr-file-${kind}" type="file" accept=".xlsx,.xls,.csv" />
          <button class="secondary-button" type="button" data-upload="${kind}">${file ? "Replace" : "Upload"}</button>
        </div>
        <p class="request-feedback" id="xr-status-${kind}" role="status" aria-live="polite"></p>
      </div>`;
  }

  function renderDetail() {
    const r = current;
    const s = r.summary;
    const costOptions = r.costingHeaders.length ? `
      <label class="xr-cost">Costing report column used for cost
        <select id="xr-cost-column">
          ${r.costingHeaders.map((header) => `<option value="${escapeHtml(header)}"${header === r.costColumn ? " selected" : ""}>${escapeHtml(header)}</option>`).join("")}
          <option value=""${r.costColumn === "" ? " selected" : ""}>Don't use the costing report (as the workbook does today)</option>
        </select></label>` : "";

    detail.innerHTML = `
      <div class="xr-head"><div><h2 class="section-title">${escapeHtml(r.run.name)}</h2>
        <p class="section-description">Started by ${escapeHtml(r.run.createdBy || "—")} · last changed ${when(r.run.updatedAt)}</p></div>
        ${s && s.lines ? `<a class="settings-save-button" href="/api/xref/runs/${encodeURIComponent(r.run.id)}/export">Export to Excel</a>` : ""}</div>
      <div class="xr-steps">${STEPS.map((step, i) => stepCard(step, i + 1)).join("")}</div>
      ${costOptions}
      ${s && s.lines ? `
        <div class="xr-cards">
          <div class="xr-card"><strong>${s.lines}</strong><span>Lines</span></div>
          <div class="xr-card"><strong>${money(s.extendedPrice)}</strong><span>Extended price</span></div>
          <div class="xr-card"><strong>${money(s.extendedCost)}</strong><span>Extended cost</span></div>
          <div class="xr-card"><strong>${pct(s.margin)}</strong><span>Current margin</span></div>
          <div class="xr-card${s.reviewNeeded ? " is-warn" : ""}"><strong>${s.reviewNeeded}</strong><span>Review needed</span></div>
          <div class="xr-card${s.missingPrice || s.missingCost ? " is-warn" : ""}"><strong>${s.missingPrice} / ${s.missingCost}</strong><span>Missing price / cost</span></div>
        </div>
        <div class="xr-tools"><label><input type="checkbox" id="xr-more"${showMore ? " checked" : ""} /> Show more columns</label>
          <span class="xr-hint">Type a target margin (for example 30) and press Enter to see the price at target.</span></div>
        <div class="table-scroll"><table class="xr-table"><caption class="visually-hidden">Cross-reference results</caption>
          <thead><tr><th scope="col">#</th><th scope="col">Item</th><th scope="col">UOM</th><th scope="col">Description</th><th scope="col">Qty</th>
            <th scope="col">Price</th><th scope="col">Ext. price</th><th scope="col">Financial cost</th><th scope="col">Ext. cost</th>
            <th scope="col">Current margin</th><th scope="col">Target margin</th><th scope="col">Price at target</th>
            <th scope="col">Pricing method</th><th scope="col">Status</th><th scope="col">Review</th>
            ${showMore ? '<th scope="col">Category</th><th scope="col">Sub F/Inactive</th><th scope="col">Sustainable</th><th scope="col">Has content</th><th scope="col">Catalog price</th>' : ""}</tr></thead>
          <tbody>${r.lines.map((l) => `
            <tr${l.reviewNeeded === "Yes" ? ' class="is-review"' : ""}>
              <td>${l.line}</td><td class="xr-code">${escapeHtml(l.item)}</td><td>${escapeHtml(l.uom)}</td><td>${escapeHtml(l.description || "—")}</td>
              <td>${l.qty ?? "—"}</td><td>${money(l.price)}</td><td>${money(l.extendedPrice)}</td>
              <td>${money(l.financialCost)}<div class="xr-src">${escapeHtml(l.costSource)}</div></td><td>${money(l.extendedCost)}</td>
              <td>${pct(l.currentMargin)}</td>
              <td><label class="visually-hidden" for="xr-t-${l.line}">Target margin for line ${l.line}</label>
                <input class="xr-target" id="xr-t-${l.line}" data-line="${l.line}" inputmode="decimal" placeholder="—" value="${l.targetMargin === null ? "" : +(l.targetMargin * 100).toFixed(2)}" /></td>
              <td>${money(l.priceAtTarget)}</td><td>${escapeHtml(l.pricingMethod || "—")}</td><td>${escapeHtml(l.status || "—")}</td>
              <td>${l.reviewNeeded === "Yes" ? '<span class="status-pill status-pill--review">Yes</span>' : ""}</td>
              ${showMore ? `<td>${escapeHtml(l.category || "—")}</td><td>${escapeHtml(l.substitute || "—")}</td><td>${escapeHtml(l.sustainable || "—")}</td><td>${escapeHtml(l.hasContent || "—")}</td><td>${money(l.catalogPrice)}</td>` : ""}
            </tr>`).join("")}</tbody></table></div>`
      : '<p class="empty-items">Upload the items to price (step 1) to see results. The other files can be added in any order, one at a time.</p>'}`;
  }

  async function saveTargets() {
    const targets = {};
    detail.querySelectorAll(".xr-target").forEach((input) => {
      const value = Number(String(input.value).replace("%", "").trim());
      if (input.value.trim() && Number.isFinite(value) && value > 0 && value < 100) targets[input.dataset.line] = value / 100;
    });
    current = await api(`/api/xref/runs/${encodeURIComponent(current.run.id)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets }),
    });
    const focused = document.activeElement?.dataset?.line;
    renderDetail();
    if (focused) detail.querySelector(`#xr-t-${Number(focused) + 1}`)?.focus();
  }

  detail.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-upload]");
    if (!button) return;
    const kind = button.dataset.upload;
    const input = detail.querySelector(`#xr-file-${kind}`);
    const status = detail.querySelector(`#xr-status-${kind}`);
    if (!input.files.length) {
      status.className = "request-feedback is-error";
      status.textContent = "Choose a file first.";
      return;
    }
    button.disabled = true;
    status.className = "request-feedback";
    status.textContent = "Uploading…";
    try {
      const body = new FormData();
      body.append("file", input.files[0]);
      current = await api(`/api/xref/runs/${encodeURIComponent(current.run.id)}/files/${kind}`, { method: "POST", body });
      renderDetail();
      loadRuns();
    } catch (error) {
      status.className = "request-feedback is-error";
      status.textContent = error.message;
      button.disabled = false;
    }
  });

  detail.addEventListener("change", async (event) => {
    if (event.target.id === "xr-more") {
      showMore = event.target.checked;
      renderDetail();
    } else if (event.target.id === "xr-cost-column") {
      current = await api(`/api/xref/runs/${encodeURIComponent(current.run.id)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ costColumn: event.target.value }),
      });
      renderDetail();
    } else if (event.target.classList.contains("xr-target")) {
      saveTargets().catch((error) => alertInline(error.message));
    }
  });

  detail.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.classList.contains("xr-target")) {
      event.preventDefault();
      event.target.blur();
    }
  });

  function alertInline(message) {
    const note = document.createElement("p");
    note.className = "request-feedback is-error";
    note.textContent = message;
    detail.prepend(note);
  }

  runList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-run]");
    if (row) openRun(row.dataset.run);
  });
  runList.addEventListener("keydown", (event) => {
    const row = event.target.closest("[data-run]");
    if (row && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openRun(row.dataset.run);
    }
  });

  newForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = newForm.elements.name.value.trim();
    newStatus.className = "request-feedback";
    newStatus.textContent = "";
    try {
      const { id } = await api("/api/xref/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      newForm.reset();
      openRun(id);
    } catch (error) {
      newStatus.className = "request-feedback is-error";
      newStatus.textContent = error.message;
    }
  });

  loadRuns();
  const fromUrl = new URLSearchParams(window.location.search).get("run");
  if (fromUrl) openRun(fromUrl);
}

document.addEventListener("workspace:ready", initializeXref);
if (document.body.dataset.workspaceReady === "true") initializeXref();
