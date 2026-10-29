// ================= account data helpers =================
const FIRSTS = ['Rosa', 'Mark', 'Tom', 'Elena', 'Chris', 'Nadia', 'Victor', 'Paula', 'Owen', 'Hana'], LASTS = ['Lin', 'Ellis', 'Ochoa', 'Brandt', 'Kerr', 'Haddad', 'Moreno', 'Quinn', 'Reyes', 'Sato'];
function peopleOf(a) {
  if (PEOPLE[a.id]) return PEOPLE[a.id];
  const n = +a.id.slice(-2) || 3, dom = a.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12) + '.example';
  const mk = (k, f, l, job, extra) => ({ id: 'u' + k, ini: f[0] + l[0], c: ['teal', 'blue', 'orange', 'pink', 'green', 'violet'][(n + k) % 6], first: f, last: l, title: '', pref: '', pron: '', job, dept: 'Operations', email: `${f[0].toLowerCase()}${l.toLowerCase()}@${dom}`, phone: `(617) 555-01${String(n + k).padStart(2, '0').slice(-2)}`, mobile: '', perm: 'Standard', approver: false, ap: false, noRem: false, login: 'Sep 30', status: 'Active', hasLogin: true, ...extra });
  if (a.type === 'account-personal') { const [f, l] = a.name.split(' '); PEOPLE[a.id] = [mk(1, f, l, 'Account holder', { perm: 'Admin', contactRole: 'Primary', ap: true })]; }
  else PEOPLE[a.id] = [mk(1, FIRSTS[n % 10], LASTS[n % 10], a.locs > 1 ? 'Office manager' : 'Owner', { perm: 'Admin', approver: true, contactRole: 'Primary' }), mk(2, FIRSTS[(n + 3) % 10], LASTS[(n + 5) % 10], 'Bookkeeper', { perm: 'Online invoice', ap: true, contactRole: 'AP contact', dept: 'Accounting' })];
  return PEOPLE[a.id];
}
function addrOf(a) {
  if (ADDR[a.id]) return ADDR[a.id];
  const city = a.city.split(',')[0], n = +a.id.slice(-3) || 10, p = peopleOf(a)[0];
  const base = { l2: '', l3: '', city, state: 'MA', zip: '02' + String(100 + n % 800).padStart(3, '0'), county: 'Middlesex', region: 'New England', phone: p.phone, tz: 'Eastern (ET)' };
  const del = Array.from({ length: Math.min(a.locs, 3) }, (_, k) => ({ id: 'a' + (k + 1), label: k === 0 ? (a.type === 'account-personal' ? 'Home' : 'Main office') : `Location ${k + 1}`, l1: `${10 + n % 90 + k * 12} ${['Main St', 'Elm St', 'Washington St'][k]}`, ...base, att: `${p.first} ${p.last}`, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], from: '9:00 AM', to: '5:00 PM', mode: a.type === 'account-personal' ? 'Outside carrier' : 'Company truck', nit: a.type === 'account-personal', res: a.type === 'account-personal', no3p: false, instr: '', active: true }));
  ADDR[a.id] = { billing: { label: `${a.name}, Billing`, l1: del[0].l1, ...base, att: `${p.first} ${p.last}` }, delivery: del };
  return ADDR[a.id];
}
const isHarbor = a => a.id === '104218';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fullName = p => `${p.first} ${p.last}`;
const addrLine = d => [d.l1, d.l2, d.l3].filter(Boolean).join(', ') + `, ${d.city}, ${d.state} ${d.zip}`;
const ALL_MENU = () => [...ACCT_MENU, ...ACCT_PROPOSED];

