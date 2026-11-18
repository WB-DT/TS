// Customer file: a print-ready page the quoter saves as a PDF and sends to the customer.
// It shows the savings, the line-by-line comparison and how to accept. It never shows
// cost, margin, tags or internal comments.
//
// Rules for the numbers:
//   - The comparison totals use only lines that have our price and their price and are not Blind.
//   - Blind lines show our item and price with no comparison.
//   - Suggested alternatives are shown in green and are not in the totals.
//   - Lines marked N/A or with a line status go to "Items we couldn't quote".

const quoteStages = require("./quote-stages");

const DEFAULT_PRIMARY = "#12355B";
const DEFAULT_SECONDARY = "#1D6FD8";
const HEX = /^#[0-9a-f]{6}$/i;
const VALID_DAYS = 30;

const PIGGY_BANK = '<svg viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="60" cy="12" r="9"/><path d="M60 8v8M57 10h5M57 14h5" stroke-width="2.6"/><ellipse cx="58" cy="56" rx="38" ry="26"/><path d="M92 50h10a6 6 0 016 6v4a6 6 0 01-6 6H94"/><path d="M76 33l5-14 11 12"/><path d="M42 78v13h11V81M70 81v10h11V76"/><path d="M21 52c-8-1-10-9-5-12 4-2 7 2 5 5"/><path d="M48 36h22" stroke-width="3.5"/><circle cx="86" cy="50" r="2.4" fill="currentColor"/></svg>';

