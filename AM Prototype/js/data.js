// ---------- Sample data (all invented) ----------
const CC = { violet: '#5B3FE0', blue: '#2563D9', teal: '#0F7C72', orange: '#C2570A', pink: '#C42A70', green: '#1B8C4C', slate: '#55596E', red: '#C9303A', amber: '#946800' };
const TODAY = new Date(2026, 9, 12);

const EMP = {
  db: { id: 'db', ini: 'DB', c: 'teal', name: 'Dana Brooks', role: 'Inside sales rep' },
  jl: { id: 'jl', ini: 'JL', c: 'blue', name: 'Jordan Lee', role: 'Outside sales rep' },
  so: { id: 'so', ini: 'SO', c: 'orange', name: 'Sam Ortiz', role: 'Dedicated CSR' },
  pn: { id: 'pn', ini: 'PN', c: 'pink', name: 'Priya Nair', role: 'Manager · Branch operations' },
  sa: { id: 'sa', ini: 'SA', c: 'blue', name: 'Samira Ahmed', role: 'Pricing team' },
  t2: { id: 't2', ini: 'T2', c: 'slate', name: 'Tier 2 team', role: 'Account changes' },
};
const ME = EMP.db;

const TYPE_LABEL = { 'account-personal': 'Personal', store: 'One location', 'account-few': 'A few locations', 'account-multi': 'Many locations', 'account-group': 'Several businesses', orbit: 'Conglomerate' };

const ACCOUNTS = [
  { id: '104218', ini: 'HM', c: 'violet', name: 'Harbor Medical Group', type: 'account-multi', locs: 12, tier: 'Premium business', industry: 'Healthcare', naics: '621111', status: 'Open', city: 'Boston, MA', since: 2016, group: 'Harbor Health Partners', groupCount: 5, owner: 'db', ytd: 482310.55, margin: 24.6, annual: 611400, life: 2410000, trend: -6.2, health: 4, healthW: 'Healthy', credit: 4, creditW: 'Good standing', lastOrder: 'Oct 5', lastOrderAgo: '7 days ago', lastOrderAmt: 4212.80, pinned: true, stage: 'Customer' },
  { id: '104377', ini: 'LD', c: 'teal', name: 'Lakeside Dental', type: 'store', locs: 1, tier: 'Standard', industry: 'Dental office', naics: '621210', status: 'Open', city: 'Worcester, MA', since: 2019, owner: 'db', ytd: 38240.10, margin: 27.1, annual: 46100, life: 211000, trend: 3.4, health: 4, healthW: 'Healthy', credit: 5, creditW: 'Excellent', lastOrder: 'Jul 8', lastOrderAgo: '96 days ago', lastOrderAmt: 612.40, stage: 'Customer' },
  { id: '102951', ini: 'SL', c: 'orange', name: 'Summit Logistics Partners', type: 'account-group', locs: 9, tier: 'Premium business', industry: 'Trucking and freight', naics: '484121', status: 'Open', city: 'Springfield, MA', since: 2014, group: 'Summit Logistics Partners', groupCount: 3, owner: 'db', ytd: 214880.00, margin: 21.2, annual: 268000, life: 1940000, trend: -11.8, health: 2, healthW: 'Needs attention', credit: 1, creditW: 'Credit hold', lastOrder: 'Sep 2', lastOrderAgo: '40 days ago', lastOrderAmt: 2814.00, stage: 'Customer', flag: ['danger', 'Credit hold'] },
  { id: '100842', ini: 'NL', c: 'blue', name: 'Northgate Public Library', type: 'account-few', locs: 4, tier: 'Standard', industry: 'Public administration', naics: '519120', status: 'Open', city: 'Lowell, MA', since: 2011, owner: 'db', ytd: 52410.75, margin: 22.8, annual: 61900, life: 640000, trend: 1.2, health: 3, healthW: 'Stable', credit: 4, creditW: 'Good standing', lastOrder: 'Oct 1', lastOrderAgo: '11 days ago', lastOrderAmt: 1180.00, stage: 'Customer' },
  { id: '100015', ini: 'MH', c: 'pink', name: 'Mariner Holdings', type: 'orbit', locs: 41, tier: 'White glove', industry: 'Holding company', naics: '551112', status: 'Open', city: 'Boston, MA', since: 2009, group: 'Mariner Holdings', groupCount: 9, owner: 'db', ytd: 1210400.00, margin: 19.4, annual: 1480000, life: 12800000, trend: 4.1, health: 5, healthW: 'Thriving', credit: 4, creditW: 'Good standing', lastOrder: 'Oct 9', lastOrderAgo: '3 days ago', lastOrderAmt: 18420.00, stage: 'Customer' },
  { id: '105520', ini: 'BC', c: 'green', name: 'Brightline Café', type: 'store', locs: 1, tier: 'Standard', industry: 'Cafés and coffee shops', naics: '722515', status: 'Open', city: 'Cambridge, MA', since: 2026, owner: 'db', ytd: 2410.20, margin: 31.0, annual: 2410, life: 2410, trend: 0, health: 3, healthW: 'Stable', credit: 4, creditW: 'Good standing', lastOrder: 'Jul 5', lastOrderAgo: '99 days ago', lastOrderAmt: 412.30, stage: 'Customer', flag: ['info', 'New'] },
  { id: '101266', ini: 'CS', c: 'slate', name: 'Crestview School District', type: 'account-multi', locs: 18, tier: 'Premium business', industry: 'K–12 public schools', naics: '611110', status: 'Open', city: 'Andover, MA', since: 2008, owner: 'db', ytd: 398120.00, margin: 18.9, annual: 452000, life: 5100000, trend: 2.6, health: 4, healthW: 'Healthy', credit: 4, creditW: 'Good standing', lastOrder: 'Oct 8', lastOrderAgo: '4 days ago', lastOrderAmt: 6240.00, stage: 'Customer' },
  { id: '106004', ini: 'AM', c: 'amber', name: 'Alex Morgan', type: 'account-personal', locs: 1, tier: 'Standard', industry: 'Personal account', naics: '—', status: 'Open', city: 'Quincy, MA', since: 2025, owner: 'db', ytd: 1240.00, margin: 33.2, annual: 1310, life: 1890, trend: 8.0, health: 4, healthW: 'Healthy', credit: 4, creditW: 'Good standing', lastOrder: 'Sep 20', lastOrderAgo: '22 days ago', lastOrderAmt: 86.40, stage: 'Customer' },
  { id: '099731', ini: 'RW', c: 'red', name: 'Riverside Wellness Studio', type: 'store', locs: 1, tier: 'Standard', industry: 'Gyms and fitness', naics: '713940', status: 'Closed', city: 'Newton, MA', since: 2017, owner: 'db', ytd: 0, margin: 0, annual: 3120, life: 48200, trend: -100, health: 1, healthW: 'At risk', credit: 3, creditW: 'Watch', lastOrder: 'Jun 13', lastOrderAgo: '121 days ago', lastOrderAmt: 140.00, stage: 'Inactive', flag: ['neutral', 'Closed'] },
  { id: '103388', ini: 'OP', c: 'blue', name: 'Oakpoint Property Group', type: 'account-group', locs: 6, tier: 'Premium business', industry: 'Property management', naics: '531311', status: 'Open', city: 'Braintree, MA', since: 2015, group: 'Oakpoint Property Group', groupCount: 2, owner: 'so', ytd: 88120.00, margin: 23.5, annual: 101000, life: 870000, trend: -2.0, health: 3, healthW: 'Stable', credit: 4, creditW: 'Good standing', lastOrder: 'Jun 24', lastOrderAgo: '110 days ago', lastOrderAmt: 940.00, stage: 'Customer' },
  { id: '104902', ini: 'GV', c: 'teal', name: 'Greenvale Veterinary', type: 'account-few', locs: 3, tier: 'Standard', industry: 'Veterinary clinics', naics: '541940', status: 'Open', city: 'Framingham, MA', since: 2019, owner: 'jl', ytd: 9920.00, margin: 25.9, annual: 14880, life: 58900, trend: -38.0, health: 2, healthW: 'Needs attention', credit: 4, creditW: 'Good standing', lastOrder: 'Jun 23', lastOrderAgo: '104 days ago', lastOrderAmt: 1240.00, stage: 'Customer' },
  { id: '105874', ini: 'PF', c: 'pink', name: 'Pine & Fern Florists', type: 'store', locs: 1, tier: 'Standard', industry: 'Florists', naics: '459310', status: 'Open', city: 'Salem, MA', since: 2021, owner: 'db', ytd: 7310.00, margin: 28.4, annual: 9400, life: 31800, trend: -4.0, health: 3, healthW: 'Stable', credit: 2, creditW: 'Past due', lastOrder: 'Sep 29', lastOrderAgo: '13 days ago', lastOrderAmt: 284.97, stage: 'Customer', flag: ['warning', 'Past due'] },
  { id: '102114', ini: 'BL', c: 'slate', name: 'Bayline Construction', type: 'account-few', locs: 5, tier: 'Standard', industry: 'General contractors', naics: '236220', status: 'Open', city: 'Quincy, MA', since: 2018, owner: 'db', ytd: 61240.00, margin: 20.4, annual: 70100, life: 402000, trend: 6.8, health: 4, healthW: 'Healthy', credit: 4, creditW: 'Good standing', lastOrder: 'Oct 12', lastOrderAgo: 'Today', lastOrderAmt: 2140.00, stage: 'Customer' },
  { id: '104455', ini: 'QA', c: 'amber', name: 'Quincy Animal Hospital', type: 'store', locs: 1, tier: 'Standard', industry: 'Veterinary clinics', naics: '541940', status: 'Open', city: 'Quincy, MA', since: 2020, owner: 'db', ytd: 11840.00, margin: 26.1, annual: 15200, life: 61400, trend: -21.0, health: 2, healthW: 'Needs attention', credit: 4, creditW: 'Good standing', lastOrder: 'Jul 12', lastOrderAgo: '92 days ago', lastOrderAmt: 610.00, stage: 'Customer' },
  { id: '103020', ini: 'MV', c: 'red', name: 'Maplewood Village Offices', type: 'account-few', locs: 2, tier: 'Standard', industry: 'Commercial real estate', naics: '531120', status: 'Open', city: 'Waltham, MA', since: 2016, owner: 'pn', ytd: 18700.00, margin: 24.0, annual: 24900, life: 188000, trend: -30.0, health: 2, healthW: 'Needs attention', credit: 4, creditW: 'Good standing', lastOrder: 'Jun 1', lastOrderAgo: '133 days ago', lastOrderAmt: 720.00, stage: 'Customer' },
];
const acct = id => ACCOUNTS.find(a => a.id === id);

