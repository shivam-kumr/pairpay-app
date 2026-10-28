const money = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
});

const STORAGE_KEY = 'pairpay-v2-state';

const defaults = {
  profiles: { a: { name: 'Arjun' }, m: { name: 'Mira' } },
  plan: { incomeA: 100000, incomeM: 62000, total: 70000, mode: 'proportional', customA: 58 },
  contributed: { Arjun: 38200, Mira: 25800 },
  transactions: [
    { id: 101, description: 'Monthly salary', amount: 100000, category: 'Other', partner: 'Arjun', date: '2026-10-01', type: 'income', visibility: 'personal' },
    { id: 102, description: 'Monthly salary', amount: 62000, category: 'Other', partner: 'Mira', date: '2026-10-01', type: 'income', visibility: 'personal' },
    { id: 103, description: 'Gym membership', amount: 2200, category: 'Healthcare', partner: 'Arjun', date: '2026-10-04', type: 'expense', visibility: 'personal' },
    { id: 104, description: 'Yoga classes', amount: 2500, category: 'Healthcare', partner: 'Mira', date: '2026-10-05', type: 'expense', visibility: 'personal' },
    { id: 105, description: 'Books and courses', amount: 3200, category: 'Other', partner: 'Arjun', date: '2026-10-16', type: 'expense', visibility: 'personal' },
    { id: 106, description: 'Coffee with friends', amount: 1800, category: 'Food', partner: 'Mira', date: '2026-10-23', type: 'expense', visibility: 'personal' }
  ],
  expenses: [
    { id: 1, description: 'October rent', amount: 28000, category: 'Home', payer: 'Arjun', date: '2 Oct', rule: '62 / 38', status: 'pending' },
    { id: 2, description: 'Weekly groceries', amount: 3840, category: 'Food', payer: 'Mira', date: '5 Oct', rule: '62 / 38', status: 'pending' },
    { id: 3, description: 'Electricity + Wi-Fi', amount: 4200, category: 'Bills', payer: 'Arjun', date: '7 Oct', rule: '62 / 38', status: 'pending' },
    { id: 4, description: 'Support for Amma', amount: 8000, category: 'Family', payer: 'Mira', date: '9 Oct', rule: '62 / 38', status: 'settled' },
    { id: 5, description: 'Metro cards', amount: 1800, category: 'Travel', payer: 'Arjun', date: '12 Oct', rule: '62 / 38', status: 'pending' },
    { id: 6, description: 'Sunday lunch', amount: 2400, category: 'Food', payer: 'Mira', date: '16 Oct', rule: '50 / 50', status: 'pending' },
    { id: 7, description: 'Kitchen repair', amount: 3600, category: 'Home', payer: 'Arjun', date: '20 Oct', rule: '62 / 38', status: 'pending' }
  ],
  budgets: { Home: 32000, Food: 8000, Bills: 6000, Family: 8000, Travel: 5000, Entertainment: 4000 },
  settlementHistory: [
    { id: 1, from: 'Mira', to: 'Arjun', amount: 3120, date: '28 Sept 2026' },
    { id: 2, from: 'Arjun', to: 'Mira', amount: 1450, date: '27 Aug 2026' }
  ],
  preferences: { budget: true, settlement: true, goals: true, digest: false, private: true },
  goals: [
    { id: 1, name: 'Goa in December', target: 60000, saved: 42160, deadline: '2026-12-12', rule: 'active', theme: 'sunset' },
    { id: 2, name: 'Emergency cushion', target: 150000, saved: 0, deadline: '2027-06-30', rule: 'active', theme: 'forest' }
  ],
  checkinCompleted: false
};

function cloneDefaults() { return JSON.parse(JSON.stringify(defaults)); }

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !saved.plan || !Array.isArray(saved.expenses) || !Array.isArray(saved.goals)) return cloneDefaults();
    const base = cloneDefaults();
    return {
      ...base,
      ...saved,
      profiles: { ...base.profiles, ...(saved.profiles || {}) },
      budgets: { ...base.budgets, ...(saved.budgets || {}) },
      preferences: { ...base.preferences, ...(saved.preferences || {}) },
      transactions: Array.isArray(saved.transactions) ? saved.transactions : base.transactions,
      settlementHistory: Array.isArray(saved.settlementHistory) ? saved.settlementHistory : base.settlementHistory
    };
  } catch {
    return cloneDefaults();
  }
}

let state = loadState();
let activeExpenseFilter = 'all';
let expenseSearch = '';
let activeTransactionFilter = 'all';
let transactionSearch = '';
let activeScenario = 'current';
let checkinStep = 1;
let selectedFeeling = '';
let selectedNextPlan = 'keep';
let lastDialogTrigger = null;

const categorySymbols = { Home: '⌂', Food: '♨', Bills: '⌁', Family: '♥', Travel: '↗', Healthcare: '+', EMI: '◎', Entertainment: '♪', Other: '·' };
const viewCopy = {
  home: ['October 2026', 'Your month, together'],
  transactions: ['All money activity', 'Transactions'],
  expenses: ['Shared activity', 'Money you share'],
  budgets: ['October 2026', 'Household budget'],
  plan: ['Fair-share plan', 'What feels fair to you'],
  goals: ['Joint goals', 'What you’re building'],
  settlements: ['Shared balance', 'Settle up clearly'],
  insights: ['Financial health', 'What your numbers are saying'],
  checkin: ['Monthly check-in', 'A calmer money conversation'],
  settings: ['Your PairPay', 'Settings']
};

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function formatDate(value) { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)); }

function sharesFor(plan) {
  if (plan.mode === 'equal') return { a: 50, m: 50 };
  if (plan.mode === 'custom') {
    const a = clamp(Math.round(Number(plan.customA) || 0), 0, 100);
    return { a, m: 100 - a };
  }
  const totalIncome = Math.max(0, plan.incomeA) + Math.max(0, plan.incomeM);
  if (!totalIncome) return { a: 50, m: 50 };
  const a = Math.round((Math.max(0, plan.incomeA) / totalIncome) * 100);
  return { a, m: 100 - a };
}

function planAmounts(plan) {
  const shares = sharesFor(plan);
  const a = Math.round(plan.total * shares.a / 100);
  return { shares, a, m: plan.total - a };
}