const ICONS = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  loop: '<path d="M20 11a8 8 0 00-14-4M4 4v4h4M4 13a8 8 0 0014 4M20 20v-4h-4"/>',
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
};

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const money = (v) => (v === null || v === undefined ? "—" : `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const pct = (v) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : `${v.toFixed(1)}%`);
const longDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const tagsOf = (line) => (Array.isArray(line.tags) ? line.tags : []);

// Monday to Friday between two dates, counting the end day but not the start day.
function businessDaysBetween(start, end) {
  let days = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (d < last) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days += 1;
  }
  return days;
}

// Sorts each computed line into the main table, the alternatives or "couldn't quote", and works out the totals.
function buildCustomerData(computed) {
  const rows = [];
  const couldntQuote = [];
  let theirTotal = 0;
  let ourTotal = 0;
  let unmatchedTotal = 0;
  let lastMain = null;
  const alternatives = [];

  for (const line of computed.lines) {
    const tags = tagsOf(line);
    const status = line.line_status ? quoteStages.LINE_STATUSES[line.line_status] : null;
    if (status || tags.includes("Item N/A") || tags.includes("Couldn't quote section")) {
      couldntQuote.push({
        theirItem: line.their_item || "", description: line.description || "",
        reason: status?.description || "We weren't able to quote this item.",
      });
      continue;
    }
    const qty = num(line.qty);
    const units = qty ?? 1;
    const sell = num(line.sell_price);
    const theirPrice = num(line.their_price);
    const blind = tags.includes("Blind");
    const alt = tags.includes("Suggested alternative");
    const compared = !blind && sell !== null && theirPrice !== null;
    const row = {
      ourItem: line.our_item || "", ourUom: line.our_uom || "", description: line.calc?.ourDescription || line.description || "",
      theirItem: line.their_item || "", theirUom: line.their_uom || "", qty, theirPrice: blind ? null : theirPrice, sell,
      saveEach: compared ? theirPrice - sell : null, saveTotal: compared ? (theirPrice - sell) * units : null,
      savePct: compared && theirPrice ? ((theirPrice - sell) / theirPrice) * 100 : null,
      blind, alt, note: line.customer_note || "",
    };
    rows.push(row);
    if (alt) {
      if (lastMain && lastMain.saveTotal !== null && row.saveTotal !== null) {
        alternatives.push({ from: lastMain, to: row, extra: row.saveTotal - lastMain.saveTotal });
      } else {
        alternatives.push({ from: lastMain, to: row, extra: null });
      }
      continue;
    }
    lastMain = row;
    if (compared) {
      theirTotal += theirPrice * units;
      ourTotal += sell * units;
    } else if (sell !== null) {
      unmatchedTotal += sell * units;
    }
  }
  const savings = theirTotal - ourTotal;
  const comparedCount = rows.filter((r) => !r.alt && r.saveTotal !== null).length;
  return {
    rows, couldntQuote, alternatives, theirTotal, ourTotal, savings, unmatchedTotal, comparedCount,
    savingsPct: theirTotal ? (savings / theirTotal) * 100 : null,
  };
}

function renderCustomerFile({ quote, branding, data, issuedAt }) {
  const primary = HEX.test(branding.primaryColor || "") ? branding.primaryColor : DEFAULT_PRIMARY;
  const secondary = HEX.test(branding.secondaryColor || "") ? branding.secondaryColor : DEFAULT_SECONDARY;
  const expires = new Date(issuedAt);
  expires.setDate(expires.getDate() + VALID_DAYS);
  const turnaround = quote.createdAt ? businessDaysBetween(new Date(quote.createdAt * 1000), issuedAt) : null;
  const hasLogo = branding.logoPath && !branding.logoPath.includes("quoteflow-logo.svg");
  const logo = hasLogo
    ? `<img class="logo-img" src="${esc(branding.logoPath)}" alt="${esc(branding.companyName)}"/>`
    : `<div class="logo-text">${esc(branding.companyName)}</div>`;
  const slogan = branding.slogan ? `<div class="slog">${esc(branding.slogan)}</div>` : "";
  const header = `<div class="hd"><div class="lh">${logo}${slogan}</div><div class="qt"><small>PRICE QUOTE</small><b>${esc(quote.number)}</b><span>Valid through ${esc(longDate(expires))}</span></div></div>`;
  const smallHeader = `<div class="th2"><div class="lh">${hasLogo ? `<img class="logo-sm" src="${esc(branding.logoPath)}" alt="${esc(branding.companyName)}"/>` : `<b>${esc(branding.companyName)}</b>`}</div><span>Quote ${esc(quote.number)} · ${esc(quote.accountName)}</span></div>`;
  const savedWidth = data.theirTotal ? Math.max(0, Math.min(100, (data.savings / data.theirTotal) * 100)) : 0;
  const hasComparison = data.comparedCount > 0;

  const points = [
    ["clock", "Fast turnaround", turnaround !== null ? `Your quote was ready in ${turnaround} business day${turnaround === 1 ? "" : "s"}, so you can decide sooner.` : "Your quote was prepared quickly, so you can decide sooner."],
    ["user", "One account manager", "One person who knows your account, from the first question to delivery."],
    ["shield", "Price protection", `The prices on this quote are held through ${longDate(expires)}.`],
    ["loop", "Regular savings reviews", "We review your purchasing with you on a schedule to find more savings."],
    ["box", "One consolidated order", "Fewer orders and fewer invoices to manage."],
  ].map(([icon, title, text]) => `<div class="pt"><div class="ib"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[icon]}</svg></div><div><b>${esc(title)}</b><span>${esc(text)}</span></div></div>`).join("");

  const extraTotal = data.alternatives.reduce((sum, a) => sum + (a.extra && a.extra > 0 ? a.extra : 0), 0);
  const altBox = data.alternatives.length
    ? `<div class="altbox"><div><b>${extraTotal > 0 ? `Save ${esc(money(extraTotal))} more with ${data.alternatives.length === 1 ? "a suggested alternative" : "our suggested alternatives"}` : `We suggest ${data.alternatives.length === 1 ? "an alternative" : `${data.alternatives.length} alternatives`} for you`}</b><span>${data.alternatives.length === 1 && data.alternatives[0].from ? `Switch ${esc(data.alternatives[0].from.ourItem)} to ${esc(data.alternatives[0].to.ourItem)}.` : "They're shown in green on the next page."} Tell us which ones you want when you order.</span></div>${extraTotal > 0 ? `<div class="amt">+${esc(money(extraTotal))}</div>` : ""}</div>`
    : "";

  const banner = hasComparison
    ? `<div class="ban"><div class="bl"><div class="pig">${PIGGY_BANK}</div><div><small>Your total savings</small><div class="big">${esc(money(data.savings))}</div></div><div class="vs"><b>${esc(pct(data.savingsPct))}</b><span>vs. what you pay today</span></div></div>
        <div class="br"><div class="ck">✓</div><div><b>You are getting more value</b><span>The same ${data.comparedCount} item${data.comparedCount === 1 ? "" : "s"}, matched by size and unit, for less.</span></div></div></div>
      <div class="trk"><div class="pay" style="width:${(100 - savedWidth).toFixed(1)}%"></div><div class="sav" style="width:${savedWidth.toFixed(1)}%"></div></div>
      <div class="lg"><span>You pay today <b>${esc(money(data.theirTotal))}</b></span><span class="gg">You keep <b>${esc(money(data.savings))}</b></span></div>
      <div class="strip"><div><span>You pay today</span><b>${esc(money(data.theirTotal))}</b></div><div><span>Our total</span><b>${esc(money(data.ourTotal))}</b></div><div class="g"><span>Total savings</span><b>${esc(money(data.savings))}</b></div><div class="g"><span>Overall savings</span><b>${esc(pct(data.savingsPct))}</b></div></div>`
    : `<div class="ban one"><div class="bl"><div class="pig">${PIGGY_BANK}</div><div><small>Your quote</small><div class="big">${esc(money(data.unmatchedTotal))}</div></div></div></div>`;

  let lineNo = 0;
  const tableRows = data.rows.map((r) => {
    if (!r.alt) lineNo += 1;
    const tag = r.alt ? '<span class="tagalt">Suggested alternative</span>' : "";
    return `<tr class="${r.alt ? "alt" : ""}"><td class="n">${r.alt ? "" : lineNo}</td><td>${tag}<b>${esc(r.ourItem)}</b>${r.ourUom ? ` <span class="ds-in">${esc(r.ourUom)}</span>` : ""}<div class="ds">${esc(r.description)}</div>${r.note ? `<div class="ds note">${esc(r.note)}</div>` : ""}</td>
      <td class="code">${r.blind ? "" : esc(r.theirItem)}</td><td class="r">${r.qty === null ? "—" : esc(r.qty)} ${esc(r.theirUom)}</td>
      <td class="r">${r.blind || r.theirPrice === null ? "—" : esc(money(r.theirPrice))}</td><td class="r"><b>${r.sell === null ? "To follow" : esc(money(r.sell))}</b></td>
      <td class="r sv">${r.saveTotal === null ? "—" : esc(money(r.saveTotal))}</td><td class="r sv">${r.savePct === null ? "—" : esc(pct(r.savePct))}</td></tr>`;
  }).join("");

  const couldnt = data.couldntQuote.length
    ? `<h2>Items we couldn't quote</h2><table><thead><tr><th>Your item</th><th>Description</th><th>Note</th></tr></thead><tbody>${data.couldntQuote.map((r) => `<tr><td>${esc(r.theirItem)}</td><td>${esc(r.description)}</td><td>${esc(r.reason)}</td></tr>`).join("")}</tbody></table>`
    : "";

  const notes = [
    "Our price is shown for your unit of measure, so both prices compare directly.",
    data.alternatives.length ? "Suggested alternatives are optional and are not in the totals." : "",
    data.rows.some((r) => r.blind) ? "Items shown without your price are priced for you directly and are not in the comparison totals." : "",
    `Prices are valid through ${longDate(expires)}.`,
  ].filter(Boolean).map((n) => `• ${esc(n)}`).join("<br>");

  const contactName = quote.contactName || branding.companyName;
  const contact = `<b>${esc(contactName)}</b><br>${quote.contactName ? "Your quote contact<br>" : ""}${quote.contactEmail ? esc(quote.contactEmail) : ""}`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(quote.number)} · ${esc(quote.accountName)} · Quote</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--primary:${primary};--second:${secondary};--ink:#111827;--mut:#4B5563;--line:#E5E7EB;--soft:#F5F5F5;--good:#047857;--goodbg:#ECFDF3}