// ================= account shell =================
function acctHeader(a) {
  const pinned = a.pinned;
  return `<div class="card" style="padding:20px 24px;margin-bottom:18px"><div class="row" style="align-items:flex-start;gap:16px;flex-wrap:wrap">${av(a.ini, a.c, 56, a.type !== 'account-personal')}
  <div style="flex:1;min-width:240px"><div class="row" style="gap:10px;flex-wrap:wrap"><span style="font-size:24px;line-height:30px;font-weight:600">${esc(a.name)}</span>${pill(a.status === 'Open' ? 'success' : 'neutral', a.status)}${a.flag && a.flag[1] !== 'Closed' ? pill(...a.flag) : ''}</div>
  <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><span class="tag">${I(a.type, 15)}${TYPE_LABEL[a.type]}${a.locs > 1 ? ': ' + a.locs + ' locations' : ''}</span><span class="tag">${a.tier}</span><span class="tag">${a.industry}${a.naics !== '—' ? ' · NAICS ' + a.naics : ''}</span><span class="tag mono">${a.id}</span>${a.group && a.groupCount > 1 ? `<span class="tag">${I('network', 14)}${esc(a.group)} · ${a.groupCount} accounts</span>` : ''}</div>
  <div class="cap" style="margin-top:8px">Customer since ${a.since} · ${a.city} · Account owner ${EMP[a.owner].name}</div></div>
  <div class="row" style="gap:8px;flex-wrap:wrap"><button class="ib" title="${pinned ? 'Unpin' : 'Pin'} account" data-a="pinAcct" data-id="${a.id}" style="${pinned ? 'color:var(--text-link)' : ''}">${I('pin', 18)}</button>${btn('neutral', 'New quote', 'badge-dollar-sign', 'data-a="linkOut" data-k="quote"')}${btn('primary', 'New order', 'shopping-cart', 'data-a="linkOut" data-k="order"')}</div></div></div>`;
}
function slimHeader(a, title, sub, actions = '') {
  return `<div class="row" style="justify-content:space-between;align-items:flex-end;margin-bottom:18px;flex-wrap:wrap;gap:12px"><div class="row" style="gap:14px">${av(a.ini, a.c, 44, a.type !== 'account-personal')}<div><div class="cap">${esc(a.name)} · <span class="mono">${a.id}</span></div><h2 style="margin:2px 0 0;font-size:22px;line-height:28px;font-weight:600">${title}</h2>${sub ? `<div class="cap" style="margin-top:2px">${sub}</div>` : ''}</div></div><div class="row" style="gap:8px;flex-wrap:wrap">${actions}</div></div>`;
}
function renderAccount(a, sec, r) {
  const item = ALL_MENU().find(m => m[0] === sec) || ACCT_MENU[0];
  const crumb = `<div class="crumb"><a href="#/customers">My customers</a>${I('chevron-right', 14)}<a href="#/a/${a.id}/summary">${esc(a.name)}</a>${sec !== 'summary' ? I('chevron-right', 14) + `<b>${item[2]}</b>` : ''}</div>`;
  const sw = `<div class="secswitch"><select class="inp" data-ch="secSwitch" aria-label="Account section">${ALL_MENU().filter(m => m[0] !== 'rep').map(([k, , l]) => `<option value="${k}"${k === sec ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`;
  const S = { summary: secSummary, users: secUsers, addresses: secAddresses, gp: secGP, opps: secOpps, settings: secSettings, specialty: secSpecialty, orders: secOrders, quotes: secQuotes, subs: secSubs, billing: secBilling, cases: secCases, pricing: secPricing, activities: secActivities, messages: secMessages, analytics: secAnalytics };
  return crumb + sw + (S[sec] || secSummary)(a, r);
}

// ================= feed =================
function feedItem(f) {
  const lead = f.av ? av(f.av[0], f.av[1], 32) : tile(f.icon[0], f.icon[1], 32, 16);
  return `<div class="feed">${lead}<div style="flex:1;min-width:0"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px;font-size:13px"><span>${f.head}${f.note ? ` <span class="ro" style="margin-left:4px">${I('lock', 12)}Internal</span>` : ''}${f.pinned ? ` <span style="color:var(--text-tertiary)">${I('pin', 12)}</span>` : ''}</span><span class="cap" style="white-space:nowrap">${f.time}</span></div>${f.body ? `<div style="font-size:13px;color:var(--text-secondary);margin-top:3px;line-height:19px">${f.body}</div>` : ''}</div></div>`;
}
const FEED_F = [['All', null], ['Notes', 'notes'], ['Calls', 'calls'], ['Orders and quotes', 'orders'], ['Payments', 'payments'], ['Pricing', 'pricing']];
function feedList(a, limit) {
  const k = (FEED_F.find(f => f[0] === UI.feedFilter) || FEED_F[0])[1];
  let list = FEED.filter(f => f.acct === a.id && (!k || f.kind === k));
  const total = list.length; if (limit && !UI.feedMore) list = list.slice(0, limit);
  if (!list.length) return `<div class="empty" style="padding:28px">Nothing in this view yet. Post a note or log a call and it shows up here.</div>`;
  let out = '', day = '';
  list.forEach(f => { if (f.day !== day) { day = f.day; out += `<div class="ovl" style="margin:14px 0 2px">${day}</div>`; } out += feedItem(f); });
  if (limit && total > limit) out += `<button class="btn ghost sm" style="margin-top:8px" data-a="feedMore">${UI.feedMore ? 'Show less' : `Show all ${total}`}</button>`;
  return out;
}
const feedChips = () => `<div class="chips">${FEED_F.map(([l]) => `<button class="chip${UI.feedFilter === l ? ' on' : ''}" style="height:28px" data-a="feedFilter" data-k="${l}">${l}</button>`).join('')}</div>`;
function composer(a) {
  return `<div style="border:1px solid var(--border-default);border-radius:12px;padding:12px 14px;background:var(--surface-card)">
  <textarea class="inp" id="noteText" data-in="noteText" placeholder="Add an internal note. Type @ to tag a teammate." style="border:0;padding:4px 0;min-height:64px;box-shadow:none"></textarea>
  <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid var(--border-subtle);padding-top:10px">
   <div class="row" style="gap:8px;flex-wrap:wrap"><select class="inp" id="noteType" style="height:32px;width:auto;font-size:13px">${opt(['General', 'Opportunity', 'Customer preference', 'Delivery', 'Risk'], 'General')}</select><label class="row" style="gap:6px;font-size:13px;color:var(--text-secondary)"><input type="checkbox" id="notePin"> Pin to summary</label><span class="ro hide-p">${I('lock', 12)}Only your team sees notes</span></div>
   <div class="row" style="gap:8px;flex-wrap:wrap">${btn('neutral sm', 'Log a call', 'phone', `data-a="logCall" data-acct="${a.id}"`)}${btn('neutral sm', 'Create task', 'plus', `data-a="createTask" data-acct="${a.id}"`)}${btn('primary sm', 'Post note', 'send', `data-a="postNote" data-acct="${a.id}"`)}</div></div></div>`;
}

// ================= summary =================
function secSummary(a) {
  const h = isHarbor(a), openOrders = h ? 2 : (a.lastOrderAgo === 'Today' ? 1 : 0), openQuotes = h ? 3 : 0;
  const kt = (l, v, s, href, extra = '') => `<${href ? `button class="kt" onclick="go('${href}')"` : 'div class="kt"'}><span class="ovl">${l}</span><span class="fv" style="margin-top:8px">${v}</span><span class="fs">${s}</span>${extra}${href ? `<span class="lk" style="margin-top:auto;padding-top:8px;font-size:12px">View ${I('arrow-right', 12)}</span>` : ''}</${href ? 'button' : 'div'}>`;
  const tiles = `<div class="kf" style="margin-bottom:18px">${kt('Sales YTD', kmoney(a.ytd), `<span style="color:${a.trend < 0 ? 'var(--status-danger-fg)' : 'var(--status-success-fg)'}">${a.trend > 0 ? '+' : ''}${a.trend}%</span> vs last year`)}${kt('Margin YTD', a.margin + '%', 'Branch target 22%')}${kt('Open orders', openOrders, h ? '1 on hold, 1 in transit' : 'In progress', `#/a/${a.id}/orders`)}${kt('Open quotes', openQuotes, h ? money(31240, 0) + ' total' : 'None open', `#/a/${a.id}/quotes`)}${kt('Credit', a.creditW, a.credit >= 4 ? 'Net 30 · limit $75,000' : 'Check with AR', `#/a/${a.id}/billing`, meter(a.credit))}${kt('Health', a.healthW, 'From orders, payments and contact', '', meter(a.health))}${kt('Last order', a.lastOrder, `${a.lastOrderAgo} · ${money(a.lastOrderAmt)}`)}</div>`;
  const att = [];
  if (h) {
    att.push(['warning', 'equal', 'Customer price match on 3 toner items expires in 3 days', btn('secondary sm', 'Request extension', 'tags', `data-a="req" data-kind="PR" data-type="Extend prices" data-what="Extend customer price match on toner (3 items) to Jan 15" data-acct="${a.id}"`)]);
    att.push(['warning', 'circle-pause', 'Order S150147480 is on hold: PO number missing', btn('neutral sm', 'View orders', '', `onclick="go('#/a/${a.id}/orders')"`)]);
    const t4 = TASKS.find(t => t.id === 't4'); if (t4 && !t4.done) att.push(['danger', 'octagon-alert', 'Overdue task: confirm Dock B delivery window', btn('neutral sm', 'Mark done', 'check', 'data-a="toggleTask" data-id="t4"')]);
    const rita = PEOPLE['104218'].find(p => p.id === 'u6'); if (rita.status === 'Locked out') att.push(['info', 'lock', 'Rita Santos (AP) is locked out of the ordering site', btn('neutral sm', 'Open user', '', `onclick="go('#/a/${a.id}/users/u6/settings')"`)]);
  } else if (a.flag && a.flag[1] !== 'New') att.push([a.flag[0], 'circle-alert', `${a.flag[1]} on this account`, btn('neutral sm', 'Billing', '', `onclick="go('#/a/${a.id}/billing')"`)]);
  if (+a.lastOrderAgo.split(' ')[0] >= 90) att.push(['warning', 'clock', `No order in ${a.lastOrderAgo.replace(' ago', '')}`, btn('neutral sm', 'Opportunities', '', `onclick="go('#/a/${a.id}/opps')"`)]);
  const attention = att.length ? `<div class="card" style="margin-bottom:18px;padding:14px 18px"><div class="row" style="justify-content:space-between;margin-bottom:4px"><h3 style="margin:0;font-size:16px">Needs attention</h3><span class="cap">${att.length} item${att.length > 1 ? 's' : ''}</span></div>${att.map(([t, i, txt, b]) => `<div class="row" style="padding:10px 0;border-top:1px solid var(--border-subtle);flex-wrap:wrap"><span style="color:var(--status-${t}-icon);display:flex">${I(i, 18)}</span><span style="flex:1;min-width:200px;font-size:14px">${txt}</span>${b}</div>`).join('')}</div>` : '';
  const mine = TASKS.filter(t => t.acct === a.id && !t.done);
  const upNext = `<div class="card"><div class="ch"><h3>Up next</h3>${btn('ghost sm', 'Add', 'plus', `data-a="createTask" data-acct="${a.id}"`)}</div>${mine.length ? mine.map(t => `<div class="row" style="padding:9px 0;border-top:1px solid var(--border-subtle)">${cbx(t.done, `data-a="toggleTask" data-id="${t.id}" aria-label="Mark done"`)}<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:500">${esc(t.title)}</div><div class="cap" style="${t.when === 'overdue' ? 'color:var(--status-danger-fg)' : ''}">${t.when === 'overdue' ? 'Overdue · ' : ''}${t.due}</div></div>${t.followUp ? pill('info', 'Follow-up') : ''}</div>`).join('') : `<div class="cap" style="padding:8px 0">No open tasks for this account.</div>`}</div>`;
  const ppl = peopleOf(a).filter(p => p.contactRole && p.status !== 'Inactive');
  const contacts = `<div class="card"><div class="ch"><h3>Key contacts</h3><a class="lk" href="#/a/${a.id}/users">All users</a></div>${ppl.map(p => `<div class="row" style="padding:10px 0;border-top:1px solid var(--border-subtle);align-items:flex-start">${av(p.ini, p.c, 36)}<div style="flex:1;min-width:0"><div class="row" style="gap:6px;flex-wrap:wrap"><a href="#/a/${a.id}/users/${p.id}/general" style="font-weight:600;font-size:14px">${esc((p.pref || p.first) + ' ' + p.last)}</a><span class="tag" style="height:20px">${p.contactRole}</span></div><div class="cap">${esc(p.job)}</div>${p.tip ? `<div class="cap" style="margin-top:3px;color:var(--text-secondary)">${I('lightbulb', 12)} ${esc(p.tip)}</div>` : ''}</div><button class="ib" title="Call ${esc(p.first)}" data-a="logCall" data-acct="${a.id}">${I('phone', 17)}</button></div>`).join('')}</div>`;
  const teamL = [...(TEAM[a.id] || [[a.owner, 'Account owner']]).map(([e, r]) => [EMP[e], r]), [EMP.pn, "Rep's manager"]];
  const team = `<div class="card"><div class="ch"><h3>Account team</h3></div>${teamL.map(([e, r]) => `<div class="row" style="padding:8px 0;border-top:1px solid var(--border-subtle)">${av(e.ini, e.c, 30)}<div style="flex:1"><div style="font-size:14px;font-weight:500">${e.name}${e.id === 'db' ? ' (you)' : ''}</div><div class="cap">${r}</div></div></div>`).join('')}</div>`;
  const pins = FEED.filter(f => f.acct === a.id && f.pinned);
  const pinned = `<div class="card"><div class="ch"><h3>Pinned notes</h3><span class="cap">${pins.length}</span></div>${pins.length ? pins.map(f => `<div class="upn" style="align-items:flex-start">${av(f.av[0], f.av[1], 26)}<div style="font-size:13px;line-height:19px">${f.body}<div class="cap" style="margin-top:3px">${f.head.replace(/<[^>]+>/g, '')} · ${f.time}</div></div></div>`).join('') : '<div class="cap">Pin a note from the activity box to keep it here.</div>'}</div>`;
  const details = `<div class="grid"><div class="card s6"><div class="ch"><h3>Business details</h3></div>${[['Legal name', a.name], ['Account number', a.id], ['Account type', TYPE_LABEL[a.type]], ['Service tier', a.tier], ['Industry', a.industry], ['NAICS code', a.naics], ['Locations', a.locs], ['Customer since', a.since], ['Parent group', a.group || 'None']].map(([k, v]) => `<div class="kv"><span class="k">${k}</span><span>${esc(v)}</span></div>`).join('')}</div>
   <div class="card s6"><div class="ch"><h3>Billing and terms</h3><a class="lk" href="#/a/${a.id}/billing">Billing parameters</a></div>${[['Payment terms', 'Net 30'], ['Credit limit', '$75,000'], ['Credit standing', a.creditW], ['Invoice delivery', isHarbor(a) ? 'Monthly summary, emailed to AP' : 'Per order, emailed'], ['Tax status', a.industry.includes('school') || a.industry.includes('Public') ? 'Exempt, certificate on file' : 'Taxable'], ['Billing address', addrLine(addrOf(a).billing)]].map(([k, v]) => `<div class="kv"><span class="k">${k}</span><span style="text-align:right">${esc(v)}</span></div>`).join('')}<div class="cap" style="margin-top:12px">${I('info', 12)} These are the customer's settings. Changes go to Tier 2 from <a class="lk" href="#/a/${a.id}/settings">Account settings</a>.</div></div></div>`;
  const tabs = `<div class="tabs">${[['overview', 'Overview'], ['details', 'Details']].map(([k, l]) => `<button class="${UI.sumTab === k ? 'on' : ''}" data-a="sumTab" data-k="${k}">${l}</button>`).join('')}</div>`;
  const overview = tiles + attention + `<div class="grid"><div class="s8"><div class="card"><div class="ch" style="flex-wrap:wrap"><h3>Activity</h3><a class="lk" href="#/a/${a.id}/activities">Open full history</a></div>${composer(a)}<div style="margin-top:14px">${feedChips()}</div>${feedList(a, 7)}</div></div><div class="s4" style="display:flex;flex-direction:column;gap:18px">${upNext}${contacts}${team}${pinned}</div></div>`;
  return acctHeader(a) + tabs + (UI.sumTab === 'details' ? details : overview);
}

// ================= users =================
const PERMS = ['Admin', 'First user', 'Standard', 'Online invoice', 'View only'];
const UTABS = [['overview', 'Overview'], ['general', 'General'], ['relationship', 'Relationship'], ['settings', 'User settings'], ['logs', 'Logs'], ['favorites', 'Favorites list'], ['cards', 'Credit cards']];
function userTabs(a, uid, tab) {
  return `<div class="tabs">${UTABS.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" onclick="go('${k === 'overview' ? `#/a/${a.id}/users` : `#/a/${a.id}/users/${uid}/${k}`}')">${l}</button>`).join('')}</div>`;
}
function secUsers(a, r) {
  const ppl = peopleOf(a);
  if (r.c) return userDetail(a, ppl.find(p => p.id === r.c) || ppl[0], r.d || 'general');
  const q = UI.usersQ.toLowerCase();
  let rows = ppl.filter(p => (UI.usersInactive || p.status !== 'Inactive') && (!q || fullName(p).toLowerCase().includes(q) || p.email.includes(q) || p.job.toLowerCase().includes(q)));
  const F = { Approvers: p => p.approver, 'AP contacts': p => p.ap, Admins: p => p.perm === 'Admin', 'Locked out': p => p.status === 'Locked out' };
  if (F[UI.usersFilter]) rows = rows.filter(F[UI.usersFilter]);
  const active = ppl.filter(p => p.status !== 'Inactive');
  const sum = [['Active users', active.length, `${ppl.length - active.length} inactive`], ['Approvers', active.filter(p => p.approver).length, 'Approve orders over $500'], ['AP contacts', active.filter(p => p.ap).length, 'Get invoices and reminders'], ['Locked out', active.filter(p => p.status === 'Locked out').length, 'Can\'t sign in to the website']];
  const row = p => {
    const open = UI.userOpen === p.id, st = p.status === 'Active' ? pill('success', 'Active') : p.status === 'Locked out' ? pill('warning', 'Locked out') : pill('neutral', 'Inactive');
    const main = `<tr class="click" data-a="userRow" data-id="${p.id}" style="${open ? 'background:var(--surface-selected)' : ''}"><td><span class="row" style="gap:10px">${av(p.ini, p.c, 32)}<span style="line-height:18px"><b style="font-weight:600">${esc(fullName(p))}</b>${p.contactRole ? ` <span class="tag" style="height:18px;font-size:11px">${p.contactRole}</span>` : ''}<br><span class="cap">${esc(p.job)}</span></span></span></td><td class="hide-p" style="color:var(--text-secondary)">${esc(p.email)}</td><td>${p.perm}</td><td>${tg(p.approver, `data-a="uFlag" data-f="approver" data-id="${p.id}" aria-label="Approver"`)}</td><td>${tg(p.ap, `data-a="uFlag" data-f="ap" data-id="${p.id}" aria-label="AP contact"`)}</td><td class="hide-p" title="${p.ap ? '' : 'Only AP contacts get payment reminders'}">${tg(p.noRem, `data-a="uFlag" data-f="noRem" data-id="${p.id}" aria-label="Exclude from reminders"`, !p.ap)}</td><td class="hide-p" style="color:var(--text-secondary)">${p.login}</td><td>${st}</td><td style="width:40px;color:var(--icon-default)">${I(open ? 'chevron-up' : 'chevron-down', 16)}</td></tr>`;
    const edit = open ? `<tr><td colspan="9" style="height:auto;padding:16px 18px;background:var(--surface-sunken)"><div class="form3">${fld('Email', `<input class="inp" value="${esc(p.email)}" readonly>`)}${fld('Phone', `<input class="inp" value="${esc(p.phone)}" readonly>`)}${fld('Permission set', `<select class="inp" data-ch="userPerm" data-id="${p.id}">${opt(PERMS, p.perm)}</select>`)}</div>
     <div class="row" style="justify-content:space-between;margin-top:14px;flex-wrap:wrap;gap:8px"><span class="cap">Quick edit. Every change is saved to this user's Logs.</span><div class="row" style="gap:8px;flex-wrap:wrap">${btn('neutral sm', 'Log a call', 'phone', `data-a="logCall" data-acct="${a.id}"`)}${btn('secondary sm', 'Open full profile', 'arrow-right', `onclick="go('#/a/${a.id}/users/${p.id}/general')"`)}</div></div></td></tr>` : '';
    return main + edit;
  };
  return slimHeader(a, 'Users', 'People who order, approve or pay for this account', `${btn('neutral', 'Export', 'download', 'data-a="toast" data-msg="User list exported to CSV"')}${btn('primary', 'Add user', 'user-plus', `data-a="addUser" data-acct="${a.id}"`)}`) + userTabs(a, ppl[0].id, 'overview') +
    `<div class="grid" style="margin-bottom:18px">${sum.map(([l, v, s]) => `<div class="s3"><div class="card" style="padding:14px 18px"><div class="ovl">${l}</div><div class="fv">${v}</div><div class="fs">${s}</div></div></div>`).join('')}</div>
  <div class="row" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:14px"><div class="chips">${['All', 'Approvers', 'AP contacts', 'Admins', 'Locked out'].map(c => `<button class="chip${UI.usersFilter === c ? ' on' : ''}" data-a="usersFilter" data-k="${c}">${c}</button>`).join('')}</div>
  <div class="row" style="gap:14px;flex-wrap:wrap"><label class="row" style="gap:8px;font-size:13px">${tg(UI.usersInactive, 'data-a="usersInactive" aria-label="Show inactive users"')}Show inactive</label><label class="inp row" style="width:260px;max-width:100%;gap:8px;color:var(--text-tertiary)">${I('search', 16)}<input data-in="usersQ" value="${esc(UI.usersQ)}" placeholder="Name, email or job" style="border:0;outline:0;flex:1;background:transparent;height:38px"></label></div></div>
  <div class="card" style="padding:0;overflow:hidden"><div class="tablewrap"><table><tr><th>User</th><th class="hide-p">Email</th><th>Permission</th><th>Approver</th><th>AP</th><th class="hide-p">No reminders</th><th class="hide-p">Last sign-in</th><th>Status</th><th></th></tr>${rows.map(row).join('') || `<tr><td colspan="9"><div class="empty">No users match.</div></td></tr>`}</table></div></div>`;
}
function userDetail(a, p, tab) {
  const ppl = peopleOf(a);
  const head = `<div class="card" style="padding:16px 20px;margin-bottom:6px"><div class="row" style="flex-wrap:wrap;gap:14px">${av(p.ini, p.c, 48)}<div style="flex:1;min-width:200px"><div class="row" style="gap:8px;flex-wrap:wrap"><span style="font-size:20px;font-weight:600">${esc((p.title ? p.title + ' ' : '') + fullName(p))}</span>${p.pref ? `<span class="cap">goes by ${esc(p.pref)}</span>` : ''}${p.status === 'Active' ? pill('success', 'Active') : p.status === 'Locked out' ? pill('warning', 'Locked out') : pill('neutral', 'Inactive')}</div><div class="cap" style="margin-top:2px">${esc(p.job)} · ${p.perm}${p.approver ? ' · Approver' : ''}${p.ap ? ' · AP contact' : ''}</div></div>
   <label class="fld" style="width:240px;max-width:100%"><span class="cap">Viewing user</span><select class="inp" data-ch="viewUser" data-tab="${tab}">${ppl.map(x => `<option value="${x.id}"${x.id === p.id ? ' selected' : ''}>${esc(fullName(x))}${x.status === 'Inactive' ? ' (inactive)' : ''}</option>`).join('')}</select></label></div></div>`;
  const T = { general: uGeneral, relationship: uRelationship, settings: uSettings, logs: uLogs, favorites: uFavorites, cards: uCards };
  return slimHeader(a, 'Users', '', btn('neutral', 'All users', 'chevron-left', `onclick="go('#/a/${a.id}/users')"`)) + userTabs(a, p.id, tab) + head + `<div style="margin-top:18px">${(T[tab] || uGeneral)(a, p)}</div>`;
}
function uGeneral(a, p) {
  const f = (l, k, v) => fld(l, `<input class="inp" id="ug-${k}" value="${esc(v ?? p[k])}">`);
  return `<div class="card"><div class="ch"><h3>Personal and contact details</h3>${p.lockEmail ? `<span class="ro">${I('lock', 12)}Email locked</span>` : ''}</div>
  <div class="form3">${fld('Title', `<select class="inp" id="ug-title">${opt(['', 'Mr.', 'Ms.', 'Mx.', 'Dr.'], p.title)}</select>`)}${f('First name', 'first')}${f('Last name', 'last')}${f('Preferred name', 'pref')}${fld('Pronouns', `<select class="inp" id="ug-pron">${opt(['', 'He / him', 'She / her', 'They / them'], p.pron)}</select>`)}${f('Job title', 'job')}${f('Department', 'dept')}${fld('Email', `<input class="inp" id="ug-email" value="${esc(p.email)}" ${p.lockEmail ? 'readonly' : ''}>`)}${f('Phone', 'phone')}${f('Mobile', 'mobile')}${fld('Preferred contact method', `<select class="inp" id="ug-pcm">${opt(['Email', 'Phone', 'Text'], p.pcm || 'Email')}</select>`)}${f('Tip for the team', 'tip', p.tip || '')}</div>
  <div class="row" style="justify-content:flex-end;gap:8px;margin-top:18px">${btn('neutral', 'Cancel', '', 'data-a="rerender"')}${btn('primary', 'Save changes', 'check', `data-a="saveGeneral" data-acct="${a.id}" data-id="${p.id}"`)}</div></div>`;
}
function uRelationship(a, p) {
  const ppl = peopleOf(a).filter(x => x.id !== p.id && x.status !== 'Inactive');
  const locs = addrOf(a).delivery.filter(d => d.active);
  const lnk = p.locs || [locs[0] && locs[0].id];
  return `<div class="grid"><div class="card s6"><div class="ch"><h3>Role on the account</h3></div><div style="display:flex;flex-direction:column;gap:14px">
   ${fld('Contact role', `<select class="inp" id="ur-role">${opt(['', 'Primary', 'AP contact', 'Delivery', 'Decision maker', 'Influencer'], p.contactRole || '')}</select>`)}
   ${fld('Reports to', `<select class="inp" id="ur-rep"><option></option>${ppl.map(x => `<option${p.reportsTo === x.id ? ' selected' : ''} value="${x.id}">${esc(fullName(x))}</option>`).join('')}</select>`)}
   ${fld('Orders approved by', `<select class="inp" id="ur-appr"><option>No approval needed</option>${ppl.filter(x => x.approver).map(x => `<option${p.approvedBy === x.id ? ' selected' : ''} value="${x.id}">${esc(fullName(x))}</option>`).join('')}</select>`)}
   <div class="kv"><span><b style="font-weight:600">Approver</b><div class="cap">Can approve other users' orders</div></span>${tg(p.approver, `data-a="uFlag" data-f="approver" data-id="${p.id}"`)}</div>
   <div class="kv"><span><b style="font-weight:600">AP contact</b><div class="cap">Receives invoices and statements</div></span>${tg(p.ap, `data-a="uFlag" data-f="ap" data-id="${p.id}"`)}</div>
   <div class="kv"><span><b style="font-weight:600">Do not contact</b><div class="cap">Hide from call lists and promotions</div></span>${tg(p.dnc, `data-a="uFlag" data-f="dnc" data-id="${p.id}"`)}</div></div></div>
  <div class="card s6"><div class="ch"><h3>Where they order for</h3></div><div class="cap" style="margin-bottom:10px">Delivery addresses this user can ship to</div><div class="chips">${locs.map(d => `<button class="chip${lnk.includes(d.id) ? ' on' : ''}" data-a="uLoc" data-id="${p.id}" data-k="${d.id}">${lnk.includes(d.id) ? I('check', 14) : ''}${esc(d.label)}</button>`).join('')}</div>
   <div class="cap" style="margin:18px 0 10px">Cost centers</div><div class="chips">${['CC-1100 Admin', 'CC-2200 Clinical', 'CC-3400 Quincy ops'].map((c, k) => `<span class="tag">${c}${k === 2 && UI.pendingSettings['Cost centers'] ? ' · pending' : ''}</span>`).join('')}</div>
   <div class="cap" style="margin-top:12px">Cost centers are account settings. Request new ones from <a class="lk" href="#/a/${a.id}/settings">Account settings</a>.</div></div></div>
  <div class="row" style="justify-content:flex-end;margin-top:18px">${btn('primary', 'Save relationship', 'check', `data-a="saveRel" data-acct="${a.id}" data-id="${p.id}"`)}</div>`;
}
function uSettings(a, p) {
  const pend = UI.pendingSettings['deact-' + p.id];
  const line = (t, d, ctl) => `<div class="kv" style="padding:14px 0;flex-wrap:wrap"><span style="flex:1;min-width:220px"><b style="font-weight:600">${t}</b><div class="cap" style="margin-top:2px">${d}</div></span>${ctl}</div>`;
  return `<div class="grid"><div class="card s7"><div class="ch"><h3>Website sign-in</h3></div>
   ${line('Permission set', 'What this user can do on the ordering website', `<select class="inp" style="width:200px" data-ch="userPerm" data-id="${p.id}">${opt(PERMS, p.perm)}</select>`)}
   ${line('Lock email address', 'Stops the user changing their sign-in email themselves', tg(p.lockEmail, `data-a="uFlag" data-f="lockEmail" data-id="${p.id}"`))}
   ${line('Exclude from payment reminders', p.ap ? 'Stops automatic past-due emails to this AP contact' : 'Only AP contacts get reminders', tg(p.noRem, `data-a="uFlag" data-f="noRem" data-id="${p.id}"`, !p.ap))}
   ${line('Password', p.status === 'Locked out' ? 'Locked after 5 failed attempts on Aug 29' : 'Last changed Sep 28', `<div class="row" style="gap:8px;flex-wrap:wrap">${btn('neutral sm', 'Send reset link', 'mail', `data-a="pwReset" data-id="${p.id}" data-acct="${a.id}"`)}${btn('neutral sm', 'Force reset', 'key-round', `data-a="pwForce" data-id="${p.id}" data-acct="${a.id}"`)}</div>`)}
   ${p.status === 'Locked out' ? line('Unlock account', 'Lets the user try again right away', btn('secondary sm', 'Unlock', 'lock-open', `data-a="unlock" data-id="${p.id}" data-acct="${a.id}"`)) : ''}</div>
  <div class="s5" style="display:flex;flex-direction:column;gap:18px"><div class="card"><div class="ch"><h3>Log in as user</h3></div><div class="cap" style="line-height:18px;margin-bottom:14px">See the ordering website exactly as ${esc(p.first)} sees it, to help with an order or a problem. You must give a reason. The session is recorded in Logs and the customer can see it.</div>${btn('secondary', 'Log in as ' + esc(p.first), 'log-in', `data-a="loginAs" data-id="${p.id}" data-acct="${a.id}"${p.status === 'Inactive' ? ' disabled' : ''}`)}</div>
   <div class="card"><div class="ch"><h3>Deactivate</h3></div><div class="cap" style="line-height:18px;margin-bottom:14px">Removing someone's access is an account change, so Tier 2 does it. Their history stays.</div>${pend ? `<button class="tag" data-a="openReq" data-no="${pend}" style="height:28px">${I('send', 13)}Deactivation requested · ${pend}</button>` : btn('neutral', 'Request deactivation', 'user-x', `data-a="req" data-kind="AC" data-setting="Deactivate user" data-current="${esc(fullName(p))} · ${p.status}" data-what="Deactivate ${esc(fullName(p))}'s website sign-in" data-key="deact-${p.id}" data-acct="${a.id}"`)}</div></div></div>`;
}
function uLogs(a, p) {
  const rows = [...UI.audit.filter(x => x.acct === a.id && x.uid === p.id).map(x => [x.time, 'Logged in as user', `By Dana Brooks · reason: ${esc(x.reason)}`, 'eye', 'violet']),
  ...(p.logs || []),
  [p.login, 'Signed in', 'Ordering website · Chrome on Windows', 'log-in', 'blue'], ['Oct 5', 'Placed order', 'S150147717 · $4,212.80', 'shopping-cart', 'green'], ['Sep 28', 'Password changed', 'Self-service', 'key-round', 'slate'], ['Sep 12', 'Permission changed', `Standard → ${p.perm} · by Tier 2`, 'shield', 'orange'], ['Aug 3', 'Favorites list edited', 'Exam room weekly · 2 items added', 'star', 'amber']];
  return `<div class="card"><div class="ch"><h3>Logs</h3><div class="row" style="gap:8px"><select class="inp" style="height:32px;width:auto;font-size:13px">${opt(['All events', 'Sign-ins', 'Orders', 'Changes'], 'All events')}</select>${btn('neutral sm', 'Export', 'download', 'data-a="toast" data-msg="Logs exported to CSV"')}</div></div>${rows.map(([t, e, d, i, h]) => `<div class="feed">${tile(h, i, 32, 16)}<div style="flex:1"><div class="row" style="justify-content:space-between;font-size:14px"><b style="font-weight:600">${e}</b><span class="cap">${t}</span></div><div class="cap" style="margin-top:2px">${d}</div></div></div>`).join('')}</div>`;
}
const FAVS = [['Exam room weekly', 'Shared with the account', ['EP-21', 'PT-12', 'HC-12']], ['Breakroom', 'Personal', ['CF-2LB', 'HC-12']], ['Quincy clinic restock', 'Shared with the group', ['TN-26A', 'PT-12', 'EP-21', 'CF-2LB']]];
function uFavorites(a, p) {
  return `<div class="card" style="padding:0;overflow:hidden">${FAVS.map(([n, s, items], k) => { const open = UI.favOpen === k; return `<button class="row" style="width:100%;text-align:left;padding:16px 20px;border-bottom:1px solid var(--border-subtle);${open ? 'background:var(--surface-selected)' : ''}" data-a="favOpen" data-k="${k}">${tile('amber', 'star', 34, 17)}<div style="flex:1"><div style="font-weight:600">${n}</div><div class="cap">${s} · ${items.length} items</div></div>${I(open ? 'chevron-up' : 'chevron-down', 16)}</button>${open ? `<div class="tablewrap" style="padding:0 0 8px"><table><tr><th>Item</th><th>Description</th><th class="num">Account price</th><th>Status</th></tr>${items.map(no => { const it = ITEMS.find(i => i.no === no); return `<tr><td class="mono">${no}</td><td>${it.desc}</td><td class="num">${money(it.acctPrice)}</td><td>${pill(it.status === 'Active' ? 'success' : 'warning', it.status)}</td></tr>`; }).join('')}</table></div>` : ''}`; }).join('')}</div>`;
}
function uCards(a, p) {
  const cards = UI.cards[p.id] || (UI.cards[p.id] = []);
  return `<div class="ban" style="background:var(--status-info-bg);border-color:var(--status-info-border);margin-bottom:16px"><span style="color:var(--status-info-icon);display:flex">${I('shield-check', 20)}</span><div>Card numbers are held by the payment provider. This tool only ever shows the brand, last four digits and expiry.</div></div>
  <div class="card" style="padding:0;overflow:hidden"><div class="ch" style="padding:16px 20px 0"><h3>Saved cards</h3><div class="row" style="gap:8px">${btn('neutral sm', 'Send secure link', 'link', `data-a="toast" data-msg="Secure card link emailed to ${esc(p.email)}"`)}${btn('primary sm', 'Add card', 'plus', `data-a="addCard" data-id="${p.id}"`)}</div></div>
  ${cards.length ? `<div class="tablewrap"><table><tr><th>Card</th><th>Nickname</th><th class="hide-p">Cardholder</th><th>Expires</th><th>Status</th><th></th></tr>${cards.map((c, k) => `<tr><td><span class="row" style="gap:8px"><span class="tag mono" style="font-weight:700">${c.t}</span><span class="mono">•••• ${c.l}</span></span></td><td>${esc(c.n)}</td><td class="hide-p">${esc(c.h)}</td><td>${c.e}</td><td>${c.x ? pill('danger', 'Expired') : c.d ? pill('success', 'Default') : ''}</td><td class="num"><div class="row" style="gap:4px;justify-content:flex-end">${!c.d && !c.x ? btn('ghost sm', 'Make default', '', `data-a="cardDefault" data-id="${p.id}" data-k="${k}"`) : ''}${btn('ghost sm', 'Remove', '', `data-a="cardRemove" data-id="${p.id}" data-k="${k}"`)}</div></td></tr>`).join('')}</table></div>` : `<div class="empty" style="padding:28px">No saved cards for ${esc(p.first)}.</div>`}</div>`;
}

// ================= addresses =================
function secAddresses(a) {
  const ad = addrOf(a), b = ad.billing, q = UI.addrQ.toLowerCase();
  let list = ad.delivery.filter(d => (UI.addrDeact || d.active) && (!q || (d.label + ' ' + addrLine(d)).toLowerCase().includes(q)));
  const F = { 'Company truck': d => d.mode === 'Company truck', 'Outside carrier': d => d.mode !== 'Company truck', Residential: d => d.res };
  if (F[UI.addrFilter]) list = list.filter(F[UI.addrFilter]);
  const pend = UI.pendingSettings['Billing address'];
  const billing = `<div class="card" style="margin-bottom:18px"><div class="ch" style="flex-wrap:wrap"><div class="row" style="gap:10px">${tile('blue', 'receipt', 34, 17)}<div><h3>Billing address</h3><div class="cap">Where invoices and statements go. One per account.</div></div></div><div class="row" style="gap:8px">${btn('neutral sm', 'Copy', 'copy', `data-a="copyAddr" data-k="billing" data-acct="${a.id}"`)}${pend ? `<button class="tag" style="height:32px" data-a="openReq" data-no="${pend}">${I('send', 13)}Change requested · ${pend}</button>` : btn('secondary sm', 'Request change', 'send', `data-a="req" data-kind="AC" data-setting="Billing address" data-current="${esc(addrLine(b))}" data-key="Billing address" data-acct="${a.id}"`)}</div></div>
   <div class="grid" style="gap:12px">${[['Label', b.label], ['Address', addrLine(b)], ['Attention', b.att], ['County and region', `${b.county} · ${b.region}`], ['Phone', b.phone], ['Time zone', b.tz]].map(([k, v]) => `<div class="s4"><div class="cap">${k}</div><div style="font-size:14px;margin-top:2px">${esc(v || '—')}</div></div>`).join('')}</div></div>`;
  const cur = UI.addrEdit ? UI.addrDraft : (ad.delivery.find(d => d.id === UI.addrOpen) || list[0]);
  const listCard = `<div class="card s5" style="padding:0;overflow:hidden"><div style="padding:14px 16px;border-bottom:1px solid var(--border-subtle)"><label class="inp row" style="gap:8px;color:var(--text-tertiary)">${I('search', 16)}<input data-in="addrQ" value="${esc(UI.addrQ)}" placeholder="Search label, street or city" style="border:0;outline:0;flex:1;background:transparent;height:38px"></label>
   <div class="row" style="justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:8px"><div class="chips">${['All', 'Company truck', 'Outside carrier', 'Residential'].map(c => `<button class="chip${UI.addrFilter === c ? ' on' : ''}" style="height:28px" data-a="addrFilter" data-k="${c}">${c}</button>`).join('')}</div><label class="row" style="gap:6px;font-size:12px">${tg(UI.addrDeact, 'data-a="addrDeact" aria-label="Show deactivated"')}Deactivated</label></div></div>
   ${list.map(d => { const on = cur && d.id === cur.id; return `<button class="row" style="width:100%;text-align:left;padding:12px 16px;border-bottom:1px solid var(--border-subtle);align-items:flex-start;${on ? 'background:var(--surface-selected);box-shadow:inset 0 0 0 1px var(--border-accent)' : ''}${d.active ? '' : ';opacity:.6'}" data-a="addrOpen" data-id="${d.id}">${tile(d.res ? 'amber' : d.mode === 'Company truck' ? 'teal' : 'blue', d.res ? 'house' : d.mode === 'Company truck' ? 'truck' : 'package', 32, 16)}<div style="flex:1;min-width:0"><div class="row" style="gap:6px;flex-wrap:wrap"><b style="font-weight:600;font-size:14px">${esc(d.label)}</b>${d.active ? '' : pill('neutral', 'Deactivated')}</div><div class="cap" style="margin-top:2px">${esc(addrLine(d))}</div><div class="cap">${d.days.join(', ')} · ${d.from}–${d.to}</div></div></button>`; }).join('') || `<div class="empty" style="padding:24px">No addresses match.</div>`}</div>`;
  let detail;
  if (!cur) detail = `<div class="card s7">${emptyState('map-pin', 'No delivery address selected', 'Pick one from the list or add a new one.')}</div>`;
  else if (UI.addrEdit) detail = addrForm(a, cur);
  else detail = `<div class="card s7"><div class="ch" style="flex-wrap:wrap"><div><h3>${esc(cur.label)}</h3><div class="cap">Delivery address${cur.active ? '' : ' · deactivated'}</div></div><div class="row" style="gap:8px">${btn('neutral sm', 'Copy', 'copy', `data-a="copyAddr" data-k="${cur.id}" data-acct="${a.id}"`)}${btn('neutral sm', cur.active ? 'Deactivate' : 'Reactivate', cur.active ? 'circle-off' : 'rotate-ccw', `data-a="addrActive" data-id="${cur.id}" data-acct="${a.id}"`)}${btn('primary sm', 'Edit', 'pencil', `data-a="addrEditStart" data-id="${cur.id}" data-acct="${a.id}"`)}</div></div>
   <div class="grid" style="gap:14px 20px">${[['Address', addrLine(cur), 's8'], ['Attention', cur.att, 's4'], ['County', cur.county, 's4'], ['Region', cur.region, 's4'], ['Phone', cur.phone, 's4'], ['Time zone', cur.tz, 's4'], ['Mode of delivery', cur.mode, 's4'], ['Delivery hours', `${cur.from} – ${cur.to}`, 's4']].map(([k, v, s]) => `<div class="${s}"><div class="cap">${k}</div><div style="font-size:14px;margin-top:2px">${esc(v || '—')}</div></div>`).join('')}</div>
   <div class="cap" style="margin:18px 0 8px">Delivery days</div><div class="chips">${DAYS.map(d => `<span class="chip${cur.days.includes(d) ? ' on' : ''}" style="height:28px;cursor:default">${d}</span>`).join('')}</div>
   <div class="cap" style="margin:18px 0 8px">Delivery rules</div><div class="chips">${[['nit', 'Non-internal truck'], ['res', 'Residential'], ['no3p', 'Exclude third-party shipping']].map(([k, l]) => `<span class="tag">${I(cur[k] ? 'check' : 'x', 13)}${l}</span>`).join('')}</div>
   <div class="cap" style="margin:18px 0 6px">Delivery instructions</div><div style="font-size:14px;line-height:21px;background:var(--surface-sunken);border-radius:8px;padding:10px 12px">${esc(cur.instr || 'None')}</div></div>`;
  return slimHeader(a, 'Addresses', `${ad.delivery.filter(d => d.active).length} active delivery addresses`, `${btn('neutral', 'Export', 'download', `data-a="exportAddr" data-acct="${a.id}"`)}${btn('primary', 'Add delivery address', 'plus', `data-a="addrNew" data-acct="${a.id}"`)}`) + billing + `<div class="grid">${listCard}${detail}</div>`;
}
function addrForm(a, d) {
  const f = (l, k, cls = '') => `<div class="${cls}">${fld(l, `<input class="inp" value="${esc(d[k])}" data-in="ad" data-f="${k}">`)}</div>`;
  return `<div class="card s7"><div class="ch"><h3>${d.isNew ? 'New delivery address' : 'Edit ' + esc(d.label)}</h3><span class="cap">Changes save to this account</span></div>
  <div class="form2">${f('Label', 'label')}${fld('Type', `<select class="inp"><option>Delivery</option></select>`)}</div><div style="height:14px"></div>
  <div class="form3">${f('Address line 1', 'l1')}${f('Address line 2', 'l2')}${f('Address line 3', 'l3')}${f('Attention', 'att')}${f('City', 'city')}${f('State', 'state')}${f('County', 'county')}${f('ZIP code', 'zip')}${f('Region', 'region')}${f('Phone', 'phone')}${fld('Time zone', `<select class="inp" data-ch="adSel" data-f="tz">${opt(['Eastern (ET)', 'Central (CT)', 'Mountain (MT)', 'Pacific (PT)'], d.tz)}</select>`)}${fld('Mode of delivery', `<select class="inp" data-ch="adSel" data-f="mode">${opt(['Company truck', 'Outside carrier', 'Customer pickup'], d.mode)}</select>`)}${f('Delivery from', 'from')}${f('Delivery to', 'to')}</div>
  <div class="cap" style="margin:18px 0 8px">Delivery days</div><div class="chips">${DAYS.map(x => `<button class="chip${d.days.includes(x) ? ' on' : ''}" style="height:30px" data-a="adDay" data-k="${x}">${x}</button>`).join('')}</div>
  <div style="margin-top:14px">${[['nit', 'Non-internal truck', 'Delivered by an outside carrier, not our trucks'], ['res', 'Residential', 'Home address; carriers may add a fee'], ['no3p', 'Exclude third-party shipping', 'Never ship from a vendor directly']].map(([k, l, s]) => `<div class="kv"><span><b style="font-weight:600">${l}</b><div class="cap">${s}</div></span>${tg(d[k], `data-a="adFlag" data-f="${k}"`)}</div>`).join('')}</div>
  <div style="margin-top:14px">${fld('Delivery instructions', `<textarea class="inp" data-in="ad" data-f="instr">${esc(d.instr)}</textarea>`)}</div>
  <div class="row" style="justify-content:flex-end;gap:8px;margin-top:18px">${btn('neutral', 'Cancel', '', 'data-a="addrCancel"')}${btn('primary', 'Save address', 'check', `data-a="addrSave" data-acct="${a.id}"`)}</div></div>`;
}

// ================= GP calculator =================
function gpVals() {
  const g = UI.gp, it = ITEMS.find(i => i.no === g.item), mult = it.units[g.unit][1];
  const cost = it.cost[g.costType] * mult, list = it.list * mult, acctP = it.acctPrice * mult;
  let price, m;
  if (g.mode === 'price') { price = g.price ?? acctP; m = price > 0 ? (price - cost) / price * 100 : 0; }
  else { m = g.margin ?? (acctP - cost) / acctP * 100; price = m < 100 ? cost / (1 - m / 100) : 0; }
  const qty = Math.max(0, g.qty || 0);
  return { it, mult, cost, list, acctP, price, m, gp: price - cost, qty, ext: price * qty, tgp: (price - cost) * qty, off: list ? (1 - price / list) * 100 : 0 };
}
const FLOOR = 20, HEALTHY = 24;
function gpCheck(m) {
  const t = m < FLOOR ? 'danger' : m < HEALTHY ? 'warning' : 'success';
  const lbl = m < FLOOR ? `Below the ${FLOOR}% floor. Needs manager approval` : m < HEALTHY ? 'Above the floor, below the 24% target' : 'Healthy margin';
  return [t, lbl];
}
function gpResultsHTML(v) {
  const [t, l] = gpCheck(v.m), pos = Math.max(0, Math.min(100, v.m / 50 * 100));
  return `<div class="grid" style="gap:12px">${[['Price per unit', money(v.price), 'gp-o-price'], ['Margin', v.m.toFixed(1) + '%', 'gp-o-m'], ['Gross profit per unit', money(v.gp), 'gp-o-gp'], ['Off list price', v.off.toFixed(1) + '%', 'gp-o-off'], [`Extended (${v.qty})`, money(v.ext), 'gp-o-ext'], ['Total gross profit', money(v.tgp), 'gp-o-tgp']].map(([k, val, id]) => `<div class="s4"><div class="kt" style="min-height:0"><span class="ovl">${k}</span><span class="fv" id="${id}">${val}</span></div></div>`).join('')}</div>
  <div style="margin-top:18px"><div class="row" style="justify-content:space-between;margin-bottom:8px"><span style="font-weight:600;font-size:14px">Margin check</span><span id="gp-o-pill">${pill(t, l)}</span></div>
   <div style="position:relative;height:10px;border-radius:999px;background:linear-gradient(90deg,var(--status-danger-bg) 0 ${FLOOR * 2}%,var(--status-warning-bg) ${FLOOR * 2}% ${HEALTHY * 2}%,var(--status-success-bg) ${HEALTHY * 2}% 100%)"><span id="gp-o-mark" style="position:absolute;top:-4px;left:calc(${pos}% - 9px);width:18px;height:18px;border-radius:50%;background:var(--surface-card);border:3px solid var(--status-${t}-icon);box-shadow:var(--shadow-xs);transition:left .15s"></span></div>
   <div class="row" style="justify-content:space-between;margin-top:6px"><span class="cap">0%</span><span class="cap">Floor ${FLOOR}%</span><span class="cap">Target ${HEALTHY}%</span><span class="cap">50%</span></div></div>`;
}
function gpUpdate() {
  const v = gpVals(), [t, l] = gpCheck(v.m), set = (id, s) => { const e = document.getElementById(id); if (e) e.textContent = s; };
  set('gp-o-price', money(v.price)); set('gp-o-m', v.m.toFixed(1) + '%'); set('gp-o-gp', money(v.gp)); set('gp-o-off', v.off.toFixed(1) + '%'); set('gp-o-ext', money(v.ext)); set('gp-o-tgp', money(v.tgp));
  const p = document.getElementById('gp-o-pill'); if (p) p.innerHTML = pill(t, l);
  const mk = document.getElementById('gp-o-mark'); if (mk) { mk.style.left = `calc(${Math.max(0, Math.min(100, v.m / 50 * 100))}% - 9px)`; mk.style.borderColor = `var(--status-${t}-icon)`; }
  const ap = document.getElementById('gp-approve'); if (ap) ap.style.display = v.m < FLOOR ? '' : 'none';
}
function secGP(a, r) {
  const hist = r.c === 'history', v = gpVals(), it = v.it, g = UI.gp;
  const tabs = `<div class="tabs"><button class="${hist ? '' : 'on'}" onclick="go('#/a/${a.id}/gp')">Calculator</button><button class="${hist ? 'on' : ''}" onclick="go('#/a/${a.id}/gp/history')">Purchase history</button></div>`;
  const itemSel = `<div class="form3">${fld('Item number', `<select class="inp" data-ch="gpItem">${ITEMS.map(i => `<option value="${i.no}"${i.no === g.item ? ' selected' : ''}>${i.no} · ${i.desc.split(',')[0]}</option>`).join('')}</select>`)}${fld('Unit of measure', `<select class="inp" data-ch="gpUnit">${it.units.map(([u], k) => `<option value="${k}"${k === g.unit ? ' selected' : ''}>${u}</option>`).join('')}</select>`)}${fld('Cost type', `<select class="inp" data-ch="gpCost">${opt(Object.keys(it.cost), g.costType)}</select>`)}</div>`;
  const st = it.status === 'Active' ? 'success' : 'warning';
  const itemCard = `<div class="card" style="margin-bottom:18px">${itemSel}<div class="row" style="gap:16px;margin-top:18px;padding-top:16px;border-top:1px solid var(--border-subtle);align-items:flex-start;flex-wrap:wrap"><div style="width:88px;height:88px;border-radius:12px;background:var(--surface-sunken);display:flex;align-items:center;justify-content:center;color:var(--icon-default)">${I({ coffee: 'coffee', cups: 'cup-soda', toner: 'printer', towels: 'scroll', paper: 'file-text' }[it.img], 40)}</div>
   <div style="flex:1;min-width:220px"><div class="row" style="gap:8px;flex-wrap:wrap"><b style="font-size:16px">${it.desc}</b>${pill(st, it.status)}</div><div class="cap" style="margin-top:4px">${it.cat} · <span class="mono">${it.no}</span></div><div class="cap" style="margin-top:4px">${I('warehouse', 12)} ${it.stock}</div><a class="lk row" style="gap:4px;margin-top:8px" href="#" data-a="toast" data-msg="Opens the item page on the ordering website">View on website ${I('external-link', 12)}</a></div>
   <div style="min-width:220px">${[['Sales cost (' + g.costType.split(' ')[0].toLowerCase() + ')', money(v.cost)], ['List price', money(v.list)], ['Website price', money(it.web * v.mult)], ['Account price now', money(v.acctP)], ['Pricing method', it.method]].map(([k, x]) => `<div class="kv" style="padding:6px 0;font-size:13px"><span class="k">${k}</span><b style="font-weight:600;text-align:right">${x}</b></div>`).join('')}</div></div></div>`;
  if (hist) {
    const rows = PURCHASES[it.no] || [], loc = UI.gpLoc || 'All locations';
    const shown = rows.filter(x => loc === 'All locations' || x[3] === loc);
    const qty = shown.reduce((s, x) => s + x[4] * (x[5].startsWith('Case') && it.no === 'CF-2LB' ? 6 : 1), 0), tot = shown.reduce((s, x) => s + x[4] * x[6], 0);
    return slimHeader(a, 'GP calculator', 'Check a price or margin before you quote it') + tabs + itemCard + `<div class="card" style="padding:0;overflow:hidden"><div class="ch" style="padding:16px 20px 0;flex-wrap:wrap"><div><h3>Purchase history · ${it.no}</h3><div class="cap">${shown.length} orders · ${qty} ${it.units[0][0].split(' ')[0].toLowerCase()}s · ${money(tot)}</div></div><div class="row" style="gap:8px"><select class="inp" style="height:32px;width:auto;font-size:13px" data-ch="gpLoc">${opt(['All locations', ...new Set(rows.map(x => x[3]))], loc)}</select>${btn('neutral sm', 'Export CSV', 'download', 'data-a="exportHist"')}</div></div>
     <div class="tablewrap" style="margin-top:12px"><table><tr><th>Date</th><th>Order</th><th class="hide-p">Ordered by</th><th>Ship to</th><th class="num">Qty</th><th>Unit</th><th class="num">Price</th><th class="num">Margin</th></tr>${shown.map(x => `<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="hide-p">${x[2]}</td><td>${x[3]}</td><td class="num">${x[4]}</td><td>${x[5]}</td><td class="num">${money(x[6])}</td><td class="num">${x[7]}%</td></tr>`).join('') || '<tr><td colspan="8"><div class="empty">No purchases of this item.</div></td></tr>'}</table></div></div>`;
  }
  const calc = `<div class="card s7"><div class="ch" style="flex-wrap:wrap"><h3>Work out the price</h3><div class="seg">${[['price', 'Set price'], ['margin', 'Set margin']].map(([k, l]) => `<button class="${g.mode === k ? 'on' : ''}" data-a="gpMode" data-k="${k}">${l}</button>`).join('')}</div></div>
   <div class="form2" style="margin-bottom:18px">${g.mode === 'price' ? fld('Price per unit ($)', `<input class="inp" type="number" step="0.01" min="0" value="${v.price.toFixed(2)}" data-in="gpPrice">`) : fld('Margin (%)', `<input class="inp" type="number" step="0.1" max="99" value="${v.m.toFixed(1)}" data-in="gpMargin">`)}${fld('Quantity', `<input class="inp" type="number" min="0" value="${v.qty}" data-in="gpQty">`)}</div>${gpResultsHTML(v)}
   <div id="gp-approve" class="ban" style="margin-top:16px;background:var(--status-danger-bg);border-color:var(--status-danger-border);${v.m < FLOOR ? '' : 'display:none'}"><span style="color:var(--status-danger-icon);display:flex">${I('octagon-alert', 20)}</span><div style="flex:1">This price needs your manager's approval before you can quote it.</div>${btn('neutral sm', 'Ask for approval', 'send', `data-a="gpReq" data-type="Margin approval" data-acct="${a.id}"`)}</div></div>`;
  const acts = `<div class="s5" style="display:flex;flex-direction:column;gap:18px"><div class="card"><div class="ch"><h3>Use this price</h3></div><div style="display:flex;flex-direction:column;gap:8px">
   ${btn('neutral', 'Copy price', 'copy', 'data-a="gpCopy"')}${btn('neutral', 'Add item to contract', 'file-plus', `data-a="gpReq" data-type="Add item to contract" data-acct="${a.id}"`)}${btn('neutral', 'Create new contract', 'scroll-text', `data-a="gpReq" data-type="Create contract" data-acct="${a.id}"`)}${btn('neutral', 'Assign catalog', 'book-marked', `data-a="req" data-kind="AC" data-setting="Product sets" data-current="Healthcare essentials 2026" data-what="Add ${it.no} to the account catalog" data-acct="${a.id}"`)}${btn('neutral', 'Add to favorites', 'star', 'data-a="gpFav"')}</div>
   <div class="cap" style="margin-top:12px;line-height:18px">Contract and catalog changes go out as requests (PR or AC) so the right team sets them up.</div></div>
   <div class="card"><div class="ch"><h3>Recent prices paid</h3><a class="lk" href="#/a/${a.id}/gp/history">All</a></div>${(PURCHASES[it.no] || []).slice(0, 3).map(x => `<div class="kv" style="font-size:13px"><span><b style="font-weight:600">${money(x[6])}</b> · ${x[4]} ${x[5].toLowerCase()}</span><span class="cap">${x[0]}</span></div>`).join('')}</div></div>`;
  return slimHeader(a, 'GP calculator', 'Check a price or margin before you quote it') + tabs + itemCard + `<div class="grid">${calc}${acts}</div>`;
}

// ================= opportunities =================
const OTABS = [['overview', 'Overview'], ['coverage', 'Category coverage'], ['reorder', 'Reorder timing'], ['notes', 'From notes'], ['service', 'Service'], ['competitors', 'Competitors']];
function secOpps(a, r) {
  const tab = r.c || 'overview';
  const tabs = `<div class="tabs">${OTABS.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" onclick="go('#/a/${a.id}/opps${k === 'overview' ? '' : '/' + k}')">${l}</button>`).join('')}</div>`;
  const oppCard = o => `<div class="card" style="${o.state === 'dismissed' ? 'opacity:.55' : ''}"><div class="row" style="align-items:flex-start;flex-wrap:wrap">${tile(o.h, o.icon, 40, 20)}<div style="flex:1;min-width:220px"><div class="row" style="gap:8px;flex-wrap:wrap"><span class="tag">${o.type}</span><span class="cap">Confidence: ${o.conf}</span>${o.state === 'plan' ? pill('info', 'On call plan') : o.state === 'task' ? pill('success', 'Task created') : o.state === 'dismissed' ? pill('neutral', 'Dismissed') : ''}</div><div style="font-size:16px;font-weight:600;margin-top:6px">${o.title}</div></div><div style="text-align:right"><div class="fv" style="font-size:18px;margin:0">${o.val}</div><div class="cap">Estimated value</div></div></div>
   <div style="margin:12px 0 0 52px">${o.ev.map(([i, t]) => `<div class="row" style="gap:8px;padding:4px 0;font-size:13px;color:var(--text-secondary)"><span style="display:flex;color:var(--icon-default)">${I(i, 15)}</span>${t}</div>`).join('')}</div>
   ${o.state === 'new' ? `<div class="row" style="gap:8px;margin:14px 0 0 52px;flex-wrap:wrap">${btn('secondary sm', 'Add to call plan', 'calendar-plus', `data-a="opp" data-k="plan" data-id="${o.id}"`)}${btn('neutral sm', 'Create task', 'plus', `data-a="opp" data-k="task" data-id="${o.id}" data-acct="${a.id}"`)}${btn('ghost sm', 'Dismiss', '', `data-a="opp" data-k="dismissed" data-id="${o.id}"`)}</div>` : ''}</div>`;
  const sigRow = s => `<div class="feed" style="${s.state !== 'new' ? 'opacity:.55' : ''}"><span class="tag" style="background:var(--category-${s.h}-bg);color:var(--category-${s.h}-fg);flex:none">${s.tag}</span><div style="flex:1;min-width:0"><div style="font-size:14px;line-height:21px">${s.txt}</div><div class="cap" style="margin-top:3px">${s.src}</div></div>${s.state === 'new' ? `<div class="row" style="gap:4px">${btn('ghost sm', 'Make opportunity', '', `data-a="sig" data-k="opp" data-id="${s.id}"`)}${btn('ghost sm', 'Dismiss', '', `data-a="sig" data-k="dismiss" data-id="${s.id}"`)}</div>` : pill('neutral', s.state === 'opp' ? 'Opportunity made' : 'Dismissed')}</div>`;
  let body;
  if (!isHarbor(a)) body = emptyState('target', 'Opportunities need order history', 'Signals appear once there are a few months of orders and notes on this account. Open Harbor Medical Group to see a full example.', btn('secondary', 'Open Harbor Medical Group', 'arrow-right', `onclick="go('#/a/104218/opps')"`));
  else if (tab === 'overview') body = `<div class="grid"><div class="s8" style="display:flex;flex-direction:column;gap:16px">${OPPS.map(oppCard).join('')}</div><div class="s4"><div class="card"><div class="ch"><h3>Signals from notes</h3><a class="lk" href="#/a/${a.id}/opps/notes">All</a></div>${SIGNALS.map(sigRow).join('')}</div></div></div>`;
  else if (tab === 'coverage') { const C = { buy: ['success', 'Buying'], down: ['warning', 'Dropping'], lapsed: ['warning', 'Lapsed'], never: ['neutral', 'Never bought'] }; body = `<div class="cap" style="margin-bottom:12px">What they buy from us across our categories, compared with similar healthcare accounts</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">${CATS.map(([i, n, s, d]) => `<div class="card" style="padding:14px 16px;${s === 'never' ? 'border-style:dashed' : ''}"><div class="row" style="justify-content:space-between"><span style="display:flex;color:var(--icon-default)">${I(i, 20)}</span>${pill(...C[s])}</div><div style="font-weight:600;margin-top:10px">${n}</div><div class="cap" style="margin-top:2px">${d}</div></div>`).join('')}</div>`; }
  else if (tab === 'reorder') body = `<div class="card" style="padding:0;overflow:hidden"><div class="tablewrap"><table><tr><th>Item</th><th class="hide-p">Usually orders</th><th>Last ordered</th><th style="width:30%">Cycle</th><th>Status</th><th></th></tr>${REORDER.map(([no, d, ev, last, pct, t, s]) => `<tr><td><b class="mono">${no}</b><div class="cap">${d}</div></td><td class="hide-p">${ev}</td><td>${last}</td><td><div class="bar"><div style="width:${Math.min(pct, 100)}%;background:var(--status-${t}-icon)"></div></div><div class="cap" style="margin-top:4px">${pct}% of the usual gap</div></td><td>${pill(t, s)}</td><td>${btn('ghost sm', 'Price it', '', `data-a="gpGo" data-k="${no}" data-acct="${a.id}"`)}</td></tr>`).join('')}</table></div></div>`;
  else if (tab === 'notes') body = `<div class="card"><div class="cap" style="margin-bottom:6px">Phrases picked out of call notes and internal notes. Nothing is acted on until someone on the team decides.</div>${SIGNALS.map(sigRow).join('')}</div>`;
  else if (tab === 'service') body = `<div class="grid">${AGREEMENTS.map(g => `<div class="s4"><div class="card">${tile(g.h, g.icon, 36, 18)}<div style="font-weight:600;margin-top:10px">${g.name}</div><div class="cap">${g.detail}</div><div style="margin-top:10px">${pill(...g.status)}</div>${g.status[1] === 'Lapsed' ? `<div style="margin-top:12px">${btn('secondary sm', 'Restart service', 'rotate-ccw', `data-a="req" data-kind="SS" data-svc="${g.svc}" data-act="New" data-what="Restart ${g.name.toLowerCase()}" data-acct="${a.id}"`)}</div>` : ''}</div></div>`).join('')}</div>`;
  else body = `<div class="card">${[['Online marketplace', 'Breakroom and coffee', 'Jordan Lee · Aug 12', 'Faster delivery on small orders'], ['Local janitorial supplier', 'Cleaning supplies (likely)', 'Note · Aug 12', 'Cleaning crew buys their own']].map(([n, c, s, w]) => `<div class="feed">${tile('amber', 'swords', 32, 16)}<div style="flex:1"><div style="font-weight:600">${n}</div><div class="cap">${c} · ${w}</div><div class="cap" style="margin-top:2px">${s}</div></div></div>`).join('')}</div>`;
  const nNew = OPPS.filter(o => o.state === 'new').length;
  return slimHeader(a, 'Opportunities', isHarbor(a) ? `${nNew} new · built from buying patterns, category gaps and notes` : '') + tabs + body;
}