function expenseTotal() { return state.expenses.reduce((sum, item) => sum + Number(item.amount), 0); }
function goalsSaved() { return state.goals.reduce((sum, item) => sum + Number(item.saved), 0); }
function profileName(key) { return key === 'a' ? (state.profiles?.a?.name || 'Arjun') : (state.profiles?.m?.name || 'Mira'); }
function allTransactions() {
  const shared = state.expenses.map(item => ({ id: `shared-${item.id}`, sourceId: item.id, description: item.description, amount: Number(item.amount), category: item.category, partner: item.payer, date: item.date, type: 'expense', visibility: 'shared' }));
  return [...state.transactions, ...shared].sort((a, b) => Number(String(b.id).replace(/\D/g, '')) - Number(String(a.id).replace(/\D/g, '')));
}
function expenseShare(item) {
  const shareA = clamp(Number(String(item.rule || '50 / 50').split('/')[0].trim()) || 50, 0, 100);
  const owedA = Math.round(Number(item.amount) * shareA / 100);
  return { shareA, owedA, owedM: Number(item.amount) - owedA };
}
function settlementSummary() {
  const pending = state.expenses.filter(item => (item.status || 'pending') === 'pending');
  let paidA = 0; let paidM = 0; let owedA = 0; let owedM = 0;
  pending.forEach(item => {
    if (item.payer === 'Arjun') paidA += Number(item.amount); else paidM += Number(item.amount);
    const shares = expenseShare(item); owedA += shares.owedA; owedM += shares.owedM;
  });
  const balanceA = paidA - owedA;
  return { pending, paidA, paidM, owedA, owedM, balanceA, amount: Math.abs(balanceA), from: balanceA >= 0 ? 'Mira' : 'Arjun', to: balanceA >= 0 ? 'Arjun' : 'Mira' };
}
function budgetSpent() {
  return state.expenses.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + Number(item.amount); return acc; }, {});
}
function monthsUntil(dateValue) {
  const deadline = new Date(`${dateValue}T00:00:00`);
  const today = new Date('2026-10-28T00:00:00');
  return Math.max(1, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24 * 30.4)));
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3600);
}

function showView(name, focusMain = true) {
  document.body.dataset.activeView = name;
  document.querySelectorAll('.view').forEach(view => { view.hidden = view.id !== `view-${name}`; });
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === name;
    button.classList.toggle('is-active', active);
    active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current');
  });
  const [kicker, title] = viewCopy[name];
  document.querySelector('#view-kicker').textContent = kicker;
  document.querySelector('#view-title').textContent = title;
  if (name === 'plan') syncPlanControls();
  if (name === 'settings') renderSettings();
  if (focusMain) document.querySelector('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHome() {
  const { shares, a: targetA, m: targetM } = planAmounts(state.plan);
  const totalContributed = state.contributed.Arjun + state.contributed.Mira;
  const remaining = Math.max(0, state.plan.total - totalContributed);
  const funded = state.plan.total ? clamp(Math.round(totalContributed / state.plan.total * 100), 0, 100) : 0;
  const spent = expenseTotal();

  document.querySelector('#hero-remaining').textContent = money.format(remaining);
  document.querySelector('#hero-percent').textContent = `${funded}%`;
  document.querySelector('.hero-visual').setAttribute('aria-label', `Shared plan is ${funded} percent funded`);
  document.querySelector('#hero-subtitle').textContent = `You’ve contributed ${funded}% of ${money.format(state.plan.total)}. ${remaining ? 'You’re moving steadily toward the plan.' : 'This month’s plan is fully funded.'}`;
  document.querySelector('#metric-plan').textContent = money.format(state.plan.total);
  document.querySelector('#metric-spending').textContent = money.format(spent);
  document.querySelector('#metric-expense-count').textContent = `${state.expenses.length} expense${state.expenses.length === 1 ? '' : 's'}`;
  document.querySelector('#metric-goals').textContent = money.format(goalsSaved());
  document.querySelector('#home-plan-total').textContent = money.format(state.plan.total);
  document.querySelector('.pair-mini-card strong').textContent = `${profileName('a')} + ${profileName('m')}`;

  const partners = [
    { name: profileName('a'), key: 'Arjun', share: shares.a, target: targetA, className: 'arjun', bar: 'bar-a' },
    { name: profileName('m'), key: 'Mira', share: shares.m, target: targetM, className: 'mira', bar: 'bar-m' }
  ];
  document.querySelector('#home-partners').innerHTML = partners.map(person => {
    const contributed = state.contributed[person.key];
    const percent = person.target ? clamp(Math.round(contributed / person.target * 100), 0, 100) : 100;
    const personRemaining = Math.max(0, person.target - contributed);
    return `<div class="partner-block">
      <header><div class="partner-identity"><span class="avatar ${person.className}">${person.name[0]}</span><div><strong>${person.name}</strong><span>${person.share}% share</span></div></div><div class="partner-amount"><strong>${money.format(contributed)}</strong><span>of ${money.format(person.target)}</span></div></header>
      <div class="progress-track" aria-label="${escapeHTML(person.name)} has contributed ${percent} percent"><span class="${person.bar}" style="width:${percent}%"></span></div>
      <div class="progress-meta"><span>${percent}% contributed</span><span>${money.format(personRemaining)} remaining</span></div>
    </div>`;
  }).join('');

  document.querySelector('#home-expenses').innerHTML = state.expenses.slice(-3).reverse().map(item => compactExpense(item)).join('');
  renderHomeGoal();
}

function compactExpense(item) {
  return `<div class="compact-expense"><span class="category-icon" aria-hidden="true">${categorySymbols[item.category] || '·'}</span><div><strong>${escapeHTML(item.description)}</strong><small>${escapeHTML(item.category)} · ${escapeHTML(item.date)}</small></div><b>${money.format(item.amount)}</b></div>`;
}

function renderHomeGoal() {
  const goal = state.goals[0];
  if (!goal) {
    document.querySelector('#home-goal-card').innerHTML = '<p class="eyebrow">Together fund</p><h2>No goal yet</h2><p>Create something to build together.</p>';
    return;
  }
  const percent = clamp(Math.round(goal.saved / goal.target * 100), 0, 100);
  document.querySelector('#home-goal-card').innerHTML = `<p class="eyebrow">Together fund</p><h2>${escapeHTML(goal.name)}</h2><p>One shared target, with a contribution that works for both of you.</p><div class="goal-total"><strong>${money.format(goal.saved)}</strong><span>of ${money.format(goal.target)}</span></div><div class="progress-track" aria-label="${percent} percent saved"><span style="width:${percent}%"></span></div><footer><span>${percent}% saved</span><span>${money.format(Math.max(0, goal.target - goal.saved))} to go</span></footer>`;
}

