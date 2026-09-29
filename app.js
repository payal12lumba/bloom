/* =========================================================
   Bloom — personal life planner
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
      ],
    },
    xp: 0, badges: {},
    stats: { tasksDone: 0, postsDone: 0, habitTicks: 0, listItems: 0 },
    lists: [
      { id: 'l_groc', name: 'Groceries', emoji: '🛒', items: [] },
      { id: 'l_meal', name: 'Meal prep', emoji: '🍳', items: [] },
      { id: 'l_err', name: 'Errands', emoji: '📦', items: [] },
    ],
    timetables: [{ id: 'tt1', name: 'Regular week', days: [...DAYS], slots: slotsDefault(), cells: {} }],
    activeTT: 'tt1',
    content: [], ideas: [], bucket: [], savings: [], people: [],
    settings: {
      name: '', currency: '₹', waterGoal: 8, sleepGoal: 8, weightGoal: '',
      remindBefore: [1440, 60],
      quiet: { on: true, from: '23:00', to: '07:00' },
      water: { on: true, from: '09:00', to: '21:00', every: 2 },
      routines: [
        { id: 'r_plan', label: '☀️ Plan your day', time: '07:30', days: [0, 1, 2, 3, 4, 5, 6] },
        { id: 'r_gym', label: '🏃 Workout time', time: '18:00', days: [0, 1, 2, 3, 4, 5] },
        { id: 'r_review', label: '🌙 Night review — tick off your day', time: '22:00', days: [0, 1, 2, 3, 4, 5, 6] },
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
  return s;
}

// ---------- state & persistence ----------
const LS_KEY = 'bloom_state_v1';
let S;
try { S = migrate(JSON.parse(localStorage.getItem(LS_KEY))); } catch { S = defaultState(); }

let saveTimer = null;
function save(opts = {}) {
  S.updatedAt = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { console.warn(e); }
  if (!opts.silent) render();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (window.Cloud) Cloud.push(); }, 1200);
}
function saveLocalOnly() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch { } }

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
  const add = (id, date, title, body, shift = true) => {
    if (!date || isNaN(date)) return;
    let d = new Date(date);
    if (inQuiet(d)) { if (!shift) return; d = shiftOutOfQuiet(d); }
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
    if (t.remindAt) add(`tr:${t.id}:${t.remindAt}`, parseDate(t.remindAt), `🔔 ${t.title}`, t.notes ? t.notes.slice(0, 80) : 'Reminder');
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
  // people to reach out to
  for (const p of S.people) {
    if (!p.every) continue;
    const base = p.last ? parseDate(p.last) : new Date();
    const due = atTime(addDays(base, +p.every), '10:30');
    add(`p:${p.id}:${p.last}`, due, `🤝 Reach out to ${p.name}`, p.note || 'Time to catch up');
  }
  // period
  const pi = periodInfo();
  if (pi && pi.daysUntil >= 2) add(`pe:${dkey(pi.next)}`, atTime(addDays(pi.next, -2), '09:00'), '🌸 Period expected in 2 days', 'Keep pads, water and some rest time ready');
  // daily routines + water
  const st = S.settings;
  for (let i = 0; i < 30; i++) {
    const day = addDays(new Date(), i), k = dkey(day), di = dayIdx(day);
    for (const r of st.routines) if (r.days.includes(di)) add(`r:${r.id}:${k}:${r.time}`, atTime(day, r.time), r.label, '', false);
    if (st.water.on && +st.water.every > 0) {
      for (let m = toMin(st.water.from); m <= toMin(st.water.to); m += st.water.every * 60) {
        const hh = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
        add(`w:${k}:${hh}`, atTime(day, hh), '💧 Water break', `Goal: ${st.waterGoal} glasses today`, false);
      }
    }
  }
  ev.sort((a, b) => a.at - b.at);
  return ev.slice(0, 450);
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
      case 'color': inp = `<div class="swatches" id="${id}">${SWATCHES.map(c => `<label><input type="radio" name="${id}" value="${c}" ${c === v ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>`; break;
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
function flowerSVG(items) {
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
    <circle r="31" fill="var(--card)" stroke="var(--line)" stroke-width="1.5"/>
    <text y="4" text-anchor="middle" class="flower-pct">${pct}%</text>
    <text y="20" text-anchor="middle" class="flower-sub">${done}/${items.length}</text></svg>`;
}
/* Part 3: screens */

const UI = { taskArea: 'all', taskShow: 'open', goalH: 'month', listId: null, plat: 'All', ideaSt: 'All', bucketCat: 'All', healthTab: 'overview', calOffset: 0 };