// ---------- Harbor Medical detail ----------
const PEOPLE = {
  '104218': [
    { id: 'u1', ini: 'AP', c: 'violet', first: 'Anita', last: 'Patel', title: 'Ms.', pref: '', pron: '', job: 'Purchasing manager', dept: 'Purchasing', email: 'apatel@harbormed.example', phone: '(617) 555-0141', mobile: '(617) 555-0142', perm: 'Admin', approver: true, ap: false, noRem: false, login: 'Today, 9:12 AM', status: 'Active', contactRole: 'Primary', tip: 'Prefers email before 10 AM', hasLogin: true },
    { id: 'u2', ini: 'MH', c: 'slate', first: 'Marcus', last: 'Hale', title: 'Mr.', pref: 'Marc', pron: 'He / him', job: 'Accounts payable manager', dept: 'Accounting', email: 'mhale@harbormed.example', phone: '(617) 555-0158', mobile: '(617) 555-0199', perm: 'Online invoice', approver: false, ap: true, noRem: false, login: 'Oct 2, 3:41 PM', status: 'Active', contactRole: 'AP contact', tip: 'Goes by Marc', hasLogin: true },
    { id: 'u3', ini: 'KT', c: 'green', first: 'Kim', last: 'Tran', title: 'Ms.', pref: '', pron: '', job: 'Office manager, Dock B', dept: 'Facilities', email: 'ktran@harbormed.example', phone: '(617) 555-0177', mobile: '', perm: 'First user', approver: true, ap: false, noRem: false, login: 'Yesterday', status: 'Active', contactRole: 'Delivery', tip: 'On site 8 AM–4 PM', hasLogin: true },
    { id: 'u4', ini: 'JW', c: 'teal', first: 'Jun', last: 'Wei', title: 'Mr.', pref: '', pron: '', job: 'Purchasing assistant', dept: 'Purchasing', email: 'jwei@harbormed.example', phone: '(617) 555-0190', mobile: '', perm: 'Standard', approver: false, ap: false, noRem: false, login: 'Sep 30', status: 'Active', tip: 'Pronounced "June"', hasLogin: true },
    { id: 'u5', ini: 'LR', c: 'pink', first: 'Lena', last: 'Ruiz', title: 'Dr.', pref: '', pron: '', job: 'Clinic director, Quincy', dept: 'Clinical', email: 'lruiz@harbormed.example', phone: '(617) 555-0182', mobile: '', perm: 'Standard', approver: true, ap: false, noRem: false, login: 'Sep 18', status: 'Active', hasLogin: true },
    { id: 'u6', ini: 'RS', c: 'orange', first: 'Rita', last: 'Santos', title: 'Ms.', pref: '', pron: '', job: 'Billing specialist', dept: 'Accounting', email: 'rsantos@harbormed.example', phone: '(617) 555-0123', mobile: '', perm: 'Online invoice', approver: false, ap: true, noRem: true, login: 'Aug 29', status: 'Locked out', hasLogin: true },
    { id: 'u7', ini: 'TB', c: 'blue', first: 'Tom', last: 'Baker', title: 'Mr.', pref: '', pron: '', job: 'Facilities coordinator', dept: 'Facilities', email: 'tbaker@harbormed.example', phone: '(617) 555-0166', mobile: '', perm: 'Standard', approver: false, ap: false, noRem: false, login: 'Jul 12', status: 'Active', hasLogin: true },
    { id: 'u8', ini: 'GF', c: 'slate', first: 'Grace', last: 'Fields', title: 'Ms.', pref: '', pron: '', job: 'Former purchasing lead', dept: 'Purchasing', email: 'gfields@harbormed.example', phone: '(617) 555-0110', mobile: '', perm: 'Standard', approver: false, ap: false, noRem: false, login: 'Feb 3', status: 'Inactive', hasLogin: true },
  ],
};
const ADDR = {
  '104218': {
    billing: { label: 'Harbor Medical Group, Accounts payable', l1: '120 Pier St', l2: 'Suite 4', l3: '', city: 'Boston', state: 'MA', zip: '02110', county: 'Suffolk', region: 'New England, Boston metro', att: 'Marcus Hale, AP manager', phone: '(617) 555-0158', tz: 'Eastern (ET)' },
    delivery: [
      { id: 'a1', label: 'Boston HQ, Loading Dock B', l1: '120 Pier St', l2: 'Dock B', l3: '', city: 'Boston', state: 'MA', zip: '02110', county: 'Suffolk', region: 'New England, Boston metro', att: 'Kim Tran, Office manager', phone: '(617) 555-0177', tz: 'Eastern (ET)', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], from: '8:00 AM', to: '4:00 PM', mode: 'Company truck', nit: false, res: false, no3p: false, instr: 'Use the back entrance on Atlantic Ave. Ring the Dock B bell. Never leave boxes outside; carry inside to the supply room if the dock is unattended.', active: true },
      { id: 'a2', label: 'Boston HQ, AP office', l1: '120 Pier St', l2: 'Suite 4', l3: '', city: 'Boston', state: 'MA', zip: '02110', county: 'Suffolk', region: 'New England, Boston metro', att: 'Marcus Hale', phone: '(617) 555-0158', tz: 'Eastern (ET)', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], from: '9:00 AM', to: '5:00 PM', mode: 'Company truck', nit: false, res: false, no3p: false, instr: 'Deliver to reception on the 3rd floor.', active: true },
      { id: 'a3', label: 'Quincy Clinic', l1: '44 Hancock St', l2: '', l3: '', city: 'Quincy', state: 'MA', zip: '02169', county: 'Norfolk', region: 'New England, Boston metro', att: 'Front desk', phone: '(617) 555-0120', tz: 'Eastern (ET)', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], from: '8:00 AM', to: '6:00 PM', mode: 'Company truck', nit: false, res: false, no3p: false, instr: '', active: true },
      { id: 'a4', label: 'Salem Family Practice', l1: '9 Essex St', l2: '', l3: '', city: 'Salem', state: 'MA', zip: '01970', county: 'Essex', region: 'New England, North Shore', att: 'Office manager', phone: '(978) 555-0133', tz: 'Eastern (ET)', days: ['Mon', 'Wed', 'Fri'], from: '7:00 AM', to: '3:00 PM', mode: 'Company truck', nit: false, res: false, no3p: false, instr: 'Back entrance after 3 PM.', active: true },
      { id: 'a5', label: 'Harbor Imaging, Cambridge', l1: '300 Binney St', l2: 'Floor 2', l3: '', city: 'Cambridge', state: 'MA', zip: '02142', county: 'Middlesex', region: 'New England, Boston metro', att: 'Imaging reception', phone: '(617) 555-0150', tz: 'Eastern (ET)', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], from: '8:00 AM', to: '5:00 PM', mode: 'Outside carrier', nit: true, res: false, no3p: false, instr: 'Freight elevator only.', active: true },
      { id: 'a6', label: 'Dr. Ruiz home office', l1: '18 Linden Ln', l2: '', l3: '', city: 'Milton', state: 'MA', zip: '02186', county: 'Norfolk', region: 'New England, South Shore', att: 'Dr. Lena Ruiz', phone: '(617) 555-0182', tz: 'Eastern (ET)', days: ['Tue', 'Thu'], from: '9:00 AM', to: '1:00 PM', mode: 'Outside carrier', nit: true, res: true, no3p: false, instr: 'Leave with neighbor at #20 if no answer.', active: true },
      { id: 'a7', label: 'Worcester satellite clinic', l1: '77 Main St', l2: 'Suite 210', l3: '', city: 'Worcester', state: 'MA', zip: '01608', county: 'Worcester', region: 'New England, Central', att: 'Clinic lead', phone: '(508) 555-0108', tz: 'Eastern (ET)', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], from: '8:00 AM', to: '4:30 PM', mode: 'Company truck', nit: false, res: false, no3p: true, instr: '', active: true },
      { id: 'a8', label: 'Old Brookline office', l1: '5 Harvard St', l2: '', l3: '', city: 'Brookline', state: 'MA', zip: '02445', county: 'Norfolk', region: 'New England, Boston metro', att: '', phone: '', tz: 'Eastern (ET)', days: ['Mon', 'Wed'], from: '9:00 AM', to: '2:00 PM', mode: 'Company truck', nit: false, res: false, no3p: false, instr: '', active: false },
    ],
  },
};
const ITEMS = [
  { no: 'CF-2LB', desc: 'Coffee, medium roast, ground, 2 lb bag', cat: 'Breakroom › Coffee', status: 'Active', stock: 'In stock, 240 at Boston DC', units: [['Bag (1 × 2 lb)', 1], ['Case of 6 bags', 6]], cost: { 'Replacement cost': 18.40, 'Average cost': 17.95 }, list: 32.99, acctPrice: 24.99, web: 29.99, method: 'Contract price · MA-2291', img: 'coffee' },
  { no: 'HC-12', desc: 'Hot cups 12 oz, 1,000 count', cat: 'Breakroom › Cups', status: 'Active', stock: 'In stock, 88 at Boston DC', units: [['Case (1,000)', 1]], cost: { 'Replacement cost': 39.10, 'Average cost': 38.60 }, list: 72.50, acctPrice: 58.40, web: 64.99, method: 'Preferred price list · Healthcare PPL 2026', img: 'cups' },
  { no: 'TN-26A', desc: 'Toner cartridge 26A, black', cat: 'Ink and toner › Laser', status: 'Vendor delay', stock: 'Back in stock Oct 20', units: [['Each', 1], ['Box of 3', 3]], cost: { 'Replacement cost': 71.20, 'Average cost': 69.80 }, list: 129.99, acctPrice: 94.99, web: 109.99, method: 'Customer price match · ends Oct 15', img: 'toner' },
  { no: 'PT-12', desc: 'Paper towels, 12 rolls', cat: 'Janitorial › Paper', status: 'Active', stock: 'Low stock, 14 at Boston DC', units: [['Case (12 rolls)', 1]], cost: { 'Replacement cost': 29.80, 'Average cost': 28.95 }, list: 49.99, acctPrice: 41.75, web: 44.99, method: 'Standard open web price', img: 'towels' },
  { no: 'EP-21', desc: 'Exam table paper, 21 in, 12 rolls', cat: 'Exam room › Paper', status: 'Manufacturer delay', stock: 'Expected Nov 2', units: [['Case (12 rolls)', 1]], cost: { 'Replacement cost': 33.40, 'Average cost': 32.10 }, list: 58.00, acctPrice: 46.20, web: 52.00, method: 'Manager-assigned · ends Oct 19', img: 'paper' },
];
const PURCHASES = {
  'CF-2LB': [['Sep 3, 2026', 'S150146210', 'Anita Patel', 'Boston HQ', 12, 'Bag', 24.99, 26.4], ['Aug 6, 2026', 'S150144873', 'Kim Tran', 'Dock B', 10, 'Bag', 24.99, 26.4], ['Jul 2, 2026', 'S150143002', 'Anita Patel', 'Boston HQ', 2, 'Case of 6', 143.94, 27.9], ['May 28, 2026', 'S150140917', 'Jun Wei', 'Quincy Clinic', 8, 'Bag', 24.99, 25.1], ['Apr 15, 2026', 'S150138650', 'Anita Patel', 'Boston HQ', 10, 'Bag', 26.49, 31.0], ['Mar 11, 2026', 'S150136204', 'Kim Tran', 'Dock B', 10, 'Bag', 26.49, 31.0]],
  'HC-12': [['Sep 3, 2026', 'S150146210', 'Anita Patel', 'Boston HQ', 2, 'Case', 58.40, 33.0], ['Jul 2, 2026', 'S150143002', 'Anita Patel', 'Boston HQ', 2, 'Case', 58.40, 33.0]],
  'TN-26A': [['Sep 29, 2026', 'S150147512', 'Jun Wei', 'Quincy Clinic', 3, 'Each', 94.99, 25.0]],
  'PT-12': [['Aug 20, 2026', 'S150145502', 'Kim Tran', 'Dock B', 6, 'Case', 41.75, 28.6]],
  'EP-21': [['Aug 1, 2026', 'S150144101', 'Lena Ruiz', 'Quincy Clinic', 4, 'Case', 46.20, 27.7]],
};
const PRICING = [
  ['blue', 'scroll-text', 'Contract pricing', 'State contract MA-2291', 1284, 'Contracts team', 'Apr 1, 2024', 'Mar 31, 2027', true, 'All 5 accounts', 'success', 'Active'],
  ['violet', 'gavel', 'Bid-awarded', 'Bid 24-117, exam supplies', 186, 'Bids team', 'Jan 15, 2026', 'Jan 14, 2027', true, 'This account', 'success', 'Active'],
  ['teal', 'tags', 'Preferred price list (PPL)', 'Healthcare PPL 2026', 412, 'Pricing team', 'Jan 1, 2026', 'Dec 31, 2026', false, 'All 5 accounts', 'success', 'Active'],
  ['orange', 'square-pen', 'Manager-assigned', 'Exam gloves and paper', 6, 'Priya Nair', 'Sep 10, 2026', 'Oct 19, 2026', false, 'This account', 'warning', 'Expires in 7 days'],
  ['pink', 'equal', 'Customer price match', 'Toner, 3 items', 3, 'Dana Brooks', 'Aug 2, 2026', 'Oct 15, 2026', false, 'This account', 'warning', 'Expires in 3 days'],
  ['slate', 'chart-bar-increasing', 'Dynamic pricing', 'Copy paper, cost plus 8%', 14, 'Pricing rule', 'Jul 1, 2026', 'No end date', false, 'This account', 'success', 'Active'],
  ['amber', 'badge-percent', 'Promotional', 'Fall breakroom promo', 22, 'Marketing', 'Sep 1, 2026', 'Sep 30, 2026', false, 'This account', 'neutral', 'Expired'],
];