function renderExpenses() {
  const total = expenseTotal();
  document.querySelector('#expense-total').textContent = money.format(total);
  document.querySelector('#checkin-spend').textContent = money.format(total);
  document.querySelector('.expense-summary > div:first-child > span').textContent = `of ${money.format(state.plan.total)} plan`;

  const grouped = state.expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
    return acc;
  }, {});
  const categories = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(...categories.map(item => item[1]), 1);
  document.querySelector('#category-bars').innerHTML = categories.map(([category, amount]) => `<div class="category-bar" title="${escapeHTML(category)}: ${money.format(amount)}"><i style="height:${Math.max(8, Math.round(amount / max * 58))}px"></i><span>${escapeHTML(category)}</span></div>`).join('');

  const filtered = state.expenses.filter(item => {
    const categoryMatch = activeExpenseFilter === 'all' || item.category === activeExpenseFilter;
    const query = expenseSearch.trim().toLowerCase();
    const searchMatch = !query || `${item.description} ${item.category} ${item.payer}`.toLowerCase().includes(query);
    return categoryMatch && searchMatch;
  }).slice().reverse();
  document.querySelector('#expense-list').innerHTML = filtered.length ? filtered.map(expenseRow).join('') : '<div class="empty-state"><strong>No shared activity found</strong><span>Try another category or add a new expense.</span></div>';
}

function expenseRow(item) {
  const avatarClass = item.payer === 'Arjun' ? 'arjun' : 'mira';
  return `<div class="ledger-row"><div class="ledger-main"><span class="category-icon" aria-hidden="true">${categorySymbols[item.category] || '·'}</span><div><strong>${escapeHTML(item.description)}</strong><small>${escapeHTML(item.category)} · ${escapeHTML(item.date)} · ${(item.status || 'pending') === 'pending' ? 'Pending' : 'Settled'}</small></div></div><div class="payer-cell"><span class="avatar ${avatarClass}" style="width:27px;height:27px">${item.payer[0]}</span>${escapeHTML(item.payer)}</div><span class="rule-pill">${escapeHTML(item.rule)}</span><strong class="ledger-amount">${money.format(item.amount)}</strong></div>`;
}

function renderTransactions() {
  const items = allTransactions();
  const income = items.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const personal = items.filter(item => item.type === 'expense' && item.visibility === 'personal').reduce((sum, item) => sum + item.amount, 0);
  const shared = expenseTotal();
  document.querySelector('#transaction-summary').innerHTML = [
    ['Combined income', money.format(income), 'Arjun + Mira'],
    ['Personal spending', money.format(personal), 'Visible only to the owner'],
    ['Shared spending', money.format(shared), `${state.expenses.length} household expenses`],
    ['Left this month', money.format(Math.max(0, income - personal - shared)), 'After personal + shared']
  ].map(([label, value, note]) => `<article class="summary-tile"><small>${label}</small><strong>${value}</strong><span>${note}</span></article>`).join('');
  const query = transactionSearch.trim().toLowerCase();
  const filtered = items.filter(item => {
    const typeMatch = activeTransactionFilter === 'all' || item.visibility === activeTransactionFilter || item.type === activeTransactionFilter;
    return typeMatch && (!query || `${item.description} ${item.category} ${item.partner}`.toLowerCase().includes(query));
  });
  document.querySelector('#transaction-list').innerHTML = filtered.length ? filtered.map(item => {
    const avatarClass = item.partner === 'Arjun' ? 'arjun' : 'mira';
    const sign = item.type === 'income' ? '+' : '−';
    const editable = item.visibility === 'personal';
    return `<div class="transaction-row"><div class="transaction-main"><span class="avatar ${avatarClass}">${item.partner[0]}</span><div><strong>${escapeHTML(item.description)}</strong><small>${escapeHTML(item.date)} · ${escapeHTML(item.category)} · ${escapeHTML(item.partner)}</small></div></div><span class="visibility-pill ${item.visibility}">${item.visibility}</span><strong class="transaction-value ${item.type}">${sign}${money.format(item.amount)}</strong><div class="row-actions">${editable ? `<button data-edit-transaction="${item.id}" aria-label="Edit ${escapeHTML(item.description)}">✎</button><button data-delete-transaction="${item.id}" aria-label="Delete ${escapeHTML(item.description)}">×</button>` : '<button data-jump="expenses" aria-label="Open shared expenses">›</button>'}</div></div>`;
  }).join('') : '<div class="empty-state"><strong>No transactions found</strong><span>Try another filter or add a transaction.</span></div>';
}

function renderBudgets() {
  const spent = budgetSpent();
  const entries = Object.entries(state.budgets);
  const planned = entries.reduce((sum, [, amount]) => sum + Number(amount), 0);
  const actual = entries.reduce((sum, [category]) => sum + (spent[category] || 0), 0);
  const over = entries.filter(([category, amount]) => (spent[category] || 0) > amount);
  document.querySelector('#budget-summary').innerHTML = [
    ['Combined income', money.format(state.plan.incomeA + state.plan.incomeM), 'Take-home income'],
    ['Planned shared', money.format(planned), `${entries.length} categories`],
    ['Spent so far', money.format(actual), `${Math.round(actual / Math.max(planned, 1) * 100)}% of plan`],
    ['Expected savings', money.format(Math.max(0, state.plan.incomeA + state.plan.incomeM - planned)), 'After planned shared costs']
  ].map(([label, value, note]) => `<article class="summary-tile"><small>${label}</small><strong>${value}</strong><span>${note}</span></article>`).join('');
  document.querySelector('#budget-list').innerHTML = entries.map(([category, amount]) => {
    const used = spent[category] || 0; const percent = Math.round(used / Math.max(amount, 1) * 100);
    const status = percent > 100 ? 'is-over' : percent >= 85 ? 'is-close' : 'is-good';
    const remainder = amount - used;
    return `<div class="budget-row ${status}"><header><strong>${escapeHTML(category)}</strong><span>${money.format(used)} / ${money.format(amount)}</span></header><div class="progress-track" aria-label="${percent}% of ${escapeHTML(category)} budget used"><span style="width:${Math.min(100, percent)}%"></span></div><footer><span class="${remainder < 0 ? 'budget-alert' : ''}">${remainder < 0 ? `${money.format(Math.abs(remainder))} over budget` : `${money.format(remainder)} still available`}</span><button class="link-button" data-edit-budget="${escapeHTML(category)}">Edit</button></footer></div>`;
  }).join('');
  document.querySelector('#budget-insight-title').textContent = over.length ? `${over.length} categor${over.length === 1 ? 'y needs' : 'ies need'} attention` : 'Your budget is in a comfortable range';
  document.querySelector('#budget-insight-copy').textContent = over.length ? `${over.map(([category]) => category).join(', ')} ${over.length === 1 ? 'is' : 'are'} above plan. A small adjustment now protects the rest of the month.` : 'Every planned category is currently within its limit.';
}

