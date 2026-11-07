// Quote workspace, stage by stage. Each stage shows only what that step needs.
//   1 Extract & verify · 2 Match our items · 3 Pricing files · 4 Price · 5 Review & submit

function initializeQuoteStages() {
  const root = document.querySelector("#qs-root");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const STAGES = ["Extract & verify", "Match our items", "Pricing files", "Price", "Review & submit"];
  const TAG_CLASS = {
    "Combo pack": "t-combo", "Combo pack total": "t-combo-total", "Suggested alternative": "t-alt", "Item N/A": "t-na",
    Blind: "t-blind", "Couldn't quote section": "t-na", "Look at this": "t-look", "Current price on account": "t-current",
    "Base cost": "t-base", Deviation: "t-deviation", "Pack Ship": "t-pack", "Large opportunity": "t-large",
  };
  const TAG_HELP = {
    "Combo pack": "This line is one item of a combo pack.",
    "Combo pack total": "The last line of a combo pack, where its lines are added up.",
    "Suggested alternative": "A line we added below the customer's item to suggest a cheaper option.",
    "Item N/A": "We can't provide this item. With 3 or more, they move to 'Items we couldn't quote' on the customer file.",
    Blind: "We can't beat their price. The customer file shows our price with no comparison or savings.",
    "Couldn't quote section": "Move this line to 'Items we couldn't quote' on the customer file.",
    "Look at this": "Asks the reviser to take a closer look. Add a comment for them.",
    "Current price on account": "Internal: the price may be negative but it's already on the account. Never on the customer file.",
    "Base cost": "Internal: the cost shown is base cost.",
    Deviation: "From the cross-reference: a deviation cost may apply. Get the deviation price (manual for now).",
    "Pack Ship": "From the cross-reference: never on a load form; can go on a favorites list.",
    "Large opportunity": "Quantity 20 or more in JanSan or Food Service.",
  };

  const picker = root.querySelector("#qs-picker");
  const view = root.querySelector("#qs-view");
  let state = null;          // what the server sent
  let lines = [];            // the working copy being edited
  let selectedFileId = null;
  let showArchived = false;
  let busy = false;

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? "—" : `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const pct = (v) => (v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`);
  const val = (v) => (v === null || v === undefined ? "" : esc(v));
  const numIn = (v) => { const n = Number(String(v ?? "").replace(/[$,%\s]/g, "")); return String(v ?? "").trim() === "" || !Number.isFinite(n) ? null : n; };

  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }
  const json = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  function setState(next) {
    state = next;
    lines = next.lines.map((l) => ({ ...l }));
    if (!selectedFileId || !state.files.some((f) => f.id === selectedFileId)) selectedFileId = state.files.find((f) => !f.archivedAt)?.id || null;
    render();
  }

  function message(text, tone = "") {
    const box = view.querySelector("#qs-message");
    if (box) { box.className = `request-feedback ${tone}`; box.textContent = text; }
  }

  async function run(task, working) {
    if (busy) return;
    busy = true;
    if (working) message(working);
    try { await task(); } catch (error) { message(error.message, "is-error"); } finally { busy = false; }
  }

  const saveLines = () => api(`/api/qs/${state.quote.id}/lines`, json("PUT", { lines: lines.map(({ calc, margin, gp, priceAtTarget, priceAt25Margin, savings, autoTags, remembered, ...keep }) => keep) }));
  const goTo = async (stage) => setState(await api(`/api/qs/${state.quote.id}/state`, json("PUT", { stage })));

  // ---------------------------------------------------------------- page frame

  function render() {
    if (!state) return;
    const focused = document.activeElement?.dataset?.f ? `[data-f="${document.activeElement.dataset.f}"][data-i="${document.activeElement.dataset.i}"]` : null;
    const q = state.quote;
    view.innerHTML = `
      <div class="qs-header">
        <div><h1 class="qs-title">${esc(q.number)} · ${esc(q.accountName || "Account")} <span class="qs-muted">${esc(q.accountNumber || "")}</span></h1>
          <p class="section-description">${esc(q.type || "Quote")} · ${esc(q.status)}${q.ppl ? ` · PPL ${esc(q.ppl)}` : ""}${q.assignedTo ? ` · ${esc(q.assignedTo)}` : ""}</p></div>
      </div>
      <ol class="qs-stagebar" aria-label="Quote stages">
        ${STAGES.map((name, i) => {
          const n = i + 1;
          const cls = n < state.stage ? "is-done" : n === state.stage ? "is-current" : "";
          return `<li class="${cls}"><button type="button" data-stage="${n}" ${n > state.stage ? "disabled" : ""} aria-current="${n === state.stage ? "step" : "false"}"><span class="qs-num">${n < state.stage ? "✓" : n}</span><span>${name}</span></button></li>`;
        }).join("")}
      </ol>
      <p class="request-feedback" id="qs-message" role="status" aria-live="polite"></p>
      <div id="qs-stage"></div>`;
    const stageEl = view.querySelector("#qs-stage");
    [renderExtract, renderMatch, renderPricingFiles, renderPrice, renderSubmit][state.stage - 1](stageEl);
    if (focused) view.querySelector(focused)?.focus();
  }

  // ---------------------------------------------------------------- stage 1

  function renderExtract(el) {
    const files = state.files.filter((f) => showArchived || !f.archivedAt);
    const archivedCount = state.files.filter((f) => f.archivedAt).length;
    const selected = state.files.find((f) => f.id === selectedFileId);
    const canPreview = selected && /pdf|image/.test(selected.fileType || "");
    const unconfirmed = lines.filter((l) => !l.confirmed).length;
    el.innerHTML = `
      <div class="qs-split">
        <section class="qs-panel">
          <h3 class="qs-h">Files</h3>
          <ul class="qs-files">${files.map((f) => `
            <li class="${f.id === selectedFileId ? "is-selected" : ""}${f.archivedAt ? " is-archived" : ""}">
              <button type="button" class="qs-file-name" data-select="${f.id}">${esc(f.fileName)}${f.archivedAt ? " (archived)" : ""}</button>
              <span class="qs-file-actions">
                <a href="${f.url}" target="_blank" rel="noopener" title="Open in a new window">Open ↗</a>
                ${f.archivedAt ? `<button type="button" data-unarchive="${f.id}">Restore</button>`
                  : `<button type="button" data-extract="${f.id}">Read</button><button type="button" data-archive="${f.id}" title="Hide from this list. The file is kept and can still be opened.">Archive</button>`}
              </span></li>`).join("") || '<li class="qs-muted">No files yet.</li>'}</ul>
          ${archivedCount ? `<label class="qs-check"><input type="checkbox" id="qs-show-archived"${showArchived ? " checked" : ""}/> Show archived (${archivedCount})</label>` : ""}
          <div class="qs-add"><label class="visually-hidden" for="qs-add-file">Add a file</label><input id="qs-add-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.xlsx,.xls"/><button type="button" class="secondary-button" id="qs-add">Add file</button></div>
          ${canPreview ? `<iframe class="qs-preview" src="${selected.url}" title="Preview of ${esc(selected.fileName)}"></iframe>`
            : selected ? `<p class="qs-muted">No preview for this file type. Use Open ↗.</p>` : ""}
        </section>
        <section class="qs-panel">
          <div class="qs-row-head"><h3 class="qs-h">Lines · ${lines.length} found · ${lines.length - unconfirmed} confirmed</h3>
            <span><button type="button" class="secondary-button" id="qs-confirm-all">Confirm all</button> <button type="button" class="secondary-button" id="qs-add-line">Add line</button></span></div>
          <div class="table-scroll"><table class="qs-table"><thead><tr><th>✓</th><th>#</th><th>Their item</th><th>Description</th><th>Qty</th><th>UOM</th><th>Price</th><th>Line total</th><th></th></tr></thead>
          <tbody>${lines.map((l, i) => `
            <tr class="${l.confirmed ? "" : "is-unconfirmed"}" title="${esc(l.source_text || "Typed in")}">
              <td><input type="checkbox" data-f="confirmed" data-i="${i}" aria-label="Confirm line ${i + 1}"${l.confirmed ? " checked" : ""}/></td><td>${i + 1}</td>
              <td><input data-f="their_item" data-i="${i}" value="${val(l.their_item)}" class="qs-in w-item"/></td>
              <td><input data-f="description" data-i="${i}" value="${val(l.description)}" class="qs-in w-desc"/></td>
              <td><input data-f="qty" data-i="${i}" value="${val(l.qty)}" class="qs-in w-num"/></td>
              <td><input data-f="their_uom" data-i="${i}" value="${val(l.their_uom)}" class="qs-in w-uom"/></td>
              <td><input data-f="their_price" data-i="${i}" value="${val(l.their_price)}" class="qs-in w-num"/></td>
              <td><input data-f="their_extended" data-i="${i}" value="${val(l.their_extended)}" class="qs-in w-num"/></td>
              <td><button type="button" class="qs-x" data-remove="${i}" aria-label="Remove line ${i + 1}">×</button></td></tr>`).join("")}</tbody></table></div>
          ${lines.length ? "" : '<p class="qs-muted">Click <b>Read</b> on a file to pull its lines, or add lines by hand.</p>'}
          <div class="qs-actions"><button type="button" class="secondary-button" data-save>Save</button>
            <button type="button" class="settings-save-button" data-next ${lines.length && !unconfirmed ? "" : "disabled"}>Items verified · continue</button>
            ${unconfirmed ? `<span class="qs-muted">Confirm every line to continue.</span>` : ""}</div>
        </section>
      </div>`;
  }

  // ---------------------------------------------------------------- stage 2

  function renderMatch(el) {
    const rememberable = lines.filter((l) => !l.our_item && l.remembered).length;
    el.innerHTML = `
      <section class="qs-panel">
        <div class="qs-row-head"><h3 class="qs-h">Our comparable item for each line</h3>
          ${rememberable ? `<button type="button" class="secondary-button" id="qs-use-all">Use all remembered (${rememberable})</button>` : ""}</div>
        <div class="table-scroll"><table class="qs-table"><thead><tr><th>#</th><th>Their item</th><th>Description</th><th>Qty</th><th>UOM</th><th>Our item</th><th>Our UOM</th><th>Or mark as</th><th>Customer note</th></tr></thead>
        <tbody>${lines.map((l, i) => `
          <tr>
            <td>${i + 1}</td><td class="qs-code">${esc(l.their_item || "—")}</td><td>${esc(l.description || "")}</td><td>${val(l.qty) || "—"}</td><td>${esc(l.their_uom || "")}</td>
            <td><input data-f="our_item" data-i="${i}" value="${val(l.our_item)}" class="qs-in w-item"/>
              ${!l.our_item && l.remembered ? `<button type="button" class="qs-chip" data-remember="${i}" title="Last used by ${esc(l.remembered.lastUsedBy || "")}">Remembered: ${esc(l.remembered.ourItem)} ${esc(l.remembered.ourUom || "")} · used ${l.remembered.timesUsed}× · Use</button>` : ""}</td>
            <td><input data-f="our_uom" data-i="${i}" value="${val(l.our_uom)}" class="qs-in w-uom"/></td>
            <td><select data-f="line_status" data-i="${i}" class="qs-in"><option value="">—</option>${state.options.statuses.map((s) => `<option${l.line_status === s ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></td>
            <td><select data-f="customer_note" data-i="${i}" class="qs-in"><option value="">—</option>${state.options.notes.map((s) => `<option${l.customer_note === s ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></td>
          </tr>`).join("")}</tbody></table></div>
        <div class="qs-actions"><button type="button" class="secondary-button" data-save>Save</button><button type="button" class="settings-save-button" data-next>Matches done · continue</button>
          <span class="qs-muted">Matches you confirm are remembered for the next quote.</span></div>
      </section>`;
  }

  // ---------------------------------------------------------------- stage 3

  function renderPricingFiles(el) {
    const priced = lines.filter((l) => l.calc).length;
    const covered = (kind) => lines.filter((l) => l.calc?.found?.[kind]).length;
    const card = (kind, title, hint, n) => {
      const f = state.pricingFiles[kind];
      return `<div class="xr-step${f ? " is-done" : ""}"><div class="xr-step-head"><span class="xr-num">${f ? "✓" : n}</span><div><strong>${title}</strong><span>${hint}</span></div></div>
        ${f ? `<p class="xr-file">${esc(f.fileName)} · ${Number(f.rows).toLocaleString()} rows · found for ${covered(kind)} of ${priced} lines</p>` : ""}
        <div class="xr-upload"><label class="visually-hidden" for="qs-pf-${kind}">${title}</label><input id="qs-pf-${kind}" type="file" accept=".xlsx,.xls,.csv"/>
        <button type="button" class="secondary-button" data-pricing="${kind}">${f ? "Replace" : "Upload"}</button></div></div>`;
    };
    el.innerHTML = `
      <section class="qs-panel">
        <h3 class="qs-h">Upload the pricing files, one at a time</h3>
        <p class="section-description">${priced} lines have our item and will be priced.</p>
        <div class="xr-steps">${card("account", "Customer account pricing", "Current Price Tool Items", 1)}${card("house", "House account pricing", "House CPT", 2)}${card("costing", "Costing report", "Costing Tool Data", 3)}</div>
        ${state.costingHeaders.length ? `<label class="xr-cost">Costing report column used for cost <select id="qs-cost-column">
          ${state.costingHeaders.map((h) => `<option value="${esc(h)}"${h === state.costColumn ? " selected" : ""}>${esc(h)}</option>`).join("")}
          <option value=""${state.costColumn === "" ? " selected" : ""}>Don't use the costing report</option></select></label>` : ""}
        <div class="qs-actions"><button type="button" class="settings-save-button" data-next ${state.pricingFiles.account ? "" : "disabled"}>Continue to pricing</button>
          ${state.pricingFiles.account ? "" : '<span class="qs-muted">The customer account file is needed at least.</span>'}</div>
      </section>`;
  }

  // ---------------------------------------------------------------- stage 4

  function tagChips(l) {
    return [...(l.autoTags || []), ...(l.tags || [])].map((t) => `<span class="qs-tag ${TAG_CLASS[t] || ""}" title="${esc(TAG_HELP[t] || "")}">${esc(t)}</span>`).join("");
  }

  function renderPrice(el) {
    const s = state.summary;
    el.innerHTML = `
      <div class="xr-cards">
        <div class="xr-card"><strong>${money(s.sellTotal)}</strong><span>Sell total (priced lines)</span></div>
        <div class="xr-card"><strong>${money(s.costTotal)}</strong><span>Cost total</span></div>
        <div class="xr-card"><strong>${money(s.gp)}</strong><span>Gross profit</span></div>
        <div class="xr-card"><strong>${pct(s.margin)}</strong><span>Margin</span></div>
        <div class="xr-card"><strong>${money(s.savingsTotal)}</strong><span>Customer saves</span></div>
        <div class="xr-card${s.withSellPrice < s.priced ? " is-warn" : ""}"><strong>${s.withSellPrice} / ${s.priced}</strong><span>Lines with a sell price</span></div>
      </div>
      <section class="qs-panel">
        <div class="table-scroll"><table class="qs-table qs-price"><thead><tr><th>#</th><th>Our item</th><th>Description</th><th>Qty</th><th>Their price</th><th>Cost</th><th>Account price</th><th>Sell price</th><th>Margin</th><th>Target %</th><th>Price at target</th><th>Saves</th><th>Tags</th></tr></thead>
        <tbody>${lines.map((l, i) => {
          if (!l.calc) {
            const label = l.line_status || ((l.tags || []).includes("Item N/A") ? "Item N/A" : "No item matched");
            return `<tr class="is-muted"><td>${i + 1}</td><td class="qs-code">${esc(label)}</td><td colspan="10">${esc(l.description || "")}</td><td>${tagChips(l)}${tagMenu(l, i)}</td></tr>`;
          }
          const c = l.calc;
          const rowTags = [...(l.autoTags || []), ...(l.tags || [])];
          const rowClass = ["Item N/A", "Combo pack total", "Combo pack", "Suggested alternative", "Large opportunity"].find((t) => rowTags.includes(t));
          const costClass = rowTags.includes("Deviation") ? "t-deviation" : rowTags.includes("Current price on account") ? "t-current" : rowTags.includes("Base cost") ? "t-base" : "";
          return `<tr class="${rowClass ? TAG_CLASS[rowClass] : ""}${rowTags.includes("Look at this") ? " is-flagged" : ""}${l.margin !== null && l.margin < 0 ? " is-negative" : ""}">
            <td>${i + 1}</td><td class="qs-code ${rowTags.includes("Pack Ship") ? "t-pack" : ""}${rowTags.includes("Blind") ? " t-blind" : ""}">${esc(l.our_item)} <span class="qs-muted">${esc(l.our_uom)}</span></td>
            <td>${esc(c.ourDescription || l.description || "")}</td><td>${val(l.qty) || "—"}</td><td>${money(l.their_price)}</td>
            <td class="${costClass}">${money(c.cost)}<div class="xr-src">${esc(c.costSource)}</div></td><td>${money(c.accountPrice)}</td>
            <td><input data-f="sell_price" data-i="${i}" value="${val(l.sell_price)}" class="qs-in w-num" inputmode="decimal" placeholder="—"/>
              <div class="qs-quick">${c.accountPrice !== null ? `<button type="button" data-fill="account" data-i="${i}" title="Use the account's current price">Acct</button>` : ""}
              ${l.priceAtTarget !== null ? `<button type="button" data-fill="target" data-i="${i}" title="Use the price at target">Target</button>` : ""}
              ${l.priceAt25Margin !== null ? `<button type="button" data-fill="blind" data-i="${i}" title="Price at a 25% margin: cost ÷ 0.75. Used for blind items. A 25% markup (cost × 1.25) is only a 20% margin.">25% ⓘ</button>` : ""}</div></td>
            <td>${pct(l.margin)}</td>
            <td><input data-f="target_margin" data-i="${i}" value="${l.target_margin === null || l.target_margin === undefined ? "" : +(l.target_margin * 100).toFixed(2)}" class="qs-in w-pct" inputmode="decimal" placeholder="—"/></td>
            <td>${money(l.priceAtTarget)}</td><td>${l.tags?.includes("Blind") ? "hidden" : money(l.savings)}</td>
            <td>${tagChips(l)}${tagMenu(l, i)}${(l.tags || []).includes("Look at this") ? `<input data-f="comment" data-i="${i}" value="${val(l.comment)}" class="qs-in w-desc" placeholder="Comment for the reviser"/>` : ""}</td></tr>`;
        }).join("")}</tbody></table></div>
        <div class="qs-actions"><button type="button" class="settings-save-button" data-next>Pricing done · review</button><span class="qs-muted">Prices save as you go.</span></div>
      </section>`;
  }

  function tagMenu(l, i) {
    return `<details class="qs-tagmenu"><summary aria-label="Tags for line ${i + 1}">+ Tag</summary><div>${state.options.tags.map((t) => `
      <label title="${esc(TAG_HELP[t] || "")}"><input type="checkbox" data-tag="${esc(t)}" data-i="${i}"${(l.tags || []).includes(t) ? " checked" : ""}/> ${esc(t)}</label>`).join("")}</div></details>`;
  }

  // ---------------------------------------------------------------- stage 5

  function renderSubmit(el) {
    const s = state.summary;
    const missing = lines.filter((l) => l.calc && (l.sell_price === null || l.sell_price === "")).length;
    const issues = [
      missing && `${missing} priced line${missing === 1 ? " has" : "s have"} no sell price`,
      s.negative && `${s.negative} line${s.negative === 1 ? " is" : "s are"} below cost`,
      s.lookAt && `${s.lookAt} line${s.lookAt === 1 ? " is" : "s are"} flagged "Look at this"`,
      s.couldntQuoteSection && `${s.naCount} items N/A: they'll move to "Items we couldn't quote" on the customer file`,
    ].filter(Boolean);
    const canSubmit = ["Assigned", "Returned to quoter", "In progress"].includes(state.quote.status);
    el.innerHTML = `
      <div class="xr-cards">
        <div class="xr-card"><strong>${s.lines}</strong><span>Lines</span></div>
        <div class="xr-card"><strong>${money(s.sellTotal)}</strong><span>Sell total</span></div>
        <div class="xr-card"><strong>${money(s.gp)}</strong><span>Gross profit</span></div>
        <div class="xr-card"><strong>${pct(s.margin)}</strong><span>Margin</span></div>
        <div class="xr-card"><strong>${money(s.savingsTotal)}</strong><span>Customer saves</span></div>
      </div>
      <section class="qs-panel">
        <h3 class="qs-h">Before you submit</h3>
        ${issues.length ? `<ul class="qs-issues">${issues.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : '<p class="request-feedback is-success">Nothing flagged.</p>'}
        <h3 class="qs-h">Files</h3>
        <div class="qs-exports">
          <a class="secondary-button" href="/api/qs/${state.quote.id}/export/customer">Customer file</a>
          <a class="secondary-button" href="/api/qs/${state.quote.id}/export/internal">Internal file</a>
          <a class="secondary-button" href="/api/qs/${state.quote.id}/export/favorites">Favorites list</a>
          <button type="button" class="secondary-button" id="qs-load-form">Load form…</button>
        </div>
        <h3 class="qs-h">Note for the reviser</h3>
        <label class="visually-hidden" for="qs-note">Note for the reviser</label>
        <textarea id="qs-note" class="qs-note" rows="3" placeholder="Anything the reviser should know"></textarea>
        <div class="qs-actions"><button type="button" class="settings-save-button" id="qs-submit" ${canSubmit ? "" : "disabled"}>Submit for revision</button>
          <span class="qs-muted">${canSubmit ? "Sends the quote to the revision log." : `This quote is ${esc(state.quote.status)}.`}</span></div>
      </section>
      <dialog class="qs-dialog" id="qs-lf-dialog" aria-labelledby="qs-lf-title">
        <form method="dialog" id="qs-lf-form">
          <h3 id="qs-lf-title" class="qs-h">Load form details</h3>
          <p class="section-description">Pack Ship, N/A and lines without a sell price are left out automatically.</p>
          <label>Contract number (PPL)<input name="contractNumber" required value="${val(state.quote.ppl)}"/></label>
          <label>Description<input name="description" value="${val([state.quote.accountNumber, state.quote.accountName].filter(Boolean).join(" - "))}"/></label>
          <div class="qs-two"><label>Start date<input name="startDate" type="date" required value="${new Date().toISOString().slice(0, 10)}"/></label><label>End date<input name="endDate" type="date" required/></label></div>
          <div class="qs-two"><label>Contract type<input name="contractType" required value="MASTER PPL"/></label><label>Classification<input name="classification" required value="M"/></label></div>
          <label>Contract owner<input name="contractOwner" value="Contract owner"/></label>
          <p class="request-feedback" id="qs-lf-status" role="status"></p>
          <div class="qs-actions"><button type="submit" class="settings-save-button" value="create">Create load form</button><button type="button" class="secondary-button" id="qs-lf-cancel">Cancel</button></div>
        </form>
      </dialog>`;
  }

  // ---------------------------------------------------------------- events

  view.addEventListener("click", (event) => {
    const t = event.target.closest("button, [data-select]");
    if (!t || !state) return;
    const id = state.quote.id;
    if (t.dataset.stage) return run(async () => { await saveLines(); await goTo(Number(t.dataset.stage)); });
    if (t.dataset.select) { selectedFileId = t.dataset.select; return render(); }
    if (t.dataset.extract) return run(async () => {
      await saveLines();
      const result = await api(`/api/qs/${id}/files/${t.dataset.extract}/extract`, { method: "POST" });
      selectedFileId = t.dataset.extract;
      setState(result);
      const x = result.extraction;
      message(`${x.fileName}: ${x.found} lines read with ${x.engine}${x.needsReview ? `, ${x.needsReview} flagged` : ""}${x.totalsMatch ? ", and they add up to the document's total" : ""}.${x.warnings.length ? ` ${x.warnings.join(" ")}` : ""}`, x.found ? "is-success" : "is-error");
    }, "Reading the file… photos can take up to a minute the first time.");
    if (t.dataset.archive || t.dataset.unarchive) return run(async () => setState(await api(`/api/qs/${id}/files/${t.dataset.archive || t.dataset.unarchive}/archive`, json("POST", { archived: Boolean(t.dataset.archive) }))));
    if (t.id === "qs-add") return run(async () => {
      const input = view.querySelector("#qs-add-file");
      if (!input.files.length) throw new Error("Choose a file first.");
      const body = new FormData(); body.append("file", input.files[0]);
      setState(await api(`/api/qs/${id}/files`, { method: "POST", body }));
    }, "Saving the file…");
    if (t.id === "qs-confirm-all") { lines.forEach((l) => { l.confirmed = true; }); return render(); }
    if (t.id === "qs-add-line") { lines.push({ id: null, confirmed: false, tags: [] }); return render(); }
    if (t.dataset.remove) { lines.splice(Number(t.dataset.remove), 1); return render(); }
    if (t.dataset.remember) { const l = lines[Number(t.dataset.remember)]; l.our_item = l.remembered.ourItem; l.our_uom = l.remembered.ourUom; return render(); }
    if (t.id === "qs-use-all") { lines.forEach((l) => { if (!l.our_item && l.remembered) { l.our_item = l.remembered.ourItem; l.our_uom = l.remembered.ourUom; } }); return render(); }
    if (t.dataset.save !== undefined) return run(async () => { setState(await saveLines()); message("Saved.", "is-success"); }, "Saving…");
    if (t.dataset.next !== undefined) return run(async () => { await saveLines(); await goTo(state.stage + 1); }, "Saving…");
    if (t.dataset.pricing) return run(async () => {
      const input = view.querySelector(`#qs-pf-${t.dataset.pricing}`);
      if (!input.files.length) throw new Error("Choose a file first.");
      const body = new FormData(); body.append("file", input.files[0]);
      setState(await api(`/api/qs/${id}/pricing/${t.dataset.pricing}`, { method: "POST", body }));
    }, "Uploading…");
    if (t.dataset.fill) {
      const l = lines[Number(t.dataset.i)];
      l.sell_price = { account: l.calc.accountPrice, target: l.priceAtTarget, blind: l.priceAt25Margin }[t.dataset.fill];
      return run(async () => setState(await saveLines()));
    }
    if (t.id === "qs-load-form") { view.querySelector("#qs-lf-dialog").showModal(); return undefined; }
    if (t.id === "qs-lf-cancel") { view.querySelector("#qs-lf-dialog").close(); return undefined; }
    if (t.id === "qs-submit") return run(async () => {
      const note = view.querySelector("#qs-note").value.trim();
      if (note) await api(`/api/quotes/${id}/comments`, json("POST", { body: note }));
      if (state.quote.status !== "In progress") await api(`/api/quotes/${id}/status`, json("POST", { status: "In progress" }));
      await api(`/api/quotes/${id}/status`, json("POST", { status: "In revision" }));
      await openQuote(id);
      message("Submitted. The quote is in the revision log.", "is-success");
    }, "Submitting…");
    return undefined;
  });

  view.addEventListener("change", (event) => {
    const t = event.target;
    if (t.id === "qs-show-archived") { showArchived = t.checked; render(); return; }
    if (t.id === "qs-cost-column") { run(async () => setState(await api(`/api/qs/${state.quote.id}/state`, json("PUT", { costColumn: t.value })))); return; }
    if (t.dataset.tag) {
      const l = lines[Number(t.dataset.i)];
      l.tags = (l.tags || []).filter((x) => x !== t.dataset.tag);
      if (t.checked) l.tags.push(t.dataset.tag);
      run(async () => setState(await saveLines()));
      return;
    }
    if (t.dataset.f === undefined) return;
    const l = lines[Number(t.dataset.i)];
    const f = t.dataset.f;
    if (f === "confirmed") l.confirmed = t.checked;
    else if (f === "target_margin") { const n = numIn(t.value); l.target_margin = n === null ? null : n / 100; }
    else if (["qty", "their_price", "their_extended", "sell_price"].includes(f)) l[f] = numIn(t.value);
    else l[f] = t.value;
    if (state.stage === 4) run(async () => setState(await saveLines())); // recalculate margins right away
    else if (f === "confirmed") render();
  });

  view.addEventListener("submit", (event) => {
    if (event.target.id !== "qs-lf-form") return;
    event.preventDefault();
    const form = event.target;
    const status = form.querySelector("#qs-lf-status");
    const body = Object.fromEntries(new FormData(form).entries());
    run(async () => {
      const response = await fetch(`/api/qs/${state.quote.id}/export/load-form`, json("POST", body));
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "The load form couldn't be created."); }
      const blob = await response.blob();
      const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "Load Form.csv";
      const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
      document.body.append(link); link.click(); link.remove();
      form.closest("dialog").close();
      message(`Load form created: ${name}`, "is-success");
    });
    status.textContent = "";
  });

  // ---------------------------------------------------------------- choosing a quote

  async function openQuote(id) {
    view.innerHTML = '<p class="request-feedback">Loading…</p>';
    try {
      setState(await api(`/api/qs/${encodeURIComponent(id)}`));
      history.replaceState(null, "", `?id=${encodeURIComponent(id)}`);
      picker.value = id;
    } catch (error) {
      view.innerHTML = `<p class="request-feedback is-error">${esc(error.message)}</p>`;
    }
  }

  const quotes = window.__workspaceQuotes || [];
  picker.innerHTML = `<option value="">Choose a quote…</option>${quotes.map((q) => `<option value="${esc(q.databaseId)}">${esc(q.id)} · ${esc(q.companyName || q.accountName || "")} · ${esc(q.status)}</option>`).join("")}`;
  picker.addEventListener("change", () => { if (picker.value) openQuote(picker.value); });
  const fromUrl = new URLSearchParams(window.location.search).get("id");
  if (fromUrl) openQuote(fromUrl);
  else view.innerHTML = '<p class="empty-items">Choose a quote to start. Its files are saved with it and can be opened at any stage.</p>';
}

document.addEventListener("workspace:ready", initializeQuoteStages);
if (document.body.dataset.workspaceReady === "true") initializeQuoteStages();
