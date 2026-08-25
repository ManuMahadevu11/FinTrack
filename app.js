// ===================== APP VERSION =====================
const APP_VERSION = '1.2.0';

// ===================== SERVICE WORKER =====================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    console.log('SW registered');
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          document.getElementById('updateBadge').classList.add('show');
          showToast('Update available! Tap badge to refresh');
        }
      });
    });
  }).catch((err) => console.warn('SW failed:', err));
}

// ===================== CATEGORIES =====================
const CATEGORIES = {
  groceries:     { label: 'Groceries & Food',        emoji: '🛒', color: '#10B981' },
  transport:     { label: 'Transport / Fuel',         emoji: '🚗', color: '#3B82F6' },
  entertainment: { label: 'Entertainment / Shopping', emoji: '🎭', color: '#8B5CF6' },
  utilities:     { label: 'Utilities',               emoji: '⚡', color: '#F59E0B' },
  insurance:     { label: 'Insurance / Medical',     emoji: '🏥', color: '#EF4444' },
  otherExpenses: { label: 'Other',                   emoji: '📦', color: '#6B7280' },
};

// Old category keys that used to be stored directly on month data
const OLD_EXPENSE_MAP = {
  rent:          { category: 'otherExpenses', label: 'Rent / Home EMI' },
  groceries:     { category: 'groceries',     label: 'Groceries & Food' },
  utilities:     { category: 'utilities',     label: 'Utilities' },
  transport:     { category: 'transport',     label: 'Transport / Fuel' },
  insurance:     { category: 'insurance',     label: 'Insurance / Medical' },
  entertainment: { category: 'entertainment', label: 'Entertainment / Shopping' },
  otherExpenses: { category: 'otherExpenses', label: 'Other Expenses' },
};

// ===================== APP STATE =====================
function generateFinancialYearMonths() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const fyStartYear = month >= 3 ? year : year - 1;
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result = [];
  for (let i = 3; i <= 11; i++) result.push(`${names[i]} ${fyStartYear}`);
  for (let i = 0; i <= 2;  i++) result.push(`${names[i]} ${fyStartYear + 1}`);
  return result;
}

