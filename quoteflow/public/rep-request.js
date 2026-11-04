function initializeRepRequest() {
  const form = document.querySelector("#rep-request-form");
  if (!form || form.dataset.initialized === "true") return;
  form.dataset.initialized = "true";

  const accountInput = document.querySelector("#request-account-number");
  const companyInput = document.querySelector("#request-company-name");
  const requestType = document.querySelector("#request-type");
  const accountField = document.querySelector("#account-number-field");
  const pplSelect = document.querySelector("#request-ppl");
  const asapFields = document.querySelector("#asap-fields");
  const neededBy = document.querySelector("#needed-by");
  const asapReason = document.querySelector("#asap-reason");
  const asapItems = document.querySelector("#asap-items");
  const asapManager = document.querySelector("#asap-manager");
  const notes = document.querySelector("#request-notes");
  const review = document.querySelector("#request-review");
  const feedback = document.querySelector("#request-feedback");
  const reviewButton = document.querySelector("#review-request-button");
  const submitButton = document.querySelector("#submit-quote-request");
  const summary = document.querySelector("#request-summary");
  const fileInput = document.querySelector("#request-files");
  const fileDrop = document.querySelector("#request-file-drop");
  const fileLabel = document.querySelector("#request-file-label");
  const fileList = document.querySelector("#request-file-list");
  const pplFeedback = document.querySelector("#ppl-feedback");
  let options = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function installFieldHelp(definitions) {
    const byKey = new Map(definitions.map((definition) => [definition.key, definition]));
    for (const placeholder of document.querySelectorAll("[data-field-help]")) {
      const definition = byKey.get(placeholder.dataset.fieldHelp);
      if (!definition) continue;
      const id = `request-help-${definition.key}`;
      const label = escapeHtml(definition.label);
      const text = escapeHtml(definition.definition);
      placeholder.innerHTML = `<span class="field-help"><button class="info-button" type="button" aria-label="Definition of ${label}: ${text}" aria-describedby="${id}" aria-controls="${id}" aria-expanded="false"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.1" stroke="currentColor" stroke-width="1.4"/><path d="M10 9v4M10 6.4h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button><span class="field-tooltip" id="${id}" role="tooltip">${text}</span></span>`;
    }
  }

  function currentAccount() {
    const number = accountInput.value.trim().toUpperCase();
    return options?.accounts.find((account) => account.account_number === number) || null;
  }

  function updatePpls() {
    const selected = currentAccount();
    const currentValue = pplSelect.value;
    const ppls = selected?.ppls || [];
    pplSelect.innerHTML = `<option value="">Choose PPL</option>${ppls.map((ppl) => `<option value="${escapeHtml(ppl.id)}">${escapeHtml(ppl.name)}</option>`).join("")}`;
    if (ppls.some((ppl) => ppl.id === currentValue)) pplSelect.value = currentValue;
  }

  function updateRequestType() {
    const requiresAccount = ["Existing customer", "Win-back"].includes(requestType.value);
    accountField.hidden = !requiresAccount;
    accountInput.required = requiresAccount;
    if (!requiresAccount) {
      accountInput.value = "";
      updatePpls();
    }
  }

  function updatePriority() {
    const isAsap = form.querySelector("input[name='priority']:checked")?.value === "ASAP";
    asapFields.hidden = !isAsap;
    neededBy.required = isAsap;
    asapReason.required = isAsap;
    asapItems.required = isAsap;
    asapManager.required = isAsap;
    notes.required = isAsap && asapReason.value === "Other";
  }

  function updateFiles() {
    const files = [...fileInput.files];
    fileLabel.innerHTML = files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Drop files here or <span>browse</span>";
    fileList.innerHTML = files.map((file) => `<li>${escapeHtml(file.name)} <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span></li>`).join("");
  }

  function addSummaryRow(label, value) {
    if (!value) return "";
    return `<div class="request-summary-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
  }

  function buildSummary() {
    const formData = new FormData(form);
    const requestTypeValue = requestType.value;
    const selectedAccount = currentAccount();
    const priority = form.querySelector("input[name='priority']:checked")?.value || "Standard";
    const selectedPpl = options.accounts.flatMap((account) => account.ppls).find((ppl) => ppl.id === pplSelect.value);
    const selectedManager = options.salesManagers.find((manager) => manager.id === asapManager.value);
    const files = [...fileInput.files].map((file) => file.name).join(", ");
    const values = [
      addSummaryRow("Submitted by", `${document.querySelector("#requester-name").value} (${document.querySelector("#requester-email").value})`),
      addSummaryRow("Submitter role", formData.get("submitterRole")),
      addSummaryRow("Request type", requestTypeValue),
      addSummaryRow("Customer number", selectedAccount?.account_number || accountInput.value),
      addSummaryRow("Company name", companyInput.value),
      addSummaryRow("Customer needs", formData.get("customerNeeds")),
      addSummaryRow("Ship to", [formData.get("shipCity"), formData.get("shipState"), formData.get("shipZip")].filter(Boolean).join(", ")),
      addSummaryRow("PPL", selectedPpl?.name),
      addSummaryRow("Priority", priority),
      addSummaryRow("Needed by", priority === "ASAP" ? formData.get("neededBy") : `Standard · ${options.standardLeadTimeDays} day lead time`),
      addSummaryRow("ASAP reason", priority === "ASAP" ? formData.get("asapReason") : ""),
      addSummaryRow("ASAP items", priority === "ASAP" ? formData.get("asapItems") : ""),
      addSummaryRow("Approving sales manager", priority === "ASAP" ? selectedManager?.name : ""),
      addSummaryRow("Notes", formData.get("notes")),
      addSummaryRow("Files", files),
    ];
    summary.innerHTML = values.join("");
  }

  function showFormSections(show) {
    for (const section of form.querySelectorAll(".request-section, .request-actions")) section.hidden = !show;
    review.hidden = show;
  }

  form.addEventListener("click", (event) => {
    const infoButton = event.target.closest(".info-button");
    if (!infoButton) return;
    const willPin = infoButton.getAttribute("aria-expanded") !== "true";
    for (const button of form.querySelectorAll(".info-button[aria-expanded='true']")) {
      button.setAttribute("aria-expanded", "false");
      button.closest(".field-help").classList.remove("is-pinned");
    }
    infoButton.setAttribute("aria-expanded", String(willPin));
    infoButton.closest(".field-help").classList.toggle("is-pinned", willPin);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    for (const button of form.querySelectorAll(".info-button[aria-expanded='true']")) {
      button.setAttribute("aria-expanded", "false");
      button.closest(".field-help").classList.remove("is-pinned");
    }
  });

  requestType.addEventListener("change", updateRequestType);
  accountInput.addEventListener("input", () => {
    const account = currentAccount();
    if (account && !companyInput.value) companyInput.value = account.account_name;
    updatePpls();
  });
  form.querySelectorAll("input[name='priority']").forEach((input) => input.addEventListener("change", updatePriority));
  asapReason.addEventListener("change", updatePriority);
  fileInput.addEventListener("change", updateFiles);

  for (const eventName of ["dragenter", "dragover"]) {
    fileDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      fileDrop.classList.add("is-dragging");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    fileDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      fileDrop.classList.remove("is-dragging");
    });
  }
  fileDrop.addEventListener("drop", (event) => {
    const transfer = new DataTransfer();
    for (const file of event.dataTransfer.files) transfer.items.add(file);
    fileInput.files = transfer.files;
    updateFiles();
  });

  document.querySelector("#create-ppl-toggle").addEventListener("click", () => {
    const panel = document.querySelector("#create-ppl-panel");
    panel.hidden = !panel.hidden;
    if (!panel.hidden) document.querySelector("#new-ppl-name").focus();
  });
  document.querySelector("#create-ppl-save").addEventListener("click", async () => {
    const button = document.querySelector("#create-ppl-save");
    const name = document.querySelector("#new-ppl-name").value.trim();
    if (!accountInput.value.trim().match(/^C\d+$/i) || !name) {
      pplFeedback.textContent = "Enter a valid C account number and PPL name.";
      return;
    }
    button.disabled = true;
    try {
      const response = await fetch("/api/ppls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber: accountInput.value, accountName: companyInput.value, name }),
      });
      const ppl = await response.json();
      if (!response.ok) throw new Error(ppl.error || "PPL could not be created.");
      options.accounts = await (await fetch("/api/request-options")).json().then((payload) => payload.accounts);
      updatePpls();
      pplSelect.value = ppl.id;
      document.querySelector("#create-ppl-panel").hidden = true;
      document.querySelector("#new-ppl-name").value = "";
      pplFeedback.textContent = `${ppl.name} created and selected.`;
    } catch (error) {
      pplFeedback.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  reviewButton.addEventListener("click", () => {
    updateRequestType();
    updatePriority();
    if (!form.reportValidity()) return;
    if (!fileInput.files.length) {
      feedback.className = "request-feedback is-error";
      feedback.textContent = "Attach at least one supporting document.";
      feedback.focus();
      return;
    }
    buildSummary();
    showFormSections(false);
    review.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector("#edit-request-button").focus();
  });
  document.querySelector("#edit-request-button").addEventListener("click", () => {
    showFormSections(true);
    reviewButton.focus();
  });

  submitButton.addEventListener("click", async () => {
    if (!fileInput.files.length) {
      feedback.className = "request-feedback is-error";
      feedback.textContent = "Attach at least one supporting document.";
      showFormSections(true);
      feedback.focus();
      return;
    }
    const priority = form.querySelector("input[name='priority']:checked")?.value;
    const formData = new FormData(form);
    formData.set("priority", priority || "Standard");
    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Submitting...";
    feedback.textContent = "Saving your request.";
    try {
      const response = await fetch("/api/requests", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request could not be submitted.");
      review.innerHTML = `<div class="request-success"><span class="status-pill status-pill--success">Submitted</span><h2>Request ${escapeHtml(result.id)} received</h2><p>Your request is now in the quote queue.</p><a class="secondary-button" href="/rep/my-requests">View my requests</a></div>`;
      review.focus();
    } catch (error) {
      feedback.className = "request-feedback is-error";
      feedback.textContent = error.message;
      showFormSections(true);
      feedback.focus();
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector("span").textContent = "Submit request";
    }
  });

  loadRequestData();

  async function loadRequestData() {
    try {
      const [sessionResponse, optionsResponse] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/request-options"),
      ]);
      const session = await sessionResponse.json();
      const requestOptions = await optionsResponse.json();
      if (!sessionResponse.ok || !optionsResponse.ok) throw new Error("Request form data could not be loaded.");
      options = requestOptions;
      document.querySelector("#requester-name").value = session.user.name;
      document.querySelector("#requester-email").value = session.user.email;
      const lastRole = localStorage.getItem("quoteflow.submitterRole");
      if (lastRole) form.elements.submitterRole.value = lastRole;
      form.elements.submitterRole.addEventListener("change", () => localStorage.setItem("quoteflow.submitterRole", form.elements.submitterRole.value));
      document.querySelector("#standard-lead-time").textContent = `${options.standardLeadTimeDays} calendar day lead time`;
      document.querySelector("#account-options").innerHTML = options.accounts.map((account) => `<option value="${escapeHtml(account.account_number)}">${escapeHtml(account.account_name)}</option>`).join("");
      asapManager.innerHTML = `<option value="">Choose your manager</option>${options.salesManagers.map((manager) => `<option value="${escapeHtml(manager.id)}">${escapeHtml(manager.name)}</option>`).join("")}`;
      installFieldHelp(requestOptions.requestFields);
    } catch (error) {
      feedback.className = "request-feedback is-error";
      feedback.textContent = error.message;
    }
  }
}

document.addEventListener("workspace:ready", initializeRepRequest);
if (document.body.dataset.workspaceReady === "true") initializeRepRequest();