function renderSettlements() {
  const summary = settlementSummary();
  document.querySelector('#pending-count').textContent = summary.pending.length;
  document.querySelector('#settlement-pending-count').textContent = summary.pending.length;
  const fromClass = summary.from === 'Arjun' ? 'arjun' : 'mira'; const toClass = summary.to === 'Arjun' ? 'arjun' : 'mira';
  document.querySelector('#settlement-hero').innerHTML = `<p class="eyebrow">Current balance</p><div class="settlement-direction"><span class="avatar ${fromClass}">${summary.from[0]}</span><svg class="icon"><use href="#i-chevron" /></svg><span class="avatar ${toClass}">${summary.to[0]}</span></div><h2>${summary.amount ? `${summary.from} owes ${summary.to}<br>${money.format(summary.amount)}` : 'You are all settled'}</h2><p>Across ${summary.pending.length} pending shared expense${summary.pending.length === 1 ? '' : 's'}.</p>${summary.amount ? '<button class="button light" id="mark-settled">Mark as settled</button>' : ''}`;
  document.querySelector('#settlement-breakdown').innerHTML = `<div class="balance-stat"><span>Arjun paid</span><strong>${money.format(summary.paidA)}</strong></div><div class="balance-stat"><span>Arjun’s agreed share</span><strong>${money.format(summary.owedA)}</strong></div><div class="balance-stat"><span>Mira paid</span><strong>${money.format(summary.paidM)}</strong></div><div class="balance-stat"><span>Mira’s agreed share</span><strong>${money.format(summary.owedM)}</strong></div>`;
  document.querySelector('#settlement-expenses').innerHTML = summary.pending.length ? summary.pending.map(item => { const share = expenseShare(item); return `<div class="settlement-expense-row"><div><strong>${escapeHTML(item.description)}</strong><small>${escapeHTML(item.date)} · ${escapeHTML(item.category)} · paid by ${escapeHTML(item.payer)}</small></div><div><strong>${money.format(item.amount)}</strong><small>Arjun ${money.format(share.owedA)} · Mira ${money.format(share.owedM)}</small></div></div>`; }).join('') : '<div class="empty-state"><strong>No pending balance</strong><span>New shared expenses will appear here.</span></div>';
  document.querySelector('#settlement-history').innerHTML = state.settlementHistory.length ? state.settlementHistory.map(item => `<div class="history-row"><div><strong>${escapeHTML(item.from)} paid ${escapeHTML(item.to)}</strong><small>${escapeHTML(item.date)} · Shared expenses</small></div><div><strong>${money.format(item.amount)}</strong><span class="status-pill">Settled</span></div></div>`).join('') : '<div class="empty-state"><strong>No settlement history yet</strong><span>Your completed settlements will stay here.</span></div>';
}

function renderInsights() {
  const spent = budgetSpent(); const total = expenseTotal(); const dining = spent.Food || 0;
  const metrics = [['Savings rate', 86], ['Budget discipline', Math.max(0, 100 - Object.entries(state.budgets).filter(([c, a]) => (spent[c] || 0) > a).length * 14)], ['Goal progress', Math.round(goalsSaved() / Math.max(state.goals.reduce((s, g) => s + g.target, 0), 1) * 100)], ['Contribution fairness', 88]];
  const score = Math.round(metrics.reduce((sum, [, value]) => sum + value, 0) / metrics.length);
  document.querySelector('#health-score').textContent = score;
  document.querySelector('#health-metrics').innerHTML = metrics.map(([label, value]) => `<div class="health-metric"><span>${label}</span><strong>${value}</strong><div class="progress-track"><span style="width:${value}%"></span></div></div>`).join('');
  const summary = settlementSummary();
  const insights = [
    ['Spending pattern', `Food spending is ${money.format(dining)} this month across shared activity.`, 'coral', 'i-trend'],
    ['Contribution insight', `${summary.to} has fronted ${money.format(summary.amount)} more than their agreed share.`, 'mint', 'i-scale'],
    ['Savings opportunity', `Reducing flexible spending by 10% could redirect ${money.format(Math.round((dining + (spent.Entertainment || 0)) * .1))} to your goals.`, 'amber', 'i-goal'],
    ['Budget check-in', `${Object.entries(state.budgets).filter(([c, a]) => (spent[c] || 0) > a).length} categories are above plan this month.`, 'green', 'i-chart'],
    ['Goal forecast', state.goals[0] ? `${state.goals[0].name} is ${Math.round(state.goals[0].saved / state.goals[0].target * 100)}% complete.` : 'Create a shared goal to unlock a forecast.', 'mint', 'i-goal'],
    ['Money talk', 'A five-minute check-in can turn these numbers into one shared decision.', 'coral', 'i-heart']
  ];
  document.querySelector('#insight-grid').innerHTML = insights.map(([title, copy, color, icon]) => `<article class="surface insight-tile"><span class="soft-icon ${color}"><svg class="icon"><use href="#${icon}" /></svg></span><h3>${title}</h3><p>${copy}</p></article>`).join('');
}

function renderSettings() {
  document.querySelector('#settings-name-a').value = profileName('a');
  document.querySelector('#settings-name-m').value = profileName('m');
  document.querySelector('#settings-income-a').value = state.plan.incomeA;
  document.querySelector('#settings-income-m').value = state.plan.incomeM;
  document.querySelectorAll('[data-setting-split]').forEach(button => button.classList.toggle('is-selected', button.dataset.settingSplit === state.plan.mode));
  ['budget', 'settlement', 'goals', 'digest', 'private'].forEach(key => { document.querySelector(`#pref-${key}`).checked = Boolean(state.preferences[key]); });
}