const NAV = [['today', 'Today', '🌸'], ['tasks', 'Tasks', '✅'], ['health', 'Health', '💪'], ['rewards', 'Rewards', '⏳'], ['more', 'More', '☰']];
const MORE = [
  ['goals', 'Goals', '🎯', 'Year, month, week and day goals'],
  ['timetable', 'Study timetable', '📅', 'Spreadsheet grid, Excel import/export'],
  ['lists', 'To-do lists', '🛒', 'Groceries, meals, errands'],
  ['content', 'Content studio', '🎬', 'YouTube & Instagram pipeline'],
  ['ideas', 'Startup ideas', '💡', 'Capture and grow ideas'],
  ['bucket', 'Bucket list', '🌈', 'Dreams for the future'],
  ['money', 'Money', '💰', 'Savings goals'],
  ['people', 'Connections', '🤝', 'People to keep in touch with'],
  ['insights', 'Insights', '📊', 'Charts, streaks, stats'],
  ['settings', 'Settings', '⚙️', 'Habits, reminders, sync'],
];
const TITLES = Object.fromEntries([...NAV, ...MORE].map(n => [n[0], n[1]]));

const chips = (opts, cur, action) => `<div class="chips" role="tablist">${opts.map(([v, l]) =>
  `<button class="chip ${String(v) === String(cur) ? 'on' : ''}" data-a="${action}" data-v="${esc(v)}" role="tab" aria-selected="${String(v) === String(cur)}">${l}</button>`).join('')}</div>`;
const empty = (emoji, text, btn = '') => `<div class="empty"><div class="empty-e">${emoji}</div><p>${text}</p>${btn}</div>`;
const areaDot = id => `<span class="dot" style="background:${areaOf(id).color}"></span>`;
const pageHead = (title, sub = '', actions = '') => `<header class="page-head"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="head-actions">${actions}</div></header>`;

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

  // timetable now
  const tt = S.timetables.find(t => t.id === S.activeTT) || S.timetables[0];
  let ttCard = '';
  if (tt) {
    const col = tt.days.findIndex(d => d.slice(0, 3).toLowerCase() === DAYS[dayIdx(new Date())].toLowerCase());
    const r = currentSlot(tt), nowM = new Date().getHours() * 60 + new Date().getMinutes();
    let upcoming = [];
    if (col >= 0) tt.slots.forEach((s, ri) => { const c = tt.cells[`${ri},${col}`]; if (c && c.text && slotStart(s) >= nowM - 60) upcoming.push({ s, t: c.text, now: ri === r }); });
    upcoming = upcoming.slice(0, 4);
    ttCard = `<section class="card">
      <div class="card-head"><h2>Study plan today</h2><a href="#timetable" class="link small">Timetable</a></div>
      ${upcoming.length ? `<ul class="slots">${upcoming.map(u => `<li class="${u.now ? 'now' : ''}"><span class="slot-time">${esc(u.s)}</span><span class="slot-subj" style="background:${softColor(u.t)}">${esc(u.t)}</span>${u.now ? '<span class="now-tag">now</span>' : ''}</li>`).join('')}</ul>`
        : `<p class="muted">Nothing else planned for today in “${esc(tt.name)}”.</p>`}</section>`;
  }

  // deadlines
  const soon = upcomingDeadlines(7);
  const dl = `<section class="card">
    <div class="card-head"><h2>Deadlines this week</h2><button class="link small" data-a="newTask">+ Task</button></div>
    ${soon.length ? `<div class="list">${soon.slice(0, 8).map(x => x.kind === 'task' ? taskRow(x.obj) : deadlineRow(x)).join('')}</div>` : `<p class="muted">No deadlines in the next 7 days.</p>`}</section>`;

  const duePeople = S.people.filter(p => personDue(p) <= 0);
  const ppl = duePeople.length ? `<section class="card"><div class="card-head"><h2>Reach out</h2><a href="#people" class="link small">All</a></div>
    <div class="list">${duePeople.map(personRow).join('')}</div></section>` : '';

  return `${hero}${running}<div class="grid-2"><div class="col">${dl}${habits}${ttCard}</div><div class="col">${trackers}${ppl}</div></div>`;
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
  S.content.forEach(c => { if (c.stage !== 'Posted' && c.deadline && parseDate(c.deadline) < lim) out.push({ kind: 'content', obj: c, at: parseDate(c.deadline), title: (c.platform === 'YouTube' ? '▶️ ' : '📸 ') + c.title, area: 'work', href: '#content' }); });
  S.savings.forEach(s => { if (+s.saved < +s.target && s.deadline && parseDate(s.deadline) < lim) out.push({ kind: 'saving', obj: s, at: parseDate(s.deadline), title: '💰 ' + s.name, area: 'money', href: '#money' }); });
  return out.sort((a, b) => a.at - b.at);
}
function deadlineRow(x) {
  return `<a class="row-item" href="${x.href}"><span class="check ghost">${areaDot(x.area)}</span>
    <div class="grow"><div class="title">${esc(x.title)}</div><div class="meta">${x.kind === 'content' ? esc(x.obj.stage) : x.kind === 'goal' ? 'Goal' : 'Savings goal'}</div></div>
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
    <div class="right">${t.done ? '' : dueBadge(t.deadline)}<span class="reward">+${t.minutes}m</span></div></div>`;
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
  const H = [['year', 'This year'], ['month', 'This month'], ['week', 'This week'], ['day', 'Today']];
  const gs = S.goals.filter(g => g.horizon === UI.goalH);
  const byArea = S.areas.map(a => [a, gs.filter(g => g.areaId === a.id)]).filter(x => x[1].length);
  return pageHead('Goals', 'Big goals break into tasks. Link tasks to a goal to fill its progress bar.', `<button class="btn primary" data-a="newGoal">+ New goal</button>`) +
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
    <div class="right">${g.done ? '' : dueBadge(g.deadline)}<button class="mini-btn" data-a="newTask" data-goal="${g.id}" title="Add a task to this goal">+ task</button></div></div>`;
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
  const earnGuide = [['✅', 'Finish a task', '10–30 min by priority (or your own amount)'], ['🎯', 'Complete a goal', '15 min'], ['🎬', 'Publish a post or video', '20 min'],
    ['🌿', 'Tick a daily habit', '5 min'], ['💧', 'Hit your water goal', '10 min'], ['🏃', 'Log a workout', '10 min'], ['😴', 'Log your sleep', '5 min'], ['🤝', 'Reach out to someone', '5 min'], ['🛒', 'Tick a to-do item', '2 min'], ['🌈', 'Achieve a bucket-list dream', '30 min']];
  return pageHead('Rewards') + `
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
  return pageHead('More') + `<div class="tiles">${MORE.map(m => `<a class="tile" href="#${m[0]}"><span class="tile-e">${m[2]}</span><b>${m[1]}</b><small>${m[3]}</small></a>`).join('')}</div>`;
}