// ================= account settings & specialty =================
function secSettings(a) {
  const row = ([l, d, v]) => { const p = UI.pendingSettings[l]; return `<div class="kv" style="padding:14px 0;flex-wrap:wrap"><span style="flex:1;min-width:200px"><b style="font-weight:600">${l}</b><div class="cap">${d}</div></span><span style="flex:1;min-width:180px;color:var(--text-secondary)">${esc(v)}</span>${p ? `<button class="tag" style="height:30px" data-a="openReq" data-no="${p}">${I('send', 13)}Change requested · ${p}</button>` : btn('neutral sm', 'Request change', '', `data-a="req" data-kind="AC" data-setting="${esc(l)}" data-current="${esc(v)}" data-key="${esc(l)}" data-acct="${a.id}"`)}</div>`; };
  return slimHeader(a, 'Account settings', "The customer's own setup. Tier 2 changes these on the customer's behalf.") +
    `<div class="ban" style="background:var(--status-info-bg);border-color:var(--status-info-border);margin-bottom:18px"><span style="color:var(--status-info-icon);display:flex">${I('info', 20)}</span><div style="flex:1">Reps can't change these directly. <b>Request change</b> sends an Account change (AC) request to Tier 2, and you can follow it in My requests.</div><a class="lk" href="#/requests">My requests</a></div>
  <div class="grid">${SETTINGS.map(([g, rows]) => `<div class="s6"><div class="card"><div class="ch"><h3>${g}</h3></div>${rows.map(row).join('')}</div></div>`).join('')}</div>`;
}
const SVCS = ['All agreements', 'Beverage', 'Rentals', 'Coffee bar', 'Janitorial and sanitation', 'Custom print', 'Furniture', 'Technology'];
function secSpecialty(a) {
  const t = UI.specTab, list = AGREEMENTS.filter(g => t === 'All agreements' || g.svc === t);
  const reqs = REQUESTS.filter(r => r.kind === 'SS' && r.acct === a.id);
  return slimHeader(a, 'Specialty services', 'Agreements run by specialty teams. Changes go out as Specialty service (SS) requests.', btn('primary', 'Request service', 'concierge-bell', `data-a="req" data-kind="SS" data-svc="${t === 'All agreements' ? 'Rentals' : t}" data-acct="${a.id}"`)) +
    `<div class="tabs">${SVCS.map(s => `<button class="${s === t ? 'on' : ''}${s !== 'All agreements' && !AGREEMENTS.some(g => g.svc === s) ? ' dim' : ''}" data-a="specTab" data-k="${s}">${s}</button>`).join('')}</div>
  ${list.length && isHarbor(a) ? `<div class="grid" style="margin-bottom:18px">${list.map(g => `<div class="s4"><div class="card"><div class="row" style="justify-content:space-between">${tile(g.h, g.icon, 40, 20)}${pill(...g.status)}</div><div style="font-weight:600;font-size:15px;margin-top:12px">${g.name}</div><div class="cap">${g.svc} · ${g.detail}</div><div class="row" style="gap:8px;margin-top:14px;flex-wrap:wrap">${btn('neutral sm', 'Change', 'pencil', `data-a="req" data-kind="SS" data-svc="${g.svc}" data-act="Change" data-acct="${a.id}"`)}${g.svc === 'Rentals' ? btn('neutral sm', 'Repair', 'wrench', `data-a="req" data-kind="SS" data-svc="Rentals" data-act="Repair or maintenance" data-acct="${a.id}"`) : ''}${btn('ghost sm', 'Cancel', '', `data-a="req" data-kind="SS" data-svc="${g.svc}" data-act="Cancel" data-acct="${a.id}"`)}</div></div></div>`).join('')}</div>` : emptyState('concierge-bell', `No ${t === 'All agreements' ? 'specialty' : t.toLowerCase()} agreements`, 'Use Request service to start one. The specialty team follows up with the customer.')}
  <div class="card" style="padding:0;overflow:hidden;margin-top:18px"><div class="ch" style="padding:16px 20px 4px"><h3>Specialty service requests</h3><span class="cap">${reqs.length}</span></div>${reqs.length ? `<div class="tablewrap"><table><tr><th>Number</th><th>What's asked</th><th>Team</th><th>Status</th><th class="hide-p">Due</th></tr>${reqs.map(r => `<tr class="click" data-a="openReq" data-no="${r.no}"><td class="mono" style="font-weight:600">${r.no}</td><td style="white-space:normal">${esc(r.what)}</td><td>${r.team}</td><td>${pill(RST[r.status], r.status)}</td><td class="hide-p">${r.due}</td></tr>`).join('')}</table></div>` : '<div class="cap" style="padding:0 20px 18px">None yet.</div>'}</div>`;
}

