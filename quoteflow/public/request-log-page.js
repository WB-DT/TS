// Request log page: the client's Quote Log and MDM Log, imported from their Dataverse export.

const REQUEST_LOG_LABELS = {
  createdon: "Created on", modifiedon: "Modified on", createdbyname: "Created by", modifiedbyname: "Modified by",
  owneridname: "Owner", owneridyominame: "Owner (display)", cr714_recordkey: "Record key",
  cr714_quotelogid: "Quote log ID", cr714_mdmlogid: "MDM log ID", cr714_quotenumber: "Q-number",
  cr714_oldquotenumber: "Old Q-number", cr714_companyname: "Company", cr714_customernumber: "Customer number",
  cr714_accountnumber: "Account number", cr714_customerorlead: "Customer or lead", cr714_requestpriority: "Priority",
  cr714_asapapprovingmanager: "ASAP approved by", cr714_asapnotes: "ASAP notes", cr714_requestnotes: "Request notes",
  cr714_submittername: "Submitted by", cr714_submitteremail: "Submitter email", cr714_submittingagentrole: "Submitter role",
  cr714_requestorname: "Requestor", cr714_requestsource: "Request from", cr714_branchwarehouse: "Branch / warehouse",
  cr714_starttime: "Form started", cr714_completiontime: "Form submitted", cr714_category: "Category",
  cr714_competitor: "Competitor", cr714_itemstoquote: "Items to quote", cr714_assignedto: "Assigned to",
  cr714_quoter: "Quoter", cr714_dateassigned: "Date assigned", cr714_datequalified: "Date qualified",
  cr714_qualifierquoternotes: "Qualifier / quoter notes", cr714_multiplier: "Multiplier",
  cr714_totalitemsquoted: "Items quoted", cr714_totalitemsquotedbid: "Items quoted / bid",
  cr714_wbsellpricetotal: "Sell price total", cr714_wbsellpricetotal_base: "Sell price total (base)",
  cr714_grossprofitpercent: "GP %", cr714_datereturnedorkilled: "Returned or killed",
  cr714_datesentbacktorepmdm: "Sent back to rep / MDM", cr714_sentforrevision: "Sent for revision",
  cr714_sentforrevisionname: "Sent for revision (label)", cr714_datesentforrevision: "Date sent for revision",
  cr714_daterevised: "Date revised", cr714_revisedby: "Revised by", cr714_numberofchanges: "Number of changes",
  cr714_revisionnotes: "Revision notes", cr714_ppl: "PPL", cr714_lockedindate: "Locked-in date",
  cr714_datelockedin: "Locked-in date", cr714_bidduedate: "Bid due date", cr714_mdmduedate: "MDM due date",
  cr714_quoterduedate: "Quoter due date", cr714_bidnotes: "Bid notes", cr714_completionnotes: "Completion notes",
  cr714_disposition: "Disposition", cr714_isquoteneeded: "Quote needed", cr714_isquoteneededname: "Quote needed (label)",
  cr714_fraudcheckcomplete: "Fraud check complete", cr714_fraudcheckcompletename: "Fraud check (label)",
  cr714_fraudnotes: "Fraud notes", cr714_itemsawarded: "Items awarded", cr714_amountawarded: "Amount awarded",
  cr714_amountawarded_base: "Amount awarded (base)", cr714_sentinsentout: "Sent in / sent out",
  cr714_attachment: "Attachment", cr714_attachmentcount: "Attachment count", cr714_hasattachment: "Has attachment",
  cr714_hasattachmentname: "Has attachment (label)", cr714_requestattachment: "Request attachment",
  cr714_requestattachmentcount: "Request attachment count", cr714_completedquoteattachment: "Completed quote attachment",
  cr714_completedquoteattachmentcount: "Completed quote attachment count", cr714_totalattachmentcount: "Total attachments",
  cr714_sourcefile: "Source file", cr714_sourcesheet: "Source sheet", cr714_sourceid: "Source ID",
  cr714_sourcemodifiedon: "Source modified on", qf_imported_at: "Imported into QuoteFlow", qf_row_hash: "Change check",
};