function renderGoals() {
  document.querySelector('#goals-saved').textContent = money.format(goalsSaved());
  document.querySelector('#goals-count').textContent = state.goals.length;
  const plan = planAmounts(state.plan);
  document.querySelector('#goal-grid').innerHTML = state.goals.length ? state.goals.map(goal => {
    const percent = clamp(Math.round(goal.saved / goal.target * 100), 0, 100);
    const remaining = Math.max(0, goal.target - goal.saved);
    const requiredMonthly = Math.ceil(remaining / monthsUntil(goal.deadline));
    const monthly = Number(goal.monthly) || Math.min(6000, remaining);
    const shareA = goal.rule === 'equal' ? 50 : plan.shares.a;
    const sample = Math.min(monthly, remaining);
    const a = Math.round(sample * shareA / 100);
    const badge = percent >= 100 ? 'Complete' : monthly >= requiredMonthly ? 'On track' : 'Needs a boost';
    const forecast = monthly >= requiredMonthly ? `At ${money.format(monthly)}/month, this goal is on pace.` : `Add ${money.format(requiredMonthly - monthly)}/month to meet the target date.`;
    return `<article class="goal-card" data-theme="${escapeHTML(goal.theme)}"><header><div><p class="eyebrow">Shared goal</p><h3>${escapeHTML(goal.name)}</h3><p>Due ${formatDate(goal.deadline)}</p></div><span class="goal-badge">${badge}</span></header><div class="goal-amount"><strong>${money.format(goal.saved)}</strong><span>of ${money.format(goal.target)}</span></div><div class="progress-track" aria-label="${percent} percent saved"><span style="width:${percent}%"></span></div><div class="goal-meta"><span>${percent}% saved</span><span>${money.format(remaining)} to go</span></div><p class="goal-forecast"><strong>Forecast</strong> ${forecast}</p><div class="goal-contributions"><div><span class="avatar arjun">A</span><div><small>Next share</small><strong>${money.format(a)}</strong></div></div><div><span class="avatar mira">M</span><div><small>Next share</small><strong>${money.format(sample - a)}</strong></div></div></div><footer>${monthly < requiredMonthly ? `<button class="link-button" data-match-goal="${goal.id}" data-monthly="${requiredMonthly}">Match required pace</button>` : ''}<button class="button secondary" data-goal-contribute="${goal.id}"><svg class="icon"><use href="#i-plus" /></svg> Add money</button></footer></article>`;
  }).join('') : '<div class="empty-state"><strong>No goals yet</strong><span>Create your first shared goal.</span></div>';
}

function renderCheckinSummary() {
  const totalContributed = state.contributed.Arjun + state.contributed.Mira;
  const funded = state.plan.total ? clamp(Math.round(totalContributed / state.plan.total * 100), 0, 100) : 0;
  document.querySelector('#checkin-funded').textContent = `${funded}%`;
  document.querySelector('#next-plan-current').textContent = money.format(state.plan.total);
  document.querySelector('#next-plan-increase').textContent = money.format(state.plan.total + 8000);
}

function renderAll() {
  renderHome();
  renderTransactions();
  renderExpenses();
  renderBudgets();
  renderGoals();
  renderSettlements();
  renderInsights();
  renderSettings();
  renderCheckinSummary();
  const { shares } = planAmounts(state.plan);
  document.querySelector('#active-rule-label').textContent = `Active fair share · ${shares.a} / ${shares.m}`;
}

function getDraftPlan() {
  let incomeA = Math.max(0, Number(document.querySelector('#plan-income-a').value) || 0);
  let incomeM = Math.max(0, Number(document.querySelector('#plan-income-m').value) || 0);
  let total = Math.max(0, Number(document.querySelector('#plan-total').value) || 0);
  const mode = document.querySelector('[name="split-mode"]:checked').value;
  const customA = Number(document.querySelector('#custom-share').value);
  let label = 'Current income';
  if (activeScenario === 'between-jobs') { incomeM = 0; label = 'Preview · Mira between jobs'; }
  if (activeScenario === 'income-rise') { incomeM += 18000; label = 'Preview · Mira income +₹18,000'; }
  if (activeScenario === 'new-emi') { total += 8000; label = 'Preview · New ₹8,000 EMI'; }
  return { incomeA, incomeM, total, mode, customA, label };
}

function syncPlanControls() {
  document.querySelector('#plan-income-a').value = state.plan.incomeA;
  document.querySelector('#plan-income-m').value = state.plan.incomeM;
  document.querySelector('#plan-total').value = state.plan.total;
  document.querySelector('#custom-share').value = state.plan.customA;
  document.querySelector(`[name="split-mode"][value="${state.plan.mode}"]`).checked = true;
  activeScenario = 'current';
  document.querySelectorAll('.scenario').forEach(item => {
    const isCurrent = item.dataset.scenario === 'current';
    item.classList.toggle('is-selected', isCurrent);
    item.setAttribute('aria-pressed', String(isCurrent));
  });
  updatePlanPreview();
}

function updatePlanPreview() {
  const draft = getDraftPlan();
  const result = planAmounts(draft);
  document.querySelector('#custom-split').hidden = draft.mode !== 'custom';
  document.querySelector('#custom-output').textContent = `${draft.customA}%`;
  document.querySelector('#preview-ratio').textContent = `${result.shares.a} / ${result.shares.m}`;
  document.querySelector('#preview-a').textContent = money.format(result.a);
  document.querySelector('#preview-m').textContent = money.format(result.m);
  document.querySelector('#preview-a-percent').textContent = `${result.shares.a}%`;
  document.querySelector('#preview-m-percent').textContent = `${result.shares.m}%`;
  document.querySelector('#preview-total').textContent = money.format(draft.total);
  document.querySelector('#scenario-label').textContent = draft.label;
  const notes = {
    equal: 'Both partners contribute the same amount, regardless of income.',
    proportional: draft.incomeA + draft.incomeM ? 'This approach adjusts contribution to each person’s current income.' : 'With no income entered, the preview falls back to an equal split.',
    custom: 'You choose the balance when income is not the whole story.'
  };
  document.querySelector('#preview-note').textContent = notes[draft.mode];
  document.querySelector('#compare-equal').textContent = `${money.format(draft.total / 2)} each`;
  const proportional = planAmounts({ ...draft, mode: 'proportional' });
  document.querySelector('#compare-proportional').textContent = `${money.format(proportional.a)} / ${money.format(proportional.m)}`;
  const custom = planAmounts({ ...draft, mode: 'custom' });
  document.querySelector('#compare-custom').textContent = `${money.format(custom.a)} / ${money.format(custom.m)}`;
  document.querySelectorAll('.comparison-card').forEach(card => card.classList.toggle('is-recommended', card.dataset.chooseMode === draft.mode));
  document.querySelectorAll('.comparison-card').forEach(card => card.setAttribute('aria-pressed', String(card.dataset.chooseMode === draft.mode)));
}

function updateExpenseSplitPreview() {
  const amount = Math.max(0, Number(document.querySelector('#expense-amount').value) || 0);
  const rule = document.querySelector('[name="rule"]:checked')?.value || 'active';
  const shareA = rule === 'equal' ? 50 : sharesFor(state.plan).a;
  const a = Math.round(amount * shareA / 100);
  const values = document.querySelectorAll('#expense-split-preview strong');
  values[0].textContent = money.format(a);
  values[1].textContent = money.format(amount - a);
}