// ================= other sections =================
const sampleNote = a => isHarbor(a) ? '' : `<div class="cap" style="margin-bottom:12px">${I('info', 12)} Sample rows shown so you can see the layout.</div>`;
function secOrders(a) {
  const t = UI.ordersTab, rows = ORDERS.filter(o => t === 'All' || (t === 'Open' ? o[6] !== 'Delivered' : t === 'Problems' ? ['Backordered', 'On hold'].includes(o[6]) : o[6] === 'Delivered'));
  return slimHeader(a, 'Orders', 'Orders live in the order system. This view reads them live.', `${btn('neutral', 'New return', 'undo-2', 'data-a="linkOut" data-k="return"')}${btn('primary', 'New order', 'shopping-cart', 'data-a="linkOut" data-k="order"')}`) + sampleNote(a) +
    `<div class="chips" style="margin-bottom:14px">${['Open', 'Problems', 'Delivered', 'All'].map(c => `<button class="chip${t === c ? ' on' : ''}" data-a="ordersTab" data-k="${c}">${c}</button>`).join('')}</div>
  <div class="card" style="padding:0;overflow:hidden"><div class="tablewrap"><table><tr><th>Order</th><th class="hide-p">PO</th><th>Placed</th><th class="num">Lines</th><th class="num">Total</th><th>Status</th><th class="hide-p">Delivery</th></tr>${rows.map(o => `<tr class="click" data-a="linkOut" data-k="orderView"><td class="mono" style="font-weight:600">${o[0]}</td><td class="hide-p mono">${o[1]}</td><td>${o[2]}</td><td class="num">${o[3]}</td><td class="num">${money(o[4])}</td><td>${pill(o[5], o[6])}</td><td class="hide-p" style="color:var(--text-secondary)">${o[7]}</td></tr>`).join('')}</table></div></div>`;
}
function secQuotes(a) {
  const t = UI.quotesTab, rows = QUOTES.filter(q => t === 'All' || (t === 'Open' ? ['Sent', 'Viewed'].includes(q[7]) : q[7] === t));
  return slimHeader(a, 'Quotes', '', btn('primary', 'New quote', 'badge-dollar-sign', 'data-a="linkOut" data-k="quote"')) + sampleNote(a) +
    `<div class="chips" style="margin-bottom:14px">${['Open', 'Accepted', 'Expired', 'All'].map(c => `<button class="chip${t === c ? ' on' : ''}" data-a="quotesTab" data-k="${c}">${c}</button>`).join('')}</div>
  <div class="card" style="padding:0;overflow:hidden"><div class="tablewrap"><table><tr><th>Quote</th><th class="hide-p">Created by</th><th>Created</th><th class="num">Total</th><th class="num">Margin</th><th class="hide-p">Expires</th><th>Status</th><th></th></tr>${rows.map(q => `<tr><td class="mono" style="font-weight:600">${q[0]}</td><td class="hide-p">${q[1]}</td><td>${q[2]}</td><td class="num">${money(q[3])}</td><td class="num">${q[4]}%</td><td class="hide-p">${q[5]}</td><td>${pill(q[6], q[7])}</td><td class="num">${['Sent', 'Viewed'].includes(q[7]) ? btn('ghost sm', 'Follow up', '', `data-a="quoteFollow" data-k="${q[0]}" data-acct="${a.id}"`) : ''}</td></tr>`).join('') || '<tr><td colspan="8"><div class="empty">No quotes here.</div></td></tr>'}</table></div></div>`;
}
function secSubs(a) {
  return slimHeader(a, 'Subscriptions', 'Automatic repeat orders', btn('primary', 'New subscription', 'plus', 'data-a="linkOut" data-k="sub"')) + sampleNote(a) +
    `<div class="card" style="padding:0;overflow:hidden"><div class="tablewrap"><table><tr><th>Subscription</th><th>How often</th><th>Next order</th><th class="num">Each order</th><th>Status</th></tr>${SUBS.map(s => `<tr><td style="font-weight:600">${s[0]}</td><td>${s[1]}</td><td>${s[2]}</td><td class="num">${s[4] ? money(s[4]) : '—'}</td><td>${pill(s[3] === 'Active' ? 'success' : s[3] === 'Paused' ? 'warning' : 'neutral', s[3])}</td></tr>`).join('')}</table></div></div>`;
}
const BTABS = ['Balance and aging', 'Payment terms', 'Invoice settings', 'Credit'];
function secBilling(a) {
  const t = UI.billTab, kvs = rows => rows.map(([k, v]) => `<div class="kv"><span class="k">${k}</span><span style="text-align:right">${v}</span></div>`).join('');
  let body;
  if (t === 'Balance and aging') body = `<div class="grid"><div class="card s5"><div class="ovl">Balance due</div><div class="fv" style="font-size:28px;line-height:36px">${isHarbor(a) ? '$18,240.55' : money(a.lastOrderAmt)}</div><div class="fs">${a.credit <= 2 ? 'Past due. AR is following up' : 'Nothing past due'}</div><div style="margin-top:16px">${btn('neutral sm', 'Send statement', 'mail', 'data-a="toast" data-msg="Statement emailed to the AP contact"')}</div></div><div class="card s7"><div class="ch"><h3>Aging</h3></div>${kvs([['Current', isHarbor(a) ? '$15,120.55' : money(a.lastOrderAmt)], ['1–30 days', isHarbor(a) ? '$3,120.00' : '$0.00'], ['31–60 days', a.credit <= 2 ? '$284.97' : '$0.00'], ['61–90 days', '$0.00'], ['Over 90 days', a.credit <= 1 ? '$2,814.00' : '$0.00']])}</div></div>`;
  else if (t === 'Payment terms') body = `<div class="card">${kvs([['Terms', 'Net 30'], ['Early payment discount', 'None'], ['Preferred payment', 'Check and ACH'], ['Cards on file', `${Object.values(UI.cards).flat().filter(c => !c.x).length} (see Users › Credit cards)`]])}</div>`;
  else if (t === 'Invoice settings') { const p = UI.pendingSettings['Invoice settings']; body = `<div class="card">${kvs([['Invoice delivery', isHarbor(a) ? 'Monthly summary, emailed to AP' : 'Per order, emailed'], ['PO required', 'Yes, on every order'], ['Cost center on invoice', 'Yes'], ['Paper copy', 'No']])}<div style="margin-top:14px">${p ? `<button class="tag" style="height:30px" data-a="openReq" data-no="${p}">${I('send', 13)}Change requested · ${p}</button>` : btn('neutral sm', 'Request change', 'send', `data-a="req" data-kind="AC" data-setting="Invoice settings" data-current="Monthly summary, emailed to AP" data-key="Invoice settings" data-acct="${a.id}"`)}</div></div>`; }
  else body = `<div class="grid"><div class="card s5"><div class="ovl">Credit standing</div><div class="fv">${a.creditW}</div>${meter(a.credit)}<div class="fs" style="margin-top:10px">Set by AR from payment history</div></div><div class="card s7">${kvs([['Credit limit', '$75,000'], ['Available', isHarbor(a) ? '$56,759.45' : '$74,000.00'], ['Average days to pay', isHarbor(a) ? '27' : '31'], ['Last payment', isHarbor(a) ? 'Today · $12,400.00 by check' : 'Sep 30']])}</div></div>`;
  return slimHeader(a, 'Billing parameters', 'Read live from accounting') + `<div class="tabs">${BTABS.map(x => `<button class="${x === t ? 'on' : ''}" data-a="billTab" data-k="${x}">${x}</button>`).join('')}</div>` + body;
}
function secCases(a) {
  return slimHeader(a, 'Purchasing cases', 'Problems with an order the purchasing team works on (PC numbers)', btn('primary', 'Open a case', 'plus', 'data-a="toast" data-msg="Opens the purchasing case form. Purchasing cases stay in their own system in Release 1"')) + sampleNote(a) + casesTable();
}
function secPricing(a) {
  return slimHeader(a, 'Pricing and margin', 'Proposed section (open question C-01)', btn('primary', 'Request pricing change', 'tags', `data-a="req" data-kind="PR" data-acct="${a.id}"`)) +
    `<div class="ban" style="background:var(--status-warning-bg);border-color:var(--status-warning-border);margin-bottom:18px"><span style="color:var(--status-warning-icon);display:flex">${I('triangle-alert', 20)}</span><div>2 price arrangements expire in the next 7 days.</div></div>${sampleNote(a)}
  <div class="card" style="padding:0;overflow:hidden"><div class="tablewrap"><table><tr><th>Method</th><th>Name</th><th class="num">Items</th><th class="hide-p">Set by</th><th class="hide-p">Starts</th><th>Ends</th><th class="hide-p">Applies to</th><th>Status</th><th></th></tr>${PRICING.map(p => `<tr><td><span class="row" style="gap:8px">${tile(p[0], p[1], 28, 14)}<b style="font-weight:600">${p[2]}</b></span></td><td>${p[3]}</td><td class="num">${p[4].toLocaleString()}</td><td class="hide-p">${p[5]}</td><td class="hide-p">${p[6]}</td><td>${p[7]}</td><td class="hide-p">${p[9]}</td><td>${pill(p[10], p[11])}</td><td>${p[10] === 'warning' ? btn('ghost sm', 'Extend', '', `data-a="req" data-kind="PR" data-type="Extend prices" data-what="Extend ${esc(p[3])} (${p[2]}) past ${p[7]}" data-acct="${a.id}"`) : ''}</td></tr>`).join('')}</table></div></div>`;
}
function secActivities(a) {
  return slimHeader(a, 'Activities', 'Proposed section (open question C-01). The full history for this account.') + `<div class="card">${composer(a)}<div style="margin:16px 0 4px">${feedChips()}</div>${feedList(a)}</div>`;
}
function secMessages(a) { return slimHeader(a, 'Message center', '') + emptyState('messages-square', 'Customer messages are planned for Release 2', "Messages customers send from the ordering website will land here, tied to the account and the user who sent them."); }
function secAnalytics(a) { return slimHeader(a, 'Analytics and reports', '') + emptyState('chart-column', 'Account reports are planned for Release 3', 'Spend by category, by location and by user, plus margin trends. The report list is still being gathered.'); }