// ---------- feed, tasks, notes ----------
let FEED = [
  { acct: '104218', kind: 'calls', icon: ['blue', 'phone-outgoing'], head: '<b>Dana Brooks</b> logged a sales call with Anita Patel', body: 'Outcome: Callback requested · follow-up set for today, 3:00 PM', time: '11:05 AM', day: 'Today' },
  { acct: '104218', kind: 'orders', av: ['AP', 'violet'], head: '<b>Anita Patel</b> placed order S150147717 online', body: '18 lines · $4,212.80 · PO 77120', time: '10:42 AM', day: 'Today' },
  { acct: '104218', kind: 'payments', icon: ['green', 'hand-coins'], head: '<b>Payment received</b> by check 30219', body: '$12,400.00 applied to 4 invoices', time: '9:15 AM', day: 'Today' },
  { acct: '104218', kind: 'notes', note: true, av: ['JL', 'blue'], head: '<b>Jordan Lee</b> · Opportunity', body: 'Met their new office manager at the Quincy clinic. They want to see the furniture line for the two new exam rooms. <span class="mention">@Dana Brooks</span> can you set up the quote?', time: '8:52 AM', day: 'Today' },
  { acct: '104218', kind: 'pricing', icon: ['orange', 'tags'], head: '<b>Pricing changed:</b> manager-assigned prices added by Priya Nair', body: '6 items · expires Oct 19', time: '4:40 PM', day: 'Yesterday' },
  { acct: '104218', kind: 'orders', av: ['JL', 'blue'], head: '<b>Jordan Lee</b> sent quote QT-20931', body: 'Exam-room furniture for the Quincy clinic · $18,950.00', time: '2:05 PM', day: 'Yesterday' },
  { acct: '104218', kind: 'orders', icon: ['slate', 'package-check'], head: '<b>Delivered</b> on Route 14, signed by Kim Tran', body: '', time: '11:20 AM', day: 'Yesterday' },
  { acct: '104218', kind: 'notes', note: true, av: ['SO', 'orange'], head: '<b>Sam Ortiz</b> · Customer preference', body: 'Anita prefers email over phone before 10 AM. Her colleague Jun is pronounced "June".', time: 'Sep 28', day: 'Earlier', pinned: true },
  { acct: '104218', kind: 'notes', note: true, av: ['DB', 'teal'], head: '<b>Dana Brooks</b> · Delivery', body: 'Account was a non-buy in 2024 after delivery issues; on-time delivery matters most to them.', time: 'Sep 28', day: 'Earlier', pinned: true },
];
let TASKS = [
  { id: 't1', icon: 'phone', title: 'Call Anita Patel back about the quote', acct: '104218', due: '9:30 AM', when: 'today', followUp: true, done: true },
  { id: 't2', icon: 'mail', title: 'Send renewal terms for the 2027 contract', acct: '101266', due: '10:00 AM', when: 'today', done: true },
  { id: 't3', icon: 'phone', title: 'Introduction call with new contact', acct: '102114', due: '11:00 AM', when: 'today', done: true },
  { id: 't4', icon: 'clipboard-check', title: 'Confirm Dock B delivery window', acct: '104218', due: 'Fri, Oct 9', when: 'overdue', done: false },
  { id: 't5', icon: 'phone', title: 'Annual business review', acct: '104902', due: '3:30 PM', when: 'today', done: false },
  { id: 't6', icon: 'badge-dollar-sign', title: 'Follow up on exam-room furniture quote', acct: '104218', due: '4:00 PM', when: 'today', followUp: true, done: false },
  { id: 't7', icon: 'phone', title: 'Problem resolution: damaged toner delivery', acct: '105874', due: '4:30 PM', when: 'today', followUp: true, done: false },
  { id: 't8', icon: 'mail', title: 'Email Mariner Holdings Q4 catalog', acct: '100015', due: '9:00 AM', when: 'today', done: true },
  { id: 't9', icon: 'phone', title: 'Check in on Lakeside Dental reorder', acct: '104377', due: '10:30 AM', when: 'today', followUp: true, done: true },
  { id: 't10', icon: 'clipboard-check', title: 'Review Summit credit hold with AR', acct: '102951', due: '1:00 PM', when: 'today', done: true },
  { id: 't11', icon: 'phone', title: 'Call Crestview about summer supply list', acct: '101266', due: '2:00 PM', when: 'today', followUp: true, done: true },
  { id: 't12', icon: 'mail', title: 'Send Northgate the new catalog', acct: '100842', due: '12:00 PM', when: 'today', done: true },
  { id: 't13', icon: 'clipboard-check', title: 'Update Brightline Café delivery days', acct: '105520', due: '5:00 PM', when: 'today', done: false },
  { id: 't14', icon: 'phone', title: 'Callback: Bayline site trailer order', acct: '102114', due: '5:15 PM', when: 'today', followUp: true, done: true },
  { id: 't15', icon: 'mail', title: 'Send Mariner the contract summary', acct: '100015', due: 'Oct 14', when: 'later', done: false },
  { id: 't16', icon: 'phone', title: 'Quarterly check-in with Northgate', acct: '100842', due: 'Oct 15', when: 'later', done: false },
];
const STATS = { callsOut: 17, callsIn: 6, talk: 6720, emails: 11, quotes: 2, quotesTotal: 31240, orders: 4, ordersTotal: 9870.15, accounts: 18 };
const HOURS = [['8', 2], ['9', 5], ['10', 4], ['11', 3], ['12', 1], ['1', 4], ['2', 3], ['3', 1], ['4', 0], ['5', 0]];
let LOG = [
  ['3:05 PM', 'blue', 'phone-outgoing', 'Outgoing call · <b>Harbor Medical Group</b>', 'Sales call with Anita Patel · 6m 12s', 'success', 'Callback requested'],
  ['2:48 PM', 'blue', 'phone-incoming', 'Incoming call · <b>Pine &amp; Fern Florists</b>', 'Problem resolution · 3m 40s', 'info', 'Follow-up set'],
  ['2:31 PM', 'red', 'phone-missed', 'Missed call · <b>Lakeside Dental</b>', 'Caller left no message', 'danger', 'Call back'],
  ['2:10 PM', 'teal', 'mail', 'Email sent · <b>Crestview School District</b>', 'Renewal terms for the 2027 contract', '', ''],
  ['1:32 PM', 'blue', 'voicemail', 'Outgoing call · <b>Greenvale Veterinary</b>', 'No answer · left voicemail · 0m 48s', 'neutral', 'Voicemail'],
  ['12:15 PM', 'orange', 'badge-dollar-sign', 'Quote sent · <b>Harbor Medical Group</b>', 'QT-20931 · $18,950.00', '', ''],
  ['11:24 AM', 'green', 'shopping-cart', 'Order placed · <b>Bayline Construction</b>', 'S150148002 · $2,140.00', '', ''],
];
let TOUCHED = [['104218', 'Anita Patel', 'phone-outgoing', 'Call, 6m 12s', '3:05 PM'], ['105874', 'Rosa Lin', 'phone-incoming', 'Call, 3m 40s', '2:48 PM'], ['101266', 'Mark Ellis', 'mail', 'Email: renewal terms', '2:10 PM'], ['104902', 'Dr. Lena Ruiz', 'voicemail', 'Left voicemail', '1:32 PM'], ['102114', 'Tom Ochoa', 'shopping-cart', 'Order placed, $2,140.00', '11:24 AM']];