function updateGoalSplitPreview() {
  const amount = Math.max(0, Number(document.querySelector('#contribution-amount').value) || 0);
  const shareA = sharesFor(state.plan).a;
  const a = Math.round(amount * shareA / 100);
  const values = document.querySelectorAll('#goal-split-preview strong');
  values[0].textContent = money.format(a);
  values[1].textContent = money.format(amount - a);
}

function openDialog(id, trigger = document.activeElement) {
  const dialog = document.querySelector(`#${id}`);
  if (!dialog) return;
  lastDialogTrigger = trigger;
  dialog.showModal();
  const firstInput = dialog.querySelector('input:not([type="hidden"]), button');
  requestAnimationFrame(() => firstInput?.focus());
}

function syncChoiceState(selector, activeItem, attribute = 'aria-pressed') {
  document.querySelectorAll(selector).forEach(item => item.setAttribute(attribute, String(item === activeItem)));
}

document.querySelector('#expense-dialog').setAttribute('aria-label', 'Add an expense');
document.querySelector('#transaction-dialog').setAttribute('aria-labelledby', 'transaction-dialog-title');
document.querySelector('#budget-dialog').setAttribute('aria-label', 'Set a category budget');
document.querySelector('#goal-dialog').setAttribute('aria-label', 'Create a goal');
document.querySelector('#contribution-dialog').setAttribute('aria-labelledby', 'contribution-title');
document.querySelectorAll('.chip, .scenario, [data-choose-mode]').forEach(item => item.setAttribute('aria-pressed', String(item.classList.contains('is-selected') || item.classList.contains('is-recommended'))));
document.querySelectorAll('.feeling, .next-plan').forEach(item => {
  item.setAttribute('role', 'radio');
  item.setAttribute('aria-checked', String(item.classList.contains('is-selected')));
});
document.querySelector('.next-plan-options').setAttribute('role', 'radiogroup');
document.querySelector('.next-plan-options').setAttribute('aria-label', 'November plan choice');

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => showView(button.dataset.jump)));
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.open === 'transaction-dialog') {
    const form = document.querySelector('#transaction-form'); form.reset(); form.elements.editId.value = ''; form.elements.date.value = '2026-10-28'; document.querySelector('#transaction-dialog-title').textContent = 'Add a transaction';
  }
  openDialog(button.dataset.open, button);
}));

document.querySelector('.month-button').addEventListener('click', () => showToast('October is the active demo month.'));
document.querySelector('.hero-next .circle-action').addEventListener('click', () => showToast('November rent is due in 4 days.'));
document.querySelector('.insight-card .circle-action').addEventListener('click', () => showToast('At the current pace, the Goa goal could finish two weeks early.'));

document.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
  activeExpenseFilter = chip.dataset.filter;
  document.querySelectorAll('.chip').forEach(item => item.classList.toggle('is-selected', item === chip));
  syncChoiceState('.chip', chip);
  renderExpenses();
}));
document.querySelector('#expense-search').addEventListener('input', event => { expenseSearch = event.currentTarget.value; renderExpenses(); });

document.querySelectorAll('[data-transaction-filter]').forEach(chip => chip.addEventListener('click', () => {
  activeTransactionFilter = chip.dataset.transactionFilter;
  document.querySelectorAll('[data-transaction-filter]').forEach(item => item.classList.toggle('is-selected', item === chip));
  renderTransactions();
}));
document.querySelector('#transaction-search').addEventListener('input', event => { transactionSearch = event.currentTarget.value; renderTransactions(); });
document.querySelector('#transaction-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const form = event.currentTarget; const data = new FormData(form);
  const description = String(data.get('description') || '').trim(); const amount = Number(data.get('amount'));
  const error = document.querySelector('#transaction-error');
  if (!description) { error.textContent = 'Add a short description.'; document.querySelector('#transaction-description').focus(); return; }
  if (!Number.isFinite(amount) || amount <= 0) { error.textContent = 'Enter an amount greater than ₹0.'; document.querySelector('#transaction-amount').focus(); return; }
  const editId = Number(data.get('editId'));
  const transaction = { id: editId || Date.now(), description, amount, category: data.get('category'), partner: data.get('partner'), date: data.get('date'), type: data.get('type'), visibility: data.get('visibility') };
  if (transaction.visibility === 'shared' && !editId) {
    const shares = sharesFor(state.plan);
    state.expenses.push({ id: Date.now(), description, amount, category: transaction.category, payer: transaction.partner, date: 'Today', rule: `${shares.a} / ${shares.m}`, status: 'pending' });
  } else {
    const index = state.transactions.findIndex(item => item.id === editId);
    if (index >= 0) state.transactions[index] = transaction; else state.transactions.push(transaction);
  }
  saveState(); renderAll(); form.reset(); form.elements.date.value = '2026-10-28'; form.elements.editId.value = ''; error.textContent = '';
  document.querySelector('#transaction-dialog-title').textContent = 'Add a transaction'; document.querySelector('#transaction-dialog').close();
  showToast(`${description} was saved.`);
});
document.querySelector('#transaction-list').addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-transaction]');
  const deleteButton = event.target.closest('[data-delete-transaction]');
  const openShared = event.target.closest('[data-jump="expenses"]');
  if (openShared) { showView('expenses'); return; }
  if (editButton) {
    const item = state.transactions.find(transaction => transaction.id === Number(editButton.dataset.editTransaction)); if (!item) return;
    const form = document.querySelector('#transaction-form');
    form.elements.editId.value = item.id; form.elements.description.value = item.description; form.elements.amount.value = item.amount; form.elements.date.value = item.date; form.elements.category.value = item.category; form.elements.partner.value = item.partner; form.elements.type.value = item.type; form.elements.visibility.value = item.visibility;
    document.querySelector('#transaction-dialog-title').textContent = 'Edit transaction'; openDialog('transaction-dialog', editButton); return;
  }
  if (deleteButton) {
    state.transactions = state.transactions.filter(item => item.id !== Number(deleteButton.dataset.deleteTransaction)); saveState(); renderAll(); showToast('Transaction removed.');
  }
});

document.querySelector('#budget-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault(); const data = new FormData(event.currentTarget); const amount = Number(data.get('amount')); const category = String(data.get('category'));
  const error = document.querySelector('#budget-error');
  if (!Number.isFinite(amount) || amount <= 0) { error.textContent = 'Enter a monthly budget greater than ₹0.'; return; }
  state.budgets[category] = amount; saveState(); renderAll(); error.textContent = ''; event.currentTarget.reset(); document.querySelector('#budget-dialog').close(); showToast(`${category} budget updated.`);
});
document.querySelector('#budget-list').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-budget]'); if (!button) return;
  document.querySelector('#budget-category').value = button.dataset.editBudget; document.querySelector('#budget-amount').value = state.budgets[button.dataset.editBudget] || ''; openDialog('budget-dialog', button);
});