function getCurrentMonthStr() {
  const now   = new Date();
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[now.getMonth()]} ${now.getFullYear()}`;
}

const months = generateFinancialYearMonths();
let currentMonth = getCurrentMonthStr();
if (!months.includes(currentMonth)) currentMonth = months[months.length - 1];

// Fields that are still stored as monthly totals (income, savings, payslip)
const FIELDS = [
  'salary','sideIncome','passiveIncome','otherIncome',
  'rd','sip','fd','ppf','nps','liquid','otherSavings',
  'psBasic','psHra','psDa','psConv','psMed','psSpecial','psLta','psBonus','psOtherAllow',
  'psPfEmp','psPfEmpr','psProfTax','psTds','psHealth','psOtherDed'
];

let appData              = {};
let currentTransactions  = [];   // loaded transactions for current month
let allTransactionsCache = {};   // { "Aug 2026": [...], ... }
let activeCatFilter      = 'all';
let editingTxId          = null;
let saveTimeout          = null;
let deferredPrompt       = null;
let pendingImportData    = null;
let ocrWorker            = null;

function getDefaultMonthData() {
  const d = {};
  FIELDS.forEach(k => d[k] = 0);
  return d;
}

function getMonthData(month) {
  if (!appData[month]) appData[month] = getDefaultMonthData();
  return appData[month];
}

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===================== INIT =====================
async function init() {
  const verEl = document.getElementById('appVersion');
  if (verEl) verEl.textContent = `v${APP_VERSION}`;

  // Month selector
  const sel = document.getElementById('monthSelect');
  months.forEach(m => {
    const o = document.createElement('option');
    o.value = m; o.textContent = m;
    sel.appendChild(o);
  });
  sel.value = currentMonth;
  sel.onchange = async () => {
    await persistCurrentMonth();
    currentMonth    = sel.value;
    activeCatFilter = 'all';
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === 'all'));
    loadMonthUI(currentMonth);
  };

  // Load month data + all transactions in parallel
  const [data, allTxs] = await Promise.all([loadAllData(), getAllTransactions()]);
  appData = data;

  // Recover from localStorage if IndexedDB was empty (private mode fallback)
  if (Object.keys(data).length === 0) {
    const backup = localStorage.getItem('financeTrackerBackup');
    if (backup) { try { appData = JSON.parse(backup); showToast('📦 Data recovered from backup'); } catch (e) {} }
  }

  // Build transactions cache
  allTransactionsCache = {};
  allTxs.forEach(tx => {
    if (!allTransactionsCache[tx.month]) allTransactionsCache[tx.month] = [];
    allTransactionsCache[tx.month].push(tx);
  });

  // One-time migration: convert old expense category totals → transactions
  await migrateOldExpenses();

  loadMonthUI(currentMonth);
  checkBackupReminder();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    document.getElementById('installBtn').style.display = 'inline-block';
    document.getElementById('installStatus').textContent = 'Ready to install!';
    setTimeout(() => document.getElementById('pwaInstall').classList.add('show'), 2000);
  });

  window.addEventListener('beforeunload', () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    persistCurrentMonthSync();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persistCurrentMonth();
  });

  // Close tx modal on overlay click
  document.getElementById('txModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('txModal')) closeTxModal();
  });
}

function loadMonthUI(month) {
  const d = getMonthData(month);
  FIELDS.forEach(k => { const el = document.getElementById(k); if (el) el.value = d[k] || ''; });
  currentTransactions = _sortTxArr(allTransactionsCache[month] || []);
  renderLedger();
  recalcAll();
}

function onInputChange() {
  const d = getMonthData(currentMonth);
  FIELDS.forEach(k => { const el = document.getElementById(k); if (el) d[k] = parseFloat(el.value) || 0; });
  recalcAll();
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => persistCurrentMonth(), 800);
}



async function persistCurrentMonth() {
  await saveMonthData(currentMonth, getMonthData(currentMonth));
}

function persistCurrentMonthSync() {
  const all = {};
  months.forEach(m => all[m] = appData[m] || getDefaultMonthData());
  localStorage.setItem('financeTrackerBackup', JSON.stringify(all));
}

// ===================== CALCULATIONS =====================
function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function recalcAll() {
  const d = getMonthData(currentMonth);

  const income   = d.salary + d.sideIncome + d.passiveIncome + d.otherIncome;
  // Expenses now come from the ledger transactions
  const expenses = currentTransactions.reduce((sum, t) => sum + t.amount, 0);
  const surplus  = income - expenses;
  const savings  = d.rd + d.sip + d.fd + d.ppf + d.nps + d.liquid + d.otherSavings;
  const unalloc  = surplus - savings;
  const rate     = income > 0 ? (surplus / income) * 100 : 0;
  const util     = surplus > 0 ? (savings / surplus) * 100 : 0;

  setText('totalExpenses', fmt(expenses));
  setText('totalSavings',  fmt(savings));
  setText('unallocated',   fmt(unalloc));
  setText('utilization',   util.toFixed(1) + '%');
  setText('ovSurplus',     fmt(surplus));
  setText('ovRate',        rate.toFixed(1) + '%');
  setText('ovIncome',      fmt(income));
  setText('ovExpense',     fmt(expenses));
  setText('ovInvested',    fmt(savings));
  setText('ovUnalloc',     fmt(unalloc));
  setText('totalIncome',   fmt(income));
  setText('ledgerTotal',   fmt(expenses));

  const bar = document.getElementById('ovBar');
  if (bar) bar.style.width = Math.min(rate, 100) + '%';

  const ub = document.getElementById('unallocBox');
  if (ub) {
    ub.classList.remove('negative', 'zero');
    if (unalloc < 0) ub.classList.add('negative');
    else if (Math.abs(unalloc) < 1) ub.classList.add('zero');
  }

  setText('emergencyTarget', fmt(expenses * 6));
  const ea = document.getElementById('emergencyAlert');
  if (ea) ea.style.display = (rate < 10 && income > 0) ? 'block' : 'none';

  renderInvestCards(surplus);
  renderTips(income, expenses, surplus, rate, unalloc);

  // Payslip
  const gross = d.psBasic + d.psHra + d.psDa + d.psConv + d.psMed + d.psSpecial + d.psLta + d.psBonus + d.psOtherAllow;
  const ded   = d.psPfEmp + d.psPfEmpr + d.psProfTax + d.psTds + d.psHealth + d.psOtherDed;
  const net   = gross - ded;
  setText('psGross',    fmt(gross));
  setText('psTotalDed', fmt(ded));
  setText('psNet',      fmt(net));
  setText('psCtc',      fmt(gross + d.psPfEmpr));
  setText('psCtcYear',  fmt((gross + d.psPfEmpr) * 12));

  computeYearlyTotals();
}

function computeYearlyTotals() {
  let yrIncome = 0, yrExpense = 0, yrSurplus = 0, yrSavings = 0, totalRate = 0, count = 0;
  months.forEach(m => {
    const d  = appData[m] || getDefaultMonthData();
    const mi = d.salary + d.sideIncome + d.passiveIncome + d.otherIncome;
    const me = (allTransactionsCache[m] || []).reduce((s, t) => s + t.amount, 0);
    const ms = mi - me;
    yrIncome  += mi; yrExpense += me; yrSurplus += ms;
    yrSavings += d.rd + d.sip + d.fd + d.ppf + d.nps + d.liquid + d.otherSavings;
    if (mi > 0) { totalRate += (ms / mi) * 100; count++; }
  });
  setText('yrIncome',   fmt(yrIncome));
  setText('yrExpense',  fmt(yrExpense));
  setText('yrSurplus',  fmt(yrSurplus));
  setText('yrInvested', fmt(yrSavings));
  setText('yrAvgRate',  (count > 0 ? totalRate / count : 0).toFixed(1) + '%');

  const trend = document.getElementById('monthlyTrend');
  if (!trend) return;
  const frag = document.createDocumentFragment();
  months.forEach(m => {
    const d   = appData[m] || getDefaultMonthData();
    const mi  = d.salary + d.sideIncome + d.passiveIncome + d.otherIncome;
    const me  = (allTransactionsCache[m] || []).reduce((s, t) => s + t.amount, 0);
    const ms  = mi - me;
    const inv = d.rd + d.sip + d.fd + d.ppf + d.nps + d.liquid + d.otherSavings;
    const isC = m === currentMonth;
    const row = document.createElement('div');
    row.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:${isC?'#EFF6FF':'#F9FAFB'};border-radius:8px;border:1px solid ${isC?'#BFDBFE':'#E5E7EB'}`;
    row.innerHTML = `<span style="font-size:.75rem;font-weight:${isC?700:500};color:${isC?'#3B82F6':'var(--text)'}">${m}</span>
      <span style="font-size:.72rem;color:var(--text2)">Surplus: <strong style="color:var(--success)">${fmt(ms)}</strong> | Inv: <strong style="color:var(--purple)">${fmt(inv)}</strong></span>`;
    frag.appendChild(row);
  });
  trend.innerHTML = '';
  trend.appendChild(frag);
}