const QUOTES_LINES = ['Customers remember who called back.', 'The best time to call a customer is right after you help them; the second best is today.', 'Every follow-up is a promise kept.', 'A full pipeline starts with one more call.', 'Listen first; the order usually follows.', 'Small accounts grow into big ones when someone pays attention.', 'A "not now" is a date on the calendar, not a no.', 'Know the customer\'s business and the products sell themselves.', 'Consistency beats a lucky day.', 'Leave every call with a next step.'];

// ---------- promotions ----------
const PROMOS = [
  { id: 'p1', h: 'orange', icon: 'badge-percent', name: 'We miss you: 10% off', offer: '10% off breakroom and coffee items', code: 'MISSYOU10', rule: 'No order in 90+ days', dates: 'Oct 1 – Oct 31', ends: 'Ends Oct 31', status: ['success', 'Active'], by: 'Marketing', base: { contacted: 9, interested: 3, ordered: 2, total: 3240 }, list: ['104377', '099731', '104902', '104455', '103020', '105520', '103388'], assisting: 28, size: 40 },
  { id: 'p2', h: 'violet', icon: 'sofa', name: 'Fall furniture event', offer: '15% off furniture and installation', code: 'FALLFURN15', rule: 'Bought furniture in the last 2 years', dates: 'Oct 1 – Nov 15', ends: 'Ends Nov 15', status: ['success', 'Active'], by: 'Furniture team', base: { contacted: 4, interested: 2, ordered: 0, total: 0 }, list: ['104218', '101266', '100015'], assisting: 0, size: 15 },
  { id: 'p3', h: 'teal', icon: 'spray-can', name: 'Janitorial starter kit', offer: 'Free dispenser with first janitorial order', code: 'CLEANSTART', rule: 'Never bought janitorial supplies', dates: 'Oct 12 – Nov 30', ends: 'Starts today', status: ['info', 'Scheduled'], by: 'Marketing', base: { contacted: 0, interested: 0, ordered: 0, total: 0 }, list: ['104218', '102114', '100842'], assisting: 9, size: 22 },
];
const PROMO_STATE = {}; // acctId -> outcome per promo