document.querySelector('#expense-amount').addEventListener('input', updateExpenseSplitPreview);
document.querySelectorAll('[name="rule"]').forEach(input => input.addEventListener('change', updateExpenseSplitPreview));
document.querySelector('#expense-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const description = String(data.get('description') || '').trim();
  const amount = Number(data.get('amount'));
  const error = document.querySelector('#expense-error');
  if (!description) { error.textContent = 'Add a short description for this expense.'; document.querySelector('#expense-description').focus(); return; }
  if (!Number.isFinite(amount) || amount <= 0) { error.textContent = 'Enter an amount greater than ₹0.'; document.querySelector('#expense-amount').focus(); return; }
  const ruleType = data.get('rule');
  const shares = ruleType === 'equal' ? { a: 50, m: 50 } : sharesFor(state.plan);
  state.expenses.push({ id: Date.now(), description, amount, category: data.get('category'), payer: data.get('payer'), date: 'Today', rule: `${shares.a} / ${shares.m}`, status: 'pending' });
  saveState(); renderAll();
  form.reset(); error.textContent = ''; updateExpenseSplitPreview();
  document.querySelector('#expense-dialog').close();
  showToast(`${description} was added to your shared activity.`);
});

document.querySelectorAll('#plan-income-a, #plan-income-m, #plan-total, #custom-share').forEach(input => input.addEventListener('input', updatePlanPreview));
document.querySelectorAll('[name="split-mode"]').forEach(input => input.addEventListener('change', updatePlanPreview));
document.querySelectorAll('.scenario').forEach(button => button.addEventListener('click', () => {
  activeScenario = button.dataset.scenario;
  document.querySelectorAll('.scenario').forEach(item => item.classList.toggle('is-selected', item === button));
  syncChoiceState('.scenario', button);
  updatePlanPreview();
}));
document.querySelectorAll('[data-choose-mode]').forEach(button => button.addEventListener('click', () => {
  const radio = document.querySelector(`[name="split-mode"][value="${button.dataset.chooseMode}"]`);
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
}));
document.querySelector('#apply-plan').addEventListener('click', () => {
  const draft = getDraftPlan();
  if (draft.total <= 0) { showToast('Enter a shared plan greater than ₹0.'); return; }
  state.plan = { incomeA: draft.incomeA, incomeM: draft.incomeM, total: draft.total, mode: draft.mode, customA: draft.customA };
  saveState(); renderAll(); syncPlanControls();
  showToast(`Your ${sharesFor(state.plan).a} / ${sharesFor(state.plan).m} plan is now active.`);
});

document.querySelector('#goal-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const target = Number(data.get('target'));
  const saved = Math.max(0, Number(data.get('saved')) || 0);
  const error = document.querySelector('#goal-error');
  if (!name) { error.textContent = 'Give this goal a name.'; document.querySelector('#goal-name').focus(); return; }
  if (!Number.isFinite(target) || target < 1000) { error.textContent = 'Enter a target of at least ₹1,000.'; document.querySelector('#goal-target').focus(); return; }
  if (saved > target) { error.textContent = 'Already saved cannot be greater than the target.'; return; }
  state.goals.push({ id: Date.now(), name, target, saved, deadline: data.get('deadline'), rule: data.get('rule'), theme: data.get('theme') });
  saveState(); renderAll();
  form.reset(); form.elements.deadline.value = '2027-03-31'; error.textContent = '';
  document.querySelector('#goal-dialog').close();
  showToast(`${name} is now part of your shared plan.`);
});

document.querySelector('#goal-grid').addEventListener('click', event => {
  const matchButton = event.target.closest('[data-match-goal]');
  if (matchButton) {
    const goal = state.goals.find(item => item.id === Number(matchButton.dataset.matchGoal));
    if (goal) { goal.monthly = Number(matchButton.dataset.monthly); saveState(); renderAll(); showToast(`${goal.name} now matches the required pace.`); }
    return;
  }
  const button = event.target.closest('[data-goal-contribute]');
  if (!button) return;
  const goal = state.goals.find(item => item.id === Number(button.dataset.goalContribute));
  if (!goal) return;
  document.querySelector('#contribution-goal-id').value = goal.id;
  document.querySelector('#contribution-title').textContent = `Add to ${goal.name}`;
  document.querySelector('#contribution-amount').value = 2000;
  updateGoalSplitPreview();
  openDialog('contribution-dialog', button);
});
document.querySelector('#contribution-amount').addEventListener('input', updateGoalSplitPreview);
document.querySelector('#contribution-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const goalId = Number(document.querySelector('#contribution-goal-id').value);
  const amount = Number(document.querySelector('#contribution-amount').value);
  const goal = state.goals.find(item => item.id === goalId);
  const error = document.querySelector('#contribution-error');
  if (!goal || !Number.isFinite(amount) || amount <= 0) { error.textContent = 'Enter an amount greater than ₹0.'; return; }
  goal.saved = Math.min(goal.target, goal.saved + amount);
  saveState(); renderAll(); error.textContent = '';
  document.querySelector('#contribution-dialog').close();
  showToast(`${money.format(amount)} was added to ${goal.name}.`);
});

document.querySelector('#view-settlements').addEventListener('click', event => {
  const button = event.target.closest('#mark-settled'); if (!button) return;
  const summary = settlementSummary(); if (!summary.amount) return;
  state.expenses.forEach(item => { if ((item.status || 'pending') === 'pending') item.status = 'settled'; });
  state.settlementHistory.unshift({ id: Date.now(), from: summary.from, to: summary.to, amount: summary.amount, date: '28 Oct 2026' });
  saveState(); renderAll(); showToast(`${summary.from} and ${summary.to} are settled up.`);
});