// ================= actions =================
const cur = () => acct(parse().a) || ACCOUNTS[0];
const person = (acctId, id) => peopleOf(acct(acctId)).find(p => p.id === id);
const A = {
  rerender: () => render(),
  toggleTask: el => { const t = TASKS.find(x => x.id === el.dataset.id); t.done = !t.done; render(); if (t.done && todayTasks().every(x => x.done)) toast("Everything for today is done. The ring is closed.", 'party-popper'); },
  workTab: el => { UI.workTab = el.dataset.k; render(); },
  nextQuote: () => { UI.quoteIdx++; render(); },
  logFilter: el => { UI.logFilter = el.dataset.k; render(); },
  workPromo: el => { UI.promo = { id: el.dataset.id, idx: 0, outcome: 'Interested', note: '' }; go('#/dash/promotions'); },
  promoChoose: el => { UI.promo = { id: el.dataset.id, idx: 0, outcome: 'Interested', note: '' }; render(); },
  promoPick: el => { UI.promo.idx = +el.dataset.k; render(); },
  promoStep: el => { const p = PROMOS.find(x => x.id === UI.promo.id), n = p.list.length; UI.promo.idx = (UI.promo.idx + +el.dataset.k + n) % n; render(); },
  promoOutcome: el => { UI.promo.outcome = el.dataset.k; render(); },
  promoSave: () => {
    const p = PROMOS.find(x => x.id === UI.promo.id), a = acct(p.list[UI.promo.idx]), o = UI.promo.outcome;
    (PROMO_STATE[p.id] = PROMO_STATE[p.id] || {})[a.id] = o;
    FEED.unshift({ acct: a.id, kind: 'calls', note: true, av: ['DB', 'teal'], head: `<b>Dana Brooks</b> · ${p.name} promotion`, body: `Outcome: ${o}${UI.promo.note ? ' · ' + mentionize(UI.promo.note) : ''}${a.owner !== 'db' ? ` · <span class="mention">@${EMP[a.owner].name}</span>` : ''}`, time: 'Just now', day: 'Today' });
    if (o === 'Callback') TASKS.push({ id: 't' + Date.now(), icon: 'phone', title: `Promo callback: ${a.name}`, acct: a.id, due: 'Tomorrow', when: 'later', followUp: true, done: false });
    if (!TOUCHED.some(t => t[0] === a.id)) STATS.accounts++;
    UI.promo.note = ''; UI.promo.outcome = 'Interested'; UI.promo.idx = (UI.promo.idx + 1) % p.list.length; render();
    toast(`Saved: ${esc(a.name)} · ${o}${o === 'Callback' ? ' · callback task added' : ''}`);
  },
  
  reqFilter: el => { UI.reqFilter = el.dataset.k; render(); },
  openReq: el => openReqDetail(el.dataset.no),
  logCall: el => openLogCall(el.dataset.acct),
  createTask: el => openCreateTask(el.dataset.acct),
  saveCall: () => saveCall(), saveTask: () => saveTask(), saveReq: el => saveReq(el),
  closeModal: el => { closeModal(); if (el.dataset.toast) toast(el.dataset.toast); },
  toast: el => toast(el.dataset.msg, 'info'),
  req: el => { const d = el.dataset; openRequest(d.kind, { acct: d.acct, setting: d.setting, current: d.current, what: d.what, svc: d.svc, act: d.act, type: d.type, item: d.item, key: d.key }); },
  linkOut: el => toast({ order: 'New order opens the order system. Release 1 links out', quote: 'New quote opens the quoting system. Release 1 links out', return: 'Returns open the order system. Release 1 links out', orderView: 'Order details open in the order system', sub: 'Subscriptions are set up in the order system' }[el.dataset.k], 'external-link'),
  newAccount: () => modal('Create new account', `${fld('Business or person name', `<input class="inp" id="na-name" placeholder="e.g. Seaport Pediatrics">`)}<div class="form2">${fld('Account type', `<select class="inp" id="na-type">${Object.entries(TYPE_LABEL).map(([k, l]) => `<option value="${k}"${k === 'store' ? ' selected' : ''}>${l}</option>`).join('')}</select>`)}${fld('Service tier', `<select class="inp" id="na-tier">${opt(['Standard', 'Small business', 'Premium business', 'White glove'], 'Standard')}</select>`)}</div><div class="form2">${fld('Industry', `<input class="inp" id="na-ind" placeholder="e.g. Pediatricians">`)}${fld('City', `<input class="inp" id="na-city" value="Boston, MA">`)}</div><div class="cap">In the real tool this checks for duplicates and sends the setup to Tier 2. Here it creates a sample account.</div>`, `${btn('neutral', 'Cancel', '', 'data-a="closeModal"')}${btn('primary', 'Create account', 'plus', 'data-a="saveAccount"')}`),
  saveAccount: () => {
    const name = val('na-name').trim(); if (!name) { toast('Add a name first', 'circle-alert'); return; }
    const id = String(106100 + ACCOUNTS.length), ini = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(), type = val('na-type');
    ACCOUNTS.unshift({ id, ini, c: 'blue', name, type, locs: { store: 1, 'account-personal': 1, 'account-few': 3, 'account-multi': 8, 'account-group': 4, orbit: 20 }[type], tier: val('na-tier'), industry: val('na-ind') || 'Not set', naics: '—', status: 'Open', city: val('na-city'), since: 2026, owner: 'db', ytd: 0, margin: 0, annual: 0, life: 0, trend: 0, health: 3, healthW: 'New', credit: 3, creditW: 'Pending review', lastOrder: '—', lastOrderAgo: 'No orders yet', lastOrderAmt: 0, stage: 'New', flag: ['info', 'New'] });
    FEED.unshift({ acct: id, kind: 'notes', icon: ['blue', 'building-2'], head: '<b>Dana Brooks</b> created this account', body: 'Setup sent to Tier 2', time: 'Just now', day: 'Today' });
    closeModal(); go(`#/a/${id}/summary`); toast(`${esc(name)} created as account ${id}`);
  },
  notifs: el => { const N = [['at-sign', 'blue', '<b>Jordan Lee</b> mentioned you on Harbor Medical Group', '#/a/104218/summary', '8:52 AM'], ['send', 'slate', '<b>AC-1038</b> is in progress with Tier 2', '#/requests', 'Yesterday'], ['tags', 'orange', '<b>PR-0874</b> is waiting on the customer', '#/requests', 'Oct 10'], ['lock', 'amber', '<b>Rita Santos</b> is locked out of the website', '#/a/104218/users/u6/settings', 'Oct 9']]; popAt(el, `<div class="row" style="justify-content:space-between;padding:8px 10px"><b>Notifications</b><button class="lk" data-a="notifRead">Mark all read</button></div>${N.map(([i, h, t, href, tm]) => `<a class="mi" href="${href}">${tile(h, i, 30, 15)}<span style="flex:1;font-size:13px;line-height:18px">${t}<br><span class="cap">${tm}</span></span>${UI.notifRead ? '' : '<span class="dot" style="background:var(--status-info-dot)"></span>'}</a>`).join('')}`).style.width = '340px'; },
  notifRead: () => { UI.notifRead = true; closePops(); render(); },
  display: el => { const p = popAt(el || document.querySelector('[data-a="display"]'), `<div style="padding:10px"><div class="ovl" style="margin-bottom:8px">Mode</div><div class="seg">${['light', 'dark'].map(t => `<button class="${UI.theme === t ? 'on' : ''}" data-a="setTheme" data-k="${t}">${I(t === 'light' ? 'sun' : 'moon', 15)} ${t === 'light' ? 'Light' : 'Dark'}</button>`).join('')}</div><div class="ovl" style="margin:16px 0 8px">Accent</div><div class="chips">${['ink', 'ocean', 'evergreen', 'violet', 'terracotta'].map(k => `<button class="chip${UI.accent === k ? ' on' : ''}" data-a="setAccent" data-k="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div><div class="cap" style="margin-top:14px">Midnight Calm presets. Ink is the default.</div></div>`); p.style.width = '300px'; },
  setTheme: el => { UI.theme = el.dataset.k; render(); A.display(); },
  setAccent: el => { UI.accent = el.dataset.k; render(); A.display(); },
  // account
  pinAcct: el => { const a = acct(el.dataset.id); a.pinned = !a.pinned; render(); toast(a.pinned ? 'Pinned to your customer list' : 'Unpinned'); },
  sumTab: el => { UI.sumTab = el.dataset.k; render(); },
  feedFilter: el => { UI.feedFilter = el.dataset.k; render(); },
  feedMore: () => { UI.feedMore = !UI.feedMore; render(); },
  mention: el => { const ta = document.getElementById('noteText'); UI.noteText = ta.value.replace(/@([\w]*)$/, '@' + el.dataset.n + ' '); ta.value = UI.noteText; closePops(); ta.focus(); },
  postNote: el => {
    const txt = (document.getElementById('noteText').value || '').trim(); if (!txt) { toast('Write a note first', 'circle-alert'); return; }
    const type = val('noteType'), pin = document.getElementById('notePin').checked, tagged = Object.values(EMP).filter(e => txt.includes('@' + e.name));
    FEED.unshift({ acct: el.dataset.acct, kind: 'notes', note: true, av: ['DB', 'teal'], head: `<b>Dana Brooks</b> · ${type}`, body: mentionize(txt), time: 'Just now', day: 'Today', pinned: pin });
    UI.noteText = ''; UI.feedFilter = 'All'; render(); toast(`Note posted${tagged.length ? ' · ' + tagged.map(e => e.name).join(', ') + ' notified' : ''}`, 'message-square');
  },
  userRow: el => { UI.userOpen = UI.userOpen === el.dataset.id ? null : el.dataset.id; render(); },
  usersFilter: el => { UI.usersFilter = el.dataset.k; render(); },
  usersInactive: () => { UI.usersInactive = !UI.usersInactive; render(); },
  uFlag: el => { const p = person(cur().id, el.dataset.id), f = el.dataset.f; p[f] = !p[f]; if (f === 'ap' && !p.ap) p.noRem = false; render(); toast(`${esc(fullName(p))}: ${{ approver: 'Approver', ap: 'AP contact', noRem: 'Exclude from reminders', lockEmail: 'Lock email', dnc: 'Do not contact' }[f]} ${p[f] ? 'on' : 'off'} · saved to Logs`); },
  uLoc: el => { const p = person(cur().id, el.dataset.id); const locs = addrOf(cur()).delivery; p.locs = p.locs || [locs[0].id]; const k = el.dataset.k; p.locs = p.locs.includes(k) ? p.locs.filter(x => x !== k) : [...p.locs, k]; render(); },
  saveGeneral: el => { const p = person(el.dataset.acct, el.dataset.id); ['title', 'first', 'last', 'pref', 'pron', 'job', 'dept', 'email', 'phone', 'mobile', 'pcm', 'tip'].forEach(k => { const e = document.getElementById('ug-' + k); if (e) p[k] = e.value; }); p.ini = (p.first[0] || '') + (p.last[0] || ''); render(); toast(`${esc(fullName(p))} updated`); },
  saveRel: el => { const p = person(el.dataset.acct, el.dataset.id); p.contactRole = val('ur-role'); p.reportsTo = val('ur-rep'); p.approvedBy = val('ur-appr'); render(); toast('Relationship saved'); },
  pwReset: el => { const p = person(el.dataset.acct, el.dataset.id); log(p, 'Password reset link sent', 'By Dana Brooks', 'mail'); toast(`Reset link emailed to ${esc(p.email)}`, 'mail'); },
  pwForce: el => { const p = person(el.dataset.acct, el.dataset.id); log(p, 'Password reset forced', 'Must set a new password at next sign-in · by Dana Brooks', 'key-round'); toast(`${esc(p.first)} must set a new password at next sign-in`, 'key-round'); },
  unlock: el => { const p = person(el.dataset.acct, el.dataset.id); p.status = 'Active'; log(p, 'Account unlocked', 'By Dana Brooks', 'lock-open'); render(); toast(`${esc(fullName(p))} unlocked`, 'lock-open'); },
  loginAs: el => { const p = person(el.dataset.acct, el.dataset.id); modal(`Log in as ${esc(fullName(p))}`, `<div class="cap" style="line-height:18px">You'll see the ordering website as ${esc(p.first)} does. Anything you do is recorded under your name.</div>${fld('Reason (required)', `<select class="inp" id="la-why">${opt(['Helping place an order', 'Checking what they see', 'Fixing a cart or favorites list', 'Troubleshooting a website problem'], 'Helping place an order')}</select>`)}${fld('Details', `<input class="inp" id="la-det" placeholder="e.g. Customer on the phone, can't find exam paper">`)}`, `${btn('neutral', 'Cancel', '', 'data-a="closeModal"')}${btn('primary', 'Start session', 'log-in', `data-a="loginStart" data-acct="${el.dataset.acct}" data-id="${p.id}"`)}`); },
  loginStart: el => { const p = person(el.dataset.acct, el.dataset.id), reason = val('la-why') + (val('la-det') ? ': ' + val('la-det') : ''); UI.audit.unshift({ acct: el.dataset.acct, uid: p.id, reason, time: 'Just now' }); closeModal(); go(`#/a/${el.dataset.acct}/users/${p.id}/logs`); toast(`Session as ${esc(p.first)} recorded in Logs. The website would open in a new tab`, 'eye'); },
  favOpen: el => { UI.favOpen = UI.favOpen === +el.dataset.k ? -1 : +el.dataset.k; render(); },
  addCard: el => { modal('Add a card', `<div class="ban" style="background:var(--status-info-bg);border-color:var(--status-info-border)"><span style="color:var(--status-info-icon);display:flex">${I('shield-check', 20)}</span><div>The card number is typed into the payment provider's secure form below. It never touches this tool.</div></div>${fld('Nickname', `<input class="inp" id="cd-n" placeholder="e.g. Purchasing card">`)}${fld('Cardholder name', `<input class="inp" id="cd-h">`)}<div style="border:1px dashed var(--border-control);border-radius:10px;padding:16px;text-align:center;color:var(--text-tertiary);font-size:13px">${I('credit-card', 18)} Payment provider's secure card form appears here</div>`, `${btn('neutral', 'Cancel', '', 'data-a="closeModal"')}${btn('primary', 'Save card', 'check', `data-a="saveCard" data-id="${el.dataset.id}"`)}`); },
  saveCard: el => { const list = UI.cards[el.dataset.id] = UI.cards[el.dataset.id] || []; list.push({ h: val('cd-h') || 'Cardholder', n: val('cd-n') || 'New card', t: 'VISA', l: String(1000 + Math.floor(Math.random() * 9000)), e: '12/2029', d: !list.some(c => c.d && !c.x) }); closeModal(); render(); toast('Card saved by the payment provider. Only the last four are stored', 'credit-card'); },
  cardDefault: el => { UI.cards[el.dataset.id].forEach((c, k) => c.d = k === +el.dataset.k); render(); toast('Default card changed'); },
  cardRemove: el => { const c = UI.cards[el.dataset.id].splice(+el.dataset.k, 1)[0]; render(); toast(`Card ending ${c.l} removed`); },
  addUser: el => modal('Add user', `<div class="form2">${fld('First name', '<input class="inp" id="nu-f">')}${fld('Last name', '<input class="inp" id="nu-l">')}</div>${fld('Email', '<input class="inp" id="nu-e" type="email">')}<div class="form2">${fld('Job title', '<input class="inp" id="nu-j">')}${fld('Permission set', `<select class="inp" id="nu-p">${opt(PERMS, 'Standard')}</select>`)}</div><label class="row" style="gap:8px;font-size:14px"><input type="checkbox" id="nu-i" checked> Email them an invite to the ordering website</label>`, `${btn('neutral', 'Cancel', '', 'data-a="closeModal"')}${btn('primary', 'Add user', 'user-plus', `data-a="saveUser" data-acct="${el.dataset.acct}"`)}`),
  saveUser: el => { const f = val('nu-f').trim(), l = val('nu-l').trim(); if (!f || !l) { toast('Add a first and last name', 'circle-alert'); return; } const ppl = peopleOf(acct(el.dataset.acct)); const id = 'u' + (ppl.length + 1) + Date.now() % 1000; ppl.push({ id, ini: f[0] + l[0], c: 'green', first: f, last: l, title: '', pref: '', pron: '', job: val('nu-j') || 'User', dept: '', email: val('nu-e') || `${f[0]}${l}@example.com`.toLowerCase(), phone: '', mobile: '', perm: val('nu-p'), approver: false, ap: false, noRem: false, login: 'Never', status: 'Active', hasLogin: true }); UI.userOpen = id; closeModal(); render(); toast(`${esc(f)} added${document.getElementById('nu-i')?.checked !== false ? ' · invite sent' : ''}`, 'user-plus'); },
  addrOpen: el => { UI.addrOpen = el.dataset.id; UI.addrEdit = null; render(); },
  addrFilter: el => { UI.addrFilter = el.dataset.k; render(); },
  addrDeact: () => { UI.addrDeact = !UI.addrDeact; render(); },
  addrActive: el => { const d = addrOf(acct(el.dataset.acct)).delivery.find(x => x.id === el.dataset.id); d.active = !d.active; if (!d.active) UI.addrDeact = true; render(); toast(`${esc(d.label)} ${d.active ? 'reactivated' : 'deactivated. Kept for order history'}`); },
  addrEditStart: el => { const d = addrOf(acct(el.dataset.acct)).delivery.find(x => x.id === el.dataset.id); UI.addrDraft = JSON.parse(JSON.stringify(d)); UI.addrEdit = d.id; render(); },
  addrNew: el => { const b = addrOf(acct(el.dataset.acct)).billing; UI.addrDraft = { id: 'a' + Date.now(), isNew: true, label: '', l1: '', l2: '', l3: '', city: b.city, state: b.state, zip: '', county: '', region: b.region, att: '', phone: '', tz: 'Eastern (ET)', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], from: '9:00 AM', to: '5:00 PM', mode: 'Company truck', nit: false, res: false, no3p: false, instr: '', active: true }; UI.addrEdit = 'new'; render(); },
  addrCancel: () => { UI.addrEdit = null; render(); },
  adDay: el => { const d = UI.addrDraft, k = el.dataset.k; d.days = d.days.includes(k) ? d.days.filter(x => x !== k) : DAYS.filter(x => d.days.includes(x) || x === k); render(); },
  adFlag: el => { UI.addrDraft[el.dataset.f] = !UI.addrDraft[el.dataset.f]; render(); },
  addrSave: el => { const d = UI.addrDraft; if (!d.label.trim() || !d.l1.trim()) { toast('Add a label and address line 1', 'circle-alert'); return; } const list = addrOf(acct(el.dataset.acct)).delivery; const isNew = d.isNew; delete d.isNew; const k = list.findIndex(x => x.id === d.id); if (k >= 0) list[k] = d; else list.unshift(d); UI.addrOpen = d.id; UI.addrEdit = null; render(); toast(`${esc(d.label)} ${isNew ? 'added' : 'saved'}`); },
  copyAddr: el => { const ad = addrOf(acct(el.dataset.acct)), d = el.dataset.k === 'billing' ? ad.billing : ad.delivery.find(x => x.id === el.dataset.k); copyText(`${d.label}\n${d.att ? 'Attn: ' + d.att + '\n' : ''}${[d.l1, d.l2, d.l3].filter(Boolean).join('\n')}\n${d.city}, ${d.state} ${d.zip}`); toast('Address copied', 'copy'); },
  exportAddr: el => { const ad = addrOf(acct(el.dataset.acct)); downloadCSV(`addresses-${el.dataset.acct}.csv`, [['Type', 'Label', 'Line 1', 'Line 2', 'City', 'State', 'ZIP', 'Attention', 'Mode', 'Days', 'Hours', 'Active'], ['Billing', ad.billing.label, ad.billing.l1, ad.billing.l2, ad.billing.city, ad.billing.state, ad.billing.zip, ad.billing.att, '', '', '', 'Yes'], ...ad.delivery.map(d => ['Delivery', d.label, d.l1, d.l2, d.city, d.state, d.zip, d.att, d.mode, d.days.join(' '), `${d.from}-${d.to}`, d.active ? 'Yes' : 'No'])]); toast('Addresses exported to CSV', 'download'); },
  gpMode: el => { const v = gpVals(); UI.gp.mode = el.dataset.k; UI.gp.price = +v.price.toFixed(2); UI.gp.margin = +v.m.toFixed(1); render(); },
  gpCopy: () => { const v = gpVals(); copyText(v.price.toFixed(2)); toast(`${money(v.price)} copied (${v.m.toFixed(1)}% margin)`, 'copy'); },
  gpReq: el => { const v = gpVals(); openRequest('PR', { acct: el.dataset.acct, type: el.dataset.type, item: `${v.it.no} · ${v.it.units[UI.gp.unit][0]}`, what: `${money(v.price)} per ${v.it.units[UI.gp.unit][0].split(' ')[0].toLowerCase()} (${v.m.toFixed(1)}% margin on ${UI.gp.costType.toLowerCase()})` }); },
  gpFav: el => { popAt(el, `<div class="cap" style="padding:8px 10px 4px">Add ${UI.gp.item} to a favorites list for…</div>${[['network', 'The whole group', 'All 5 Harbor Health accounts'], ['building-2', 'This account', 'Everyone at Harbor Medical'], ['user', 'One user', 'Pick a person']].map(([i, t, s]) => `<button class="mi" data-a="gpFavPick" data-k="${t}">${I(i, 18)}<span><b style="font-weight:600">${t}</b><br><span class="cap">${s}</span></span></button>`).join('')}`, 'left'); },
  gpFavPick: el => { closePops(); toast(`${UI.gp.item} added to favorites for ${el.dataset.k.toLowerCase()}`, 'star'); },
  gpGo: el => { const it = ITEMS.find(i => i.no === el.dataset.k); UI.gp = { ...UI.gp, item: it.no, unit: 0, price: null, margin: null, costType: 'Replacement cost' }; go(`#/a/${el.dataset.acct}/gp`); },
  exportHist: () => { const it = UI.gp.item, loc = UI.gpLoc || 'All locations'; downloadCSV(`purchase-history-${it}.csv`, [['Date', 'Order', 'Ordered by', 'Ship to', 'Qty', 'Unit', 'Price', 'Margin %'], ...(PURCHASES[it] || []).filter(x => loc === 'All locations' || x[3] === loc)]); toast('Purchase history exported to CSV', 'download'); },
  opp: el => { const o = OPPS.find(x => x.id === el.dataset.id); o.state = el.dataset.k; if (o.state === 'task') TASKS.push({ id: 't' + Date.now(), icon: o.icon === 'building-2' ? 'calendar-clock' : 'phone', title: o.title, acct: el.dataset.acct, due: 'This week', when: 'later', done: false }); render(); toast({ plan: 'Added to your call plan', task: 'Task created in your planner', dismissed: 'Dismissed. It won\'t come back unless the signal changes' }[o.state]); },
  sig: el => { const s = SIGNALS.find(x => x.id === el.dataset.id); s.state = el.dataset.k; if (s.state === 'opp') OPPS.push({ id: 'o' + Date.now(), h: s.h, icon: 'lightbulb', type: s.tag, title: s.txt.replace(/<[^>]+>/g, '').slice(0, 70), ev: [['message-square', s.src]], val: 'To estimate', conf: 'Low', state: 'new' }); render(); toast(s.state === 'opp' ? 'Opportunity created' : 'Signal dismissed'); },
  specTab: el => { UI.specTab = el.dataset.k; render(); },
  ordersTab: el => { UI.ordersTab = el.dataset.k; render(); },
  quotesTab: el => { UI.quotesTab = el.dataset.k; render(); },
  billTab: el => { UI.billTab = el.dataset.k; render(); },
  quoteFollow: el => { TASKS.push({ id: 't' + Date.now(), icon: 'badge-dollar-sign', title: `Follow up on quote ${el.dataset.k}`, acct: el.dataset.acct, due: 'Today', when: 'today', followUp: true, done: false }); render(); toast('Follow-up added to today', 'clipboard-check'); },
};
function log(p, e, d, i) { (p.logs = p.logs || []).unshift(['Just now', e, d, i, 'slate']); }
function mentionize(txt) { let s = esc(txt); Object.values(EMP).forEach(e => { s = s.split('@' + e.name).join(`<span class="mention">@${e.name}</span>`); }); return s; }
function copyText(t) { try { navigator.clipboard.writeText(t).catch(() => { }); } catch (e) { } }
function downloadCSV(name, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const u = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000);
}

