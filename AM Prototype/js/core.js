// ================= core helpers =================
const I = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tone = t => `background:var(--status-${t}-bg);color:var(--status-${t}-fg)`;
const pill = (t, l) => `<span class="pill" style="${tone(t)}"><span class="dot" style="background:var(--status-${t}-dot)"></span>${l}</span>`;
const av = (txt, c, s = 32, sq = false) => `<span class="av${sq ? ' sq' : ''}" style="width:${s}px;height:${s}px;font-size:${Math.round(s * .38)}px;background:${CC[c] || CC.slate}">${txt}</span>`;
const tile = (h, n, s = 32, is = 16) => `<span class="tile" style="width:${s}px;height:${s}px;background:var(--category-${h}-bg);color:var(--category-${h}-fg)">${I(n, is)}</span>`;
const btn = (cls, label, icon, attrs = '') => `<button class="btn ${cls}" ${attrs}>${icon ? I(icon, cls.includes('sm') ? 16 : 18) : ''}${label}</button>`;
const money = (n, d = 2) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const kmoney = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : money(n, 0);
const tg = (on, attrs = '', dis = false) => `<button class="tg${on ? ' on' : ''}${dis ? ' dis' : ''}" role="switch" aria-checked="${!!on}" ${dis ? 'disabled' : ''} ${attrs}></button>`;
const cbx = (on, attrs = '') => `<button class="cbx${on ? ' on' : ''}" role="checkbox" aria-checked="${!!on}" ${attrs}>${on ? I('check', 14) : ''}</button>`;
const meter = (n, t = 'success') => `<div class="meter">${[1, 2, 3, 4, 5].map(i => `<span style="${i <= n ? `background:var(--status-${n <= 1 ? 'danger' : n === 2 ? 'warning' : t}-icon)` : ''}"></span>`).join('')}</div>`;
// Routing keeps its own copy of the current screen, so links work even where the page
// can't change its address (some file previews and embedded viewers block that).
let ROUTE = (() => { try { return location.hash && location.hash.length > 2 ? location.hash : '#/dash/today'; } catch (e) { return '#/dash/today'; } })();
const go = h => {
  const changed = h !== ROUTE; ROUTE = h;
  try { if (location.hash !== h) history.pushState(null, '', h); } catch (e) { }
  if (typeof closePops === 'function') closePops();
  render(); if (changed) window.scrollTo(0, 0);
};
const fmtTalk = s => `${Math.floor(s / 3600)}h ${Math.round(s % 3600 / 60)}m`;

// ================= UI state =================
const UI = {
  theme: 'light', accent: 'ink', quoteIdx: 0, workTab: 'tasks', logFilter: 'All', custFilter: 'All', custQ: '',
  feedFilter: 'All', feedMore: false, sumTab: 'overview', noteText: '',
  usersInactive: false, usersFilter: 'All', usersQ: '', userOpen: 'u2',
  addrOpen: 'a1', addrEdit: null, addrDeact: false, addrFilter: 'All', addrQ: '',
  gp: { item: 'CF-2LB', unit: 0, qty: 10, costType: 'Replacement cost', mode: 'price', price: 26.49, margin: null, hist: false },
  promo: { id: 'p1', idx: 0, outcome: 'Interested', note: '' },
  oppDone: {}, reqFilter: 'All', pendingSettings: {}, ordersTab: 'Open', quotesTab: 'Open', billTab: 'Balance and aging', specTab: 'All agreements',
  cards: { u2: [{ h: 'Marcus Hale', n: 'AP corporate card', t: 'VISA', l: '4417', e: '09/2028', d: true }, { h: 'Marcus Hale', n: 'Backup Amex', t: 'AMEX', l: '1009', e: '03/2027', d: false }, { h: 'Harbor Medical Group', n: 'Old purchasing card', t: 'MC', l: '8820', e: '07/2026', d: false, x: true }] },
  favOpen: 0, notifRead: false, audit: [],
};

// ================= routing =================
function parse() {
  const p = ROUTE.slice(2).split('/');
  return { area: p[0] || 'dash', a: p[1], b: p[2], c: p[3], d: p[4] };
}
const onAddr = () => { let h = ''; try { h = location.hash; } catch (e) { } if (h && h.length > 2 && h !== ROUTE) { ROUTE = h; closePops(); render(); window.scrollTo(0, 0); } };
window.addEventListener('hashchange', onAddr); window.addEventListener('popstate', onAddr);