// ============ TIMETABLE ============
function vTimetable() {
  const tt = S.timetables.find(t => t.id === S.activeTT) || S.timetables[0];
  if (!tt) return pageHead('Study timetable') + empty('📅', 'No timetable yet.', '<button class="btn primary" data-a="newTT">+ New timetable</button>');
  const today = DAYS[dayIdx(new Date())].toLowerCase(), cur = currentSlot(tt);
  const head = `<tr><th class="corner">Time</th>${tt.days.map((d, c) => `<th class="${d.slice(0, 3).toLowerCase() === today ? 'is-today' : ''}" data-a="editDay" data-c="${c}">${esc(d)}</th>`).join('')}</tr>`;
  const rows = tt.slots.map((s, r) => `<tr><th data-a="editSlot" data-r="${r}" class="${r === cur ? 'is-now' : ''}">${esc(s)}</th>${tt.days.map((d, c) => {
    const cell = tt.cells[`${r},${c}`], txt = cell && cell.text;
    const isNow = r === cur && d.slice(0, 3).toLowerCase() === today;
    return `<td data-a="editCell" data-r="${r}" data-c="${c}" class="${isNow ? 'is-now' : ''}" ${txt ? `style="background:${softColor(txt)}"` : ''}>${esc(txt || '')}</td>`;
  }).join('')}</tr>`).join('');
  return pageHead('Study timetable', 'Tap any cell to fill it. The same subject always gets the same colour.') + `
    <div class="toolbar">
      <select data-ch="ttSelect" aria-label="Choose timetable">${S.timetables.map(t => `<option value="${t.id}" ${t.id === tt.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
      <button class="btn small" data-a="newTT">+ New</button>
      <button class="btn small" data-a="renameTT">Rename</button>
      <button class="btn small" data-a="addRow">+ Time slot</button>
      <button class="btn small" data-a="importTT">Import Excel</button>
      <button class="btn small primary" data-a="exportTT">Export Excel</button>
      ${S.timetables.length > 1 ? `<button class="btn small ghost danger" data-a="delTT">Delete</button>` : ''}
    </div>
    <div class="tt-wrap"><table class="tt">${head}${rows}</table></div>
    <p class="small muted">Tip: export, edit in Excel or Google Sheets, then import it back. First row = days, first column = times.</p>`;
}

// ============ LISTS ============
function vLists() {
  if (!S.lists.find(l => l.id === UI.listId)) UI.listId = S.lists[0]?.id;
  const L = S.lists.find(l => l.id === UI.listId);
  const tabs = `<div class="chips">${S.lists.map(l => `<button class="chip ${l.id === UI.listId ? 'on' : ''}" data-a="listPick" data-v="${l.id}">${l.emoji} ${esc(l.name)} <span class="count">${l.items.filter(i => !i.done).length}</span></button>`).join('')}<button class="chip add" data-a="newList">+ New list</button></div>`;
  if (!L) return pageHead('To-do lists') + tabs + empty('🛒', 'Make a list for groceries, meals or errands.');
  const open = L.items.filter(i => !i.done), done = L.items.filter(i => i.done);
  const item = i => `<div class="row-item ${i.done ? 'is-done' : ''}"><button class="check ${i.done ? 'on' : ''}" style="--c:var(--peach)" data-a="toggleItem" data-id="${i.id}" aria-label="Toggle">${i.done ? '✓' : ''}</button><div class="grow title">${esc(i.text)}</div><button class="x" data-a="delItem" data-id="${i.id}" aria-label="Delete">✕</button></div>`;
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
  const yt = monthPosted.filter(c => c.platform === 'YouTube').length, ig = monthPosted.length - yt;
  return pageHead('Content studio', `This month: ▶️ ${yt} video${yt === 1 ? '' : 's'} · 📸 ${ig} Instagram post${ig === 1 ? '' : 's'}`, `<button class="btn primary" data-a="newContent">+ New piece</button>`) +
    chips([['All', 'All'], ['YouTube', '▶️ YouTube'], ['Instagram', '📸 Instagram']], UI.plat, 'plat') +
    `<div class="kanban">${STAGES.map((s, si) => {
      const cards = list.filter(c => c.stage === s).sort((a, b) => (parseDate(a.deadline) || 9e15) - (parseDate(b.deadline) || 9e15));
      return `<div class="kcol"><div class="kcol-head"><b>${s}</b><span class="count">${cards.length}</span></div>
      ${cards.map(c => `<div class="kcard"><div data-a="editContent" data-id="${c.id}" role="button" tabindex="0"><div class="title">${c.platform === 'YouTube' ? '▶️' : '📸'} ${esc(c.title)}</div>
        ${c.notes ? `<div class="meta">${esc(c.notes.slice(0, 70))}</div>` : ''}</div>
        <div class="kfoot">${s !== 'Posted' ? dueBadge(c.deadline) : `<span class="meta">${c.postedAt ? fmtDate(dkey(new Date(c.postedAt))) : ''}</span>`}
        <span class="grow"></span>${si > 0 ? `<button class="mini-btn" data-a="moveContent" data-id="${c.id}" data-v="-1" aria-label="Move back">‹</button>` : ''}${si < STAGES.length - 1 ? `<button class="mini-btn" data-a="moveContent" data-id="${c.id}" data-v="1" aria-label="Move forward">›</button>` : ''}</div></div>`).join('')}
      ${si === 0 ? `<button class="kadd" data-a="newContent">+ Add idea</button>` : ''}</div>`;
    }).join('')}</div>`;
}

// ============ IDEAS ============
const IDEA_ST = ['New', 'Exploring', 'Testing', 'Done', 'Dropped'];
function vIdeas() {
  const list = S.ideas.filter(i => UI.ideaSt === 'All' || i.status === UI.ideaSt).sort((a, b) => b.created - a.created);
  return pageHead('Startup ideas', 'Write it down the moment it comes to you.') + `
    <form class="add-row card" data-submit="addIdea"><input id="ideaIn" placeholder="New growth idea…" autocomplete="off"><button class="btn primary">Save idea</button></form>
    ${chips([['All', 'All'], ...IDEA_ST.map(s => [s, `${s} <span class="count">${S.ideas.filter(i => i.status === s).length}</span>`])], UI.ideaSt, 'ideaSt')}
    <div class="masonry">${list.map(i => `<article class="idea st-${i.status.toLowerCase()}">
      <div data-a="editIdea" data-id="${i.id}" role="button" tabindex="0"><h3>${esc(i.title)}</h3>${i.note ? `<p>${esc(i.note)}</p>` : ''}</div>
      <div class="idea-foot"><select data-ch="ideaStatus" data-id="${i.id}" aria-label="Status">${IDEA_ST.map(s => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <span class="meta">${fmtDate(dkey(new Date(i.created)))}</span><button class="mini-btn" data-a="ideaToTask" data-id="${i.id}">→ task</button></div></article>`).join('')
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
  const st = S.settings, cloud = window.Cloud ? Cloud.status() : { state: 'off' };
  const evCount = buildEvents().filter(e => e.at > Date.now()).length;
  const cloudTxt = {
    off: 'Not set up. Your data is saved on this device only.',
    loading: 'Connecting…',
    signedOut: 'Ready. Sign in to sync across your devices.',
    on: `Syncing as ${esc(cloud.email || '')}`,
    error: 'Could not connect: ' + esc(cloud.error || ''),
  }[cloud.state];
  const notif = ('Notification' in window) ? Notification.permission : 'unsupported';
  return pageHead('Settings') + `<div class="grid-2"><div class="col">
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
    <div class="row wrap">${cloud.state === 'off' || cloud.state === 'error' ? `<button class="btn small primary" data-a="setupCloud">Connect Firebase</button>` : ''}
      ${cloud.state === 'signedOut' ? `<button class="btn small primary" data-a="signIn">Sign in with Google</button>` : ''}
      ${cloud.state === 'on' ? `<button class="btn small" data-a="signOut">Sign out</button>` : ''}
      ${cloud.state !== 'off' ? `<button class="btn small ghost" data-a="setupCloud">Change settings</button>` : ''}</div></section>
  <section class="card"><div class="card-head"><h2>🔔 Notifications</h2></div>
    <p class="small">${notif === 'granted' ? (cloud.push ? 'On. Reminders arrive even when the app is closed.' : cloud.state === 'on' ? 'Allowed on this device. Tap “Turn on” to register it for push reminders.' : 'Allowed. Connect and sign in to get reminders when the app is closed.') : notif === 'denied' ? 'Blocked in your browser settings for this site.' : notif === 'unsupported' ? 'This browser does not support notifications. On iPhone, add the app to your home screen first.' : 'Off.'}</p>
    <p class="small muted">${evCount} reminders scheduled for the next 30 days.</p>
    <div class="row wrap"><button class="btn small primary" data-a="enableNotif">Turn on for this device</button><button class="btn small" data-a="testNotif">Send a test</button></div></section>
  <section class="card"><div class="card-head"><h2>Reminder rules</h2><button class="btn small" data-a="editReminderRules">Edit</button></div>
    <dl class="kv"><dt>Before deadlines</dt><dd>${st.remindBefore.map(beforeLabel).join(', ') || 'none'}</dd>
    <dt>Quiet hours</dt><dd>${st.quiet.on ? `${st.quiet.from} – ${st.quiet.to}` : 'off'}</dd>
    <dt>Water</dt><dd>${st.water.on ? `every ${st.water.every} h, ${st.water.from} – ${st.water.to}` : 'off'}</dd></dl></section>
  <section class="card"><div class="card-head"><h2>Daily routine reminders</h2><button class="link small" data-a="newRoutine">+ Add</button></div>
    <div class="list compact">${st.routines.map(r => `<div class="row-item" data-a="editRoutine" data-id="${r.id}" role="button" tabindex="0"><b class="slot-time">${r.time}</b><div class="grow">${esc(r.label)}<div class="meta">${r.days.length === 7 ? 'Every day' : r.days.map(d => DAYS[d]).join(', ')}</div></div><span class="muted">✎</span></div>`).join('') || '<p class="muted">No routine reminders.</p>'}</div></section>
  </div></div>`;
}

const VIEWS = { today: vToday, tasks: vTasks, goals: vGoals, health: vHealth, rewards: vRewards, more: vMore, timetable: vTimetable, lists: vLists, content: vContent, ideas: vIdeas, bucket: vBucket, money: vMoney, people: vPeople, insights: vInsights, settings: vSettings };
/* Part 3b: Firebase cloud sync, Google sign-in, push notifications.
   Nothing here runs until you paste your Firebase settings in Settings → Sync. */

const Cloud = (() => {
  const CFG_KEY = 'bloom_cloud';
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const CLIENT = uid();
  let cfg = null; try { cfg = JSON.parse(localStorage.getItem(CFG_KEY)); } catch { }
  const st = { state: cfg ? 'loading' : 'off', email: '', error: '', push: localStorage.getItem('bloom_push') === '1' };
  let fb = null, user = null, unsub = null, lastEvents = '';

  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
  const refresh = () => { if (currentView() === 'settings' && $('#modal').hidden) render(); };

  async function init() {
    if (!cfg) return;
    try {
      const [app, auth, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
      const a = app.initializeApp(cfg.config);
      fb = { app: a, A: auth, auth: auth.getAuth(a), F: fs, db: fs.getFirestore(a) };
      auth.getRedirectResult(fb.auth).catch(e => console.warn(e));
      auth.onAuthStateChanged(fb.auth, u => {
        user = u;
        if (u) { st.state = 'on'; st.email = u.email || ''; connect(); }
        else { st.state = 'signedOut'; if (unsub) { unsub(); unsub = null; } }
        refresh();
      });
    } catch (e) { st.state = 'error'; st.error = e.message; refresh(); }
  }

  async function connect() {
    const { doc, getDoc, onSnapshot } = fb.F;
    const ref = doc(fb.db, 'users', user.uid, 'state', 'main');
    try {
      const snap = await getDoc(ref);
      if (snap.exists() && (snap.data().updatedAt || 0) > (S.updatedAt || 0)) {
        S = migrate(JSON.parse(snap.data().json)); saveLocalOnly(); render(); toast('Synced from your other devices', '☁️');
      } else await push();
      await pushEvents(true);
      unsub = onSnapshot(ref, s => {
        if (!s.exists()) return; const d = s.data();
        if (d.client !== CLIENT && d.updatedAt > S.updatedAt) { S = migrate(JSON.parse(d.json)); saveLocalOnly(); if ($('#modal').hidden) render(); }
      });
      if (st.push && Notification.permission === 'granted') registerPush(false);
    } catch (e) { st.state = 'error'; st.error = e.code || e.message; refresh(); }
  }

  async function push() {
    if (!user || !fb) return;
    const { doc, setDoc } = fb.F;
    try {
      await setDoc(doc(fb.db, 'users', user.uid, 'state', 'main'), { json: JSON.stringify(S), updatedAt: S.updatedAt, client: CLIENT });
      await pushEvents(false);
    } catch (e) { console.warn('sync', e); toast('Sync failed (' + (e.code || e.message) + ')', '⚠️'); }
  }

  // The reminder list the GitHub Action reads every 15 minutes
  async function pushEvents(force) {
    if (!user || !fb) return;
    const events = buildEvents(), sig = JSON.stringify(events);
    if (!force && sig === lastEvents) return;
    lastEvents = sig;
    const { doc, setDoc } = fb.F;
    await setDoc(doc(fb.db, 'push', user.uid), { events, tz: tz(), updatedAt: Date.now() }, { merge: true });
  }

  async function signIn() {
    if (!fb) { toast('Connect Firebase first', '☁️'); return; }
    const p = new fb.A.GoogleAuthProvider();
    try { await fb.A.signInWithPopup(fb.auth, p); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) fb.A.signInWithRedirect(fb.auth, p);
      else if (e.code !== 'auth/popup-closed-by-user') toast('Sign-in failed: ' + (e.code || e.message), '⚠️');
    }
  }
  async function signOut() { if (fb) { await fb.A.signOut(fb.auth); st.push = false; localStorage.removeItem('bloom_push'); render(); } }

  async function enableNotifications() {
    if (!('Notification' in window)) { toast('Notifications are not available here. On iPhone, add Bloom to your home screen first.', '⚠️'); return; }
    const p = await Notification.requestPermission();
    if (p !== 'granted') { toast('Notifications were not allowed', '⚠️'); render(); return; }
    if (!user) { toast('Allowed. Sign in to get reminders even when the app is closed.', '🔔'); render(); return; }
    await registerPush(true);
  }
  async function registerPush(loud) {
    try {
      if (!cfg.vapid) throw new Error('Add your Web Push key (VAPID) in Sync settings first');
      const m = await import(SDK + 'firebase-messaging.js');
      if (!(await m.isSupported())) throw new Error('Push is not supported in this browser');
      const reg = await navigator.serviceWorker.ready;
      const token = await m.getToken(m.getMessaging(fb.app), { vapidKey: cfg.vapid, serviceWorkerRegistration: reg });
      const { doc, setDoc, arrayUnion } = fb.F;
      await setDoc(doc(fb.db, 'push', user.uid), { tokens: arrayUnion(token), events: buildEvents(), tz: tz(), updatedAt: Date.now() }, { merge: true });
      st.push = true; localStorage.setItem('bloom_push', '1');
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
    openForm({
      title: 'Connect Firebase',
      fields: [
        { k: 'config', label: 'Firebase config', type: 'textarea', value: cfg ? JSON.stringify(cfg.config, null, 1) : '', placeholder: '{ apiKey: "…", authDomain: "…", projectId: "…", … }', hint: 'Firebase console → Project settings → Your apps → Web app → SDK setup (Config).' },
        { k: 'vapid', label: 'Web Push key (VAPID)', value: cfg?.vapid || '', hint: 'Project settings → Cloud Messaging → Web Push certificates → Key pair.' },
      ],
      saveLabel: 'Save and reload',
      onSave: v => {
        try { const c = parseConfig(v.config); localStorage.setItem(CFG_KEY, JSON.stringify({ config: c, vapid: v.vapid.trim() })); setTimeout(() => location.reload(), 300); return true; }
        catch (e) { toast(e.message, '⚠️'); return false; }
      },
      onDelete: cfg ? () => { localStorage.removeItem(CFG_KEY); localStorage.removeItem('bloom_push'); location.reload(); } : null,
    });
  }

  // keep the 30-day reminder window rolling even on days with no edits
  setInterval(() => pushEvents(false).catch(() => { }), 30 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pushEvents(false).catch(() => { }); });

  return { init, push, status: () => st, signIn, signOut, enableNotifications, setupForm };
})();
/* Part 4: actions, rendering loop, timers */

const findBy = (arr, id) => arr.find(x => x.id === id);
const areaOptions = () => S.areas.map(a => [a.id, `${a.emoji} ${a.name}`]);
const PRIO_MIN = [0, 10, 20, 30];

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
      { k: 'priority', label: 'Priority', type: 'select', options: [[1, 'Low · earns 10 min'], [2, 'Medium · earns 20 min'], [3, 'High · earns 30 min']], value: t.priority || 2 },
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
      { k: 'horizon', label: 'Time frame', type: 'select', options: [['year', 'This year'], ['month', 'This month'], ['week', 'This week'], ['day', 'Today']], value: g.horizon || UI.goalH },
      { k: 'areaId', label: 'Area', type: 'select', options: areaOptions(), value: g.areaId || 'mind' },
      { k: 'deadline', label: 'Deadline', type: 'date', value: g.deadline },
      { k: 'notes', label: 'Why it matters / notes', type: 'textarea', value: g.notes },
    ],
    onSave: v => { if (!v.title) return false; if (isNew) S.goals.push({ id: uid(), done: false, ...v }); else Object.assign(g, v); return true; },
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
  listPick: d => { UI.listId = d.v; render(); }, calNav: d => { UI.calOffset += +d.v; render(); },

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
    if (g.done) { earn(15, 50, 'Goal: ' + g.title); celebrate('Goal complete 🎯', g.title); } else unearn(15, 50, 'Undid goal: ' + g.title);
    save();
  },

  // today trackers
  habit(d) {
    const L = todayLog(), h = findBy(S.habits, d.id);
    L.habits[d.id] = !L.habits[d.id];
    if (L.habits[d.id]) { S.stats.habitTicks++; earn(5, 10, 'Habit: ' + h.name); } else unearn(5, 10, 'Undid habit: ' + h.name);
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
        if (first) earn(5, 10, 'Logged sleep'); return true;
      },
      onDelete: L.sleep ? () => { L.sleep = null; unearn(5, 10, 'Removed sleep log'); save(); } : null,
    });
  },
  logWorkout() {
    openForm({
      title: 'Log a workout',
      fields: [{ k: 'type', label: 'What did you do?', type: 'select', options: ['Walk', 'Run', 'Gym / strength', 'Yoga', 'Cycling', 'Dance', 'Swimming', 'Sports', 'Stretching', 'Other'].map(x => [x, x]), value: 'Walk' },
        { k: 'min', label: 'Minutes', type: 'number', value: 30 }],
      onSave: v => { if (!v.min) return false; todayLog().exercise.push({ type: v.type, min: v.min }); earn(10, 20, 'Workout: ' + v.type); return true; },
    });
  },
  delWorkout(d) { todayLog().exercise.splice(+d.i, 1); unearn(10, 20, 'Removed workout'); save(); },
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
  newTT() { ask('New timetable', 'Name', 'Exam prep').then(n => { if (!n) return; const t = { id: uid(), name: n, days: [...DAYS], slots: slotsDefault(), cells: {} }; S.timetables.push(t); S.activeTT = t.id; save(); }); },
  renameTT() { const t = curTT(); ask('Rename timetable', 'Name', t.name).then(n => { if (n) { t.name = n; save(); } }); },
  async delTT() { const t = curTT(); if (await confirmBox(`Delete timetable “${t.name}”?`)) { S.timetables = S.timetables.filter(x => x !== t); S.activeTT = S.timetables[0]?.id; save(); } },
  editCell(d) {
    const t = curTT(), key = `${d.r},${d.c}`, cur = t.cells[key]?.text || '';
    openForm({
      title: `${t.days[d.c]} · ${t.slots[d.r]}`,
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
    if (i.done) { S.stats.listItems++; earn(2, 4, 'To-do: ' + i.text, true); toast('+2 min', '🛒'); } else unearn(2, 4, 'Undid: ' + i.text);
    save();
  },
  delItem(d) { const l = findBy(S.lists, UI.listId); l.items = l.items.filter(i => i.id !== d.id); save(); },
  clearDone() { const l = findBy(S.lists, UI.listId); l.items = l.items.filter(i => !i.done); save(); },

  // content
  newContent: () => contentForm(), editContent: d => contentForm(findBy(S.content, d.id)),
  moveContent(d) {
    const c = findBy(S.content, d.id), i = STAGES.indexOf(c.stage) + +d.v; if (i < 0 || i >= STAGES.length) return;
    const was = c.stage; c.stage = STAGES[i];
    if (c.stage === 'Posted') { c.postedAt = Date.now(); S.stats.postsDone++; earn(20, 40, `Published: ${c.title}`); }
    else if (was === 'Posted') { S.stats.postsDone = Math.max(0, S.stats.postsDone - 1); c.postedAt = null; unearn(20, 40, 'Unpublished: ' + c.title); }
    save();
  },

  // ideas
  editIdea(d) {
    const i = findBy(S.ideas, d.id);
    openForm({ title: 'Idea', fields: [{ k: 'title', label: 'Idea', value: i.title }, { k: 'note', label: 'Details, who it helps, how to test it', type: 'textarea', value: i.note }, { k: 'status', label: 'Status', type: 'select', options: IDEA_ST.map(s => [s, s]), value: i.status }],
      onSave: v => { Object.assign(i, v); return true; }, onDelete: async () => { if (await confirmBox('Delete this idea?')) { S.ideas = S.ideas.filter(x => x !== i); save(); } } });
  },
  ideaToTask(d) { const i = findBy(S.ideas, d.id); if (i.status === 'New') i.status = 'Exploring'; taskForm({}, { areaId: 'work' }); setTimeout(() => { const f = $('#f_title'); if (f) f.value = 'Test idea: ' + i.title; }, 30); },

  // bucket
  newBucket: () => bucketForm(), editBucket: d => bucketForm(findBy(S.bucket, d.id)),
  toggleBucket(d) {
    const b = findBy(S.bucket, d.id); b.done = !b.done; b.doneAt = b.done ? Date.now() : null;
    if (b.done) { earn(30, 100, 'Dream achieved: ' + b.title, true); celebrate('Dream achieved 🌈', b.title); } else unearn(30, 100, 'Undid: ' + b.title);
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

  // cloud & notifications (implemented in part 5)
  setupCloud: () => Cloud.setupForm(), signIn: () => Cloud.signIn(), signOut: () => Cloud.signOut(),
  enableNotif: () => Cloud.enableNotifications(), testNotif: () => localNotify('🌸 Bloom test', 'Notifications are working on this device.', true),
};

function waterReward(before, after) {
  const g = S.settings.waterGoal;
  if (before < g && after >= g) { earn(10, 20, 'Water goal reached'); }
  else if (before >= g && after < g) unearn(10, 20, 'Water below goal');
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
    { k: 'platform', label: 'Platform', type: 'select', options: [['YouTube', '▶️ YouTube'], ['Instagram', '📸 Instagram']], value: c.platform || (UI.plat !== 'All' ? UI.plat : 'Instagram') },
    { k: 'stage', label: 'Stage', type: 'select', options: STAGES.map(s => [s, s]), value: c.stage || 'Idea' },
    { k: 'deadline', label: 'Post by', type: 'date', value: c.deadline },
    { k: 'notes', label: 'Hook, script notes, hashtags', type: 'textarea', value: c.notes }],
    onSave: v => {
      if (!v.title) return false;
      if (isNew) { S.content.push({ id: uid(), created: Date.now(), ...v, postedAt: v.stage === 'Posted' ? Date.now() : null }); if (v.stage === 'Posted') { S.stats.postsDone++; earn(20, 40, 'Published: ' + v.title); } }
      else { const was = c.stage; Object.assign(c, v); if (v.stage === 'Posted' && was !== 'Posted') { c.postedAt = Date.now(); S.stats.postsDone++; earn(20, 40, 'Published: ' + v.title); } }
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
    const aoa = [['Time', ...t.days], ...t.slots.map((s, r) => [s, ...t.days.map((_, c) => t.cells[`${r},${c}`]?.text || '')])];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 14 }, ...t.days.map(() => ({ wch: 20 }))];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, t.name.slice(0, 30) || 'Timetable');
    XLSX.writeFile(wb, `${t.name.replace(/[^\w\- ]/g, '') || 'timetable'}.xlsx`);
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
    const days = clean[0].slice(1).map(String).map(s => s.trim()).filter(Boolean);
    const t = { id: uid(), name: file.name.replace(/\.[^.]+$/, ''), days, slots: [], cells: {} };
    clean.slice(1).forEach((r, ri) => { t.slots.push(String(r[0]).trim() || `Slot ${ri + 1}`); days.forEach((_, c) => { const v = String(r[c + 1] ?? '').trim(); if (v) t.cells[`${ri},${c}`] = { text: v }; }); });
    S.timetables.push(t); S.activeTT = t.id; save(); toast(`Imported “${t.name}”`, '📅');
  } catch (e) { toast(e.message || 'Could not read that file', '⚠️'); }
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
  if (window.Cloud && Cloud.status().push) return; // the push sender handles it
  const now = Date.now();
  for (const e of buildEvents()) {
    if (e.at <= now && e.at > now - 10 * 60000 && !shownLocal.has(e.id)) { shownLocal.add(e.id); localNotify(e.title, e.body); }
  }
  localStorage.setItem('bloom_shown', JSON.stringify([...shownLocal].slice(-300)));
}