// ================= inputs =================
function keepFocus(sel) { const e = document.querySelector(sel); if (e) { e.focus(); const n = e.value.length; try { e.setSelectionRange(n, n); } catch (x) { } } }
function searchResults(q, scope) {
  q = q.toLowerCase(); const out = [];
  if (scope === 'All' || scope === 'Account number') ACCOUNTS.filter(a => a.name.toLowerCase().includes(q) || a.id.includes(q)).slice(0, 5).forEach(a => out.push([av(a.ini, a.c, 28, a.type !== 'account-personal'), esc(a.name), `Account ${a.id} · ${a.city}`, `#/a/${a.id}/summary`]));
  if (scope === 'All' || scope === 'User') Object.entries(PEOPLE).forEach(([id, ps]) => ps.filter(p => fullName(p).toLowerCase().includes(q) || p.email.includes(q)).slice(0, 4).forEach(p => out.push([av(p.ini, p.c, 28), esc(fullName(p)), `${esc(p.job)} · ${esc(acct(id).name)}`, `#/a/${id}/users/${p.id}/general`])));
  if (scope === 'All' || scope === 'Sales order') ORDERS.filter(o => o[0].toLowerCase().includes(q) || o[1].includes(q)).slice(0, 3).forEach(o => out.push([tile('green', 'shopping-cart', 28, 14), o[0], `Harbor Medical Group · ${o[6]}`, '#/a/104218/orders']));
  if (scope === 'All' || scope === 'Quote') QUOTES.filter(x => x[0].toLowerCase().includes(q)).slice(0, 3).forEach(x => out.push([tile('orange', 'badge-dollar-sign', 28, 14), x[0], `Harbor Medical Group · ${money(x[3])}`, '#/a/104218/quotes']));
  return out.slice(0, 9);
}
const IN = {
  search: el => {
    const q = el.value.trim(); if (q.length < 2) { closePops(); return; }
    const res = searchResults(q, val('scope') || 'All');
    const p = popAt(document.getElementById('searchbox'), res.length ? res.map(([lead, t, s, h], k) => `<a class="mi${k === 0 ? ' first' : ''}" href="${h}">${lead}<span style="line-height:18px"><b style="font-weight:600">${t}</b><br><span class="cap">${s}</span></span></a>`).join('') : `<div class="cap" style="padding:14px">Nothing found for "${esc(q)}". Try an account number, order or quote number.</div>`, 'left');
    p.style.width = Math.min(560, innerWidth - 16) + 'px'; p.classList.add('searchpop');
  },
  custQ: el => { UI.cust.q = el.value; UI.cust.page = 0; render(); keepFocus('[data-in="custQ"]'); },
  usersQ: el => { UI.usersQ = el.value; render(); keepFocus('[data-in="usersQ"]'); },
  addrQ: el => { UI.addrQ = el.value; render(); keepFocus('[data-in="addrQ"]'); },
  promoNote: el => { UI.promo.note = el.value; },
  noteText: el => {
    UI.noteText = el.value; const m = el.value.slice(0, el.selectionStart).match(/@(\w*)$/);
    if (!m) { closePops(); return; }
    const list = Object.values(EMP).filter(e => e.name.toLowerCase().startsWith(m[1].toLowerCase()) || e.name.split(' ')[1].toLowerCase().startsWith(m[1].toLowerCase()));
    if (!list.length) { closePops(); return; }
    popAt(el, `<div class="cap" style="padding:6px 10px">Tag a teammate</div>${list.map(e => `<button class="mi" data-a="mention" data-n="${e.name}">${av(e.ini, e.c, 26)}<span><b style="font-weight:600">${e.name}</b><br><span class="cap">${e.role}</span></span></button>`).join('')}`, 'left');
  },
  ad: el => { UI.addrDraft[el.dataset.f] = el.value; },
  gpPrice: el => { UI.gp.price = parseFloat(el.value) || 0; gpUpdate(); },
  gpMargin: el => { UI.gp.margin = Math.min(99, parseFloat(el.value) || 0); gpUpdate(); },
  gpQty: el => { UI.gp.qty = parseInt(el.value) || 0; gpUpdate(); },
};
const CH = {
  secSwitch: el => go(`#/a/${cur().id}/${el.value}`),
  viewUser: el => go(`#/a/${cur().id}/users/${el.value}/${el.dataset.tab}`),
  userPerm: el => { const p = person(cur().id, el.dataset.id), old = p.perm; p.perm = el.value; log(p, 'Permission changed', `${old} → ${p.perm} · by Dana Brooks`, 'shield'); render(); toast(`${esc(fullName(p))} is now ${p.perm} · saved to Logs`, 'shield'); },
  adSel: el => { UI.addrDraft[el.dataset.f] = el.value; },
  gpItem: el => { UI.gp = { ...UI.gp, item: el.value, unit: 0, price: null, margin: null }; const it = ITEMS.find(i => i.no === el.value); if (!it.cost[UI.gp.costType]) UI.gp.costType = Object.keys(it.cost)[0]; render(); },
  gpUnit: el => { UI.gp.unit = +el.value; UI.gp.price = null; UI.gp.margin = null; render(); },
  gpCost: el => { UI.gp.costType = el.value; if (UI.gp.mode === 'margin') UI.gp.margin = null; render(); },
  gpLoc: el => { UI.gpLoc = el.value; render(); },
  scope: () => { const q = document.getElementById('q'); if (q && q.value.trim().length > 1) IN.search(q); },
};