// ===================== LEDGER =====================
function _sortTxArr(arr) {
  return arr.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function formatDateHeader(dateStr) {
  const todayStr = new Date().toISOString().split('T')[0];
  const ydStr    = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === todayStr) return 'Today';
  if (dateStr === ydStr)    return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function filterCategory(cat) {
  activeCatFilter = cat;
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
  renderLedger();
}

function renderLedger() {
  const list = document.getElementById('ledgerList');
  if (!list) return;

  // Update total in header (always full total, not filtered)
  setText('ledgerTotal', fmt(currentTransactions.reduce((s, t) => s + t.amount, 0)));
  // Update count badge
  const countEl = document.getElementById('txCount');
  if (countEl) countEl.textContent = currentTransactions.length > 0 ? `${currentTransactions.length} transactions` : '';

  const filtered = activeCatFilter === 'all'
    ? currentTransactions
    : currentTransactions.filter(t => t.category === activeCatFilter);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="ledger-empty">
      <span class="big">📋</span>
      <p>No expenses yet${activeCatFilter !== 'all' ? ' in this category' : ''}.<br>
      Tap <strong>＋ Add</strong> to log your first one.</p>
    </div>`;
    renderCatBreakdown();
    return;
  }

  // Group by date
  const groups = {};
  filtered.forEach(tx => {
    if (!groups[tx.date]) groups[tx.date] = [];
    groups[tx.date].push(tx);
  });

  const frag = document.createDocumentFragment();
  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    // Day header
    const h = document.createElement('div');
    h.className   = 'day-group-header';
    h.textContent = formatDateHeader(date);
    frag.appendChild(h);

    // Day total
    const dayTotal = groups[date].reduce((s, t) => s + t.amount, 0);
    const daySpan  = document.createElement('span');
    daySpan.style.cssText = 'font-size:.7rem;color:var(--danger);font-weight:700;margin-left:auto';
    daySpan.textContent   = fmt(dayTotal);
    h.appendChild(daySpan);

    // Transaction rows
    groups[date].forEach(tx => {
      const cat = CATEGORIES[tx.category] || CATEGORIES.otherExpenses;
      const row = document.createElement('div');
      row.className = 'tx-row';
      row.innerHTML = `
        <div class="tx-emoji">${cat.emoji}</div>
        <div class="tx-info">
          <div class="tx-note">${escapeHtml(tx.note || 'Expense')}</div>
          <div class="tx-cat">${cat.label}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount">−${fmt(tx.amount)}</div>
          <button class="tx-del" title="Delete" onclick="event.stopPropagation();deleteTx('${escapeHtml(tx.id)}')">✕</button>
        </div>`;
      row.addEventListener('click', () => openAddModal(tx.id));
      frag.appendChild(row);
    });
  });

  list.innerHTML = '';
  list.appendChild(frag);
  renderCatBreakdown();
}

function renderCatBreakdown() {
  const container = document.getElementById('catBreakdownList');
  if (!container) return;

  const totals = {};
  currentTransactions.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const grand = Object.values(totals).reduce((s, v) => s + v, 0);

  if (grand === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text2);font-size:.78rem;padding:10px 0">No expenses this month</p>';
    return;
  }

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const frag   = document.createDocumentFragment();
  sorted.forEach(([cat, amt]) => {
    const cfg  = CATEGORIES[cat] || CATEGORIES.otherExpenses;
    const pct  = grand > 0 ? (amt / grand) * 100 : 0;
    const row  = document.createElement('div');
    row.className = 'cat-breakdown-row';
    row.innerHTML = `
      <span class="cat-bd-emoji">${cfg.emoji}</span>
      <span class="cat-bd-label">${cfg.label}</span>
      <div class="cat-bd-bar-wrap"><div class="cat-bd-bar" style="width:${pct}%;background:${cfg.color}"></div></div>
      <span class="cat-bd-amt">${fmt(amt)}</span>`;
    frag.appendChild(row);
  });
  container.innerHTML = '';
  container.appendChild(frag);
}

// ===================== ADD / EDIT TRANSACTION =====================
function openAddModal(txId) {
  editingTxId = txId || null;
  const title = document.getElementById('txModalTitle');
  const today = new Date().toISOString().split('T')[0];

  // Reset form
  document.getElementById('txAmount').value   = '';
  document.getElementById('txDate').value     = today;
  document.getElementById('txCategory').value = 'groceries';
  document.getElementById('txNote').value     = '';

  if (txId) {
    const tx = currentTransactions.find(t => t.id === txId);
    if (tx) {
      title.textContent = '✏️ Edit Expense';
      document.getElementById('txAmount').value   = tx.amount;
      document.getElementById('txDate').value     = tx.date;
      document.getElementById('txCategory').value = tx.category;
      document.getElementById('txNote').value     = tx.note || '';
    }
  } else {
    title.textContent = '➕ Add Expense';
  }

  document.getElementById('txModal').classList.add('show');
  setTimeout(() => document.getElementById('txAmount').select(), 250);
}

function closeTxModal() {
  document.getElementById('txModal').classList.remove('show');
  editingTxId = null;
}

async function saveTx() {
  const amount = parseFloat(document.getElementById('txAmount').value) || 0;
  const date   = document.getElementById('txDate').value;
  const cat    = document.getElementById('txCategory').value;
  const note   = document.getElementById('txNote').value.trim();

  if (amount <= 0) { document.getElementById('txAmount').focus(); showToast('Enter an amount ₹'); return; }
  if (!date)       { showToast('Select a date'); return; }

  // Derive month from the picked date
  const dObj      = new Date(date + 'T00:00:00');
  const mNames    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const txMonth   = `${mNames[dObj.getMonth()]} ${dObj.getFullYear()}`;

  if (editingTxId) {
    await updateTransaction(editingTxId, { amount, date, category: cat, note, month: txMonth });
    showToast('Transaction updated ✓');
  } else {
    await addTransaction({ id: genId(), month: txMonth, date, amount, category: cat, note, createdAt: Date.now() });
    showToast(`${fmt(amount)} added ✓`);
  }

  closeTxModal();
  await refreshTransactions(txMonth);
}

async function deleteTx(id) {
  await deleteTransaction(id);
  await refreshTransactions(currentMonth);
  showToast('Transaction deleted');
}

async function refreshTransactions(month) {
  const txs = await getMonthTransactions(month || currentMonth);
  if (month === currentMonth || !month) {
    currentTransactions = txs;
  }
  allTransactionsCache[month || currentMonth] = txs;
  renderLedger();
  recalcAll();
}

// ===================== MIGRATION (one-time) =====================
async function migrateOldExpenses() {
  if (localStorage.getItem('expMigrated_v2')) return;

  let didMigrate = false;
  for (const month of months) {
    const d = appData[month];
    if (!d) continue;
    const hasOld = Object.keys(OLD_EXPENSE_MAP).some(k => (d[k] || 0) > 0);
    if (!hasOld) continue;

    // Build a date string for the first of that month
    const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const parts  = month.split(' ');
    const mIdx   = mNames.indexOf(parts[0]);
    const yr     = parseInt(parts[1]);
    const dateStr = `${yr}-${String(mIdx + 1).padStart(2, '0')}-01`;

    for (const [field, cfg] of Object.entries(OLD_EXPENSE_MAP)) {
      const amt = d[field] || 0;
      if (amt <= 0) continue;
      const tx = {
        id: genId(),
        month,
        date: dateStr,
        amount: amt,
        category: cfg.category,
        note: `(Imported) ${cfg.label}`,
        createdAt: Date.now()
      };
      await addTransaction(tx);
      if (!allTransactionsCache[month]) allTransactionsCache[month] = [];
      allTransactionsCache[month].push(tx);
      d[field] = 0;
      didMigrate = true;
    }
    if (didMigrate) await saveMonthData(month, d);
  }

  localStorage.setItem('expMigrated_v2', '1');
  if (didMigrate) showToast('📦 Old expenses moved to ledger');
}

// ===================== INVEST CARDS =====================
function renderInvestCards(surplus) {
  const container = document.getElementById('investCards');
  if (!container) return;
  if (surplus <= 0) {
    container.innerHTML = '<div class="empty"><span class="big">📉</span><div>Expenses exceed income.<br>Reduce spending before investing.</div></div>';
    return;
  }

  let safePct = .4, growthPct = .4, liqPct = .2;
  if (surplus < 5000)       { safePct = .6; growthPct = .2; }
  else if (surplus < 15000) { safePct = .4; growthPct = .4; }
  else if (surplus < 30000) { safePct = .3; growthPct = .5; }
  else                      { safePct = .25; growthPct = .55; }

  const safeAmt    = Math.round(surplus * safePct);
  const growthAmt  = Math.round(surplus * growthPct);
  const liqAmt     = Math.round(surplus * liqPct);
  const rdMonthly  = Math.round(safeAmt * .6);
  const rdMat      = Math.round(rdMonthly * 12 * (1 + .065 / 2));
  const sipVal     = Math.round(growthAmt * (((Math.pow(1 + .11/12, 60) - 1) / (.11/12)) * (1 + .11/12)));
  const fdLump     = Math.round(safeAmt * .4 * 3);
  const fdMat      = Math.round(fdLump * (1 + .07));
  const ppfAnnual  = Math.min(Math.round(surplus * 12 * .15), 150000);
  const npsMonthly = Math.round(surplus * .10);

  const cards = [
    { icon:'🏦', name:'Recurring Deposit', type:'Safe',       cls:'type-safe',   detail:'Fixed returns • 6.5% p.a.', amt:`${fmt(rdMonthly)} /month`,   proj:`1 Year ≈ ${fmt(rdMat)}` },
    { icon:'📈', name:'Mutual Fund SIP',   type:'Growth',     cls:'type-growth', detail:'10-12% p.a. • Long-term',   amt:`${fmt(growthAmt)} /month`,  proj:`5 Year est. ≈ ${fmt(sipVal)}` },
    { icon:'🔒', name:'Fixed Deposit',     type:'Safe',       cls:'type-safe',   detail:'Lump sum • 7% p.a.',        amt:`${fmt(fdLump)} /quarter`,    proj:`1 Year ≈ ${fmt(fdMat)}` },
    { icon:'⚡', name:'PPF',               type:'Tax-Save',   cls:'type-tax',    detail:'80C • 7.1% p.a. • 15yr',   amt:`${fmt(ppfAnnual)} /year`,    proj:'Max ₹1.5L for 80C' },
    { icon:'🛡️', name:'NPS',              type:'Retirement', cls:'type-retire', detail:'80CCD • 8-10% p.a.',        amt:`${fmt(npsMonthly)} /month`,  proj:'Extra ₹50K benefit' },
    { icon:'💧', name:'Liquid Fund',       type:'Liquid',     cls:'type-liquid', detail:'4-5% p.a. • Easy withdrawal', amt:`${fmt(liqAmt)} /month`,  proj:'3-6 months expenses' },
  ];

  const frag = document.createDocumentFragment();
  const barDiv = document.createElement('div');
  barDiv.style.marginBottom = '14px';
  barDiv.innerHTML = `
    <div class="alloc-bar">
      <div class="alloc-seg safe"   style="width:${safePct*100}%">${safePct>=.15?Math.round(safePct*100)+'%':''}</div>
      <div class="alloc-seg growth" style="width:${growthPct*100}%">${growthPct>=.15?Math.round(growthPct*100)+'%':''}</div>
      <div class="alloc-seg liquid" style="width:${liqPct*100}%">${liqPct>=.15?Math.round(liqPct*100)+'%':''}</div>
    </div>
    <div class="alloc-legend">
      <span><span class="dot" style="background:var(--safe)"></span>Safe: ${fmt(safeAmt)}</span>
      <span><span class="dot" style="background:var(--growth)"></span>Growth: ${fmt(growthAmt)}</span>
      <span><span class="dot" style="background:var(--liquid)"></span>Liquid: ${fmt(liqAmt)}</span>
    </div>`;
  frag.appendChild(barDiv);

  cards.forEach(c => {
    const card = document.createElement('div');
    card.className = 'invest-card';
    card.innerHTML = `
      <div class="head"><span class="name">${c.icon} ${c.name}</span><span class="type ${c.cls}">${c.type}</span></div>
      <div class="detail">${c.detail}</div>
      <div class="amt">${c.amt}</div>
      <div class="proj">${c.proj}</div>`;
    frag.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(frag);
}

// ===================== TIPS =====================
function renderTips(income, expenses, surplus, rate, unalloc) {
  const list = document.getElementById('tipsList');
  if (!list) return;
  const tips = [];
  if (rate < 20 && income > 0) tips.push('Aim for at least 20% savings rate for healthy wealth building.');
  if (surplus < 5000 && income > 0) tips.push('Start small — even ₹500/month in an RD builds discipline.');

  // Check if rent-like expenses dominate
  const rentTotal = (allTransactionsCache[currentMonth] || [])
    .filter(t => t.note && /rent|emi/i.test(t.note))
    .reduce((s, t) => s + t.amount, 0);
  if (income > 0 && rentTotal > 0 && rentTotal / income > .3)
    tips.push('Rent/EMI is >30% of income. Consider reducing housing costs if possible.');

  if (unalloc > 5000) tips.push('You have unallocated surplus. Invest it instead of letting it sit idle!');
  if (unalloc < 0)    tips.push('Your investments exceed surplus. Reduce discretionary spending or SIP amounts.');
  tips.push('Automate your SIP/RD on salary day — "pay yourself first".');
  tips.push('Review and rebalance your portfolio every 6 months.');
  tips.push('Keep 3-6 months of expenses in Liquid Fund before aggressive investing.');
  list.innerHTML = tips.map(t => `<li>${t}</li>`).join('');
}

// ===================== OCR / SCAN =====================
async function handleScan(input) {
  const file = input.files[0];
  if (!file) return;

  const preview = document.getElementById('scanPreview');
  preview.src   = URL.createObjectURL(file);
  preview.style.display = 'block';

  document.getElementById('scanArea').style.display    = 'none';
  document.getElementById('ocrProgress').style.display = 'block';
  document.getElementById('ocrStatus').textContent     = 'Loading OCR engine...';
  document.getElementById('ocrResult').style.display   = 'none';

  try {
    if (!ocrWorker) {
      ocrWorker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            document.getElementById('ocrProgressBar').style.width = (m.progress * 100) + '%';
            document.getElementById('ocrStatus').textContent = 'Reading invoice... ' + Math.round(m.progress * 100) + '%';
          }
        }
      });
    }

    document.getElementById('ocrStatus').textContent = 'Analyzing image...';
    const result = await ocrWorker.recognize(file);
    const text   = result.data.text;

    await ocrWorker.terminate();
    ocrWorker = null;

    const parsed = parseInvoiceText(text);
    document.getElementById('scanMerchant').value   = parsed.merchant || '';
    document.getElementById('scanAmount').value     = parsed.amount   || '';
    document.getElementById('scanCategory').value   = parsed.category || 'otherExpenses';
    document.getElementById('scanDate').textContent = parsed.date     || new Date().toLocaleDateString('en-IN');

    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('ocrStatus').textContent     = '✅ Scan complete! Review and save.';
    document.getElementById('ocrResult').style.display   = 'block';
  } catch (err) {
    console.error(err);
    if (ocrWorker) { ocrWorker.terminate(); ocrWorker = null; }
    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('ocrStatus').textContent     = '❌ Error scanning. Try again with a clearer photo.';
    document.getElementById('scanArea').style.display    = 'block';
    document.getElementById('scanPreview').style.display = 'none';
  }
  input.value = '';
}

function parseInvoiceText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let amount = 0, merchant = '', category = 'otherExpenses', date = '';

  const allAmounts = [];
  lines.forEach(line => {
    const matches = line.match(/[₹Rs\.]*\s*([\d,]+\.?\d*)/gi);
    if (matches) matches.forEach(m => {
      const num = parseFloat(m.replace(/[^\d.]/g, '').replace(/\.$/, ''));
      if (num > 10 && num < 1000000) allAmounts.push(num);
    });
    if (/total|amount|bill|payable/i.test(line)) {
      const nums = line.match(/[\d,]+\.?\d*/g);
      if (nums) nums.forEach(n => {
        const num = parseFloat(n.replace(/,/g, ''));
        if (num > 10 && num < 1000000) allAmounts.push(num);
      });
    }
  });

  if (allAmounts.length > 0) { allAmounts.sort((a, b) => b - a); amount = allAmounts[0]; }

  for (const line of lines) {
    if (line.length > 2 && line.length < 50 && !/\d{4,}/.test(line) && !/total|amount|bill|tax|gst|date|time/i.test(line)) {
      merchant = line.replace(/[^\w\s&.,-]/g, '').trim();
      if (merchant.length > 2) break;
    }
  }

  const t = text.toLowerCase();
  if      (/grocery|supermarket|big\s*bazaar|reliance|dmart|kirana|vegetable|fruit|mart/i.test(t))  category = 'groceries';
  else if (/petrol|diesel|fuel|hp|indian\s*oil|bharat|shell|transport|cab|uber|ola|auto|taxi/i.test(t)) category = 'transport';
  else if (/restaurant|hotel|food|swiggy|zomato|domino|pizza|burger|cafe|biryani/i.test(t))        category = 'groceries';
  else if (/movie|theatre|amazon|flipkart|myntra|shopping|mall|retail|fashion/i.test(t))          category = 'entertainment';
  else if (/electricity|water|gas|broadband|wifi|mobile|recharge|bill|utility/i.test(t))          category = 'utilities';
  else if (/hospital|clinic|pharmacy|medical|doctor|health|insurance|apollo|medplus/i.test(t))    category = 'insurance';

  const dateMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i);
  if (dateMatch) date = dateMatch[0];

  return { amount, merchant, category, date };
}

function resetScan() {
  document.getElementById('scanArea').style.display    = 'block';
  document.getElementById('scanPreview').style.display = 'none';
  document.getElementById('ocrProgress').style.display = 'none';
  document.getElementById('ocrStatus').textContent     = '';
  document.getElementById('ocrResult').style.display   = 'none';
  document.getElementById('scanInput').value           = '';
}

// Scan → create a ledger transaction directly
async function saveScan() {
  const amount   = parseFloat(document.getElementById('scanAmount').value) || 0;
  const category = document.getElementById('scanCategory').value;
  const note     = document.getElementById('scanMerchant').value.trim() || 'Scanned Invoice';

  if (amount <= 0) { showToast('❌ Enter an amount before saving.'); document.getElementById('scanAmount').focus(); return; }

  const today = new Date().toISOString().split('T')[0];
  const tx = { id: genId(), month: currentMonth, date: today, amount, category, note, createdAt: Date.now() };

  await addTransaction(tx);
  await refreshTransactions(currentMonth);
  showToast(`✅ ${fmt(amount)} added to ledger`);
  resetScan();
  switchTab('expenses');
}

// ===================== PAYSLIP → INCOME SYNC =====================
function useNetAsIncome() {
  const d     = getMonthData(currentMonth);
  const gross = d.psBasic + d.psHra + d.psDa + d.psConv + d.psMed + d.psSpecial + d.psLta + d.psBonus + d.psOtherAllow;
  const ded   = d.psPfEmp + d.psPfEmpr + d.psProfTax + d.psTds + d.psHealth + d.psOtherDed;
  const net   = gross - ded;
  if (net <= 0) { showToast('Fill in payslip details first.'); return; }
  const el = document.getElementById('salary');
  if (el) el.value = Math.round(net);
  onInputChange();
  showToast(`✅ Net salary ${fmt(net)} set as income`);
  switchTab('income');
}

// ===================== IMPORT / EXPORT =====================
async function exportData() {
  const [allData, allTxs] = await Promise.all([loadAllData(), getAllTransactions()]);
  const exportObj = { version: APP_VERSION, exportedAt: new Date().toISOString(), data: allData, transactions: allTxs };
  downloadFile(JSON.stringify(exportObj, null, 2), `fintrack-backup-${today()}.json`, 'application/json');
  localStorage.setItem('lastBackup', new Date().toISOString());
  updateLastBackupDisplay();
  showToast('JSON backup exported!');
}

function exportCSV() {
  // Summary sheet
  const headers = ['Month','Total Income','Total Expenses','Surplus','Total Invested'];
  let csv = headers.join(',') + '\n';
  months.forEach(m => {
    const d   = appData[m] || getDefaultMonthData();
    const inc = d.salary + d.sideIncome + d.passiveIncome + d.otherIncome;
    const exp = (allTransactionsCache[m] || []).reduce((s, t) => s + t.amount, 0);
    const inv = d.rd + d.sip + d.fd + d.ppf + d.nps + d.liquid + d.otherSavings;
    csv += [m, inc, exp, inc - exp, inv].join(',') + '\n';
  });

  csv += '\n\nTransaction Ledger\nDate,Month,Category,Note,Amount\n';
  const allTxs = Object.values(allTransactionsCache).flat()
    .sort((a, b) => b.date.localeCompare(a.date));
  allTxs.forEach(t => {
    const cat = CATEGORIES[t.category]?.label || t.category;
    csv += [t.date, t.month, cat, `"${(t.note||'').replace(/"/g,'""')}"`, t.amount].join(',') + '\n';
  });

  downloadFile(csv, `fintrack-${today()}.csv`, 'text/csv');
  localStorage.setItem('lastBackup', new Date().toISOString());
  updateLastBackupDisplay();
  showToast('CSV exported (with ledger)!');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function today() { return new Date().toISOString().split('T')[0]; }

