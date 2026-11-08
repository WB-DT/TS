// Read a document (OCR proof): upload a PDF or photo and see the item lines QuoteFlow finds.
// Nothing is saved: the server reads the file in memory and sends back what it found.

function initializeOcrPage() {
  const root = document.querySelector("#ocr-root");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const fileInput = document.querySelector("#ocr-file");
  const readButton = document.querySelector("#ocr-read");
  const status = document.querySelector("#ocr-status");
  const results = document.querySelector("#ocr-results");

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
  const money = (value) => (value === null || value === undefined ? "—" : `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`);

  function render(data) {
    const s = data.summary;
    const totalsText = s.statedTotal === null
      ? "The document's total wasn't found, so the lines couldn't be checked against it."
      : s.totalsMatch
        ? `The lines add up to ${money(s.linesTotal)}, matching the document's ${s.statedTotalLabel.toLowerCase()}.`
        : `The lines add up to ${money(s.linesTotal)}, but the document's ${s.statedTotalLabel.toLowerCase()} says ${money(s.statedTotal)}. A line may be missing or misread.`;
    const totalsClass = s.statedTotal === null ? "request-feedback" : s.totalsMatch ? "request-feedback is-success" : "request-feedback is-error";

    results.innerHTML = `
      <div class="ocr-cards">
        <div class="ocr-card"><strong>${escapeHtml(data.engine)}</strong><span>How it was read</span></div>
        <div class="ocr-card"><strong>${s.found}</strong><span>Item lines found</span></div>
        <div class="ocr-card"><strong>${s.needsReview}</strong><span>Need review</span></div>
        <div class="ocr-card"><strong>${data.seconds}s</strong><span>Time to read</span></div>
        ${data.confidence === null ? "" : `<div class="ocr-card"><strong>${Math.round(data.confidence)}%</strong><span>OCR confidence</span></div>`}
      </div>
      ${data.warnings.map((warning) => `<p class="request-feedback is-error">${escapeHtml(warning)}</p>`).join("")}
      ${s.found ? `<p class="${totalsClass}">${escapeHtml(totalsText)}</p>` : ""}
      ${s.found ? `
      <div class="table-scroll"><table class="ocr-table"><caption class="visually-hidden">Item lines found in ${escapeHtml(data.fileName)}</caption>
        <thead><tr><th scope="col">#</th><th scope="col">Item</th><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">UOM</th><th scope="col">Unit price</th><th scope="col">Line total</th><th scope="col">Status</th></tr></thead>
        <tbody>${data.items.map((item) => `
          <tr>
            <td>${item.line}</td>
            <td class="ocr-code">${escapeHtml(item.item)}</td>
            <td>${escapeHtml(item.description || "—")}</td>
            <td>${item.qty ?? "—"}</td>
            <td>${escapeHtml(item.uom || "—")}</td>
            <td>${money(item.unitPrice)}</td>
            <td>${money(item.extended)}</td>
            <td><span class="status-pill ${item.status === "Found" ? "status-pill--success" : "status-pill--review"}">${escapeHtml(item.status)}</span>
              ${item.notes.length ? `<div class="ocr-note">${escapeHtml(item.notes.join("; "))}</div>` : ""}</td>
          </tr>`).join("")}</tbody></table></div>` : ""}
      <details class="ocr-raw"><summary>Show everything that was read (${data.pages} page${data.pages === 1 ? "" : "s"})</summary><pre>${escapeHtml(data.text || "(no text)")}</pre></details>`;
  }

  readButton.addEventListener("click", async () => {
    if (!fileInput.files.length) {
      status.className = "request-feedback is-error";
      status.textContent = "Choose a PDF or photo first.";
      return;
    }
    const file = fileInput.files[0];
    readButton.disabled = true;
    results.innerHTML = "";
    status.className = "request-feedback";
    status.textContent = /\.pdf$/i.test(file.name)
      ? "Reading the PDF…"
      : "Reading the photo… the first one can take up to a minute while the reader starts; after that, about 5–15 seconds.";
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/ocr/read", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The document couldn't be read.");
      status.className = "request-feedback is-success";
      status.textContent = `Read ${file.name}. Nothing was saved.`;
      render(data);
    } catch (error) {
      status.className = "request-feedback is-error";
      status.textContent = error.message;
    } finally {
      readButton.disabled = false;
    }
  });
}

document.addEventListener("workspace:ready", initializeOcrPage);
if (document.body.dataset.workspaceReady === "true") initializeOcrPage();