// ---------- requests ----------
let REQUESTS = [
  { no: 'AC-1038', kind: 'AC', acct: '104218', what: 'Add cost center CC-3400 for Quincy Clinic operations', by: 'Dana Brooks', team: 'Tier 2', status: 'In progress', date: 'Oct 9', due: 'Oct 14' },
  { no: 'SS-2311', kind: 'SS', acct: '104218', what: 'Rentals · Repair or maintenance: water cooler leaking at Dock B', by: 'Sam Ortiz', team: 'Rentals team', status: 'Submitted', date: 'Oct 11', due: 'Oct 13' },
  { no: 'PR-0874', kind: 'PR', acct: '104218', what: 'Extend prices: manager-assigned exam gloves through Dec 31', by: 'Dana Brooks', team: 'Pricing team', status: 'Waiting on customer', date: 'Oct 1', due: 'Oct 15' },
  { no: 'AC-1031', kind: 'AC', acct: '102951', what: 'Reactivate account after credit hold is cleared', by: 'Dana Brooks', team: 'Tier 2', status: 'Completed', date: 'Sep 24', due: 'Sep 27' },
  { no: 'PR-0869', kind: 'PR', acct: '101266', what: 'Margin approval: 17.5% on classroom furniture quote', by: 'Jordan Lee', team: 'Manager', status: 'Completed', date: 'Sep 22', due: 'Sep 24' },
];
const SEQ = { AC: 1042, SS: 2318, PR: 877 };

