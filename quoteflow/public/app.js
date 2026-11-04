function initializeOcrUpload() {
  const form = document.querySelector("#upload-form");
  if (!form || form.dataset.initialized === "true") return;
  form.dataset.initialized = "true";

  const input = document.querySelector("#document-input");
  const dropzone = document.querySelector("#dropzone");
  const fileLabel = document.querySelector("#file-label");
  const analyzeButton = document.querySelector("#analyze-button");
  const message = document.querySelector("#message");
  const results = document.querySelector("#results");
  const drawer = document.querySelector("#detail-drawer");
  const drawerBackdrop = document.querySelector("#drawer-backdrop");
  const drawerClose = document.querySelector("#drawer-close");
  const drawerTitle = document.querySelector("#drawer-title");
  const drawerValue = document.querySelector("#drawer-value");
  const drawerConfidence = document.querySelector("#drawer-confidence");
  let activeDetailTrigger = null;

const fieldLabels = [
  ["vendorName", "Vendor name"],
  ["invoiceDate", "Invoice date"],
  ["invoiceTotal", "Invoice total"],
];

function selectedFile() {
  return input.files?.[0] || null;
}

function updateSelectedFile() {
  const file = selectedFile();
  fileLabel.textContent = file ? file.name : "Drop a document or browse files";
  analyzeButton.disabled = !file;
  message.textContent = "";
  message.classList.remove("is-info");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function confidenceMarkup(confidence, extraClass = "") {
  if (confidence === null || confidence === undefined) return "";
  const percent = Math.round(confidence * 100);
  const low = confidence < 0.8;
  return `<span class="${extraClass || "confidence"}${low ? " low" : ""}">${percent}%</span>`;
}

function displayValue(field) {
  return field?.value === null || field?.value === undefined || field.value === ""
    ? "Not detected"
    : field.value;
}

function showFieldDetails(trigger) {
  if (activeDetailTrigger) activeDetailTrigger.classList.remove("is-selected");
  activeDetailTrigger = trigger;
  activeDetailTrigger.classList.add("is-selected");
  drawerTitle.textContent = trigger.dataset.detailLabel;
  drawerValue.textContent = trigger.dataset.detailValue;

  const confidence = Number(trigger.dataset.detailConfidence);
  const hasConfidence = trigger.dataset.detailConfidence !== "";
  drawerConfidence.className = "status-pill";
  if (!hasConfidence) {
    drawerConfidence.classList.add("status-pill--info");
    drawerConfidence.textContent = "Not available";
  } else {
    const needsReview = confidence < 0.8;
    drawerConfidence.classList.add(needsReview ? "status-pill--review" : "status-pill--success");
    if (needsReview) drawerConfidence.classList.add("low");
    drawerConfidence.textContent = `${Math.round(confidence * 100)}%`;
  }

  drawer.hidden = false;
  drawerBackdrop.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  drawerClose.focus();
}

function closeFieldDetails() {
  drawer.hidden = true;
  drawerBackdrop.hidden = true;
  drawer.setAttribute("aria-hidden", "true");
  if (activeDetailTrigger) {
    activeDetailTrigger.classList.remove("is-selected");
    activeDetailTrigger.focus();
    activeDetailTrigger = null;
  }
}

function renderResults(data) {
  const summary = document.querySelector("#summary-grid");
  summary.innerHTML = fieldLabels.map(([key, label]) => {
    const field = data[key];
    return `<button type="button" class="summary-field detail-trigger" data-detail-label="${label}" data-detail-value="${escapeHtml(displayValue(field))}" data-detail-confidence="${field?.confidence ?? ""}" aria-label="View ${label} details">
      <span class="field-label">${label}</span>
      <span class="field-value">${escapeHtml(displayValue(field))}</span>
      ${confidenceMarkup(field?.confidence)}
    </button>`;
  }).join("");

  const items = Array.isArray(data.items) ? data.items : [];
  document.querySelector("#item-count").textContent = `${items.length} ${items.length === 1 ? "ITEM" : "ITEMS"}`;
  document.querySelector("#empty-items").hidden = items.length > 0;
  document.querySelector(".table-scroll").hidden = items.length === 0;
  document.querySelector("#items-body").innerHTML = items.map((item, index) => {
    const values = [
      [item.description, "Description"],
      [item.quantity, "Quantity"],
      [item.unitPrice, "Unit price"],
      [item.amount, "Amount"],
    ];
    return `<tr>${values.map(([field, label]) => `<td>
      <button type="button" class="cell-trigger detail-trigger" data-detail-label="Item ${index + 1} - ${label}" data-detail-value="${escapeHtml(displayValue(field))}" data-detail-confidence="${field?.confidence ?? ""}" aria-label="View item ${index + 1} ${label} details">
        <span class="cell-value">${escapeHtml(displayValue(field))}</span>
        ${confidenceMarkup(field?.confidence, "cell-confidence")}
      </button>
    </td>`).join("")}</tr>`;
  }).join("");
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

input.addEventListener("change", updateSelectedFile);

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(".detail-trigger");
  if (trigger) showFieldDetails(trigger);
});

drawerClose.addEventListener("click", closeFieldDetails);
drawerBackdrop.addEventListener("click", closeFieldDetails);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !drawer.hidden) closeFieldDetails();
});

for (const eventName of ["dragenter", "dragover"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
  });
}

dropzone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  updateSelectedFile();
});

  form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = selectedFile();
  if (!file) return;

  const body = new FormData();
  body.append("document", file);
  analyzeButton.disabled = true;
  analyzeButton.querySelector("span").textContent = "Analyzing document...";
  message.textContent = "Processing securely. This may take a moment.";
  message.classList.add("is-info");
  results.hidden = true;

  try {
    const response = await fetch("/api/analyze", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed. Try again.");
    message.textContent = "";
    message.classList.remove("is-info");
    renderResults(data);
  } catch (error) {
    message.textContent = error.message;
    message.classList.remove("is-info");
  } finally {
    analyzeButton.querySelector("span").textContent = "Analyze document";
    analyzeButton.disabled = !selectedFile();
  }
  });
}

document.addEventListener("workspace:ready", initializeOcrUpload);
if (document.body.dataset.workspaceReady === "true") initializeOcrUpload();