async function importData(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const obj  = JSON.parse(text);
    if (!obj.data) { showToast('Invalid backup file'); input.value = ''; return; }
    pendingImportData = obj;
    showImportPreview(obj.data);
  } catch (e) { showToast('Error reading file'); input.value = ''; }
}

function showImportPreview(data) {
  const preview = document.getElementById('importPreview');
  let html = '<table><tr><th>Month</th><th>Income</th><th>Expenses (ledger)</th><th>Invested</th></tr>';
  months.forEach(m => {
    const d = data[m];
    if (!d) return;
    const income   = (d.salary||0)+(d.sideIncome||0)+(d.passiveIncome||0)+(d.otherIncome||0);
    const invested = (d.rd||0)+(d.sip||0)+(d.fd||0)+(d.ppf||0)+(d.nps||0)+(d.liquid||0)+(d.otherSavings||0);
    html += `<tr><td>${m}</td><td>₹${income}</td><td>—</td><td>₹${invested}</td></tr>`;
  });
  html += '</table>';
  preview.innerHTML = html;
  document.getElementById('importModal').classList.add('show');
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('show');
  pendingImportData = null;
  document.getElementById('importFile').value  = '';
  document.getElementById('importFile2').value = '';
}

async function confirmImport() {
  if (!pendingImportData) return;
  appData = pendingImportData.data;
  for (const [month, data] of Object.entries(appData)) await saveMonthData(month, data);

  // Restore transactions if present in backup
  if (pendingImportData.transactions && Array.isArray(pendingImportData.transactions)) {
    for (const tx of pendingImportData.transactions) await addTransaction(tx);
    // Rebuild cache
    allTransactionsCache = {};
    pendingImportData.transactions.forEach(tx => {
      if (!allTransactionsCache[tx.month]) allTransactionsCache[tx.month] = [];
      allTransactionsCache[tx.month].push(tx);
    });
  }

  pendingImportData = null;
  closeImportModal();
  loadMonthUI(currentMonth);
  showToast('Data restored successfully!');
}