// ---------- opportunities ----------
const CATS = [['file-text', 'Paper', 'buy', '$2,140 / mo'], ['printer', 'Ink and toner', 'buy', '$1,880 / mo'], ['pencil-ruler', 'Office supplies', 'buy', '$1,320 / mo'], ['stethoscope', 'Exam room supplies', 'buy', '$2,560 / mo'], ['coffee', 'Breakroom and coffee', 'down', '$650 / mo, was $1,050'], ['cup-soda', 'Beverage service', 'buy', 'Agreement to Jan 2027'], ['archive', 'Filing and storage', 'buy', '$210 / mo'], ['mail', 'Mailroom', 'buy', '$140 / mo'], ['stamp', 'Custom print', 'lapsed', 'Last order Mar 2025'], ['spray-can', 'Janitorial and sanitation', 'never', 'Peers: ~$1,150 / mo'], ['sofa', 'Furniture', 'never', 'Peers: ~$900 / mo'], ['monitor', 'Technology', 'never', 'Peers: ~$700 / mo'], ['package', 'Pack and ship', 'never', 'Peers: ~$320 / mo'], ['hard-hat', 'Safety', 'never', 'Peers: ~$260 / mo'], ['wrench', 'Facilities and maintenance', 'never', 'Peers: ~$410 / mo'], ['shirt', 'Promotional products', 'never', 'Peers: ~$150 / mo']];
let OPPS = [
  { id: 'o1', h: 'orange', icon: 'rotate-ccw', type: 'Win back', title: 'Breakroom and coffee down 38% since June', ev: [['trending-down', 'Monthly breakroom spend fell from $1,050 to $650'], ['clock', 'Coffee usually every 4 weeks; last order 5 weeks ago'], ['message-square', 'Note Aug 12: "also buys from an online marketplace"']], val: '~$400 / mo back', conf: 'High', state: 'new' },
  { id: 'o2', h: 'teal', icon: 'spray-can', type: 'Cross-sell', title: 'Janitorial and sanitation: never bought', ev: [['users', 'Similar healthcare accounts with 10+ sites spend ~$1,150 / mo'], ['message-square', 'Note Aug 12: "cleaning crew buys their own supplies"'], ['tag', 'Janitorial starter kit promotion starts today']], val: '~$1,150 / mo new', conf: 'Medium', state: 'new' },
  { id: 'o3', h: 'violet', icon: 'building-2', type: 'Growth', title: 'Fourth clinic opening in spring', ev: [['message-square', 'Call note Oct 5: "asked about a fourth location opening in spring"'], ['sofa', 'New sites usually need furniture, technology and a first stock-up'], ['calendar-clock', 'Best time to plan: 3–4 months before opening']], val: '$18–25k one-time', conf: 'Medium', state: 'new' },
];
let SIGNALS = [
  { id: 's1', h: 'violet', tag: 'Growth', src: 'Dana Brooks · call note · Oct 5', txt: 'She asked about <span class="hl">a fourth location opening in spring</span> and whether we do furniture.', state: 'new' },
  { id: 's2', h: 'red', tag: 'Risk', src: 'Sam Ortiz · internal note · Sep 28', txt: 'Account was a non-buy in 2024 <span class="hl">after delivery issues</span>; on-time delivery matters most.', state: 'new' },
  { id: 's3', h: 'amber', tag: 'Competitor', src: 'Jordan Lee · call note · Aug 12', txt: 'Kim said they <span class="hl">also buy breakroom items from an online marketplace</span> because it is faster.', state: 'new' },
];
const REORDER = [['PT-12', 'Paper towels, 12 rolls', 'Every 4 weeks', '7 weeks ago', 175, 'danger', 'Overdue'], ['EP-21', 'Exam table paper, 21 in', 'Every 8 weeks', '10 weeks ago', 125, 'danger', 'Overdue'], ['CF-2LB', 'Coffee, medium roast', 'Every 4 weeks', '5 weeks ago', 125, 'warning', 'Due now'], ['TN-26A', 'Toner 26A, black', 'Every 6 weeks', '5 weeks ago', 83, 'info', 'Due soon']];