// ================= shell =================
const MAIN = [['layout-dashboard', 'Dashboard', '#/dash/today', 'dash'], ['building-2', 'My customers', '#/customers', 'customers', () => myAccounts().length], ['calendar-days', 'Planner & calendar', '#/planner', 'planner', () => TASKS.filter(t => !t.done && t.when !== 'later').length], ['inbox', 'My requests', '#/requests', 'requests', () => REQUESTS.filter(r => r.status !== 'Completed' && r.status !== 'Declined').length], ['history', 'History feed', '#/page/history', 'history'], ['badge-dollar-sign', 'Quotes', '#/page/quotes', 'quotes', () => 6], ['ticket', 'Purchasing cases', '#/page/cases', 'cases', () => 2], ['tags', 'Margin management', '#/page/margin', 'margin'], ['calculator', 'Margin calculator', '#/a/104218/gp', 'gpm'], ['chart-column', 'Reports and analytics', '#/page/reports', 'reports'], ['messages-square', 'Messenger center', '#/page/messenger', 'messenger', () => 2], ['kanban', 'Project tracker', '#/page/projects', 'projects'], ['hand-coins', 'AR dashboard', '#/page/ar', 'ar'], ['users', 'Team dashboard', '#/page/team', 'team'], ['graduation-cap', 'Training & development', '#/page/training', 'training'], ['book-open', 'KB', '#/page/kb', 'kb']];
const ACCT_MENU = [['summary', 'layout-dashboard', 'Account summary'], ['users', 'users', 'Users'], ['addresses', 'map-pin', 'Addresses'], ['orders', 'clipboard-list', 'Orders'], ['quotes', 'badge-dollar-sign', 'Quotes'], ['gp', 'calculator', 'GP calculator'], ['subs', 'calendar-sync', 'Subscriptions'], ['billing', 'wallet', 'Billing parameters'], ['cases', 'ticket', 'Purchasing cases'], ['opps', 'target', 'Opportunities'], ['analytics', 'chart-column', 'Analytics and reports'], ['settings', 'settings', 'Account settings'], ['specialty', 'concierge-bell', 'Specialty services'], ['messages', 'messages-square', 'Message center'], ['rep', 'user', 'Rep view']];
const ACCT_PROPOSED = [['pricing', 'tags', 'Pricing and margin'], ['activities', 'activity', 'Activities']];
function acctCount(a, k) {
  if (a.id !== '104218') return '';
  return { users: [peopleOf(a).filter(p => p.status !== 'Inactive').length], addresses: [addrOf(a).delivery.filter(d => d.active).length + 1], orders: [2], quotes: [3], subs: [1], cases: [1], opps: [OPPS.filter(o => o.state === 'new').length], pricing: [2, 'warn'] }[k] || '';
}
function sideMain(active) {
  return `<nav class="side" aria-label="Main menu">
  <div class="brand"><span class="logo"></span><div class="bt hide-t"><b>Company</b><span>Sales</span></div></div>
  <div class="loc hide-t">${I('map-pin', 16)}<span style="flex:1">Boston branch</span>${I('chevron-down', 14)}</div>
  <div class="ovl hide-t">Main menu</div>
  ${MAIN.map(([i, l, h, k, c]) => { const n = c ? c() : 0; return `<a class="nav${k === active ? ' on' : ''}" href="${h}" title="${l}">${I(i, 18)}<span class="lbl">${l}</span>${n ? `<span class="ct">${n}</span>` : ''}</a>`; }).join('')}
  <button class="newacct hide-t" data-a="newAccount">${I('plus', 16)}Create new account</button>
  <div style="flex:1"></div></nav>`;
}
function sideAcct(a, sec) {
  const item = ([k, i, l]) => { const c = acctCount(a, k); return `<a class="nav${k === sec ? ' on' : ''}" href="${k === 'rep' ? '#/dash/today' : `#/a/${a.id}/${k}`}" title="${l}">${I(i, 18)}<span class="lbl">${l}</span>${c ? `<span class="ct${c[1] ? ' warn' : ''}">${c[0]}</span>` : ''}</a>`; };
  return `<nav class="side" aria-label="Account menu">
  <div class="brand"><span class="logo"></span><div class="bt hide-t"><b>Company</b><span>Sales</span></div></div>
  <a class="nav" href="#/customers" style="color:var(--text-sidebar-muted);margin-top:8px" title="My customers">${I('chevron-left', 18)}<span class="lbl">My customers</span></a>
  <div class="acard">${av(a.ini, a.c, 36, a.type !== 'account-personal')}<div style="min-width:0"><div class="t">${esc(a.name)}</div><div class="s">Account ${a.id}</div></div></div>
  <div class="ovl hide-t">Account</div>
  ${ACCT_MENU.map(item).join('')}
  <div class="ovl hide-t" style="margin-top:18px" title="Open question C-01">Proposed (C-01)</div>
  ${ACCT_PROPOSED.map(item).join('')}
  <div style="flex:1"></div></nav>`;
}
function topbar() {
  const unread = UI.notifRead ? 0 : 4;
  return `<header class="top">
  <div class="search" id="searchbox"><select aria-label="Search scope" id="scope"><option>All</option><option>Account number</option><option>Sales order</option><option>Quote</option><option>User</option></select>
   <label class="q">${I('search', 16)}<input id="q" placeholder="Search accounts, orders, quotes, users" autocomplete="off" data-in="search"><span class="kbd">⌘K</span></label>
   <div id="searchpop"></div></div>
  <div style="flex:1"></div>
  <button class="ib hide-p" title="Log a call" data-a="logCall">${I('phone', 20)}</button>
  <button class="ib" title="Notifications" data-a="notifs">${I('bell', 20)}${unread ? `<span class="badge">${unread}</span>` : ''}</button>
  <button class="ib" title="Display settings" data-a="display">${I('settings', 20)}</button>
  <span class="hide-p">${av('DB', 'teal', 32)}</span>
  </header>`;
}
function bottomNav(area) {
  const B = [['layout-dashboard', 'Dashboard', '#/dash/today', 'dash'], ['building-2', 'Customers', '#/customers', 'customers'], ['calendar-days', 'Planner', '#/planner', 'planner'], ['inbox', 'Requests', '#/requests', 'requests'], ['phone', 'Log call', null, 'call']];
  return `<nav class="bottomnav">${B.map(([i, l, h, k]) => h ? `<a href="${h}" class="${k === area || (k === 'customers' && area === 'a') ? 'on' : ''}"><span class="pi">${I(i, 22)}</span>${l}</a>` : `<button data-a="logCall"><span class="pi">${I(i, 22)}</span>${l}</button>`).join('')}</nav>`;
}

// ================= render =================
function render() {
  document.documentElement.dataset.theme = UI.theme;
  if (UI.accent === 'ink') delete document.documentElement.dataset.accent; else document.documentElement.dataset.accent = UI.accent;
  const r = parse();
  let side, body;
  if (r.area === 'a') {
    const a = acct(r.a) || ACCOUNTS[0];
    const sec = r.b || 'summary';
    side = sideAcct(a, sec);
    body = renderAccount(a, sec, r);
  } else {
    side = sideMain(r.area === 'dash' ? 'dash' : r.area === 'page' ? r.a : r.area);
    body = r.area === 'dash' ? renderDash(r.a || 'today')
      : r.area === 'customers' ? renderCustomers()
        : r.area === 'planner' ? renderPlanner()
          : r.area === 'requests' ? renderRequests()
            : renderPage(r.a);
  }
  document.getElementById('app').innerHTML = `<div class="app">${side}<div class="main">${topbar()}<main class="work" id="work">${body}</main></div></div>${bottomNav(r.area)}`;
  afterRender();
}
function afterRender() {
  const ta = document.getElementById('noteText'); if (ta) ta.value = UI.noteText;
}

// ================= dashboard =================
function ringSvg(done, total, size = 184, sw = 14) {
  const r = (size - sw) / 2 - 2, C = 2 * Math.PI * r, c = size / 2, pct = total ? Math.round(done / total * 100) : 100, full = done >= total;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" role="img" aria-label="${pct}% of today's tasks and follow-ups done"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--surface-pressed)" stroke-width="${sw}"/><circle class="p" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${full ? 'var(--status-success-icon)' : 'var(--action-control)'}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(C * Math.min(done / (total || 1), 1)).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/></svg>
  <div class="c"><div style="font-size:${size > 150 ? 36 : 26}px;line-height:1.15;font-weight:600;font-variant-numeric:tabular-nums">${full ? I('check', size > 150 ? 40 : 28) : pct + '%'}</div><div class="cap">${full ? 'All done' : `${done} of ${total} done`}</div></div></div>`;
}
const owned = () => ACCOUNTS.filter(a => myRole(a) === 'Account owner');
const ownedYtd = () => owned().reduce((t, a) => t + a.ytd, 0);
const ownedMargin = () => (owned().reduce((t, a) => t + a.ytd * a.margin, 0) / ownedYtd()).toFixed(1);
const todayTasks = () => TASKS.filter(t => t.when === 'today' || t.when === 'overdue');
function dashHeader(tab) {
  const promoN = PROMOS.length;
  return `<div class="row" style="align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:6px">
  <div class="row" style="gap:16px">${av('DB', 'teal', 56)}<div><div style="font-size:26px;line-height:32px;font-weight:600">Welcome back, Dana</div>
  <div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap"><span class="tag">Inside sales representative</span><span class="tag">${I('sprout', 14)}Farmer</span><span class="tag" style="color:var(--category-amber-fg)">${I('rank-gold-star', 16)}<span style="color:var(--text-primary)">Gold Star</span></span><span class="cap hide-p">Rep ID 900420 · Monday, October 12</span></div></div></div>
  <div class="row" style="gap:28px"><div style="text-align:right"><div style="font-size:24px;line-height:30px;font-weight:600;font-variant-numeric:tabular-nums">${money(ownedYtd(), 0)}</div><div class="cap">Sales YTD</div></div><div style="text-align:right"><div style="font-size:24px;line-height:30px;font-weight:600">${ownedMargin()}%</div><div class="cap">Margin</div></div></div></div>
  <div class="tabs" role="tablist">${[['today', 'Today'], ['promotions', 'Promotions', promoN], ['performance', 'Performance']].map(([k, l, n]) => `<button class="${k === tab ? 'on' : ''}" onclick="go('#/dash/${k}')">${l}${n ? `<span class="tag" style="height:20px;padding:0 7px">${n}</span>` : ''}</button>`).join('')}</div>`;
}
function renderDash(tab) {
  if (tab === 'promotions') return dashHeader(tab) + renderPromotions();
  if (tab === 'performance') return dashHeader(tab) + emptyState('chart-line', 'Performance is planned for Release 3', 'Sales and margin by month, calls and talk time by week, task completion and promotion results will live here.');
  const tt = todayTasks(), tasks = tt.filter(t => !t.followUp), fus = tt.filter(t => t.followUp);
  const done = tt.filter(t => t.done).length, left = tt.length - done, overdue = tt.filter(t => t.when === 'overdue' && !t.done).length;
  const calls = STATS.callsOut + STATS.callsIn;
  const stat = (icon, h, l, v, s) => `<div style="padding:16px 20px;border-top:1px solid var(--border-subtle)"><div class="row" style="gap:8px">${tile(h, icon, 28, 15)}<span class="ovl">${l}</span></div><div class="fv" style="margin-top:10px;font-size:24px;line-height:30px">${v}</div><div class="fs">${s}</div></div>`;
  const max = Math.max(...HOURS.map(h => h[1]));
  const quote = `<div class="card" style="background:var(--surface-accent-subtle);border-color:transparent;display:flex;align-items:center;gap:16px;padding:16px 22px;margin-bottom:20px"><span style="color:var(--text-link);display:flex">${I('quote', 26)}</span><div style="flex:1"><div style="font-size:17px;line-height:26px;font-weight:500">${QUOTES_LINES[UI.quoteIdx % QUOTES_LINES.length]}</div><div class="cap" style="margin-top:2px">Today's motivation · a new line every morning</div></div><button class="ib" title="Show another" data-a="nextQuote">${I('refresh-cw', 18)}</button></div>`;
  const prog = `<div class="card s4" style="display:flex;flex-direction:column"><div class="ch"><h3>Today's progress</h3><span class="cap">Tasks and follow-ups</span></div>
   <div class="row" style="gap:22px;flex:1;flex-wrap:wrap;justify-content:center">${ringSvg(done, tt.length)}<div style="flex:1;min-width:160px">
    ${[['Tasks', tasks], ['Follow-ups', fus]].map(([l, arr]) => { const d = arr.filter(t => t.done).length; return `<div style="margin-bottom:16px"><div class="row" style="justify-content:space-between;font-size:14px"><span style="font-weight:500">${l}</span><b style="font-variant-numeric:tabular-nums">${d} / ${arr.length}</b></div><div class="bar" style="margin-top:6px"><div style="width:${arr.length ? d / arr.length * 100 : 0}%"></div></div></div>`; }).join('')}
    <div class="cap" style="line-height:18px">${left ? `${left} left. Check items off in My work today and the ring closes when everything is done.` : 'Everything due today is done. Nice work.'}</div></div></div>
   ${overdue ? `<div class="row" style="gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border-subtle);font-size:13px"><span style="color:var(--status-danger-icon);display:flex">${I('octagon-alert', 16)}</span><span><b>${overdue} overdue</b> from Friday, carried into today</span></div>` : ''}</div>`;
  const act = `<div class="card s8" style="padding:0;display:flex;flex-direction:column"><div class="ch" style="padding:18px 20px 4px;margin:0"><h3>Today's activity</h3><span class="cap">Updated live</span></div>
   <div style="display:flex;flex-wrap:wrap;flex:1"><div style="flex:3;min-width:300px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
    ${stat('phone', 'blue', 'Calls', calls, `${STATS.callsOut} outgoing · ${STATS.callsIn} incoming`)}${stat('timer', 'slate', 'Talk time', fmtTalk(STATS.talk), `Average call ${Math.floor(STATS.talk / calls / 60)}m ${Math.round(STATS.talk / calls % 60)}s`)}${stat('building-2', 'violet', 'Accounts touched', STATS.accounts, '4 new this week')}${stat('mail', 'teal', 'Emails sent', STATS.emails, '3 replies so far')}${stat('badge-dollar-sign', 'orange', 'Quotes sent', STATS.quotes, money(STATS.quotesTotal) + ' total')}${stat('shopping-cart', 'green', 'Orders placed', STATS.orders, money(STATS.ordersTotal) + ' total')}</div>
    <div style="flex:1;min-width:220px;border-left:1px solid var(--border-subtle);border-top:1px solid var(--border-subtle);padding:16px 20px;display:flex;flex-direction:column"><span class="ovl">Calls by hour</span>
     <div style="display:flex;align-items:flex-end;gap:6px;height:64px;margin-top:auto">${HOURS.map(([h, n]) => `<div title="${h}:00 · ${n} calls" style="flex:1;border-radius:3px 3px 0 0;height:${n ? n / max * 60 + 4 : 2}px;background:${n ? 'var(--chart-series-1)' : 'var(--surface-pressed)'}"></div>`).join('')}</div>
     <div style="display:flex;gap:6px;margin-top:6px">${HOURS.map(([h]) => `<span class="cap" style="flex:1;text-align:center;font-size:11px">${h}</span>`).join('')}</div><div class="cap" style="margin-top:10px">Busiest: 9–10 AM</div></div></div></div>`;
  const W = { tasks: ['Today\'s tasks', tt.filter(t => !t.followUp)], fu: ['Follow-ups', tt.filter(t => t.followUp)], quotes: ['Open quotes', null], calls: ['Sales calls', null] };
  const taskRow = t => { const a = acct(t.acct); const od = t.when === 'overdue' && !t.done; const st = t.done ? pill('success', 'Done') : od ? pill('danger', 'Overdue') : t.followUp ? pill('info', 'Follow-up') : pill('neutral', 'To do'); return `<div class="row" style="padding:12px 0;border-bottom:1px solid var(--border-subtle)">${cbx(t.done, `data-a="toggleTask" data-id="${t.id}" aria-label="Mark ${esc(t.title)} done"`)}<span style="color:var(--icon-default);display:flex">${I(t.icon, 18)}</span><div style="flex:1;min-width:0"><div style="font-weight:500;font-size:14px" class="${t.done ? 'done-t' : ''}">${esc(t.title)}</div><a class="cap" href="#/a/${a.id}/summary">${esc(a.name)} · <span class="mono" style="font-size:11px">${a.id}</span></a></div><span class="hide-p" style="font-size:13px;color:${od ? 'var(--status-danger-fg)' : 'var(--text-secondary)'}">${t.due}</span><span style="min-width:96px;display:flex;justify-content:flex-end">${st}</span></div>`; };
  let workBody;
  if (UI.workTab === 'quotes') workBody = `<div class="tablewrap"><table><tr><th>Quote</th><th>Account</th><th class="num">Total</th><th>Status</th></tr>${QUOTES.filter(q => q[7] !== 'Expired' && q[7] !== 'Accepted').map(q => `<tr class="click" onclick="go('#/a/104218/quotes')"><td class="mono">${q[0]}</td><td>Harbor Medical Group</td><td class="num">${money(q[3])}</td><td>${pill(q[6], q[7])}</td></tr>`).join('')}</table></div>`;
  else if (UI.workTab === 'calls') workBody = LOG.filter(l => l[2].startsWith('phone') || l[2] === 'voicemail').map(logRow).join('');
  else { const list = W[UI.workTab][1]; workBody = list.length ? list.map(taskRow).join('') : `<div class="empty" style="padding:24px">Nothing here yet.</div>`; }
  const work = `<div class="card" style="padding:18px 20px 8px"><div class="ch" style="margin-bottom:4px"><h3>My work today</h3>${btn('neutral sm', 'Create task', 'plus', 'data-a="createTask"')}</div>
   <div class="tabs" style="margin:0 0 4px">${Object.entries({ tasks: W.tasks[1].length, fu: W.fu[1].length, quotes: 3, calls: calls }).map(([k, n]) => `<button class="${UI.workTab === k ? 'on' : ''}" data-a="workTab" data-k="${k}">${W[k][0]}<span class="tag" style="height:20px;padding:0 7px">${n}</span></button>`).join('')}</div>${workBody}<div style="height:8px"></div></div>`;
  const touched = `<div class="card" style="margin-top:20px;padding:18px 20px 10px"><div class="ch" style="margin-bottom:6px"><div><h3>Recently touched</h3><div class="cap">Accounts and people you contacted today, newest first</div></div><a class="lk" href="#/page/history">History feed</a></div>
   <div class="tablewrap"><table><tr><th>Account</th><th class="hide-p">Contact</th><th>Last action</th><th>Time</th></tr>${TOUCHED.slice(0, 6).map(([id, p, i, a2, t]) => { const a = acct(id); return `<tr class="click" onclick="go('#/a/${id}/summary')"><td><span class="row" style="gap:10px">${av(a.ini, a.c, 28, true)}<b style="font-weight:600">${esc(a.name)}</b></span></td><td class="hide-p">${esc(p)}</td><td><span class="row" style="gap:6px"><span style="color:var(--icon-default);display:flex">${I(i, 15)}</span>${a2}</span></td><td style="color:var(--text-secondary)">${t}</td></tr>`; }).join('')}</table></div></div>`;
  const promos = `<div class="card" style="margin-bottom:20px"><div class="ch"><div><h3>My promotions</h3><div class="cap">Campaigns you're working, including accounts you're helping other reps with</div></div><a class="lk" href="#/dash/promotions">All promotions</a></div>
   ${PROMOS.map(p => { const t = promoTotals(p); return `<div style="padding:14px 0;border-top:1px solid var(--border-subtle)"><div class="row" style="align-items:flex-start">${tile(p.h, p.icon, 36, 18)}<div style="flex:1;min-width:0"><div class="row" style="gap:8px;flex-wrap:wrap"><b style="font-size:14px">${p.name}</b>${pill(...p.status)}</div><div class="cap" style="margin-top:2px">${p.rule} · ${p.ends}</div></div>${btn('secondary sm', 'Work this list', 'list-checks', `data-a="workPromo" data-id="${p.id}"`)}</div>
    <div class="row" style="gap:12px;margin:10px 0 0 48px"><div class="bar" style="flex:1"><div style="width:${t.contacted / p.size * 100}%"></div></div><span style="font-size:12px;font-weight:600;font-variant-numeric:tabular-nums">${t.contacted} / ${p.size} contacted</span></div></div>`; }).join('')}</div>`;
  const log = `<div class="card"><div class="ch"><h3>Activity log</h3><div class="chips">${['All', 'Calls', 'Emails', 'Orders'].map(c => `<button class="chip${UI.logFilter === c ? ' on' : ''}" style="height:28px" data-a="logFilter" data-k="${c}">${c}</button>`).join('')}</div></div>
   ${LOG.filter(l => UI.logFilter === 'All' || (UI.logFilter === 'Calls' ? (l[2].startsWith('phone') || l[2] === 'voicemail') : UI.logFilter === 'Emails' ? l[2] === 'mail' : (l[2] === 'shopping-cart' || l[2] === 'badge-dollar-sign'))).slice(0, 7).map(logRow).join('')}</div>`;
  return dashHeader(tab) + quote + `<div class="grid" style="margin-bottom:20px">${prog}${act}</div><div class="grid"><div class="s7">${work}${touched}</div><div class="s5">${promos}${log}</div></div>`;
}
const logRow = ([tm, h, i, t, d, tn, st]) => `<div class="feed">${tile(h, i, 32, 16)}<div style="flex:1;min-width:0"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px;font-size:13px"><span>${t}</span><span class="cap" style="white-space:nowrap">${tm}</span></div><div class="cap" style="margin-top:2px">${d}</div>${st ? `<div style="margin-top:6px">${pill(tn, st)}</div>` : ''}</div></div>`;

// ================= promotions =================
function promoTotals(p) {
  const t = { ...p.base, contacted: p.base.contacted };
  p.list.forEach(id => { const o = (PROMO_STATE[p.id] || {})[id]; if (o) { t.contacted++; if (o === 'Interested') t.interested++; if (o === 'Ordered') { t.ordered++; t.total += 612.40; } } });
  return t;
}
function renderPromotions() {
  const p = PROMOS.find(x => x.id === UI.promo.id), t = promoTotals(p), st = PROMO_STATE[p.id] || {};
  const list = p.list.map(id => acct(id)); const idx = Math.min(UI.promo.idx, list.length - 1); const cur = list[idx];
  const owner = EMP[cur.owner];
  const contact = (peopleOf(cur)[0]) || {};
  const camp = `<div class="card" style="padding:20px 24px"><div class="row" style="align-items:flex-start;gap:16px;flex-wrap:wrap">${tile(p.h, p.icon, 52, 26)}<div style="flex:1;min-width:240px"><div class="row" style="gap:10px;flex-wrap:wrap"><span style="font-size:22px;line-height:28px;font-weight:600">${p.name}</span>${pill(...p.status)}</div>
   <div style="font-size:14px;color:var(--text-secondary);margin-top:4px">${p.offer} · code <span class="mono" style="color:var(--text-primary)">${p.code}</span></div>
   <div class="row" style="gap:16px;margin-top:8px;font-size:13px;color:var(--text-tertiary);flex-wrap:wrap"><span class="row" style="gap:6px">${I('list-filter', 14)}Who's on the list: ${p.rule}</span><span class="row" style="gap:6px">${I('calendar-range', 14)}${p.dates}</span><span class="row" style="gap:6px">${I('megaphone', 14)}Set up by ${p.by}</span></div></div>
   <div class="row" style="gap:8px">${btn('neutral', 'Export list', 'download', 'data-a="toast" data-msg="List exported to CSV"')}</div></div>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;margin-top:18px;border-top:1px solid var(--border-subtle);padding-top:16px">${[['Your list', p.size, `${p.size - p.assisting} yours · ${p.assisting} assisting`], ['Contacted', t.contacted, `${Math.round(t.contacted / p.size * 100)}% of the list`], ['Interested', t.interested, 'Ready for a quote'], ['Orders', t.ordered, money(t.total)], ['Left to contact', p.size - t.contacted, p.ends]].map(([l, v, s]) => `<div><div class="ovl">${l}</div><div class="fv">${v}</div><div class="fs">${s}</div></div>`).join('')}</div></div>`;
  const q = `<div class="card s4" style="padding:18px 20px"><div class="row" style="justify-content:space-between;margin-bottom:12px"><span style="font-size:16px;font-weight:600">Call list</span><span class="cap">Longest since last order first</span></div>
   ${list.map((a, k) => { const o = st[a.id]; return `<button class="row" style="width:100%;text-align:left;padding:12px;border-radius:10px;border:1px solid ${k === idx ? 'var(--border-accent)' : 'transparent'};background:${k === idx ? 'var(--surface-selected)' : 'transparent'}" data-a="promoPick" data-k="${k}">${av(a.ini, a.c, 36, true)}<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</div><div class="cap">Last order ${a.lastOrderAgo}</div><div class="cap" style="color:var(--text-secondary)">${a.owner === 'db' ? 'Your account' : 'Owned by ' + EMP[a.owner].name}</div></div>${o ? pill(o === 'Ordered' ? 'success' : o === 'Do not contact' ? 'danger' : o === 'Callback' ? 'warning' : 'info', o) : pill('neutral', 'To contact')}</button>`; }).join('')}</div>`;
  const outcomes = [['Interested', 'thumbs-up'], ['Ordered', 'shopping-cart'], ['Callback', 'calendar-clock'], ['Not now', 'clock'], ['Do not contact', 'ban']];
  const w = `<div class="s8" style="display:flex;flex-direction:column;gap:16px"><div class="card" style="padding:18px 22px">
   <div class="row" style="justify-content:space-between;margin-bottom:14px;flex-wrap:wrap"><span class="cap">Account ${idx + 1} of ${list.length}</span><div class="row" style="gap:6px">${btn('neutral sm', 'Previous', 'chevron-left', 'data-a="promoStep" data-k="-1"')}${btn('neutral sm', 'Skip for now', 'chevron-right', 'data-a="promoStep" data-k="1"')}</div></div>
   <div class="row" style="gap:16px;align-items:flex-start;flex-wrap:wrap">${av(cur.ini, cur.c, 56, true)}<div style="flex:1;min-width:200px"><div class="row" style="gap:10px;flex-wrap:wrap"><span style="font-size:22px;line-height:28px;font-weight:600">${esc(cur.name)}</span>${pill(cur.status === 'Open' ? 'success' : 'neutral', cur.status)}</div><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><span class="tag">${I(cur.type, 15)}${TYPE_LABEL[cur.type]}${cur.locs > 1 ? ': ' + cur.locs : ''}</span><span class="tag">${cur.tier}</span><span class="tag">${cur.industry}</span><span class="tag mono">${cur.id}</span></div></div><a class="lk row" style="gap:6px" href="#/a/${cur.id}/summary">Open full account ${I('external-link', 14)}</a></div>
   ${cur.owner !== 'db' ? `<div class="ban" style="background:var(--status-info-bg);border-color:var(--status-info-border);margin-top:16px"><span style="color:var(--status-info-icon);display:flex">${I('info', 20)}</span><div style="flex:1"><b>Owned by ${owner.name}.</b> You're assisting on this promotion. ${owner.name.split(' ')[0]} is tagged automatically on your outcome and notes.</div>${av(owner.ini, owner.c, 28)}</div>` : ''}
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:16px">${[['Last order', cur.lastOrderAgo, cur.lastOrder], ['Annual value', kmoney(cur.annual), 'Last 12 months'], ['Lifetime sales', kmoney(cur.life), 'Since ' + cur.since], ['Credit', cur.creditW, cur.credit >= 4 ? 'Net 30' : 'Check with AR']].map(([l, v, s]) => `<div style="padding:12px 14px;border:1px solid var(--border-default);border-radius:10px"><div class="ovl">${l}</div><div style="font-size:16px;font-weight:600;margin-top:4px">${v}</div><div class="fs">${s}</div></div>`).join('')}</div></div>
   <div class="grid" style="gap:16px"><div class="card s5"><div style="font-size:16px;font-weight:600;margin-bottom:12px">Who to call</div><div class="row">${av(contact.ini || 'C', contact.c || 'slate', 44)}<div><div style="font-weight:600;font-size:15px">${esc((contact.title ? contact.title + ' ' : '') + (contact.first || 'Main') + ' ' + (contact.last || 'contact'))}</div><div class="cap">${esc(contact.job || 'Primary contact')}</div></div></div>
    <div class="row" style="gap:8px;margin-top:14px;flex-wrap:wrap">${btn('secondary', 'Call ' + (contact.phone || '(617) 555-0100'), 'phone', `data-a="logCall" data-acct="${cur.id}" data-promo="${p.id}"`)}${btn('neutral', 'Email', 'mail', 'data-a="toast" data-msg="Opens your email with the promo template"')}</div>
    <div class="cap" style="margin-top:12px;line-height:20px">${I('clock', 13)} Best time: mornings before 10 AM</div></div>
   <div class="card s7"><div class="row" style="justify-content:space-between;margin-bottom:10px"><span style="font-size:16px;font-weight:600">Talking points</span><span class="cap">From ${p.by}</span></div><ul style="margin:0;padding-left:18px;font-size:14px;line-height:22px"><li>Thank them for their business since ${cur.since} and ask how things are going.</li><li>Mention it's been a while since their last order; offer ${p.offer.toLowerCase()} with code ${p.code}.</li><li>Suggest restocking the items they usually order.</li></ul></div></div>
   <div class="card"><div class="row" style="justify-content:space-between;margin-bottom:12px;flex-wrap:wrap"><span style="font-size:16px;font-weight:600">Log the outcome</span><span class="cap">Saved to the account feed as a promotion call</span></div>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">${outcomes.map(([l, i]) => `<button class="btn neutral" style="height:48px;${UI.promo.outcome === l ? 'background:var(--surface-selected);border-color:var(--border-accent)' : ''}" data-a="promoOutcome" data-k="${l}">${I(i, 18)}${l}</button>`).join('')}</div>
   <textarea class="inp" style="margin-top:14px" placeholder="What did they say? Type @ to tag someone" data-in="promoNote">${esc(UI.promo.note)}</textarea>
   <div class="row" style="justify-content:space-between;margin-top:14px;flex-wrap:wrap"><span class="ro">${I('lock', 13)}Internal note</span>${btn('primary', 'Save and next account', 'arrow-right', 'data-a="promoSave"')}</div></div></div>`;
  return `<div class="chips" style="margin-bottom:16px">${PROMOS.map(x => `<button class="chip${x.id === p.id ? ' on' : ''}" data-a="promoChoose" data-id="${x.id}">${x.name}</button>`).join('')}</div>${camp}<div class="grid" style="margin-top:20px">${q}${w}</div>`;
}

// ================= planner =================
function renderPlanner() {
  const grp = [['Overdue', TASKS.filter(t => t.when === 'overdue' && !t.done)], ['Today', TASKS.filter(t => t.when === 'today')], ['Later this week', TASKS.filter(t => t.when === 'later')]];
  const days = [['Mon', '12', todayTasks().length, true], ['Tue', '13', 2], ['Wed', '14', 3], ['Thu', '15', 2], ['Fri', '16', 1]];
  return `<div class="crumb"><b>Planner &amp; calendar</b></div><div class="sechead" style="margin-top:0"><div><h2>Planner &amp; calendar</h2><div class="cap" style="margin-top:4px">Every task and follow-up, from any account. Full calendar design is still open.</div></div>${btn('primary', 'Create task', 'plus', 'data-a="createTask"')}</div>
  <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:20px 0">${days.map(([d, n, c, on]) => `<div class="card" style="padding:12px 14px;${on ? 'border-color:var(--border-accent);background:var(--surface-selected)' : ''}"><div class="cap">${d}</div><div style="font-size:22px;font-weight:600">${n}</div><div class="cap">${c} tasks</div></div>`).join('')}</div>
  <div class="card">${grp.map(([l, arr]) => `<div class="ovl" style="margin:10px 0 2px">${l} · ${arr.length}</div>${arr.map(t => { const a = acct(t.acct); return `<div class="row" style="padding:12px 0;border-bottom:1px solid var(--border-subtle)">${cbx(t.done, `data-a="toggleTask" data-id="${t.id}"`)}<span style="color:var(--icon-default);display:flex">${I(t.icon, 18)}</span><div style="flex:1;min-width:0"><div class="${t.done ? 'done-t' : ''}" style="font-weight:500">${esc(t.title)}</div><a class="cap" href="#/a/${a.id}/summary">${esc(a.name)}</a></div><span class="cap">${t.due}</span>${t.followUp ? pill('info', 'Follow-up') : ''}</div>`; }).join('') || '<div class="cap" style="padding:10px 0">Nothing here.</div>'}`).join('')}</div>`;
}

// ================= requests =================
const KIND = { AC: ['Account change', 'slate', 'settings'], SS: ['Specialty service', 'teal', 'concierge-bell'], PR: ['Pricing', 'orange', 'tags'] };
const RST = { Submitted: 'info', 'In progress': 'info', 'Waiting on customer': 'warning', Completed: 'success', Declined: 'neutral' };
function renderRequests() {
  const rows = REQUESTS.filter(r => UI.reqFilter === 'All' || r.kind === UI.reqFilter);
  return `<div class="crumb"><b>My requests</b></div><div class="sechead" style="margin-top:0"><div><h2>My requests</h2><div class="cap" style="margin-top:4px">Everything you've asked another team to do. Each type keeps its own number and response time.</div></div></div>
  <div class="grid" style="margin:20px 0">${Object.entries(KIND).map(([k, [l, h, i]]) => { const open = REQUESTS.filter(r => r.kind === k && !['Completed', 'Declined'].includes(r.status)).length; return `<div class="s4"><div class="card row">${tile(h, i, 40, 20)}<div><div class="ovl">${l} (${k})</div><div class="fv">${open} open</div><div class="fs">${k === 'AC' ? 'Handled by Tier 2' : k === 'SS' ? 'Handled by specialty teams' : 'Handled by pricing or your manager'}</div></div></div></div>`; }).join('')}</div>
  <div class="chips" style="margin-bottom:14px">${['All', 'AC', 'SS', 'PR'].map(k => `<button class="chip${UI.reqFilter === k ? ' on' : ''}" data-a="reqFilter" data-k="${k}">${k === 'All' ? 'All' : KIND[k][0] + ' (' + k + ')'}</button>`).join('')}</div>
  <div class="card" style="padding:0;overflow:hidden"><div class="tablewrap"><table><tr><th>Number</th><th>Type</th><th>Account</th><th>What's asked</th><th class="hide-p">Team</th><th>Status</th><th class="hide-p">Due</th></tr>
  ${rows.map(r => `<tr class="click" data-a="openReq" data-no="${r.no}"><td class="mono" style="font-weight:600">${r.no}</td><td><span class="tag">${I(KIND[r.kind][2], 13)}${KIND[r.kind][0]}</span></td><td>${esc(acct(r.acct).name)}</td><td style="white-space:normal;min-width:240px">${esc(r.what)}</td><td class="hide-p">${r.team}</td><td>${pill(RST[r.status], r.status)}</td><td class="hide-p">${r.due}</td></tr>`).join('')}</table></div></div>`;
}

// ================= placeholder pages =================
function emptyState(icon, title, text, cta = '') {
  return `<div class="card empty" style="margin-top:8px">${tile('slate', icon, 56, 26)}<div style="font-size:17px;font-weight:600;color:var(--text-primary)">${title}</div><div style="max-width:520px;margin:6px auto 0">${text}</div>${cta ? `<div style="margin-top:16px">${cta}</div>` : ''}</div>`;
}
function renderPage(k) {
  const P = {
    history: ['history', 'History feed', null], quotes: ['badge-dollar-sign', 'Quotes', null], cases: ['ticket', 'Purchasing cases', null],
    margin: ['tags', 'Margin management', 'Expiring prices, low-margin accounts and pricing requests across your accounts. Release 2.'],
    reports: ['chart-column', 'Reports and analytics', 'The report list is still being gathered from reps and managers. Release 3.'],
    messenger: ['messages-square', 'Messenger center', 'Internal chat follows the design system chat module. Release 2.'],
    projects: ['kanban', 'Project tracker', 'Customer projects such as office moves and furniture installs. Release 3.'],
    ar: ['hand-coins', 'AR dashboard', 'Past-due balances, aging and credit holds across your accounts. Release 3.'],
    team: ['users', 'Team dashboard', "For managers: each rep's Today numbers, progress rings and promotion results. Release 3."],
    training: ['graduation-cap', 'Training & development', 'Internal processes and sales training. Release 3.'],
    kb: ['book-open', 'KB', 'Searchable knowledge base with folders by team, department and process. Release 2.'],
  };
  const [icon, title, text] = P[k] || ['circle-help', 'Page', 'Coming soon.'];
  let body;
  if (k === 'history') body = `<div class="card">${LOG.map(logRow).join('')}</div>`;
  else if (k === 'quotes') body = `<div class="card" style="padding:0;overflow:hidden"><div class="tablewrap"><table><tr><th>Quote</th><th>Account</th><th>Created by</th><th class="num">Total</th><th>Status</th></tr>${QUOTES.map(q => `<tr class="click" onclick="go('#/a/104218/quotes')"><td class="mono">${q[0]}</td><td>Harbor Medical Group</td><td>${q[1]}</td><td class="num">${money(q[3])}</td><td>${pill(q[6], q[7])}</td></tr>`).join('')}</table></div></div>`;
  else if (k === 'cases') body = casesTable();
  else body = emptyState(icon, `${title} is planned, not built yet`, text);
  return `<div class="crumb"><b>${title}</b></div><div class="sechead" style="margin-top:0;margin-bottom:20px"><h2>${title}</h2></div>${body}`;
}
const casesTable = () => `<div class="card" style="padding:0;overflow:hidden"><div class="tablewrap"><table><tr><th>Case</th><th>Account</th><th>Problem</th><th>Status</th><th class="hide-p">Opened</th><th class="hide-p">Owner</th></tr>${CASES.map(c => `<tr><td class="mono" style="font-weight:600">${c[0]}</td><td>Harbor Medical Group</td><td>${c[1]}</td><td>${pill(c[5], c[2])}</td><td class="hide-p">${c[3]}</td><td class="hide-p">${c[4]}</td></tr>`).join('')}</table></div></div>`;

// ================= popovers, modals, toasts =================
function closePops() { document.querySelectorAll('.pop').forEach(p => p.remove()); }
function popAt(el, html, align = 'right') {
  closePops();
  const r = el.getBoundingClientRect(), p = document.createElement('div');
  p.className = 'pop'; p.innerHTML = html; p.style.position = 'fixed'; p.style.top = (r.bottom + 6) + 'px';
  if (align === 'right') p.style.right = Math.max(8, innerWidth - r.right) + 'px'; else p.style.left = Math.max(8, r.left) + 'px';
  document.body.appendChild(p); return p;
}
function toast(msg, icon = 'circle-check') {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `${I(icon, 18)}<span>${msg}</span>`;
  document.getElementById('toasts').appendChild(t); setTimeout(() => t.remove(), 3600);
}
function modal(title, body, foot) {
  closeModal();
  const s = document.createElement('div'); s.className = 'scrim'; s.id = 'scrim';
  s.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h3>${title}</h3><button class="ib" data-a="closeModal" aria-label="Close">${I('x', 20)}</button></div><div class="mb">${body}</div><div class="mf">${foot}</div></div>`;
  s.addEventListener('mousedown', e => { if (e.target === s) closeModal(); });
  document.body.appendChild(s);
  const f = s.querySelector('input,select,textarea'); if (f) f.focus();
}
function closeModal() { const s = document.getElementById('scrim'); if (s) s.remove(); }
const val = id => (document.getElementById(id) || {}).value || '';
const opt = (arr, sel) => arr.map(o => `<option${o === sel ? ' selected' : ''}>${o}</option>`).join('');
const fld = (l, inner) => `<div class="fld"><label>${l}</label>${inner}</div>`;

// ----- Log a call -----
const CALL_TYPES = ['Introduction call', 'Business discovery call', 'Sales call', 'Follow-up call', 'Annual business review call', 'Problem resolution call'];
const RESULTS = ['Connected', 'No answer', 'Left voicemail', 'Busy', 'Wrong number', 'Disconnected (line dropped)', 'Ended by rep', 'Missed'];
const OUTCOMES = ['Sales call completed', 'Quoted', 'Order placed', 'Callback requested', 'Concern resolved', 'Not interested at this time', 'Pricing request submitted', 'Do not contact', 'Business permanently closed', 'Seasonally closed', 'Other'];
function openLogCall(acctId) {
  const a = acct(acctId || (parse().area === 'a' ? parse().a : '104218'));
  modal('Log a call', `${fld('Account', `<select class="inp" id="lc-acct">${ACCOUNTS.map(x => `<option value="${x.id}"${x.id === a.id ? ' selected' : ''}>${esc(x.name)} · ${x.id}</option>`).join('')}</select>`)}
   <div class="form2">${fld('Spoke with', `<input class="inp" id="lc-who" value="${esc(((peopleOf(a)[0] || {}).first || '') + ' ' + ((peopleOf(a)[0] || {}).last || ''))}">`)}${fld('Direction', `<select class="inp" id="lc-dir">${opt(['Outgoing', 'Incoming'], 'Outgoing')}</select>`)}</div>
   <div class="form2">${fld('Call type', `<select class="inp" id="lc-type">${opt(CALL_TYPES, 'Sales call')}</select>`)}${fld('What happened', `<select class="inp" id="lc-res" onchange="document.getElementById('lc-outw').style.display=this.value==='Connected'?'':'none'">${opt(RESULTS, 'Connected')}</select>`)}</div>
   <div class="form2"><div id="lc-outw">${fld('Outcome', `<select class="inp" id="lc-out" onchange="document.getElementById('lc-fuw').style.display=this.value==='Callback requested'?'':'none'">${opt(OUTCOMES, 'Sales call completed')}</select>`)}</div>${fld('Talk time (minutes)', `<input class="inp" id="lc-min" type="number" min="0" value="5">`)}</div>
   <div id="lc-fuw" style="display:none">${fld('Follow-up', `<select class="inp" id="lc-fu">${opt(['Today', 'Tomorrow', 'In 2 days', 'Next week'], 'In 2 days')}</select>`)}</div>
   ${fld('Note', `<textarea class="inp" id="lc-note" placeholder="Anything the team should know? Type @ to tag someone"></textarea>`)}`,
    `${btn('neutral', 'Cancel', '', 'data-a="closeModal"')}${btn('primary', 'Save call', 'check', 'data-a="saveCall"')}`);
}
function saveCall() {
  const a = acct(val('lc-acct')), dir = val('lc-dir'), type = val('lc-type'), res = val('lc-res'), out = val('lc-out'), min = +val('lc-min') || 0, who = val('lc-who').trim() || 'contact', note = val('lc-note').trim();
  const connected = res === 'Connected';
  if (dir === 'Outgoing') STATS.callsOut++; else STATS.callsIn++;
  if (connected) STATS.talk += min * 60;
  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const label = connected ? out : res;
  const ic = dir === 'Incoming' ? 'phone-incoming' : res === 'Left voicemail' ? 'voicemail' : 'phone-outgoing';
  LOG.unshift([now, 'blue', ic, `${dir} call · <b>${esc(a.name)}</b>`, `${type.replace(' call', '')} with ${esc(who)}${connected ? ` · ${min}m` : ''}`, label === 'Callback requested' ? 'warning' : label === 'Order placed' ? 'success' : 'info', label]);
  FEED.unshift({ acct: a.id, kind: 'calls', icon: ['blue', ic], head: `<b>Dana Brooks</b> logged a ${type.toLowerCase()} with ${esc(who)}`, body: `${connected ? 'Outcome: ' + out : res}${note ? ' · ' + esc(note) : ''}`, time: now, day: 'Today' });
  TOUCHED.unshift([a.id, who, ic, `Call, ${min}m`, now]);
  if (connected && out === 'Callback requested') { const f = val('lc-fu'); TASKS.push({ id: 't' + Date.now(), icon: 'phone', title: `Call ${who} back`, acct: a.id, due: f === 'Today' ? 'Later today' : f, when: f === 'Today' ? 'today' : 'later', followUp: true, done: false }); }
  closeModal(); render();
  toast(`Call logged on ${esc(a.name)}${connected && out === 'Callback requested' ? ' · follow-up task created' : ''}`, 'phone');
}
// ----- Create task -----
function openCreateTask(acctId) {
  const a = acct(acctId || (parse().area === 'a' ? parse().a : '104218'));
  modal('Create task', `${fld('What needs doing', `<input class="inp" id="ct-title" placeholder="e.g. Call Susan back about the quote">`)}
  ${fld('Account', `<select class="inp" id="ct-acct">${ACCOUNTS.map(x => `<option value="${x.id}"${x.id === a.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`)}
  <div class="form2">${fld('Type', `<select class="inp" id="ct-type">${opt(['Call', 'Email', 'Task', 'Quote follow-up'], 'Call')}</select>`)}${fld('Due', `<select class="inp" id="ct-due">${opt(['Today', 'Tomorrow', 'This week', 'Next week'], 'Today')}</select>`)}</div>
  <label class="row" style="gap:10px;font-size:14px"><input type="checkbox" id="ct-fu"> This is a follow-up promised to the customer</label>`,
    `${btn('neutral', 'Cancel', '', 'data-a="closeModal"')}${btn('primary', 'Create task', 'plus', 'data-a="saveTask"')}`);
}
function saveTask() {
  const title = val('ct-title').trim(); if (!title) { document.getElementById('ct-title').focus(); toast('Add what needs doing first', 'circle-alert'); return; }
  const type = val('ct-type'), due = val('ct-due');
  TASKS.push({ id: 't' + Date.now(), icon: { Call: 'phone', Email: 'mail', Task: 'clipboard-check', 'Quote follow-up': 'badge-dollar-sign' }[type], title, acct: val('ct-acct'), due: due === 'Today' ? 'Today' : due, when: due === 'Today' ? 'today' : 'later', followUp: document.getElementById('ct-fu').checked, done: false });
  closeModal(); render(); toast(due === 'Today' ? 'Task added to today; the progress ring updated' : 'Task added to your planner', 'clipboard-check');
}
// ----- Requests -----
function openRequest(kind, preset = {}) {
  const a = acct(preset.acct || (parse().area === 'a' ? parse().a : '104218'));
  let body;
  if (kind === 'AC') body = `${fld('Setting', `<input class="inp" id="rq-setting" value="${esc(preset.setting || '')}" placeholder="e.g. Invoice settings">`)}
   ${preset.current ? fld('Current value', `<input class="inp" readonly value="${esc(preset.current)}">`) : ''}
   ${fld('What should it change to?', `<textarea class="inp" id="rq-what" placeholder="Describe the change the customer asked for">${esc(preset.what || '')}</textarea>`)}
   ${fld('Reason', `<input class="inp" id="rq-why" placeholder="e.g. Customer called on Oct 12">`)}<div class="cap">Goes to Tier 2. You'll see it in My requests with an AC number.</div>`;
  else if (kind === 'SS') body = `<div class="form2">${fld('Service', `<select class="inp" id="rq-svc">${opt(['Rentals', 'Beverage', 'Coffee bar', 'Janitorial and sanitation', 'Custom print', 'Furniture', 'Technology'], preset.svc || 'Rentals')}</select>`)}${fld('Request', `<select class="inp" id="rq-act">${opt(['New', 'Change', 'Repair or maintenance', 'Cancel'], preset.act || 'New')}</select>`)}</div>
   ${fld('Location', `<select class="inp" id="rq-loc">${addrOf(a).delivery.filter(d => d.active).map(d => `<option>${esc(d.label)}</option>`).join('')}</select>`)}
   ${fld('Details', `<textarea class="inp" id="rq-what" placeholder="e.g. 2 more water coolers for the new exam rooms">${esc(preset.what || '')}</textarea>`)}<div class="cap">Goes to the specialty team for that service, with an SS number.</div>`;
  else body = `${fld('Type', `<select class="inp" id="rq-type">${opt(['Extend prices', 'Add item to contract', 'Create contract', 'Margin approval'], preset.type || 'Extend prices')}</select>`)}
   ${preset.item ? fld('Item', `<input class="inp" readonly value="${esc(preset.item)}">`) : ''}
   ${fld('Details', `<textarea class="inp" id="rq-what" placeholder="What price, which items, until when">${esc(preset.what || '')}</textarea>`)}<div class="cap">Goes to the pricing team (or your manager for margin approvals), with a PR number.</div>`;
  modal(`${KIND[kind][0]} request · ${esc(a.name)}`, body, `${btn('neutral', 'Cancel', '', 'data-a="closeModal"')}${btn('primary', 'Submit request', 'send', `data-a="saveReq" data-kind="${kind}" data-acct="${a.id}" data-key="${esc(preset.key || '')}" data-item="${esc(preset.item || '')}"`)}`);
}
function saveReq(el) {
  const kind = el.dataset.kind, a = acct(el.dataset.acct);
  let what;
  if (kind === 'AC') what = `${val('rq-setting') || 'Account setting'}: ${val('rq-what') || 'change requested'}`;
  else if (kind === 'SS') what = `${val('rq-svc')} · ${val('rq-act')}: ${val('rq-what') || val('rq-loc')}`;
  else what = `${val('rq-type')}${el.dataset.item ? ' · ' + el.dataset.item : ''}: ${val('rq-what') || 'see details'}`;
  const no = `${kind}-${String(++SEQ[kind]).padStart(4, '0')}`;
  REQUESTS.unshift({ no, kind, acct: a.id, what, by: 'Dana Brooks', team: kind === 'AC' ? 'Tier 2' : kind === 'SS' ? val('rq-svc') + ' team' : (val('rq-type') === 'Margin approval' ? 'Manager' : 'Pricing team'), status: 'Submitted', date: 'Oct 12', due: kind === 'SS' ? 'Oct 14' : 'Oct 15' });
  if (el.dataset.key) UI.pendingSettings[el.dataset.key] = no;
  FEED.unshift({ acct: a.id, kind: 'notes', icon: [KIND[kind][1], KIND[kind][2]], head: `<b>Dana Brooks</b> submitted ${no}`, body: esc(what), time: 'Just now', day: 'Today' });
  closeModal(); render(); toast(`${no} submitted to ${REQUESTS[0].team}`, 'send');
}
function openReqDetail(no) {
  const r = REQUESTS.find(x => x.no === no); const steps = ['Submitted', 'In progress', 'Waiting on customer', 'Completed']; const at = steps.indexOf(r.status);
  modal(`${r.no} · ${KIND[r.kind][0]}`, `<div class="row" style="gap:10px">${tile(KIND[r.kind][1], KIND[r.kind][2], 40, 20)}<div><div style="font-weight:600">${esc(acct(r.acct).name)}</div><div class="cap">Submitted ${r.date} by ${r.by} · handled by ${r.team}</div></div></div>
  <div style="font-size:15px;line-height:22px">${esc(r.what)}</div>
  <div>${steps.map((s, k) => `<div class="row" style="gap:10px;padding:6px 0"><span class="cbx${k <= at ? ' on' : ''}" style="border-radius:50%">${k <= at ? I('check', 12) : ''}</span><span style="${k <= at ? 'font-weight:600' : 'color:var(--text-tertiary)'}">${s}</span>${k === at ? `<span class="cap">· due ${r.due}</span>` : ''}</div>`).join('')}</div>
  ${fld('Add a comment', `<textarea class="inp" id="rq-c" placeholder="Visible to ${r.team}"></textarea>`)}`,
    `${btn('neutral', 'Close', '', 'data-a="closeModal"')}${btn('primary', 'Add comment', 'send', 'data-a="closeModal" data-toast="Comment added"')}`);
}
