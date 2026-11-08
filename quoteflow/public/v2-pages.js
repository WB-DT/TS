// Version 2 pages and pieces:
//   the bell (every page) · screening fields · Workload & assignments · My quotes ·
//   Completed quotes (exports, Confirm locked, email to the rep, follow-ups) · Settings sections

(function v2Pages() {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (v) => (v === null || v === undefined || v === "" ? "—" : `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const pct = (v) => (v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`);
  const day = (seconds) => (seconds ? new Date(Number(seconds) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  const dateText = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—");
  const json = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }
  const say = (el, text, tone = "") => { if (el) { el.className = `request-feedback ${tone}`; el.textContent = text; } };

  // ---------------------------------------------------------------- the bell

  async function bell() {
    const host = document.querySelector("#v2-topbar");
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";
    host.innerHTML = `<button type="button" class="v2-bell" id="v2-bell" aria-haspopup="true" aria-expanded="false" aria-label="Notifications">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3a4.5 4.5 0 0 0-4.5 4.5c0 3.2-1.5 4.8-1.5 4.8h12s-1.5-1.6-1.5-4.8A4.5 4.5 0 0 0 10 3ZM8.3 15.5a1.8 1.8 0 0 0 3.4 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="v2-bell-count" id="v2-bell-count" hidden></span></button>
      <div class="v2-bell-panel" id="v2-bell-panel" hidden></div>`;
    const button = host.querySelector("#v2-bell");
    const panel = host.querySelector("#v2-bell-panel");
    const count = host.querySelector("#v2-bell-count");
    let items = [];
    const where = (n) => ({
      approved: `/quoter/completed?id=${n.quote_id}`, followup: `/quoter/completed?id=${n.quote_id}`,
      assigned: `/quoter/quote-workspace?id=${n.quote_id}`, "sent-back": `/quoter/quote-workspace?id=${n.quote_id}`,
      revision: "/reviser/review-queue",
    })[n.kind] || null;
    async function load() {
      try {
        const data = await api("/api/v2/notifications");
        items = data.notifications || [];
        count.hidden = !data.unread;
        count.textContent = data.unread > 9 ? "9+" : String(data.unread);
        draw();
      } catch { /* signed out */ }
    }
    function draw() {
      panel.innerHTML = `<div class="v2-bell-head"><strong>Notifications</strong>${items.some((n) => !n.read) ? '<button type="button" class="qg-tool" id="v2-read-all">Mark all read</button>' : ""}</div>
        ${items.length ? items.slice(0, 15).map((n) => `<button type="button" class="v2-note${n.read ? "" : " is-unread"}" data-id="${esc(n.id)}" data-href="${esc(where(n) || "")}">
          <span>${esc(n.message)}</span><small>${esc(day(n.created_at))}</small></button>`).join("") : '<p class="qs-muted">Nothing yet.</p>'}`;
    }
    button.addEventListener("click", () => { panel.hidden = !panel.hidden; button.setAttribute("aria-expanded", String(!panel.hidden)); });
    document.addEventListener("click", (event) => { if (!host.contains(event.target)) { panel.hidden = true; button.setAttribute("aria-expanded", "false"); } });
    panel.addEventListener("click", async (event) => {
      if (event.target.closest("#v2-read-all")) { await fetch("/api/v2/notifications/read-all", { method: "POST" }); load(); return; }
      const note = event.target.closest(".v2-note");
      if (!note) return;
      await fetch(`/api/notifications/${encodeURIComponent(note.dataset.id)}/read`, { method: "POST" }).catch(() => {});
      if (note.dataset.href) window.location.assign(note.dataset.href); else load();
    });
    load();
    setInterval(load, 60000);
  }

  // ---------------------------------------------------------------- screening: template, specialty, rep department

  let options = null;
  const getOptions = async () => (options ||= await api("/api/v2/options"));

  window.v2FillScreening = async (panel, quoteId) => {
    const box = panel.querySelector("#v2-screen-setup");
    if (!box) return;
    try {
      const [opts, current] = await Promise.all([getOptions(), api(`/api/v2/quotes/${encodeURIComponent(quoteId)}/screening`)]);
      box.innerHTML = `<h4 class="screening-subhead">Quote setup</h4>
        <label class="v2-field">Template <span class="v2-req">required to approve</span>
          <select id="v2-template"><option value="">Choose the template…</option>${opts.templates.map((t) => `<option value="${esc(t.key)}"${t.key === current.templateKey ? " selected" : ""}>${esc(t.name)} · ${esc(t.when)}</option>`).join("")}</select></label>
        <label class="v2-field">Specialty <select id="v2-specialty"><option value="">None</option>${opts.specialties.map((s) => `<option${s === current.specialty ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
        <label class="v2-field">Rep's department <span class="qs-muted">(who to copy on the final email)</span>
          <select id="v2-department"><option value="">Choose…</option>${opts.departments.map((d) => `<option${d === current.repDepartment ? " selected" : ""}>${esc(d)}</option>`).join("")}</select></label>`;
    } catch (error) {
      box.innerHTML = `<p class="qs-muted">${esc(error.message)}</p>`;
    }
  };

  window.v2SaveScreening = async (quoteId, status) => {
    const template = document.querySelector("#v2-template");
    if (!template) return;
    if (status === "Ready to assign" && !template.value) { template.focus(); throw new Error("Pick the template before approving."); }
    await api(`/api/v2/quotes/${encodeURIComponent(quoteId)}/screening`, json("POST", {
      templateKey: template.value, specialty: document.querySelector("#v2-specialty").value, repDepartment: document.querySelector("#v2-department").value,
    }));
  };

  // ---------------------------------------------------------------- Workload & assignments

  async function workloadPage(root) {
    let data;
    let filter = "";
    async function load() {
      data = await api("/api/v2/workload");
      draw();
    }
    function draw() {
      const q = data.quoters;
      const unassigned = data.unassigned.filter((x) => !filter || x.specialty === filter);
      const total = (k) => q.reduce((sum, r) => sum + r[k], 0);
      const pick = (quote) => [...q].sort((a, b) => Number(b.tags.includes(quote.specialty)) - Number(a.tags.includes(quote.specialty)) || a.open - b.open);
      root.innerHTML = `
        <div class="xr-cards">
          <div class="xr-card${data.unassigned.length ? " is-warn" : ""}"><strong>${data.unassigned.length}</strong><span>Waiting to be assigned</span></div>
          <div class="xr-card"><strong>${total("open")}</strong><span>Open with quoters (${total("items")} items)</span></div>
          <div class="xr-card"><strong>${total("inRevision")}</strong><span>In revision or approval</span></div>
          <div class="xr-card${total("overdue") ? " is-warn" : ""}"><strong>${total("overdue")}</strong><span>Overdue</span></div>
          <div class="xr-card${data.attention.length ? " is-warn" : ""}"><strong>${data.attention.length}</strong><span>Need attention</span></div>
        </div>
        <section class="items-section">
          <div class="items-heading"><div><h2>Ready to assign</h2><p class="section-description">Screened quotes. Quoters with the quote's specialty are listed first (★), then whoever has the least open work.</p></div>
            <label class="v2-inline">Specialty <select id="v2-wl-filter"><option value="">All</option>${[...new Set(data.unassigned.map((x) => x.specialty).filter(Boolean))].map((s) => `<option${s === filter ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label></div>
          <div class="table-scroll"><table><thead><tr><th>Quote</th><th>Account</th><th>Items</th><th>Due</th><th>Template</th><th>Specialty</th><th>Assign to</th></tr></thead>
          <tbody>${unassigned.map((x) => `<tr>
            <td><strong class="quote-id">${esc(x.number)}</strong>${x.priority === "ASAP" ? ' <span class="status-pill status-pill--error">ASAP</span>' : ""}</td><td>${esc(x.account)}</td><td>${x.items || "—"}</td>
            <td>${dateText(x.neededBy)}</td><td>${esc(x.template || "Not picked")}</td><td>${esc(x.specialty || "—")}</td>
            <td><form class="v2-assign" data-id="${esc(x.id)}"><select name="quoterId" required aria-label="Assign ${esc(x.number)} to"><option value="">Choose…</option>${pick(x).map((p) => `<option value="${esc(p.id)}">${p.tags.includes(x.specialty) ? "★ " : ""}${esc(p.name)} · ${p.open} open</option>`).join("")}</select>
              <button class="table-action-button" type="submit">Assign</button><span class="action-result" role="status"></span></form></td></tr>`).join("") || '<tr><td colspan="7">Nothing waiting. 🎉</td></tr>'}</tbody></table></div>
        </section>
        <section class="items-section">
          <div class="items-heading"><div><h2>Team</h2><p class="section-description">Open = assigned and not yet submitted. Idle = no activity for ${data.inactivityDays}+ business days. Sent back and completed count the last 30 days and this week.</p></div></div>
          <div class="table-scroll"><table><thead><tr><th>Quoter</th><th>Open</th><th>Items</th><th>Due today</th><th>Overdue</th><th>Idle</th><th>In revision</th><th>Sent back</th><th>Completed this week</th></tr></thead>
          <tbody>${q.map((r) => `<tr class="${r.overdue || r.idle ? "v2-row-warn" : ""}">
            <td><strong>${esc(r.name)}</strong><small class="table-secondary">${esc(r.title)}${r.tags.length ? ` · ${esc(r.tags.join(", "))}` : ""}</small></td>
            <td>${r.open}</td><td>${r.items}</td><td>${r.dueToday}</td><td>${r.overdue ? `<b>${r.overdue}</b>` : 0}</td><td>${r.idle ? `<b>${r.idle}</b>` : 0}</td>
            <td>${r.inRevision}</td><td>${r.sentBack}${r.sendBackRate !== null ? ` <small class="table-secondary">${Math.round(r.sendBackRate * 100)}%</small>` : ""}</td><td>${r.completedThisWeek}</td></tr>`).join("")}</tbody></table></div>
        </section>
        <section class="items-section">
          <div class="items-heading"><div><h2>Needs attention</h2></div></div>
          ${data.attention.length ? `<ul class="v2-attention">${data.attention.map((a) => `<li><b>${esc(a.number || a.quoter)}</b>${a.account ? ` · ${esc(a.account)}` : ""}${a.assignedQuoterId ? ` · ${esc((q.find((r) => r.id === a.assignedQuoterId) || {}).name || "")}` : ""} — ${esc(a.reason)}</li>`).join("")}</ul>` : '<p class="section-description">Nothing needs attention.</p>'}
        </section>`;
    }
    root.addEventListener("change", (event) => { if (event.target.id === "v2-wl-filter") { filter = event.target.value; draw(); } });
    root.addEventListener("submit", async (event) => {
      const form = event.target.closest(".v2-assign");
      if (!form) return;
      event.preventDefault();
      const result = form.querySelector(".action-result");
      result.textContent = "Saving…";
      try {
        await api(`/api/quotes/${encodeURIComponent(form.dataset.id)}/assign`, json("POST", { quoterId: form.quoterId.value }));
        await load();
      } catch (error) { result.textContent = error.message; }
    });
    try { await load(); } catch (error) { root.innerHTML = `<p class="request-feedback is-error">${esc(error.message)}</p>`; }
  }

  // ---------------------------------------------------------------- My quotes

  async function myQuotesPage(root) {
    let quotes = [];
    let tab = new URLSearchParams(location.search).get("tab") || "progress";
    const TABS = [["progress", "In progress"], ["revision", "In revision"], ["completed", "Completed"]];
    function draw() {
      const list = quotes.filter((q) => q.tab === tab);
      root.innerHTML = `<div class="v2-tabs" role="tablist">${TABS.map(([k, label]) => `<button type="button" role="tab" aria-selected="${k === tab}" class="${k === tab ? "is-on" : ""}" data-tab="${k}">${label} <span>${quotes.filter((q) => q.tab === k).length}</span></button>`).join("")}</div>
        <section class="items-section"><div class="table-scroll"><table><thead><tr><th>Quote</th><th>Account</th><th>Template</th><th>Status</th><th>Due</th><th></th></tr></thead>
        <tbody>${list.map((q) => `<tr><td><strong class="quote-id">${esc(q.number)}</strong></td><td>${esc(q.account)}</td><td>${esc(q.template || "—")}</td>
          <td>${q.tab === "completed" ? `<span class="status-pill status-pill--success">Approved</span> <small class="table-secondary">${esc(q.next.label)}</small>` : esc(q.status)}</td>
          <td>${dateText(q.neededBy)}</td>
          <td>${q.tab === "completed" ? `<a class="table-action-button" href="/quoter/completed?id=${esc(q.id)}">Open</a>` : `<a class="table-action-button" href="/quoter/quote-workspace?id=${esc(q.id)}">${q.tab === "progress" ? "Work on it" : "View"}</a>`}</td></tr>`).join("")
          || `<tr><td colspan="6">${tab === "progress" ? "Nothing assigned to you right now." : tab === "revision" ? "Nothing waiting on a reviser." : "No approved quotes yet."}</td></tr>`}</tbody></table></div></section>`;
    }
    root.addEventListener("click", (event) => { const b = event.target.closest("[data-tab]"); if (b) { tab = b.dataset.tab; history.replaceState(null, "", `?tab=${tab}`); draw(); } });
    try { quotes = (await api("/api/v2/my-quotes")).quotes; draw(); } catch (error) { root.innerHTML = `<p class="request-feedback is-error">${esc(error.message)}</p>`; }
  }

  // ---------------------------------------------------------------- Completed quotes

  async function completedPage(root) {
    let list = null;
    let detail = null;
    let selected = new URLSearchParams(location.search).get("id");
    let draft = null; // the email text, editable before opening it

    async function loadList() { list = await api("/api/v2/completed"); }
    async function loadDetail() {
      detail = selected ? await api(`/api/v2/completed/${encodeURIComponent(selected)}`) : null;
      draft = detail ? { subject: detail.email.subject, body: detail.email.body } : null;
    }
    const STEP_ORDER = ["export", "lock", "email", "followup", "done"];
    const stepState = (step) => {
      const at = STEP_ORDER.indexOf(detail.step.step);
      const me = STEP_ORDER.indexOf(step);
      return me < at ? "is-done" : me === at ? "is-current" : "";
    };
    const mailto = (to, cc, subject, body) => `mailto:${to.map(encodeURIComponent).join(",")}?${cc.length ? `cc=${encodeURIComponent(cc.join(","))}&` : ""}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, "\r\n"))}`;

    function draw() {
      const listHtml = `<section class="items-section v2-completed-list">
        <div class="items-heading"><div><h2>Approved quotes</h2>${list.followupsDue ? `<p class="section-description"><b>${list.followupsDue} follow-up${list.followupsDue === 1 ? " is" : "s are"} due.</b></p>` : ""}</div></div>
        ${list.quotes.length ? list.quotes.map((q) => `<button type="button" class="v2-done-row${q.id === selected ? " is-on" : ""}" data-open="${esc(q.id)}">
          <strong>${esc(q.number)}</strong><span>${esc(q.account)}</span><small class="v2-step v2-step--${esc(q.next.step)}">${esc(q.next.label)}</small></button>`).join("") : '<p class="section-description">No approved quotes yet. When a quote is approved, you\'ll get a notification and it shows up here.</p>'}
      </section>`;
      if (!detail) { root.innerHTML = `<div class="v2-completed">${listHtml}<section class="items-section"><p class="section-description">Choose a quote.</p></section></div>`; return; }
      const d = detail;
      const has = (kind) => d.exports.includes(kind);
      const followups = d.followups.map((f) => `<div class="v2-followup">
          <p><b>${f.round === 1 ? "Follow-up" : "Reminder"}</b> · ${f.answer ? `answered: <b>${esc(f.answer)}</b>${f.orderNumbers ? ` · order ${esc(f.orderNumbers)}` : ""}${f.orderAmount ? ` · ${money(f.orderAmount)}` : ""} <small class="qs-muted">(${esc(f.answeredVia)})</small>`
            : `due ${day(f.dueAt)}${f.due ? ' <span class="status-pill status-pill--review">Due now</span>' : ""}${f.sentAt ? ` · sent ${day(f.sentAt)}` : ""}`}</p>
          ${f.answer ? "" : `<div class="v2-actions"><a class="secondary-button" href="${esc(f.mailto)}" data-sent="${esc(f.id)}">Open follow-up email</a>
            <button type="button" class="qg-tool" data-copy="${esc(f.link)}">Copy the rep's answer link</button></div>
          <form class="v2-answer" data-id="${esc(f.id)}"><span class="qs-muted">Or record the rep's answer yourself:</span>
            <select name="answer" required><option value="">Answer…</option><option>Ordered</option><option>Partly ordered</option><option>Not yet</option><option>No answer</option></select>
            <input name="orderNumbers" placeholder="Order number(s)" class="qs-in"/><input name="amount" placeholder="Amount (optional)" class="qs-in w-num"/>
            <button type="submit" class="table-action-button">Save</button></form>`}
        </div>`).join("");
      root.innerHTML = `<div class="v2-completed">${listHtml}
        <section class="items-section v2-completed-detail">
          <div class="items-heading"><div><h2>${esc(d.quote.number)} · ${esc(d.quote.account)}</h2>
            <p class="section-description">${esc(d.quote.template)} · rep ${esc(d.quote.repName || "unknown")}${d.quote.department ? ` (${esc(d.quote.department)})` : ""}${d.totals ? ` · ${money(d.totals.sell)} · margin ${pct(d.totals.margin)}` : ""}</p></div>
            <a class="secondary-button" href="/quoter/quote-workspace?id=${esc(d.quote.id)}" target="_blank" rel="noopener">Open the quote ↗</a></div>
          <p class="request-feedback" id="v2-done-msg" role="status"></p>
          <ol class="v2-steps">
            <li class="${stepState("export")}"><h3>1 · Export the two files</h3>
              <p class="section-description">The load form locks the prices on the account. The favorites list puts the items in the customer's favorites folder.</p>
              <div class="v2-actions"><button type="button" class="secondary-button" id="v2-lf">${has("load-form") ? "✓ " : ""}Load form…</button>
                <a class="secondary-button" href="/api/qs/${esc(d.quote.id)}/export/favorites" data-export="favorites">${has("favorites") ? "✓ " : ""}Favorites list</a>
                <a class="qg-tool" href="/api/qs/${esc(d.quote.id)}/export/customer">Customer file</a> <a class="qg-tool" href="/api/qs/${esc(d.quote.id)}/export/internal">Internal file</a></div></li>
            <li class="${stepState("lock")}"><h3>2 · Lock in, then confirm</h3>
              <p class="section-description">Load both files into the customer's account. When they're in, confirm here.</p>
              ${d.lockedAt ? `<p class="request-feedback is-success">Locked in ${day(d.lockedAt)}. ${d.emailAt ? "" : '<button type="button" class="qg-tool" id="v2-unlock">Undo</button>'}</p>`
                : `<button type="button" class="settings-save-button" id="v2-lock">Confirm locked</button>${has("load-form") && has("favorites") ? "" : ' <span class="qs-muted">Export both files first.</span>'}`}</li>
            <li class="${stepState("email")}"><h3>3 · Email the rep</h3>
              ${d.missing.length ? `<ul class="qs-issues">${d.missing.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
              <dl class="v2-mail"><dt>To</dt><dd>${esc(d.email.to.join(", ") || "—")}</dd>
                <dt>CC</dt><dd>${d.email.ccPeople.length ? d.email.ccPeople.map((p) => `<span class="v2-cc" title="${esc(p.why)}">${esc(p.name)} &lt;${esc(p.email)}&gt;</span>`).join(" ") : "—"}</dd></dl>
              <label class="v2-check"><input type="checkbox" id="v2-offer"${d.offer.on ? " checked" : ""}${d.emailAt ? " disabled" : ""}/> Include the offer: extra ${d.offer.percent}% off if they order within ${esc(d.offer.window)}</label>
              ${d.totals && d.totals.marginAfterOffer !== null ? `<p class="qs-muted">Margin ${pct(d.totals.margin)} now, ${pct(d.totals.marginAfterOffer)} if the customer uses the offer.</p>` : ""}
              <label class="v2-field">Subject<input class="qs-in" id="v2-subject" value="${esc(draft.subject)}"/></label>
              <label class="v2-field">Message<textarea class="qs-note" id="v2-body" rows="14">${esc(draft.body)}</textarea></label>
              <div class="v2-actions"><a class="secondary-button" href="/api/v2/completed/${esc(d.quote.id)}/print" target="_blank" rel="noopener">Customer quote PDF ↗</a>
                <button type="button" class="settings-save-button" id="v2-send"${d.lockedAt ? "" : " disabled"}>${d.emailAt ? "Open the email again" : "Open the email"}</button>
                <span class="qs-muted">${d.lockedAt ? "Opens in your mail program, filled in. Attach the PDF you saved, then send." : "Confirm the lock-in first."}</span></div>
              ${d.emailAt ? `<p class="request-feedback is-success">Email opened ${day(d.emailAt)}. The follow-up is planned.</p>` : ""}</li>
            <li class="${stepState("followup")}"><h3>4 · Did the customer order?</h3>
              ${followups || '<p class="section-description">The follow-up starts when the email to the rep goes out.</p>'}</li>
          </ol>
          <dialog class="qs-dialog" id="v2-lf-dialog"><form method="dialog" id="v2-lf-form">
            <h3 class="qs-h">Load form details</h3>
            <p class="section-description">Pack Ship, N/A and lines without a sell price are left out automatically. The CSV has no header row.</p>
            <label>Contract number (PPL)<input name="contractNumber" required/></label>
            <label>Description<input name="description" value="${esc([d.quote.accountNumber, d.quote.account].filter(Boolean).join(" - "))}"/></label>
            <div class="qs-two"><label>Start date<input name="startDate" type="date" required value="${new Date().toISOString().slice(0, 10)}"/></label><label>End date<input name="endDate" type="date" required/></label></div>
            <div class="qs-two"><label>Contract type<input name="contractType" required value="MASTER PPL"/></label><label>Classification<input name="classification" required value="M"/></label></div>
            <label>Contract owner<input name="contractOwner" value="Contract owner"/></label>
            <p class="request-feedback" id="v2-lf-status" role="status"></p>
            <div class="qs-actions"><button type="submit" class="settings-save-button">Create load form</button><button type="button" class="secondary-button" id="v2-lf-cancel">Cancel</button></div>
          </form></dialog>
        </section></div>`;
    }

    async function refresh(fn, text) {
      const msg = root.querySelector("#v2-done-msg");
      try {
        if (fn) detail = await fn();
        if (detail) draft = { subject: root.querySelector("#v2-subject")?.value ?? detail.email.subject, body: root.querySelector("#v2-body")?.value ?? detail.email.body };
        await loadList();
        draw();
        if (text) say(root.querySelector("#v2-done-msg"), text, "is-success");
      } catch (error) { say(msg, error.message, "is-error"); }
    }

    root.addEventListener("click", async (event) => {
      const t = event.target.closest("button, a");
      if (!t) return;
      if (t.dataset.open) {
        selected = t.dataset.open; history.replaceState(null, "", `?id=${selected}`);
        try { await loadDetail(); draw(); } catch (error) { say(root.querySelector("#v2-done-msg"), error.message, "is-error"); }
        return;
      }
      if (t.id === "v2-lf") { root.querySelector("#v2-lf-dialog").showModal(); return; }
      if (t.id === "v2-lf-cancel") { root.querySelector("#v2-lf-dialog").close(); return; }
      if (t.dataset.export) { setTimeout(() => refresh(() => api(`/api/v2/completed/${selected}`)), 1500); return; }
      if (t.id === "v2-lock") { refresh(() => api(`/api/v2/completed/${selected}/confirm-locked`, json("POST", {})), "Lock-in confirmed. Next: email the rep."); return; }
      if (t.id === "v2-unlock") { refresh(() => api(`/api/v2/completed/${selected}/confirm-locked`, json("POST", { undo: true }))); return; }
      if (t.id === "v2-send") {
        const subject = root.querySelector("#v2-subject").value;
        const body = root.querySelector("#v2-body").value;
        window.location.href = mailto(detail.email.to, detail.email.cc, subject, body);
        if (!detail.emailAt) refresh(() => api(`/api/v2/completed/${selected}/email-sent`, json("POST", {})), "Email opened. The follow-up is planned.");
        return;
      }
      if (t.dataset.sent) { fetch(`/api/v2/followups/${encodeURIComponent(t.dataset.sent)}/sent`, { method: "POST" }).catch(() => {}); return; }
      if (t.dataset.copy) {
        try { await navigator.clipboard.writeText(t.dataset.copy); t.textContent = "Copied"; } catch { window.prompt("Copy this link:", t.dataset.copy); }
      }
    });
    root.addEventListener("change", (event) => {
      if (event.target.id === "v2-offer") {
        refresh(async () => {
          const next = await api(`/api/v2/completed/${selected}/offer`, json("POST", { on: event.target.checked }));
          const body = root.querySelector("#v2-body");
          if (body) body.value = next.email.body;
          return next;
        });
      }
    });
    root.addEventListener("submit", async (event) => {
      if (event.target.id === "v2-lf-form") {
        event.preventDefault();
        const form = event.target;
        const status = form.querySelector("#v2-lf-status");
        try {
          const response = await fetch(`/api/qs/${selected}/export/load-form`, json("POST", Object.fromEntries(new FormData(form).entries())));
          if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "The load form couldn't be created."); }
          const blob = await response.blob();
          const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "Load Form.csv";
          const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
          document.body.append(link); link.click(); link.remove();
          form.closest("dialog").close();
          refresh(() => api(`/api/v2/completed/${selected}`), `Load form created: ${name}`);
        } catch (error) { say(status, error.message, "is-error"); }
        return;
      }
      const answer = event.target.closest(".v2-answer");
      if (answer) {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(answer).entries());
        refresh(() => api(`/api/v2/followups/${encodeURIComponent(answer.dataset.id)}/answer`, json("POST", body)), "Answer saved.");
      }
    });

    try { await loadList(); if (!selected && list.quotes.length) selected = list.quotes[0].id; await loadDetail(); draw(); }
    catch (error) { root.innerHTML = `<p class="request-feedback is-error">${esc(error.message)}</p>`; }
  }

  // ---------------------------------------------------------------- Settings: team, tags, contacts, email

  async function settingsSections() {
    const users = document.querySelector("#users-root");
    if (!users || document.querySelector("#v2-settings")) return;
    const host = document.createElement("div");
    host.id = "v2-settings";
    users.after(host);
    let data;
    async function load() { data = await api("/api/v2/people"); draw(); }
    function draw() {
      const s = data.settings;
      const boss = (u) => `<select name="reportsToId" aria-label="${esc(u.name)} reports to"><option value="">—</option>${data.team.filter((x) => x.id !== u.id).map((x) => `<option value="${esc(x.id)}"${x.id === u.reports_to_id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>`;
      host.innerHTML = `
        <section class="items-section" id="v2-team">
          <div class="items-heading"><div><h2>Team: job titles, reporting lines, specialties</h2>
            <p class="section-description">The job title decides what someone can see and do. Reporting lines decide who is copied on the final email. A new title takes effect the next time they sign in.</p></div></div>
          <div class="table-scroll"><table><thead><tr><th>Person</th><th>Job title</th><th>Reports to</th><th>Specialties</th><th></th></tr></thead>
          <tbody>${data.team.map((u) => `<tr data-user="${esc(u.id)}"><td><strong>${esc(u.name)}</strong><small class="table-secondary">${esc(u.email)}</small></td>
            <td><select name="title" aria-label="${esc(u.name)} job title">${data.titles.map((t) => `<option${t === u.job_title ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></td>
            <td>${boss(u)}</td>
            <td class="v2-tagpick">${data.tags.map((t) => `<label><input type="checkbox" value="${esc(t.id)}"${u.specialties.includes(t.id) ? " checked" : ""}/> ${esc(t.name)}</label>`).join("")}</td>
            <td><button type="button" class="table-action-button" data-save-user>Save</button><span class="action-result" role="status"></span></td></tr>`).join("")}</tbody></table></div>
        </section>
        <section class="items-section" id="v2-reps">
          <div class="items-heading"><div><h2>Reps' departments</h2><p class="section-description">Used to pick the rep's management for the CC. Can also be set on each quote at screening.</p></div></div>
          <div class="table-scroll"><table><thead><tr><th>Rep</th><th>Department</th><th></th></tr></thead>
          <tbody>${data.reps.map((u) => `<tr data-user="${esc(u.id)}"><td><strong>${esc(u.name)}</strong><small class="table-secondary">${esc(u.email)}</small></td>
            <td><select name="department"><option value="">—</option>${data.departments.map((d) => `<option${d === u.department ? " selected" : ""}>${esc(d)}</option>`).join("")}</select></td>
            <td><button type="button" class="table-action-button" data-save-rep>Save</button><span class="action-result" role="status"></span></td></tr>`).join("") || '<tr><td colspan="3">No reps yet.</td></tr>'}</tbody></table></div>
        </section>
        <section class="items-section" id="v2-contacts">
          <div class="items-heading"><div><h2>Reps' management contacts</h2><p class="section-description">The supervisors and managers for each rep department. They don't sign in; they're copied on the final email when CC is ticked.</p></div></div>
          <div class="table-scroll"><table><thead><tr><th>Department</th><th>Name</th><th>Title</th><th>Email</th><th>CC</th><th></th></tr></thead>
          <tbody id="v2-contact-rows">${data.contacts.map((c) => contactRow(c)).join("")}</tbody></table></div>
          <div class="qs-actions"><button type="button" class="secondary-button" id="v2-add-contact">Add a contact</button><button type="button" class="settings-save-button" id="v2-save-contacts">Save contacts</button><span class="action-result" id="v2-contacts-msg" role="status"></span></div>
        </section>
        <section class="items-section" id="v2-tags">
          <div class="items-heading"><div><h2>Specialty tags</h2><p class="section-description">What supervisors, managers and quoters specialize in. Screening tags each quote with one.</p></div></div>
          <div id="v2-tag-rows" class="v2-tag-rows">${data.tags.map((t) => `<span class="v2-tag-row" data-id="${esc(t.id)}"><input class="qs-in" value="${esc(t.name)}" aria-label="Tag name"/><button type="button" class="qs-x" data-drop-tag title="Remove">×</button></span>`).join("")}</div>
          <div class="qs-actions"><button type="button" class="secondary-button" id="v2-add-tag">Add a tag</button><button type="button" class="settings-save-button" id="v2-save-tags">Save tags</button><span class="action-result" id="v2-tags-msg" role="status"></span></div>
        </section>
        <section class="items-section" id="v2-email">
          <div class="items-heading"><div><h2>Templates, email and follow-ups</h2></div></div>
          <form id="v2-settings-form" class="v2-settings-grid">
            <label class="v2-field">Company name in template headers <input class="qs-in" name="template_company_name" value="${esc(s.template_company_name)}" placeholder="Shown where the templates say “… Item”"/></label>
            <label class="v2-field">Offer: extra percent off <input class="qs-in" name="offer_percent" value="${esc(s.offer_percent)}" inputmode="decimal"/></label>
            <label class="v2-field">Offer window <input class="qs-in" name="offer_window" value="${esc(s.offer_window)}"/></label>
            <label class="v2-check"><input type="checkbox" name="offer_enabled"${s.offer_enabled === "false" ? "" : " checked"}/> Include the offer by default</label>
            <label class="v2-field">First follow-up after (business days) <input class="qs-in" name="followup_business_days" value="${esc(s.followup_business_days)}" inputmode="numeric"/></label>
            <label class="v2-field">Reminder when the answer is “Not yet” (days) <input class="qs-in" name="reminder_days" value="${esc(s.reminder_days)}" inputmode="numeric"/></label>
            <label class="v2-field">Workload: flag no activity after (business days) <input class="qs-in" name="inactivity_business_days" value="${esc(s.inactivity_business_days)}" inputmode="numeric"/></label>
            <label class="v2-field">Email sign-off <input class="qs-in" name="email_signoff" value="${esc(s.email_signoff)}"/></label>
            <div class="qs-actions"><button type="submit" class="settings-save-button">Save settings</button><span class="action-result" id="v2-settings-msg" role="status"></span></div>
          </form>
        </section>`;
    }
    const contactRow = (c = {}) => `<tr class="v2-contact"><td><input class="qs-in" name="department" value="${esc(c.department || "")}" list="v2-departments" aria-label="Department"/></td>
      <td><input class="qs-in" name="name" value="${esc(c.name || "")}" aria-label="Name"/></td><td><input class="qs-in" name="title" value="${esc(c.title || "")}" aria-label="Title"/></td>
      <td><input class="qs-in" name="email" value="${esc(c.email || "")}" type="email" aria-label="Email"/></td><td><input type="checkbox" name="cc"${c.cc === false || c.cc === 0 ? "" : " checked"} aria-label="Copy on the final email"/></td>
      <td><button type="button" class="qs-x" data-drop-contact title="Remove">×</button></td></tr>`;

    host.addEventListener("click", async (event) => {
      const t = event.target.closest("button");
      if (!t) return;
      const row = t.closest("tr");
      const result = row && row.querySelector(".action-result");
      if (t.dataset.saveUser !== undefined) {
        result.textContent = "Saving…";
        try {
          const out = await api(`/api/v2/people/${row.dataset.user}`, json("PUT", {
            title: row.querySelector("[name=title]").value, reportsToId: row.querySelector("[name=reportsToId]").value,
            specialties: [...row.querySelectorAll(".v2-tagpick input:checked")].map((x) => x.value),
          }));
          result.textContent = "Saved"; result.title = out.note || "";
        } catch (error) { result.textContent = error.message; }
        return;
      }
      if (t.dataset.saveRep !== undefined) {
        result.textContent = "Saving…";
        try { await api(`/api/v2/people/${row.dataset.user}`, json("PUT", { department: row.querySelector("[name=department]").value })); result.textContent = "Saved"; } catch (error) { result.textContent = error.message; }
        return;
      }
      if (t.id === "v2-add-contact") { host.querySelector("#v2-contact-rows").insertAdjacentHTML("beforeend", contactRow({ cc: true })); return; }
      if (t.dataset.dropContact !== undefined) { row.remove(); return; }
      if (t.id === "v2-save-contacts") {
        const msg = host.querySelector("#v2-contacts-msg");
        const contacts = [...host.querySelectorAll(".v2-contact")].map((r) => ({ department: r.querySelector("[name=department]").value, name: r.querySelector("[name=name]").value,
          title: r.querySelector("[name=title]").value, email: r.querySelector("[name=email]").value, cc: r.querySelector("[name=cc]").checked }));
        try { await api("/api/v2/contacts", json("PUT", { contacts })); msg.textContent = "Saved"; await load(); } catch (error) { msg.textContent = error.message; }
        return;
      }
      if (t.id === "v2-add-tag") { host.querySelector("#v2-tag-rows").insertAdjacentHTML("beforeend", '<span class="v2-tag-row"><input class="qs-in" aria-label="Tag name"/><button type="button" class="qs-x" data-drop-tag title="Remove">×</button></span>'); return; }
      if (t.dataset.dropTag !== undefined) { t.closest(".v2-tag-row").remove(); return; }
      if (t.id === "v2-save-tags") {
        const msg = host.querySelector("#v2-tags-msg");
        const tags = [...host.querySelectorAll(".v2-tag-row")].map((r) => ({ id: r.dataset.id || null, name: r.querySelector("input").value }));
        try { await api("/api/v2/tags", json("PUT", { tags })); msg.textContent = "Saved"; options = null; await load(); } catch (error) { msg.textContent = error.message; }
      }
    });
    host.addEventListener("submit", async (event) => {
      if (event.target.id !== "v2-settings-form") return;
      event.preventDefault();
      const form = event.target;
      const body = Object.fromEntries(new FormData(form).entries());
      body.offer_enabled = form.offer_enabled.checked ? "true" : "false";
      const msg = host.querySelector("#v2-settings-msg");
      try { await api("/api/v2/settings", json("PUT", body)); msg.textContent = "Saved"; } catch (error) { msg.textContent = error.message; }
    });
    try { await load(); } catch (error) { host.innerHTML = `<p class="request-feedback is-error">${esc(error.message)}</p>`; }
    if (!document.querySelector("#v2-departments")) {
      document.body.insertAdjacentHTML("beforeend", `<datalist id="v2-departments">${(data ? data.departments : []).map((d) => `<option value="${esc(d)}">`).join("")}</datalist>`);
    }
  }

  // ---------------------------------------------------------------- start

  function start() {
    bell();
    const path = location.pathname;
    const root = document.querySelector("#v2-root");
    if (root && path === "/manager/assignments") workloadPage(root);
    if (root && path === "/quoter/my-quotes") myQuotesPage(root);
    if (root && path === "/quoter/completed") completedPage(root);
    if (path === "/manager/settings") {
      // users.js fills #users-root; add the version 2 sections under it.
      const wait = setInterval(() => { if (document.querySelector("#users-root")) { clearInterval(wait); settingsSections(); } }, 100);
      setTimeout(() => clearInterval(wait), 10000);
    }
  }
  document.addEventListener("workspace:ready", start);
  if (document.body.dataset.workspaceReady === "true") start();
})();