// ---------- settings (Tier 2) ----------
const SETTINGS = [
  ['Account', [['Account status', 'Open or closed', 'Open'], ['Account relationships', 'Parent and sister accounts', 'Part of Harbor Health Partners (5 accounts)'], ['Account consolidation', 'Merge duplicate accounts', 'None']]],
  ['Pricing and products', [['Mirror pricing from', 'Copy all pricing from another account', 'Not set'], ['Product sets', 'Which products this account can order', 'Healthcare essentials 2026'], ['Coupons', 'Whether coupons work on web orders', 'Allowed'], ['Blanket PO', 'Standing PO for contract items', 'PO 77000 series, through Mar 31, 2027']]],
  ['Users and approvals', [['Approver settings', 'How orders are approved', 'Orders over $500 need approval'], ['Mirror user settings', 'Copy user setup from another account', 'Not set'], ['Do not contact', 'People who must not be called or emailed', 'None']]],
  ['Billing', [['Billing address', 'Where invoices go', '120 Pier St, Suite 4, Boston'], ['Invoice settings', 'How invoices are sent', 'Monthly summary, emailed to AP'], ['Cost centers', 'Codes orders are charged to', '3 active'], ['Budgets', 'Spending limits by cost center', 'Not set']]],
  ['Website', [['Website settings', 'Ordering site options for this account', 'Standard'], ['Favorites lists', 'Shared lists for this account', '3 lists']]],
  ['Notifications', [['Order notifications', 'Who is told when orders ship', 'Purchaser and Kim Tran'], ['Approver notifications', 'How approvers are alerted', 'Email, immediately']]],
];
const AGREEMENTS = [
  { svc: 'Beverage', h: 'orange', icon: 'cup-soda', name: 'Coffee and water service', detail: '3 locations · renews Jan 2027', status: ['success', 'Active'] },
  { svc: 'Rentals', h: 'teal', icon: 'droplets', name: 'Water cooler rental', detail: '4 units · $36 each per month', status: ['success', 'Active'] },
  { svc: 'Custom print', h: 'pink', icon: 'printer', name: 'Branded patient forms', detail: 'Last run Mar 2025', status: ['neutral', 'Lapsed'] },
];
const SUBS = [['Copy paper auto-ship', 'Every 2 weeks', 'Oct 19', 'Active', 412.80], ['Exam table paper', 'Every 8 weeks', 'Nov 2', 'Paused', 184.80], ['Breakroom restock', 'Monthly', '—', 'Ended', 0]];
const ORDERS = [['S150147717', '77120', 'Oct 5', 18, 4212.80, 'info', 'Picking', 'Wed, Oct 14'], ['S150147690', '77104', 'Oct 2', 6, 812.40, 'info', 'In transit', 'Today'], ['S150147601', '77098', 'Sep 29', 24, 9870.15, 'warning', 'Backordered', '2 lines pending'], ['S150147512', '77071', 'Sep 25', 11, 1346.00, 'success', 'Delivered', 'Sep 28'], ['S150147480', '—', 'Sep 24', 3, 268.90, 'warning', 'On hold', 'PO number missing'], ['S150147345', '77040', 'Sep 21', 15, 3104.60, 'success', 'Delivered', 'Sep 23']];
const QUOTES = [['QT-20931', 'Jordan Lee', 'Oct 11', 18950.00, 24.1, 'Nov 10', 'info', 'Sent'], ['QT-20902', 'Dana Brooks', 'Oct 6', 8120.00, 26.8, 'Nov 5', 'info', 'Viewed'], ['QT-20877', 'Dana Brooks', 'Sep 30', 4170.00, 22.0, 'Oct 30', 'info', 'Sent'], ['QT-20711', 'Dana Brooks', 'Aug 14', 2240.00, 28.0, 'Sep 13', 'neutral', 'Expired'], ['QT-20650', 'Jordan Lee', 'Aug 2', 12400.00, 23.5, 'Sep 1', 'success', 'Accepted']];
const CASES = [['PC-3381', 'Exam glove substitution', 'Waiting on customer', 'Oct 3', 'Sam Ortiz', 'warning'], ['PC-3290', 'Damaged toner on delivery', 'Closed', 'Aug 22', 'Sam Ortiz', 'success']];

