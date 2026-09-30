/* =========================================================
   Sankalpa — personal life planner
   Part 1: utilities, state, rewards, badges, reminder schedule
   ========================================================= */
'use strict';

// ---------- utilities ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayIdx = d => (d.getDay() + 6) % 7; // Mon = 0
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function parseDate(s) {
  if (!s) return null;
  if (s.length === 10) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 23, 59); }
  const d = new Date(s); return isNaN(d) ? null : d;
}
function fmtDate(s) {
  const d = parseDate(s); if (!d) return '';
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  let out = d.toLocaleDateString(undefined, opts);
  if (s.length > 10) out += ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return out;
}
// Countdown label + urgency class for a deadline
function countdown(s) {
  const d = parseDate(s); if (!d) return null;
  const ms = d - Date.now(), min = Math.round(ms / 60000), abs = Math.abs(min);
  let txt;
  if (abs < 60) txt = `${abs} min`;
  else if (abs < 1440) txt = `${Math.round(abs / 60)} h`;
  else txt = `${Math.round(abs / 1440)} day${Math.round(abs / 1440) === 1 ? '' : 's'}`;
  if (ms < 0) return { txt: `Overdue ${txt}`, cls: 'due-over' };
  if (ms < 864e5) return { txt: `${txt} left`, cls: 'due-soon' };
  if (ms < 7 * 864e5) return { txt: `${txt} left`, cls: 'due-week' };
  return { txt: `${txt} left`, cls: 'due-ok' };
}
function dueBadge(s) {
  const c = countdown(s); if (!c) return '';
  return `<span class="due ${c.cls}" title="${esc(fmtDate(s))}">${c.txt}</span>`;
}
// soft colour derived from any text (used for timetable subjects)
function softColor(text) {
  let h = 0; for (const ch of String(text).toLowerCase().trim()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 70% 88%)`;
}

// ---------- defaults ----------
const AREAS_DEFAULT = [
  { id: 'mind', name: 'Mind & Growth', emoji: '🧠', color: '#B9A7F0' },
  { id: 'body', name: 'Body & Health', emoji: '💪', color: '#8FD6BD' },
  { id: 'balance', name: 'Stress & Balance', emoji: '🌿', color: '#B7DC9B' },
  { id: 'work', name: 'Work & Projects', emoji: '🚀', color: '#9EC6F0' },
  { id: 'connect', name: 'Connections', emoji: '🤝', color: '#F3AFC6' },
  { id: 'money', name: 'Money', emoji: '💰', color: '#F2D58A' },
  { id: 'home', name: 'Home & Errands', emoji: '🏠', color: '#FBC1A2' },
];

const EXTRA_ACTIVITIES = [
  { id: 'a_sleep', name: 'Extra sleep / nap', emoji: '😴' },
  { id: 'a_gossip', name: 'Gossip & chit-chat', emoji: '💬' },
  { id: 'a_shop', name: 'Shopping browse', emoji: '🛍️' },
  { id: 'a_treat', name: 'Treat time', emoji: '🍫' },
];
const MORE_ACTIVITIES = [
  { id: 'a_movie', name: 'Movie / web series night', emoji: '🍿' },
  { id: 'a_cafe', name: 'Café or outing', emoji: '☕' },
  { id: 'a_call', name: 'Long call with friends', emoji: '📞' },
  { id: 'a_music', name: 'Music & dance', emoji: '💃' },
  { id: 'a_novel', name: 'Fun reading / novel', emoji: '📚' },
  { id: 'a_pamper', name: 'Self-pamper', emoji: '💅' },
  { id: 'a_idle', name: 'Lazy day / do-nothing time', emoji: '🛋️' },
];
const EXP_CATS = [
  { id: 'e_food', name: 'Food & groceries', emoji: '🍲', budget: '' }, { id: 'e_rent', name: 'Rent & bills', emoji: '🏠', budget: '' },
  { id: 'e_travel', name: 'Travel', emoji: '🛺', budget: '' }, { id: 'e_shop', name: 'Shopping', emoji: '🛍️', budget: '' },
  { id: 'e_study', name: 'Study & books', emoji: '📚', budget: '' }, { id: 'e_health', name: 'Health', emoji: '💊', budget: '' },
  { id: 'e_subs', name: 'Subscriptions', emoji: '📱', budget: '' }, { id: 'e_family', name: 'Family & gifts', emoji: '🎁', budget: '' },
  { id: 'e_content', name: 'Content & startup', emoji: '🎬', budget: '' }, { id: 'e_other', name: 'Other', emoji: '✨', budget: '' },
];
const INC_CATS = [
  { id: 'i_stipend', name: 'Stipend / salary', emoji: '🎓' }, { id: 'i_yt', name: 'YouTube', emoji: '▶️' },
  { id: 'i_brand', name: 'Instagram & brand deals', emoji: '📸' }, { id: 'i_startup', name: 'Startup', emoji: '🚀' },
  { id: 'i_tutor', name: 'Teaching / tutoring', emoji: '🧑‍🏫' }, { id: 'i_gift', name: 'Gifts', emoji: '💝' }, { id: 'i_other', name: 'Other', emoji: '✨' },
];
const NOTIFY_TYPES = [
  ['tasks', '✅ Task deadlines & reminders'], ['goals', '🎯 Goal deadlines'], ['study', '📚 Study timetable'], ['plan', '🗓️ Content plan for today'],
  ['content', '🎬 Content posting deadlines'], ['spaces', '🪷 Spaces (spiritual routine etc.)'], ['routines', '☀️ Daily routine reminders'],
  ['water', '💧 Water breaks'], ['lists', '🛒 To-do list items'], ['links', '🔗 Watch-later dates'], ['period', '🌸 Period coming up'], ['money', '💰 Savings goal deadlines'],
  ['briefing', '☀️ Morning briefing'], ['evening', '🌙 Evening review'], ['festivals', '🪔 Festivals & vrat'], ['review', '📝 Weekly review'], ['planner', '🗓️ Day-planner blocks'],
];
// how many reward minutes each action earns (each person can change these)
const EARN_TYPES = [
  ['low', '✅ Task — low priority', 10], ['med', '✅ Task — medium priority', 20], ['high', '✅ Task — high priority', 30],
  ['goal', '🎯 Complete a goal', 15], ['post', '🎬 Publish content', 20], ['plan', '🗓️ Tick a content-plan cell', 5],
  ['habit', '🌿 Daily habit', 5], ['space', '🪷 Space item (sadhana etc.)', 3], ['water', '💧 Hit water goal', 10],
  ['workout', '🏃 Workout', 10], ['sleep', '😴 Log sleep', 5], ['list', '🛒 To-do item', 2], ['learn', '🎓 Finish a lecture/article', 3],
  ['bucket', '🌈 Bucket-list dream', 30], ['vrat', '🪔 Keep a vrat', 10], ['review', '📝 Weekly review', 15], ['intention', '🪷 Set today\'s Sankalpa', 2],
];
const ER = k => { const v = S.settings.earn && S.settings.earn[k]; return v === '' || v == null ? (EARN_TYPES.find(e => e[0] === k) || [0, 0, 0])[2] : +v; };
const PLATFORMS_DEFAULT = [
  { id: 'p_yt', name: 'YouTube', emoji: '▶️' }, { id: 'p_ig1', name: 'Instagram 1', emoji: '📸' }, { id: 'p_ig2', name: 'Instagram 2', emoji: '🌸' },
  { id: 'p_ig3', name: 'Instagram 3', emoji: '💫' }, { id: 'p_tg', name: 'Telegram', emoji: '✈️' }, { id: 'p_wa', name: 'WhatsApp channel', emoji: '🟢' },
  { id: 'p_blog', name: 'Blog', emoji: '✍️' }, { id: 'p_li', name: 'LinkedIn', emoji: '💼' }, { id: 'p_other', name: 'Other', emoji: '🌐' },
];
const VENTURES_DEFAULT = [{ id: 'v1', name: 'My startup', emoji: '🚀' }, { id: 'v2', name: 'Startup 2', emoji: '🌱' }];
function SPACES_DEFAULT() {
  return [
    { id: 'sp_spirit', name: 'Spirituality', emoji: '🙏', color: '#E3D6F8', pinned: true, items: [
      { id: 'si1', name: 'Morning prayer', type: 'check', freq: 'daily', time: '' },
      { id: 'si2', name: 'Read scripture', type: 'count', target: 10, unit: 'pages', freq: 'daily', time: '' },
      { id: 'si3', name: 'Meditation', type: 'count', target: 15, unit: 'min', freq: 'daily', time: '' },
      { id: 'si4', name: 'Gratitude journal', type: 'check', freq: 'daily', time: '' },
      { id: 'si5', name: 'Temple / satsang', type: 'check', freq: 'weekly', time: '' }] },
    { id: 'sp_self', name: 'Self-care', emoji: '💆‍♀️', color: '#F8D5E5', pinned: false, items: [
      { id: 'si6', name: 'Night skincare', type: 'check', freq: 'daily', time: '' },
      { id: 'si7', name: 'Hair oiling', type: 'check', freq: 'weekly', time: '' },
      { id: 'si8', name: 'Screen-free hour', type: 'check', freq: 'daily', time: '' }] },
    { id: 'sp_hobby', name: 'Hobbies', emoji: '🎨', color: '#FADCCB', pinned: false, items: [
      { id: 'si9', name: 'Sketch or paint', type: 'count', target: 3, unit: 'times', freq: 'weekly', time: '' },
      { id: 'si10', name: 'Music practice', type: 'count', target: 60, unit: 'min', freq: 'weekly', time: '' }] },
  ];
}
// week starts Monday
// festival / vrat on a given day (yearly ones repeat on the same date)
function festOn(f, k) { return f.date === k || (f.repeat === 'yearly' && f.date && f.date.slice(5) === k.slice(5) && f.date <= k); }
const weekKey = (d = new Date()) => dkey(addDays(d, -dayIdx(d)));
const isStar = x => !!x && x.star === weekKey();
function periodKey(freq, dayK = dkey()) {
  if (freq === 'daily') return dayK;
  const [y, m, d] = dayK.split('-').map(Number), date = new Date(y, m - 1, d);
  if (freq === 'weekly') return 'w' + weekKey(date);
  if (freq === 'monthly') return 'm' + dayK.slice(0, 7);
  return 'once';
}
const spaceVal = (item, dayK) => ((S.spaceLog[periodKey(item.freq, dayK)] || {})[item.id]) || 0;
const itemDone = (item, dayK = dkey()) => item.type === 'count' ? spaceVal(item, dayK) >= (+item.target || 1) : !!spaceVal(item, dayK);

function slotsDefault() { const s = []; for (let h = 6; h < 23; h++) s.push(`${pad(h)}:00–${pad(h + 1)}:00`); return s; }

function defaultState() {
  return {
    v: 1, updatedAt: 0,
    areas: AREAS_DEFAULT.map(a => ({ ...a })),
    goals: [], tasks: [],
    habits: [
      { id: 'h_spirit', name: 'Prayer / spiritual time', emoji: '🙏', areaId: 'balance' },
      { id: 'h_study', name: 'Study session', emoji: '📚', areaId: 'mind' },
      { id: 'h_read', name: 'Read 20 pages', emoji: '📖', areaId: 'mind' },
      { id: 'h_relax', name: 'Relax / breathe', emoji: '🧘', areaId: 'balance' },
      { id: 'h_hobby', name: 'Hobby time', emoji: '🎨', areaId: 'balance' },
    ],
    logs: {},
    period: { starts: [], periodLen: 5 },
    weights: [], // {d, kg}
    rewards: {
      balance: 30, history: [], running: null,
      activities: [
        { id: 'a_insta', name: 'Instagram scrolling', emoji: '📱' },
        { id: 'a_series', name: 'Series / YouTube', emoji: '🎬' },
        { id: 'a_game', name: 'Gaming', emoji: '🎮' },
        ...EXTRA_ACTIVITIES, ...MORE_ACTIVITIES,
      ],
    },
    xp: 0, badges: {},
    stats: { tasksDone: 0, postsDone: 0, habitTicks: 0, listItems: 0 },
    lists: [
      { id: 'l_groc', name: 'Groceries', emoji: '🛒', items: [] },
      { id: 'l_meal', name: 'Meal prep', emoji: '🍳', items: [] },
      { id: 'l_err', name: 'Errands', emoji: '📦', items: [] },
    ],
    timetables: [
      { id: 'tt1', name: 'Regular week', type: 'weekly', days: [...DAYS], slots: slotsDefault(), cells: {}, remind: false },
      { id: 'tt2', name: 'Monthly plan', type: 'monthly', month: dkey().slice(0, 7), cols: ['Morning', 'Afternoon', 'Evening'], cells: {}, remind: false, remindTime: '07:30' },
    ],
    activeTT: 'tt1',
    content: [], ideas: [], bucket: [], savings: [], people: [], links: [],
    platforms: PLATFORMS_DEFAULT.map(x => ({ ...x })), ventures: VENTURES_DEFAULT.map(x => ({ ...x })),
    spaces: SPACES_DEFAULT(), spaceLog: {},
    phase: { name: '', emoji: '🌷', until: '', note: '' }, hidden: [], v2: true,
    money: { tx: [], expenseCats: EXP_CATS.map(x => ({ ...x })), incomeCats: INC_CATS.map(x => ({ ...x })) },
    contentPlan: { cells: {}, goals: {} }, v3: true,
    fest: [], reviews: {}, intentions: {}, v4: true, onboarded: false,
    settings: {
      name: '', currency: '₹', waterGoal: 8, sleepGoal: 8, weightGoal: '',
      remindBefore: [1440, 60],
      notify: Object.fromEntries(NOTIFY_TYPES.map(n => [n[0], true])),
      earn: Object.fromEntries(EARN_TYPES.map(e => [e[0], e[2]])),
      briefing: { morning: '07:00', evening: '21:30', reviewDay: 6, reviewTime: '19:00' },
      quiet: { on: true, from: '23:00', to: '07:00' },
      water: { on: true, from: '09:00', to: '21:00', every: 2 },
      routines: [
        { id: 'r_gym', label: '🏃 Workout time', time: '18:00', days: [0, 1, 2, 3, 4, 5] },
        { id: 'r_sleep', label: '😴 Wind down for sleep', time: '22:45', days: [0, 1, 2, 3, 4, 5, 6] },
      ],
    },
  };
}

// fill any keys missing from older saved data
function migrate(s) {
  const d = defaultState();
  if (!s || typeof s !== 'object') return d;
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  for (const k of Object.keys(d.settings)) if (s.settings[k] === undefined) s.settings[k] = d.settings[k];
  for (const k of Object.keys(d.rewards)) if (s.rewards[k] === undefined) s.rewards[k] = d.rewards[k];
  for (const k of Object.keys(d.stats)) if (s.stats[k] === undefined) s.stats[k] = d.stats[k];
  if (!s.v2) {
    s.platforms = s.platforms || PLATFORMS_DEFAULT.map(x => ({ ...x }));
    s.ventures = s.ventures || VENTURES_DEFAULT.map(x => ({ ...x }));
    s.spaces = s.spaces || SPACES_DEFAULT(); s.spaceLog = s.spaceLog || {};
    s.phase = s.phase || { name: '', emoji: '🌷', until: '', note: '' }; s.hidden = s.hidden || [];
    for (const a of EXTRA_ACTIVITIES) if (!s.rewards.activities.some(x => x.name === a.name)) s.rewards.activities.push({ ...a });
    (s.content || []).forEach(c => { if (c.platform === 'Instagram') c.platform = 'Instagram 1'; });
    s.v2 = true;
  }
  if (!s.v3) {
    s.money = s.money || { tx: [], expenseCats: EXP_CATS.map(x => ({ ...x })), incomeCats: INC_CATS.map(x => ({ ...x })) };
    s.contentPlan = s.contentPlan || { cells: {}, goals: {} };
    for (const a of MORE_ACTIVITIES) if (!s.rewards.activities.some(x => x.name === a.name)) s.rewards.activities.push({ ...a });
    s.hidden = (s.hidden || []).filter(h => h !== 'people');
    s.v3 = true;
  }
  if (!s.v4) {
    s.fest = s.fest || []; s.reviews = s.reviews || {}; s.intentions = s.intentions || {};
    s.settings.routines = (s.settings.routines || []).filter(r => r.id !== 'r_plan' && r.id !== 'r_review'); // replaced by morning / evening briefings
    s.rewards.activities.forEach(a => { if (a.id === 'a_idle') { a.name = 'Lazy day / do-nothing time'; a.emoji = '🛋️'; } });
    s.onboarded = s.onboarded || !!s.updatedAt; // existing users skip the welcome screen
    s.v4 = true;
  }
  s.settings.earn = { ...Object.fromEntries(EARN_TYPES.map(e => [e[0], e[2]])), ...(s.settings.earn || {}) };
  s.settings.briefing = { morning: '07:00', evening: '21:30', reviewDay: 6, reviewTime: '19:00', ...(s.settings.briefing || {}) };
  s.settings.notify = { ...Object.fromEntries(NOTIFY_TYPES.map(n => [n[0], true])), ...(s.settings.notify || {}) };
  s.timetables.forEach(t => { if (!t.type) t.type = 'weekly'; if (t.type === 'monthly') { t.cols = t.cols || ['Morning', 'Afternoon', 'Evening']; t.month = t.month || dkey().slice(0, 7); } });
  return s;
}

// ---------- state & persistence ----------
// Cloud settings come from config.js (same for every device) or, as a fallback, from Settings.
function readCloudConfig() {
  const c = window.BLOOM_CONFIG;
  if (c && c.firebase && c.firebase.apiKey && !/PASTE/i.test(c.firebase.apiKey)) return { config: c.firebase, vapid: c.vapid && !/PASTE/i.test(c.vapid) ? c.vapid : '', fromFile: true };
  try { return JSON.parse(localStorage.getItem('bloom_cloud')); } catch { return null; }
}
const CLOUD_CFG = readCloudConfig();
const LEGACY_KEY = 'bloom_state_v1';
let STORE_KEY = LEGACY_KEY;
// When cloud sync is set up, nothing is shown until someone signs in, and each Google account gets its own data.
let LOCKED = !!CLOUD_CFG;
function loadStore(key) { try { const raw = localStorage.getItem(key); return raw ? migrate(JSON.parse(raw)) : null; } catch { return null; } }
let S = LOCKED ? defaultState() : (loadStore(LEGACY_KEY) || defaultState());

let saveTimer = null;
function save(opts = {}) {
  if (LOCKED) { if (!opts.silent) render(); return; }
  S.updatedAt = Date.now();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { console.warn(e); }
  if (!opts.silent) render();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { Cloud.push(); }, 1200);
}
function saveLocalOnly() { if (LOCKED) return; try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { } }

const areaOf = id => S.areas.find(a => a.id === id) || { name: 'General', emoji: '•', color: '#D9D4EA' };
function todayLog(key = dkey()) {
  if (!S.logs[key]) S.logs[key] = { water: 0, habits: {}, exercise: [], diet: { good: 0, ok: 0, junk: 0 }, mood: null, sleep: null };
  return S.logs[key];
}

// ---------- rewards, XP, levels ----------
function levelOf(xp) { return Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2); }
function xpForLevel(l) { return 50 * l * (l - 1); }

function earn(min, xp, reason, quiet) {
  S.rewards.balance = Math.round((S.rewards.balance + min) * 10) / 10;
  const before = levelOf(S.xp);
  S.xp += xp;
  S.rewards.history.unshift({ t: Date.now(), d: min, r: reason });
  S.rewards.history = S.rewards.history.slice(0, 150);
  if (!quiet) toast(`+${min} min earned  ·  +${xp} XP`, '✨');
  const after = levelOf(S.xp);
  if (after > before) setTimeout(() => celebrate(`Level ${after}!`, 'You levelled up. Keep blooming.'), 400);
  checkBadges();
}
function unearn(min, xp, reason) {
  S.rewards.balance = Math.max(0, Math.round((S.rewards.balance - min) * 10) / 10);
  S.xp = Math.max(0, S.xp - xp);
  S.rewards.history.unshift({ t: Date.now(), d: -min, r: reason });
}

// ---------- daily score & streaks ----------
function dayItems(key) {
  const L = S.logs[key] || {};
  const items = [];
  S.habits.forEach(h => items.push({ id: 'h:' + h.id, label: h.name, emoji: h.emoji, color: areaOf(h.areaId).color, done: !!(L.habits && L.habits[h.id]) }));
  items.push({ id: 'water', label: 'Water goal', emoji: '💧', color: '#9EC6F0', done: (L.water || 0) >= S.settings.waterGoal });
  items.push({ id: 'exercise', label: 'Move your body', emoji: '🏃', color: '#8FD6BD', done: (L.exercise || []).length > 0 });
  items.push({ id: 'sleep', label: 'Sleep logged', emoji: '😴', color: '#B9A7F0', done: !!L.sleep });
  S.spaces.filter(sp => sp.pinned).forEach(sp => sp.items.filter(i => i.freq === 'daily').forEach(i =>
    items.push({ id: 's:' + i.id, label: i.name, emoji: sp.emoji, color: sp.color || '#E3D6F8', done: itemDone(i, key) })));
  S.tasks.filter(t => t.deadline && t.deadline.slice(0, 10) === key).forEach(t =>
    items.push({ id: 't:' + t.id, label: t.title, emoji: '✔️', color: areaOf(t.areaId).color, done: !!t.done }));
  return items;
}
function dayScore(key) {
  const it = dayItems(key); if (!it.length) return 0;
  return it.filter(i => i.done).length / it.length;
}
function streak(test) {
  let n = 0, d = new Date();
  if (!test(dkey(d))) d = addDays(d, -1); // today still in progress
  while (test(dkey(d)) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}
const dayStreak = () => streak(k => S.logs[k] && dayScore(k) >= 0.6);
const waterStreak = () => streak(k => (S.logs[k]?.water || 0) >= S.settings.waterGoal);

// ---------- badges ----------
const BADGES = [
  { id: 'task1', e: '🌱', n: 'First step', d: 'Complete your first task', t: () => S.stats.tasksDone >= 1 },
  { id: 'task10', e: '🌿', n: 'Getting going', d: 'Complete 10 tasks', t: () => S.stats.tasksDone >= 10 },
  { id: 'task50', e: '🌳', n: 'Deep roots', d: 'Complete 50 tasks', t: () => S.stats.tasksDone >= 50 },
  { id: 'task200', e: '🏔️', n: 'Mountain mover', d: 'Complete 200 tasks', t: () => S.stats.tasksDone >= 200 },
  { id: 'streak3', e: '🔥', n: 'Warming up', d: '3-day streak (60%+ of your day done)', t: () => dayStreak() >= 3 },
  { id: 'streak7', e: '🌟', n: 'One good week', d: '7-day streak', t: () => dayStreak() >= 7 },
  { id: 'streak30', e: '👑', n: 'Unstoppable', d: '30-day streak', t: () => dayStreak() >= 30 },
  { id: 'water7', e: '💧', n: 'Hydrated', d: 'Hit your water goal 7 days in a row', t: () => waterStreak() >= 7 },
  { id: 'post1', e: '🎬', n: 'Creator', d: 'Publish your first post or video', t: () => S.stats.postsDone >= 1 },
  { id: 'post10', e: '📣', n: 'Consistent creator', d: 'Publish 10 posts or videos', t: () => S.stats.postsDone >= 10 },
  { id: 'idea10', e: '💡', n: 'Idea machine', d: 'Capture 10 startup ideas', t: () => S.ideas.length >= 10 },
  { id: 'bucket1', e: '🌈', n: 'Dream achieved', d: 'Tick off a bucket-list item', t: () => S.bucket.some(b => b.done) },
  { id: 'saver', e: '🐷', n: 'Saver', d: 'Complete a savings goal', t: () => S.savings.some(s => +s.saved >= +s.target && +s.target > 0) },
  { id: 'lvl5', e: '🎖️', n: 'Level 5', d: 'Reach level 5', t: () => levelOf(S.xp) >= 5 },
  { id: 'lvl10', e: '🏆', n: 'Level 10', d: 'Reach level 10', t: () => levelOf(S.xp) >= 10 },
];
function checkBadges() {
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.t()) {
      S.badges[b.id] = Date.now();
      setTimeout(() => celebrate(`${b.e} ${b.n}`, `Badge unlocked: ${b.d}.`), 700);
    }
  }
}

// ---------- period prediction ----------
function periodInfo() {
  const st = [...S.period.starts].sort();
  if (!st.length) return null;
  const diffs = [];
  for (let i = 1; i < st.length; i++) {
    const g = Math.round((new Date(st[i]) - new Date(st[i - 1])) / 864e5);
    if (g >= 18 && g <= 45) diffs.push(g);
  }
  const recent = diffs.slice(-6);
  const cycle = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 28;
  const last = st[st.length - 1];
  const [y, m, d] = last.split('-').map(Number);
  let next = new Date(y, m - 1, d + cycle);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  while (next < addDays(today, -S.period.periodLen)) next = addDays(next, cycle);
  const daysUntil = Math.round((next - today) / 864e5);
  return { cycle, last, next, daysUntil, logged: st.length };
}

// ---------- reminder schedule (read by the push sender) ----------
function toMin(hhmm) { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return h * 60 + (m || 0); }
function inQuiet(date) {
  const q = S.settings.quiet; if (!q.on) return false;
  const m = date.getHours() * 60 + date.getMinutes(), f = toMin(q.from), t = toMin(q.to);
  return f > t ? (m >= f || m < t) : (m >= f && m < t);
}
function shiftOutOfQuiet(date) {
  const q = S.settings.quiet, t = toMin(q.to), f = toMin(q.from);
  const d = new Date(date), m = d.getHours() * 60 + d.getMinutes();
  if (f > t && m >= f) d.setDate(d.getDate() + 1);
  d.setHours(Math.floor(t / 60), t % 60, 0, 0);
  return d;
}
function atTime(day, hhmm) { const d = new Date(day); const m = toMin(hhmm); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; }
const BEFORE_OPTS = [[10080, '1 week'], [1440, '1 day'], [180, '3 hours'], [60, '1 hour'], [15, '15 minutes']];
const beforeLabel = m => (BEFORE_OPTS.find(o => o[0] === m) || [m, `${m} min`])[1];

function buildEvents() {
  const now = Date.now(), horizon = now + 30 * 864e5, ev = [];
  // shift: move out of quiet hours; 'exact': a time you chose yourself always rings
  const TYPE = { t: 'tasks', tr: 'tasks', g: 'goals', c: 'content', cp: 'plan', pe: 'period', l: 'links', li: 'lists', tt: 'study', tm: 'study', sp: 'spaces', r: 'routines', w: 'water', sv: 'money', p: 'off', fe: 'festivals', mb: 'briefing', eb: 'evening', wr: 'review', pb: 'planner' };
  const add = (id, date, title, body, shift = true) => {
    const type = TYPE[id.split(':')[0]];
    if (type === 'off' || (type && S.settings.notify[type] === false)) return;
    if (!date || isNaN(date)) return;
    let d = new Date(date);
    if (shift !== 'exact' && inQuiet(d)) { if (!shift) return; d = shiftOutOfQuiet(d); }
    const at = d.getTime();
    if (at < now - 2 * 3600e3 || at > horizon) return;
    ev.push({ id, at, title, body: body || '' });
  };
  // tasks
  for (const t of S.tasks) {
    if (t.done) continue;
    const dl = parseDate(t.deadline);
    if (dl) {
      for (const o of (t.remindBefore || S.settings.remindBefore)) {
        add(`t:${t.id}:${t.deadline}:${o}`, new Date(dl - o * 60000), `⏰ ${t.title}`, `Due in ${beforeLabel(o)} · ${areaOf(t.areaId).name}`);
      }
      add(`t:${t.id}:${t.deadline}:due`, dl, `⏰ Due now: ${t.title}`, 'Tick it off to earn your reward minutes');
    }
    if (t.remindAt) add(`tr:${t.id}:${t.remindAt}`, parseDate(t.remindAt), `🔔 ${t.title}`, t.notes ? t.notes.slice(0, 80) : 'Reminder', 'exact');
  }
  // goals
  for (const g of S.goals) {
    if (g.done || !g.deadline) continue;
    const dl = parseDate(g.deadline);
    add(`g:${g.id}:${g.deadline}:3d`, atTime(addDays(dl, -3), '10:00'), `🎯 Goal in 3 days: ${g.title}`, 'Check how close you are');
    add(`g:${g.id}:${g.deadline}:1d`, atTime(addDays(dl, -1), '10:00'), `🎯 Goal due tomorrow: ${g.title}`, '');
  }
  // content
  for (const c of S.content) {
    if (c.stage === 'Posted' || !c.deadline) continue;
    const dl = parseDate(c.deadline);
    add(`c:${c.id}:${c.deadline}:1d`, atTime(addDays(dl, -1), '11:00'), `🎬 ${c.platform} post due tomorrow`, `${c.title} — currently at "${c.stage}"`);
    add(`c:${c.id}:${c.deadline}:0d`, atTime(dl, '09:00'), `🎬 ${c.platform} post due today`, c.title);
  }
  // period
  const pi = periodInfo();
  if (pi && pi.daysUntil >= 2) add(`pe:${dkey(pi.next)}`, atTime(addDays(pi.next, -2), '09:00'), '🌸 Period expected in 2 days', 'Keep pads, water and some rest time ready');
  // content plan: what's planned for each platform today
  for (let i = 0; i < 7; i++) {
    const day = addDays(new Date(), i), k = dkey(day);
    const cells = S.platforms.map(p => [p, S.contentPlan.cells[`d:${k}|${p.id}`]]).filter(([, c]) => c && c.text && !c.done);
    if (cells.length) add(`cp:${k}:${cells.map(([p]) => p.id).join('')}`, atTime(day, '10:00'), `🗓️ Content today: ${cells.length} planned`, cells.map(([p, c]) => `${p.emoji} ${c.text}`).join(' · ').slice(0, 180));
  }
  // savings goal deadlines
  for (const sv of S.savings) if (sv.deadline && +sv.saved < +sv.target) add(`sv:${sv.id}:${sv.deadline}`, atTime(addDays(parseDate(sv.deadline), -7), '10:00'), `💰 ${sv.name}: 1 week left`, `${S.settings.currency}${(+sv.target - +sv.saved).toLocaleString()} still to go`);
  // to-do list items with a due date
  for (const l of S.lists) for (const it of l.items) {
    if (it.done || !it.due) continue;
    const at = it.due.length === 10 ? atTime(parseDate(it.due), '09:00') : parseDate(it.due);
    add(`li:${it.id}:${it.due}`, at, `${l.emoji} ${it.text}`, `Due ${fmtDate(it.due)} · ${l.name}`);
  }
  // watch-later links with a "watch by" date
  for (const l of S.links) if (!l.done && l.by) add(`l:${l.id}:${l.by}`, atTime(parseDate(l.by), '19:00'), `🔗 Watch: ${l.title}`, 'From your watch-later list');
  // daily routines + water
  const st = S.settings;
  for (let i = 0; i < 30; i++) {
    const day = addDays(new Date(), i), k = dkey(day), di = dayIdx(day);
    // morning briefing & evening review
    const bf = st.briefing || {};
    if (bf.morning) {
      const due = S.tasks.filter(t => !t.done && t.deadline && t.deadline.slice(0, 10) === k).length;
      const planned = S.tasks.filter(t => !t.done && t.plan && t.plan.date === k).length;
      const focus = S.goals.filter(g => g.focus && !g.done).map(g => g.title).join(' & ');
      const fest = S.fest.filter(f => festOn(f, k)).map(f => f.name).join(', ');
      add(`mb:${k}`, atTime(day, bf.morning), '☀️ Good morning — set your Sankalpa', [fest && `🪔 ${fest}`, due && `${due} due today`, planned && `${planned} planned`, focus && `Focus: ${focus}`].filter(Boolean).join(' · ') || 'What is your intention for today?', 'exact');
    }
    if (bf.evening) add(`eb:${k}`, atTime(day, bf.evening), '🌙 Evening review', 'Tick off your day and note one thing you are grateful for', 'exact');
    if (di === (+bf.reviewDay || 6) && bf.reviewTime) add(`wr:${k}`, atTime(day, bf.reviewTime), '📝 Weekly review', 'Look back on your week and choose next week\'s priorities', 'exact');
    // festivals & vrat
    for (const f of S.fest) if (festOn(f, k)) {
      add(`fe:${f.id}:${k}:0`, atTime(day, '06:30'), `🪔 Today: ${f.name}`, f.note || (f.type === 'vrat' ? 'Vrat today' : 'Festival today'), 'exact');
    } else if (festOn(f, dkey(addDays(day, 1)))) add(`fe:${f.id}:${k}:1`, atTime(day, '19:00'), `🪔 Tomorrow: ${f.name}`, f.note || 'Get ready', 'exact');
    // day-planner blocks
    for (const t of S.tasks) if (!t.done && t.plan && t.plan.date === k && t.plan.start) add(`pb:${t.id}:${k}:${t.plan.start}`, atTime(day, t.plan.start), `🗓️ Now: ${t.title}`, `${t.plan.dur || 60} min block`, 'exact');
    // study timetable reminders
    for (const tt of S.timetables) {
      if (!tt.remind) continue;
      if (tt.type === 'monthly') {
        const parts = (tt.cols || []).map((cn, ci) => { const c = tt.cells[`${k},${ci}`]; return c && c.text ? `${cn}: ${c.text}` : null; }).filter(Boolean);
        if (parts.length) add(`tm:${tt.id}:${k}:${parts.join('|')}`.slice(0, 140), atTime(day, tt.remindTime || '07:30'), '📚 Today\'s study plan', parts.join(' · ').slice(0, 180), 'exact');
      } else {
        const col = tt.days.findIndex(dn => dn.slice(0, 3).toLowerCase() === DAYS[di].toLowerCase());
        if (col < 0) continue;
        tt.slots.forEach((sl, r) => {
          const c = tt.cells[`${r},${col}`], m = slotStart(sl);
          if (c && c.text && m >= 0) add(`tt:${tt.id}:${k}:${r}:${c.text}`.slice(0, 140), atTime(day, `${pad(Math.floor(m / 60))}:${pad(m % 60)}`), `📚 Study time: ${c.text}`, `${sl} · ${tt.name}`, 'exact');
        });
      }
    }
    for (const sp of S.spaces) for (const it of sp.items) {
      if (!it.time) continue;
      if (it.freq === 'daily' || (it.freq === 'weekly' && di === (+it.day || 0))) add(`sp:${it.id}:${k}:${it.time}`, atTime(day, it.time), `${sp.emoji} ${it.name}`, `${sp.name}${it.type === 'count' ? ` · goal ${it.target} ${it.unit || ''}` : ''}`, 'exact');
    }
    for (const r of st.routines) if (r.days.includes(di)) add(`r:${r.id}:${k}:${r.time}`, atTime(day, r.time), r.label, '', 'exact');
    if (st.water.on && +st.water.every > 0) {
      for (let m = toMin(st.water.from); m <= toMin(st.water.to); m += st.water.every * 60) {
        const hh = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
        add(`w:${k}:${hh}`, atTime(day, hh), '💧 Water break', `Goal: ${st.waterGoal} glasses today`, false);
      }
    }
  }
  ev.sort((a, b) => a.at - b.at);
  return ev.slice(0, 600);
}
/* Part 2: UI helpers — toasts, modals, forms, charts, the daily flower */

function toast(msg, emoji = '') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `${emoji ? `<span class="toast-e">${emoji}</span>` : ''}<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 2400);
  setTimeout(() => t.remove(), 2900);
}
function celebrate(title, text) {
  openModal(`<div class="celebrate"><div class="burst">🌸</div><h2>${esc(title)}</h2><p>${esc(text)}</p>
    <button class="btn primary" data-a="closeModal">Lovely</button></div>`);
}