// ===================== CLEAR DATA =====================
function clearAllData() {
  document.getElementById('clearConfirmInput').value = '';
  document.getElementById('clearModal').classList.add('show');
  setTimeout(() => document.getElementById('clearConfirmInput').focus(), 200);
}
function closeClearModal() { document.getElementById('clearModal').classList.remove('show'); }

async function confirmClearData() {
  const input = document.getElementById('clearConfirmInput');
  if (input.value !== 'DELETE') {
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 400);
    showToast('Type DELETE (all caps) to confirm');
    return;
  }
  await clearDB();
  appData = {}; allTransactionsCache = {}; currentTransactions = [];
  localStorage.removeItem('financeTrackerBackup');
  localStorage.removeItem('financeTrackerTx');
  localStorage.removeItem('financeTrackerData');
  localStorage.removeItem('lastBackup');
  localStorage.removeItem('expMigrated_v2');
  updateLastBackupDisplay();
  loadMonthUI(currentMonth);
  closeClearModal();
  showToast('All data cleared');
}

// ===================== BACKUP REMINDERS =====================
function checkBackupReminder() {
  const last = localStorage.getItem('lastBackup');
  updateLastBackupDisplay();
  if (!last) { showToast('💡 Tap "Export" to create your first backup!'); return; }
  const days = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
  if (days > 7) showToast(`⚠️ Backup is ${Math.round(days)} days old. Export now!`);
}
function updateLastBackupDisplay() {
  const last = localStorage.getItem('lastBackup');
  const el   = document.getElementById('lastBackup');
  if (!el) return;
  if (!last) { el.textContent = 'Never'; el.style.color = 'var(--danger)'; return; }
  const days = Math.round((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24));
  el.textContent = days === 0 ? 'Today' : `${days} days ago`;
  el.style.color  = days > 7 ? 'var(--danger)' : 'var(--success)';
}

// ===================== NAVIGATION =====================
function switchTab(tab) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.getAttribute('onclick')?.includes(`'${tab}'`)) b.classList.add('active');
  });
  // Highlight gear icon when Settings is active
  const gear = document.getElementById('gearBtn');
  if (gear) gear.classList.toggle('active', tab === 'settings');
}

// ===================== PWA =====================
function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(c => {
      if (c.outcome === 'accepted') { showToast('App installed!'); document.getElementById('pwaInstall').classList.remove('show'); }
      deferredPrompt = null;
    });
  } else showToast('Use "Add to Home Screen" in your browser menu');
}
function dismissInstall() { document.getElementById('pwaInstall').classList.remove('show'); }

// ===================== TOAST =====================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ===================== INIT =====================
init();