function initializeRequestLog() {
  const root = document.querySelector("#request-log-root");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const state = { log: "quote", stage: "", search: "", page: 0, dataverse: null };
  const tabs = root.querySelectorAll("[data-log-tab]");
  const fileInput = document.querySelector("#rl-file");
  const importButton = document.querySelector("#rl-import");
  const importStatus = document.querySelector("#rl-import-status");
  const syncButton = document.querySelector("#rl-sync");
  const exportButton = document.querySelector("#rl-export");
  const syncStatus = document.querySelector("#rl-sync-status");
  const syncMeta = document.querySelector("#rl-sync-meta");
  const cards = document.querySelector("#rl-cards");
  const searchForm = document.querySelector("#rl-search");
  const list = document.querySelector("#rl-list");
  const detail = document.querySelector("#rl-detail");

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
  const label = (column) => REQUEST_LOG_LABELS[column] || column;
  const day = (value) => (value ? String(value).slice(0, 10) : "—");
  const percent = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    if (!Number.isFinite(number)) return escapeHtml(value);
    return `${(Math.abs(number) <= 1 ? number * 100 : number).toFixed(1)}%`;
  };
  const stageClass = (stage) => ({ New: "status-pill--info", Qualified: "status-pill--review", Assigned: "status-pill--review" })[stage] || "status-pill--success";
  // A Dataverse read can come back with an expired token; msal-auth.js refreshes it once
  // and retries, so a long-lived tab keeps working without a full sign-in.
  const dataverseFetch = (url, options) => (window.QuoteFlowMsal?.fetchWithRefresh
    ? window.QuoteFlowMsal.fetchWithRefresh(url, options)
    : fetch(url, options));

  const columnsFor = {
    quote: [
      ["Created", (row) => day(row.createdon)],
      ["Q-number", (row) => escapeHtml(row.cr714_quotenumber || "—")],
      ["Company", (row) => escapeHtml(row.cr714_companyname || "—")],
      ["Customer #", (row) => escapeHtml(row.cr714_customernumber || "—")],
      ["Type", (row) => escapeHtml(row.cr714_customerorlead || "—")],
      ["Priority", (row) => escapeHtml(row.cr714_requestpriority || "—")],
      ["Submitted by", (row) => escapeHtml(row.cr714_submittername || "—")],
      ["Items", (row) => escapeHtml(row.cr714_itemstoquote || "—")],
      ["Assigned to", (row) => escapeHtml(row.cr714_assignedto || "—")],
      ["GP %", (row) => percent(row.cr714_grossprofitpercent)],
    ],
    mdm: [
      ["Created", (row) => day(row.createdon)],
      ["Account #", (row) => escapeHtml(row.cr714_accountnumber || "—")],
      ["Requestor", (row) => escapeHtml(row.cr714_requestorname || "—")],
      ["From", (row) => escapeHtml(row.cr714_requestsource || "—")],
      ["Branch", (row) => escapeHtml(row.cr714_branchwarehouse || "—")],
      ["Bid due", (row) => day(row.cr714_bidduedate)],
      ["Items", (row) => escapeHtml(row.cr714_itemstoquote || "—")],
      ["Quoter", (row) => escapeHtml(row.cr714_quoter || row.cr714_assignedto || "—")],
      ["Disposition", (row) => escapeHtml(row.cr714_disposition || "—")],
    ],
  };

  // Connection state for the sync bar: org url, entity set, last sync, who is signed in.
  async function loadDataverseStatus() {
    try {
      const response = await fetch("/api/dataverse/status", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Dataverse status is unavailable.");
      state.dataverse = await response.json();
    } catch {
      state.dataverse = { configured: false, signedIn: false };
    }
    renderDataverseStatus();
    return state.dataverse;
  }

  function renderDataverseStatus() {
    const dataverse = state.dataverse || {};
    if (!syncMeta) return;
    const synced = dataverse.lastSyncAt ? new Date(dataverse.lastSyncAt).toLocaleString() : "never";
    if (!dataverse.configured) {
      syncMeta.textContent = "Dataverse is not configured on this server. Import an .xlsx export below, or set DATAVERSE_URL, AZURE_CLIENT_ID and AZURE_TENANT_ID.";
      if (syncButton) syncButton.hidden = true;
      return;
    }
    if (syncButton) syncButton.hidden = !dataverse.signedIn;
    syncMeta.innerHTML = dataverse.signedIn
      ? `Reading <strong>${escapeHtml(dataverse.baseUrl)}</strong> as ${escapeHtml(dataverse.email || "your work account")} · last sync ${escapeHtml(synced)}`
      : `Signed in without Microsoft, so this shows the last sync or import (${escapeHtml(synced)}). Sign in with Microsoft to pull live data.`;
  }

  // Pull the Quote Log and MDM Log from Dataverse into their mirror tables.
  async function runSync({ quiet = false } = {}) {
    if (!state.dataverse?.signedIn || !syncButton) return false;
    syncButton.disabled = true;
    if (syncStatus) {
      syncStatus.className = "request-feedback";
      syncStatus.textContent = "Reading the Quote Log and MDM Log from Dataverse…";
    }
    try {
      const response = await dataverseFetch("/api/dataverse/sync", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The Dataverse sync did not finish.");
      if (syncStatus) {
        syncStatus.className = "request-feedback is-success";
        syncStatus.textContent = payload.summary
          .map((item) => `${item.log}: ${item.fetched} read, ${item.added} added, ${item.updated} updated, ${item.removed} removed`)
          .join(" · ");
      }
      await loadDataverseStatus();
      if (!quiet) await loadList();
      return true;
    } catch (error) {
      if (syncStatus) {
        syncStatus.className = "request-feedback is-error";
        syncStatus.textContent = error.message;
      }
      return false;
    } finally {
      syncButton.disabled = false;
    }
  }

  async function loadList() {
    detail.hidden = true;
    list.innerHTML = '<p class="section-description">Loading…</p>';
    const params = new URLSearchParams({ page: state.page });
    if (state.search) params.set("search", state.search);
    if (state.stage) params.set("stage", state.stage);
    try {
      const response = await fetch(`/api/request-log/${state.log}?${params}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The log could not be loaded.");
      cards.innerHTML = [
        `<button type="button" class="rl-card${state.stage === "" ? " is-active" : ""}" data-stage=""><strong>${payload.total}</strong><span>All rows</span></button>`,
        ...Object.entries(payload.stages).map(([name, count]) => `<button type="button" class="rl-card${state.stage === name ? " is-active" : ""}" data-stage="${escapeHtml(name)}"><strong>${count}</strong><span>${escapeHtml(name)}</span></button>`),
      ].join("");
      if (!payload.rows.length) {
        list.innerHTML = payload.total
          ? '<p class="empty-items">No rows match. Clear the search or pick another stage.</p>'
          : '<p class="empty-items">This log is empty. Use “Sync from Dataverse” above, or import an .xlsx export, to load it.</p>';
        return;
      }
      const idColumn = state.log === "quote" ? "cr714_quotelogid" : "cr714_mdmlogid";
      const columns = columnsFor[state.log];
      const first = payload.page * payload.pageSize + 1;
      const last = first + payload.rows.length - 1;
      list.innerHTML = `
        <div class="table-scroll"><table><caption class="visually-hidden">${escapeHtml(payload.log)}</caption>
          <thead><tr>${columns.map(([name]) => `<th scope="col">${name}</th>`).join("")}<th scope="col">Stage</th></tr></thead>
          <tbody>${payload.rows.map((row) => `
            <tr class="rl-row" tabindex="0" data-id="${escapeHtml(row[idColumn])}">
              ${columns.map(([, render]) => `<td>${render(row)}</td>`).join("")}
              <td><span class="status-pill ${stageClass(row.stage)}">${escapeHtml(row.stage)}</span></td>
            </tr>`).join("")}</tbody></table></div>
        <div class="rl-pager">
          <span>Showing ${first}–${last} of ${payload.matching}</span>
          <button class="secondary-button" type="button" data-page="prev"${payload.page === 0 ? " disabled" : ""}>Previous</button>
          <button class="secondary-button" type="button" data-page="next"${last >= payload.matching ? " disabled" : ""}>Next</button>
        </div>`;
    } catch (error) {
      list.innerHTML = `<p class="request-feedback is-error">${escapeHtml(error.message)}</p>`;
    }
  }

  async function openDetail(id) {
    detail.hidden = false;
    detail.innerHTML = '<p class="section-description">Loading…</p>';
    try {
      const response = await fetch(`/api/request-log/${state.log}/${encodeURIComponent(id)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "That row could not be loaded.");
      const row = payload.row;
      const title = state.log === "quote"
        ? `${row.cr714_quotenumber || "No Q-number yet"} · ${row.cr714_companyname || ""}`
        : `${row.cr714_accountnumber || "No account"} · ${row.cr714_requestorname || ""}`;
      // [Dataverse map] cr714_quotelog.cr714_assignedto + cr714_dateassigned: the
      // original SPA's "Save to Dataverse" assignment box, now on the detail panel.
      const canWrite = state.log === "quote" && Boolean(state.dataverse?.signedIn);
      const assignment = canWrite ? `
        <form class="rl-assign" id="rl-assign">
          <label for="rl-assignee">Assign in Dataverse (cr714_assignedto)
            <input id="rl-assignee" name="assignedTo" type="text" value="${escapeHtml(row.cr714_assignedto || "")}" placeholder="Quoter name or email" />
          </label>
          <button class="settings-save-button" type="submit">Save to Dataverse</button>
          <p class="request-feedback" id="rl-assign-status" role="status" aria-live="polite"></p>
        </form>` : "";
      detail.innerHTML = `
        <div class="rl-detail-head"><h2 class="section-title">${escapeHtml(title)}</h2><button class="secondary-button" type="button" id="rl-close">Close</button></div>
        ${assignment}
        <dl class="rl-fields">${Object.entries(row).filter(([column]) => column !== "qf_row_hash").map(([column, value]) => `
          <div><dt>${escapeHtml(label(column))}</dt><dd>${column === "qf_imported_at" && value ? escapeHtml(new Date(Number(value) * 1000).toLocaleString()) : escapeHtml(value ?? "—")}</dd></div>`).join("")}</dl>`;
      const assignmentForm = detail.querySelector("#rl-assign");
      if (assignmentForm) {
        assignmentForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const feedback = detail.querySelector("#rl-assign-status");
          const saveButton = assignmentForm.querySelector("button[type='submit']");
          saveButton.disabled = true;
          feedback.className = "request-feedback";
          feedback.textContent = "Saving to Dataverse…";
          try {
            const response = await dataverseFetch(`/api/dataverse/quote-log/${encodeURIComponent(id)}/assign`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ assignedTo: assignmentForm.elements.assignedTo.value.trim() }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "Dataverse refused the change.");
            feedback.className = "request-feedback is-success";
            feedback.textContent = payload.assignedTo ? `Assigned to ${payload.assignedTo}.` : "Assignment cleared.";
            loadList();
          } catch (error) {
            feedback.className = "request-feedback is-error";
            feedback.textContent = error.message;
          } finally {
            saveButton.disabled = false;
          }
        });
      }
      detail.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      detail.innerHTML = `<p class="request-feedback is-error">${escapeHtml(error.message)}</p>`;
    }
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      state.log = tab.dataset.logTab;
      state.stage = "";
      state.page = 0;
      for (const other of tabs) other.setAttribute("aria-selected", String(other === tab));
      loadList();
    });
  }
  cards.addEventListener("click", (event) => {
    const card = event.target.closest("[data-stage]");
    if (!card) return;
    state.stage = card.dataset.stage;
    state.page = 0;
    loadList();
  });
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.search = searchForm.elements.search.value.trim();
    state.page = 0;
    loadList();
  });
  list.addEventListener("click", (event) => {
    const pager = event.target.closest("[data-page]");
    if (pager) {
      state.page += pager.dataset.page === "next" ? 1 : -1;
      loadList();
      return;
    }
    const row = event.target.closest(".rl-row");
    if (row) openDetail(row.dataset.id);
  });
  list.addEventListener("keydown", (event) => {
    const row = event.target.closest(".rl-row");
    if (row && event.key === "Enter") openDetail(row.dataset.id);
  });
  detail.addEventListener("click", (event) => {
    if (event.target.id === "rl-close") detail.hidden = true;
  });
  syncButton?.addEventListener("click", () => runSync());
  exportButton?.addEventListener("click", () => {
    window.location.assign(`/api/dataverse/log/${encodeURIComponent(state.log)}/export`);
  });

  fileInput.addEventListener("change", () => {
    importStatus.className = "request-feedback";
    importStatus.textContent = fileInput.files[0] ? `Selected: ${fileInput.files[0].name}` : "";
  });
  importButton.addEventListener("click", async () => {
    if (!fileInput.files[0]) {
      importStatus.className = "request-feedback is-error";
      importStatus.textContent = "Choose the .xlsx export first.";
      return;
    }
    importButton.disabled = true;
    importStatus.className = "request-feedback";
    importStatus.textContent = "Importing… large logs can take a minute.";
    try {
      const body = new FormData();
      body.append("file", fileInput.files[0]);
      const response = await fetch("/api/request-log/import", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The import didn't work.");
      importStatus.className = "request-feedback is-success";
      importStatus.innerHTML = payload.summary.map((item) => `<strong>${escapeHtml(item.log)}</strong>: ${item.added} added, ${item.updated} updated, ${item.unchanged} unchanged${item.skipped ? `, ${item.skipped} skipped (no ID)` : ""}${item.missingColumns.length ? `. Not in this file: ${escapeHtml(item.missingColumns.join(", "))}` : ""}.`).join("<br>");
      fileInput.value = "";
      loadList();
    } catch (error) {
      importStatus.className = "request-feedback is-error";
      importStatus.textContent = error.message;
    } finally {
      importButton.disabled = false;
    }
  });

  // First visit with a Microsoft sign-in: pull once, then show the log.
  (async () => {
    const dataverse = await loadDataverseStatus();
    if (dataverse.signedIn && !dataverse.lastSyncAt) await runSync({ quiet: true });
    await loadList();
  })();
}

document.addEventListener("workspace:ready", initializeRequestLog);
if (document.body.dataset.workspaceReady === "true") initializeRequestLog();