// ---------- modal ----------
let closeT = null;
function openModal(html, cls = '') {
  clearTimeout(closeT);
  const m = $('#modal');
  m.innerHTML = `<div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('open'));
  const f = m.querySelector('input:not([type=checkbox]):not([type=hidden]), textarea, select');
  if (f && window.innerWidth > 700) f.focus();
}
function closeModal() {
  const m = $('#modal'); m.classList.remove('open');
  closeT = setTimeout(() => { m.hidden = true; m.innerHTML = ''; }, 180);
  FORM = null;
}

/* Generic form.
   fields: [{k, label, type: text|textarea|number|date|datetime|time|select|checks|days|color, options:[[v,label]], value, hint, placeholder}] */
let FORM = null;
function openForm({ title, fields, onSave, onDelete, saveLabel = 'Save' }) {
  FORM = { fields, onSave, onDelete };
  const html = fields.map(f => {
    const id = 'f_' + f.k, v = f.value ?? '';
    let inp;
    switch (f.type) {
      case 'textarea': inp = `<textarea id="${id}" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`; break;
      case 'select': inp = `<select id="${id}">${f.options.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`; break;
      case 'checks': inp = `<div class="checkrow" id="${id}">${f.options.map(([ov, ol]) => `<label class="pill-check"><input type="checkbox" value="${esc(ov)}" ${(v || []).map(String).includes(String(ov)) ? 'checked' : ''}><span>${esc(ol)}</span></label>`).join('')}</div>`; break;
      case 'days': inp = `<div class="checkrow" id="${id}">${DAYS.map((dn, i) => `<label class="pill-check"><input type="checkbox" value="${i}" ${(v || []).includes(i) ? 'checked' : ''}><span>${dn}</span></label>`).join('')}</div>`; break;
      case 'datetime': inp = `<input id="${id}" type="datetime-local" value="${esc(v)}">`; break;
      case 'color': inp = `<div class="swatches" id="${id}">${(f.options || SWATCHES).map(c => `<label><input type="radio" name="${id}" value="${c}" ${c === v ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>`; break;
      default: inp = `<input id="${id}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.type === 'number' ? 'step="any" inputmode="decimal"' : ''}>`;
    }
    return `<div class="field"><label for="${id}">${esc(f.label)}</label>${inp}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</div>`;
  }).join('');
  openModal(`<header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-a="closeModal" aria-label="Close">✕</button></header>
    <form class="form" onsubmit="return false">${html}</form>
    <footer class="sheet-foot">${onDelete ? `<button class="btn ghost danger" data-a="formDelete">Delete</button>` : '<span></span>'}
    <button class="btn primary" data-a="formSave">${esc(saveLabel)}</button></footer>`);
}
function readForm() {
  const out = {};
  for (const f of FORM.fields) {
    const el = $('#f_' + f.k);
    if (f.type === 'checks') out[f.k] = $$('input:checked', el).map(i => isNaN(+i.value) ? i.value : +i.value);
    else if (f.type === 'days') out[f.k] = $$('input:checked', el).map(i => +i.value);
    else if (f.type === 'color') out[f.k] = ($('input:checked', el) || {}).value || f.value;
    else if (f.type === 'number') out[f.k] = el.value === '' ? '' : +el.value;
    else out[f.k] = el.value.trim();
  }
  return out;
}
const SWATCHES = ['#B9A7F0', '#8FD6BD', '#B7DC9B', '#9EC6F0', '#F3AFC6', '#F2D58A', '#FBC1A2', '#C9C3DA'];

function ask(title, label, value = '', type = 'text') {
  return new Promise(res => {
    openForm({ title, fields: [{ k: 'v', label, type, value }], onSave: v => { res(v.v); return true; } });
  });
}
function confirmBox(text, yes = 'Delete') {
  return new Promise(res => {
    openModal(`<div class="confirm"><p>${esc(text)}</p><div class="row end"><button class="btn ghost" id="cNo">Cancel</button><button class="btn primary danger-fill" id="cYes">${esc(yes)}</button></div></div>`);
    $('#cNo').onclick = () => { closeModal(); res(false); };
    $('#cYes').onclick = () => { closeModal(); res(true); };
  });
}