// ================= events & boot =================
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#/"]');
  if (link && !e.target.closest('[data-a]')) { e.preventDefault(); go(link.getAttribute('href')); return; }
  const el = e.target.closest('[data-a]');
  if (!el) { if (!e.target.closest('.pop') && !e.target.closest('#q') && !e.target.closest('#noteText')) closePops(); return; }
  const f = A[el.dataset.a]; if (!f) return;
  if (!['notifs', 'display', 'gpFav', 'setTheme', 'setAccent', 'mention'].includes(el.dataset.a) && !el.closest('.pop')) closePops();
  e.preventDefault(); e.stopPropagation(); f(el, e);
});
document.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el && IN[el.dataset.in]) IN[el.dataset.in](el, e); });
document.addEventListener('change', e => { const el = e.target; if (el.id === 'scope') return CH.scope(); const c = el.closest('[data-ch]'); if (c && CH[c.dataset.ch]) CH[c.dataset.ch](c, e); });
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); const q = document.getElementById('q'); if (q) q.focus(); }
  else if (e.key === 'Escape') { closeModal(); closePops(); }
  else if (e.key === 'Enter' && e.target.id === 'q') { const f = document.querySelector('.searchpop a'); if (f) { closePops(); e.target.value = ''; go(f.getAttribute('href')); } }
});
function boot() { render(); }
window.addEventListener('DOMContentLoaded', boot);