// ---------- render ----------
function currentView() { const v = location.hash.slice(1); return VIEWS[v] ? v : 'today'; }
function render() {
  const v = currentView(), main = $('#main');
  const y = window.scrollY, sameView = main.dataset.view === v;
  main.innerHTML = VIEWS[v]();
  main.dataset.view = v;
  if (!sameView) window.scrollTo(0, 0); else window.scrollTo(0, y);
  document.title = `${TITLES[v]} · Bloom`;
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === v || (a.dataset.nav === 'more' && MORE.some(m => m[0] === v))));
  tick();
}
function buildNav() {
  $('#bottomnav').innerHTML = NAV.map(n => `<a href="#${n[0]}" data-nav="${n[0]}"><span>${n[2]}</span><small>${n[1]}</small></a>`).join('');
  $('#sidenav').innerHTML = `<div class="brand"><span class="brand-mark">🌸</span><b>Bloom</b></div>` +
    [...NAV.filter(n => n[0] !== 'more'), ...MORE].map(n => `<a href="#${n[0]}" data-nav="${n[0]}"><span>${n[2]}</span>${n[1]}</a>`).join('');
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
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.ch === 'ttSelect') { S.activeTT = el.value; save(); }
  if (el.dataset.ch === 'ideaStatus') { findBy(S.ideas, el.dataset.id).status = el.value; save(); }
  if (el.id === 'xlsxIn' && el.files[0]) { importTimetable(el.files[0]); el.value = ''; }
  if (el.id === 'jsonIn' && el.files[0]) {
    el.files[0].text().then(t => { try { S = migrate(JSON.parse(t)); save(); toast('Backup restored', '✅'); } catch { toast('That file is not a Bloom backup', '⚠️'); } });
    el.value = '';
  }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-submit]'); if (!f) return; e.preventDefault();
  if (f.dataset.submit === 'addItem') { const v = $('#itemIn').value.trim(); if (!v) return; findBy(S.lists, UI.listId).items.push({ id: uid(), text: v, done: false }); save(); setTimeout(() => $('#itemIn')?.focus(), 0); }
  if (f.dataset.submit === 'addIdea') { const v = $('#ideaIn').value.trim(); if (!v) return; S.ideas.push({ id: uid(), title: v, note: '', status: 'New', created: Date.now() }); earn(1, 5, 'Idea: ' + v, true); toast('Idea saved', '💡'); save(); }
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