// ---------- charts (tiny, dependency-free SVG) ----------
function barChart(values, labels, { color = '#B9A7F0', goal = null, unit = '' } = {}) {
  const n = values.length, W = n * 34, H = 120;
  const max = Math.max(goal || 0, ...values.map(v => +v || 0), 1);
  const bars = values.map((v, i) => {
    const h = Math.max(2, ((+v || 0) / max) * (H - 22));
    return `<g><rect x="${i * 34 + 7}" y="${H - h}" width="20" height="${h}" rx="7" fill="${color}" opacity="${v ? 1 : .35}"><title>${labels[i]}: ${v}${unit}</title></rect>
      <text x="${i * 34 + 17}" y="${H + 14}" text-anchor="middle">${labels[i]}</text></g>`;
  }).join('');
  const g = goal ? `<line x1="0" x2="${W}" y1="${H - (goal / max) * (H - 22)}" y2="${H - (goal / max) * (H - 22)}" class="goal-line"/>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H + 20}" role="img">${g}${bars}</svg>`;
}
function lineChart(points, { color = '#8FD6BD', goal = null } = {}) {
  if (points.length < 2) return `<p class="muted small">Log at least two entries to see your trend.</p>`;
  const W = 320, H = 120, vals = points.map(p => p.y);
  let min = Math.min(...vals, goal ?? Infinity), max = Math.max(...vals, goal ?? -Infinity);
  if (max - min < 1) { max += .5; min -= .5; }
  const X = i => 8 + (i / (points.length - 1)) * (W - 16), Y = v => 10 + (1 - (v - min) / (max - min)) * (H - 20);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const dots = points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.y)}" r="3.5" fill="#fff" stroke="${color}" stroke-width="2"><title>${p.x}: ${p.y}</title></circle>`).join('');
  const g = goal != null && goal !== '' ? `<line x1="0" x2="${W}" y1="${Y(goal)}" y2="${Y(goal)}" class="goal-line"/>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}
function progressBar(frac, color = 'var(--lav)') {
  return `<div class="bar"><span style="width:${clamp(frac * 100, 0, 100)}%;background:${color}"></span></div>`;
}

// ---------- the daily flower: one petal per thing on today's list ----------
function flowerSVG(items, bare = false) {
  const n = Math.max(items.length, 1);
  const done = items.filter(i => i.done).length;
  const pct = items.length ? Math.round(done / items.length * 100) : 0;
  const rx = clamp(150 / n + 5, 9, 24);
  const petals = items.map((it, i) => {
    const a = (i * 360) / n;
    return `<ellipse cx="0" cy="-52" rx="${rx}" ry="40" transform="rotate(${a})"
      fill="${it.done ? it.color : 'var(--petal-empty)'}" stroke="${it.done ? 'rgba(46,42,69,.08)' : 'var(--petal-line)'}" stroke-width="1.5"
      class="petal ${it.done ? 'on' : ''}" style="--d:${i * 40}ms"><title>${esc(it.emoji + ' ' + it.label)}${it.done ? ' ✓' : ''}</title></ellipse>`;
  }).join('');
  return `<svg class="flower" viewBox="-100 -100 200 200" aria-label="${pct}% of today done">
    <g class="petals">${petals}</g>
    <circle r="31" fill="${bare ? 'var(--accent)' : 'var(--card)'}" stroke="var(--line)" stroke-width="1.5"/>
    ${bare ? '' : `<text y="4" text-anchor="middle" class="flower-pct">${pct}%</text>
    <text y="20" text-anchor="middle" class="flower-sub">${done}/${items.length}</text>`}</svg>`;
}
/* Part 3: screens */

const UI = { spaceId: null, venture: 'All', contentView: 'board', linkShow: 'todo', linkCat: 'All', taskArea: 'all', taskShow: 'open', goalH: 'month', listId: null, plat: 'All', ideaSt: 'All', bucketCat: 'All', healthTab: 'overview', calOffset: 0 };

const NAV = [['today', 'Today', '🪷'], ['tasks', 'Tasks', '✅'], ['timetable', 'Study', '📚'], ['health', 'Health', '💗'], ['more', 'More', '✨']];
const MORE = [
  ['planner', 'Day planner', '🗓️', 'Drag tasks into time blocks'],
  ['goals', 'Goals', '🎯', 'Life vision to today'],
  ['spaces', 'My spaces', '🪷', 'Sadhana, self-care, hobbies'],
  ['content', 'Content studio', '🎬', 'Daily, weekly & long-term plan'],
  ['money', 'Money', '💰', 'Income, expenses, budgets, savings'],
  ['rewards', 'Rewards', '⏳', 'Earned time, levels, badges'],
  ['review', 'Weekly review', '📝', 'Reflect & choose next week'],
  ['utsav', 'Festivals & vrat', '🪔', 'Your sacred calendar'],
  ['lists', 'To-do lists', '🛒', 'Groceries, meals, errands'],
  ['ideas', 'Startup ideas', '💡', 'Capture and grow ideas'],
  ['bucket', 'Bucket list', '🌈', 'Dreams for the future'],
  ['links', 'Watch later', '🔗', 'Videos, lectures & articles'],
  ['insights', 'Insights', '📊', 'Charts, streaks, stats'],
  ['settings', 'Settings', '⚙️', 'Habits, reminders, sync'],
];
const TITLES = Object.fromEntries([...NAV, ...MORE].map(n => [n[0], n[1]]));

const chips = (opts, cur, action) => `<div class="chips" role="tablist">${opts.map(([v, l]) =>
  `<button class="chip ${String(v) === String(cur) ? 'on' : ''}" data-a="${action}" data-v="${esc(v)}" role="tab" aria-selected="${String(v) === String(cur)}">${l}</button>`).join('')}</div>`;
const empty = (emoji, text, btn = '') => `<div class="empty"><div class="empty-e">${emoji}</div><p>${text}</p>${btn}</div>`;
const areaDot = id => `<span class="dot" style="background:${areaOf(id).color}"></span>`;
const SKT = { Today: 'Dinacharyā', Tasks: 'Kārya', 'Study timetable': 'Vidyā', Health: 'Ārogya', More: 'Sarvam', Goals: 'Lakṣya', 'My spaces': 'Sādhanā', 'Content studio': 'Sṛjan',
  Money: 'Artha', Rewards: 'Puraskāra', 'Weekly review': 'Cintana', 'Festivals & vrat': 'Utsava', 'To-do lists': 'Sūcī', 'Startup ideas': 'Kalpanā', 'Bucket list': 'Svapna',
  'Watch later': 'Śravaṇa', Insights: 'Darśana', Settings: 'Vyavasthā', 'Day planner': 'Samaya' };
const pageHead = (title, sub = '', actions = '') => `<header class="page-head"><div>${SKT[title] ? `<span class="skt">${SKT[title]}</span>` : ''}<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="head-actions">${actions}</div></header>`;

// ============ TODAY ============
function vToday() {
  const k = dkey(), L = todayLog(k), st = S.settings, items = dayItems(k);
  const h = new Date().getHours();
  const greet = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const lvl = levelOf(S.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1);
  const dateTxt = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  const hero = `<section class="hero">
    <div class="flower-wrap">${flowerSVG(items)}</div>
    <div class="hero-text">
      <p class="date">${dateTxt}</p>
      <h1>${greet}${st.name ? ', ' + esc(st.name) : ''}</h1>
      <p class="sub">Every petal is one thing on today's list. Fill the flower.</p>
      ${phasePill()}
      <div class="stat-row">
        <span class="stat"><b>🔥 ${dayStreak()}</b> day streak</span>
        <a class="stat link" href="#rewards"><b>⏳ ${Math.floor(S.rewards.balance)}</b> min to spend</a>
        <span class="stat"><b>Lv ${lvl}</b> ${progressBar((S.xp - lo) / (hi - lo))}</span>
      </div>
    </div></section>`;

  const running = S.rewards.running ? runningCard() : '';

  const habits = `<section class="card">
    <div class="card-head"><h2>Daily habits</h2><a href="#settings" class="link small">Edit</a></div>
    <div class="habit-grid">${S.habits.map(hb => {
      const on = !!L.habits[hb.id];
      return `<button class="habit ${on ? 'on' : ''}" style="--c:${areaOf(hb.areaId).color}" data-a="habit" data-id="${hb.id}" aria-pressed="${on}">
        <span class="habit-e">${hb.emoji}</span><span>${esc(hb.name)}</span><span class="tick">${on ? '✓' : ''}</span></button>`;
    }).join('') || '<p class="muted">Add daily habits in Settings.</p>'}</div></section>`;

  const drops = Math.max(st.waterGoal, L.water);
  const moodE = ['😣', '😕', '😐', '🙂', '😄'];
  const trackers = `<section class="card trackers">
    <div class="card-head"><h2>Body check-in</h2><a href="#health" class="link small">Health</a></div>
    <div class="tracker">
      <div class="t-label">💧 Water <span class="muted">${L.water}/${st.waterGoal} glasses</span></div>
      <div class="drops">${Array.from({ length: drops }, (_, i) => `<button class="drop ${i < L.water ? 'on' : ''}" data-a="water" data-n="${i + 1}" aria-label="${i + 1} glasses"></button>`).join('')}
        <button class="mini-btn" data-a="waterPlus" aria-label="Add a glass">+1</button></div>
    </div>
    <div class="tracker">
      <div class="t-label">😴 Sleep</div>
      ${L.sleep ? `<button class="pill-btn" data-a="logSleep">${L.sleep.hours} h · ${L.sleep.bed} → ${L.sleep.wake}</button>` : `<button class="pill-btn dashed" data-a="logSleep">Log last night</button>`}
    </div>
    <div class="tracker">
      <div class="t-label">🏃 Exercise</div>
      <div class="wrap">${L.exercise.map((e, i) => `<span class="tag">${esc(e.type)} · ${e.min} min <button class="x" data-a="delWorkout" data-i="${i}" aria-label="Remove">✕</button></span>`).join('')}
      <button class="pill-btn dashed" data-a="logWorkout">+ Log workout</button></div>
    </div>
    <div class="tracker">
      <div class="t-label">🍽️ Meals today</div>
      <div class="wrap">
        <button class="pill-btn" data-a="diet" data-k="good">🥗 Healthy <b>${L.diet.good}</b></button>
        <button class="pill-btn" data-a="diet" data-k="ok">🍛 Okay <b>${L.diet.ok}</b></button>
        <button class="pill-btn" data-a="diet" data-k="junk">🍟 Junk <b>${L.diet.junk}</b></button>
        ${(L.diet.good + L.diet.ok + L.diet.junk) ? `<button class="link small" data-a="dietReset">reset</button>` : ''}
      </div>
    </div>
    <div class="tracker">
      <div class="t-label">🫶 Mood & stress</div>
      <div class="moods">${moodE.map((m, i) => `<button class="mood ${L.mood === i + 1 ? 'on' : ''}" data-a="mood" data-v="${i + 1}" aria-label="Mood ${i + 1} of 5">${m}</button>`).join('')}</div>
    </div></section>`;

  // study plan: today's entries from every timetable
  const nowM = new Date().getHours() * 60 + new Date().getMinutes(), tk = dkey();
  let plan = [];
  for (const tt of S.timetables) {
    if (tt.type === 'monthly') {
      (tt.cols || []).forEach((cn, ci) => { const c = tt.cells[`${tk},${ci}`]; if (c && c.text) plan.push({ s: cn, t: c.text, tt: tt.name, order: 2000 + ci }); });
    } else {
      const col = tt.days.findIndex(d => d.slice(0, 3).toLowerCase() === DAYS[dayIdx(new Date())].toLowerCase()), r = currentSlot(tt);
      if (col >= 0) tt.slots.forEach((sl, ri) => { const c = tt.cells[`${ri},${col}`]; if (c && c.text && slotStart(sl) >= nowM - 60) plan.push({ s: sl, t: c.text, now: ri === r, tt: tt.name, order: slotStart(sl) }); });
    }
  }
  plan = plan.sort((a, b) => a.order - b.order).slice(0, 6);
  const many = new Set(plan.map(p => p.tt)).size > 1;
  const ttCard = `<section class="card">
    <div class="card-head"><h2>Study plan today</h2><a href="#timetable" class="link small">Timetable</a></div>
    ${plan.length ? `<ul class="slots">${plan.map(u => `<li class="${u.now ? 'now' : ''}"><span class="slot-time">${esc(u.s)}${many ? `<small>${esc(u.tt)}</small>` : ''}</span><span class="slot-subj" style="background:${softColor(u.t)}">${esc(u.t)}</span>${u.now ? '<span class="now-tag">now</span>' : ''}</li>`).join('')}</ul>`
      : `<p class="muted">Nothing else planned for today.</p>`}</section>`;

  // deadlines
  const soon = upcomingDeadlines(7);
  const dl = `<section class="card">
    <div class="card-head"><h2>Deadlines this week</h2><button class="link small" data-a="newTask">+ Task</button></div>
    ${soon.length ? `<div class="list">${soon.slice(0, 8).map(x => x.kind === 'task' ? taskRow(x.obj) : deadlineRow(x)).join('')}</div>` : `<p class="muted">No deadlines in the next 7 days.</p>`}</section>`;

  return `${hero}${running}${festTodayCard()}${focusBlock()}${prioritiesCard()}<div class="grid-2"><div class="col">${intentionCard()}${dl}${habits}${ttCard}</div><div class="col">${shlokaCard()}${pinnedSpaces()}${trackers}</div></div>`;
}

function slotStart(s) { const m = String(s).match(/(\d{1,2})[:.](\d{2})/); return m ? +m[1] * 60 + +m[2] : -1; }
function currentSlot(tt) {
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  for (let i = 0; i < tt.slots.length; i++) {
    const a = slotStart(tt.slots[i]); const parts = String(tt.slots[i]).split(/[–\-to]+/);
    let b = parts[1] ? slotStart(parts[1]) : -1;
    if (b < 0) b = i + 1 < tt.slots.length ? slotStart(tt.slots[i + 1]) : a + 60;
    if (a >= 0 && now >= a && now < b) return i;
  }
  return -1;
}

function upcomingDeadlines(days) {
  const lim = Date.now() + days * 864e5, out = [];
  S.tasks.forEach(t => { if (!t.done && t.deadline && parseDate(t.deadline) < lim) out.push({ kind: 'task', obj: t, at: parseDate(t.deadline) }); });
  S.goals.forEach(g => { if (!g.done && g.deadline && parseDate(g.deadline) < lim) out.push({ kind: 'goal', obj: g, at: parseDate(g.deadline), title: '🎯 ' + g.title, area: g.areaId, href: '#goals' }); });
  S.content.forEach(c => { if (c.stage !== 'Posted' && c.deadline && parseDate(c.deadline) < lim) out.push({ kind: 'content', obj: c, at: parseDate(c.deadline), title: platEmoji(c.platform) + ' ' + c.title, area: 'work', href: '#content' }); });
  S.lists.forEach(l => l.items.forEach(it => { if (!it.done && it.due && parseDate(it.due) < lim) out.push({ kind: 'item', obj: { ...it, deadline: it.due }, at: parseDate(it.due), title: l.emoji + ' ' + it.text, area: 'home', href: '#lists', sub: l.name }); }));
  S.savings.forEach(s => { if (+s.saved < +s.target && s.deadline && parseDate(s.deadline) < lim) out.push({ kind: 'saving', obj: s, at: parseDate(s.deadline), title: '💰 ' + s.name, area: 'money', href: '#money' }); });
  return out.sort((a, b) => a.at - b.at);
}
function deadlineRow(x) {
  return `<a class="row-item" href="${x.href}"><span class="check ghost">${areaDot(x.area)}</span>
    <div class="grow"><div class="title">${esc(x.title)}</div><div class="meta">${x.kind === 'content' ? esc(x.obj.platform + ' · ' + x.obj.stage) : x.kind === 'goal' ? 'Goal' : x.kind === 'item' ? esc(x.sub) : 'Savings goal'}</div></div>
    <div class="right">${dueBadge(x.obj.deadline)}</div></a>`;
}

function runningCard() {
  const r = S.rewards.running, a = S.rewards.activities.find(x => x.id === r.id) || { name: 'Free time', emoji: '⏳' };
  return `<section class="card running"><div class="run-e">${a.emoji}</div>
    <div class="grow"><h2>${esc(a.name)} is running</h2><p class="muted small">Time used comes out of your earned minutes.</p></div>
    <div class="run-time"><span id="timerLeft">—</span><small>left</small></div>
    <button class="btn primary" data-a="stopActivity">Stop</button></section>`;
}

// ============ TASKS ============
function taskRow(t) {
  const g = t.goalId && S.goals.find(x => x.id === t.goalId);
  const prio = ['', 'low', 'med', 'high'][t.priority || 2];
  return `<div class="row-item ${t.done ? 'is-done' : ''}">
    <button class="check ${t.done ? 'on' : ''}" style="--c:${areaOf(t.areaId).color}" data-a="toggleTask" data-id="${t.id}" aria-label="${t.done ? 'Mark not done' : 'Mark done'}">${t.done ? '✓' : ''}</button>
    <div class="grow" data-a="editTask" data-id="${t.id}" role="button" tabindex="0">
      <div class="title">${esc(t.title)}</div>
      <div class="meta">${areaDot(t.areaId)}${esc(areaOf(t.areaId).name)}${g ? ` · 🎯 ${esc(g.title)}` : ''}${t.repeat && t.repeat !== 'none' ? ` · 🔁 ${t.repeat}` : ''}<span class="prio ${prio}">${prio}</span></div>
    </div>
    <div class="right">${t.done ? '' : dueBadge(t.deadline)}<span class="row-tools">${t.done ? '' : starBtn('task', t)}<span class="reward">+${t.minutes}m</span></span></div></div>`;
}
function vTasks() {
  const areaOpts = [['all', 'All'], ...S.areas.map(a => [a.id, a.emoji + ' ' + a.name])];
  let list = S.tasks.filter(t => (UI.taskArea === 'all' || t.areaId === UI.taskArea) && (UI.taskShow === 'open' ? !t.done : t.done));
  if (UI.taskShow === 'open') list.sort((a, b) => (parseDate(a.deadline) || 9e15) - (parseDate(b.deadline) || 9e15) || (b.priority || 2) - (a.priority || 2));
  else list = list.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 60);
  const overdue = S.tasks.filter(t => !t.done && t.deadline && parseDate(t.deadline) < Date.now()).length;
  return pageHead('Tasks', `${S.tasks.filter(t => !t.done).length} open${overdue ? ` · <span class="due due-over">${overdue} overdue</span>` : ''}`,
    `<button class="btn primary" data-a="newTask">+ New task</button>`) +
    chips([['open', 'To do'], ['done', 'Done']], UI.taskShow, 'taskShow') +
    chips(areaOpts, UI.taskArea, 'taskArea') +
    `<section class="card flush">${list.length ? `<div class="list">${list.map(taskRow).join('')}</div>` :
      empty('🌱', UI.taskShow === 'open' ? 'Nothing to do here. Add a task with a deadline and a reward.' : 'Completed tasks will show up here.', UI.taskShow === 'open' ? '<button class="btn primary" data-a="newTask">+ New task</button>' : '')}</section>`;
}

// ============ GOALS ============
function vGoals() {
  const H = HORIZONS;
  const gs = S.goals.filter(g => g.horizon === UI.goalH);
  const byArea = S.areas.map(a => [a, gs.filter(g => g.areaId === a.id)]).filter(x => x[1].length);
  const nFocus = S.goals.filter(g => g.focus && !g.done).length;
  return pageHead('Goals', `Big goals break into tasks. Tap 🎯 to make a goal one of your ${2} focus goals (${nFocus}/2 chosen).`, `<button class="btn primary" data-a="newGoal">+ New goal</button>`) +
    chips(H, UI.goalH, 'goalH') +
    (byArea.length ? byArea.map(([a, list]) => `<section class="card"><div class="card-head"><h2>${a.emoji} ${esc(a.name)}</h2></div>
      <div class="list">${list.sort((x, y) => (x.done - y.done)).map(goalRow).join('')}</div></section>`).join('')
      : `<section class="card">${empty('🎯', 'No goals for this period yet.', '<button class="btn primary" data-a="newGoal">+ New goal</button>')}</section>`);
}
function goalRow(g) {
  const ts = S.tasks.filter(t => t.goalId === g.id), dn = ts.filter(t => t.done).length;
  const frac = g.done ? 1 : ts.length ? dn / ts.length : 0;
  return `<div class="row-item goal ${g.done ? 'is-done' : ''}">
    <button class="check ${g.done ? 'on' : ''}" style="--c:${areaOf(g.areaId).color}" data-a="toggleGoal" data-id="${g.id}" aria-label="Toggle goal">${g.done ? '✓' : ''}</button>
    <div class="grow" data-a="editGoal" data-id="${g.id}" role="button" tabindex="0">
      <div class="title">${esc(g.title)}</div>
      ${progressBar(frac, areaOf(g.areaId).color)}
      <div class="meta">${ts.length ? `${dn}/${ts.length} tasks done` : 'No linked tasks yet'}${g.notes ? ' · ' + esc(g.notes.slice(0, 60)) : ''}</div>
    </div>
    <div class="right">${g.done ? '' : dueBadge(g.deadline)}<span class="row-tools">${g.done ? '' : `<button class="tool ${g.focus ? 'on' : ''}" data-a="toggleFocus" data-id="${g.id}" title="Focus goal" aria-label="Focus goal">🎯</button>${starBtn('goal', g)}`}<button class="mini-btn" data-a="newTask" data-goal="${g.id}" title="Add a task to this goal">+ task</button></span></div></div>`;
}

// ============ HEALTH ============
function lastNDays(n) { return Array.from({ length: n }, (_, i) => addDays(new Date(), i - n + 1)); }
function vHealth() {
  const tabs = chips([['overview', 'Overview'], ['period', 'Cycle']], UI.healthTab, 'healthTab');
  if (UI.healthTab === 'period') return pageHead('Health') + tabs + vPeriod();
  const days = lastNDays(7), lab = days.map(d => DAYS[dayIdx(d)][0]), st = S.settings;
  const logs = days.map(d => S.logs[dkey(d)] || {});
  const w = [...S.weights].sort((a, b) => a.d.localeCompare(b.d));
  const cur = w.length ? w[w.length - 1].kg : null, first = w.length ? w[0].kg : null;
  const diet = logs.reduce((a, l) => { if (l.diet) { a.good += l.diet.good; a.ok += l.diet.ok; a.junk += l.diet.junk; } return a; }, { good: 0, ok: 0, junk: 0 });
  const dietTotal = diet.good + diet.ok + diet.junk;
  const moods = logs.map(l => l.mood || 0);
  return pageHead('Health') + tabs + `<div class="grid-2"><div class="col">
    <section class="card"><div class="card-head"><h2>⚖️ Weight</h2><button class="btn small" data-a="logWeight">Log weight</button></div>
      <div class="stat-row">${cur != null ? `<span class="stat"><b>${cur} kg</b> now</span>` : ''}
        ${st.weightGoal ? `<span class="stat"><b>${st.weightGoal} kg</b> goal</span>` : `<button class="link small" data-a="editBasics">Set a goal weight</button>`}
        ${cur != null && first != null && w.length > 1 ? `<span class="stat"><b>${(cur - first > 0 ? '+' : '') + (cur - first).toFixed(1)} kg</b> since start</span>` : ''}
        ${cur != null && st.weightGoal ? `<span class="stat"><b>${Math.abs(cur - st.weightGoal).toFixed(1)} kg</b> to go</span>` : ''}</div>
      ${lineChart(w.slice(-20).map(x => ({ x: x.d, y: x.kg })), { goal: st.weightGoal })}
      ${w.length ? `<details><summary class="small muted">Weight log</summary><div class="list compact">${w.slice().reverse().slice(0, 30).map(x => `<div class="row-item"><div class="grow">${fmtDate(x.d)}</div><b>${x.kg} kg</b><button class="x" data-a="delWeight" data-d="${x.d}" aria-label="Delete">✕</button></div>`).join('')}</div></details>` : ''}
    </section>
    <section class="card"><div class="card-head"><h2>🍽️ Meals this week</h2></div>
      ${dietTotal ? `<div class="diet-bar"><span style="flex:${diet.good};background:var(--mint)">🥗 ${diet.good}</span><span style="flex:${diet.ok};background:var(--butter)">🍛 ${diet.ok}</span><span style="flex:${diet.junk};background:var(--blush)">🍟 ${diet.junk}</span></div>
      <p class="small muted">${Math.round(diet.good / dietTotal * 100)}% healthy meals this week.</p>` : '<p class="muted">Tap the meal buttons on Today to track what you eat.</p>'}
    </section>
    <section class="card"><div class="card-head"><h2>🫶 Mood this week</h2></div>${barChart(moods, lab, { color: 'var(--blush)', unit: '/5' })}</section>
  </div><div class="col">
    <section class="card"><div class="card-head"><h2>💧 Water</h2><span class="muted small">goal ${st.waterGoal}</span></div>${barChart(logs.map(l => l.water || 0), lab, { color: 'var(--sky)', goal: st.waterGoal, unit: ' glasses' })}</section>
    <section class="card"><div class="card-head"><h2>😴 Sleep</h2><button class="btn small" data-a="logSleep">Log sleep</button></div>${barChart(logs.map(l => l.sleep ? l.sleep.hours : 0), lab, { color: 'var(--lav)', goal: st.sleepGoal, unit: ' h' })}</section>
    <section class="card"><div class="card-head"><h2>🏃 Exercise minutes</h2><button class="btn small" data-a="logWorkout">Log workout</button></div>${barChart(logs.map(l => (l.exercise || []).reduce((a, e) => a + (+e.min || 0), 0)), lab, { color: 'var(--mint)', unit: ' min' })}</section>
  </div></div>`;
}
function vPeriod() {
  const pi = periodInfo(), len = S.period.periodLen;
  const mDate = new Date(); mDate.setDate(1); mDate.setMonth(mDate.getMonth() + UI.calOffset);
  const logged = new Set(), predicted = new Set();
  S.period.starts.forEach(s => { const [y, m, d] = s.split('-').map(Number); for (let i = 0; i < len; i++) logged.add(dkey(new Date(y, m - 1, d + i))); });
  if (pi) for (let c = 0; c < 3; c++) for (let i = 0; i < len; i++) predicted.add(dkey(addDays(pi.next, c * pi.cycle + i)));
  const first = new Date(mDate), lead = dayIdx(first), dim = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0).getDate();
  let cells = Array.from({ length: lead }, () => '<span></span>').join('');
  for (let d = 1; d <= dim; d++) {
    const k = dkey(new Date(mDate.getFullYear(), mDate.getMonth(), d));
    const cls = logged.has(k) ? 'p-log' : predicted.has(k) ? 'p-pred' : '';
    cells += `<span class="cal-d ${cls} ${k === dkey() ? 'today' : ''}">${d}</span>`;
  }
  return `<div class="grid-2"><div class="col"><section class="card period-hero">
      ${pi ? `<div class="big-num">${pi.daysUntil <= 0 ? 'Now' : pi.daysUntil}</div><p>${pi.daysUntil <= 0 ? 'Your period is expected around now.' : `day${pi.daysUntil === 1 ? '' : 's'} until your next period, expected ${pi.next.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}.`}</p>
        <p class="small muted">Average cycle: ${pi.cycle} days${pi.logged < 3 ? ' (log a few more cycles for a better prediction)' : ''}.</p>`
      : `<div class="big-num">🌸</div><p>Log the first day of your period to start predictions.</p>`}
      <div class="row"><button class="btn primary" data-a="periodToday">Period started today</button><button class="btn" data-a="periodPast">Log a past date</button></div>
    </section>
    <section class="card"><div class="card-head"><h2>Settings</h2></div><div class="row"><span>Period length</span><button class="pill-btn" data-a="periodLen">${len} days</button></div></section>
  </div><div class="col"><section class="card">
    <div class="card-head"><button class="icon-btn" data-a="calNav" data-v="-1" aria-label="Previous month">‹</button><h2>${mDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><button class="icon-btn" data-a="calNav" data-v="1" aria-label="Next month">›</button></div>
    <div class="cal">${DAYS.map(d => `<b>${d[0]}</b>`).join('')}${cells}</div>
    <div class="legend"><span><i class="p-log"></i>Logged</span><span><i class="p-pred"></i>Predicted</span></div>
    ${S.period.starts.length ? `<details><summary class="small muted">Logged start dates</summary><div class="list compact">${[...S.period.starts].sort().reverse().map(s => `<div class="row-item"><div class="grow">${fmtDate(s)}</div><button class="x" data-a="delPeriod" data-d="${s}" aria-label="Delete">✕</button></div>`).join('')}</div></details>` : ''}
  </section></div></div>`;
}

// ============ REWARDS ============
function vRewards() {
  const R = S.rewards, lvl = levelOf(S.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1);
  const earnGuide = EARN_TYPES.map(([k, l]) => [l.split(' ')[0], l.slice(l.indexOf(' ') + 1), ER(k) + ' min']);
  return pageHead('Rewards', 'Earn free time by showing up for yourself, then spend it guilt-free.', `<button class="btn" data-a="editEarn">⚙️ Earning rates</button>`) + `
  <section class="card wallet">
    <div><div class="big-num">${Math.floor(R.balance)}<small> min</small></div><p>earned free time to spend on your favourite things</p></div>
    <div class="lvl"><div class="lvl-badge">Lv ${lvl}</div><div class="grow"><div class="small">${S.xp - lo} / ${hi - lo} XP to level ${lvl + 1}</div>${progressBar((S.xp - lo) / (hi - lo), 'var(--lav)')}</div></div>
  </section>
  ${R.running ? runningCard() : ''}
  <div class="grid-2"><div class="col">
  <section class="card"><div class="card-head"><h2>Spend your minutes</h2><button class="link small" data-a="newActivity">+ Add</button></div>
    <div class="acts">${R.activities.map(a => `<div class="act"><span class="act-e">${a.emoji}</span><span class="grow">${esc(a.name)}</span>
      <button class="icon-btn" data-a="editActivity" data-id="${a.id}" aria-label="Edit">✎</button>
      <button class="btn ${R.running ? '' : 'primary'} small" data-a="startActivity" data-id="${a.id}" ${R.running ? 'disabled' : ''}>Start</button></div>`).join('')}</div>
    <div class="row wrap"><button class="btn small" data-a="spendManual">I used time without the timer</button><button class="btn small ghost" data-a="bonusManual">Add bonus minutes</button></div>
  </section>
  <section class="card"><div class="card-head"><h2>How to earn</h2></div>
    <ul class="earn">${earnGuide.map(e => `<li><span>${e[0]}</span><span class="grow">${e[1]}</span><b>${e[2]}</b></li>`).join('')}</ul></section>
  </div><div class="col">
  <section class="card"><div class="card-head"><h2>Badges</h2><span class="muted small">${Object.keys(S.badges).length}/${BADGES.length}</span></div>
    <div class="badges">${BADGES.map(b => `<div class="badge ${S.badges[b.id] ? 'got' : ''}" title="${esc(b.d)}"><span>${b.e}</span><b>${esc(b.n)}</b><small>${esc(b.d)}</small></div>`).join('')}</div></section>
  <section class="card"><div class="card-head"><h2>History</h2></div>
    ${R.history.length ? `<div class="list compact">${R.history.slice(0, 25).map(h => `<div class="row-item"><div class="grow small">${esc(h.r)}<div class="meta">${new Date(h.t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div></div><b class="${h.d >= 0 ? 'plus' : 'minus'}">${h.d >= 0 ? '+' : ''}${h.d} min</b></div>`).join('')}</div>` : '<p class="muted">Finish something to see your first reward here.</p>'}
  </section></div></div>`;
}

// ============ MORE ============
function vMore() {
  return pageHead('More') + `<div class="tiles">${MORE.filter(m => !S.hidden.includes(m[0])).map(m => `<a class="tile" href="#${m[0]}"><span class="tile-e">${m[2]}</span><b>${m[1]}</b><small>${m[3]}</small></a>`).join('')}</div>`;
}

// ============ TIMETABLE ============
function vTimetable() {
  const tt = S.timetables.find(t => t.id === S.activeTT) || S.timetables[0];
  if (!tt) return pageHead('Study timetable') + empty('📅', 'No timetable yet.', '<button class="btn primary" data-a="newTT">+ New timetable</button>');
  const monthly = tt.type === 'monthly';
  const toolbar = `<div class="toolbar">
      <select data-ch="ttSelect" aria-label="Choose timetable">${S.timetables.map(t => `<option value="${t.id}" ${t.id === tt.id ? 'selected' : ''}>${t.type === 'monthly' ? '🗓️' : '📅'} ${esc(t.name)}</option>`).join('')}</select>
      <button class="btn small" data-a="newTT">+ New</button>
      <button class="btn small" data-a="renameTT">Rename</button>
      ${monthly ? `<button class="btn small" data-a="addCol">+ Column</button>` : `<button class="btn small" data-a="addRow">+ Time slot</button>`}
      <button class="btn small ${tt.remind ? 'is-on' : ''}" data-a="ttRemind">🔔 ${tt.remind ? (monthly ? `Reminder ${tt.remindTime}` : 'Slot reminders on') : 'Remind me'}</button>
      <button class="btn small" data-a="importTT">Import Excel</button>
      <button class="btn small primary" data-a="exportTT">Export Excel</button>
      ${S.timetables.length > 1 ? `<button class="btn small ghost danger" data-a="delTT">Delete</button>` : ''}
    </div>`;
  if (monthly) {
    const [y, m] = tt.month.split('-').map(Number), dim = new Date(y, m, 0).getDate(), today = dkey();
    const monthName = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const head = `<tr><th class="corner">Date</th>${tt.cols.map((c, ci) => `<th data-a="editCol" data-c="${ci}">${esc(c)}</th>`).join('')}</tr>`;
    let rows = '', filled = 0;
    for (let d = 1; d <= dim; d++) {
      const date = new Date(y, m - 1, d), k = dkey(date), wk = dayIdx(date) >= 5;
      rows += `<tr class="${k === today ? 'row-today' : ''} ${wk ? 'weekend' : ''}"><th class="${k === today ? 'is-now' : ''}">${DAYS[dayIdx(date)]} ${d}</th>${tt.cols.map((_, ci) => {
        const c = tt.cells[`${k},${ci}`]; if (c && c.text) filled++;
        return `<td data-a="editCell" data-k="${k}" data-c="${ci}" class="${k === today ? 'is-now' : ''}" ${c && c.text ? `style="background:${softColor(c.text)}"` : ''}>${esc(c ? c.text : '')}</td>`;
      }).join('')}</tr>`;
    }
    return pageHead('Study timetable', 'Monthly planner: one row per date. Tap a cell to plan that day.') + toolbar +
      `<div class="month-nav"><button class="icon-btn" data-a="ttMonth" data-v="-1" aria-label="Previous month">‹</button><h2>${monthName}</h2><button class="icon-btn" data-a="ttMonth" data-v="1" aria-label="Next month">›</button><span class="muted small">${filled} sessions planned</span></div>
      <div class="tt-wrap"><table class="tt tt-month">${head}${rows}</table></div>
      <p class="small muted">Tip: tap a column name to rename or remove it. Export gives you this month as an Excel sheet.</p>`;
  }
  const today = DAYS[dayIdx(new Date())].toLowerCase(), cur = currentSlot(tt);
  const head = `<tr><th class="corner">Time</th>${tt.days.map((d, c) => `<th class="${d.slice(0, 3).toLowerCase() === today ? 'is-today' : ''}" data-a="editDay" data-c="${c}">${esc(d)}</th>`).join('')}</tr>`;
  const rows = tt.slots.map((sl, r) => `<tr><th data-a="editSlot" data-r="${r}" class="${r === cur ? 'is-now' : ''}">${esc(sl)}</th>${tt.days.map((d, c) => {
    const cell = tt.cells[`${r},${c}`], txt = cell && cell.text;
    const isNow = r === cur && d.slice(0, 3).toLowerCase() === today;
    return `<td data-a="editCell" data-r="${r}" data-c="${c}" class="${isNow ? 'is-now' : ''}" ${txt ? `style="background:${softColor(txt)}"` : ''}>${esc(txt || '')}</td>`;
  }).join('')}</tr>`).join('');
  return pageHead('Study timetable', 'Weekly timetable: tap any cell to fill it. The same subject always gets the same colour.') + toolbar +
    `<div class="tt-wrap"><table class="tt">${head}${rows}</table></div>
    <p class="small muted">Tip: export, edit in Excel or Google Sheets, then import it back. First row = days, first column = times.</p>`;
}

// ============ LISTS ============
function vLists() {
  if (!S.lists.find(l => l.id === UI.listId)) UI.listId = S.lists[0]?.id;
  const L = S.lists.find(l => l.id === UI.listId);
  const tabs = `<div class="chips">${S.lists.map(l => `<button class="chip ${l.id === UI.listId ? 'on' : ''}" data-a="listPick" data-v="${l.id}">${l.emoji} ${esc(l.name)} <span class="count">${l.items.filter(i => !i.done).length}</span></button>`).join('')}<button class="chip add" data-a="newList">+ New list</button></div>`;
  if (!L) return pageHead('To-do lists') + tabs + empty('🛒', 'Make a list for groceries, meals or errands.');
  const open = L.items.filter(i => !i.done), done = L.items.filter(i => i.done);
  const item = i => `<div class="row-item ${i.done ? 'is-done' : ''}"><button class="check ${i.done ? 'on' : ''}" style="--c:var(--peach)" data-a="toggleItem" data-id="${i.id}" aria-label="Toggle">${i.done ? '✓' : ''}</button><div class="grow" data-a="editItem" data-id="${i.id}" role="button" tabindex="0"><div class="title">${esc(i.text)}</div>${i.note ? `<div class="meta">${esc(i.note)}</div>` : ''}</div>${!i.done && i.due ? dueBadge(i.due) : ''}<button class="x" data-a="delItem" data-id="${i.id}" aria-label="Delete">✕</button></div>`;
  return pageHead('To-do lists') + tabs + `<section class="card">
    <div class="card-head"><h2>${L.emoji} ${esc(L.name)}</h2><div><button class="icon-btn" data-a="editList" aria-label="Edit list">✎</button></div></div>
    <form class="add-row" data-submit="addItem"><input id="itemIn" placeholder="Add an item and press Enter" autocomplete="off"><button class="btn primary">Add</button></form>
    <div class="list">${open.map(item).join('') || '<p class="muted">All done here.</p>'}</div>
    ${done.length ? `<details><summary class="small muted">Completed (${done.length})</summary><div class="list">${done.map(item).join('')}</div><button class="btn small ghost" data-a="clearDone">Clear completed</button></details>` : ''}
  </section>`;
}

// ============ CONTENT ============
const STAGES = ['Idea', 'Script', 'Shoot', 'Edit', 'Posted'];
function vContent() {
  const list = S.content.filter(c => UI.plat === 'All' || c.platform === UI.plat);
  const m = new Date(); const monthPosted = S.content.filter(c => c.stage === 'Posted' && c.postedAt && new Date(c.postedAt).getMonth() === m.getMonth() && new Date(c.postedAt).getFullYear() === m.getFullYear());
  const perPlat = S.platforms.map(p => [p, monthPosted.filter(c => c.platform === p.name).length]).filter(x => x[1]);
  const sub = monthPosted.length ? `Posted this month: ${perPlat.map(([p, n]) => `${p.emoji} ${n}`).join(' · ')}` : 'Nothing posted yet this month.';
  const views = chips([['plan', '📅 Planner sheet'], ['table', '📊 Pieces'], ['board', '🗂️ Board']], UI.contentView, 'contentView');
  if (UI.contentView === 'plan') return vPlanner(pageHead('Content studio', 'Plan every platform by day, week or the long term. Tick ✓ when done.', `<button class="btn" data-a="manage" data-v="platforms">⚙️ Platforms</button>`) + views) + growthCard();
  const head = pageHead('Content studio', sub, `<button class="btn" data-a="manage" data-v="platforms">⚙️ Platforms</button><button class="btn primary" data-a="${UI.contentView === 'table' ? 'addContentRow' : 'newContent'}">+ New piece</button>`) + views +
    `<div class="split-row">${chips([['All', 'All'], ...S.platforms.map(p => [p.name, `${p.emoji} ${esc(p.name)} <span class="count">${S.content.filter(c => c.platform === p.name && c.stage !== 'Posted').length}</span>`])], UI.plat, 'plat')}</div>`;
  if (UI.contentView === 'table') {
    const rows = [...list].sort((a, b) => (parseDate(a.deadline) || 9e15) - (parseDate(b.deadline) || 9e15));
    const sel = (c, f, opts) => `<select data-ch="cField" data-id="${c.id}" data-f="${f}">${opts.map(o => `<option ${o === c[f] ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    return head + `<div class="tt-wrap"><table class="xsheet">
      <tr><th style="width:120px">Platform</th><th>Title / topic</th><th style="width:110px">Stage</th><th style="width:150px">Post by</th><th>Hook / notes</th><th style="width:40px"></th></tr>
      ${rows.map(c => `<tr class="st-${c.stage.toLowerCase()}">
        <td>${sel(c, 'platform', [...new Set([...S.platforms.map(p => p.name), c.platform])])}</td>
        <td><input data-ch="cField" data-id="${c.id}" data-f="title" value="${esc(c.title)}" placeholder="Title"></td>
        <td>${sel(c, 'stage', STAGES)}</td>
        <td><input type="date" data-ch="cField" data-id="${c.id}" data-f="deadline" value="${esc(c.deadline || '')}"></td>
        <td><input data-ch="cField" data-id="${c.id}" data-f="notes" value="${esc(c.notes || '')}" placeholder="Notes"></td>
        <td><button class="x" data-a="delContent" data-id="${c.id}" aria-label="Delete row">✕</button></td></tr>`).join('')}
      </table>${rows.length ? '' : '<p class="muted pad">No rows yet. Add one below or import an Excel sheet.</p>'}</div>
      <div class="row wrap"><button class="btn small" data-a="addContentRow">+ Row</button><span class="grow"></span><button class="btn small" data-a="importContent">Import Excel</button><button class="btn small primary" data-a="exportContent">Export Excel</button></div>
      <p class="small muted">Edits save as you go. Excel columns: Platform, Title, Stage, Post by, Notes.</p>`;
  }
  return head + `<div class="kanban">${STAGES.map((st, si) => {
      const cards = list.filter(c => c.stage === st).sort((a, b) => (parseDate(a.deadline) || 9e15) - (parseDate(b.deadline) || 9e15));
      return `<div class="kcol"><div class="kcol-head"><b>${st}</b><span class="count">${cards.length}</span></div>
      ${cards.map(c => `<div class="kcard"><div data-a="editContent" data-id="${c.id}" role="button" tabindex="0"><div class="title">${platEmoji(c.platform)} ${esc(c.title || 'Untitled')}</div><div class="meta">${esc(c.platform)}${isStar(c) ? ' · ⭐' : ''}</div>
        ${c.notes ? `<div class="meta">${esc(c.notes.slice(0, 70))}</div>` : ''}</div>
        <div class="kfoot">${st !== 'Posted' ? dueBadge(c.deadline) : `<span class="meta">${c.postedAt ? fmtDate(dkey(new Date(c.postedAt))) : ''}</span>`}
        <span class="grow"></span>${si > 0 ? `<button class="mini-btn" data-a="moveContent" data-id="${c.id}" data-v="-1" aria-label="Move back">‹</button>` : ''}${si < STAGES.length - 1 ? `<button class="mini-btn" data-a="moveContent" data-id="${c.id}" data-v="1" aria-label="Move forward">›</button>` : ''}</div></div>`).join('')}
      ${si === 0 ? `<button class="kadd" data-a="newContent">+ Add idea</button>` : ''}</div>`;
    }).join('')}</div>`;
}

// ============ WATCH LATER ============
const LINK_CATS = [['YouTube', '▶️'], ['Lecture', '🎓'], ['Article', '📰'], ['Podcast', '🎧'], ['Other', '🔗']];
const linkEmoji = c => (LINK_CATS.find(x => x[0] === c) || ['', '🔗'])[1];
const domainOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
function vLinks() {
  const todo = S.links.filter(l => !l.done).length;
  const list = S.links.filter(l => (UI.linkShow === 'todo' ? !l.done : l.done) && (UI.linkCat === 'All' || l.cat === UI.linkCat))
    .sort((a, b) => UI.linkShow === 'todo' ? ((parseDate(a.by) || 9e15) - (parseDate(b.by) || 9e15) || b.created - a.created) : (b.doneAt || 0) - (a.doneAt || 0));
  return pageHead('Watch later', `${todo} to watch or read`) + `
    <form class="add-row card" data-submit="addLink"><input id="linkIn" type="text" inputmode="url" autocapitalize="off" placeholder="Paste a link: YouTube, lecture, article…" autocomplete="off"><button class="btn primary">Add</button></form>
    <div class="split-row">${chips([['todo', 'To watch'], ['done', 'Watched']], UI.linkShow, 'linkShow')}${chips([['All', 'All'], ...LINK_CATS.map(c => [c[0], c[1] + ' ' + c[0]])], UI.linkCat, 'linkCat')}</div>
    <section class="card flush">${list.length ? `<div class="list">${list.map(l => `<div class="row-item ${l.done ? 'is-done' : ''}">
      <button class="check ${l.done ? 'on' : ''}" style="--c:var(--sky)" data-a="toggleLink" data-id="${l.id}" aria-label="Mark watched">${l.done ? '✓' : ''}</button>
      <div class="grow"><a class="title link-title" href="${esc(l.url)}" target="_blank" rel="noopener">${linkEmoji(l.cat)} ${esc(l.title)}</a>
        <div class="meta">${esc(domainOf(l.url))} · ${esc(l.cat)}${l.note ? ' · ' + esc(l.note) : ''}</div></div>
      <div class="right">${!l.done && l.by ? dueBadge(l.by) : ''}<button class="icon-btn" data-a="editLink" data-id="${l.id}" aria-label="Edit">✎</button></div></div>`).join('')}</div>`
      : empty('🔗', UI.linkShow === 'todo' ? 'Paste a link above to save it for later.' : 'Things you finish watching will show up here.')}</section>
    <p class="small muted">Set a “watch by” date to get a reminder. Lectures, articles and podcasts earn 3 reward minutes when you finish them.</p>`;
}

// ============ IDEAS ============
const IDEA_ST = ['New', 'Exploring', 'Testing', 'Done', 'Dropped'];
function vIdeas() {
  const inV = i => UI.venture === 'All' || (i.ventureId || S.ventures[0]?.id) === UI.venture;
  const list = S.ideas.filter(i => inV(i) && (UI.ideaSt === 'All' || i.status === UI.ideaSt)).sort((a, b) => b.created - a.created);
  const vName = id => { const v = S.ventures.find(x => x.id === (id || S.ventures[0]?.id)); return v ? v.emoji + ' ' + v.name : ''; };
  return pageHead('Startup ideas', 'Write it down the moment it comes to you.', `<button class="btn" data-a="manage" data-v="ventures">⚙️ Startups</button>`) + `
    ${chips([['All', '✨ All startups'], ...S.ventures.map(v => [v.id, `${v.emoji} ${esc(v.name)} <span class="count">${S.ideas.filter(i => (i.ventureId || S.ventures[0]?.id) === v.id).length}</span>`])], UI.venture, 'venture')}
    <form class="add-row card" data-submit="addIdea"><input id="ideaIn" placeholder="New idea for ${esc(UI.venture === 'All' ? (S.ventures[0]?.name || 'your startup') : (S.ventures.find(v => v.id === UI.venture)?.name || ''))}…" autocomplete="off"><button class="btn primary">Save idea</button></form>
    ${chips([['All', 'All'], ...IDEA_ST.map(s => [s, `${s} <span class="count">${S.ideas.filter(i => inV(i) && i.status === s).length}</span>`])], UI.ideaSt, 'ideaSt')}
    <div class="masonry">${list.map(i => `<article class="idea st-${i.status.toLowerCase()}">
      <div data-a="editIdea" data-id="${i.id}" role="button" tabindex="0"><h3>${esc(i.title)}</h3>${i.note ? `<p>${esc(i.note)}</p>` : ''}</div>
      <div class="idea-foot"><select data-ch="ideaStatus" data-id="${i.id}" aria-label="Status">${IDEA_ST.map(s => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <span class="meta">${S.ventures.length > 1 ? esc(vName(i.ventureId)) + ' · ' : ''}${fmtDate(dkey(new Date(i.created)))}</span><button class="mini-btn" data-a="ideaToTask" data-id="${i.id}">→ task</button></div></article>`).join('')
      || empty('💡', 'Your ideas board is empty. Type one above.')}</div>`;
}

// ============ BUCKET ============
const BUCKET_CATS = [['Travel', '✈️'], ['Skills', '🎓'], ['Experiences', '🎢'], ['Career', '💼'], ['Health', '💪'], ['Other', '✨']];
function vBucket() {
  const f = b => UI.bucketCat === 'All' || b.cat === UI.bucketCat;
  const open = S.bucket.filter(b => !b.done && f(b)), done = S.bucket.filter(b => b.done && f(b)).sort((a, b) => b.doneAt - a.doneAt);
  const catE = c => (BUCKET_CATS.find(x => x[0] === c) || ['', '✨'])[1];
  const card = b => `<div class="bucket ${b.done ? 'is-done' : ''}"><button class="check ${b.done ? 'on' : ''}" style="--c:var(--butter)" data-a="toggleBucket" data-id="${b.id}" aria-label="Toggle">${b.done ? '✓' : ''}</button>
    <div class="grow" data-a="editBucket" data-id="${b.id}" role="button" tabindex="0"><div class="title">${catE(b.cat)} ${esc(b.title)}</div>
    <div class="meta">${esc(b.cat)}${b.year ? ` · by ${b.year}` : ''}${b.done ? ` · achieved ${fmtDate(dkey(new Date(b.doneAt)))}` : ''}${b.note ? ' · ' + esc(b.note.slice(0, 60)) : ''}</div></div></div>`;
  return pageHead('Bucket list', `${S.bucket.filter(b => b.done).length} of ${S.bucket.length} dreams achieved`, `<button class="btn primary" data-a="newBucket">+ Add a dream</button>`) +
    chips([['All', 'All'], ...BUCKET_CATS.map(c => [c[0], c[1] + ' ' + c[0]])], UI.bucketCat, 'bucketCat') +
    `<section class="card">${open.length ? open.map(card).join('') : empty('🌈', 'What do you want to do someday? Add it here.')}</section>
    ${done.length ? `<section class="card"><div class="card-head"><h2>Achieved</h2></div>${done.map(card).join('')}</section>` : ''}`;
}

// ============ MONEY ============
function vMoney() {
  const c = S.settings.currency, tot = S.savings.reduce((a, s) => a + (+s.saved || 0), 0);
  return pageHead('Money', `${c}${tot.toLocaleString()} saved across ${S.savings.length} goal${S.savings.length === 1 ? '' : 's'}`, `<button class="btn primary" data-a="newSaving">+ Savings goal</button>`) +
    `<div class="grid-2">${S.savings.map(s => {
      const frac = +s.target ? (+s.saved || 0) / +s.target : 0;
      return `<section class="card saving"><div class="card-head"><h2>${esc(s.emoji || '💰')} ${esc(s.name)}</h2><button class="icon-btn" data-a="editSaving" data-id="${s.id}" aria-label="Edit">✎</button></div>
        <div class="big-num small-num">${c}${(+s.saved || 0).toLocaleString()} <small>of ${c}${(+s.target || 0).toLocaleString()}</small></div>
        ${progressBar(frac, 'var(--butter)')}
        <div class="row"><span class="small muted">${Math.round(frac * 100)}%</span>${frac < 1 ? dueBadge(s.deadline) : '<span class="due due-ok">Reached 🎉</span>'}<span class="grow"></span>
        <button class="btn small primary" data-a="addMoney" data-id="${s.id}">+ Add money</button></div></section>`;
    }).join('') || `<section class="card">${empty('🐷', 'Set a savings goal, like an emergency fund or a new laptop.', '<button class="btn primary" data-a="newSaving">+ Savings goal</button>')}</section>`}</div>`;
}

// ============ PEOPLE ============
function personDue(p) { if (!p.every) return 999; const base = p.last ? parseDate(p.last) : new Date(0); return Math.ceil((addDays(base, +p.every) - Date.now()) / 864e5); }
function personRow(p) {
  const d = personDue(p);
  const st = !p.every ? '' : d <= 0 ? `<span class="due due-over">${d === 0 ? 'Due today' : `${-d} day${d === -1 ? '' : 's'} overdue`}</span>` : `<span class="due due-ok">in ${d} day${d === 1 ? '' : 's'}</span>`;
  return `<div class="row-item"><span class="avatar" style="background:${softColor(p.name)}">${esc(p.name.slice(0, 1).toUpperCase())}</span>
    <div class="grow" data-a="editPerson" data-id="${p.id}" role="button" tabindex="0"><div class="title">${esc(p.name)}</div><div class="meta">${p.note ? esc(p.note) + ' · ' : ''}${p.every ? `every ${p.every} days` : ''}${p.last ? ` · last ${fmtDate(p.last)}` : ''}</div></div>
    <div class="right">${st}<button class="mini-btn" data-a="contacted" data-id="${p.id}">Reached out ✓</button></div></div>`;
}
function vPeople() {
  const list = [...S.people].sort((a, b) => personDue(a) - personDue(b));
  return pageHead('Connections', 'Mentors, friends, family, collaborators — never lose touch.', `<button class="btn primary" data-a="newPerson">+ Add person</button>`) +
    `<section class="card flush">${list.length ? `<div class="list">${list.map(personRow).join('')}</div>` : empty('🤝', 'Add people you want to stay in touch with, and how often.')}</section>`;
}

// ============ INSIGHTS ============
function vInsights() {
  const days = lastNDays(14), lab = days.map(d => d.getDate());
  const score = days.map(d => S.logs[dkey(d)] ? Math.round(dayScore(dkey(d)) * 100) : 0);
  const doneBy = days.map(d => S.tasks.filter(t => t.done && t.doneAt && dkey(new Date(t.doneAt)) === dkey(d)).length);
  const m = new Date(), monthDone = S.tasks.filter(t => t.done && t.doneAt && new Date(t.doneAt).getMonth() === m.getMonth() && new Date(t.doneAt).getFullYear() === m.getFullYear());
  const areaCounts = S.areas.map(a => [a, monthDone.filter(t => t.areaId === a.id).length]).filter(x => x[1]);
  const maxA = Math.max(1, ...areaCounts.map(x => x[1]));
  const box = (v, l) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`;
  return pageHead('Insights') + `<div class="kpis">${box('Lv ' + levelOf(S.xp), S.xp + ' XP total')}${box('🔥 ' + dayStreak(), 'day streak')}${box('💧 ' + waterStreak(), 'water streak')}${box(S.stats.tasksDone, 'tasks done')}${box(S.stats.postsDone, 'posts published')}${box(Object.keys(S.badges).length, 'badges')}</div>
  ${streakCard()}
  <div class="grid-2"><div class="col">
    <section class="card"><div class="card-head"><h2>Daily score, last 14 days</h2></div>${barChart(score, lab, { color: 'var(--lav)', goal: 60, unit: '%' })}<p class="small muted">Dashed line = 60%, the mark that keeps your streak alive.</p></section>
    <section class="card"><div class="card-head"><h2>Tasks completed</h2></div>${barChart(doneBy, lab, { color: 'var(--peach)' })}</section>
  </div><div class="col">
    <section class="card"><div class="card-head"><h2>Where your effort went this month</h2></div>
      ${areaCounts.length ? `<div class="hbars">${areaCounts.map(([a, n]) => `<div class="hbar"><span>${a.emoji} ${esc(a.name)}</span><div class="bar"><span style="width:${n / maxA * 100}%;background:${a.color}"></span></div><b>${n}</b></div>`).join('')}</div>` : '<p class="muted">Complete tasks this month to see the split.</p>'}</section>
    <section class="card"><div class="card-head"><h2>Sleep & water, 14 days</h2></div>${barChart(days.map(d => S.logs[dkey(d)]?.sleep?.hours || 0), lab, { color: 'var(--lav)', goal: S.settings.sleepGoal, unit: ' h' })}${barChart(days.map(d => S.logs[dkey(d)]?.water || 0), lab, { color: 'var(--sky)', goal: S.settings.waterGoal })}</section>
  </div></div>`;
}

// ============ SETTINGS ============
function vSettings() {
  const st = S.settings, cloud = Cloud.status();
  const evCount = buildEvents().filter(e => e.at > Date.now()).length;
  const cloudTxt = {
    off: 'Not set up. Your data is saved on this device only.',
    loading: 'Connecting…', syncing: 'Loading your planner…',
    signedOut: 'Ready. Sign in to sync across your devices.',
    on: `Signed in as <b>${esc(cloud.email || '')}</b>. Your planner is private to this account and syncs to every device you sign in on.`,
    error: 'Could not connect: ' + esc(cloud.error || ''),
  }[cloud.state];
  let runTxt = '';
  if (cloud.state === 'on') {
    if (!cloud.lastRun) runTxt = `<p class="small status warn">⚠️ The reminder sender on GitHub hasn't reported in yet. Check the Actions tab for a green ✓.</p>`;
    else {
      const ago = Math.round((Date.now() - cloud.lastRun) / 60000);
      runTxt = ago <= 45 ? `<p class="small status ok">✅ Reminder sender is running (last check ${ago < 1 ? 'just now' : ago + ' min ago'}).</p>`
        : `<p class="small status warn">⚠️ Reminder sender last ran ${ago < 120 ? ago + ' min' : Math.round(ago / 60) + ' h'} ago. It should run every 15 min, so check GitHub Actions.</p>`;
    }
  }
  const notif = ('Notification' in window) ? Notification.permission : 'unsupported';
  return pageHead('Settings') + `<div class="grid-2"><div class="col">
  ${accountCard()}${settingsExtras()}${notifySettingsCard()}
  <section class="card"><div class="card-head"><h2>Basics</h2><button class="btn small" data-a="editBasics">Edit</button></div>
    <dl class="kv"><dt>Name</dt><dd>${esc(st.name) || '—'}</dd><dt>Water goal</dt><dd>${st.waterGoal} glasses</dd><dt>Sleep goal</dt><dd>${st.sleepGoal} h</dd><dt>Goal weight</dt><dd>${st.weightGoal ? st.weightGoal + ' kg' : '—'}</dd><dt>Currency</dt><dd>${esc(st.currency)}</dd></dl></section>
  <section class="card"><div class="card-head"><h2>Life areas</h2><button class="link small" data-a="newArea">+ Add</button></div>
    <div class="list compact">${S.areas.map(a => `<div class="row-item" data-a="editArea" data-id="${a.id}" role="button" tabindex="0">${areaDot(a.id)}<div class="grow">${a.emoji} ${esc(a.name)}</div><span class="muted">✎</span></div>`).join('')}</div></section>
  <section class="card"><div class="card-head"><h2>Daily habits</h2><button class="link small" data-a="newHabit">+ Add</button></div>
    <div class="list compact">${S.habits.map(h => `<div class="row-item" data-a="editHabit" data-id="${h.id}" role="button" tabindex="0">${areaDot(h.areaId)}<div class="grow">${h.emoji} ${esc(h.name)}</div><span class="muted">✎</span></div>`).join('')}</div></section>
  <section class="card"><div class="card-head"><h2>Backup</h2></div>
    <div class="row wrap"><button class="btn small" data-a="exportJSON">Download backup</button><button class="btn small" data-a="importJSON">Restore backup</button><button class="btn small ghost danger" data-a="resetAll">Reset everything</button></div></section>
  </div><div class="col">
  <section class="card"><div class="card-head"><h2>☁️ Sync across devices</h2></div>
    <p class="small">${cloudTxt}</p>
    <div class="row wrap">${(cloud.state === 'off' || cloud.state === 'error') && !cloud.fromFile ? `<button class="btn small primary" data-a="setupCloud">Connect Firebase</button>` : ''}
      ${cloud.state === 'signedOut' ? `<button class="btn small primary" data-a="signIn">Sign in with Google</button>` : ''}
      ${cloud.state === 'on' ? `<button class="btn small" data-a="signOut">Sign out</button>` : ''}
      ${cloud.state !== 'off' && !cloud.fromFile ? `<button class="btn small ghost" data-a="setupCloud">Change settings</button>` : ''}</div></section>
  <section class="card"><div class="card-head"><h2>🔔 Notifications</h2></div>
    <p class="small">${notif === 'granted' ? (cloud.push ? 'On. Reminders arrive even when the app is closed.' : cloud.state === 'on' ? 'Allowed on this device. Tap “Turn on” to register it for push reminders.' : 'Allowed. Connect and sign in to get reminders when the app is closed.') : notif === 'denied' ? 'Blocked in your browser settings for this site.' : notif === 'unsupported' ? 'This browser does not support notifications. On iPhone, add the app to your home screen first.' : 'Off.'}</p>
    ${runTxt}<p class="small muted">${evCount} reminders scheduled for the next 30 days${cloud.tokenCount ? ` · ${cloud.tokenCount} device${cloud.tokenCount === 1 ? '' : 's'} registered` : ''}.</p>
    <div class="row wrap"><button class="btn small primary" data-a="enableNotif">Turn on for this device</button><button class="btn small" data-a="testNotif">Send a test</button></div></section>
  <section class="card"><div class="card-head"><h2>Reminder rules</h2><button class="btn small" data-a="editReminderRules">Edit</button></div>
    <dl class="kv"><dt>Before deadlines</dt><dd>${st.remindBefore.map(beforeLabel).join(', ') || 'none'}</dd>
    <dt>Quiet hours</dt><dd>${st.quiet.on ? `${st.quiet.from} – ${st.quiet.to}` : 'off'}</dd>
    <dt>Water</dt><dd>${st.water.on ? `every ${st.water.every} h, ${st.water.from} – ${st.water.to}` : 'off'}</dd></dl></section>
  <section class="card"><div class="card-head"><h2>Daily routine reminders</h2><button class="link small" data-a="newRoutine">+ Add</button></div>
    <div class="list compact">${st.routines.map(r => `<div class="row-item" data-a="editRoutine" data-id="${r.id}" role="button" tabindex="0"><b class="slot-time">${r.time}</b><div class="grow">${esc(r.label)}<div class="meta">${r.days.length === 7 ? 'Every day' : r.days.map(d => DAYS[d]).join(', ')}</div></div><span class="muted">✎</span></div>`).join('') || '<p class="muted">No routine reminders.</p>'}</div></section>
  </div></div>`;
}

const VIEWS = { today: vToday, tasks: vTasks, goals: vGoals, health: vHealth, rewards: vRewards, more: vMore, timetable: vTimetable, lists: vLists, content: vContent, ideas: vIdeas, bucket: vBucket, money: vMoney, insights: vInsights, settings: vSettings, links: vLinks, spaces: vSpaces };
/* Part 3c: focus goals, weekly priorities, My Spaces, life phase, platform & startup lists */

const HORIZONS = [['life', '✨ Life vision'], ['long', '🌳 Long-term'], ['year', 'This year'], ['quarter', 'This quarter'], ['month', 'This month'], ['week', 'This week'], ['day', 'Today']];
const FREQS = [['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month'], ['once', 'One-time']];
const platEmoji = name => (S.platforms.find(p => p.name === name) || { emoji: '🌐' }).emoji;
const starBtn = (kind, x) => `<button class="tool ${isStar(x) ? 'on' : ''}" data-a="star" data-k="${kind}" data-id="${x.id}" title="Priority this week" aria-label="${isStar(x) ? 'Remove from' : 'Add to'} this week's priorities">${isStar(x) ? '★' : '☆'}</button>`;

// ---------- life phase ----------
function phasePill() {
  const ph = S.phase;
  if (!ph.name) return `<button class="phase-pill empty" data-a="editPhase">🌷 Set your current life phase</button>`;
  const d = ph.until ? Math.ceil((parseDate(ph.until) - Date.now()) / 864e5) : null;
  return `<button class="phase-pill" data-a="editPhase" title="${esc(ph.note || '')}">${esc(ph.emoji || '🌷')} <b>${esc(ph.name)}</b>${d != null ? ` · ${d > 0 ? d + ' days left' : 'ended'}` : ''}</button>`;
}

// ---------- focus goals ----------
function ring(frac, size = 74, color = '#A13F7A') {
  const r = size / 2 - 7, c = 2 * Math.PI * r, off = c * (1 - clamp(frac, 0, 1));
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-label="${Math.round(frac * 100)}%">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(58,37,68,.12)" stroke-width="8"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="54%" text-anchor="middle" class="ring-t">${Math.round(frac * 100)}%</text></svg>`;
}
function focusBlock() {
  const fg = S.goals.filter(g => g.focus && !g.done).slice(0, 2);
  if (!fg.length) return `<section class="focus-empty" data-a="goFocus" role="button" tabindex="0"><span class="shape-blob"></span><div><b>🎯 Choose your 2 focus goals</b><p>Pick the two goals that matter most in this phase. They'll live here, front and centre.</p></div><span class="arrow">→</span></section>`;
  return `<div class="focus-grid">${fg.map((g, i) => {
    const ts = S.tasks.filter(t => t.goalId === g.id), dn = ts.filter(t => t.done).length;
    const frac = ts.length ? dn / ts.length : 0;
    const next = ts.filter(t => !t.done).sort((a, b) => (parseDate(a.deadline) || 9e15) - (parseDate(b.deadline) || 9e15)).slice(0, 3);
    const d = g.deadline ? Math.ceil((parseDate(g.deadline) - Date.now()) / 864e5) : null;
    return `<section class="focus-card f${i}">
      <span class="deco d1"></span><span class="deco d2"></span>
      <div class="focus-top">${ring(frac)}<div class="grow"><span class="eyebrow">Focus goal ${i + 1} · ${esc(areaOf(g.areaId).emoji)} ${esc(areaOf(g.areaId).name)}</span>
        <h3 data-a="editGoal" data-id="${g.id}" role="button" tabindex="0">${esc(g.title)}</h3>
        <span class="meta">${ts.length ? `${dn} of ${ts.length} steps done` : 'Add steps to track progress'}${d != null ? ` · ${d >= 0 ? d + ' days left' : 'overdue'}` : ''}</span></div></div>
      <div class="focus-steps">${next.map(t => `<div class="step"><button class="check" style="--c:#fff" data-a="toggleTask" data-id="${t.id}" aria-label="Done">${''}</button><span class="grow" data-a="editTask" data-id="${t.id}" role="button" tabindex="0">${esc(t.title)}</span>${dueBadge(t.deadline)}</div>`).join('') || '<p class="small">No open steps. What\'s the next small action?</p>'}</div>
      <button class="btn small" data-a="newTask" data-goal="${g.id}">+ Next step</button></section>`;
  }).join('')}${fg.length === 1 ? `<section class="focus-card add" data-a="goFocus" role="button" tabindex="0"><span class="plus">＋</span><b>Add a second focus goal</b></section>` : ''}</div>`;
}

// ---------- this week's priorities ----------
function starredItems() {
  const out = [];
  S.tasks.filter(isStar).forEach(t => out.push({ kind: 'task', x: t }));
  S.goals.filter(isStar).forEach(g => out.push({ kind: 'goal', x: g }));
  S.content.filter(isStar).forEach(c => out.push({ kind: 'content', x: c }));
  S.spaces.filter(isStar).forEach(sp => out.push({ kind: 'space', x: sp }));
  return out;
}
function prioritiesCard() {
  const it = starredItems(), done = it.filter(o => o.kind === 'task' ? o.x.done : o.kind === 'goal' ? o.x.done : o.kind === 'content' ? o.x.stage === 'Posted' : false).length;
  const wk = new Date(weekKey()).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `<section class="card prio-card"><div class="card-head"><h2>⭐ This week's priorities</h2><button class="btn small" data-a="pickPriorities">Choose</button></div>
    ${it.length ? `<p class="small muted">Week of ${wk} · ${done}/${it.length} done</p>${progressBar(it.length ? done / it.length : 0, '#A13F7A')}
    <div class="list">${it.map(o => {
      if (o.kind === 'task') return taskRow(o.x);
      if (o.kind === 'goal') return `<a class="row-item" href="#goals"><span class="check ghost">🎯</span><div class="grow"><div class="title">${esc(o.x.title)}</div><div class="meta">Goal</div></div>${dueBadge(o.x.deadline)}</a>`;
      if (o.kind === 'content') return `<a class="row-item" href="#content"><span class="check ghost">${platEmoji(o.x.platform)}</span><div class="grow"><div class="title">${esc(o.x.title)}</div><div class="meta">${esc(o.x.platform)} · ${esc(o.x.stage)}</div></div>${o.x.stage !== 'Posted' ? dueBadge(o.x.deadline) : '✅'}</a>`;
      return `<a class="row-item" href="#spaces" data-a="openSpace" data-id="${o.x.id}"><span class="check ghost">${o.x.emoji}</span><div class="grow"><div class="title">${esc(o.x.name)}</div><div class="meta">Space · ${spaceProgress(o.x).txt}</div></div></a>`;
    }).join('')}</div>`
      : `<p class="muted">Pick the tasks, goals, content or spaces that matter most this week. Tap ☆ anywhere, or use “Choose”.</p>`}</section>`;
}
function priorityPickerHTML() {
  const row = (kind, x, title, meta) => `<label class="pick"><input type="checkbox" ${isStar(x) ? 'checked' : ''} data-ch="pickStar" data-k="${kind}" data-id="${x.id}"><span class="grow"><b>${esc(title)}</b><small>${esc(meta)}</small></span></label>`;
  const tasks = S.tasks.filter(t => !t.done).sort((a, b) => (parseDate(a.deadline) || 9e15) - (parseDate(b.deadline) || 9e15));
  const goals = S.goals.filter(g => !g.done), content = S.content.filter(c => c.stage !== 'Posted');
  const sec = (h, arr) => arr.length ? `<h3 class="pick-h">${h}</h3>${arr.join('')}` : '';
  return `<header class="sheet-head"><h2>⭐ Priorities this week</h2><button class="icon-btn" data-a="closeModal" aria-label="Close">✕</button></header>
    <p class="small muted">Tick what matters most right now. Priorities reset every Monday.</p>
    <div class="picker">${sec('Tasks & deadlines', tasks.map(t => row('task', t, t.title, (t.deadline ? countdown(t.deadline).txt + ' · ' : '') + areaOf(t.areaId).name)))}
    ${sec('Goals', goals.map(g => row('goal', g, g.title, (HORIZONS.find(h => h[0] === g.horizon) || ['', ''])[1])))}
    ${sec('Content', content.map(c => row('content', c, c.title || 'Untitled', c.platform + ' · ' + c.stage)))}
    ${sec('Spaces', S.spaces.map(sp => row('space', sp, sp.emoji + ' ' + sp.name, sp.items.length + ' items')))}
    ${!tasks.length && !goals.length && !content.length ? '<p class="muted">Add some tasks or goals first.</p>' : ''}</div>
    <footer class="sheet-foot"><span></span><button class="btn primary" data-a="closeModal">Done</button></footer>`;
}

// ---------- My Spaces ----------
function spaceProgress(sp, dayK = dkey()) {
  const cur = sp.items.filter(i => i.freq !== 'once' || !itemDone(i, dayK));
  const n = sp.items.length, d = sp.items.filter(i => itemDone(i, dayK)).length;
  return { frac: n ? d / n : 0, txt: `${d}/${n} done`, open: cur.length };
}
function spaceItemRow(sp, it) {
  const v = spaceVal(it, dkey()), done = itemDone(it);
  const control = it.type === 'count'
    ? `<div class="counter"><button class="cbtn" data-a="spaceStep" data-s="${sp.id}" data-id="${it.id}" data-v="-1" aria-label="Less">−</button>
        <button class="cval" data-a="spaceSet" data-s="${sp.id}" data-id="${it.id}" title="Type a number">${v}<small>/${it.target || 1}${it.unit ? ' ' + esc(it.unit) : ''}</small></button>
        <button class="cbtn" data-a="spaceStep" data-s="${sp.id}" data-id="${it.id}" data-v="1" aria-label="More">+</button></div>`
    : `<button class="check ${done ? 'on' : ''}" style="--c:${sp.color || '#E3D6F8'}" data-a="spaceTick" data-s="${sp.id}" data-id="${it.id}" aria-label="Done">${done ? '✓' : ''}</button>`;
  const per = { daily: 'today', weekly: 'this week', monthly: 'this month', once: 'one-time' }[it.freq];
  return `<div class="row-item space-item ${done ? 'is-done' : ''}">${it.type === 'count' ? '' : control}
    <div class="grow" data-a="editSpaceItem" data-s="${sp.id}" data-id="${it.id}" role="button" tabindex="0"><div class="title">${esc(it.name)}</div>
    <div class="meta">${per}${it.time ? ` · 🔔 ${it.time}` : ''}${it.type === 'count' ? progressBar(Math.min(1, v / (it.target || 1)), sp.color || '#E3D6F8') : ''}</div></div>
    ${it.type === 'count' ? control : ''}${it.due && !done ? dueBadge(it.due) : ''}</div>`;
}
function pinnedSpaces() {
  return S.spaces.filter(sp => sp.pinned).map(sp => {
    const items = sp.items.filter(i => i.freq === 'daily' || i.freq === 'weekly');
    return `<section class="card space-card" style="--card:${sp.color || '#E3D6F8'}"><span class="corner-shape"></span>
      <div class="card-head"><h2>${sp.emoji} ${esc(sp.name)}</h2><a class="link small" href="#spaces" data-a="openSpace" data-id="${sp.id}">Open</a></div>
      <div class="list compact">${items.map(it => spaceItemRow(sp, it)).join('') || '<p class="muted small">No daily or weekly items yet.</p>'}</div></section>`;
  }).join('');
}
function vSpaces() {
  if (!S.spaces.find(x => x.id === UI.spaceId)) UI.spaceId = S.spaces[0]?.id;
  const sp = S.spaces.find(x => x.id === UI.spaceId);
  const tabs = `<div class="chips">${S.spaces.map(x => `<button class="chip ${x.id === UI.spaceId ? 'on' : ''}" data-a="openSpace" data-id="${x.id}">${x.emoji} ${esc(x.name)}</button>`).join('')}<button class="chip add" data-a="newSpace">+ New space</button></div>`;
  if (!sp) return pageHead('My spaces', 'Your own sections: spirituality, self-care, hobbies, anything.') + tabs + empty('🪷', 'Create a space and fill it with the things you want to keep up with.');
  const groups = FREQS.map(([f, label]) => [label, sp.items.filter(i => i.freq === f)]).filter(g => g[1].length);
  const pr = spaceProgress(sp);
  return pageHead('My spaces', 'Your own sections: spirituality, self-care, hobbies, anything. Items can be ticks or counts, daily, weekly or monthly.') + tabs + `
    <section class="card space-hero" style="--card:${sp.color || '#E3D6F8'}"><span class="corner-shape"></span>
      <div class="card-head"><h2 class="space-title">${sp.emoji} ${esc(sp.name)}</h2>
        <div class="row-tools">${starBtn('space', sp)}<button class="tool ${sp.pinned ? 'on' : ''}" data-a="pinSpace" data-id="${sp.id}" title="Show on Today">📌</button><button class="icon-btn" data-a="editSpace" data-id="${sp.id}" aria-label="Edit space">✎</button></div></div>
      <div class="row">${ring(pr.frac, 60)}<div class="grow"><b>${pr.txt}</b><div class="small muted">${sp.pinned ? '📌 Pinned to Today — daily items count as petals in your flower' : 'Tap 📌 to show this space on Today'}</div></div></div>
    </section>
    <section class="card"><div class="card-head"><h2>Streak</h2></div>${heatmap(k => { const it = sp.items.filter(i => i.freq === 'daily'); return it.length ? it.filter(i => itemDone(i, k)).length / it.length : 0; })}</section>
    ${groups.map(([label, items]) => `<section class="card" style="--card:#FDF3F8"><div class="card-head"><h2>${label}</h2></div><div class="list">${items.map(it => spaceItemRow(sp, it)).join('')}</div></section>`).join('')}
    <button class="btn primary" data-a="newSpaceItem" data-s="${sp.id}">+ Add to ${esc(sp.name)}</button>`;
}

// ---------- settings extras ----------
function settingsExtras() {
  const hideable = [...NAV, ...MORE].filter(n => !['today', 'more', 'settings'].includes(n[0]));
  return `<section class="card"><div class="card-head"><h2>🌷 Current life phase</h2><button class="btn small" data-a="editPhase">Edit</button></div>
      ${S.phase.name ? `<p><b>${esc(S.phase.emoji)} ${esc(S.phase.name)}</b>${S.phase.until ? ` · until ${fmtDate(S.phase.until)}` : ''}</p>${S.phase.note ? `<p class="small muted">${esc(S.phase.note)}</p>` : ''}` : '<p class="small muted">Name the season you\'re in, like “JRF year 1 + channel growth”. It shows on Today with a countdown.</p>'}
      <p class="small muted">Focus goals: ${S.goals.filter(g => g.focus && !g.done).map(g => esc(g.title)).join(', ') || 'none yet — tap 🎯 on a goal'}</p></section>
    <section class="card"><div class="card-head"><h2>🧩 Sections to show</h2></div>
      <p class="small muted">Hide what you don't need in this phase. Nothing is deleted.</p>
      <div class="checkrow">${hideable.map(n => `<label class="pill-check"><input type="checkbox" data-ch="toggleSection" value="${n[0]}" ${S.hidden.includes(n[0]) ? '' : 'checked'}><span>${n[2]} ${esc(n[1])}</span></label>`).join('')}</div></section>
    <section class="card"><div class="card-head"><h2>🗂️ Your lists</h2></div>
      <div class="row wrap"><button class="btn small" data-a="manage" data-v="platforms">Content platforms (${S.platforms.length})</button><button class="btn small" data-a="manage" data-v="ventures">Startups (${S.ventures.length})</button><button class="btn small" data-a="go" data-v="spaces">My spaces (${S.spaces.length})</button><button class="btn small" data-a="go" data-v="rewards">Reward activities</button></div></section>`;
}

// ---------- manager for platforms / startups ----------
function managerHTML(kind) {
  const arr = kind === 'platforms' ? S.platforms : S.ventures;
  const title = kind === 'platforms' ? 'Content platforms' : 'Startups & projects';
  return `<header class="sheet-head"><h2>${title}</h2><button class="icon-btn" data-a="closeModal" aria-label="Close">✕</button></header>
    <div class="list">${arr.map(x => `<div class="row-item"><span class="big-e">${esc(x.emoji)}</span><div class="grow title">${esc(x.name)}</div>
      <button class="icon-btn" data-a="manEdit" data-k="${kind}" data-id="${x.id}" aria-label="Edit">✎</button></div>`).join('')}</div>
    <footer class="sheet-foot"><button class="btn" data-a="manEdit" data-k="${kind}">+ Add</button><button class="btn primary" data-a="closeModal">Done</button></footer>`;
}
/* Part 3d: content planner sheet (daily / weekly / long-term) and money with categories */

Object.assign(UI, { contentView: 'plan', planMode: 'daily', planAnchor: dkey(), moneyMonth: dkey().slice(0, 7) });

// ---------- content planner ----------
function planColumns() {
  const [y, m, d] = UI.planAnchor.split('-').map(Number), a = new Date(y, m - 1, d);
  if (UI.planMode === 'daily') {
    const mon = addDays(a, -dayIdx(a));
    return { label: `Week of ${mon.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`, cols: Array.from({ length: 7 }, (_, i) => { const x = addDays(mon, i); return { key: 'd:' + dkey(x), head: `${DAYS[i]} ${x.getDate()}`, today: dkey(x) === dkey() }; }) };
  }
  if (UI.planMode === 'weekly') {
    const first = new Date(y, m - 1, 1), mon = addDays(first, -dayIdx(first));
    const cols = [];
    for (let i = 0; i < 6; i++) { const x = addDays(mon, i * 7); if (i > 0 && x.getMonth() !== m - 1) break; cols.push({ key: 'w:' + dkey(x), head: `Wk of ${x.getDate()} ${x.toLocaleDateString(undefined, { month: 'short' })}`, today: dkey(x) === weekKey() }); }
    return { label: first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), cols };
  }
  const cols = Array.from({ length: 6 }, (_, i) => { const x = new Date(y, m - 1 + i, 1); const k = `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; return { key: 'm:' + k, head: x.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), today: k === dkey().slice(0, 7) }; });
  return { label: `${cols[0].head} → ${cols[5].head}`, cols };
}
function weekDoneCount(p) {
  const mon = new Date(weekKey()); let n = 0;
  for (let i = 0; i < 7; i++) { const c = S.contentPlan.cells[`d:${dkey(addDays(mon, i))}|${p.id}`]; if (c && c.done) n++; }
  const wc = S.contentPlan.cells[`w:${weekKey()}|${p.id}`]; if (wc && wc.done) n++;
  return n;
}
function vPlanner(head) {
  const { label, cols } = planColumns();
  const G = S.contentPlan.goals;
  const rows = S.platforms.map(p => {
    const g = G[p.id] || {}, done = weekDoneCount(p), tgt = +g.weekly || 0;
    return `<tr><th class="pl-name">${p.emoji} ${esc(p.name)}</th>
      <td class="pl-goal" data-a="planGoal" data-id="${p.id}">${g.goal ? esc(g.goal) : '<span class="ph">+ goal</span>'}</td>
      <td class="pl-tgt" data-a="planGoal" data-id="${p.id}">${tgt ? `<b class="${done >= tgt ? 'met' : ''}">✓ ${done}/${tgt}</b><small>this week</small>` : '<span class="ph">set</span>'}</td>
      ${cols.map(c => {
        const key = `${c.key}|${p.id}`, cell = S.contentPlan.cells[key];
        return `<td class="pcell ${cell && cell.done ? 'done' : ''} ${c.today ? 'is-now' : ''}">
          ${cell && cell.text ? `<button class="ptick ${cell.done ? 'on' : ''}" data-a="planTick" data-key="${key}" aria-label="Mark done">${cell.done ? '✓' : ''}</button>` : ''}
          <div class="ptext" data-a="planCell" data-key="${key}" role="button" tabindex="0">${cell && cell.text ? esc(cell.text) : '<span class="ph">+</span>'}</div></td>`;
      }).join('')}</tr>`;
  }).join('');
  const modes = chips([['daily', '☀️ Daily'], ['weekly', '🗓️ Weekly'], ['long', '🌳 Long-term']], UI.planMode, 'planMode');
  return head + `<div class="split-row">${modes}<div class="row wrap"><button class="btn small" data-a="exportPlan">Export Excel</button></div></div>
    <div class="month-nav"><button class="icon-btn" data-a="planNav" data-v="-1" aria-label="Previous">‹</button><h2>${label}</h2><button class="icon-btn" data-a="planNav" data-v="1" aria-label="Next">›</button><button class="btn small ghost" data-a="planToday">Today</button></div>
    <div class="tt-wrap"><table class="plan"><tr><th class="corner">Platform</th><th>Goal</th><th>Target</th>${cols.map(c => `<th class="${c.today ? 'is-today' : ''}">${c.head}</th>`).join('')}</tr>${rows}</table></div>
    <p class="small muted">Tap a cell to write what's planned, then tick ✓ when it's done. Set a goal and a weekly target for each platform; ticks this week count towards it. Add platforms with ⚙️ Platforms.</p>`;
}

// ---------- money ----------
const fmtMoney = n => S.settings.currency + (Math.round(n * 100) / 100).toLocaleString('en-IN');
function monthTx(month = UI.moneyMonth) { return S.money.tx.filter(t => t.date && t.date.slice(0, 7) === month); }
function catOf(t) {
  const list = t.type === 'income' ? S.money.incomeCats : S.money.expenseCats;
  if (t.type === 'saving') { const g = S.savings.find(x => x.id === t.goalId); return { name: g ? g.name : 'Savings', emoji: g ? (g.emoji || '💰') : '💰' }; }
  return list.find(c => c.id === t.cat) || { name: 'Other', emoji: '✨' };
}
function vMoneyCats() {
  const txs = monthTx(), sum = type => txs.filter(t => t.type === type).reduce((a, t) => a + (+t.amount || 0), 0);
  const inc = sum('income'), exp = sum('expense'), aside = sum('saving'), left = inc - exp - aside;
  const [y, m] = UI.moneyMonth.split('-').map(Number), mName = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const bars = (cats, type) => {
    const rows = cats.map(c => [c, txs.filter(t => t.type === type && t.cat === c.id).reduce((a, t) => a + (+t.amount || 0), 0)]).filter(([c, v]) => v || (type === 'expense' && +c.budget));
    const max = Math.max(1, ...rows.map(r => Math.max(r[1], +r[0].budget || 0)));
    return rows.length ? `<div class="mbars">${rows.sort((a, b) => b[1] - a[1]).map(([c, v]) => {
      const b = +c.budget || 0, over = b && v > b;
      return `<div class="mbar"><span class="mb-l">${c.emoji} ${esc(c.name)}</span><div class="bar"><span style="width:${(b ? Math.min(v / b, 1) : v / max) * 100}%;background:${over ? '#D4577F' : type === 'income' ? '#7FC6A4' : '#C79AE0'}"></span></div>
        <b>${fmtMoney(v)}</b>${b ? `<small class="${over ? 'over' : ''}">${over ? 'over ' + fmtMoney(v - b) : fmtMoney(b - v) + ' left'} of ${fmtMoney(b)}</small>` : ''}</div>`;
    }).join('')}</div>` : `<p class="muted small">Nothing yet this month.</p>`;
  };
  const txList = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);
  const savings = S.savings.map(s => {
    const frac = +s.target ? (+s.saved || 0) / +s.target : 0;
    return `<div class="saving-row"><div class="grow"><b>${esc(s.emoji || '💰')} ${esc(s.name)}</b><div class="small muted">${fmtMoney(+s.saved || 0)} of ${fmtMoney(+s.target || 0)}</div>${progressBar(frac, '#D9B06A')}</div>
      <div class="right">${frac < 1 ? dueBadge(s.deadline) : '<span class="due due-ok">Reached 🎉</span>'}<span class="row-tools"><button class="mini-btn" data-a="addMoney" data-id="${s.id}">+ Add</button><button class="tool" data-a="editSaving" data-id="${s.id}" aria-label="Edit">✎</button></span></div></div>`;
  }).join('');
  return pageHead('Money', 'Where it came from, where it went, and what you kept.', `<button class="btn" data-a="manageCats">⚙️ Categories</button><button class="btn" data-a="newIncome">+ Income</button><button class="btn primary" data-a="newExpense">+ Expense</button>`) + `
    <div class="month-nav"><button class="icon-btn" data-a="moneyNav" data-v="-1" aria-label="Previous month">‹</button><h2>${mName}</h2><button class="icon-btn" data-a="moneyNav" data-v="1" aria-label="Next month">›</button><button class="btn small ghost" data-a="exportMoney">Export Excel</button></div>
    <div class="kpis money-kpis"><div class="kpi"><b>${fmtMoney(inc)}</b><span>came in</span></div><div class="kpi"><b>${fmtMoney(exp)}</b><span>spent</span></div>
      <div class="kpi"><b>${fmtMoney(aside)}</b><span>put in savings</span></div><div class="kpi"><b class="${left < 0 ? 'neg' : ''}">${fmtMoney(left)}</b><span>${left < 0 ? 'over income' : 'left over'}</span></div></div>
    <div class="grid-2"><div class="col">
      <section class="card"><div class="card-head"><h2>Where it went</h2><button class="link small" data-a="newExpense">+ Expense</button></div>${bars(S.money.expenseCats, 'expense')}
        <p class="small muted">Set a monthly budget for any category in ⚙️ Categories.</p></section>
      <section class="card"><div class="card-head"><h2>Money in</h2><button class="link small" data-a="newIncome">+ Income</button></div>${bars(S.money.incomeCats, 'income')}</section>
    </div><div class="col">
      <section class="card"><div class="card-head"><h2>Savings goals</h2><button class="link small" data-a="newSaving">+ Goal</button></div>${savings || '<p class="muted small">Add a goal, like an emergency fund. Money you add is counted as “put in savings”.</p>'}</section>
      <section class="card"><div class="card-head"><h2>This month's entries</h2><span class="muted small">${txList.length}</span></div>
        ${txList.length ? `<div class="list compact">${txList.slice(0, 60).map(t => { const c = catOf(t); return `<div class="row-item" data-a="editTx" data-id="${t.id}" role="button" tabindex="0"><span class="big-e">${c.emoji}</span>
          <div class="grow"><div class="title">${esc(t.note || c.name)}</div><div class="meta">${esc(c.name)} · ${fmtDate(t.date)}${t.mode ? ' · ' + esc(t.mode) : ''}</div></div>
          <b class="${t.type === 'income' ? 'plus' : t.type === 'saving' ? 'gold' : 'minus'}">${t.type === 'income' ? '+' : t.type === 'saving' ? '→' : '−'}${fmtMoney(+t.amount || 0)}</b></div>`; }).join('')}</div>` : '<p class="muted small">Tap “+ Expense” or “+ Income” to add your first entry.</p>'}</section>
    </div></div>`;
}
VIEWS.money = vMoneyCats;

function txForm(type, t = {}) {
  const isNew = !t.id, cats = type === 'income' ? S.money.incomeCats : S.money.expenseCats;
  openForm({ title: isNew ? (type === 'income' ? 'Money in' : 'Expense') : 'Edit entry', fields: [
    { k: 'amount', label: `Amount (${S.settings.currency})`, type: 'number', value: t.amount },
    { k: 'cat', label: type === 'income' ? 'Source' : 'Category', type: 'select', options: cats.map(c => [c.id, c.emoji + ' ' + c.name]), value: t.cat || cats[0]?.id },
    { k: 'note', label: 'Note', value: t.note, placeholder: type === 'income' ? 'e.g. September stipend' : 'e.g. Groceries at DMart' },
    { k: 'date', label: 'Date', type: 'date', value: t.date || dkey() },
    { k: 'mode', label: 'Paid by (optional)', type: 'select', options: [['', '—'], ['UPI', 'UPI'], ['Cash', 'Cash'], ['Card', 'Card'], ['Bank', 'Bank transfer']], value: t.mode || '' }],
    onSave: v => { if (!(+v.amount > 0)) { toast('Enter an amount', '💰'); return false; } v.amount = +v.amount; if (isNew) S.money.tx.push({ id: uid(), type, created: Date.now(), ...v }); else Object.assign(t, v); UI.moneyMonth = v.date.slice(0, 7); return true; },
    onDelete: isNew ? null : () => { S.money.tx = S.money.tx.filter(x => x !== t); save(); } });
}
/* Part 3e: Sankalpa — mandalas, shloka of the day, daily intention, festivals & vrat,
   weekly review, day planner, streak heatmaps, welcome screen, settings extras */

Object.assign(UI, { planDate: dkey(), festMonth: dkey().slice(0, 7), heat: 'overall', pickTask: null });

// ---------- mandala (line-art, generated) ----------
function mandalaSVG(size = 300, color = '#B8913F', op = 0.5) {
  const c = size / 2, R = size / 2 - 4;
  const ring = (n, a, b, w, rot = 0) => Array.from({ length: n }, (_, i) =>
    `<ellipse cx="${c}" cy="${c - (a + b) / 2}" rx="${w}" ry="${(b - a) / 2}" transform="rotate(${rot + i * 360 / n} ${c} ${c})"/>`).join('');
  const dots = (n, r, rr) => Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; return `<circle cx="${(c + r * Math.sin(t)).toFixed(1)}" cy="${(c - r * Math.cos(t)).toFixed(1)}" r="${rr}"/>`; }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><g fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="1.2">
    <circle cx="${c}" cy="${c}" r="${R * 0.08}"/>${ring(8, R * 0.1, R * 0.32, R * 0.07)}<circle cx="${c}" cy="${c}" r="${R * 0.36}"/>
    ${ring(16, R * 0.38, R * 0.6, R * 0.06, 11.25)}<circle cx="${c}" cy="${c}" r="${R * 0.64}" stroke-dasharray="2 5"/>
    ${ring(24, R * 0.66, R * 0.86, R * 0.045)}<circle cx="${c}" cy="${c}" r="${R * 0.9}"/><circle cx="${c}" cy="${c}" r="${R}"/></g>
    <g fill="${color}" fill-opacity="${op}">${dots(24, R * 0.95, 1.6)}${dots(8, R * 0.36, 2)}</g></svg>`;
}
const lotusIcon = (s = 18, col = '#B8913F') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><g fill="none" stroke="${col}" stroke-width="1.4" stroke-linejoin="round"><path d="M12 4c2.2 2.6 2.2 7.4 0 10-2.2-2.6-2.2-7.4 0-10z"/><path d="M12 14c-2.6-.4-5.6-2.6-6.4-6.2 2.8.2 5.2 1.9 6.4 4.4"/><path d="M12 14c2.6-.4 5.6-2.6 6.4-6.2-2.8.2-5.2 1.9-6.4 4.4"/><path d="M4 16.5c2.6 1.6 5.4 2 8 2s5.4-.4 8-2"/></g></svg>`;

// ---------- shloka of the day (Bhagavad Gita; meanings are simple paraphrases) ----------
const SHLOKAS = [
  ['2.47', 'karmaṇy evādhikāras te mā phaleṣu kadācana · mā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi', 'Your right is to the work alone, never to its results. Don\'t let results be your motive — and don\'t cling to inaction either.'],
  ['2.48', 'yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya · siddhy-asiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate', 'Act from a steady centre, letting go of attachment. Staying even in success and failure — that evenness is yoga.'],
  ['2.14', 'mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ · āgamāpāyino ’nityās tāṁs titikṣasva bhārata', 'Heat and cold, pleasure and pain come and go. They are temporary — learn to bear them patiently.'],
  ['2.50', 'buddhi-yukto jahātīha ubhe sukṛta-duṣkṛte · tasmād yogāya yujyasva yogaḥ karmasu kauśalam', 'Yoga is skill in action. Commit yourself fully to it.'],
  ['2.56', 'duḥkheṣv anudvigna-manāḥ sukheṣu vigata-spṛhaḥ · vīta-rāga-bhaya-krodhaḥ sthita-dhīr munir ucyate', 'Unshaken in sorrow, not craving in joy, free of attachment, fear and anger — such a person is steady in wisdom.'],
  ['2.40', 'nehābhikrama-nāśo ’sti pratyavāyo na vidyate · sv-alpam apy asya dharmasya trāyate mahato bhayāt', 'No effort on this path is ever wasted. Even a little of it protects you from great fear.'],
  ['3.8', 'niyataṁ kuru karma tvaṁ karma jyāyo hy akarmaṇaḥ · śarīra-yātrāpi ca te na prasidhyed akarmaṇaḥ', 'Do your duty — action is better than inaction. Even caring for your body needs action.'],
  ['3.19', 'tasmād asaktaḥ satataṁ kāryaṁ karma samācara · asakto hy ācaran karma param āpnoti pūruṣaḥ', 'Keep doing what must be done, without clinging. Working this way, one reaches the highest.'],
  ['3.21', 'yad yad ācarati śreṣṭhas tat tad evetaro janaḥ · sa yat pramāṇaṁ kurute lokas tad anuvartate', 'Whatever a leader does, others follow. The standard you set, the world takes up.'],
  ['3.35', 'śreyān sva-dharmo viguṇaḥ para-dharmāt sv-anuṣṭhitāt · sva-dharme nidhanaṁ śreyaḥ para-dharmo bhayāvahaḥ', 'Better your own path done imperfectly than another\'s done well.'],
  ['4.38', 'na hi jñānena sadṛśaṁ pavitram iha vidyate · tat svayaṁ yoga-saṁsiddhaḥ kālenātmani vindati', 'Nothing purifies like knowledge. In time, the one steady in practice finds it within.'],
  ['4.39', 'śraddhāvāl labhate jñānaṁ tat-paraḥ saṁyatendriyaḥ · jñānaṁ labdhvā parāṁ śāntim acireṇādhigacchati', 'The one with faith, devotion and self-control gains knowledge — and with it, deep peace soon follows.'],
  ['5.10', 'brahmaṇy ādhāya karmāṇi saṅgaṁ tyaktvā karoti yaḥ · lipyate na sa pāpena padma-patram ivāmbhasā', 'Offer your work to the higher and act without clinging — untouched, like a lotus leaf by water.'],
  ['6.5', 'uddhared ātmanātmānaṁ nātmānam avasādayet · ātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ', 'Lift yourself by your own effort; don\'t pull yourself down. You are your own best friend — and can be your own enemy.'],
  ['6.6', 'bandhur ātmātmanas tasya yenātmaivātmanā jitaḥ · anātmanas tu śatrutve vartetātmaiva śatru-vat', 'For one who has mastered the mind, the mind is a friend. For one who hasn\'t, it acts like an enemy.'],
  ['6.17', 'yuktāhāra-vihārasya yukta-ceṣṭasya karmasu · yukta-svapnāvabodhasya yogo bhavati duḥkha-hā', 'Balance in eating, rest, work, sleep and waking — that kind of yoga removes sorrow.'],
  ['6.19', 'yathā dīpo nivāta-stho neṅgate sopamā smṛtā · yogino yata-cittasya yuñjato yogam ātmanaḥ', 'Like a lamp in a windless place that does not flicker — so is a focused, disciplined mind.'],
  ['6.35', 'asaṁśayaṁ mahā-bāho mano durnigrahaṁ calam · abhyāsena tu kaunteya vairāgyeṇa ca gṛhyate', 'Yes, the mind is restless and hard to hold. But with practice and detachment, it can be steadied.'],
  ['9.22', 'ananyāś cintayanto māṁ ye janāḥ paryupāsate · teṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham', 'To those who stay devoted with a single heart, I bring what they lack and protect what they have.'],
  ['12.13', 'adveṣṭā sarva-bhūtānāṁ maitraḥ karuṇa eva ca · nirmamo nirahaṅkāraḥ sama-duḥkha-sukhaḥ kṣamī', 'Without hatred for any being, friendly and compassionate, free of ego, even in joy and sorrow, forgiving.'],
  ['12.15', 'yasmān nodvijate loko lokān nodvijate ca yaḥ · harṣāmarṣa-bhayodvegair mukto yaḥ sa ca me priyaḥ', 'One who troubles no one and is troubled by no one, free of excitement, envy, fear and anxiety, is dear to Me.'],
  ['17.15', 'anudvega-karaṁ vākyaṁ satyaṁ priya-hitaṁ ca yat · svādhyāyābhyasanaṁ caiva vāṅ-mayaṁ tapa ucyate', 'Speech that is truthful, kind, helpful and never hurtful — with regular study — is the discipline of speech.'],
  ['18.78', 'yatra yogeśvaraḥ kṛṣṇo yatra pārtho dhanur-dharaḥ · tatra śrīr vijayo bhūtir dhruvā nītir matir mama', 'Where wisdom and committed action meet, there will surely be fortune, victory, growth and right conduct.'],
];
function shlokaCard() {
  const d = new Date(), idx = (Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5)) % SHLOKAS.length;
  const [ref, sa, en] = SHLOKAS[idx];
  return `<section class="card shloka"><div class="shloka-mandala">${mandalaSVG(220, '#B8913F', 0.35)}</div>
    <div class="card-head"><h2>Shloka of the day</h2><span class="gold small">Gītā ${ref}</span></div>
    <p class="sa">${esc(sa)}</p><p class="en">${esc(en)}</p></section>`;
}

// ---------- today's Sankalpa (intention) ----------
function intentionCard() {
  const v = S.intentions[dkey()] || '';
  return `<section class="card intention"><div class="card-head"><h2>Today's Sankalpa</h2>${lotusIcon(20)}</div>
    <textarea id="intentIn" data-ch="intention" rows="2" placeholder="Today I resolve to…">${esc(v)}</textarea>
    <p class="small muted">${v ? '🪷 Set. Come back tonight and see how it went.' : 'One line. What do you want today to stand for?'}</p></section>`;
}

// ---------- festivals & vrat ----------
const FEST_TYPES = [['festival', '🪔 Festival'], ['vrat', '🌙 Vrat / fast'], ['puja', '🙏 Puja'], ['birthday', '🎂 Birthday / anniversary'], ['other', '✨ Other']];
const FEST_QUICK = ['Ekadashi', 'Purnima', 'Amavasya', 'Pradosh', 'Sankashti Chaturthi', 'Navratri', 'Dussehra', 'Karva Chauth', 'Diwali', 'Govardhan Puja', 'Bhai Dooj', 'Chhath', 'Makar Sankranti', 'Maha Shivratri', 'Holi', 'Ram Navami', 'Hanuman Jayanti', 'Raksha Bandhan', 'Janmashtami', 'Ganesh Chaturthi'];
const festEmoji = t => (FEST_TYPES.find(x => x[0] === t) || ['', '✨'])[1].split(' ')[0];
function festTodayCard() {
  const k = dkey(), today = S.fest.filter(f => festOn(f, k));
  if (!today.length) return '';
  return `<section class="card fest-today">${today.map(f => `<div class="row-item"><span class="big-e">${festEmoji(f.type)}</span>
    <div class="grow"><div class="title">Today: ${esc(f.name)}</div>${f.note ? `<div class="meta">${esc(f.note)}</div>` : ''}</div>
    ${f.type === 'vrat' ? `<button class="btn small ${f.kept && f.kept[k] ? 'is-on' : 'primary'}" data-a="keepVrat" data-id="${f.id}">${f.kept && f.kept[k] ? '✓ Vrat kept' : 'Mark vrat kept'}</button>` : ''}</div>`).join('')}</section>`;
}
function vUtsav() {
  const [y, m] = UI.festMonth.split('-').map(Number), first = new Date(y, m - 1, 1), dim = new Date(y, m, 0).getDate();
  const mName = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  let cells = Array.from({ length: dayIdx(first) }, () => '<span></span>').join('');
  for (let d = 1; d <= dim; d++) {
    const k = dkey(new Date(y, m - 1, d)), fs = S.fest.filter(f => festOn(f, k));
    cells += `<button class="cal-d ${k === dkey() ? 'today' : ''} ${fs.length ? 'has' : ''}" data-a="newFest" data-date="${k}" title="${esc(fs.map(f => f.name).join(', '))}">${d}${fs.length ? `<i>${festEmoji(fs[0].type)}</i>` : ''}</button>`;
  }
  const upcoming = S.fest.map(f => {
    let next = null; for (let i = 0; i < 400 && !next; i++) { const k = dkey(addDays(new Date(), i)); if (festOn(f, k)) next = k; }
    return [f, next];
  }).filter(x => x[1]).sort((a, b) => a[1].localeCompare(b[1]));
  return pageHead('Festivals & vrat', 'Your sacred calendar. Dates follow your own panchang, so add them as your family observes them.', `<button class="btn primary" data-a="newFest">+ Add</button>`) + `
  <div class="grid-2"><div class="col"><section class="card">
    <div class="card-head"><button class="icon-btn" data-a="festNav" data-v="-1" aria-label="Previous month">‹</button><h2>${mName}</h2><button class="icon-btn" data-a="festNav" data-v="1" aria-label="Next month">›</button></div>
    <div class="cal fest-cal">${DAYS.map(d => `<b>${d[0]}</b>`).join('')}${cells}</div>
    <p class="small muted">Tap a date to add a festival or vrat on it.</p></section></div>
  <div class="col"><section class="card"><div class="card-head"><h2>Coming up</h2></div>
    ${upcoming.length ? `<div class="list">${upcoming.slice(0, 20).map(([f, k]) => `<div class="row-item" data-a="editFest" data-id="${f.id}" role="button" tabindex="0"><span class="big-e">${festEmoji(f.type)}</span>
      <div class="grow"><div class="title">${esc(f.name)}</div><div class="meta">${fmtDate(k)}${f.repeat === 'yearly' ? ' · every year' : ''}${f.note ? ' · ' + esc(f.note) : ''}</div></div>${dueBadge(k)}</div>`).join('')}</div>`
      : empty('🪔', 'Add Ekadashi, Purnima, Navratri, family birthdays — you\'ll get a reminder the evening before and on the morning of.')}
  </section></div></div>`;
}

// ---------- weekly review ----------
const REVIEW_Q = [['wins', '🌟 What went well this week?'], ['lessons', '🌱 What did I learn? What would I do differently?'], ['gratitude', '🙏 What am I grateful for?'], ['next', '🎯 What matters most next week?']];
function weekStats(wk) {
  const mon = parseDate(wk), days = Array.from({ length: 7 }, (_, i) => dkey(addDays(mon, i))), end = addDays(mon, 7);
  const tasks = S.tasks.filter(t => t.done && t.doneAt && t.doneAt >= mon.getTime() && t.doneAt < end.getTime()).length;
  const scores = days.filter(k => S.logs[k]).map(k => dayScore(k));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) : 0;
  const spent = S.money.tx.filter(t => t.type === 'expense' && days.includes(t.date)).reduce((a, t) => a + (+t.amount || 0), 0);
  const posts = S.content.filter(c => c.postedAt && c.postedAt >= mon.getTime() && c.postedAt < end.getTime()).length + Object.entries(S.contentPlan.cells).filter(([k, c]) => c.done && days.some(d => k.startsWith('d:' + d))).length;
  const sadhana = days.filter(k => S.spaces.some(sp => sp.items.some(i => i.freq === 'daily' && itemDone(i, k)))).length;
  return { tasks, avg, spent, posts, sadhana };
}
function vReview() {
  const wk = UI.reviewWeek || weekKey(), r = S.reviews[wk] || {}, st = weekStats(wk);
  const mon = parseDate(wk), label = `${mon.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${addDays(mon, 6).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  const past = Object.keys(S.reviews).filter(k => k !== wk && Object.values(S.reviews[k]).some(Boolean)).sort().reverse();
  return pageHead('Weekly review', 'A quiet look back, then a clear choice for the week ahead.') + `
  <div class="month-nav"><button class="icon-btn" data-a="reviewNav" data-v="-7" aria-label="Previous week">‹</button><h2>${label}</h2><button class="icon-btn" data-a="reviewNav" data-v="7" aria-label="Next week">›</button></div>
  <div class="kpis"><div class="kpi"><b>${st.tasks}</b><span>tasks done</span></div><div class="kpi"><b>${st.avg}%</b><span>average day</span></div>
    <div class="kpi"><b>${st.sadhana}/7</b><span>days of sadhana</span></div><div class="kpi"><b>${st.posts}</b><span>content done</span></div><div class="kpi"><b>${fmtMoney(st.spent)}</b><span>spent</span></div></div>
  <section class="card review"><div class="card-head"><h2>How did this week feel?</h2></div>
    <div class="lotus-rate">${[1, 2, 3, 4, 5].map(n => `<button class="${(r.rating || 0) >= n ? 'on' : ''}" data-a="reviewRate" data-v="${n}" aria-label="${n} of 5">${lotusIcon(28, (r.rating || 0) >= n ? '#B8913F' : '#CDB6C8')}</button>`).join('')}</div>
    ${REVIEW_Q.map(([k, q]) => `<div class="field"><label for="rv_${k}">${q}</label><textarea id="rv_${k}" rows="3" data-ch="review" data-k="${k}">${esc(r[k] || '')}</textarea></div>`).join('')}
    <div class="row wrap"><button class="btn primary" data-a="pickPriorities">⭐ Choose next week's priorities</button><span class="small muted">Saves as you type.</span></div></section>
  ${past.length ? `<section class="card"><div class="card-head"><h2>Past reviews</h2></div>${past.slice(0, 12).map(k => `<details class="past"><summary><b>Week of ${fmtDate(k)}</b> ${'🪷'.repeat(S.reviews[k].rating || 0)}</summary>${REVIEW_Q.map(([q, lbl]) => S.reviews[k][q] ? `<p><b>${lbl}</b><br>${esc(S.reviews[k][q])}</p>` : '').join('')}</details>`).join('')}</section>` : ''}`;
}

// ---------- day planner (drag tasks into time blocks) ----------
const PLAN_HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 05:00 – 23:00
function fixedBlocks(k) {
  const [y, m, d] = k.split('-').map(Number), date = new Date(y, m - 1, d), di = dayIdx(date), out = [];
  for (const tt of S.timetables) {
    if (tt.type === 'monthly') continue;
    const col = tt.days.findIndex(dn => dn.slice(0, 3).toLowerCase() === DAYS[di].toLowerCase()); if (col < 0) continue;
    tt.slots.forEach((sl, r) => { const c = tt.cells[`${r},${col}`], mm = slotStart(sl); if (c && c.text && mm >= 0) out.push({ h: Math.floor(mm / 60), label: '📚 ' + c.text, time: sl }); });
  }
  for (const sp of S.spaces) for (const it of sp.items) if (it.time && (it.freq === 'daily' || (it.freq === 'weekly' && +it.day === di))) out.push({ h: +it.time.slice(0, 2), label: sp.emoji + ' ' + it.name, time: it.time });
  for (const r of S.settings.routines) if (r.days.includes(di)) out.push({ h: +r.time.slice(0, 2), label: r.label, time: r.time });
  return out;
}
function vPlannerDay() {
  const k = UI.planDate, [y, m, d] = k.split('-').map(Number), date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const pool = S.tasks.filter(t => !t.done && !(t.plan && t.plan.date === k))
    .sort((a, b) => (isStar(b) - isStar(a)) || ((parseDate(a.deadline) || 9e15) - (parseDate(b.deadline) || 9e15))).slice(0, 24);
  const planned = S.tasks.filter(t => t.plan && t.plan.date === k), fixed = fixedBlocks(k);
  const nowH = k === dkey() ? new Date().getHours() : -1;
  const rows = PLAN_HOURS.map(h => {
    const hh = `${pad(h)}:00`, mine = planned.filter(t => +t.plan.start.slice(0, 2) === h), fx = fixed.filter(f => f.h === h);
    return `<div class="slot ${h === nowH ? 'now' : ''} ${UI.pickTask ? 'pickable' : ''}" data-slot="${hh}" ${UI.pickTask ? `data-a="placeTask" data-v="${hh}"` : ''}>
      <span class="slot-h">${hh}</span><div class="slot-body">
      ${fx.map(f => `<span class="blk fixed">${esc(f.label)}</span>`).join('')}
      ${mine.map(t => `<button class="blk task ${t.done ? 'done' : ''}" data-a="editBlock" data-id="${t.id}" style="--h:${Math.max(1, (t.plan.dur || 60) / 60)}">${t.done ? '✓ ' : ''}${esc(t.title)}<small>${t.plan.start} · ${t.plan.dur || 60} min</small></button>`).join('')}
      </div></div>`;
  }).join('');
  return pageHead('Day planner', 'Drag a task onto an hour — or tap a task, then tap an hour.', `<button class="btn primary" data-a="newTask">+ Task</button>`) + `
  <div class="month-nav"><button class="icon-btn" data-a="planDay" data-v="-1" aria-label="Previous day">‹</button><h2>${label}</h2><button class="icon-btn" data-a="planDay" data-v="1" aria-label="Next day">›</button>${k !== dkey() ? '<button class="btn small ghost" data-a="planDay" data-v="0">Today</button>' : ''}</div>
  <div class="planner">
    <section class="card pool"><div class="card-head"><h2>To schedule</h2><span class="small muted">${pool.length}</span></div>
      <div class="pool-chips">${pool.map(t => `<button class="pchip ${UI.pickTask === t.id ? 'picked' : ''}" data-drag="${t.id}" data-a="pickTask" data-id="${t.id}" style="--c:${areaOf(t.areaId).color}">${isStar(t) ? '⭐ ' : ''}${esc(t.title)}${t.deadline ? `<small>${countdown(t.deadline).txt}</small>` : ''}</button>`).join('') || '<p class="muted small">No open tasks. Add one with + Task.</p>'}</div>
      ${UI.pickTask ? '<p class="small gold">Now tap an hour on the timeline.</p>' : ''}</section>
    <section class="card timeline">${rows}</section>
  </div>`;
}

// ---------- streak heatmap ----------
function heatmap(fn, weeks = 18) {
  const end = new Date(), start = addDays(end, -(weeks * 7 - 1) - dayIdx(addDays(end, -(weeks * 7 - 1))));
  let cols = '', d = new Date(start), months = '';
  for (let w = 0; w < weeks + 1; w++) {
    let col = '';
    for (let i = 0; i < 7; i++) {
      const k = dkey(d), future = d > end;
      const v = future ? -1 : clamp(fn(k) || 0, 0, 1);
      col += `<i class="hm l${v < 0 ? 'x' : v === 0 ? 0 : v < .34 ? 1 : v < .67 ? 2 : v < 1 ? 3 : 4}" title="${fmtDate(k)}${v >= 0 ? ': ' + Math.round(v * 100) + '%' : ''}"></i>`;
      d = addDays(d, 1);
    }
    const mk = addDays(d, -7);
    months += `<span>${mk.getDate() <= 7 ? mk.toLocaleDateString(undefined, { month: 'short' }) : ''}</span>`;
    cols += `<div class="hm-col">${col}</div>`;
  }
  return `<div class="hm-wrap"><div class="hm-months">${months}</div><div class="hm-grid">${cols}</div>
    <div class="hm-legend">less <i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i> more</div></div>`;
}
function heatSources() {
  const src = [['overall', '🌸 Whole day', k => S.logs[k] ? dayScore(k) : 0], ['sadhana', '🪷 Sadhana', k => {
    const it = S.spaces.flatMap(sp => sp.items.filter(i => i.freq === 'daily')); return it.length ? it.filter(i => itemDone(i, k)).length / it.length : 0; }]];
  S.habits.forEach(h => src.push([h.id, `${h.emoji} ${h.name}`, k => S.logs[k] && S.logs[k].habits && S.logs[k].habits[h.id] ? 1 : 0]));
  S.spaces.forEach(sp => src.push(['sp:' + sp.id, `${sp.emoji} ${sp.name}`, k => { const it = sp.items.filter(i => i.freq === 'daily'); return it.length ? it.filter(i => itemDone(i, k)).length / it.length : 0; }]));
  return src;
}
function streakCard() {
  const src = heatSources(), cur = src.find(s => s[0] === UI.heat) || src[0];
  let streakN = 0; for (let i = 0; i < 3650; i++) { const k = dkey(addDays(new Date(), -i)); if (cur[2](k) >= .6) streakN++; else if (i > 0) break; }
  return `<section class="card"><div class="card-head"><h2>Streak calendar</h2><span class="gold small">🔥 ${streakN} day${streakN === 1 ? '' : 's'}</span></div>
    <div class="chips">${src.map(s => `<button class="chip ${s[0] === cur[0] ? 'on' : ''}" data-a="heat" data-v="${esc(s[0])}">${esc(s[1])}</button>`).join('')}</div>
    ${heatmap(cur[2])}</section>`;
}

// ---------- welcome / first launch ----------
function onboardingHTML() {
  return `<div class="welcome"><div class="welcome-mandala">${mandalaSVG(180, '#B8913F', .55)}</div>
    <h2 class="script">Welcome to Sankalpa</h2><p>Your space for goals, routine, sadhana and growth. What should we call you?</p>
    <div class="field"><input id="obName" placeholder="Your name" value="${esc(S.settings.name || '')}"></div>
    <p class="small muted">How would you like to begin?</p>
    <div class="ob-choices">
      <button class="ob" data-a="onboard" data-v="template"><span>🪷</span><b>Sankalpa template</b><small>Sample habits, a spiritual routine, spaces and lists you can edit</small></button>
      <button class="ob" data-a="onboard" data-v="empty"><span>🤍</span><b>Blank canvas</b><small>Start fresh and build everything your way</small></button>
    </div></div>`;
}

// ---------- settings extras ----------
function notifySettingsCard() {
  const n = S.settings.notify, bf = S.settings.briefing;
  return `<section class="card"><div class="card-head"><h2>🔔 What should notify me</h2><button class="btn small" data-a="editBriefing">Times</button></div>
    <p class="small muted">Switch each type on or off. Morning briefing ${bf.morning}, evening review ${bf.evening}, weekly review ${DAYS[+bf.reviewDay]} ${bf.reviewTime}.</p>
    <div class="toggles">${NOTIFY_TYPES.map(([k, l]) => `<label class="toggle"><input type="checkbox" data-ch="notifyType" value="${k}" ${n[k] !== false ? 'checked' : ''}><span class="sw"></span><span>${esc(l)}</span></label>`).join('')}</div></section>`;
}
function accountCard() {
  const c = Cloud.status();
  if (c.state !== 'on') return '';
  return `<section class="card"><div class="card-head"><h2>👤 Account</h2></div>
    <p class="small">Signed in as <b>${esc(c.email)}</b>. Only you can see your data.</p>
    <div class="row wrap"><button class="btn small" data-a="signOut">Sign out</button><button class="btn small ghost danger" data-a="deleteAccount">Delete my account & data</button></div></section>`;
}

VIEWS.utsav = vUtsav; VIEWS.review = vReview; VIEWS.planner = vPlannerDay;

// background: soft blush/lilac blobs + two slow gold mandalas
(function paintDecor() {
  const el = document.getElementById('decor'); if (!el) return;
  const blob = (x, y, s, c, o) => `<svg style="${x};${y}" width="${s}" height="${s}" viewBox="0 0 200 200"><path fill="${c}" fill-opacity="${o}" d="M43.1,-58.6C55.5,-50.1,64.6,-36.4,69.5,-21.2C74.4,-6,75.1,10.7,68.9,24.5C62.7,38.3,49.6,49.2,35.1,57.6C20.6,66,4.7,71.9,-11.9,71.4C-28.5,70.9,-45.8,64,-56.6,51.4C-67.4,38.8,-71.7,20.4,-70.7,3C-69.7,-14.4,-63.4,-30.8,-52.2,-40.1C-41,-49.4,-24.9,-51.6,-9.6,-55.3C5.7,-59,30.7,-67.1,43.1,-58.6Z" transform="translate(100 100)"/></svg>`;
  el.innerHTML = blob('left:-90px', 'top:140px', 360, '#F4C4DA', .55) + blob('right:-120px', 'top:-80px', 420, '#D8C8F4', .55) + blob('right:10%', 'bottom:-140px', 400, '#F7DCC4', .6) +
    `<div class="mandala" style="right:-140px;top:-140px">${mandalaSVG(460, '#B8913F', .28)}</div><div class="mandala" style="left:-160px;bottom:-160px">${mandalaSVG(520, '#B8913F', .22)}</div>` +
    `<div style="position:absolute;left:46%;top:22%;opacity:.5">${lotusIcon(34, '#B8913F')}</div><div style="position:absolute;left:12%;top:70%;opacity:.4">${lotusIcon(26, '#B8913F')}</div>`;
})();
/* Part 3b: Firebase sync, Google sign-in, push notifications.
   Each Google account has its own private planner. When sync is set up,
   the app shows a sign-in screen first, so nobody else can see your data. */

const Cloud = (() => {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const CLIENT = uid();
  const cfg = CLOUD_CFG;
  const st = { state: cfg ? 'loading' : 'off', email: '', error: '', push: false, lastRun: null, fromFile: !!(cfg && cfg.fromFile) };
  let fb = null, user = null, unsubs = [], lastEvents = '';

  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
  const pushFlagKey = () => 'bloom_push_' + (user ? user.uid : '');

  async function init() {
    if (!cfg) return;
    try {
      const [app, auth, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
      const a = app.initializeApp(cfg.config);
      fb = { app: a, A: auth, auth: auth.getAuth(a), F: fs, db: fs.getFirestore(a) };
      auth.getRedirectResult(fb.auth).catch(e => console.warn(e));
      auth.onAuthStateChanged(fb.auth, u => { if (u) onSignedIn(u); else onSignedOut(); });
    } catch (e) { st.state = 'error'; st.error = e.message; render(); }
  }

  async function onSignedIn(u) {
    user = u; st.email = u.email || ''; st.state = 'syncing'; render();
    const { doc, getDoc, onSnapshot } = fb.F;
    STORE_KEY = 'bloom_u_' + u.uid;
    let local = loadStore(STORE_KEY);
    // First sign-in on this device: adopt data entered before sync was set up
    if (!local && !localStorage.getItem('bloom_legacy_claimed')) {
      const legacy = loadStore(LEGACY_KEY);
      if (legacy && legacy.updatedAt) { local = legacy; localStorage.setItem('bloom_legacy_claimed', u.uid); localStorage.removeItem(LEGACY_KEY); }
    }
    const ref = doc(fb.db, 'users', u.uid, 'state', 'main');
    try {
      const snap = await getDoc(ref);
      const remote = snap.exists() ? snap.data() : null;
      if (remote && (remote.updatedAt || 0) > ((local && local.updatedAt) || 0)) S = migrate(JSON.parse(remote.json));
      else S = local || defaultState();
      LOCKED = false; st.state = 'on';
      saveLocalOnly();
      if (!remote || (local && local.updatedAt > (remote.updatedAt || 0))) await push();
      await pushEvents(true);
      unsubs.push(onSnapshot(ref, s => {
        if (!s.exists()) return; const d = s.data();
        if (d.client !== CLIENT && d.updatedAt > S.updatedAt) { S = migrate(JSON.parse(d.json)); saveLocalOnly(); if ($('#modal').hidden) render(); }
      }));
      unsubs.push(onSnapshot(doc(fb.db, 'push', u.uid), s => {
        const d = s.exists() ? s.data() : {};
        st.lastRun = d.lastRun || null; st.tokenCount = (d.tokens || []).length;
        if (currentView() === 'settings' && $('#modal').hidden) render();
      }));
      st.push = localStorage.getItem(pushFlagKey()) === '1';
      if (st.push && 'Notification' in window && Notification.permission === 'granted') registerPush(false);
    } catch (e) { st.state = 'error'; st.error = e.code || e.message; }
    render(); setTimeout(maybeOnboard, 300);
  }

  function onSignedOut() {
    unsubs.forEach(f => f()); unsubs = [];
    user = null; st.email = ''; st.push = false; st.lastRun = null;
    st.state = 'signedOut'; LOCKED = true; S = defaultState(); STORE_KEY = LEGACY_KEY;
    closeModal(); render();
  }

  async function push() {
    if (!user || !fb || LOCKED) return;
    const { doc, setDoc } = fb.F;
    try {
      await setDoc(doc(fb.db, 'users', user.uid, 'state', 'main'), { json: JSON.stringify(S), updatedAt: S.updatedAt, client: CLIENT });
      await pushEvents(false);
    } catch (e) { console.warn('sync', e); toast('Sync failed (' + (e.code || e.message) + ')', '⚠️'); }
  }

  // The reminder list the GitHub Action reads every 15 minutes
  async function pushEvents(force) {
    if (!user || !fb || LOCKED) return;
    const events = buildEvents(), sig = JSON.stringify(events);
    if (!force && sig === lastEvents) return;
    lastEvents = sig;
    const { doc, setDoc } = fb.F;
    await setDoc(doc(fb.db, 'push', user.uid), { events, tz: tz(), email: user.email || '', updatedAt: Date.now() }, { merge: true });
  }

  async function signIn() {
    if (!fb) { toast('Still connecting… try again in a moment', '☁️'); return; }
    const p = new fb.A.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    try { await fb.A.signInWithPopup(fb.auth, p); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) fb.A.signInWithRedirect(fb.auth, p);
      else if (e.code === 'auth/unauthorized-domain') toast('Add this website to Firebase → Authentication → Settings → Authorized domains', '⚠️');
      else if (e.code !== 'auth/popup-closed-by-user') toast('Sign-in failed: ' + (e.code || e.message), '⚠️');
    }
  }
  async function signOut() {
    if (!fb || !user) return;
    // stop this device receiving your reminders
    const tok = localStorage.getItem('bloom_token_' + user.uid);
    if (tok) { try { const { doc, setDoc, arrayRemove } = fb.F; await setDoc(doc(fb.db, 'push', user.uid), { tokens: arrayRemove(tok) }, { merge: true }); } catch { } }
    localStorage.removeItem(pushFlagKey());
    await fb.A.signOut(fb.auth);
  }

  const AUTH_MSG = {
    'auth/invalid-email': 'That email address doesn\'t look right.', 'auth/missing-password': 'Enter your password.',
    'auth/weak-password': 'Use at least 6 characters for the password.', 'auth/email-already-in-use': 'An account with this email already exists. Try “Sign in”.',
    'auth/invalid-credential': 'Email or password is incorrect.', 'auth/wrong-password': 'Email or password is incorrect.', 'auth/user-not-found': 'No account with this email. Try “Create account”.',
    'auth/too-many-requests': 'Too many tries. Wait a minute and try again.', 'auth/operation-not-allowed': 'Email sign-in isn\'t switched on in Firebase yet (Authentication → Sign-in method → Email/Password).',
  };
  async function emailAuth(mode, email, pass) {
    if (!fb) { toast('Still connecting…', '☁️'); return; }
    email = email.trim();
    try {
      if (mode === 'reset') { if (!email) { toast('Type your email first', '✉️'); return; } await fb.A.sendPasswordResetEmail(fb.auth, email); toast('Password reset email sent', '✉️'); return; }
      if (mode === 'create') await fb.A.createUserWithEmailAndPassword(fb.auth, email, pass);
      else await fb.A.signInWithEmailAndPassword(fb.auth, email, pass);
    } catch (e) { toast(AUTH_MSG[e.code] || ('Sign-in failed: ' + (e.code || e.message)), '⚠️'); }
  }
  async function deleteAccount() {
    if (!fb || !user) return;
    const { doc, deleteDoc } = fb.F, u = user;
    try {
      await deleteDoc(doc(fb.db, 'users', u.uid, 'state', 'main'));
      await deleteDoc(doc(fb.db, 'push', u.uid));
      Object.keys(localStorage).filter(k => k.includes(u.uid)).forEach(k => localStorage.removeItem(k));
      await fb.A.deleteUser(u);
      toast('Your account and data were deleted', '🪷');
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') { toast('For safety, sign in again and then delete.', '🔐'); await fb.A.signOut(fb.auth); }
      else toast('Could not delete: ' + (e.code || e.message), '⚠️');
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) { toast('Notifications are not available here. On iPhone, add Sankalpa to your home screen first.', '⚠️'); return; }
    const p = await Notification.requestPermission();
    if (p !== 'granted') { toast('Notifications were not allowed', '⚠️'); render(); return; }
    if (!user) { toast('Allowed. Reminders will show while Sankalpa is open.', '🔔'); render(); return; }
    await registerPush(true);
  }
  async function registerPush(loud) {
    try {
      if (!cfg.vapid) throw new Error('The Web Push key (VAPID) is missing from config.js');
      const m = await import(SDK + 'firebase-messaging.js');
      if (!(await m.isSupported())) throw new Error('Push is not supported in this browser');
      const reg = await navigator.serviceWorker.ready;
      const token = await m.getToken(m.getMessaging(fb.app), { vapidKey: cfg.vapid, serviceWorkerRegistration: reg });
      const { doc, setDoc, arrayUnion } = fb.F;
      await setDoc(doc(fb.db, 'push', user.uid), { tokens: arrayUnion(token), events: buildEvents(), tz: tz(), updatedAt: Date.now() }, { merge: true });
      localStorage.setItem('bloom_token_' + user.uid, token);
      st.push = true; localStorage.setItem(pushFlagKey(), '1');
      if (loud) { toast('Push reminders are on for this device', '🔔'); render(); }
    } catch (e) { console.warn(e); if (loud) toast(e.message, '⚠️'); }
  }

  function parseConfig(text) {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Paste the whole firebaseConfig block, including { }');
    const obj = new Function('return (' + m[0] + ')')();
    if (!obj.apiKey || !obj.projectId) throw new Error('That config is missing apiKey or projectId');
    return obj;
  }
  function setupForm() {
    if (st.fromFile) { toast('Sync settings come from config.js on GitHub', 'ℹ️'); return; }
    openForm({
      title: 'Connect Firebase',
      fields: [
        { k: 'config', label: 'Firebase config', type: 'textarea', value: cfg ? JSON.stringify(cfg.config, null, 1) : '', placeholder: '{ apiKey: "…", authDomain: "…", projectId: "…", … }', hint: 'Tip: put this in config.js on GitHub instead, and every device is set up automatically.' },
        { k: 'vapid', label: 'Web Push key (VAPID)', value: cfg?.vapid || '' },
      ],
      saveLabel: 'Save and reload',
      onSave: v => {
        try { const c = parseConfig(v.config); localStorage.setItem('bloom_cloud', JSON.stringify({ config: c, vapid: v.vapid.trim() })); setTimeout(() => location.reload(), 300); return true; }
        catch (e) { toast(e.message, '⚠️'); return false; }
      },
      onDelete: cfg ? () => { localStorage.removeItem('bloom_cloud'); location.reload(); } : null,
    });
  }

  setInterval(() => pushEvents(false).catch(() => { }), 30 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pushEvents(false).catch(() => { }); });

  return { init, push, status: () => st, signIn, signOut, enableNotifications, setupForm, emailAuth, deleteAccount };
})();

// Sign-in screen shown before any data
function vGate() {
  const st = Cloud.status();
  const body = st.state === 'error'
    ? `<p class="gate-err">Could not connect: ${esc(st.error)}</p><div class="row center"><button class="btn primary" onclick="location.reload()">Try again</button></div>`
    : st.state === 'signedOut'
      ? `<p>Your goals, routine and sadhana — private to you, on every device.</p>
         <button class="btn google big" data-a="signIn"><span class="g-mark">G</span> Continue with Google</button>
         <div class="or"><span>or use email</span></div>
         <form class="gate-form" onsubmit="return false">
           <input id="gEmail" type="email" autocomplete="email" placeholder="Email address">
           <input id="gPass" type="password" autocomplete="current-password" placeholder="Password (6+ characters)">
           <div class="row center wrap"><button class="btn primary" data-a="emailAuth" data-v="signin">Sign in</button><button class="btn" data-a="emailAuth" data-v="create">Create account</button></div>
           <button class="link small" data-a="emailAuth" data-v="reset">Forgot password?</button>
         </form>`
      : `<p class="muted">${st.state === 'syncing' ? 'Opening your Sankalpa…' : 'Connecting…'}</p><div class="spinner"></div>`;
  return `<section class="gate"><div class="gate-card"><div class="gate-mandala">${mandalaSVG(150, '#B8913F', .6)}</div>
    <span class="skt">Sankalpa</span><h1>Sankalpa</h1>${body}</div></section>`;
}
/* Part 4: actions, rendering loop, timers */

const findBy = (arr, id) => arr.find(x => x.id === id);
const areaOptions = () => S.areas.map(a => [a.id, `${a.emoji} ${a.name}`]);
const PRIO_MIN = { get 1() { return ER('low'); }, get 2() { return ER('med'); }, get 3() { return ER('high'); } };

function shiftDeadline(s, rep) {
  const dateOnly = s.length === 10;
  let d = dateOnly ? parseDate(s) : new Date(s);
  const step = x => { if (rep === 'daily') x.setDate(x.getDate() + 1); else if (rep === 'weekly') x.setDate(x.getDate() + 7); else if (rep === 'monthly') x.setMonth(x.getMonth() + 1); };
  step(d); let guard = 0;
  while (d < Date.now() && guard++ < 400) step(d);
  return dateOnly ? dkey(d) : `${dkey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- forms ----------
function taskForm(t = {}, preset = {}) {
  const isNew = !t.id;
  const goals = S.goals.filter(g => !g.done || g.id === t.goalId);
  openForm({
    title: isNew ? 'New task' : 'Edit task',
    fields: [
      { k: 'title', label: 'What needs doing?', value: t.title, placeholder: 'e.g. Finish lab report draft' },
      { k: 'areaId', label: 'Area', type: 'select', options: areaOptions(), value: t.areaId || preset.areaId || 'mind' },
      { k: 'goalId', label: 'Part of a goal (optional)', type: 'select', options: [['', '— none —'], ...goals.map(g => [g.id, '🎯 ' + g.title])], value: t.goalId || preset.goalId || '' },
      { k: 'deadline', label: 'Deadline', type: 'datetime', value: t.deadline && t.deadline.length === 10 ? t.deadline + 'T23:59' : t.deadline },
      { k: 'priority', label: 'Priority', type: 'select', options: [[1, `Low · earns ${ER('low')} min`], [2, `Medium · earns ${ER('med')} min`], [3, `High · earns ${ER('high')} min`]], value: t.priority || 2 },
      { k: 'minutes', label: 'Reward minutes (optional)', type: 'number', value: isNew ? '' : t.minutes, hint: 'Leave empty to use the priority amount.' },
      { k: 'remindBefore', label: 'Remind me before the deadline', type: 'checks', options: BEFORE_OPTS, value: t.remindBefore || S.settings.remindBefore },
      { k: 'remindAt', label: 'Extra reminder at a set time (optional)', type: 'datetime', value: t.remindAt },
      { k: 'repeat', label: 'Repeat', type: 'select', options: [['none', 'Does not repeat'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month']], value: t.repeat || 'none' },
      { k: 'notes', label: 'Notes', type: 'textarea', value: t.notes },
    ],
    onSave: v => {
      if (!v.title) { toast('Give the task a name first', '✏️'); return false; }
      v.priority = +v.priority;
      if (v.minutes === '' || v.minutes == null) v.minutes = PRIO_MIN[v.priority];
      if (v.repeat !== 'none' && !v.deadline) { toast('Repeating tasks need a deadline', '🔁'); return false; }
      if (isNew) S.tasks.push({ id: uid(), created: Date.now(), done: false, ...v });
      else Object.assign(t, v);
      if (isNew) toast('Task added', '🌱');
      return true;
    },
    onDelete: isNew ? null : async () => { if (await confirmBox(`Delete “${t.title}”?`)) { S.tasks = S.tasks.filter(x => x !== t); save(); } },
  });
}

function goalForm(g = {}) {
  const isNew = !g.id;
  openForm({
    title: isNew ? 'New goal' : 'Edit goal',
    fields: [
      { k: 'title', label: 'Goal', value: g.title, placeholder: 'e.g. Lose 3 kg, post 8 reels, finish chapter 2' },
      { k: 'horizon', label: 'Time frame', type: 'select', options: HORIZONS, value: g.horizon || UI.goalH },
      { k: 'focus', label: 'Focus goal?', type: 'select', options: [['0', 'No'], ['1', '🎯 Yes — one of my 2 focus goals']], value: g.focus ? '1' : '0' },
      { k: 'areaId', label: 'Area', type: 'select', options: areaOptions(), value: g.areaId || 'mind' },
      { k: 'deadline', label: 'Deadline', type: 'date', value: g.deadline },
      { k: 'notes', label: 'Why it matters / notes', type: 'textarea', value: g.notes },
    ],
    onSave: v => {
      if (!v.title) return false;
      v.focus = v.focus === '1';
      if (v.focus && !g.focus && S.goals.filter(x => x.focus && !x.done).length >= 2) { toast('You already have 2 focus goals. Un-focus one first.', '🎯'); v.focus = false; }
      if (isNew) S.goals.push({ id: uid(), done: false, ...v }); else Object.assign(g, v); return true;
    },
    onDelete: isNew ? null : async () => { if (await confirmBox(`Delete goal “${g.title}”? Linked tasks stay.`)) { S.goals = S.goals.filter(x => x !== g); S.tasks.forEach(t => { if (t.goalId === g.id) t.goalId = ''; }); save(); } },
  });
}

// ---------- action table ----------
const A = {
  closeModal,
  async formSave() { if (!FORM) return; const f = FORM; const ok = await f.onSave(readForm()); if (ok !== false) { closeModal(); save(); } },
  formDelete() { if (!FORM) return; const f = FORM; closeModal(); setTimeout(() => f.onDelete(), 200); },

  // filters
  taskShow: d => { UI.taskShow = d.v; render(); }, taskArea: d => { UI.taskArea = d.v; render(); },
  goalH: d => { UI.goalH = d.v; render(); }, healthTab: d => { UI.healthTab = d.v; render(); },
  plat: d => { UI.plat = d.v; render(); }, ideaSt: d => { UI.ideaSt = d.v; render(); }, bucketCat: d => { UI.bucketCat = d.v; render(); },
  listPick: d => { UI.listId = d.v; render(); },
  contentView: d => { UI.contentView = d.v; render(); }, linkShow: d => { UI.linkShow = d.v; render(); }, linkCat: d => { UI.linkCat = d.v; render(); }, calNav: d => { UI.calOffset += +d.v; render(); },

  // tasks
  newTask: d => taskForm({}, { goalId: d.goal, areaId: d.goal ? findBy(S.goals, d.goal)?.areaId : undefined }),
  editTask: d => taskForm(findBy(S.tasks, d.id)),
  toggleTask(d) {
    const t = findBy(S.tasks, d.id); if (!t) return;
    if (!t.done) {
      t.done = true; t.doneAt = Date.now(); S.stats.tasksDone++;
      if (t.repeat && t.repeat !== 'none' && t.deadline) {
        S.tasks.push({ ...t, id: uid(), done: false, doneAt: null, created: Date.now(), deadline: shiftDeadline(t.deadline, t.repeat), remindAt: '' });
        t.repeat = 'none';
      }
      earn(t.minutes, t.minutes * 2, 'Task: ' + t.title);
    } else { t.done = false; t.doneAt = null; S.stats.tasksDone = Math.max(0, S.stats.tasksDone - 1); unearn(t.minutes, t.minutes * 2, 'Undid: ' + t.title); }
    save();
  },

  // goals
  newGoal: () => goalForm(), editGoal: d => goalForm(findBy(S.goals, d.id)),
  toggleGoal(d) {
    const g = findBy(S.goals, d.id); g.done = !g.done;
    if (g.done) { earn(ER('goal'), 50, 'Goal: ' + g.title); celebrate('Goal complete 🎯', g.title); } else unearn(ER('goal'), 50, 'Undid goal: ' + g.title);
    save();
  },

  // today trackers
  habit(d) {
    const L = todayLog(), h = findBy(S.habits, d.id);
    L.habits[d.id] = !L.habits[d.id];
    if (L.habits[d.id]) { S.stats.habitTicks++; earn(ER('habit'), 10, 'Habit: ' + h.name); } else unearn(ER('habit'), 10, 'Undid habit: ' + h.name);
    save();
  },
  water(d) {
    const L = todayLog(), before = L.water, n = +d.n;
    L.water = L.water === n ? n - 1 : n; waterReward(before, L.water); save();
  },
  waterPlus() { const L = todayLog(), b = L.water; L.water++; waterReward(b, L.water); save(); },
  diet(d) { todayLog().diet[d.k]++; save(); },
  dietReset() { todayLog().diet = { good: 0, ok: 0, junk: 0 }; save(); },
  mood(d) { const L = todayLog(); L.mood = L.mood === +d.v ? null : +d.v; save(); },
  logSleep() {
    const L = todayLog(), s = L.sleep || {};
    openForm({
      title: 'Last night’s sleep',
      fields: [{ k: 'bed', label: 'Went to bed', type: 'time', value: s.bed || '23:00' }, { k: 'wake', label: 'Woke up', type: 'time', value: s.wake || '07:00' }],
      onSave: v => {
        let h = (toMin(v.wake) - toMin(v.bed)) / 60; if (h <= 0) h += 24;
        const first = !L.sleep; L.sleep = { bed: v.bed, wake: v.wake, hours: Math.round(h * 10) / 10 };
        if (first) earn(ER('sleep'), 10, 'Logged sleep'); return true;
      },
      onDelete: L.sleep ? () => { L.sleep = null; unearn(ER('sleep'), 10, 'Removed sleep log'); save(); } : null,
    });
  },
  logWorkout() {
    openForm({
      title: 'Log a workout',
      fields: [{ k: 'type', label: 'What did you do?', type: 'select', options: ['Walk', 'Run', 'Gym / strength', 'Yoga', 'Cycling', 'Dance', 'Swimming', 'Sports', 'Stretching', 'Other'].map(x => [x, x]), value: 'Walk' },
        { k: 'min', label: 'Minutes', type: 'number', value: 30 }],
      onSave: v => { if (!v.min) return false; todayLog().exercise.push({ type: v.type, min: v.min }); earn(ER('workout'), 20, 'Workout: ' + v.type); return true; },
    });
  },
  delWorkout(d) { todayLog().exercise.splice(+d.i, 1); unearn(ER('workout'), 20, 'Removed workout'); save(); },
  logWeight() {
    openForm({
      title: 'Log weight', fields: [{ k: 'kg', label: 'Weight (kg)', type: 'number', value: S.weights.length ? S.weights[S.weights.length - 1].kg : '' }, { k: 'd', label: 'Date', type: 'date', value: dkey() }],
      onSave: v => { if (!v.kg) return false; S.weights = S.weights.filter(w => w.d !== v.d); S.weights.push({ d: v.d, kg: v.kg }); S.weights.sort((a, b) => a.d.localeCompare(b.d)); return true; },
    });
  },
  delWeight(d) { S.weights = S.weights.filter(w => w.d !== d.d); save(); },

  // period
  periodToday() { if (!S.period.starts.includes(dkey())) S.period.starts.push(dkey()); toast('Logged. Take it easy today.', '🌸'); save(); },
  periodPast() { openForm({ title: 'Log a period start', fields: [{ k: 'd', label: 'First day', type: 'date', value: dkey() }], onSave: v => { if (v.d && !S.period.starts.includes(v.d)) S.period.starts.push(v.d); return true; } }); },
  delPeriod(d) { S.period.starts = S.period.starts.filter(s => s !== d.d); save(); },
  periodLen() { openForm({ title: 'Period length', fields: [{ k: 'n', label: 'Usual number of days', type: 'number', value: S.period.periodLen }], onSave: v => { S.period.periodLen = clamp(Math.round(v.n) || 5, 1, 12); return true; } }); },

  // rewards
  startActivity(d) {
    if (S.rewards.balance < 1) { toast('No minutes left. Finish a task to earn more.', '🌱'); return; }
    S.rewards.running = { id: d.id, start: Date.now(), warned: false }; save();
  },
  stopActivity: () => stopActivity(false),
  newActivity: () => activityForm(), editActivity: d => activityForm(findBy(S.rewards.activities, d.id)),
  spendManual() { openForm({ title: 'Time used without the timer', fields: [{ k: 'm', label: 'Minutes used', type: 'number', value: 15 }, { k: 'r', label: 'On what?', value: '' }], onSave: v => { if (!v.m) return false; unearn(v.m, 0, 'Used: ' + (v.r || 'free time')); toast(`${v.m} min taken from your balance. Thanks for being honest.`, '🙏'); return true; } }); },
  bonusManual() { openForm({ title: 'Add bonus minutes', fields: [{ k: 'm', label: 'Minutes', type: 'number', value: 10 }, { k: 'r', label: 'Reason', value: '' }], onSave: v => { if (!v.m) return false; earn(v.m, 0, 'Bonus: ' + (v.r || 'treat')); return true; } }); },

  // timetable
  newTT() {
    openForm({ title: 'New timetable', fields: [
      { k: 'name', label: 'Name', value: '', placeholder: 'e.g. GATE-B exam prep' },
      { k: 'type', label: 'Type', type: 'select', options: [['weekly', '📅 Weekly — days across, time slots down'], ['monthly', '🗓️ Monthly — one row per date']], value: 'weekly' }],
      onSave: v => {
        if (!v.name) return false;
        const t = v.type === 'monthly' ? { id: uid(), name: v.name, type: 'monthly', month: dkey().slice(0, 7), cols: ['Morning', 'Afternoon', 'Evening'], cells: {}, remind: false, remindTime: '07:30' }
          : { id: uid(), name: v.name, type: 'weekly', days: [...DAYS], slots: slotsDefault(), cells: {}, remind: false };
        S.timetables.push(t); S.activeTT = t.id; return true;
      } });
  },
  ttMonth(d) { const t = curTT(); const [y, m] = t.month.split('-').map(Number); const nd = new Date(y, m - 1 + +d.v, 1); t.month = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`; save(); },
  addCol() { const t = curTT(); ask('Add a column', 'Column name', 'Revision').then(n => { if (n) { t.cols.push(n); save(); } }); },
  editCol(d) {
    const t = curTT(), ci = +d.c;
    openForm({ title: 'Column', fields: [{ k: 'n', label: 'Name', value: t.cols[ci], hint: 'e.g. Subject, Topic, Target, Revision, Hours' }],
      onSave: v => { if (v.n) t.cols[ci] = v.n; return true; },
      onDelete: t.cols.length > 1 ? () => { t.cols.splice(ci, 1); const nc = {}; for (const [k, val] of Object.entries(t.cells)) { const i = k.lastIndexOf(','), dk = k.slice(0, i), cc = +k.slice(i + 1); if (cc < ci) nc[k] = val; else if (cc > ci) nc[`${dk},${cc - 1}`] = val; } t.cells = nc; save(); } : null });
  },
  ttRemind() {
    const t = curTT();
    if (t.type === 'monthly') {
      openForm({ title: 'Daily study-plan reminder', fields: [
        { k: 'on', label: 'Reminder', type: 'select', options: [['1', 'On — send me the day\'s plan'], ['0', 'Off']], value: t.remind ? '1' : '1' },
        { k: 'time', label: 'At', type: 'time', value: t.remindTime || '07:30' }],
        onSave: v => { t.remind = v.on === '1'; t.remindTime = v.time || '07:30'; toast(t.remind ? `You'll get the day's plan at ${t.remindTime}` : 'Reminder off', '📚'); return true; } });
    } else { t.remind = !t.remind; toast(t.remind ? 'You\'ll be reminded when each study slot starts' : 'Slot reminders off', '📚'); save(); }
  },
  renameTT() { const t = curTT(); ask('Rename timetable', 'Name', t.name).then(n => { if (n) { t.name = n; save(); } }); },
  async delTT() { const t = curTT(); if (await confirmBox(`Delete timetable “${t.name}”?`)) { S.timetables = S.timetables.filter(x => x !== t); S.activeTT = S.timetables[0]?.id; save(); } },
  editCell(d) {
    const t = curTT(), key = d.k ? `${d.k},${d.c}` : `${d.r},${d.c}`, cur = t.cells[key]?.text || '';
    openForm({
      title: d.k ? `${fmtDate(d.k)} · ${t.cols[d.c]}` : `${t.days[d.c]} · ${t.slots[d.r]}`,
      fields: [{ k: 'text', label: 'Subject or topic', value: cur, placeholder: 'e.g. Biochemistry — enzymes', hint: 'Leave empty to clear the cell.' }],
      onSave: v => { if (v.text) t.cells[key] = { text: v.text }; else delete t.cells[key]; return true; },
      saveLabel: 'Save',
    });
  },
  editSlot(d) {
    const t = curTT(), r = +d.r;
    openForm({
      title: 'Time slot', fields: [{ k: 'label', label: 'Label', value: t.slots[r], hint: 'Use a format like 09:00–10:30 so “now” can be highlighted.' }],
      onSave: v => { if (v.label) t.slots[r] = v.label; return true; },
      onDelete: () => { removeRow(t, r); save(); },
    });
  },
  editDay(d) { const t = curTT(); ask('Column name', 'Day', t.days[d.c]).then(n => { if (n) { t.days[+d.c] = n; save(); } }); },
  addRow() {
    const t = curTT(), last = t.slots[t.slots.length - 1] || '';
    const m = last.match(/(\d{1,2})[:.](\d{2})\s*$/); const sug = m ? `${pad(+m[1])}:${m[2]}–${pad((+m[1] + 1) % 24)}:${m[2]}` : '';
    ask('Add a time slot', 'Label', sug).then(n => { if (n) { t.slots.push(n); save(); } });
  },
  importTT() { $('#xlsxIn').click(); },
  exportTT: () => exportTimetable(),

  // lists
  newList() { openForm({ title: 'New list', fields: [{ k: 'name', label: 'Name', placeholder: 'e.g. Lab supplies' }, { k: 'emoji', label: 'Emoji', value: '📝' }], onSave: v => { if (!v.name) return false; const l = { id: uid(), name: v.name, emoji: v.emoji || '📝', items: [] }; S.lists.push(l); UI.listId = l.id; return true; } }); },
  editList() {
    const l = findBy(S.lists, UI.listId);
    openForm({ title: 'Edit list', fields: [{ k: 'name', label: 'Name', value: l.name }, { k: 'emoji', label: 'Emoji', value: l.emoji }], onSave: v => { Object.assign(l, v); return true; },
      onDelete: async () => { if (await confirmBox(`Delete the “${l.name}” list?`)) { S.lists = S.lists.filter(x => x !== l); save(); } } });
  },
  toggleItem(d) {
    const l = findBy(S.lists, UI.listId), i = findBy(l.items, d.id); i.done = !i.done;
    if (i.done) { S.stats.listItems++; earn(ER('list'), 4, 'To-do: ' + i.text, true); toast(`+${ER('list')} min`, '🛒'); } else unearn(ER('list'), 4, 'Undid: ' + i.text);
    save();
  },
  delItem(d) { const l = findBy(S.lists, UI.listId); l.items = l.items.filter(i => i.id !== d.id); save(); },
  clearDone() { const l = findBy(S.lists, UI.listId); l.items = l.items.filter(i => !i.done); save(); },

  // content
  newContent: () => contentForm(), editContent: d => contentForm(findBy(S.content, d.id)),
  moveContent(d) {
    const c = findBy(S.content, d.id), i = STAGES.indexOf(c.stage) + +d.v; if (i < 0 || i >= STAGES.length) return;
    setStage(c, STAGES[i]); save();
  },
  addContentRow() {
    S.content.push({ id: uid(), created: Date.now(), title: '', platform: UI.plat !== 'All' ? UI.plat : (S.platforms[0]?.name || 'Other'), stage: 'Idea', deadline: '', notes: '' });
    UI.contentView = 'table'; save();
    setTimeout(() => { const ins = $$('.xsheet input[data-f=title]'); const e = ins.find(i => !i.value); if (e) e.focus(); }, 30);
  },
  async delContent(d) { const c = findBy(S.content, d.id); if (!c.title || await confirmBox(`Delete “${c.title}”?`)) { S.content = S.content.filter(x => x !== c); save(); } },
  exportContent: () => exportContent(),
  importContent() { $('#contentIn').click(); },

  // watch later
  toggleLink(d) {
    const l = findBy(S.links, d.id); l.done = !l.done; l.doneAt = l.done ? Date.now() : null;
    const learn = ['Lecture', 'Article', 'Podcast'].includes(l.cat);
    if (learn) { if (l.done) earn(ER('learn'), 6, 'Learned: ' + l.title); else unearn(ER('learn'), 6, 'Undid: ' + l.title); }
    save();
  },
  editLink(d) {
    const l = findBy(S.links, d.id);
    openForm({ title: 'Edit link', fields: [
      { k: 'title', label: 'Title', value: l.title }, { k: 'url', label: 'Link', type: 'url', value: l.url },
      { k: 'cat', label: 'Type', type: 'select', options: LINK_CATS.map(c => [c[0], c[1] + ' ' + c[0]]), value: l.cat },
      { k: 'by', label: 'Watch by (optional, sends a reminder at 7 pm)', type: 'date', value: l.by },
      { k: 'note', label: 'Why save it / notes', value: l.note }],
      onSave: v => { if (!v.url) return false; Object.assign(l, v, { title: v.title || v.url }); return true; },
      onDelete: () => { S.links = S.links.filter(x => x !== l); save(); } });
  },

  // ideas
  editIdea(d) {
    const i = findBy(S.ideas, d.id);
    openForm({ title: 'Idea', fields: [{ k: 'title', label: 'Idea', value: i.title }, { k: 'ventureId', label: 'Startup', type: 'select', options: S.ventures.map(v => [v.id, v.emoji + ' ' + v.name]), value: i.ventureId || S.ventures[0]?.id }, { k: 'note', label: 'Details, who it helps, how to test it', type: 'textarea', value: i.note }, { k: 'status', label: 'Status', type: 'select', options: IDEA_ST.map(s => [s, s]), value: i.status }],
      onSave: v => { Object.assign(i, v); return true; }, onDelete: async () => { if (await confirmBox('Delete this idea?')) { S.ideas = S.ideas.filter(x => x !== i); save(); } } });
  },
  ideaToTask(d) { const i = findBy(S.ideas, d.id); if (i.status === 'New') i.status = 'Exploring'; taskForm({}, { areaId: 'work' }); setTimeout(() => { const f = $('#f_title'); if (f) f.value = 'Test idea: ' + i.title; }, 30); },

  // bucket
  newBucket: () => bucketForm(), editBucket: d => bucketForm(findBy(S.bucket, d.id)),
  toggleBucket(d) {
    const b = findBy(S.bucket, d.id); b.done = !b.done; b.doneAt = b.done ? Date.now() : null;
    if (b.done) { earn(ER('bucket'), 100, 'Dream achieved: ' + b.title, true); celebrate('Dream achieved 🌈', b.title); } else unearn(ER('bucket'), 100, 'Undid: ' + b.title);
    save();
  },

  // money
  newSaving: () => savingForm(), editSaving: d => savingForm(findBy(S.savings, d.id)),
  addMoney(d) {
    const s = findBy(S.savings, d.id), wasDone = +s.saved >= +s.target;
    ask(`Add to ${s.name}`, `Amount (${S.settings.currency}). Use a minus to withdraw.`, '', 'number').then(v => {
      if (!v) return; s.saved = Math.round(((+s.saved || 0) + v) * 100) / 100;
      if (!wasDone && +s.saved >= +s.target) celebrate('Savings goal reached 🐷', s.name);
      checkBadges(); save();
    });
  },

  // people
  newPerson: () => personForm(), editPerson: d => personForm(findBy(S.people, d.id)),
  contacted(d) { const p = findBy(S.people, d.id); p.last = dkey(); earn(5, 10, 'Reached out to ' + p.name); save(); },

  // settings
  editBasics() {
    const st = S.settings;
    openForm({ title: 'Basics', fields: [{ k: 'name', label: 'Your name', value: st.name }, { k: 'waterGoal', label: 'Water goal (glasses a day)', type: 'number', value: st.waterGoal }, { k: 'sleepGoal', label: 'Sleep goal (hours)', type: 'number', value: st.sleepGoal },
      { k: 'weightGoal', label: 'Goal weight (kg)', type: 'number', value: st.weightGoal }, { k: 'currency', label: 'Currency symbol', value: st.currency }],
      onSave: v => { v.waterGoal = clamp(Math.round(v.waterGoal) || 8, 1, 30); v.sleepGoal = v.sleepGoal || 8; Object.assign(st, v); return true; } });
  },
  newArea: () => areaForm(), editArea: d => areaForm(findBy(S.areas, d.id)),
  newHabit: () => habitForm(), editHabit: d => habitForm(findBy(S.habits, d.id)),
  newRoutine: () => routineForm(), editRoutine: d => routineForm(findBy(S.settings.routines, d.id)),
  editReminderRules() {
    const st = S.settings;
    openForm({ title: 'Reminder rules', fields: [
      { k: 'rb', label: 'Default reminders before a task deadline', type: 'checks', options: BEFORE_OPTS, value: st.remindBefore },
      { k: 'qon', label: 'Quiet hours', type: 'select', options: [['1', 'On — no reminders during these hours'], ['0', 'Off']], value: st.quiet.on ? '1' : '0' },
      { k: 'qf', label: 'Quiet from', type: 'time', value: st.quiet.from }, { k: 'qt', label: 'Quiet until', type: 'time', value: st.quiet.to },
      { k: 'won', label: 'Water reminders', type: 'select', options: [['1', 'On'], ['0', 'Off']], value: st.water.on ? '1' : '0' },
      { k: 'wev', label: 'Every … hours', type: 'number', value: st.water.every }, { k: 'wf', label: 'From', type: 'time', value: st.water.from }, { k: 'wt', label: 'Until', type: 'time', value: st.water.to }],
      onSave: v => { st.remindBefore = v.rb; st.quiet = { on: v.qon === '1', from: v.qf, to: v.qt }; st.water = { on: v.won === '1', every: clamp(+v.wev || 2, 0.5, 12), from: v.wf, to: v.wt }; return true; } });
  },
  exportJSON() { download(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), `bloom-backup-${dkey()}.json`); },
  importJSON() { $('#jsonIn').click(); },
  async resetAll() { if (await confirmBox('Erase all your data on this device? Download a backup first if you want to keep it.', 'Erase everything')) { S = defaultState(); save(); toast('Fresh start', '🌱'); } },

  // quick add (＋ button)
  fab() {
    const items = [['task', '✅', 'Task'], ['water', '💧', '+1 water'], ['workout', '🏃', 'Workout'], ['sleep', '😴', 'Sleep'], ['weight', '⚖️', 'Weight'], ['link', '🔗', 'Watch later'],
      ['idea', '💡', 'Idea'], ['content', '🎬', 'Content'], ['grocery', '🛒', 'Grocery'], ['goal', '🎯', 'Goal'], ['person', '🤝', 'Person'], ['money', '💰', 'Savings']];
    openModal(`<header class="sheet-head"><h2>Quick add</h2><button class="icon-btn" data-a="closeModal" aria-label="Close">✕</button></header>
      <div class="quick">${items.map(i => `<button data-a="quick" data-v="${i[0]}"><span>${i[1]}</span>${i[2]}</button>`).join('')}</div>`);
  },
  quick(d) {
    closeModal();
    const run = {
      task: () => taskForm(), water: () => { A.waterPlus(); toast(`${todayLog().water}/${S.settings.waterGoal} glasses today`, '💧'); },
      workout: () => A.logWorkout(), sleep: () => A.logSleep(), weight: () => A.logWeight(), goal: () => goalForm(), content: () => contentForm(),
      person: () => personForm(), money: () => savingForm(),
      link: () => ask('Save for later', 'Paste a link', '').then(v => { if (v) { addLinkUrl(v); } }),
      idea: () => ask('New startup idea', 'Idea', '').then(v => { if (v) { S.ideas.push({ id: uid(), title: v, note: '', status: 'New', created: Date.now() }); earn(1, 5, 'Idea: ' + v, true); toast('Idea saved', '💡'); save(); } }),
      grocery: () => { const l = S.lists.find(x => /grocer/i.test(x.name)) || S.lists[0]; if (!l) return; ask(`Add to ${l.name}`, 'Item', '').then(v => { if (v) { l.items.push({ id: uid(), text: v, done: false }); toast(`Added to ${l.name}`, l.emoji); save(); } }); },
    }[d.v];
    if (run) setTimeout(run, 200);
  },

  // cloud & notifications (implemented in part 5)
  setupCloud: () => Cloud.setupForm(), signIn: () => Cloud.signIn(), signOut: () => Cloud.signOut(),
  enableNotif: () => Cloud.enableNotifications(), testNotif: () => localNotify('🌸 Sankalpa test', 'Notifications are working on this device.', true),
};

function waterReward(before, after) {
  const g = S.settings.waterGoal;
  if (before < g && after >= g) { earn(ER('water'), 20, 'Water goal reached'); }
  else if (before >= g && after < g) unearn(ER('water'), 20, 'Water below goal');
}

function curTT() { return S.timetables.find(t => t.id === S.activeTT) || S.timetables[0]; }
function removeRow(t, r) {
  t.slots.splice(r, 1); const nc = {};
  for (const [k, v] of Object.entries(t.cells)) { const [rr, cc] = k.split(',').map(Number); if (rr < r) nc[k] = v; else if (rr > r) nc[`${rr - 1},${cc}`] = v; }
  t.cells = nc;
}

function activityForm(a = {}) {
  const isNew = !a.id;
  openForm({ title: isNew ? 'New favourite activity' : 'Edit activity', fields: [{ k: 'name', label: 'Activity', value: a.name, placeholder: 'e.g. Netflix' }, { k: 'emoji', label: 'Emoji', value: a.emoji || '🎉' }],
    onSave: v => { if (!v.name) return false; if (isNew) S.rewards.activities.push({ id: uid(), ...v }); else Object.assign(a, v); return true; },
    onDelete: isNew ? null : () => { S.rewards.activities = S.rewards.activities.filter(x => x !== a); save(); } });
}
function contentForm(c = {}) {
  const isNew = !c.id;
  openForm({ title: isNew ? 'New content piece' : 'Edit content', fields: [
    { k: 'title', label: 'Title / topic', value: c.title, placeholder: 'e.g. A day in my IISc lab' },
    { k: 'platform', label: 'Platform', type: 'select', options: [...new Set([...S.platforms.map(p => p.name), ...(c.platform ? [c.platform] : [])])].map(n => [n, platEmoji(n) + ' ' + n]), value: c.platform || (UI.plat !== 'All' ? UI.plat : S.platforms[0]?.name) },
    { k: 'stage', label: 'Stage', type: 'select', options: STAGES.map(s => [s, s]), value: c.stage || 'Idea' },
    { k: 'deadline', label: 'Post by', type: 'date', value: c.deadline },
    { k: 'notes', label: 'Hook, script notes, hashtags', type: 'textarea', value: c.notes }],
    onSave: v => {
      if (!v.title) return false;
      const stage = v.stage; delete v.stage;
      let item = c;
      if (isNew) { item = { id: uid(), created: Date.now(), ...v, stage: 'Idea', postedAt: null }; S.content.push(item); }
      else Object.assign(c, v);
      setStage(item, stage);
      return true;
    },
    onDelete: isNew ? null : async () => { if (await confirmBox(`Delete “${c.title}”?`)) { S.content = S.content.filter(x => x !== c); save(); } } });
}
function bucketForm(b = {}) {
  const isNew = !b.id;
  openForm({ title: isNew ? 'Add a dream' : 'Edit dream', fields: [
    { k: 'title', label: 'Dream', value: b.title, placeholder: 'e.g. See the northern lights' },
    { k: 'cat', label: 'Category', type: 'select', options: BUCKET_CATS.map(c => [c[0], c[1] + ' ' + c[0]]), value: b.cat || (UI.bucketCat !== 'All' ? UI.bucketCat : 'Travel') },
    { k: 'year', label: 'By year (optional)', type: 'number', value: b.year }, { k: 'note', label: 'Notes', type: 'textarea', value: b.note }],
    onSave: v => { if (!v.title) return false; if (isNew) S.bucket.push({ id: uid(), done: false, ...v }); else Object.assign(b, v); return true; },
    onDelete: isNew ? null : async () => { if (await confirmBox('Delete this dream?')) { S.bucket = S.bucket.filter(x => x !== b); save(); } } });
}
function savingForm(s = {}) {
  const isNew = !s.id, c = S.settings.currency;
  openForm({ title: isNew ? 'New savings goal' : 'Edit savings goal', fields: [
    { k: 'name', label: 'Saving for', value: s.name, placeholder: 'e.g. Emergency fund' }, { k: 'emoji', label: 'Emoji', value: s.emoji || '💰' },
    { k: 'target', label: `Target (${c})`, type: 'number', value: s.target }, { k: 'saved', label: `Saved so far (${c})`, type: 'number', value: s.saved ?? 0 },
    { k: 'deadline', label: 'Deadline (optional)', type: 'date', value: s.deadline }],
    onSave: v => { if (!v.name || !v.target) return false; if (isNew) S.savings.push({ id: uid(), ...v }); else Object.assign(s, v); return true; },
    onDelete: isNew ? null : async () => { if (await confirmBox(`Delete “${s.name}”?`)) { S.savings = S.savings.filter(x => x !== s); save(); } } });
}
function personForm(p = {}) {
  const isNew = !p.id;
  openForm({ title: isNew ? 'Add a person' : 'Edit person', fields: [
    { k: 'name', label: 'Name', value: p.name }, { k: 'note', label: 'Who they are / what to talk about', value: p.note, placeholder: 'e.g. PhD mentor, ask about internship' },
    { k: 'every', label: 'Reach out every … days', type: 'number', value: p.every ?? 30 }, { k: 'last', label: 'Last contacted', type: 'date', value: p.last || dkey() }],
    onSave: v => { if (!v.name) return false; if (isNew) S.people.push({ id: uid(), ...v }); else Object.assign(p, v); return true; },
    onDelete: isNew ? null : async () => { if (await confirmBox(`Remove ${p.name}?`)) { S.people = S.people.filter(x => x !== p); save(); } } });
}
function areaForm(a = {}) {
  const isNew = !a.id;
  openForm({ title: isNew ? 'New life area' : 'Edit area', fields: [{ k: 'name', label: 'Name', value: a.name }, { k: 'emoji', label: 'Emoji', value: a.emoji || '✨' }, { k: 'color', label: 'Colour', type: 'color', value: a.color || SWATCHES[0] }],
    onSave: v => { if (!v.name) return false; if (isNew) S.areas.push({ id: uid(), ...v }); else Object.assign(a, v); return true; },
    onDelete: isNew || S.areas.length < 2 ? null : async () => { if (await confirmBox(`Delete area “${a.name}”? Its tasks move to the first area.`)) { S.areas = S.areas.filter(x => x !== a); const f = S.areas[0].id; [...S.tasks, ...S.goals, ...S.habits].forEach(x => { if (x.areaId === a.id) x.areaId = f; }); save(); } } });
}
function habitForm(h = {}) {
  const isNew = !h.id;
  openForm({ title: isNew ? 'New daily habit' : 'Edit habit', fields: [{ k: 'name', label: 'Habit', value: h.name, placeholder: 'e.g. 10 min meditation' }, { k: 'emoji', label: 'Emoji', value: h.emoji || '🌿' }, { k: 'areaId', label: 'Area', type: 'select', options: areaOptions(), value: h.areaId || 'balance' }],
    onSave: v => { if (!v.name) return false; if (isNew) S.habits.push({ id: uid(), ...v }); else Object.assign(h, v); return true; },
    onDelete: isNew ? null : () => { S.habits = S.habits.filter(x => x !== h); save(); } });
}
function routineForm(r = {}) {
  const isNew = !r.id;
  openForm({ title: isNew ? 'New routine reminder' : 'Edit routine reminder', fields: [{ k: 'label', label: 'Reminder text', value: r.label, placeholder: 'e.g. 📖 Reading time' }, { k: 'time', label: 'Time', type: 'time', value: r.time || '08:00' }, { k: 'days', label: 'Days', type: 'days', value: r.days || [0, 1, 2, 3, 4, 5, 6] }],
    onSave: v => { if (!v.label || !v.days.length) return false; if (isNew) S.settings.routines.push({ id: uid(), ...v }); else Object.assign(r, v); return true; },
    onDelete: isNew ? null : () => { S.settings.routines = S.settings.routines.filter(x => x !== r); save(); } });
}

// ---------- files ----------
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function loadXLSX() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load the Excel library. Check your internet.')); document.head.appendChild(s); });
}
async function exportTimetable() {
  try {
    await loadXLSX(); const t = curTT();
    let aoa, fname = t.name.replace(/[^\w\- ]/g, '') || 'timetable';
    if (t.type === 'monthly') {
      const [y, m] = t.month.split('-').map(Number), dim = new Date(y, m, 0).getDate();
      aoa = [['Date', ...t.cols]];
      for (let d = 1; d <= dim; d++) { const k = dkey(new Date(y, m - 1, d)); aoa.push([k, ...t.cols.map((_, c) => t.cells[`${k},${c}`]?.text || '')]); }
      fname += ' ' + t.month;
    } else aoa = [['Time', ...t.days], ...t.slots.map((s, r) => [s, ...t.days.map((_, c) => t.cells[`${r},${c}`]?.text || '')])];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 14 }, ...aoa[0].slice(1).map(() => ({ wch: 22 }))];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, t.name.slice(0, 30) || 'Timetable');
    XLSX.writeFile(wb, `${fname}.xlsx`);
    toast('Excel file downloaded', '📅');
  } catch (e) { toast(e.message, '⚠️'); }
}
async function importTimetable(file) {
  try {
    await loadXLSX();
    const wb = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
    const clean = rows.filter(r => r.some(c => String(c).trim()));
    if (clean.length < 2) throw new Error('The sheet needs a header row of days and at least one time row.');
    const name = file.name.replace(/\.[^.]+$/, '');
    if (/^date/i.test(String(clean[0][0]).trim())) {
      const cols = clean[0].slice(1).map(String).map(s => s.trim()).filter(Boolean);
      const t = { id: uid(), name, type: 'monthly', month: '', cols, cells: {}, remind: false, remindTime: '07:30' };
      clean.slice(1).forEach(r => { const k = normDate(r[0]); if (!k) return; if (!t.month) t.month = k.slice(0, 7); cols.forEach((_, c) => { const v = String(r[c + 1] ?? '').trim(); if (v) t.cells[`${k},${c}`] = { text: v }; }); });
      t.month = t.month || dkey().slice(0, 7);
      S.timetables.push(t); S.activeTT = t.id; save(); toast(`Imported monthly plan “${name}”`, '🗓️'); return;
    }
    const days = clean[0].slice(1).map(String).map(s => s.trim()).filter(Boolean);
    const t = { id: uid(), name, type: 'weekly', days, slots: [], cells: {}, remind: false };
    clean.slice(1).forEach((r, ri) => { t.slots.push(String(r[0]).trim() || `Slot ${ri + 1}`); days.forEach((_, c) => { const v = String(r[c + 1] ?? '').trim(); if (v) t.cells[`${ri},${c}`] = { text: v }; }); });
    S.timetables.push(t); S.activeTT = t.id; save(); toast(`Imported “${t.name}”`, '📅');
  } catch (e) { toast(e.message || 'Could not read that file', '⚠️'); }
}