const coachAnswers = {
  fair: () => { const s = settlementSummary(); const shares = sharesFor(state.plan); return `Your active agreement is ${shares.a}/${shares.m}. Based on pending shared expenses, ${s.from} owes ${s.to} ${money.format(s.amount)} to bring actual payments back to the agreed split.`; },
  cut: () => { const spent = budgetSpent(); const flexible = (spent.Food || 0) + (spent.Entertainment || 0); return `Food and entertainment total ${money.format(flexible)}. A 10% trim would free ${money.format(Math.round(flexible * .1))} this month without touching rent, bills, or family commitments.`; },
  save: () => { const remaining = state.goals.reduce((sum, goal) => sum + Math.max(0, goal.target - goal.saved), 0); return `Across your active goals, ${money.format(remaining)} remains. A practical starting pace is ${money.format(Math.ceil(remaining / 12))} per month, split using your active fair-share rule.`; },
  goal: () => { const goal = state.goals[0]; if (!goal) return 'Create a shared goal first, and I’ll calculate the required pace.'; const required = Math.ceil((goal.target - goal.saved) / monthsUntil(goal.deadline)); return `${goal.name} is ${Math.round(goal.saved / goal.target * 100)}% complete. Saving about ${money.format(required)} per month keeps the target date realistic.`; }
};
document.querySelectorAll('[data-coach-prompt]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-coach-prompt]').forEach(item => item.classList.toggle('is-selected', item === button));
  document.querySelector('#coach-conversation').innerHTML = `<span class="avatar coach-avatar">P</span><p>${coachAnswers[button.dataset.coachPrompt]()}</p>`;
}));

document.querySelectorAll('[data-setting-split]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-setting-split]').forEach(item => item.classList.toggle('is-selected', item === button));
}));
document.querySelector('#save-settings').addEventListener('click', () => {
  state.profiles.a.name = document.querySelector('#settings-name-a').value.trim() || 'Arjun';
  state.profiles.m.name = document.querySelector('#settings-name-m').value.trim() || 'Mira';
  state.plan.incomeA = Math.max(0, Number(document.querySelector('#settings-income-a').value) || 0);
  state.plan.incomeM = Math.max(0, Number(document.querySelector('#settings-income-m').value) || 0);
  const selected = document.querySelector('[data-setting-split].is-selected'); if (selected) state.plan.mode = selected.dataset.settingSplit;
  ['budget', 'settlement', 'goals', 'digest', 'private'].forEach(key => { state.preferences[key] = document.querySelector(`#pref-${key}`).checked; });
  saveState(); renderAll(); syncPlanControls(); showToast('Your PairPay preferences were saved.');
});
document.querySelector('#reset-demo').addEventListener('click', () => { state = cloneDefaults(); saveState(); renderAll(); syncPlanControls(); showToast('Demo data was restored.'); });
document.querySelector('#clear-data').addEventListener('click', () => {
  state = { ...cloneDefaults(), transactions: [], expenses: [], goals: [], settlementHistory: [] }; saveState(); renderAll(); showToast('Local prototype data was cleared.');
});

function showCheckinStep(step) {
  checkinStep = clamp(step, 1, 4);
  document.querySelectorAll('[data-checkin-step]').forEach(panel => { panel.hidden = Number(panel.dataset.checkinStep) !== checkinStep; });
  document.querySelectorAll('[data-step-indicator]').forEach(item => {
    const itemStep = Number(item.dataset.stepIndicator);
    item.classList.toggle('is-active', itemStep === checkinStep);
    item.classList.toggle('is-complete', itemStep < checkinStep);
  });
}
document.querySelectorAll('.feeling').forEach(button => button.addEventListener('click', () => {
  selectedFeeling = button.dataset.feeling;
  document.querySelectorAll('.feeling').forEach(item => item.classList.toggle('is-selected', item === button));
  syncChoiceState('.feeling', button, 'aria-checked');
  document.querySelector('[data-checkin-step="1"] [data-checkin-next]').disabled = false;
}));
document.querySelectorAll('[data-checkin-next]').forEach(button => button.addEventListener('click', () => {
  showCheckinStep(checkinStep + 1);
}));
document.querySelectorAll('[data-checkin-back]').forEach(button => button.addEventListener('click', () => showCheckinStep(checkinStep - 1)));
document.querySelectorAll('.next-plan').forEach(button => button.addEventListener('click', () => {
  selectedNextPlan = button.dataset.nextPlan;
  document.querySelectorAll('.next-plan').forEach(item => item.classList.toggle('is-selected', item === button));
  syncChoiceState('.next-plan', button, 'aria-checked');
}));
document.querySelector('#finish-checkin').addEventListener('click', () => {
  if (selectedNextPlan === 'increase') {
    state.plan.total += 8000;
  }
  state.checkinCompleted = true; saveState();
  const destination = selectedNextPlan === 'review' ? 'plan' : 'home';
  showView(destination);
  showCheckinStep(1);
  showToast('October check-in complete. November is ready.');
});

const quickFab = document.querySelector('#quick-fab');
const quickDockPanel = document.querySelector('#quick-dock-panel');
function toggleQuickDock(force) {
  const shouldOpen = typeof force === 'boolean' ? force : quickDockPanel.hidden;
  quickDockPanel.hidden = !shouldOpen;
  quickFab.setAttribute('aria-expanded', String(shouldOpen));
  quickFab.setAttribute('aria-label', shouldOpen ? 'Close quick add' : 'Open quick add');
  document.querySelector('#quick-dock').classList.toggle('is-open', shouldOpen);
  if (shouldOpen) requestAnimationFrame(() => quickDockPanel.querySelector('button')?.focus());
}
quickFab.addEventListener('click', () => toggleQuickDock());
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); toggleQuickDock(); }
  if (event.key === 'Escape' && !quickDockPanel.hidden) { toggleQuickDock(false); quickFab.focus(); }
});
document.addEventListener('click', event => {
  if (!quickDockPanel.hidden && !event.target.closest('#quick-dock')) toggleQuickDock(false);
});
document.querySelectorAll('[data-quick-action]').forEach(button => button.addEventListener('click', () => {
  const action = button.dataset.quickAction;
  toggleQuickDock(false);
  if (action === 'transaction') {
    const form = document.querySelector('#transaction-form'); form.reset(); form.elements.editId.value = ''; form.elements.date.value = '2026-10-28'; document.querySelector('#transaction-dialog-title').textContent = 'Add a transaction';
    openDialog('transaction-dialog', quickFab);
  }
  if (action === 'expense') openDialog('expense-dialog', quickFab);
  if (action === 'budget') openDialog('budget-dialog', quickFab);
  if (action === 'goal') openDialog('goal-dialog', quickFab);
}));

document.querySelector('#month-button').addEventListener('click', () => showToast('October is the active prototype month.'));
document.querySelector('#insight-button').addEventListener('click', () => showToast('At this pace, Goa can be fully funded by 14 December.'));

document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { lastDialogTrigger?.focus?.(); lastDialogTrigger = null; });
});

renderAll();
syncPlanControls();
showCheckinStep(1);
