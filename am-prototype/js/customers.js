// ================= My customers: every account assigned to the rep =================
UI.cust = { tab: 'mine', view: 'All', role: 'Any role', type: 'Any type', tier: 'Any tier', health: 'Any health', sort: 'name', dir: 1, page: 0, q: '' };
const PER_PAGE = 20;
const ROLE_TONE = { 'Account owner': 'success', 'Outside rep': 'info', 'Dedicated CSR': 'info', 'Backup rep': 'warning', 'Assisting (promotion)': 'neutral' };
const nextTaskFor = a => TASKS.filter(t => t.acct === a.id && !t.done).sort((x, y) => (x.when === 'overdue' ? -1 : x.when === 'today' ? 0 : 1) - (y.when === 'overdue' ? -1 : y.when === 'today' ? 0 : 1))[0];
const lastContactW = d => d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d + ' days ago';
const QUIET = 45;
const smallPill = (t, l) => `<span class="pill" style="${tone(t)};height:20px;font-size:11px;padding:0 8px"><span class="dot" style="background:var(--status-${t}-dot)"></span>${l}</span>`;
const CUST_VIEWS = {
  All: () => true,
  Pinned: a => a.pinned,
  'Needs attention': a => (a.flag && a.flag[1] !== 'New') || a.health <= 2,
  'Going quiet': a => a.lastContact >= QUIET,
  'Follow-up due': a => { const t = nextTaskFor(a); return t && t.when !== 'later'; },
  New: a => a.since >= 2026,
};
function custBase() { return UI.cust.tab === 'mine' ? myAccounts() : ACCOUNTS; }
function custRows() {
  const c = UI.cust, q = c.q.toLowerCase();
  let rows = custBase().filter(a => !q || a.name.toLowerCase().includes(q) || a.id.includes(q) || a.city.toLowerCase().includes(q) || a.industry.toLowerCase().includes(q));
  rows = rows.filter(CUST_VIEWS[c.view]);
  if (c.role !== 'Any role') rows = rows.filter(a => myRole(a) === c.role);
  if (c.type !== 'Any type') rows = rows.filter(a => TYPE_LABEL[a.type] === c.type);
  if (c.tier !== 'Any tier') rows = rows.filter(a => a.tier === c.tier);
  if (c.health !== 'Any health') rows = rows.filter(a => a.healthW === c.health);
  const key = { name: a => a.name.toLowerCase(), ytd: a => a.ytd, trend: a => a.trend, last: a => +a.lastOrderAgo.split(' ')[0] || (a.lastOrderAgo === 'Today' ? 0 : 999), contact: a => a.lastContact, health: a => a.health, role: a => myRole(a) || 'zz' }[c.sort];
  return rows.sort((x, y) => (key(x) > key(y) ? 1 : key(x) < key(y) ? -1 : 0) * c.dir);
}
function renderCustomers() {
  const c = UI.cust, mine = myAccounts(), base = custBase(), rows = custRows();
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE)); if (c.page >= pages) c.page = pages - 1;
  const show = rows.slice(c.page * PER_PAGE, c.page * PER_PAGE + PER_PAGE);
  const ownedN = mine.filter(a => myRole(a) === 'Account owner').length;
  const ytd = base.reduce((t, a) => t + a.ytd, 0), lastYr = base.reduce((t, a) => t + (a.trend > -100 ? a.ytd / (1 + a.trend / 100) : a.annual), 0);
  const att = base.filter(CUST_VIEWS['Needs attention']).length, quiet = base.filter(CUST_VIEWS['Going quiet']).length, due = base.filter(CUST_VIEWS['Follow-up due']).length;
  const kpi = (l, v, s, view) => `<${view ? `button class="kt" data-a="custView" data-k="${view}" style="min-height:0;${c.view === view ? 'border-color:var(--border-accent);background:var(--surface-selected)' : ''}"` : 'div class="kt" style="min-height:0"'}><span class="ovl">${l}</span><span class="fv" style="margin-top:6px">${v}</span><span class="fs">${s}</span></${view ? 'button' : 'div'}>`;
  const sel = (k, opts) => `<select class="inp" style="height:36px;width:auto;font-size:13px" data-ch="custSel" data-k="${k}">${opt(opts, c[k])}</select>`;
  const th = (k, l, cls = '') => `<th class="${cls}" style="cursor:pointer;user-select:none" data-a="custSort" data-k="${k}">${l}${c.sort === k ? ' ' + I(c.dir > 0 ? 'chevron-up' : 'chevron-down', 12) : ''}</th>`;
  const team = a => (TEAM[a.id] || []).filter(([e]) => e !== 'db').map(([e, r]) => `<span title="${EMP[e].name} · ${r}" style="margin-left:-6px;border:2px solid var(--surface-card);border-radius:50%;display:inline-flex">${av(EMP[e].ini, EMP[e].c, 24)}</span>`).join('') || '<span class="cap">Just you</span>';
  const roleTag = a => { const r = myRole(a); return r ? pill(ROLE_TONE[r], r) : '<span class="cap">Not assigned</span>'; };
  const trend = a => `<span style="font-size:12px;color:${a.trend < 0 ? 'var(--status-danger-fg)' : 'var(--status-success-fg)'}">${a.trend > 0 ? '+' : ''}${a.trend}%</span>`;
  const next = a => { const t = nextTaskFor(a); if (!t) return '<span class="cap">None</span>'; const od = t.when === 'overdue'; return `<span style="font-size:13px;${od ? 'color:var(--status-danger-fg)' : ''}">${od ? 'Overdue · ' : ''}${t.due}</span><div class="cap" style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</div>`; };
  const table = `<div class="card hide-p" style="padding:0;overflow:hidden"><div class="tablewrap"><table class="ctable"><tr>${th('name', 'Account')}${th('role', 'My role')}<th class="hide-t hide-m">Team</th>${th('ytd', 'Sales YTD', 'num')}${th('last', 'Last order', 'hide-t')}${th('contact', 'Last contact')}<th class="hide-t">Next follow-up</th>${th('health', 'Health')}</tr>
   ${show.map(a => `<tr class="click" onclick="go('#/a/${a.id}/summary')"><td style="min-width:240px"><span class="row" style="gap:10px">${av(a.ini, a.c, 32, a.type !== 'account-personal')}<span style="line-height:18px;min-width:0"><b style="font-weight:600;white-space:nowrap">${esc(a.name)}</b>${a.pinned ? ' <span style="color:var(--text-tertiary)">' + I('pin', 12) + '</span>' : ''}${a.flag ? ' <span style="margin-left:4px;vertical-align:1px">' + smallPill(...a.flag) + '</span>' : ''}<br><span class="cap" style="white-space:nowrap"><span class="mono">${a.id}</span> · ${TYPE_LABEL[a.type]}</span></span></span></td>
    <td style="white-space:nowrap">${roleTag(a)}</td><td class="hide-t hide-m"><span style="padding-left:6px;display:inline-flex">${team(a)}</span></td>
    <td class="num">${money(a.ytd, 0)}<div>${trend(a)}</div></td><td class="hide-t" style="white-space:nowrap"><span style="font-size:13px">${a.lastOrder}</span><div class="cap">${a.lastOrderAgo}</div></td>
    <td style="white-space:nowrap;${a.lastContact >= QUIET ? 'color:var(--status-warning-fg);font-weight:500' : ''}">${lastContactW(a.lastContact)}</td><td class="hide-t">${next(a)}</td>
    <td style="white-space:nowrap"><span style="font-size:13px">${a.healthW}</span>${meter(a.health)}</td></tr>`).join('') || `<tr><td colspan="8"><div class="empty">No accounts match these filters. <button class="lk" data-a="custClear">Clear filters</button></div></td></tr>`}</table></div></div>`;
  const cards = `<div class="only-p">${show.map(a => `<a class="card" href="#/a/${a.id}/summary" style="display:block;padding:14px 16px;margin-bottom:10px"><div class="row" style="gap:10px;align-items:flex-start">${av(a.ini, a.c, 40, a.type !== 'account-personal')}<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:15px">${esc(a.name)}</div><div class="cap"><span class="mono">${a.id}</span> · ${a.city}</div><div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">${roleTag(a)}${a.flag ? pill(...a.flag) : ''}</div></div><div style="text-align:right"><div style="font-weight:600">${kmoney(a.ytd)}</div>${trend(a)}</div></div>
   <div class="row" style="justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid var(--border-subtle);font-size:12px;color:var(--text-secondary)"><span>Last contact: <b style="font-weight:600;color:${a.lastContact >= QUIET ? 'var(--status-warning-fg)' : 'var(--text-primary)'}">${lastContactW(a.lastContact)}</b></span><span>${a.healthW}</span></div></a>`).join('') || '<div class="empty">No accounts match.</div>'}</div>`;
  const pager = rows.length > PER_PAGE ? `<div class="row" style="justify-content:space-between;margin-top:14px;flex-wrap:wrap"><span class="cap">Showing ${c.page * PER_PAGE + 1}–${Math.min(rows.length, (c.page + 1) * PER_PAGE)} of ${rows.length}</span><div class="row" style="gap:6px">${btn('neutral sm', 'Previous', 'chevron-left', `data-a="custPage" data-k="-1"${c.page === 0 ? ' disabled' : ''}`)}<span class="cap" style="padding:0 6px">Page ${c.page + 1} of ${pages}</span>${btn('neutral sm', 'Next', 'chevron-right', `data-a="custPage" data-k="1"${c.page >= pages - 1 ? ' disabled' : ''}`)}</div></div>` : `<div class="cap" style="margin-top:12px">${rows.length} account${rows.length === 1 ? '' : 's'}</div>`;
  const filtered = c.view !== 'All' || c.role !== 'Any role' || c.type !== 'Any type' || c.tier !== 'Any tier' || c.health !== 'Any health' || c.q;
  return `<div class="crumb"><b>My customers</b></div>
  <div class="sechead" style="margin-top:0"><div><h2>${c.tab === 'mine' ? 'My customers' : 'All branch accounts'}</h2><div class="cap" style="margin-top:4px">${c.tab === 'mine' ? `${mine.length} accounts assigned to you: ${ownedN} you own, ${mine.length - ownedN} you cover or assist on` : `${ACCOUNTS.length} accounts in the Boston branch`}</div></div>
   <div class="row" style="gap:8px">${btn('neutral', 'Export', 'download', 'data-a="custExport"')}${btn('primary', 'Create new account', 'plus', 'data-a="newAccount"')}</div></div>
  <div class="tabs" style="margin-top:14px">${[['mine', 'My accounts', mine.length], ['all', 'All branch accounts', ACCOUNTS.length]].map(([k, l, n]) => `<button class="${c.tab === k ? 'on' : ''}" data-a="custTab" data-k="${k}">${l}<span class="tag" style="height:20px;padding:0 7px">${n}</span></button>`).join('')}</div>
  <div class="kf kf5" style="margin-bottom:18px">${kpi('Accounts', base.length, c.tab === 'mine' ? `${ownedN} owned` : 'Whole branch')}${kpi('Sales YTD', kmoney(ytd), `${ytd >= lastYr ? '+' : ''}${((ytd / lastYr - 1) * 100).toFixed(1)}% vs last year`)}${kpi('Needs attention', att, 'Credit, past due or low health', 'Needs attention')}${kpi('Going quiet', quiet, `No two-way contact in ${QUIET}+ days`, 'Going quiet')}${kpi('Follow-up due', due, 'Today or overdue', 'Follow-up due')}</div>
  <div class="card" style="padding:14px 16px;margin-bottom:14px"><div class="row" style="gap:10px;flex-wrap:wrap">
   <label class="inp row" style="width:300px;max-width:100%;gap:8px;color:var(--text-tertiary);height:36px">${I('search', 16)}<input data-in="custQ" value="${esc(c.q)}" placeholder="Name, number, city or industry" style="border:0;outline:0;flex:1;background:transparent;height:34px"></label>
   ${c.tab === 'mine' ? sel('role', ['Any role', 'Account owner', 'Outside rep', 'Dedicated CSR', 'Backup rep', 'Assisting (promotion)']) : ''}${sel('type', ['Any type', ...Object.values(TYPE_LABEL)])}${sel('tier', ['Any tier', 'Standard', 'Premium business', 'White glove'])}${sel('health', ['Any health', 'Thriving', 'Healthy', 'Stable', 'Needs attention', 'At risk'])}
   ${filtered ? btn('ghost sm', 'Clear filters', 'x', 'data-a="custClear"') : ''}</div>
   <div class="chips" style="margin-top:12px">${Object.keys(CUST_VIEWS).map(v => `<button class="chip${c.view === v ? ' on' : ''}" style="height:30px" data-a="custView" data-k="${v}">${v}<span class="cap" style="margin-left:2px">${base.filter(CUST_VIEWS[v]).length}</span></button>`).join('')}</div></div>
  ${table}${cards}${pager}`;
}
Object.assign(A, {
  custTab: el => { UI.cust.tab = el.dataset.k; UI.cust.page = 0; if (UI.cust.tab === 'all') UI.cust.role = 'Any role'; render(); },
  custView: el => { UI.cust.view = UI.cust.view === el.dataset.k && el.dataset.k !== 'All' ? 'All' : el.dataset.k; UI.cust.page = 0; render(); },
  custSort: el => { const k = el.dataset.k; if (UI.cust.sort === k) UI.cust.dir *= -1; else { UI.cust.sort = k; UI.cust.dir = ['ytd', 'contact', 'trend'].includes(k) ? -1 : 1; } render(); },
  custPage: el => { UI.cust.page += +el.dataset.k; render(); window.scrollTo(0, 0); },
  custClear: () => { Object.assign(UI.cust, { view: 'All', role: 'Any role', type: 'Any type', tier: 'Any tier', health: 'Any health', q: '', page: 0 }); render(); },
  custExport: () => { downloadCSV('my-customers.csv', [['Account', 'Number', 'Type', 'Tier', 'My role', 'Team', 'Sales YTD', 'Trend %', 'Last order', 'Last contact (days)', 'Health', 'Status'], ...custRows().map(a => [a.name, a.id, TYPE_LABEL[a.type], a.tier, myRole(a) || '', (TEAM[a.id] || []).map(([e, r]) => EMP[e].name + ' (' + r + ')').join('; '), a.ytd.toFixed(2), a.trend, a.lastOrder, a.lastContact, a.healthW, a.flag ? a.flag[1] : ''])]); toast(`${custRows().length} accounts exported to CSV`, 'download'); },
});
CH.custSel = el => { UI.cust[el.dataset.k] = el.value; UI.cust.page = 0; render(); };