function normDate(v) {
  const s = String(v ?? '').trim(); if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{5}$/.test(s)) { const d = new Date(Math.round((+s - 25569) * 864e5)); return dkey(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
  const m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); // day/month/year, as in India
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return dkey(new Date(y, +m[2] - 1, +m[1])); }
  const d = new Date(s); return isNaN(d) ? '' : dkey(d);
}
function setStage(c, stage) {
  const was = c.stage; if (!STAGES.includes(stage) || was === stage) return;
  c.stage = stage;
  if (stage === 'Posted') { c.postedAt = Date.now(); S.stats.postsDone++; earn(ER('post'), 40, 'Published: ' + (c.title || 'content')); }
  else if (was === 'Posted') { S.stats.postsDone = Math.max(0, S.stats.postsDone - 1); c.postedAt = null; unearn(ER('post'), 40, 'Unpublished: ' + c.title); }
}
async function exportContent() {
  try {
    await loadXLSX();
    const rows = S.content.filter(c => UI.plat === 'All' || c.platform === UI.plat);
    const aoa = [['Platform', 'Title', 'Stage', 'Post by', 'Notes', 'Posted on'], ...rows.map(c => [c.platform, c.title, c.stage, c.deadline || '', c.notes || '', c.postedAt ? dkey(new Date(c.postedAt)) : ''])];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 50 }, { wch: 12 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Content');
    XLSX.writeFile(wb, `content-plan-${dkey()}.xlsx`); toast('Excel file downloaded', '🎬');
  } catch (e) { toast(e.message, '⚠️'); }
}
async function importContent(file) {
  try {
    await loadXLSX();
    const wb = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false }).filter(r => r.some(c => String(c).trim()));
    if (rows.length < 2) throw new Error('The sheet needs a header row and at least one row.');
    const h = rows[0].map(x => String(x).trim().toLowerCase());
    const col = (...names) => h.findIndex(x => names.some(n => x.startsWith(n)));
    const iP = col('platform'), iT = col('title', 'topic'), iS = col('stage', 'status'), iD = col('post by', 'deadline', 'date'), iN = col('notes', 'hook');
    if (iT < 0) throw new Error('Could not find a “Title” column.');
    let added = 0;
    rows.slice(1).forEach(r => {
      const title = String(r[iT] || '').trim(); if (!title) return;
      const pRaw = String(r[iP] || '').trim();
      let plat = S.platforms.find(p => p.name.toLowerCase() === pRaw.toLowerCase())?.name;
      if (!plat && pRaw) { S.platforms.push({ id: uid(), name: pRaw, emoji: '🌐' }); plat = pRaw; }
      plat = plat || S.platforms[0]?.name || 'Other';
      if (S.content.some(c => c.title === title && c.platform === plat)) return;
      const stRaw = String(r[iS] || '').trim().toLowerCase(), stage = STAGES.find(x => x.toLowerCase() === stRaw) || 'Idea';
      const item = { id: uid(), created: Date.now(), title, platform: plat, stage: 'Idea', deadline: iD >= 0 ? normDate(r[iD]) : '', notes: iN >= 0 ? String(r[iN] || '') : '', postedAt: null };
      S.content.push(item);
      if (stage === 'Posted') { item.stage = 'Posted'; item.postedAt = Date.now(); S.stats.postsDone++; } else item.stage = stage;
      added++;
    });
    UI.contentView = 'table'; save(); toast(`Imported ${added} row${added === 1 ? '' : 's'}`, '🎬');
  } catch (e) { toast(e.message || 'Could not read that file', '⚠️'); }
}
function addLinkUrl(v) {
  v = v.trim(); if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  const cat = /youtu\.?be/i.test(v) ? 'YouTube' : /coursera|nptel|udemy|edx|khanacademy|swayam|lecture/i.test(v) ? 'Lecture' : /spotify|podcast|anchor\.fm/i.test(v) ? 'Podcast' : 'Article';
  const l = { id: uid(), url: v, title: v.replace(/^https?:\/\/(www\.)?/, '').slice(0, 80), cat, note: '', by: '', done: false, created: Date.now() };
  S.links.push(l); save(); toast('Saved for later', '🔗'); fetchLinkTitle(l);
}
async function fetchLinkTitle(l) {
  const tries = [];
  if (/youtu\.?be/.test(l.url)) tries.push(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(l.url)}`);
  tries.push(`https://noembed.com/embed?url=${encodeURIComponent(l.url)}`);
  for (const u of tries) {
    try { const r = await fetch(u); if (!r.ok) continue; const j = await r.json(); if (j.title) { l.title = j.title; save(); return; } } catch { }
  }
}