// ---------- more accounts and account teams (Oct 29) ----------
EMP.mk = { id: 'mk', ini: 'MK', c: 'violet', name: 'Maya Kim', role: 'Outside sales rep' };
EMP.rt = { id: 'rt', ini: 'RT', c: 'green', name: 'Ray Torres', role: 'Dedicated CSR' };
(function () {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const NEW = [
    ['Bayview Pediatrics', 'Pediatricians', '621111', 'account-few', 3], ['Cedar Hill Law Group', 'Law offices', '541110', 'store', 1], ['Atlantic Freight Co.', 'Trucking and freight', '484121', 'account-multi', 7],
    ['Harborlight Senior Living', 'Nursing and senior living', '623311', 'account-multi', 6], ['Copper Kettle Bakery', 'Bakeries', '311811', 'store', 1], ['Northshore Orthodontics', 'Dental office', '621210', 'account-few', 2],
    ['Granite State Credit Union', 'Credit unions', '522130', 'account-multi', 9], ['Riverbend Middle School', 'K–12 public schools', '611110', 'store', 1], ['Pemberton Architects', 'Architecture', '541310', 'store', 1],
    ['Blue Heron Hotels', 'Hotels and motels', '721110', 'account-group', 5], ['Medford Auto Body', 'Auto repair', '811121', 'store', 1], ['Seaport Fitness Club', 'Gyms and fitness', '713940', 'account-few', 2],
    ['Elmwood Family Dentistry', 'Dental office', '621210', 'store', 1], ['Concord Insurance Partners', 'Insurance agencies', '524210', 'account-few', 4], ['Tidewater Logistics', 'Warehousing and storage', '493110', 'account-multi', 8],
    ['Liberty Street Café', 'Cafés and coffee shops', '722515', 'store', 1], ['Wakefield Public Works', 'Public administration', '921190', 'account-few', 3], ['Summit Ridge Dermatology', 'Medical practices', '621111', 'account-few', 2],
    ['Fairhaven Veterinary Center', 'Veterinary clinics', '541940', 'store', 1], ['Beacon Hill Accounting', 'Accounting and tax', '541211', 'store', 1], ['Ironworks Fabrication', 'Metal fabrication', '332312', 'account-few', 2],
    ['Lexington Montessori', 'Private schools', '611110', 'store', 1], ['Charles River Labs Supply', 'Research labs', '541715', 'account-few', 3], ['Old Colony Title', 'Real estate agencies', '531210', 'store', 1],
    ['Westfield Urgent Care', 'Urgent care', '621493', 'account-multi', 6], ['Marigold Florals & Events', 'Florists', '459310', 'store', 1], ['Pioneer Valley Builders', 'General contractors', '236220', 'account-few', 4],
    ['Sterling Wealth Advisors', 'Investment and wealth management', '523940', 'store', 1], ['Hanover Community Church', 'Religious organizations', '813110', 'store', 1], ['Clearwater Property Management', 'Property management', '531311', 'account-multi', 11],
    ['Jamie Ortega', 'Personal account', '—', 'account-personal', 1], ['Priya Shah', 'Personal account', '—', 'account-personal', 1], ['Nantucket Sound Marine', 'Retail: sporting goods', '459110', 'store', 1],
    ['Brookline Physical Therapy', 'Physical therapy', '621340', 'account-few', 3], ['Gloucester Seafood Co.', 'Food processing', '311710', 'store', 1], ['Arlington Staffing Group', 'Staffing agencies', '561320', 'account-few', 2],
    ['Merrimack Valley Hospital', 'Hospitals', '622110', 'account-multi', 14], ['Back Bay Design Studio', 'Design studios', '541430', 'store', 1], ['Commonwealth Holdings', 'Holding company', '551112', 'orbit', 22],
    ['Quarry Hill Golf Club', 'Golf and country clubs', '713910', 'store', 1], ['Salem Harbor Inn', 'Hotels and motels', '721110', 'store', 1], ['Dorchester Youth Center', 'Social services', '624110', 'account-few', 2],
    ['Revere Beach Pharmacy', 'Pharmacies', '456110', 'store', 1], ['Framingham Data Center', 'Data centers and hosting', '518210', 'store', 1], ['Mystic River Brewing', 'Food and beverage manufacturing', '312120', 'account-few', 2],
  ];
  const CITIES = ['Boston', 'Cambridge', 'Quincy', 'Newton', 'Somerville', 'Waltham', 'Lowell', 'Salem', 'Brookline', 'Medford', 'Framingham', 'Worcester', 'Dedham', 'Braintree', 'Woburn'];
  const COLORS = ['violet', 'blue', 'teal', 'orange', 'pink', 'green', 'slate', 'red', 'amber'];
  const HW = ['', 'At risk', 'Needs attention', 'Stable', 'Healthy', 'Thriving'], CW = ['', 'Credit hold', 'Past due', 'Watch', 'Good standing', 'Excellent'];
  const MON = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  NEW.forEach(([name, ind, naics, type, locs], k) => {
    const big = type === 'orbit' ? 6 : type === 'account-multi' ? 4 : type === 'account-group' ? 3 : type === 'account-few' ? 2 : type === 'account-personal' ? 0.05 : 0.6;
    const annual = Math.round((15000 + rnd() * 90000) * big), ytd = Math.round(annual * (0.65 + rnd() * 0.25) * 100) / 100;
    const health = Math.max(1, Math.min(5, Math.round(1.5 + rnd() * 3.8))), credit = rnd() < 0.08 ? 1 : rnd() < 0.12 ? 2 : rnd() < 0.2 ? 3 : rnd() < 0.7 ? 4 : 5;
    const ago = health <= 2 ? 45 + Math.floor(rnd() * 90) : Math.floor(rnd() * 40);
    const d = new Date(TODAY); d.setDate(d.getDate() - ago);
    const owner = k % 5 === 4 ? 'jl' : k % 7 === 6 ? 'so' : 'db';
    const since = 2008 + Math.floor(rnd() * 19);
    ACCOUNTS.push({
      id: String(107000 + k * 37), ini: name.replace(/[^A-Za-z ]/g, '').split(' ').filter(w => w.length > 2 || w === w.toUpperCase()).map(w => w[0]).join('').slice(0, 2).toUpperCase(), c: COLORS[k % 9], name, type, locs,
      tier: type === 'account-personal' ? 'Standard' : annual > 250000 ? (rnd() < 0.3 ? 'White glove' : 'Premium business') : annual > 90000 ? 'Premium business' : 'Standard',
      industry: ind, naics, status: 'Open', city: pick(CITIES) + ', MA', since, owner, ytd, margin: Math.round((18 + rnd() * 14) * 10) / 10, annual, life: Math.round(annual * (2026 - since + 0.5)),
      trend: Math.round((rnd() * 34 - 16) * 10) / 10, health, healthW: HW[health], credit, creditW: CW[credit], lastOrder: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), lastOrderAgo: ago === 0 ? 'Today' : ago + ' days ago',
      lastOrderAmt: Math.round(annual / (8 + rnd() * 20) * 100) / 100, stage: 'Customer', pinned: k === 2 || k === 12,
      flag: credit === 1 ? ['danger', 'Credit hold'] : credit === 2 ? ['warning', 'Past due'] : since === 2026 ? ['info', 'New'] : undefined,
    });
  });
  // last two-way contact (days) for every account
  const LC = { '104218': 0, '104377': 112, '102951': 3, '100842': 1, '100015': 2, '105520': 61, '101266': 0, '106004': 22, '099731': 120, '103388': 56, '104902': 1, '105874': 0, '102114': 0, '104455': 58, '103020': 90 };
  ACCOUNTS.forEach(a => { a.lastContact = LC[a.id] ?? (a.health <= 2 ? 40 + Math.floor(rnd() * 70) : Math.floor(rnd() * 35)); });
})();
// Account teams: one account can have several reps. [employee, role]
const TEAM = {};
ACCOUNTS.forEach((a, k) => {
  const t = [[a.owner, 'Account owner']];
  if (a.locs > 3 || a.tier !== 'Standard') t.push([k % 2 ? 'jl' : 'mk', 'Outside rep']);
  if (a.tier === 'Premium business' || a.tier === 'White glove') t.push([k % 3 ? 'so' : 'rt', 'Dedicated CSR']);
  TEAM[a.id] = t;
});
['104902', '103388', '103020'].forEach(id => TEAM[id].push(['db', 'Assisting (promotion)']));
ACCOUNTS.filter(a => a.owner === 'jl').slice(0, 4).forEach(a => TEAM[a.id].push(['db', 'Backup rep']));
const myRole = (a, e = 'db') => ((TEAM[a.id] || []).find(([x]) => x === e) || [])[1];
const myAccounts = (e = 'db') => ACCOUNTS.filter(a => myRole(a, e));