@page{size:Letter;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:12px;background:#E5E7EB}
.hint{position:sticky;top:0;z-index:5;background:#111827;color:#fff;padding:10px 16px;font-size:13px;display:flex;gap:12px;align-items:center;justify-content:center}
.hint button{font:inherit;font-weight:700;background:#fff;color:#111827;border:0;border-radius:6px;padding:6px 12px;cursor:pointer}
.page{width:816px;min-height:1056px;margin:16px auto;position:relative;background:#fff;padding:0 48px 80px;break-after:page}
.page:last-child{break-after:auto}
@media print{body{background:#fff}.hint{display:none}.page{margin:0;box-shadow:none}}
.hd{height:104px;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid var(--second);margin:0 -48px;padding:0 48px}
.lh{display:flex;align-items:center;gap:16px}.logo-img{max-width:220px;max-height:60px;object-fit:contain}.logo-sm{max-width:140px;max-height:34px;object-fit:contain}
.logo-text{font-size:20px;font-weight:800;letter-spacing:-.01em}.slog{font-size:13px;font-style:italic;color:var(--mut);max-width:180px;line-height:1.3}
.qt{text-align:right}.qt small{display:block;font-size:12px;color:var(--mut);font-weight:600;letter-spacing:.06em}.qt b{font-size:30px;letter-spacing:-.02em;line-height:1.15}.qt span{display:block;font-size:12px;color:var(--mut)}
.meta{display:grid;grid-template-columns:1.5fr 1fr 1fr 1.2fr;gap:16px;padding:16px 0;border-bottom:1px solid var(--line)}
.meta label{display:block;font-size:12px;color:var(--mut);margin-bottom:2px}.meta b{font-size:13.5px;display:block;line-height:1.3}.meta span{font-size:12px;color:var(--mut)}
.ban{margin-top:20px;display:grid;grid-template-columns:1.25fr 1fr;border-radius:18px;overflow:hidden;margin-bottom:14px}.ban.one{grid-template-columns:1fr}
.bl{background:var(--primary);color:#fff;padding:22px 26px;display:flex;align-items:center;gap:18px}.pig{width:74px;flex:0 0 74px;color:#fff}
.bl small{font-size:12px;font-weight:600;color:#E5E7EB;display:block}.bl .big{font-size:44px;font-weight:800;letter-spacing:-.03em;line-height:1.05;color:#fff}
.vs{border-left:1px solid rgba(255,255,255,.3);padding-left:18px;margin-left:auto}.vs b{display:block;font-size:34px;color:#86EFAC;letter-spacing:-.02em;line-height:1.05}.vs span{font-size:12px;color:#E5E7EB}
.br{background:color-mix(in srgb,var(--primary) 8%,#fff);display:flex;align-items:center;gap:14px;padding:0 22px}.ck{flex:0 0 40px;height:40px;border-radius:50%;border:2.5px solid var(--good);color:var(--good);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800}
.br b{display:block;font-size:15px;color:var(--primary);margin-bottom:2px}.br span{font-size:12px;color:#374151;line-height:1.4}
.trk{height:18px;border-radius:9px;background:#fff;display:flex;overflow:hidden;border:1px solid var(--line)}.trk .pay{background:#9CA3AF}.trk .sav{background:#10B981}
.lg{display:flex;justify-content:space-between;margin-top:7px;font-size:12px;color:var(--mut)}.lg b{color:var(--ink)}.lg .gg b{color:var(--good)}
.strip{display:grid;grid-template-columns:repeat(4,1fr);margin-top:14px;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.strip div{padding:11px 16px;border-right:1px solid var(--line)}.strip div:last-child{border:0}.strip span{display:block;font-size:12px;color:var(--mut);margin-bottom:2px}.strip b{font-size:21px;letter-spacing:-.02em}.strip .g{background:var(--goodbg)}.strip .g b,.strip .g span{color:var(--good)}
.see{font-size:12px;color:var(--mut);margin-top:7px}.see b{color:var(--ink)}
h2{font-size:16px;letter-spacing:-.01em;margin:22px 0 11px;padding-bottom:7px;border-bottom:1px solid var(--line)}
.pnl{display:grid;grid-template-columns:1fr 1fr;gap:12px 26px}.pt{display:flex;gap:12px;align-items:flex-start}
.ib{flex:0 0 34px;height:34px;border-radius:50%;background:var(--soft);color:var(--ink);display:flex;align-items:center;justify-content:center}.ib svg{width:18px;height:18px}
.pt b{display:block;font-size:13px;margin-bottom:1px}.pt span{font-size:12px;color:var(--mut);line-height:1.4}
.altbox{margin-top:16px;background:var(--goodbg);border:1px solid #A7F3D0;border-radius:14px;padding:12px 18px;display:flex;gap:16px;align-items:center}
.altbox b{display:block;font-size:13.5px;color:var(--good);margin-bottom:2px}.altbox span{font-size:12px;color:#374151;line-height:1.4}.altbox .amt{margin-left:auto;font-size:22px;font-weight:800;color:var(--good);white-space:nowrap}
.next{position:absolute;left:48px;right:48px;bottom:34px;border-top:2px solid var(--ink);padding-top:12px;display:flex;justify-content:space-between;align-items:center}
.next b{font-size:15px}.next span{color:var(--mut);font-size:12px;display:block;margin-top:2px}.btn{background:var(--second);color:#fff;font-weight:700;font-size:13px;padding:10px 18px;border-radius:9px}
.th2{height:56px;display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid var(--second);margin:0 -48px;padding:0 48px;font-size:12px;color:var(--mut)}.th2 b{color:var(--ink);font-size:14px}
table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{break-inside:avoid}
th{font-size:12px;font-weight:700;color:#374151;text-align:left;padding:9px 8px;background:var(--soft);border-bottom:1px solid #D1D5DB;line-height:1.2}
td{font-size:12px;padding:8px;border-bottom:1px solid #EEE;vertical-align:top}.r{text-align:right;white-space:nowrap}.code{white-space:nowrap}th.r{text-align:right}.n{color:var(--mut);width:24px}
.ds{font-size:12px;color:var(--mut);margin-top:1px}.ds-in{color:var(--mut);font-weight:500}.note{font-style:italic}.sv{color:var(--good);font-weight:700}
tr.alt td{background:var(--goodbg);border-bottom:1px solid #A7F3D0}.tagalt{display:inline-block;font-size:11px;font-weight:700;color:#065F46;background:#D1FAE5;border-radius:6px;padding:1px 7px;margin-bottom:3px}
.recon{margin-top:18px;display:grid;grid-template-columns:1fr 320px;gap:24px;break-inside:avoid}.nt{font-size:12px;color:var(--mut);line-height:1.6}.nt b{color:var(--ink)}
.rc{border:1px solid var(--line);border-radius:14px;overflow:hidden}.rc div{display:flex;justify-content:space-between;padding:9px 16px;font-size:13px;border-bottom:1px solid #F0F0F0}
.rc div:last-child{border:0;background:var(--goodbg);color:var(--good);font-weight:800;font-size:15px;padding:12px 16px}
.steps{display:grid;gap:14px;margin-top:4px}.stp{display:flex;gap:14px;align-items:flex-start}.stp i{flex:0 0 30px;height:30px;border-radius:50%;background:var(--primary);color:#fff;font-style:normal;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:13px}
.stp b{font-size:14px;display:block;margin-bottom:1px}.stp span{font-size:12.5px;color:var(--mut);line-height:1.45}
.terms{display:grid;grid-template-columns:1fr 1fr;gap:12px}.tm{border:1px solid var(--line);border-radius:12px;padding:12px 14px}.tm b{display:block;font-size:13px;margin-bottom:3px}.tm span{font-size:12px;color:var(--mut);line-height:1.45}
.contact{margin-top:24px;background:var(--soft);border-radius:16px;padding:22px 28px;display:flex;justify-content:space-between;align-items:center;gap:30px}
.contact p{font-size:13px;line-height:1.55;color:#374151;max-width:380px}.contact h3{font-size:19px;margin-bottom:5px;letter-spacing:-.01em}.cc{font-size:13px;line-height:1.7;text-align:right}.cc b{font-size:16px}
</style></head><body>
<div class="hint">Use your browser's print dialog and choose <b>Save as PDF</b>. <button type="button" onclick="window.print()">Print or save as PDF</button></div>
<div class="page">${header}
 <div class="meta"><div><label>Prepared for</label><b>${esc(quote.accountName)}</b><span>${esc([quote.accountNumber, quote.shipTo].filter(Boolean).join(" · "))}</span></div><div><label>Quote date</label><b>${esc(longDate(issuedAt))}</b></div><div><label>Expires</label><b>${esc(longDate(expires))}</b><span>${VALID_DAYS} days</span></div><div><label>Your quote contact</label><b>${esc(contactName)}</b><span>${esc(quote.contactEmail || "")}</span></div></div>
 ${banner}
 <div class="see">Every line is shown on the next page, with our item beside yours. <b>Check any line.</b></div>
 <h2>More than a price: we save you time, too</h2><div class="pnl">${points}</div>
 ${altBox}
 <div class="next"><div><b>Ready to order?</b><span>How to accept this quote is on the last page. Valid through ${esc(longDate(expires))}.</span></div><div class="btn">Accept by ${esc(expires.toLocaleDateString("en-US", { month: "short", day: "numeric" }))}</div></div>
</div>
<div class="page">${smallHeader}
 <h2 style="margin-top:22px">Line-by-line comparison</h2>
 <table><thead><tr><th></th><th>Our item</th><th>Your item</th><th class="r">Quantity</th><th class="r">Your price</th><th class="r">Our price</th><th class="r">You save ($)</th><th class="r">You save (%)</th></tr></thead><tbody>${tableRows || '<tr><td colspan="8">No lines yet.</td></tr>'}</tbody></table>
 ${couldnt}
 <div class="recon"><div class="nt"><b>Notes</b><br>${notes}</div>
  ${hasComparison ? `<div class="rc"><div><span>You pay today</span><span>${esc(money(data.theirTotal))}</span></div><div><span>Our total</span><b>${esc(money(data.ourTotal))}</b></div><div><span>Total savings</span><span class="sv">${esc(money(data.savings))}</span></div><div><span>You save</span><span>${esc(pct(data.savingsPct))}</span></div></div>` : ""}</div>
</div>
<div class="page">${smallHeader}
 <h2 style="margin-top:22px">How to accept this quote</h2>
 <div class="steps"><div class="stp"><i>1</i><div><b>Reply or call by ${esc(longDate(expires))}</b><span>Send your purchase order number, or tell us to proceed.${data.alternatives.length ? " Tell us which suggested alternatives you want." : ""}</span></div></div>
 <div class="stp"><i>2</i><div><b>We confirm your order</b><span>We check the items, the delivery address and the delivery date with you before anything ships.</span></div></div>
 <div class="stp"><i>3</i><div><b>Your order is delivered</b><span>One consolidated order and one invoice.</span></div></div></div>
 <h2>Terms and delivery</h2>
 <div class="terms"><div class="tm"><b>Delivery</b><span>Your delivery date is confirmed when you order.</span></div><div class="tm"><b>Substitutions</b><span>If an item is unavailable, we contact you before substituting anything.</span></div><div class="tm"><b>Payment</b><span>Terms as agreed on your account. Taxes are added where they apply.</span></div><div class="tm"><b>Returns</b><span>Returns follow the policy on your account.</span></div></div>
 <div class="contact"><div><h3>Thank you for considering us.</h3><p>We would be glad to earn your business. Call or write to place your order, or to adjust anything on this quote.</p></div><div class="cc">${contact}</div></div>
</div>
<script>window.addEventListener("load",function(){if(!/[?&]noprint=1/.test(location.search))setTimeout(function(){window.print()},400)});</script>
</body></html>`;
}

function register(app, { auth, database }) {
  const knex = database.connection;
  const access = auth.requireRole("Quoter", "Manager", "Reviser", "Qualifier");

  app.get("/api/qs/:id/customer-file", access, async (request, response) => {
    const detail = await database.quotes.getDetail(request.params.id);
    if (!detail) return response.status(404).json({ error: "Quote not found." });
    const state = await knex("qs_quotes").where({ quote_id: detail.id }).first();
    const lines = await knex("qs_lines").where({ quote_id: detail.id }).orderBy("position");
    const files = {};
    for (const row of await knex("qs_pricing_files").where({ quote_id: detail.id })) {
      files[row.kind] = { headers: JSON.parse(row.headers_json || "[]"), rows: JSON.parse(row.rows_json || "[]") };
    }
    const computed = quoteStages.computeQuote(lines, files, state ? state.cost_column : null);
    const settings = await database.settings.get();
    const branding = {
      companyName: settings.company_name || "QuoteFlow", logoPath: settings.logo_path || "",
      primaryColor: settings.brand_primary_color, secondaryColor: settings.brand_secondary_color, slogan: settings.brand_slogan || "",
    };
    const quote = {
      number: detail.quote_number, accountName: detail.accountName || detail.company_name || "Customer", accountNumber: detail.accountNumber || "",
      shipTo: [detail.ship_city, detail.ship_state].filter(Boolean).join(", "), createdAt: detail.created_at,
      contactName: detail.assignedToName || "", contactEmail: detail.assignedToEmail || "",
    };
    response.set("Cache-Control", "no-store");
    response.type("html").send(renderCustomerFile({ quote, branding, data: buildCustomerData(computed), issuedAt: new Date() }));
    return undefined;
  });
}

module.exports = { register, buildCustomerData, renderCustomerFile, DEFAULT_PRIMARY, DEFAULT_SECONDARY };