// ---------- reward timer ----------
function stopActivity(auto) {
  const r = S.rewards.running; if (!r) return;
  const a = findBy(S.rewards.activities, r.id) || { name: 'Free time' };
  const used = Math.round((Date.now() - r.start) / 6000) / 10;
  S.rewards.running = null;
  unearn(Math.min(used, S.rewards.balance), 0, `Spent on ${a.name}`);
  save();
  if (auto) { localNotify('⏳ Time’s up', `Your ${a.name} time is over. Finish a task to earn more.`); celebrate('Time’s up ⏳', `That was all your earned time for ${a.name}. Pick a task to earn more.`); }
  else toast(`${used} min used`, '⏳');
}
function tick() {
  const r = S.rewards.running, el = $('#timerLeft');
  if (!r) return;
  const left = S.rewards.balance - (Date.now() - r.start) / 60000;
  if (el) { const s = Math.max(0, Math.round(left * 60)); el.textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`; }
  if (left <= 5 && !r.warned) { r.warned = true; saveLocalOnly(); const a = findBy(S.rewards.activities, r.id); localNotify('⏳ 5 minutes left', `${a ? a.name : 'Free time'} ends soon.`); toast('5 minutes left', '⏳'); }
  if (left <= 0) stopActivity(true);
}

// ---------- local notifications (while the app is open) ----------
async function localNotify(title, body, force) {
  try {
    if (!('Notification' in window)) { if (force) toast('Notifications are not supported here', '⚠️'); return; }
    if (Notification.permission !== 'granted') { if (force) { const p = await Notification.requestPermission(); if (p !== 'granted') return; } else return; }
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) reg.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'local-' + Date.now() });
    else new Notification(title, { body });
  } catch (e) { console.warn(e); }
}
// If push isn't set up, fire due reminders while the app is open.
const shownLocal = new Set(JSON.parse(localStorage.getItem('bloom_shown') || '[]'));
function localReminderCheck() {
  if (Cloud.status().push) return; // the push sender handles it
  const now = Date.now();
  for (const e of buildEvents()) {
    if (e.at <= now && e.at > now - 10 * 60000 && !shownLocal.has(e.id)) { shownLocal.add(e.id); localNotify(e.title, e.body); }
  }
  localStorage.setItem('bloom_shown', JSON.stringify([...shownLocal].slice(-300)));
}

// ---------- render ----------
function currentView() { const v = location.hash.slice(1); return VIEWS[v] ? v : 'today'; }
function render() {
  const main = $('#main');
  document.body.classList.toggle('locked', LOCKED);
  buildNav();
  if (LOCKED) { main.innerHTML = vGate(); main.dataset.view = 'gate'; document.title = 'Sankalpa'; return; }
  const v = currentView();
  const y = window.scrollY, sameView = main.dataset.view === v;
  main.innerHTML = VIEWS[v]();
  main.dataset.view = v;
  if (!sameView) window.scrollTo(0, 0); else window.scrollTo(0, y);
  document.title = `${TITLES[v]} · Sankalpa`;
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === v || (a.dataset.nav === 'more' && MORE.some(m => m[0] === v))));
  tick();
}
const shown = n => !S.hidden.includes(n[0]);
function buildNav() {
  $('#bottomnav').innerHTML = NAV.filter(shown).map(n => `<a href="#${n[0]}" data-nav="${n[0]}"><span>${n[2]}</span><small>${n[1]}</small></a>`).join('');
  $('#sidenav').innerHTML = `<div class="brand"><span class="brand-mark">🌸</span><b>Sankalpa</b></div>` +
    [...NAV.filter(n => n[0] !== 'more'), ...MORE].filter(shown).map(n => `<a href="#${n[0]}" data-nav="${n[0]}"><span>${n[2]}</span>${n[1]}</a>`).join('');
}

// ---------- events ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  e.preventDefault(); fn(el.dataset, el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
  if (e.key === 'Enter' && e.target.matches('[role=button][data-a]')) e.target.click();
  if (e.key === 'Enter' && FORM && e.target.matches('.form input')) { e.preventDefault(); A.formSave(); }
  if (e.key === 'Enter' && e.target.matches('.xsheet input')) { e.preventDefault(); e.target.blur(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.ch === 'ttSelect') { S.activeTT = el.value; save(); }
  if (el.dataset.ch === 'ideaStatus') { findBy(S.ideas, el.dataset.id).status = el.value; save(); }
  if (el.dataset.ch === 'cField') {
    const c = findBy(S.content, el.dataset.id); if (!c) return;
    if (el.dataset.f === 'stage') { setStage(c, el.value); el.closest('tr').className = 'st-' + c.stage.toLowerCase(); }
    else c[el.dataset.f] = el.value.trim();
    save({ silent: true });
  }
  if (el.id === 'contentIn' && el.files[0]) { importContent(el.files[0]); el.value = ''; }
  if (el.id === 'xlsxIn' && el.files[0]) { importTimetable(el.files[0]); el.value = ''; }
  if (el.id === 'jsonIn' && el.files[0]) {
    el.files[0].text().then(t => { try { S = migrate(JSON.parse(t)); save(); toast('Backup restored', '✅'); } catch { toast('That file is not a Sankalpa backup', '⚠️'); } });
    el.value = '';
  }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-submit]'); if (!f) return; e.preventDefault();
  if (f.dataset.submit === 'addItem') { const v = $('#itemIn').value.trim(); if (!v) return; findBy(S.lists, UI.listId).items.push({ id: uid(), text: v, done: false }); save(); setTimeout(() => $('#itemIn')?.focus(), 0); }
  if (f.dataset.submit === 'addLink') { const v = $('#linkIn').value.trim(); if (v) addLinkUrl(v); }
  if (f.dataset.submit === 'addIdea') { const v = $('#ideaIn').value.trim(); if (!v) return; S.ideas.push({ id: uid(), title: v, note: '', status: 'New', created: Date.now(), ventureId: UI.venture !== 'All' ? UI.venture : S.ventures[0]?.id }); earn(1, 5, 'Idea: ' + v, true); toast('Idea saved', '💡'); save(); }
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
window.addEventListener('hashchange', render);

// ---------- start ----------
buildNav();
render();
setInterval(tick, 1000);
setInterval(localReminderCheck, 30000);
setInterval(() => { if ($('#modal').hidden && !document.activeElement?.matches('input,textarea,select')) render(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); localReminderCheck(); } });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
}
Cloud.init();
/* Part 4b: actions for focus goals, priorities, spaces, phase, managers */
const findStarTarget = (k, id) => ({ task: S.tasks, goal: S.goals, content: S.content, space: S.spaces }[k] || []).find(x => x.id === id);

Object.assign(A, {
  star(d) { const x = findStarTarget(d.k, d.id); if (!x) return; x.star = isStar(x) ? '' : weekKey(); toast(isStar(x) ? 'Added to this week\'s priorities' : 'Removed from priorities', '⭐'); save(); },
  pickPriorities() { openModal(priorityPickerHTML()); },
  toggleFocus(d) {
    const g = findBy(S.goals, d.id);
    if (!g.focus && S.goals.filter(x => x.focus && !x.done).length >= 2) { toast('You can focus on 2 goals at a time. Un-focus one first.', '🎯'); return; }
    g.focus = !g.focus; toast(g.focus ? 'Now a focus goal — it\'s on your Today screen' : 'No longer a focus goal', '🎯'); save();
  },
  goFocus() { UI.goalH = S.goals.some(g => g.horizon === UI.goalH) ? UI.goalH : (S.goals[0]?.horizon || 'year'); location.hash = 'goals'; setTimeout(() => toast(S.goals.length ? 'Tap 🎯 on up to 2 goals' : 'Create a goal first, then tap 🎯 on it', '🎯'), 300); },
  venture: d => { UI.venture = d.v; render(); },
  go: d => { location.hash = d.v; },
  editPhase() {
    const p = S.phase;
    openForm({ title: 'Current life phase', fields: [
      { k: 'name', label: 'What phase are you in?', value: p.name, placeholder: 'e.g. JRF year 1 + growing my channel' },
      { k: 'emoji', label: 'Emoji', value: p.emoji || '🌷' },
      { k: 'until', label: 'Until (optional)', type: 'date', value: p.until },
      { k: 'note', label: 'What matters most in this phase', type: 'textarea', value: p.note }],
      onSave: v => { S.phase = v; return true; } });
  },

  // platforms / startups
  manage(d) { openModal(managerHTML(d.v)); },
  manEdit(d) {
    const kind = d.k, arr = kind === 'platforms' ? S.platforms : S.ventures, x = d.id ? findBy(arr, d.id) : null;
    const reopen = () => setTimeout(() => A.manage({ v: kind }), 260);
    openForm({ title: x ? 'Edit' : (kind === 'platforms' ? 'New platform' : 'New startup'), fields: [
      { k: 'name', label: 'Name', value: x?.name, placeholder: kind === 'platforms' ? 'e.g. Instagram 4, Pinterest, Substack' : 'e.g. Biotech consultancy' },
      { k: 'emoji', label: 'Emoji', value: x?.emoji || (kind === 'platforms' ? '🌐' : '🚀') }],
      onSave: v => {
        if (!v.name) return false;
        if (x) { if (kind === 'platforms' && x.name !== v.name) S.content.forEach(c => { if (c.platform === x.name) c.platform = v.name; }); Object.assign(x, v); }
        else arr.push({ id: uid(), ...v });
        reopen(); return true;
      },
      onDelete: x && arr.length > 1 ? () => { const i = arr.indexOf(x); arr.splice(i, 1); if (kind === 'ventures') S.ideas.forEach(t => { if (t.ventureId === x.id) t.ventureId = arr[0].id; }); save(); reopen(); } : null });
  },

  // spaces
  openSpace(d) { UI.spaceId = d.id; if (location.hash !== '#spaces') location.hash = 'spaces'; else render(); },
  newSpace: () => spaceForm(), editSpace: d => spaceForm(findBy(S.spaces, d.id)),
  pinSpace(d) { const sp = findBy(S.spaces, d.id); sp.pinned = !sp.pinned; toast(sp.pinned ? 'Pinned to Today' : 'Unpinned', '📌'); save(); },
  newSpaceItem: d => spaceItemForm(findBy(S.spaces, d.s)), editSpaceItem: d => { const sp = findBy(S.spaces, d.s); spaceItemForm(sp, findBy(sp.items, d.id)); },
  spaceTick(d) { const sp = findBy(S.spaces, d.s), it = findBy(sp.items, d.id); setSpaceVal(sp, it, spaceVal(it) ? 0 : 1); },
  spaceStep(d) { const sp = findBy(S.spaces, d.s), it = findBy(sp.items, d.id); setSpaceVal(sp, it, Math.max(0, spaceVal(it) + (+d.v) * (+it.step || 1))); },
  spaceSet(d) { const sp = findBy(S.spaces, d.s), it = findBy(sp.items, d.id); ask(it.name, `How many ${it.unit || ''} so far (${periodLabel(it.freq)})?`, spaceVal(it), 'number').then(v => { if (v !== '' && v != null) setSpaceVal(sp, it, Math.max(0, +v)); }); },

  // to-do list items: due dates
  editItem(d) {
    const l = findBy(S.lists, UI.listId), it = findBy(l.items, d.id);
    openForm({ title: 'Edit item', fields: [
      { k: 'text', label: 'Item', value: it.text },
      { k: 'due', label: 'Due (optional, sends a reminder)', type: 'datetime', value: it.due && it.due.length === 10 ? it.due + 'T09:00' : it.due },
      { k: 'note', label: 'Note (quantity, brand, link…)', value: it.note }],
      onSave: v => { if (!v.text) return false; Object.assign(it, v); return true; },
      onDelete: () => { l.items = l.items.filter(x => x !== it); save(); } });
  },
});

const periodLabel = f => ({ daily: 'today', weekly: 'this week', monthly: 'this month', once: 'total' }[f]);
function setSpaceVal(sp, it, val) {
  const pk = periodKey(it.freq), was = itemDone(it);
  S.spaceLog[pk] = S.spaceLog[pk] || {};
  if (val) S.spaceLog[pk][it.id] = val; else delete S.spaceLog[pk][it.id];
  const now = itemDone(it);
  if (!was && now) earn(ER('space'), 6, `${sp.emoji} ${it.name}`);
  else if (was && !now) unearn(ER('space'), 6, `Undid ${it.name}`);
  save();
}
const SPACE_COLORS = ['#E3D6F8', '#F8D5E5', '#FADCCB', '#CFEEE0', '#D3E4F8', '#F8EBBE', '#F3C9D9', '#D9D0F0'];
function spaceForm(sp = {}) {
  const isNew = !sp.id;
  openForm({ title: isNew ? 'New space' : 'Edit space', fields: [
    { k: 'name', label: 'Name', value: sp.name, placeholder: 'e.g. Spirituality, Self-care, Language learning' },
    { k: 'emoji', label: 'Emoji', value: sp.emoji || '🪷' },
    { k: 'color', label: 'Colour', type: 'color', value: sp.color || SPACE_COLORS[0], options: SPACE_COLORS },
    { k: 'pinned', label: 'Show on Today', type: 'select', options: [['1', '📌 Yes'], ['0', 'No']], value: sp.pinned ? '1' : '0' }],
    onSave: v => {
      if (!v.name) return false; v.pinned = v.pinned === '1';
      if (isNew) { const n = { id: uid(), items: [], ...v }; S.spaces.push(n); UI.spaceId = n.id; } else Object.assign(sp, v);
      return true;
    },
    onDelete: isNew ? null : async () => { if (await confirmBox(`Delete the “${sp.name}” space and its items?`)) { S.spaces = S.spaces.filter(x => x !== sp); save(); } } });
}
function spaceItemForm(sp, it = {}) {
  const isNew = !it.id;
  openForm({ title: isNew ? `Add to ${sp.name}` : 'Edit item', fields: [
    { k: 'name', label: 'What', value: it.name, placeholder: 'e.g. Hanuman Chalisa, Read Gita, Journal' },
    { k: 'type', label: 'Track as', type: 'select', options: [['check', '✓ A tick (done / not done)'], ['count', '🔢 A count (pages, minutes, times…)']], value: it.type || 'check' },
    { k: 'target', label: 'Target (for counts)', type: 'number', value: it.target ?? 10 },
    { k: 'unit', label: 'Unit (for counts)', value: it.unit ?? '', placeholder: 'pages, min, times, rounds' },
    { k: 'step', label: 'Each + adds (for counts)', type: 'number', value: it.step ?? 1 },
    { k: 'freq', label: 'How often', type: 'select', options: FREQS, value: it.freq || 'daily' },
    { k: 'time', label: 'Reminder time (optional)', type: 'time', value: it.time || '' },
    { k: 'day', label: 'Reminder day (for weekly items)', type: 'select', options: DAYS.map((d, i) => [i, d]), value: it.day ?? 0 },
    { k: 'due', label: 'Deadline (optional, for one-time items)', type: 'date', value: it.due || '' }],
    onSave: v => {
      if (!v.name) return false; v.target = +v.target || 1; v.step = +v.step || 1; v.day = +v.day || 0;
      if (isNew) sp.items.push({ id: uid(), ...v }); else Object.assign(it, v);
      return true;
    },
    onDelete: isNew ? null : () => { sp.items = sp.items.filter(x => x !== it); save(); } });
}

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.ch === 'pickStar') {
    const x = findStarTarget(el.dataset.k, el.dataset.id); if (!x) return;
    x.star = el.checked ? weekKey() : ''; save({ silent: true });
  }
  if (el.dataset.ch === 'toggleSection') {
    const id = el.value; S.hidden = el.checked ? S.hidden.filter(h => h !== id) : [...new Set([...S.hidden, id])]; save();
  }
});
// refresh Today when the priorities picker closes
const _closeModal = closeModal;
closeModal = function () { const wasPicker = !!$('#modal .picker'); _closeModal(); if (wasPicker) render(); };
A.closeModal = closeModal;
/* Part 4c: actions for the content planner, money, festivals, weekly review,
   day planner (drag & drop), welcome screen and new settings */

// ---------- content planner ----------
function growthCard() {
  const G = S.contentPlan.goals;
  const withData = S.platforms.filter(p => G[p.id] && (G[p.id].followers || []).length);
  if (!withData.length) return `<section class="card"><div class="card-head"><h2>📈 Follower growth</h2></div><p class="small muted">Tap a platform's “Goal” or “Target” cell and log your follower count now and then. Your growth chart appears here.</p></section>`;
  return `<section class="card"><div class="card-head"><h2>📈 Follower growth</h2></div><div class="growth">${withData.map(p => {
    const f = G[p.id].followers, last = f[f.length - 1], first = f[0], diff = last.n - first.n;
    return `<div class="gcard"><div class="row"><b>${p.emoji} ${esc(p.name)}</b><span class="grow"></span><b>${(+last.n).toLocaleString('en-IN')}</b>${f.length > 1 ? `<span class="due ${diff >= 0 ? 'due-ok' : 'due-over'}">${diff >= 0 ? '+' : ''}${diff.toLocaleString('en-IN')}</span>` : ''}</div>
      ${lineChart(f.slice(-20).map(x => ({ x: x.d, y: +x.n })), { color: '#C0578C' })}<button class="mini-btn" data-a="logFollowers" data-id="${p.id}">+ Log today</button></div>`;
  }).join('')}</div></section>`;
}
function logFollowersForm(p) {
  const G = S.contentPlan.goals; G[p.id] = G[p.id] || {};
  ask(`${p.emoji} ${p.name} followers`, 'Follower count today', (G[p.id].followers || []).slice(-1)[0]?.n || '', 'number').then(v => {
    if (v === '' || v == null) return;
    const f = G[p.id].followers = (G[p.id].followers || []).filter(x => x.d !== dkey());
    f.push({ d: dkey(), n: +v }); f.sort((a, b) => a.d.localeCompare(b.d)); save();
  });
}

Object.assign(A, {
  planMode(d) { UI.planMode = d.v; render(); },
  planNav(d) {
    const [y, m, dd] = UI.planAnchor.split('-').map(Number); let a = new Date(y, m - 1, dd);
    if (UI.planMode === 'daily') a = addDays(a, 7 * +d.v); else if (UI.planMode === 'weekly') a = new Date(y, m - 1 + +d.v, 1); else a = new Date(y, m - 1 + 6 * +d.v, 1);
    UI.planAnchor = dkey(a); render();
  },
  planToday() { UI.planAnchor = dkey(); render(); },
  planCell(d) {
    const key = d.key, cell = S.contentPlan.cells[key] || {}, [colKey, pid] = key.split('|'), p = findBy(S.platforms, pid) || { emoji: '', name: '' };
    const when = colKey.startsWith('d:') ? fmtDate(colKey.slice(2)) : colKey.startsWith('w:') ? 'Week of ' + fmtDate(colKey.slice(2)) : parseDate(colKey.slice(2) + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    openForm({ title: `${p.emoji} ${p.name} · ${when}`, fields: [
      { k: 'text', label: 'What\'s planned', value: cell.text, placeholder: 'e.g. Reel: a day in the lab / 3 stories / blog draft' },
      { k: 'format', label: 'Format', type: 'select', options: [['', '—'], ...['Reel', 'Post', 'Carousel', 'Story', 'Video', 'Short', 'Live', 'Blog', 'Newsletter', 'Message'].map(f => [f, f])], value: cell.format || '' },
      { k: 'status', label: 'Status', type: 'select', options: STAGES.map(x => [x, x]), value: cell.status || 'Idea' }],
      onSave: v => {
        if (!v.text) { delete S.contentPlan.cells[key]; return true; }
        const was = !!cell.done, done = was || v.status === 'Posted';
        S.contentPlan.cells[key] = { ...cell, ...v, done };
        if (!was && done) earn(ER('plan'), 10, `${p.emoji} ${v.text}`);
        return true;
      },
      onDelete: cell.text ? () => { delete S.contentPlan.cells[key]; save(); } : null });
  },
  planTick(d) {
    const c = S.contentPlan.cells[d.key]; if (!c) return;
    c.done = !c.done; c.status = c.done ? 'Posted' : (c.status === 'Posted' ? 'Edit' : c.status);
    if (c.done) earn(ER('plan'), 10, 'Content: ' + c.text); else unearn(ER('plan'), 10, 'Undid: ' + c.text);
    save();
  },
  planGoal(d) {
    const p = findBy(S.platforms, d.id), G = S.contentPlan.goals, g = G[p.id] = G[p.id] || {};
    openForm({ title: `${p.emoji} ${p.name} goals`, fields: [
      { k: 'goal', label: 'Big goal', value: g.goal, placeholder: 'e.g. 10k followers by March' },
      { k: 'weekly', label: 'Posts per week (target)', type: 'number', value: g.weekly || '' },
      { k: 'followers', label: 'Followers right now (optional — builds your growth chart)', type: 'number', value: '' }],
      onSave: v => {
        g.goal = v.goal; g.weekly = v.weekly === '' ? '' : +v.weekly;
        if (v.followers !== '' && v.followers != null) { g.followers = (g.followers || []).filter(x => x.d !== dkey()); g.followers.push({ d: dkey(), n: +v.followers }); g.followers.sort((a, b) => a.d.localeCompare(b.d)); }
        return true;
      } });
  },
  logFollowers(d) { logFollowersForm(findBy(S.platforms, d.id)); },
  async exportPlan() {
    try {
      await loadXLSX(); const { label, cols } = planColumns();
      const aoa = [['Platform', 'Goal', 'Weekly target', ...cols.map(c => c.head)], ...S.platforms.map(p => {
        const g = S.contentPlan.goals[p.id] || {};
        return [p.name, g.goal || '', g.weekly || '', ...cols.map(c => { const cell = S.contentPlan.cells[`${c.key}|${p.id}`]; return cell && cell.text ? `${cell.done ? '✓ ' : ''}${cell.text}${cell.format ? ' [' + cell.format + ']' : ''}` : ''; })];
      })];
      const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 10 }, ...cols.map(() => ({ wch: 24 }))];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Content plan');
      XLSX.writeFile(wb, `content-plan ${label.replace(/[^\w\- ]/g, '')}.xlsx`); toast('Excel file downloaded', '📅');
    } catch (e) { toast(e.message, '⚠️'); }
  },

  // ---------- money ----------
  moneyNav(d) { const [y, m] = UI.moneyMonth.split('-').map(Number), n = new Date(y, m - 1 + +d.v, 1); UI.moneyMonth = `${n.getFullYear()}-${pad(n.getMonth() + 1)}`; render(); },
  newExpense: () => txForm('expense'), newIncome: () => txForm('income'),
  editTx(d) { const t = findBy(S.money.tx, d.id); if (t.type === 'saving') { toast('Savings entries change from the savings goal', '💰'); return; } txForm(t.type, t); },
  manageCats() { openModal(catManagerHTML()); },
  catTab(d) { UI.catTab = d.v; openModal(catManagerHTML()); },
  catEdit(d) {
    const type = UI.catTab || 'expense', arr = type === 'income' ? S.money.incomeCats : S.money.expenseCats, c = d.id ? findBy(arr, d.id) : null;
    const reopen = () => setTimeout(() => A.manageCats(), 260);
    const fields = [{ k: 'name', label: 'Name', value: c?.name, placeholder: type === 'income' ? 'e.g. Freelance' : 'e.g. Coffee & snacks' }, { k: 'emoji', label: 'Emoji', value: c?.emoji || (type === 'income' ? '💰' : '💸') }];
    if (type === 'expense') fields.push({ k: 'budget', label: `Monthly budget (${S.settings.currency}, optional)`, type: 'number', value: c?.budget ?? '' });
    openForm({ title: c ? 'Edit category' : 'New category', fields,
      onSave: v => { if (!v.name) return false; if (c) Object.assign(c, v); else arr.push({ id: uid(), ...v }); reopen(); return true; },
      onDelete: c && arr.length > 1 ? () => { arr.splice(arr.indexOf(c), 1); S.money.tx.forEach(t => { if (t.cat === c.id) t.cat = arr[arr.length - 1].id; }); save(); reopen(); } : null });
  },
  async exportMoney() {
    try {
      await loadXLSX();
      const aoa = [['Date', 'Type', 'Category / source', 'Amount', 'Note', 'Paid by'], ...monthTx().sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, t.type, catOf(t).name, +t.amount, t.note || '', t.mode || ''])];
      const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 11 }, { wch: 9 }, { wch: 22 }, { wch: 10 }, { wch: 30 }, { wch: 10 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, UI.moneyMonth);
      XLSX.writeFile(wb, `money-${UI.moneyMonth}.xlsx`); toast('Excel file downloaded', '💰');
    } catch (e) { toast(e.message, '⚠️'); }
  },
  addMoney(d) {
    const s = findBy(S.savings, d.id), wasDone = +s.saved >= +s.target;
    ask(`Add to ${s.name}`, `Amount (${S.settings.currency}). Use a minus to take money out.`, '', 'number').then(v => {
      if (!v) return; v = +v;
      s.saved = Math.round(((+s.saved || 0) + v) * 100) / 100;
      if (v > 0) S.money.tx.push({ id: uid(), type: 'saving', goalId: s.id, amount: v, date: dkey(), note: 'Saved for ' + s.name, created: Date.now() });
      if (!wasDone && +s.saved >= +s.target) celebrate('Savings goal reached 🐷', s.name);
      checkBadges(); save();
    });
  },

  // ---------- intention, festivals, review ----------
  keepVrat(d) {
    const f = findBy(S.fest, d.id), k = dkey(); f.kept = f.kept || {};
    f.kept[k] = !f.kept[k];
    if (f.kept[k]) earn(ER('vrat'), 20, 'Vrat: ' + f.name); else unearn(ER('vrat'), 20, 'Undid vrat');
    save();
  },
  festNav(d) { const [y, m] = UI.festMonth.split('-').map(Number), n = new Date(y, m - 1 + +d.v, 1); UI.festMonth = `${n.getFullYear()}-${pad(n.getMonth() + 1)}`; render(); },
  newFest: d => festForm({ date: d.date || dkey() }), editFest: d => festForm(findBy(S.fest, d.id)),
  reviewNav(d) { UI.reviewWeek = dkey(addDays(parseDate(UI.reviewWeek || weekKey()), +d.v)); render(); },
  reviewRate(d) { const wk = UI.reviewWeek || weekKey(); S.reviews[wk] = S.reviews[wk] || {}; S.reviews[wk].rating = +d.v; save(); },

  // ---------- day planner ----------
  planDay(d) { UI.planDate = +d.v === 0 ? dkey() : dkey(addDays(parseDate(UI.planDate), +d.v)); UI.pickTask = null; render(); },
  pickTask(d) { if (DRAG_SUPPRESS) return; UI.pickTask = UI.pickTask === d.id ? null : d.id; render(); },
  placeTask(d) { if (!UI.pickTask) return; const id = UI.pickTask; UI.pickTask = null; scheduleTask(id, d.v); },
  editBlock(d) {
    const t = findBy(S.tasks, d.id);
    openForm({ title: t.title, fields: [
      { k: 'start', label: 'Starts at', type: 'time', value: t.plan.start },
      { k: 'dur', label: 'How long', type: 'select', options: [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 hour'], [90, '1½ hours'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours']], value: t.plan.dur || 60 },
      { k: 'done', label: 'Status', type: 'select', options: [['0', 'Not done yet'], ['1', '✓ Done']], value: t.done ? '1' : '0' }],
      saveLabel: 'Save',
      onSave: v => { t.plan.start = v.start || t.plan.start; t.plan.dur = +v.dur; if ((v.done === '1') !== !!t.done) setTimeout(() => A.toggleTask({ id: t.id }), 250); return true; },
      onDelete: () => { t.plan = null; toast('Moved back to “To schedule”', '🗓️'); save(); } });
  },

  // ---------- insights / settings ----------
  heat(d) { UI.heat = d.v; render(); },
  editEarn() {
    openForm({ title: 'Earning rates (minutes)', fields: EARN_TYPES.map(([k, l]) => ({ k, label: l, type: 'number', value: ER(k) })),
      onSave: v => { for (const [k] of EARN_TYPES) S.settings.earn[k] = v[k] === '' ? '' : Math.max(0, +v[k]); toast('Earning rates saved', '⏳'); return true; } });
  },
  editBriefing() {
    const b = S.settings.briefing;
    openForm({ title: 'Notification times', fields: [
      { k: 'morning', label: '☀️ Morning briefing', type: 'time', value: b.morning }, { k: 'evening', label: '🌙 Evening review', type: 'time', value: b.evening },
      { k: 'reviewDay', label: '📝 Weekly review day', type: 'select', options: DAYS.map((x, i) => [i, x]), value: b.reviewDay }, { k: 'reviewTime', label: 'at', type: 'time', value: b.reviewTime }],
      onSave: v => { S.settings.briefing = { ...v, reviewDay: +v.reviewDay }; return true; } });
  },
  onboard(d) {
    const name = ($('#obName') || {}).value || '';
    S.settings.name = name.trim();
    if (d.v === 'empty') {
      S.habits = []; S.spaces = []; S.settings.routines = [];
      S.lists.forEach(l => { l.items = []; });
      S.timetables.forEach(t => { t.cells = {}; });
    }
    S.onboarded = true; closeModal(); save();
    toast(d.v === 'empty' ? 'A blank canvas — make it yours' : 'Your Sankalpa template is ready', '🪷');
  },
  async deleteAccount() {
    if (!(await confirmBox('Delete your account and ALL your data permanently? This cannot be undone. (Tip: download a backup first.)', 'Delete forever'))) return;
    Cloud.deleteAccount();
  },
  emailAuth(d) { Cloud.emailAuth(d.v, ($('#gEmail') || {}).value || '', ($('#gPass') || {}).value || ''); },
});

