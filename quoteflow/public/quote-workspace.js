function initializeQuoteWorkspace() {
  const root = document.querySelector("#quote-workspace-root");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const quoteSelect = document.querySelector("#qw-quote-select");
  const body = document.querySelector("#qw-body");
  const submissionFields = document.querySelector("#qw-submission-fields");
  const submissionMeta = document.querySelector("#qw-submission-meta");
  const quoteNumber = document.querySelector("#qw-quote-number");
  const fileList = document.querySelector("#qw-file-list");
  const manageButton = document.querySelector("#qw-manage-files");
  const manageMenu = document.querySelector("#qw-manage-menu");
  const filesMessage = document.querySelector("#qw-files-message");
  const runExtraction = document.querySelector("#qw-run-extraction");
  const extractMessage = document.querySelector("#qw-extract-message");
  const computeButton = document.querySelector("#qw-compute-pricing");
  const pricingMessage = document.querySelector("#qw-pricing-message");
  const linesSection = document.querySelector("#qw-lines-section");
  const linesHead = document.querySelector("#qw-lines-head");
  const linesBody = document.querySelector("#qw-lines-body");
  const linesCount = document.querySelector("#qw-lines-count");

  let currentQuote = null;
  let pricingSettings = null;
  let costingColumns = [];
  let attributeColumns = ["Product Category", "VendorName"];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function money(value) {
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(number) : "—";
  }

  function percent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${(number * 100).toFixed(1)}%` : "—";
  }

  function fileIcon(type) {
    if (type?.includes("pdf")) return "PDF";
    if (type?.includes("sheet") || type?.includes("excel")) return "XLS";
    if (type?.includes("word")) return "DOC";
    if (type?.includes("image")) return "IMG";
    return "FILE";
  }

  function detailField(label, value) {
    return value ? `<div class="detail-field"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>` : "";
  }

  function renderSubmission(quote) {
    quoteNumber.textContent = quote.quote_number;
    submissionMeta.textContent = `${quote.quoteType} · ${quote.status}`;
    submissionFields.innerHTML = [
      detailField("Account", quote.accountNumber ? `${quote.accountNumber} · ${quote.accountName || ""}` : quote.accountName),
      detailField("Company", quote.company_name),
      detailField("Rep", quote.submittedByName ? `${quote.submittedByName} (${quote.submittedByEmail})` : quote.submittedByEmail),
      detailField("Submitter role", quote.submitter_role),
      detailField("Request type", quote.request_type),
      detailField("Priority", quote.priority),
      detailField("Needed by", quote.needed_by),
      detailField("PPL", quote.pplName),
      detailField("Ship to", [quote.ship_city, quote.ship_state, quote.ship_zip].filter(Boolean).join(", ")),
      detailField("Customer needs", quote.customer_needs),
      detailField("Notes", quote.notes),
    ].join("");
  }

  const FILE_ACCEPT = "application/pdf,image/*,.xls,.xlsx,.doc,.docx";

  function setFilesMessage(text, tone = "is-error") {
    filesMessage.className = text ? `message ${tone}` : "message";
    filesMessage.textContent = text;
  }

  function showExtractMessage(text, { tone = "is-info", addFile = false } = {}) {
    extractMessage.className = text ? `message ${tone}` : "message";
    extractMessage.textContent = text;
    if (addFile) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button qw-add-file-from-message";
      button.textContent = "Add a file";
      extractMessage.append(" ", button);
    }
  }

  function renderFiles(quote) {
    const files = quote.files || [];
    fileList.innerHTML = files.map((file) => `
      <span class="file-chip">
        <a class="file-chip" href="/api/quotes/${encodeURIComponent(quote.id)}/files/${encodeURIComponent(file.id)}" target="_blank" rel="noopener" aria-label="Preview ${escapeHtml(file.fileName)}">
          <span class="file-chip-icon" aria-hidden="true">${fileIcon(file.fileType)}</span>
          <span class="file-chip-name">${escapeHtml(file.fileName)}</span>
        </a>
      </span>`).join("") || '<span class="section-description">No files attached.</span>';
    manageMenu.innerHTML = `
      <div class="qw-manage-row">
        <label class="secondary-button">Add file<input type="file" class="visually-hidden qw-add-input" accept="${FILE_ACCEPT}" /></label>
        ${files.length ? "" : '<span class="section-description">No files attached yet.</span>'}
      </div>
      ${files.map((file) => `
      <div class="qw-manage-row" data-file-id="${escapeHtml(file.id)}">
        <span class="file-chip-name">${escapeHtml(file.fileName)}</span>
        <label class="secondary-button">Replace<input type="file" class="visually-hidden qw-replace-input" accept="${FILE_ACCEPT}" /></label>
        <button class="table-action-button qw-remove-file" type="button">Remove</button>
      </div>`).join("")}`;
  }

  async function uploadQuoteFile(url, file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(url, { method: "POST", body: formData });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The file could not be uploaded.");
    return payload;
  }

  async function loadQuote(quoteId) {
    const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`);
    const quote = await response.json();
    if (!response.ok) throw new Error(quote.error || "Could not load quote.");
    currentQuote = quote;
    renderSubmission(quote);
    renderFiles(quote);
    setFilesMessage("");
    showExtractMessage("");
    body.hidden = false;
    document.querySelector("#qw-export-internal").href = `/api/quotes/${encodeURIComponent(quote.id)}/export/internal`;
    document.querySelector("#qw-export-customer").href = `/api/quotes/${encodeURIComponent(quote.id)}/export/customer`;
    await loadPricing();
  }

  async function loadPricing() {
    if (!currentQuote) return;
    const response = await fetch(`/api/quotes/${encodeURIComponent(currentQuote.id)}/pricing`);
    const payload = await response.json();
    if (!response.ok) return;
    pricingSettings = payload.settings;
    costingColumns = payload.costingColumns || [];
    for (const slot of root.querySelectorAll(".qw-report-slot")) {
      const type = slot.dataset.reportType;
      const report = payload.reports?.[type];
      slot.querySelector(".qw-report-status").textContent = report ? `${report.fileName} (${report.rowCount} rows)` : "Not uploaded";
    }
  }

  function renderPricingLines(lines) {
    const attributeHeads = attributeColumns.map((column, index) => `
      <th scope="col"><label class="visually-hidden" for="qw-attr-${index}">Attribute column ${index + 1}</label>
        <select id="qw-attr-${index}" class="qw-attr-select" data-attr-index="${index}">${costingColumns.map((option) => `<option${option === column ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>
      </th>`).join("");
    linesHead.innerHTML = `<tr>
      <th scope="col">Description</th><th scope="col">Item</th><th scope="col">UOM</th>
      <th scope="col">Account price</th><th scope="col">Cost</th><th scope="col">Cost source</th>
      <th scope="col">Current margin</th><th scope="col">Target margin</th><th scope="col">Price at target</th>
      <th scope="col">Deviation</th><th scope="col">CTLGE</th><th scope="col">Competitor</th>
      ${attributeHeads}
      <th scope="col">Final price</th><th scope="col">Live margin</th><th scope="col">Actions</th>
    </tr>`;
    linesBody.innerHTML = lines.map((line, index) => {
      const belowMin = pricingSettings && Number(line.finalPrice) > 0 && pricingSettings.minimumMargin !== null
        && ((Number(line.finalPrice) - Number(line.financialCost)) / Number(line.finalPrice)) < pricingSettings.minimumMargin;
      const competitorLower = Number(line.competitorPrice) > 0 && Number(line.priceAtTarget) > 0 && Number(line.competitorPrice) < Number(line.priceAtTarget);
      return `<tr class="${competitorLower ? "qw-competitor-lower" : ""}" data-line-id="${escapeHtml(line.lineItemId)}">
        <td>${escapeHtml(line.description || "")}</td>
        <td>${escapeHtml(line.itemNumber || "")}</td>
        <td>${escapeHtml(line.uom || "")}</td>
        <td>${money(line.accountPrice)}</td>
        <td>${money(line.financialCost)}</td>
        <td>${escapeHtml(line.costSource || "")}</td>
        <td>${percent(line.currentMargin)}</td>
        <td><input type="number" step="0.01" min="0" max="0.99" class="qw-target-margin" value="${line.targetMargin ?? ""}" aria-label="Target margin" /></td>
        <td>${money(line.priceAtTarget)}</td>
        <td>${escapeHtml(line.deviationNeeded || "")}</td>
        <td>${money(line.ctlgePrice)}</td>
        <td>${money(line.competitorPrice)}</td>
        ${attributeColumns.map((column) => `<td>${escapeHtml(line.costingRow?.[column] ?? "")}</td>`).join("")}
        <td><input type="number" step="0.01" min="0" class="qw-final-price" value="${line.finalPrice ?? line.priceAtTarget ?? ""}" aria-label="Final price" /></td>
        <td class="qw-live-margin">${percent(line.finalPrice ? (line.finalPrice - line.financialCost) / line.finalPrice : null)}</td>
        <td>
          <button class="table-action-button qw-save-line" type="button">Save</button>
          <button class="table-action-button qw-unavailable" type="button" aria-pressed="false">Unavailable</button>
          <button class="table-action-button qw-remove-line" type="button">Remove</button>
          <input type="text" class="qw-comment" placeholder="Comment" aria-label="Line comment" value="${escapeHtml(line.comment || "")}" />
          ${belowMin ? '<span class="status-pill status-pill--error">Below min margin</span>' : ""}
        </td>
      </tr>`;
    }).join("");
    linesCount.textContent = `${lines.length} lines`;
    linesSection.hidden = false;
  }

  async function computePricing() {
    if (!currentQuote) return;
    computeButton.disabled = true;
    pricingMessage.textContent = "Computing pricing…";
    try {
      const response = await fetch(`/api/quotes/${encodeURIComponent(currentQuote.id)}/pricing/compute`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Pricing could not be computed.");
      pricingSettings = payload.settings;
      renderPricingLines(payload.lines);
      pricingMessage.textContent = "Pricing computed.";
    } catch (error) {
      pricingMessage.textContent = error.message;
    } finally {
      computeButton.disabled = false;
    }
  }

  quoteSelect.addEventListener("change", () => {
    if (quoteSelect.value) loadQuote(quoteSelect.value).catch((error) => showExtractMessage(error.message, { tone: "is-error" }));
  });

  manageButton.addEventListener("click", () => {
    const open = manageMenu.hidden;
    manageMenu.hidden = !open;
    manageButton.setAttribute("aria-expanded", String(open));
  });

  manageMenu.addEventListener("change", async (event) => {
    if (!currentQuote || !event.target.files?.length) return;
    const addInput = event.target.closest(".qw-add-input");
    const replaceInput = event.target.closest(".qw-replace-input");
    if (!addInput && !replaceInput) return;
    const file = event.target.files[0];
    setFilesMessage(`Uploading "${file.name}"…`, "is-info");
    try {
      if (addInput) {
        await uploadQuoteFile(`/api/quotes/${encodeURIComponent(currentQuote.id)}/files`, file);
      } else {
        const row = replaceInput.closest(".qw-manage-row");
        await uploadQuoteFile(`/api/quotes/${encodeURIComponent(currentQuote.id)}/files/${encodeURIComponent(row.dataset.fileId)}/replace`, file);
      }
      await loadQuote(currentQuote.id);
      setFilesMessage(addInput ? `Added "${file.name}".` : `Replaced with "${file.name}".`, "is-success");
    } catch (error) {
      setFilesMessage(error.message);
    }
  });

  manageMenu.addEventListener("click", async (event) => {
    const button = event.target.closest(".qw-remove-file");
    if (!button || !currentQuote) return;
    const row = button.closest(".qw-manage-row");
    const fileName = row.querySelector(".file-chip-name")?.textContent || "file";
    button.disabled = true;
    try {
      const response = await fetch(`/api/quotes/${encodeURIComponent(currentQuote.id)}/files/${encodeURIComponent(row.dataset.fileId)}/remove`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The file could not be removed.");
      await loadQuote(currentQuote.id);
      setFilesMessage(`Removed "${fileName}".`, "is-success");
    } catch (error) {
      setFilesMessage(error.message);
      button.disabled = false;
    }
  });

  extractMessage.addEventListener("click", (event) => {
    if (!event.target.closest(".qw-add-file-from-message") || !currentQuote) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = FILE_ACCEPT;
    input.addEventListener("change", async () => {
      if (!input.files.length) return;
      const file = input.files[0];
      showExtractMessage(`Uploading "${file.name}"…`, { tone: "is-info" });
      try {
        await uploadQuoteFile(`/api/quotes/${encodeURIComponent(currentQuote.id)}/files`, file);
        await loadQuote(currentQuote.id);
        showExtractMessage(`Added "${file.name}". You can run extraction now.`, { tone: "is-success" });
      } catch (error) {
        showExtractMessage(error.message, { tone: "is-error", addFile: true });
      }
    });
    input.click();
  });

  runExtraction.addEventListener("click", async () => {
    if (!currentQuote) return;
    if (!currentQuote.files?.length) {
      showExtractMessage("This quote has no files attached.", { tone: "is-error", addFile: true });
      return;
    }
    runExtraction.disabled = true;
    runExtraction.querySelector("span").textContent = "Extracting…";
    showExtractMessage("Running OCR on the attached file.", { tone: "is-info" });
    try {
      const response = await fetch(`/api/quotes/${encodeURIComponent(currentQuote.id)}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: currentQuote.files[0].id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Extraction failed.");
      showExtractMessage(`Extraction complete: ${payload.lineItems?.length || 0} line items found.`, { tone: "is-success" });
    } catch (error) {
      showExtractMessage(error.message, { tone: "is-error", addFile: /no attached file/i.test(error.message) });
    } finally {
      runExtraction.disabled = false;
      runExtraction.querySelector("span").textContent = "Run extraction";
    }
  });

  for (const slot of root.querySelectorAll(".qw-report-slot input[type='file']")) {
    slot.addEventListener("change", async () => {
      if (!slot.files.length || !currentQuote) return;
      const type = slot.closest(".qw-report-slot").dataset.reportType;
      const formData = new FormData();
      formData.append("report", slot.files[0]);
      const status = slot.closest(".qw-report-slot").querySelector(".qw-report-status");
      status.textContent = "Uploading…";
      const response = await fetch(`/api/quotes/${encodeURIComponent(currentQuote.id)}/pricing-reports/${type}`, { method: "POST", body: formData });
      const payload = await response.json();
      status.textContent = response.ok ? `${payload.fileName} (${payload.rowCount} rows)` : payload.error;
    });
  }

  computeButton.addEventListener("click", computePricing);

  linesBody.addEventListener("change", (event) => {
    if (event.target.classList.contains("qw-attr-select")) {
      attributeColumns[Number(event.target.dataset.attrIndex)] = event.target.value;
      computePricing();
    }
  });

  linesBody.addEventListener("input", (event) => {
    if (event.target.classList.contains("qw-final-price")) {
      const row = event.target.closest("tr");
      const finalPrice = Number(event.target.value);
      const costText = row.children[4].textContent.replace(/[^\d.-]/g, "");
      const cost = Number(costText);
      const marginCell = row.querySelector(".qw-live-margin");
      marginCell.textContent = Number.isFinite(finalPrice) && finalPrice > 0 && Number.isFinite(cost) ? percent((finalPrice - cost) / finalPrice) : "—";
    }
  });

  linesBody.addEventListener("click", async (event) => {
    const row = event.target.closest("tr");
    if (!row || !currentQuote) return;
    const lineItemId = row.dataset.lineId;
    if (event.target.classList.contains("qw-save-line")) {
      const finalPrice = row.querySelector(".qw-final-price").value;
      const targetMargin = row.querySelector(".qw-target-margin").value;
      const comment = row.querySelector(".qw-comment").value;
      await fetch(`/api/quotes/${encodeURIComponent(currentQuote.id)}/line-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItemId, finalPrice, targetMargin, comment }),
      });
    }
    if (event.target.classList.contains("qw-unavailable")) {
      const pressed = event.target.getAttribute("aria-pressed") === "true";
      event.target.setAttribute("aria-pressed", String(!pressed));
      await fetch(`/api/quotes/${encodeURIComponent(currentQuote.id)}/line-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItemId, unavailable: !pressed }),
      });
    }
    if (event.target.classList.contains("qw-remove-line")) {
      row.remove();
    }
  });

  // Populate the quote selector from the workspace payload.
  const workspaceQuotes = window.__workspaceQuotes || [];
  quoteSelect.innerHTML = `<option value="">Choose a quote</option>${workspaceQuotes.map((quote) => `<option value="${escapeHtml(quote.databaseId)}">${escapeHtml(quote.id)} · ${escapeHtml(quote.companyName || quote.accountName || "")}</option>`).join("")}`;
}

document.addEventListener("workspace:ready", initializeQuoteWorkspace);
if (document.body.dataset.workspaceReady === "true") initializeQuoteWorkspace();
