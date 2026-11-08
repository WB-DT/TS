// Quote workspace, stage by stage. Each stage shows only what that step needs, in the
// columns of the template the qualifier picked.
//   1 Extract & verify · 2 Match our items · 3 Pricing files · 4 Price · 5 Review & submit
//
// The line tables work like Excel: click a column name to sort (again to reverse, a third
// time to clear), Filter shows a filter box under each column, Columns hides or shows
// columns, Reset view puts everything back. Tab moves right, Enter moves down.
// Line numbers always stay the original line numbers. Every change saves by itself.

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
    "Suggested alternative": "A line we added below the customer's item to suggest another option.",
    "Item N/A": "We can't provide this item. With 3 or more, they move to an N/A tab on the customer file.",
    Blind: "We can't beat their price. The customer file shows our price with no comparison or savings.",
    "Couldn't quote section": "Move this line to the N/A tab on the customer file.",
    "Look at this": "Asks the reviser to take a closer look. Add an internal note for them.",
    "Current price on account": "Internal: the price may be low, but it's already on the account.",
    "Base cost": "Internal: the cost shown is base cost.",
    Deviation: "From the cross-reference: a deviation cost may apply.",
    "Pack Ship": "From the cross-reference: never on a load form; can go on a favorites list.",
    "Large opportunity": "Quantity 20 or more in JanSan or Food Service.",
  };
  const MONEY = new Set(["their_price", "their_ext", "sell", "sell_ext", "matched_price", "matched_ext", "savings_unit", "savings_ext", "account_price",
    "account_ext", "reprice_savings_ext", "cost", "cost_ext", "price_at_target", "tier"]);
  const PERCENT = new Set(["savings_pct", "reprice_savings_pct", "margin", "account_margin", "target"]);

  const picker = root.querySelector("#qs-picker");
  const view = root.querySelector("#qs-view");
  let state = null;          // what the server sent
  let lines = [];            // the working copy being edited
  let selectedFileId = null;
  let showArchived = false;
  let saving = null;         // the save in progress
  let saveAgain = false;
  let undo = null;           // { line, position, timer } after removing a line
  let clearArmed = false;

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? "" : `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const pct = (v) => (v === null || v === undefined || v === "" ? "" : `${(Number(v) * 100).toFixed(1)}%`);
  const val = (v) => (v === null || v === undefined ? "" : esc(v));
  const numIn = (v) => { const n = Number(String(v ?? "").replace(/[$,%\s]/g, "")); return String(v ?? "").trim() === "" || !Number.isFinite(n) ? null : n; };
  const fmt = (field, v) => (MONEY.has(field) ? money(v) : PERCENT.has(field) ? pct(v) : esc(v ?? ""));
  const tagsOf = (l) => [...(l.autoTags || []), ...(l.tags || [])];
  const notQuoted = (l) => Boolean(l.line_status) || (l.tags || []).includes("Item N/A");

  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }
  const json = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  function setState(next) {
    if (state && state.template.key !== next.template.key) Object.keys(views).forEach((k) => delete views[k]);
    state = next;
    lines = next.lines.map((l) => ({ ...l }));
    if (!selectedFileId || !state.files.some((f) => f.id === selectedFileId)) selectedFileId = state.files.find((f) => !f.archivedAt)?.id || null;
    render();
  }

  function message(text, tone = "", html = false) {
    const box = view.querySelector("#qs-message");
    if (!box) return;
    box.className = `request-feedback ${tone}`;
    if (html) box.innerHTML = text; else box.textContent = text;
  }

  async function run(task, working) {
    if (working) message(working);
    try { await task(); } catch (error) { message(error.message, "is-error"); }
  }

  // Saves the whole list. Changes made while a save is running are saved right after.
  const payload = () => lines.map(({ calc, margin, gp, priceAtTarget, priceAt25Margin, savings, autoTags, suggestions, view: v, uomMismatch, ...keep }) => keep);
  async function save() {
    if (saving) { saveAgain = true; return saving; }
    saving = (async () => {
      try {
        do {
          saveAgain = false;
          const next = await api(`/api/qs/${state.quote.id}/lines`, json("PUT", { lines: payload() }));
          if (!saveAgain) setState(next);
        } while (saveAgain);
        const box = view.querySelector("#qs-saved");
        if (box) box.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      } catch (error) {
        message(`Not saved: ${error.message}`, "is-error");
      } finally {
        saving = null;
      }
    })();
    return saving;
  }
  const goTo = async (stage) => { await save(); setState(await api(`/api/qs/${state.quote.id}/state`, json("PUT", { stage }))); };

  // ---------------------------------------------------------------- the grid

  // Each stage's view (sort, filters, hidden columns) is remembered in this browser.
  const viewKey = (stage) => `qs-view-${stage}-${state.template.key}`;
  const views = {};
  function gridView(stage) {
    if (!views[stage]) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(viewKey(stage)) || "null"); } catch { saved = null; }
      views[stage] = { sort: saved?.sort || null, filters: saved?.filters || {}, hidden: new Set(saved?.hidden || defaultHidden(stage)), showFilters: Boolean(saved?.showFilters) };
    }
    return views[stage];
  }
  function keepView(stage) {
    const v = views[stage];
    try { localStorage.setItem(viewKey(stage), JSON.stringify({ sort: v.sort, filters: v.filters, hidden: [...v.hidden], showFilters: v.showFilters })); } catch { /* private window */ }
  }
  function defaultHidden(stage) {
    if (stage === 1) return ["their_item", "description", "qty", "their_uom", "their_price", "their_extended"].filter((f) => !state.template.stage1.includes(f));
    if (stage === 2 && state.template.kind === "blind") return ["their_item"];
    return [];
  }

  // columns: [{ key, label, value(l) for sort/filter, cell(l, i) html, hideable, internal }]
  function grid(stage, columns, { rowClass = () => "", after = "" } = {}) {
    const v = gridView(stage);
    const shown = columns.filter((c) => !v.hidden.has(c.key));
    let order = lines.map((_, i) => i);
    for (const [key, text] of Object.entries(v.filters)) {
      const col = columns.find((c) => c.key === key);
      const needle = String(text || "").trim().toLowerCase();
      if (col && needle && col.value) order = order.filter((i) => String(col.value(lines[i]) ?? "").toLowerCase().includes(needle));
    }
    if (v.sort) {
      const col = columns.find((c) => c.key === v.sort.key);
      if (col && col.value) {
        const dir = v.sort.dir === "desc" ? -1 : 1;
        const key = (i) => { const x = col.value(lines[i]); const n = typeof x === "number" ? x : Number(String(x ?? "").replace(/[$,%]/g, "")); return String(x ?? "").trim() !== "" && Number.isFinite(n) ? n : String(x ?? "").toLowerCase(); };
        order.sort((a, b) => { const x = key(a); const y = key(b); if (x === y) return a - b; if (x === "") return 1; if (y === "") return -1; return (x > y ? 1 : -1) * dir; });
      }
    }
    const hiddenCols = columns.filter((c) => c.hideable !== false);
    const changed = v.sort || Object.values(v.filters).some((x) => String(x || "").trim()) || [...v.hidden].join() !== defaultHidden(stage).join();
    return `
      <div class="qg-tools">
        <span class="qs-muted">${order.length === lines.length ? `${lines.length} lines` : `${order.length} of ${lines.length} lines shown`}</span>
        <button type="button" class="qg-tool${v.showFilters ? " is-on" : ""}" data-grid-filter="${stage}">Filter</button>
        <details class="qg-cols"><summary class="qg-tool">Columns</summary><div>${hiddenCols.map((c) => `
          <label><input type="checkbox" data-grid-col="${stage}" value="${esc(c.key)}"${v.hidden.has(c.key) ? "" : " checked"}/> ${esc(c.label)}</label>`).join("")}</div></details>
        ${changed ? `<button type="button" class="qg-tool" data-grid-reset="${stage}">Reset view</button>` : ""}
        <span class="qs-muted" id="qs-saved"></span>
      </div>
      <div class="table-scroll qg-scroll"><table class="qs-table qg" data-stage="${stage}"><thead><tr>${shown.map((c) => `
        <th class="${c.internal ? "qg-internal" : ""} ${c.cls || ""}" ${c.value ? `data-sort="${esc(c.key)}" tabindex="0" aria-sort="${v.sort?.key === c.key ? (v.sort.dir === "desc" ? "descending" : "ascending") : "none"}"` : ""} title="${esc(c.help || "")}">${esc(c.label)}${v.sort?.key === c.key ? (v.sort.dir === "desc" ? " ▼" : " ▲") : ""}</th>`).join("")}</tr>
        ${v.showFilters ? `<tr class="qg-filter">${shown.map((c) => `<th>${c.value ? `<input class="qs-in" data-grid-filterbox="${stage}" data-key="${esc(c.key)}" value="${esc(v.filters[c.key] || "")}" aria-label="Filter ${esc(c.label)}" placeholder="Filter"/>` : ""}</th>`).join("")}</tr>` : ""}
      </thead>
      <tbody>${order.map((i, row) => `<tr class="${rowClass(lines[i], i)}" data-pos="${i}">${shown.map((c) => `<td class="${c.tdClass ? c.tdClass(lines[i], i) : ""}${c.internal ? " qg-internal" : ""} ${c.cls || ""}">${c.cell(lines[i], i, row)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${after}`;
  }

  // An input in the grid. data-pos = the line's position, data-f = the field.
  const input = (l, i, field, { cls = "", caps = false, kind = "text", placeholder = "" } = {}) => {
    let value = l[field];
    if (kind === "pct") value = value === null || value === undefined || value === "" ? "" : +(Number(value) * 100).toFixed(2);
    return `<input data-pos="${i}" data-f="${field}" data-kind="${kind}"${caps ? ' data-caps="1"' : ""} value="${val(value)}" class="qs-in ${cls}${caps ? " qg-caps" : ""}"${kind !== "text" ? ' inputmode="decimal"' : ""} placeholder="${esc(placeholder)}" aria-label="${esc(field.replace(/_/g, " "))} line ${i + 1}"/>`;
  };
  const lineNo = { key: "line", label: "#", value: (l) => lines.indexOf(l) + 1, cell: (_l, i) => `<span class="qg-no">${i + 1}</span>`, hideable: false, cls: "qg-narrow" };

  // ---------------------------------------------------------------- page frame

  function render() {
    if (!state) return;
    // Keep what's being typed, and the cursor, across a redraw.
    const active = document.activeElement;
    const keep = active && active.dataset && active.dataset.f !== undefined && active.dataset.pos !== undefined
      ? { pos: active.dataset.pos, f: active.dataset.f, value: active.value, start: active.selectionStart, isText: active.tagName === "INPUT" && active.type !== "checkbox" } : null;
    const q = state.quote;
    view.innerHTML = `
      <div class="qs-header">
        <div><h1 class="qs-title">${esc(q.number)} · ${esc(q.accountName || "Account")} <span class="qs-muted">${esc(q.accountNumber || "")}</span></h1>
          <p class="section-description">${esc(q.status)}${q.assignedTo ? ` · ${esc(q.assignedTo)}` : ""}${q.specialty ? ` · ${esc(q.specialty)}` : ""}
            · <label>Template <select class="qs-in" id="qs-template" title="${esc(state.template.when)}">${state.templates.map((t) => `<option value="${esc(t.key)}"${t.key === state.template.key ? " selected" : ""} title="${esc(t.when)}">${esc(t.name)}</option>`).join("")}</select></label>
            ${state.files.length ? ` · Files: ${state.files.filter((f) => !f.archivedAt).map((f) => `<a href="${f.url}" target="_blank" rel="noopener">${esc(f.fileName)} ↗</a>`).join(", ")}` : ""}</p></div>
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
    if (undo) message(`Line ${undo.position + 1} removed. <button type="button" class="qg-tool" id="qs-undo">Undo</button>`, "", true);
    if (keep) {
      const el = view.querySelector(`[data-pos="${keep.pos}"][data-f="${keep.f}"]`);
      if (el) {
        el.focus();
        if (keep.isText && el.value !== keep.value) el.value = keep.value;
        if (keep.isText && keep.start !== null) try { el.setSelectionRange(keep.start, keep.start); } catch { /* number inputs */ }
      }
    }
  }

  // ---------------------------------------------------------------- stage 1: extract & verify

  function renderExtract(el) {
    const files = state.files.filter((f) => showArchived || !f.archivedAt);
    const archivedCount = state.files.filter((f) => f.archivedAt).length;
    const selected = state.files.find((f) => f.id === selectedFileId);
    const canPreview = selected && /pdf|image/.test(selected.fileType || "");
    const unconfirmed = lines.filter((l) => !l.confirmed).length;
    const columns = [
      { key: "confirmed", label: "✓", value: (l) => (l.confirmed ? "yes" : "no"), cell: (l, i) => `<input type="checkbox" data-pos="${i}" data-f="confirmed" aria-label="Confirm line ${i + 1}"${l.confirmed ? " checked" : ""}/>`, hideable: false, cls: "qg-narrow" },
      lineNo,
      { key: "their_item", label: "Their item", value: (l) => l.their_item, cell: (l, i) => input(l, i, "their_item", { cls: "w-item", caps: true }) },
      { key: "description", label: "Description", value: (l) => l.description, cell: (l, i) => input(l, i, "description", { cls: "w-desc" }) },
      { key: "qty", label: "Qty", value: (l) => l.qty, cell: (l, i) => input(l, i, "qty", { cls: "w-num", kind: "num" }) },
      { key: "their_uom", label: "Their UOM", value: (l) => l.their_uom, cell: (l, i) => input(l, i, "their_uom", { cls: "w-uom", caps: true }) },
      { key: "their_price", label: "Price", value: (l) => l.their_price, cell: (l, i) => input(l, i, "their_price", { cls: "w-num", kind: "num" }) },
      { key: "their_extended", label: "Line total", value: (l) => l.their_extended, cell: (l, i) => input(l, i, "their_extended", { cls: "w-num", kind: "num" }) },
      { key: "remove", label: "", cell: (_l, i) => `<button type="button" class="qs-x" data-remove="${i}" aria-label="Remove line ${i + 1}" title="Remove this line">×</button>`, hideable: false, cls: "qg-narrow" },
    ];
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
          <div class="qs-row-head"><h3 class="qs-h">Lines · ${lines.length - unconfirmed} of ${lines.length} confirmed</h3>
            <span class="qg-buttons"><button type="button" class="secondary-button" id="qs-confirm-all">Confirm all</button>
            <button type="button" class="secondary-button" id="qs-add-line">Add line</button>
            ${lines.length ? `<button type="button" class="secondary-button${clearArmed ? " is-danger" : ""}" id="qs-clear-all">${clearArmed ? `Click again to clear all ${lines.length} lines` : "Clear all"}</button>` : ""}</span></div>
          ${grid(1, columns, { rowClass: (l) => (l.confirmed ? "" : "is-unconfirmed") })}
          ${lines.length ? "" : '<p class="qs-muted">Click <b>Read</b> on a file to pull its lines, or add lines by hand.</p>'}
          <div class="qs-actions"><button type="button" class="settings-save-button" data-next ${lines.length && !unconfirmed ? "" : "disabled"}>Items verified · continue</button>
            ${unconfirmed ? `<span class="qs-muted">Confirm every line to continue.</span>` : ""}</div>
        </section>
      </div>`;
  }

  // ---------------------------------------------------------------- stage 2: match our items

  function renderMatch(el) {
    const withSuggestion = lines.filter((l) => !l.our_item && !l.line_status && l.suggestions && l.suggestions.length).length;
    const columns = [
      lineNo,
      { key: "their_item", label: "Their item", value: (l) => l.their_item, cell: (l) => `<span class="qs-code">${esc(l.their_item || "")}</span>` },
      { key: "description", label: "Their description", value: (l) => l.description, cell: (l) => esc(l.description || "") },
      { key: "qty", label: "Qty", value: (l) => l.qty, cell: (l) => val(l.qty) },
      { key: "their_uom", label: "Their UOM", value: (l) => l.their_uom, cell: (l, i) => input(l, i, "their_uom", { cls: "w-uom", caps: true }) },
      { key: "our_item", label: "Our item", value: (l) => l.our_item, cell: (l, i) => `${l.line_status ? '<span class="qs-muted">We don\'t carry</span>' : input(l, i, "our_item", { cls: "w-item", caps: true })}
          ${!l.line_status && l.suggestions && l.suggestions.length ? `<div class="qg-suggest">${l.suggestions.map((s, k) => `<div><span>Previously quoted: <b>${esc(s.ourItem)}</b> ${esc(s.ourUom || "")}${s.timesUsed > 1 ? ` · ${s.timesUsed}×` : ""}</span>
            <button type="button" class="qg-use" data-use="${i}" data-k="${k}" title="Last used by ${esc(s.lastUsedBy || "")}">Use</button></div>`).join("")}</div>` : ""}` },
      { key: "our_uom", label: "Our UOM", value: (l) => l.our_uom, cell: (l, i) => (l.line_status ? "" : input(l, i, "our_uom", { cls: "w-uom", caps: true })) },
      { key: "carry", label: "We don't carry", value: (l) => (l.line_status ? "yes" : ""), cell: (l, i) => `<input type="checkbox" data-pos="${i}" data-f="dont_carry" aria-label="We don't carry line ${i + 1}"${l.line_status === "We don't carry" ? " checked" : ""}/>`, cls: "qg-narrow" },
      { key: "comment", label: "Internal note", value: (l) => l.comment, cell: (l, i) => input(l, i, "comment", { cls: "w-desc", placeholder: "Only the team sees this" }) },
      { key: "add", label: "Add a line below", cell: (_l, i) => `<span class="qg-adds"><button type="button" class="qg-tool" data-add-below="${i}" data-kind="Combo pack" title="Add another of our items for this line (combo pack)">+ Combo</button><button type="button" class="qg-tool" data-add-below="${i}" data-kind="Suggested alternative" title="Suggest another option below this line">+ Alternative</button></span>` },
      { key: "remove", label: "", cell: (_l, i) => `<button type="button" class="qs-x" data-remove="${i}" aria-label="Remove line ${i + 1}" title="Remove this line">×</button>`, hideable: false, cls: "qg-narrow" },
    ];
    el.innerHTML = `
      <section class="qs-panel">
        <div class="qs-row-head"><h3 class="qs-h">Our comparable item for each line</h3>
          ${withSuggestion ? `<button type="button" class="secondary-button" id="qs-use-all">Use the first suggestion on ${withSuggestion} line${withSuggestion === 1 ? "" : "s"}</button>` : ""}</div>
        ${grid(2, columns, { rowClass: (l) => [l.line_status ? "t-na" : "", (l.tags || []).includes("Combo pack") ? "t-combo" : "", (l.tags || []).includes("Suggested alternative") ? "t-alt" : ""].filter(Boolean)[0] || "" })}
        <div class="qs-actions"><button type="button" class="settings-save-button" data-next>Matches done · continue</button>
          <span class="qs-muted">Matches you use are suggested on the next quote with the same competitor item.</span></div>
      </section>`;
  }

  // ---------------------------------------------------------------- stage 3: pricing files

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

  // ---------------------------------------------------------------- stage 4: price, in the template's layout

  function tagChips(l) {
    return tagsOf(l).map((t) => `<span class="qs-tag ${TAG_CLASS[t] || ""}" title="${esc(TAG_HELP[t] || "")}">${esc(t)}</span>`).join("");
  }
  function tagMenu(l, i) {
    return `<details class="qs-tagmenu"><summary aria-label="Tags for line ${i + 1}">+ Tag</summary><div>${state.options.tags.map((t) => `
      <label title="${esc(TAG_HELP[t] || "")}"><input type="checkbox" data-tag="${esc(t)}" data-pos="${i}"${(l.tags || []).includes(t) ? " checked" : ""}/> ${esc(t)}</label>`).join("")}</div></details>`;
  }
  function mismatchHelp(l) {
    return l.uomMismatch ? `${l.our_item} is in the pricing files as ${l.uomMismatch.join(", ")}, not ${l.our_uom}. Change our UOM and the pricing fills in.` : "";
  }

  function priceCell(field, l, i) {
    const v = l.view || {};
    const skip = notQuoted(l);
    if (field === "sell") {
      if (skip) return "";
      const c = l.calc;
      return `${input(l, i, "sell_price", { cls: "w-num", kind: "num", placeholder: "—" })}
        ${c ? `<div class="qs-quick">${c.accountPrice !== null ? `<button type="button" data-fill="account" data-pos="${i}" title="Use the account's current price">Acct</button>` : ""}
        ${l.priceAtTarget !== null ? `<button type="button" data-fill="target" data-pos="${i}" title="Use the price at target">Target</button>` : ""}
        ${l.priceAt25Margin !== null ? `<button type="button" data-fill="blind" data-pos="${i}" title="Price at a 25% margin: cost ÷ 0.75. Used for blind items.">25%</button>` : ""}</div>` : ""}`;
    }
    if (field === "target") return skip ? "" : input(l, i, "target_margin", { cls: "w-pct", kind: "pct", placeholder: "—" });
    if (field === "our_uom") return skip ? "" : input(l, i, "our_uom", { cls: "w-uom", caps: true });
    if (field === "their_uom") return input(l, i, "their_uom", { cls: "w-uom", caps: true });
    if (field === "our_item") return skip ? "" : `<span class="qs-code">${esc(l.our_item || "")}</span>`;
    if (field === "our_desc") return skip ? "" : esc(v.our_desc || "");
    if (field === "cost") return l.calc ? `<span title="Cost from: ${esc(l.calc.costSource || "")}">${money(l.calc.cost)}</span>` : "";
    if (field === "note") return esc(l.customer_note || "");
    return fmt(field, v[field]);
  }
  function priceCellClass(field, l) {
    const tags = tagsOf(l);
    const cls = [];
    if (field === "our_item" && tags.includes("Pack Ship")) cls.push("t-pack");
    if (field === "our_item" && tags.includes("Blind")) cls.push("t-blind");
    if (field === "cost" && tags.includes("Deviation")) cls.push("t-deviation");
    if (field === "cost" && tags.includes("Base cost")) cls.push("t-base");
    if (field === "sell" && tags.includes("Current price on account")) cls.push("t-current");
    if ((field === "our_uom" || field === "our_item") && l.uomMismatch) cls.push("qg-uom-mismatch");
    if (field === "margin" && l.margin !== null && l.margin < 0) cls.push("qg-negative");
    return cls.join(" ");
  }

  function renderPrice(el) {
    const s = state.summary;
    const t = state.template;
    const sortValue = (field) => (l) => {
      if (field === "sell") return l.sell_price;
      if (field === "target") return l.target_margin;
      if (field === "our_uom") return l.our_uom;
      return (l.view || {})[field];
    };
    const col = (c, internal) => ({ key: `${internal ? "i" : "c"}:${c.header}`, label: c.header, internal, value: sortValue(c.field),
      cell: (l, i) => priceCell(c.field, l, i), tdClass: (l) => priceCellClass(c.field, l), help: internal ? "Internal: not on the customer file" : "" });
    const columns = [
      lineNo,
      ...t.customer.map((c) => col(c, false)),
      ...t.internal.filter((c) => c.field !== "line").map((c) => col(c, true)),
      { key: "tags", label: "Tags & internal note", internal: true, value: (l) => tagsOf(l).join(" "), cell: (l, i) => `${tagChips(l)}${tagMenu(l, i)}${input(l, i, "comment", { cls: "w-desc", placeholder: (l.tags || []).includes("Look at this") ? "What should the reviser look at?" : "Internal note" })}` },
    ];
    const rowClass = (l) => {
      const tags = tagsOf(l);
      if (l.line_status === "We don't carry" || tags.includes("Item N/A")) return "t-na";
      const rowTag = ["Combo pack total", "Combo pack", "Suggested alternative", "Large opportunity"].find((x) => tags.includes(x));
      return `${rowTag ? TAG_CLASS[rowTag] : ""}${tags.includes("Look at this") ? " is-flagged" : ""}${l.calc ? "" : " is-muted"}`;
    };
    el.innerHTML = `
      <div class="xr-cards">
        <div class="xr-card"><strong>${money(s.sellTotal) || "$0.00"}</strong><span>Sell total</span></div>
        <div class="xr-card"><strong>${money(s.gp) || "$0.00"}</strong><span>Gross profit</span></div>
        <div class="xr-card"><strong>${pct(s.margin) || "—"}</strong><span>Margin</span></div>
        <div class="xr-card"><strong>${money(s.savingsTotal) || "$0.00"}</strong><span>Customer saves</span></div>
        <div class="xr-card${s.withSellPrice < s.priced ? " is-warn" : ""}"><strong>${s.withSellPrice} / ${s.priced}</strong><span>Lines with a sell price</span></div>
        ${s.uomMismatch ? `<div class="xr-card qg-uom-card"><strong>${s.uomMismatch}</strong><span>UOM doesn't match the pricing files (yellow)</span></div>` : ""}
      </div>
      <section class="qs-panel">
        <p class="qs-muted">Columns follow the <b>${esc(t.name)}</b> template. Grey headers are internal and never go on the customer file. Hover a cost to see where it came from.</p>
        ${grid(4, columns, { rowClass })}
        <div class="qs-actions"><button type="button" class="settings-save-button" data-next>Pricing done · review</button></div>
      </section>`;
  }

  // ---------------------------------------------------------------- stage 5: review & submit

  function renderSubmit(el) {
    const s = state.summary;
    const missing = lines.filter((l) => l.calc && (l.sell_price === null || l.sell_price === "")).length;
    const issues = [
      missing && `${missing} priced line${missing === 1 ? " has" : "s have"} no sell price`,
      s.uomMismatch && `${s.uomMismatch} line${s.uomMismatch === 1 ? "'s" : "s'"} UOM doesn't match the pricing files`,
      s.negative && `${s.negative} line${s.negative === 1 ? " is" : "s are"} below cost`,
      s.lookAt && `${s.lookAt} line${s.lookAt === 1 ? " is" : "s are"} flagged "Look at this"`,
      s.couldntQuoteSection && `${s.naCount} items we can't quote: they'll move to an N/A tab on the customer file`,
    ].filter(Boolean);
    const canSubmit = ["Assigned", "Returned to quoter", "In progress"].includes(state.quote.status);
    const columns = [
      lineNo,
      { key: "their_item", label: "Their item", value: (l) => l.their_item, cell: (l) => `<span class="qs-code">${esc(l.their_item || "")}</span>` },
      { key: "description", label: "Their description", value: (l) => l.description, cell: (l) => esc(l.description || "") },
      { key: "our_item", label: "Our item", value: (l) => l.our_item, cell: (l) => (notQuoted(l) ? "" : `<span class="qs-code">${esc(l.our_item || "")}</span> <span class="qs-muted">${esc(l.our_uom || "")}</span>`) },
      { key: "sell", label: "Sell price", value: (l) => l.sell_price, cell: (l) => money(l.sell_price) },
      { key: "customer_note", label: "Customer note", value: (l) => l.customer_note, cell: (l, i) => `<select class="qs-in" data-pos="${i}" data-f="customer_note"><option value="">—</option>${state.options.notes.map((n) => `<option${l.customer_note === n ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>` },
      { key: "comment", label: "Internal note", value: (l) => l.comment, cell: (l) => esc(l.comment || "") },
    ];
    el.innerHTML = `
      <div class="xr-cards">
        <div class="xr-card"><strong>${s.lines}</strong><span>Lines</span></div>
        <div class="xr-card"><strong>${money(s.sellTotal) || "$0.00"}</strong><span>Sell total</span></div>
        <div class="xr-card"><strong>${money(s.gp) || "$0.00"}</strong><span>Gross profit</span></div>
        <div class="xr-card"><strong>${pct(s.margin) || "—"}</strong><span>Margin</span></div>
        <div class="xr-card"><strong>${money(s.savingsTotal) || "$0.00"}</strong><span>Customer saves</span></div>
      </div>
      <section class="qs-panel">
        <h3 class="qs-h">Before you submit</h3>
        ${issues.length ? `<ul class="qs-issues">${issues.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : '<p class="request-feedback is-success">Nothing flagged.</p>'}
        <h3 class="qs-h">Customer notes</h3>
        ${grid(5, columns)}
        <h3 class="qs-h qg-gap">Files <span class="qs-muted">(the load form and favorites list are also on the quote in Completed quotes after approval)</span></h3>
        <div class="qs-exports">
          <a class="secondary-button" href="/api/qs/${state.quote.id}/export/customer">Customer file</a>
          <a class="secondary-button" href="/api/qs/${state.quote.id}/export/internal">Internal file</a>
        </div>
        <h3 class="qs-h">Note for the reviser</h3>
        <label class="visually-hidden" for="qs-note">Note for the reviser</label>
        <textarea id="qs-note" class="qs-note" rows="3" placeholder="Anything the reviser should know">${esc(state.submitNote || "")}</textarea>
        <div class="qs-actions"><button type="button" class="settings-save-button" id="qs-submit" ${canSubmit ? "" : "disabled"}>Submit for revision</button>
          <span class="qs-muted">${canSubmit ? "Sends the quote to the revision queue." : `This quote is ${esc(state.quote.status)}.`}</span></div>
      </section>`;
  }

  // ---------------------------------------------------------------- events

  function removeLine(position) {
    const [line] = lines.splice(position, 1);
    if (undo) clearTimeout(undo.timer);
    undo = { line, position, timer: setTimeout(() => { undo = null; message(""); }, 12000) };
    render();
    save();
  }

  function addBelow(position, kind) {
    const source = lines[position];
    const added = { id: null, confirmed: true, tags: [kind], their_item: source.their_item, description: source.description, qty: source.qty, their_uom: source.their_uom };
    if (kind === "Combo pack" && !(source.tags || []).includes("Combo pack")) source.tags = [...(source.tags || []), "Combo pack"];
    lines.splice(position + 1, 0, added);
    render();
    save();
  }

  view.addEventListener("click", (event) => {
    const t = event.target.closest("button, [data-select], th[data-sort]");
    if (!t || !state) return;
    const id = state.quote.id;
    if (t.id !== "qs-clear-all" && clearArmed) { clearArmed = false; }
    if (t.dataset.sort) {
      const v = gridView(state.stage);
      const key = t.dataset.sort;
      v.sort = !v.sort || v.sort.key !== key ? { key, dir: "asc" } : v.sort.dir === "asc" ? { key, dir: "desc" } : null;
      keepView(state.stage); render(); return;
    }
    if (t.dataset.gridFilter) { const v = gridView(state.stage); v.showFilters = !v.showFilters; if (!v.showFilters) v.filters = {}; keepView(state.stage); render(); return; }
    if (t.dataset.gridReset) { const v = gridView(state.stage); v.sort = null; v.filters = {}; v.showFilters = false; v.hidden = new Set(defaultHidden(state.stage)); keepView(state.stage); render(); return; }
    if (t.id === "qs-undo" && undo) { clearTimeout(undo.timer); lines.splice(undo.position, 0, undo.line); undo = null; render(); save(); message("Line restored.", "is-success"); return; }
    if (t.dataset.stage) { run(() => goTo(Number(t.dataset.stage))); return; }
    if (t.dataset.select) { selectedFileId = t.dataset.select; render(); return; }
    if (t.dataset.extract) {
      run(async () => {
        await save();
        const result = await api(`/api/qs/${id}/files/${t.dataset.extract}/extract`, { method: "POST" });
        selectedFileId = t.dataset.extract;
        setState(result);
        const x = result.extraction;
        message(`${x.fileName}: ${x.found} lines read with ${x.engine}${x.needsReview ? `, ${x.needsReview} flagged` : ""}${x.totalsMatch ? ", and they add up to the document's total" : ""}.${x.warnings.length ? ` ${x.warnings.join(" ")}` : ""}`, x.found ? "is-success" : "is-error");
      }, "Reading the file… photos can take up to a minute the first time.");
      return;
    }
    if (t.dataset.archive || t.dataset.unarchive) { run(async () => setState(await api(`/api/qs/${id}/files/${t.dataset.archive || t.dataset.unarchive}/archive`, json("POST", { archived: Boolean(t.dataset.archive) })))); return; }
    if (t.id === "qs-add") {
      run(async () => {
        const fileInput = view.querySelector("#qs-add-file");
        if (!fileInput.files.length) throw new Error("Choose a file first.");
        const body = new FormData(); body.append("file", fileInput.files[0]);
        setState(await api(`/api/qs/${id}/files`, { method: "POST", body }));
      }, "Saving the file…");
      return;
    }
    if (t.id === "qs-confirm-all") { lines.forEach((l) => { l.confirmed = true; }); render(); save(); return; }
    if (t.id === "qs-add-line") {
      lines.push({ id: null, confirmed: false, tags: [] });
      const v = gridView(state.stage); v.sort = null; v.filters = {};
      render(); save();
      setTimeout(() => view.querySelector(`[data-pos="${lines.length - 1}"][data-f]:not([type="checkbox"])`)?.focus(), 50);
      return;
    }
    if (t.id === "qs-clear-all") {
      if (!clearArmed) { clearArmed = true; render(); return; }
      clearArmed = false; lines = []; undo = null; render(); save(); message("All lines cleared.", "is-success"); return;
    }
    if (t.dataset.remove !== undefined) { removeLine(Number(t.dataset.remove)); return; }
    if (t.dataset.addBelow !== undefined) { addBelow(Number(t.dataset.addBelow), t.dataset.kind); return; }
    if (t.dataset.use !== undefined) {
      const l = lines[Number(t.dataset.use)];
      const s = l.suggestions[Number(t.dataset.k)];
      l.our_item = s.ourItem; l.our_uom = s.ourUom || l.our_uom;
      render(); save(); return;
    }
    if (t.id === "qs-use-all") {
      lines.forEach((l) => { if (!l.our_item && !l.line_status && l.suggestions && l.suggestions.length) { l.our_item = l.suggestions[0].ourItem; l.our_uom = l.suggestions[0].ourUom || l.our_uom; } });
      render(); save(); return;
    }
    if (t.dataset.next !== undefined) { run(() => goTo(state.stage + 1), "Saving…"); return; }
    if (t.dataset.pricing) {
      run(async () => {
        const fileInput = view.querySelector(`#qs-pf-${t.dataset.pricing}`);
        if (!fileInput.files.length) throw new Error("Choose a file first.");
        await save();
        const body = new FormData(); body.append("file", fileInput.files[0]);
        setState(await api(`/api/qs/${id}/pricing/${t.dataset.pricing}`, { method: "POST", body }));
      }, "Uploading…");
      return;
    }
    if (t.dataset.fill) {
      const l = lines[Number(t.dataset.pos)];
      l.sell_price = { account: l.calc.accountPrice, target: l.priceAtTarget, blind: l.priceAt25Margin }[t.dataset.fill];
      save(); return;
    }
    if (t.id === "qs-submit") {
      run(async () => {
        const note = view.querySelector("#qs-note").value.trim();
        await save();
        await api(`/api/qs/${id}/state`, json("PUT", { submitNote: note }));
        if (note) await api(`/api/quotes/${id}/comments`, json("POST", { body: note }));
        if (state.quote.status !== "In progress") await api(`/api/quotes/${id}/status`, json("POST", { status: "In progress" }));
        await api(`/api/quotes/${id}/status`, json("POST", { status: "In revision" }));
        await openQuote(id);
        message("Submitted. The quote is in the revision queue.", "is-success");
      }, "Submitting…");
    }
  });

  // Typing: capital letters for item numbers and UOMs as you type.
  view.addEventListener("input", (event) => {
    const t = event.target;
    if (t.dataset.caps) {
      const start = t.selectionStart;
      const upper = t.value.toUpperCase();
      if (upper !== t.value) { t.value = upper; try { t.setSelectionRange(start, start); } catch { /* ignore */ } }
    }
  });

  view.addEventListener("change", (event) => {
    const t = event.target;
    if (t.id === "qs-show-archived") { showArchived = t.checked; render(); return; }
    if (t.id === "qs-cost-column") { run(async () => setState(await api(`/api/qs/${state.quote.id}/state`, json("PUT", { costColumn: t.value })))); return; }
    if (t.id === "qs-template") {
      run(async () => { await save(); setState(await api(`/api/qs/${state.quote.id}/state`, json("PUT", { templateKey: t.value }))); message("Template changed.", "is-success"); });
      return;
    }
    if (t.dataset.gridCol) {
      const v = gridView(Number(t.dataset.gridCol));
      if (t.checked) v.hidden.delete(t.value); else v.hidden.add(t.value);
      keepView(Number(t.dataset.gridCol)); render();
      view.querySelector(".qg-cols")?.setAttribute("open", "");
      return;
    }
    if (t.dataset.tag) {
      const l = lines[Number(t.dataset.pos)];
      l.tags = (l.tags || []).filter((x) => x !== t.dataset.tag);
      if (t.checked) l.tags.push(t.dataset.tag);
      save();
      return;
    }
    if (t.dataset.f === undefined || t.dataset.pos === undefined) return;
    const l = lines[Number(t.dataset.pos)];
    const f = t.dataset.f;
    if (f === "confirmed") l.confirmed = t.checked;
    else if (f === "dont_carry") { l.line_status = t.checked ? "We don't carry" : null; if (t.checked) { l.our_item = null; l.our_uom = null; } }
    else if (t.dataset.kind === "pct") { const n = numIn(t.value); l[f] = n === null ? null : n / 100; }
    else if (t.dataset.kind === "num") l[f] = numIn(t.value);
    else l[f] = t.dataset.caps ? t.value.trim().toUpperCase() : t.value;
    if (f === "confirmed" || f === "dont_carry") render();
    save();
  });

  // Filters update as you type.
  view.addEventListener("input", (event) => {
    const t = event.target;
    if (t.dataset.gridFilterbox === undefined) return;
    const v = gridView(Number(t.dataset.gridFilterbox));
    v.filters[t.dataset.key] = t.value;
    keepView(Number(t.dataset.gridFilterbox));
    const key = t.dataset.key;
    const pos = t.selectionStart;
    render();
    const box = view.querySelector(`[data-grid-filterbox][data-key="${CSS.escape(key)}"]`);
    if (box) { box.focus(); try { box.setSelectionRange(pos, pos); } catch { /* ignore */ } }
  });

  // Enter moves down a column (Shift+Enter up), like Excel. Tab moves right on its own.
  view.addEventListener("keydown", (event) => {
    const t = event.target;
    if (t.matches("th[data-sort]") && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); t.click(); return; }
    if (event.key !== "Enter" || t.dataset.f === undefined || t.tagName === "TEXTAREA") return;
    event.preventDefault();
    const rows = [...t.closest("tbody").querySelectorAll("tr")];
    const row = t.closest("tr");
    const index = rows.indexOf(row) + (event.shiftKey ? -1 : 1);
    if (t.type !== "checkbox") t.dispatchEvent(new Event("change", { bubbles: true }));
    const target = rows[index] && rows[index].querySelector(`[data-f="${t.dataset.f}"]`);
    if (target) { target.focus(); if (target.select) target.select(); }
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

  const quotes = (window.__workspaceQuotes || []).filter((q) => !["Approved", "Sent to customer", "Declined"].includes(q.status));
  picker.innerHTML = `<option value="">Choose a quote…</option>${quotes.map((q) => `<option value="${esc(q.databaseId)}">${esc(q.id)} · ${esc(q.companyName || q.accountName || "")} · ${esc(q.status)}</option>`).join("")}`;
  picker.addEventListener("change", () => { if (picker.value) openQuote(picker.value); });
  const fromUrl = new URLSearchParams(window.location.search).get("id");
  if (fromUrl) {
    if (!quotes.some((q) => q.databaseId === fromUrl)) picker.insertAdjacentHTML("beforeend", `<option value="${esc(fromUrl)}">This quote</option>`);
    openQuote(fromUrl);
  } else view.innerHTML = '<p class="empty-items">Choose a quote to start. Its files are saved with it and can be opened at any stage.</p>';
}

document.addEventListener("workspace:ready", initializeQuoteStages);
if (document.body.dataset.workspaceReady === "true") initializeQuoteStages();