function festForm(f) {
  const isNew = !f.id;
  openForm({ title: isNew ? 'Add to your calendar' : 'Edit', fields: [
    { k: 'quick', label: 'Pick a common one…', type: 'select', options: [['', '—'], ...FEST_QUICK.map(x => [x, x])], value: '' },
    { k: 'name', label: '…or type a name', value: f.name, placeholder: 'e.g. Ekadashi vrat, Maa\'s birthday' },
    { k: 'date', label: 'Date', type: 'date', value: f.date },
    { k: 'type', label: 'Type', type: 'select', options: FEST_TYPES, value: f.type || 'festival' },
    { k: 'repeat', label: 'Repeat', type: 'select', options: [['none', 'Just this date (most festivals move each year)'], ['yearly', 'Every year on this date']], value: f.repeat || 'none' },
    { k: 'note', label: 'Note', value: f.note, placeholder: 'e.g. Nirjala, puja at 7 pm' }],
    onSave: v => {
      v.name = (v.name || v.quick || '').trim(); delete v.quick;
      if (!v.name || !v.date) { toast('Add a name and a date', '🪔'); return false; }
      if (/ekadashi|vrat|fast|karva/i.test(v.name) && v.type === 'festival') v.type = 'vrat';
      if (isNew) S.fest.push({ id: uid(), ...v }); else Object.assign(f, v);
      UI.festMonth = v.date.slice(0, 7); return true;
    },
    onDelete: isNew ? null : () => { S.fest = S.fest.filter(x => x !== f); save(); } });
}
function catManagerHTML() {
  const tab = UI.catTab || 'expense', arr = tab === 'income' ? S.money.incomeCats : S.money.expenseCats;
  return `<header class="sheet-head"><h2>Money categories</h2><button class="icon-btn" data-a="closeModal" aria-label="Close">✕</button></header>
    ${chips([['expense', '💸 Expenses'], ['income', '💰 Income sources']], tab, 'catTab')}
    <div class="list">${arr.map(c => `<div class="row-item"><span class="big-e">${esc(c.emoji)}</span><div class="grow"><div class="title">${esc(c.name)}</div>${tab === 'expense' && +c.budget ? `<div class="meta">Budget ${fmtMoney(+c.budget)} / month</div>` : ''}</div>
      <button class="icon-btn" data-a="catEdit" data-id="${c.id}" aria-label="Edit">✎</button></div>`).join('')}</div>
    <footer class="sheet-foot"><button class="btn" data-a="catEdit">+ Add</button><button class="btn primary" data-a="closeModal">Done</button></footer>`;
}
function scheduleTask(id, hh) {
  const t = findBy(S.tasks, id); if (!t) return;
  t.plan = { date: UI.planDate, start: hh, dur: (t.plan && t.plan.dur) || 60 };
  toast(`Planned for ${hh}`, '🗓️'); save();
}
function maybeOnboard() { if (!LOCKED && !S.onboarded && $('#modal').hidden) openModal(onboardingHTML(), 'welcome-sheet'); }

// budget warning when an expense is added
const _txForm = txForm;
txForm = function (type, t) {
  _txForm(type, t);
  if (type !== 'expense') return;
  const f = FORM, save0 = f.onSave;
  f.onSave = v => {
    const ok = save0(v); if (ok === false) return ok;
    const c = S.money.expenseCats.find(x => x.id === v.cat), b = c && +c.budget;
    if (b) {
      const spent = S.money.tx.filter(x => x.type === 'expense' && x.cat === c.id && x.date.slice(0, 7) === v.date.slice(0, 7)).reduce((a, x) => a + (+x.amount || 0), 0);
      if (spent > b) setTimeout(() => toast(`${c.emoji} ${c.name} is over budget by ${fmtMoney(spent - b)}`, '⚠️'), 300);
      else if (spent > b * 0.8) setTimeout(() => toast(`${c.emoji} ${c.name}: ${fmtMoney(b - spent)} left this month`, '💡'), 300);
    }
    return ok;
  };
};

// ---------- pointer drag & drop for the day planner (works with touch) ----------
let DRAG = null, DRAG_SUPPRESS = false;
document.addEventListener('pointerdown', e => {
  const chip = e.target.closest('[data-drag]'); if (!chip) return;
  DRAG = { id: chip.dataset.drag, x: e.clientX, y: e.clientY, el: chip, ghost: null, over: null };
});
document.addEventListener('pointermove', e => {
  if (!DRAG) return;
  if (!DRAG.ghost) {
    if (Math.hypot(e.clientX - DRAG.x, e.clientY - DRAG.y) < 8) return;
    const g = DRAG.el.cloneNode(true); g.classList.add('drag-ghost'); document.body.appendChild(g); DRAG.ghost = g; DRAG.el.classList.add('dragging');
  }
  e.preventDefault();
  DRAG.ghost.style.left = e.clientX + 'px'; DRAG.ghost.style.top = e.clientY + 'px';
  const under = document.elementFromPoint(e.clientX, e.clientY), slot = under && under.closest('[data-slot]');
  if (DRAG.over && DRAG.over !== slot) DRAG.over.classList.remove('drop-over');
  if (slot) slot.classList.add('drop-over'); DRAG.over = slot;
  if (e.clientY < 90) window.scrollBy(0, -12); else if (e.clientY > innerHeight - 110) window.scrollBy(0, 12);
}, { passive: false });
document.addEventListener('pointerup', e => {
  if (!DRAG) return;
  const d = DRAG; DRAG = null;
  if (!d.ghost) return;
  d.ghost.remove(); d.el.classList.remove('dragging'); if (d.over) d.over.classList.remove('drop-over');
  DRAG_SUPPRESS = true; setTimeout(() => { DRAG_SUPPRESS = false; }, 350);
  const under = document.elementFromPoint(e.clientX, e.clientY), slot = under && under.closest('[data-slot]');
  if (slot) { UI.pickTask = null; scheduleTask(d.id, slot.dataset.slot); }
});
document.addEventListener('pointercancel', () => { if (DRAG && DRAG.ghost) { DRAG.ghost.remove(); DRAG.el.classList.remove('dragging'); } DRAG = null; });

// ---------- inputs that save as you type ----------
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.ch === 'notifyType') { S.settings.notify[el.value] = el.checked; save({ silent: true }); }
  if (el.dataset.ch === 'intention') {
    const k = dkey(), had = !!S.intentions[k]; S.intentions[k] = el.value.trim();
    if (!had && S.intentions[k]) earn(ER('intention'), 5, 'Set today\'s Sankalpa', true);
    save({ silent: true }); toast('Sankalpa saved', '🪷');
  }
  if (el.dataset.ch === 'review') {
    const wk = UI.reviewWeek || weekKey(), r = S.reviews[wk] = S.reviews[wk] || {};
    r[el.dataset.k] = el.value;
    if (!r.earned && REVIEW_Q.filter(([k]) => (r[k] || '').trim()).length >= 2) { r.earned = true; earn(ER('review'), 40, 'Weekly review'); }
    save({ silent: true });
  }
});

// welcome screen on first open
setTimeout(maybeOnboard, 500);
