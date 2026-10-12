/* Sankalpa — daily diary & planner
   Part 1: helpers, state, migration from the old app, moon calendar, reminders */
'use strict';

// ---------- small helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseK = k => { const [y, m, d] = String(k).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addK = (k, n) => dkey(addDays(parseK(k), n));
const toMin = hhmm => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const toHHMM = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
const atTime = (k, hhmm) => { const d = parseK(k); const m = toMin(hhmm); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const diffDays = (a, b) => Math.round((parseK(b) - parseK(a)) / 864e5);
function fmtTime(hhmm) {
  if (!hhmm) return '';
  if (S.settings.clock24) return hhmm;
  let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return m ? `${h}:${pad(m)}${ap}` : `${h}${ap}`;
}
function fmtDur(min) { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`; }
function fmtDate(k, opts = {}) {
  const d = parseK(k);
  return `${opts.day ? DAYS[d.getDay()] + ', ' : ''}${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}${opts.year ? ' ' + d.getFullYear() : ''}`;
}
function money(n) { n = Math.round(+n || 0); return (n < 0 ? '−' : '') + S.settings.currency + Math.abs(n).toLocaleString('en-IN'); }
function weekStartK(k) { const d = parseK(k), ws = S.settings.weekStart; return dkey(addDays(d, -((d.getDay() - ws + 7) % 7))); }

// ---------- state ----------
const BLOCK_COLORS = [
  ['peach', '#F6CDB6', '#8A4A2C'], ['sage', '#CFE1C8', '#3E6243'], ['haldi', '#F4DE9F', '#7A5A10'], ['lilac', '#DED3F0', '#5A4585'],
  ['sky', '#CBE1EF', '#2D5E7A'], ['rose', '#F3C7D2', '#8E3552'], ['clay', '#E4D3C5', '#6A4C38'], ['mint', '#C6E8DE', '#2C6A58'],
];
const colorOf = name => BLOCK_COLORS.find(c => c[0] === name) || BLOCK_COLORS[0];
const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Back pain', 'Acne', 'Tender breasts', 'Cravings', 'Tired', 'Low mood', 'Anxious', 'Nausea', 'Good energy'];
const EXP_CATS = ['Food', 'Groceries', 'Travel', 'Rent & bills', 'Shopping', 'Health', 'Study', 'Gifts & puja', 'Fun', 'Other'];
const INC_CATS = ['Stipend', 'Salary', 'Freelance', 'Gift', 'Other'];
const MOON_KINDS = [
  ['ekadashi', 'Ekadashi', [11, 26], 'sunrise'], ['purnima', 'Purnima', [15], 'evening'], ['amavasya', 'Amavasya', [30], 'sunrise'],
  ['pradosh', 'Pradosh', [13, 28], 'evening'], ['sankashti', 'Sankashti Chaturthi', [19], 'night'], ['vinayaka', 'Vinayaka Chaturthi', [4], 'midday'],
  ['ashtami', 'Durga Ashtami (monthly)', [8], 'sunrise'], ['shivratri', 'Masik Shivratri', [29], 'night'],
];

function defaultState() {
  return {
    dv: 1, updatedAt: 0,
    settings: {
      name: '', currency: '₹', clock24: false, weekStart: 1,
      dayStart: 5, dayEnd: 24, step: 15, zoom: 90, defLen: 30, defRemind: null,
      sunrise: '06:15', cycleLen: 28, periodLen: 5, waterGoal: 8, symptoms: [...SYMPTOMS],
      diaryTime: '21:30', weekPlan: { on: true, day: 0, time: '19:00' }, monthPlan: { on: true, time: '10:00' },
      notify: { blocks: true, chores: true, obs: true, plans: true, period: true, diary: true, planning: true },
    },
    blocks: [], templates: [],
    chores: [
      { id: 'c_water', name: 'Water the plants', time: '08:00', days: [0, 1, 2, 3, 4, 5, 6], remind: false },
      { id: 'c_bed', name: 'Make the bed', time: '', days: [0, 1, 2, 3, 4, 5, 6], remind: false },
      { id: 'c_wash', name: 'Laundry', time: '10:00', days: [0], remind: true },
    ],
    choreLog: {}, diary: {}, checkin: {}, periods: [],
    plans: [], notes: {},
    obs: [
      { id: 'o_eka', name: 'Ekadashi', kind: 'moon', moon: 'ekadashi', on: true, eve: '19:00', morn: '06:00', color: 'haldi' },
      { id: 'o_pur', name: 'Purnima', kind: 'moon', moon: 'purnima', on: true, eve: '', morn: '07:00', color: 'sky' },
      { id: 'o_ama', name: 'Amavasya', kind: 'moon', moon: 'amavasya', on: false, eve: '', morn: '07:00', color: 'lilac' },
      { id: 'o_pra', name: 'Pradosh', kind: 'moon', moon: 'pradosh', on: false, eve: '', morn: '07:00', color: 'rose' },
      { id: 'o_san', name: 'Sankashti Chaturthi', kind: 'moon', moon: 'sankashti', on: false, eve: '', morn: '07:00', color: 'peach' },
    ],
    obsSkip: {}, obsAdd: {}, obsKept: {},
    money: { tx: [], exp: [...EXP_CATS], inc: [...INC_CATS], budget: {} },
  };
}

function fill(s) {
  const d = defaultState();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...d.settings, ...s.settings };
  s.settings.notify = { ...d.settings.notify, ...(s.settings.notify || {}) };
  s.settings.weekPlan = { ...d.settings.weekPlan, ...(s.settings.weekPlan || {}) };
  s.settings.monthPlan = { ...d.settings.monthPlan, ...(s.settings.monthPlan || {}) };
  s.money = { ...d.money, ...s.money };
  return s;
}

// Old Sankalpa data → the new diary. Keeps periods, festivals & vrat, money, routines, moods, sleep, weight and planned blocks.
function fromOld(o) {
  const s = defaultState();
  const T = f => { try { f(); } catch (e) { console.warn('migrate', e); } };
  T(() => { s.settings.name = o.settings?.name || ''; s.settings.currency = o.settings?.currency || '₹'; s.settings.waterGoal = o.settings?.waterGoal || 8; });
  T(() => { if (o.settings?.planStep) s.settings.step = clamp(+o.settings.planStep, 5, 60); });
  T(() => {
    const len = o.period?.periodLen || 5; s.settings.periodLen = len;
    s.periods = [...new Set(o.period?.starts || [])].sort().map(k => ({ start: k, end: addK(k, len - 1) }));
  });
  T(() => {
    for (const f of (o.fest || [])) {
      if (!f.date || !f.name) continue;
      const moon = MOON_KINDS.find(m => new RegExp(m[1].split(' ')[0], 'i').test(f.name));
      const auto = moon && s.obs.find(x => x.moon === moon[0]);
      if (auto) { auto.on = true; (s.obsAdd[auto.id] = s.obsAdd[auto.id] || {})[f.date] = 1; continue; }
      const ob = { id: uid(), name: f.name, kind: f.repeat === 'yearly' ? 'yearly' : 'dates', date: f.date, dates: f.repeat === 'yearly' ? [] : [f.date], on: true, eve: '19:00', morn: '06:30', color: f.type === 'vrat' ? 'haldi' : f.type === 'birthday' ? 'rose' : 'peach', note: f.note || '' };
      const same = s.obs.find(x => x.kind === 'dates' && x.name.toLowerCase() === ob.name.toLowerCase());
      if (same) same.dates.push(f.date); else s.obs.push(ob);
      for (const [k, v] of Object.entries(f.kept || {})) if (v) (s.obsKept[k] = s.obsKept[k] || {})[same ? same.id : ob.id] = 1;
    }
  });
  T(() => {
    const ex = o.money?.expenseCats?.map(c => c.name).filter(Boolean), inc = o.money?.incomeCats?.map(c => c.name).filter(Boolean);
    if (ex?.length) s.money.exp = ex; if (inc?.length) s.money.inc = inc;
    const nameOf = (list, id) => (list || []).find(c => c.id === id)?.name || id || 'Other';
    s.money.tx = (o.money?.tx || []).filter(t => t.type === 'expense' || t.type === 'income').map(t => ({
      id: t.id || uid(), type: t.type, amount: +t.amount || 0, date: t.date || dkey(),
      cat: nameOf(t.type === 'expense' ? o.money.expenseCats : o.money.incomeCats, t.cat || t.category), note: t.note || t.title || '', method: t.method || '',
    }));
  });
  T(() => {
    const r = o.settings?.routines || [];
    if (r.length) s.chores = r.map(x => ({ id: x.id || uid(), name: String(x.label || '').trim(), time: x.time || '', days: x.days || [0, 1, 2, 3, 4, 5, 6], remind: true })).filter(x => x.name);
  });
  T(() => {
    for (const [k, L] of Object.entries(o.logs || {})) {
      const c = {};
      if (L.mood) c.mood = clamp(+L.mood, 1, 5);
      if (L.sleep?.hours) c.sleep = L.sleep.hours;
      if (L.water) c.water = L.water;
      if (Object.keys(c).length) s.checkin[k] = c;
    }
    for (const w of (o.weights || [])) if (w.d && w.kg) (s.checkin[w.d] = s.checkin[w.d] || {}).weight = +w.kg;
  });
  T(() => {
    for (const [k, v] of Object.entries(o.intentions || {})) if (v) s.diary[k] = { text: `Sankalpa: ${v}` };
  });
  T(() => {
    for (const t of (o.tasks || [])) if (t.plan?.date && t.plan.start) s.blocks.push({ id: uid(), title: t.title, date: t.plan.date, start: t.plan.start, dur: +t.plan.dur || 60, color: 'peach', note: t.notes || '', rep: 'once', days: [], done: t.done ? { [t.plan.date]: 1 } : {}, skip: {}, over: {} });
  });
  s.updatedAt = o.updatedAt || 0;
  return s;
}
function upgrade(raw) {
  if (!raw || typeof raw !== 'object') return defaultState();
  if (raw.dv) return fill(raw);
  return fill(fromOld(raw));
}
const isOldShape = raw => raw && typeof raw === 'object' && !raw.dv;

// ---------- persistence ----------
function readCloudConfig() {
  const c = window.BLOOM_CONFIG;
  if (c && c.firebase && c.firebase.apiKey && !/PASTE/i.test(c.firebase.apiKey)) return { config: c.firebase, vapid: c.vapid && !/PASTE/i.test(c.vapid) ? c.vapid : '' };
  return null;
}
const CLOUD_CFG = readCloudConfig();
const LOCAL_KEY = 'bloom_state_v1';
let STORE_KEY = LOCAL_KEY;
let LOCKED = !!CLOUD_CFG;
function keepOldCopy(raw, key) { try { if (isOldShape(raw) && !localStorage.getItem('sankalpa_old_' + key)) localStorage.setItem('sankalpa_old_' + key, JSON.stringify(raw)); } catch { } }
function loadStore(key) {
  try { const raw = JSON.parse(localStorage.getItem(key)); if (!raw) return null; keepOldCopy(raw, key); return upgrade(raw); } catch { return null; }
}
let S = LOCKED ? defaultState() : (loadStore(LOCAL_KEY) || defaultState());

let saveTimer = null;
function save(opts = {}) {
  if (LOCKED) return;
  S.updatedAt = Date.now();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { console.warn(e); }
  if (!opts.quiet) render();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => Cloud.push(), 1000);
}
function saveLocalOnly() { if (!LOCKED) try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { } }

// ---------- moon calendar (tithi) ----------
// Sun and Moon longitudes after Meeus; elongation/12° gives the tithi. Accurate to well under an hour,
// but different panchangs use different rules, so every date can be moved by hand.
const Lunar = (() => {
  const RAD = Math.PI / 180, norm = x => ((x % 360) + 360) % 360;
  const TERMS = [[6.288774, 0, 0, 1, 0], [1.274027, 2, 0, -1, 0], [0.658314, 2, 0, 0, 0], [0.213618, 0, 0, 2, 0], [-0.185116, 0, 1, 0, 0], [-0.114332, 0, 0, 0, 2],
    [0.058793, 2, 0, -2, 0], [0.057066, 2, -1, -1, 0], [0.053322, 2, 0, 1, 0], [0.045758, 2, -1, 0, 0], [-0.040923, 0, 1, -1, 0], [-0.034720, 1, 0, 0, 0],
    [-0.030383, 0, 1, 1, 0], [0.015327, 2, 0, 0, -2], [-0.012528, 0, 0, 1, 2], [0.010980, 0, 0, 1, -2], [0.010675, 4, 0, -1, 0], [0.010034, 0, 0, 3, 0],
    [0.008548, 4, 0, -2, 0], [-0.007888, 2, 1, -1, 0], [-0.006766, 2, 1, 0, 0], [-0.005163, 1, 0, -1, 0], [0.004987, 1, 1, 0, 0], [0.004036, 2, -1, 1, 0],
    [0.003994, 2, 0, 2, 0], [0.003861, 4, 0, 0, 0], [0.003665, 2, 0, -3, 0], [-0.002689, 0, 1, -2, 0], [-0.002602, 2, 0, -1, 2], [0.002390, 2, -1, -2, 0]];
  function elong(ms) {
    const T = (ms / 864e5 + 2440587.5 - 2451545) / 36525;
    const Ms = (357.52911 + 35999.05029 * T) * RAD;
    const sun = norm(280.46646 + 36000.76983 * T + (1.914602 - 0.004817 * T) * Math.sin(Ms) + 0.019993 * Math.sin(2 * Ms) + 0.000289 * Math.sin(3 * Ms));
    const D = (297.8501921 + 445267.1114034 * T) * RAD, M = (357.5291092 + 35999.0502909 * T) * RAD,
      Mp = (134.9633964 + 477198.8675055 * T) * RAD, F = (93.2720950 + 483202.0175233 * T) * RAD, E = 1 - 0.002516 * T;
    let s = 0; for (const [c, d, m, mp, f] of TERMS) s += c * (m ? Math.pow(E, Math.abs(m)) : 1) * Math.sin(d * D + m * M + mp * Mp + f * F);
    return norm(norm(218.3164477 + 481267.88123421 * T + s) - sun);
  }
  const tithi = ms => Math.floor(elong(ms) / 12) + 1;
  const CHECK = { sunrise: () => S.settings.sunrise || '06:15', midday: () => '12:00', evening: () => '18:30', night: () => '21:00' };
  const cache = new Map();
  function tithiOn(k, when) { const key = k + when; if (!cache.has(key)) cache.set(key, tithi(atTime(k, CHECK[when]()).getTime())); return cache.get(key); }
  // days in [from, to] when a tithi falls (prevailing at the check time; a skipped tithi goes on the day it began)
  function days(kind, from, to) {
    const def = MOON_KINDS.find(m => m[0] === kind); if (!def) return [];
    const [, , targets, when] = def, out = [];
    for (let k = addK(from, -1); k <= to; k = addK(k, 1)) {
      const a = tithiOn(k, when), b = tithiOn(addK(k, 1), when), nk = addK(k, 1);
      for (const t of targets) {
        if (b === t && a !== t && nk >= from && nk <= to) out.push(nk);
        else if (a !== t && b !== t && ((b - a + 30) % 30) === 2 && ((t - a + 30) % 30) === 1 && k >= from && k <= to) out.push(k);
      }
    }
    return [...new Set(out)].sort();
  }
  const paksha = k => tithiOn(k, 'sunrise') <= 15 ? 'Shukla' : 'Krishna';
  return { tithi, tithiOn, days, paksha, elong };
})();
const TITHI_NAMES = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi'];
function tithiName(k) { const t = Lunar.tithiOn(k, 'sunrise'); if (t === 15) return 'Purnima'; if (t === 30) return 'Amavasya'; return `${t <= 15 ? 'Shukla' : 'Krishna'} ${TITHI_NAMES[(t - 1) % 15]}`; }

// ---------- observances (vrat, festivals, weekly fasts) ----------
const obsCache = new Map();
function obsDates(o, from, to) {
  const key = `${o.id}|${o.kind}|${o.moon}|${(o.days || []).join()}|${o.date}|${(o.dates || []).join()}|${from}|${to}|${JSON.stringify(S.obsSkip[o.id] || {})}|${JSON.stringify(S.obsAdd[o.id] || {})}|${S.settings.sunrise}`;
  if (obsCache.has(key)) return obsCache.get(key);
  let out = [];
  if (o.kind === 'moon') out = Lunar.days(o.moon, from, to);
  else if (o.kind === 'weekly') for (let k = from; k <= to; k = addK(k, 1)) { if ((o.days || []).includes(parseK(k).getDay())) out.push(k); }
  else if (o.kind === 'yearly' && o.date) for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) { const k = `${y}${o.date.slice(4)}`; if (k >= from && k <= to && k >= o.date.slice(0, 4) + '-01-01') out.push(k); }
  else if (o.kind === 'dates') out = (o.dates || []).filter(k => k >= from && k <= to);
  // dates you added by hand replace a computed date within a day of them
  const added = Object.keys(S.obsAdd[o.id] || {});
  for (const a of added) { out = out.filter(k => Math.abs(diffDays(k, a)) > 1); if (a >= from && a <= to) out.push(a); }
  const skip = S.obsSkip[o.id] || {};
  out = [...new Set(out)].filter(k => !skip[k]).sort();
  if (obsCache.size > 400) obsCache.clear();
  obsCache.set(key, out);
  return out;
}
function obsOn(k) { return S.obs.filter(o => o.on && obsDates(o, k, k).length); }

// ---------- timeline blocks ----------
function blockRuns(b, k) {
  if (b.rep === 'once') return b.date === k;
  if (b.since && k < b.since) return false;
  if (b.until && k > b.until) return false;
  if (b.skip && b.skip[k]) return false;
  if (b.rep === 'daily') return true;
  return (b.days || []).includes(parseK(k).getDay());
}
// what a block looks like on a given day (repeating blocks can be changed for one day)
function inst(b, k) { const o = (b.over && b.over[k]) || {}; return { b, k, id: b.id, title: o.title ?? b.title, start: o.start ?? b.start, dur: o.dur ?? b.dur, color: o.color ?? b.color, note: o.note ?? b.note, done: !!(b.done && b.done[k]) }; }
function dayBlocks(k) { return S.blocks.filter(b => blockRuns(b, k)).map(b => inst(b, k)).sort((a, c) => toMin(a.start) - toMin(c.start) || c.dur - a.dur); }
const choresOn = k => S.chores.filter(c => (c.days || []).includes(parseK(k).getDay()));

// ---------- cycle ----------
function cycleInfo(ref = dkey()) {
  const ps = [...S.periods].sort((a, b) => a.start.localeCompare(b.start)).filter(p => p.start <= ref);
  const all = [...S.periods].sort((a, b) => a.start.localeCompare(b.start));
  const gaps = []; for (let i = 1; i < all.length; i++) { const g = diffDays(all[i - 1].start, all[i].start); if (g >= 18 && g <= 50) gaps.push(g); }
  const recent = gaps.slice(-6);
  const cycle = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : S.settings.cycleLen;
  const lens = all.filter(p => p.end).map(p => diffDays(p.start, p.end) + 1).filter(n => n > 0 && n < 15).slice(-6);
  const plen = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : S.settings.periodLen;
  if (!ps.length) return { cycle, plen, none: true };
  const last = ps[ps.length - 1];
  const day = diffDays(last.start, ref) + 1;
  let next = addK(last.start, cycle);
  while (next < addK(ref, -plen + 1) && diffDays(last.start, next) < 120) next = addK(next, cycle);
  const ovu = addK(next, -14);
  return { cycle, plen, last, day, next, daysUntil: diffDays(ref, next), fertileFrom: addK(ovu, -5), fertileTo: addK(ovu, 1), ovu, gaps, open: !last.end || last.end >= ref };
}
function periodState(k) {
  for (const p of S.periods) if (k >= p.start && k <= (p.end || addK(p.start, S.settings.periodLen - 1))) return 'on';
  const ci = cycleInfo(dkey());
  if (ci.none) return '';
  for (let i = 0; i < 6; i++) {
    const st = addK(ci.next, ci.cycle * i);
    if (k >= st && k < addK(st, ci.plen) && k > dkey()) return 'predicted';
  }
  if (k >= ci.fertileFrom && k <= ci.fertileTo && k > dkey()) return 'fertile';
  return '';
}

// ---------- reminders (read by the GitHub Action every 15 minutes) ----------
function buildEvents() {
  const now = Date.now(), horizon = now + 30 * 864e5, ev = [], N = S.settings.notify;
  const add = (type, id, date, title, body) => {
    if (N[type] === false || !date || isNaN(date)) return;
    const at = +date; if (at < now - 2 * 3600e3 || at > horizon) return;
    ev.push({ id, at, title, body: body || '' });
  };
  const today = dkey(), end = addK(today, 30);
  for (let i = 0; i <= 30; i++) {
    const k = addK(today, i), di = parseK(k).getDay();
    for (const x of dayBlocks(k)) {
      const r = x.b.remind; if (r == null || x.done) continue;
      add('blocks', `b:${x.id}:${k}:${x.start}:${r}`, new Date(atTime(k, x.start) - r * 60000), `${r ? 'Soon' : 'Now'}: ${x.title || 'Timeline block'}`, `${fmtTime(x.start)} – ${fmtTime(toHHMM(toMin(x.start) + x.dur))}${r ? ` · in ${r} min` : ''}`);
    }
    for (const c of S.chores) if (c.remind && c.time && (c.days || []).includes(di) && !(S.choreLog[k] || {})[c.id]) add('chores', `c:${c.id}:${k}:${c.time}`, atTime(k, c.time), `🧺 ${c.name}`, 'Daily chore');
    for (const p of S.plans) if (p.date === k && p.time && p.remind && !p.done) add('plans', `p:${p.id}:${k}:${p.time}`, atTime(k, p.time), `🗓️ ${p.title}`, p.note || 'From your planner');
    if (S.settings.diaryTime) add('diary', `d:${k}`, atTime(k, S.settings.diaryTime), '📖 Write today\'s page', 'A few lines, how your body felt, and what you\'re grateful for');
    const wp = S.settings.weekPlan; if (wp.on && di === +wp.day) add('planning', `wp:${k}`, atTime(k, wp.time), '🗓️ Plan your week', 'Set next week\'s focus and look at your calendar');
    const mp = S.settings.monthPlan; if (mp.on && k.slice(8) === '01') add('planning', `mp:${k}`, atTime(k, mp.time), `🗓️ ${MONTHS[parseK(k).getMonth()]} begins`, 'Write this month\'s plan');
  }
  for (const o of S.obs) {
    if (!o.on) continue;
    for (const k of obsDates(o, today, end)) {
      if (o.eve) add('obs', `o:${o.id}:${k}:e`, atTime(addK(k, -1), o.eve), `🪔 Tomorrow: ${o.name}`, o.note || 'Get ready for tomorrow');
      if (o.morn) add('obs', `o:${o.id}:${k}:m`, atTime(k, o.morn), `🪔 Today: ${o.name}`, o.note || '');
    }
  }
  const ci = cycleInfo();
  if (!ci.none && ci.daysUntil >= 2) add('period', `pe:${ci.next}`, atTime(addK(ci.next, -2), '09:00'), '🌸 Period expected in 2 days', 'Keep pads, a hot water bag and some rest time ready');
  ev.sort((a, b) => a.at - b.at);
  return ev.slice(0, 600);
}
/* Part 2: icons, toasts, sheets, forms */

const IC = {
  today: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8.5"/>',
  diary: '<path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5v17M9.5 8h5.5M9.5 11.5h5.5"/>',
  planner: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="8.5" cy="14" r=".6" fill="currentColor"/><circle cx="12" cy="14" r=".6" fill="currentColor"/><circle cx="15.5" cy="14" r=".6" fill="currentColor"/>',
  body: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  money: '<rect x="3" y="6.5" width="18" height="12.5" rx="2.5"/><path d="M3 10.5h18M15.5 14.5h2"/><path d="M6 6.5 15.5 3.5l1.2 3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  left: '<path d="m14.5 6-6 6 6 6"/>', right: '<path d="m9.5 6 6 6-6 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  dots: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  now: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>', lamp: '<path d="M12 3c1.6 2.2 2.4 3.8 2.4 5.2a2.4 2.4 0 0 1-4.8 0C9.6 6.8 10.4 5.2 12 3z"/><path d="M4 14h16l-2.2 4.5a2 2 0 0 1-1.8 1.1H8a2 2 0 0 1-1.8-1.1z"/>',
  zoomin: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4M11 8v6M8 11h6"/>', zoomout: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4M8 11h6"/>',
  repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

function toast(msg, action) {
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="toast-btn">${esc(action.label)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { action.run(); t.remove(); };
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), action ? 4200 : 2400);
  setTimeout(() => t.remove(), action ? 4700 : 2900);
}

// ---------- sheet (bottom sheet on phones, dialog on wide screens) ----------
let SHEET = null, closeT = null;
function openSheet(html, opts = {}) {
  clearTimeout(closeT);
  const m = $('#modal');
  m.innerHTML = `<div class="scrim" data-a="scrimClose"></div><div class="sheet ${opts.cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false; SHEET = opts; openSheet.at = Date.now();
  requestAnimationFrame(() => m.classList.add('open'));
  if (opts.focus !== false && window.innerWidth > 700) { const f = m.querySelector('[autofocus], input:not([type=checkbox]):not([type=radio]), textarea'); if (f) f.focus(); }
  else if (opts.focus === 'force') { const f = m.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 250); }
}
function closeSheet() {
  const m = $('#modal'); if (m.hidden) return;
  m.classList.remove('open'); const was = SHEET; SHEET = null;
  closeT = setTimeout(() => { m.hidden = true; m.innerHTML = ''; }, 200);
  if (was && was.onClose) was.onClose();
}
const sheetHead = (title, extra = '') => `<header class="sh-head"><h2>${title}</h2>${extra}<button class="icon-btn" data-a="closeSheet" aria-label="Close">${icon('close')}</button></header>`;

function confirmBox(text, yes = 'Delete') {
  return new Promise(res => {
    openSheet(`${sheetHead('Are you sure?')}<p class="lead">${esc(text)}</p>
      <footer class="sh-foot"><button class="btn" data-a="closeSheet">Cancel</button><button class="btn danger" id="cfYes">${esc(yes)}</button></footer>`, { cls: 'small', onClose: () => res(false), focus: false });
    $('#cfYes').onclick = () => { SHEET.onClose = null; closeSheet(); res(true); };
  });
}
function chooseBox(title, options) {
  return new Promise(res => {
    openSheet(`${sheetHead(esc(title))}<div class="choices">${options.map((o, i) => `<button class="choice ${o.danger ? 'danger-t' : ''}" data-i="${i}"><b>${esc(o.label)}</b>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</button>`).join('')}</div>`, { cls: 'small', onClose: () => res(null), focus: false });
    $$('#modal .choice').forEach(b => b.onclick = () => { SHEET.onClose = null; closeSheet(); res(options[+b.dataset.i].value); });
  });
}

/* Generic form. fields: [{k, label, type, value, options, placeholder, hint, show(v)}]
   types: text, textarea, number, date, time, select, days, color, toggle, chips, seg */
function openForm({ title, fields, onSave, onDelete, saveLabel = 'Save', deleteLabel = 'Delete', extraFoot = '' }) {
  const f = fields.map(fd => fieldHTML(fd)).join('');
  openSheet(`${sheetHead(esc(title))}<form class="form" id="fm" onsubmit="return false">${f}</form>
    <footer class="sh-foot">${onDelete ? `<button class="btn ghost danger-t" id="fmDel">${esc(deleteLabel)}</button>` : ''}${extraFoot}<span class="grow"></span><button class="btn primary" id="fmSave">${esc(saveLabel)}</button></footer>`);
  const read = () => {
    const v = {};
    for (const fd of fields) {
      const el = $(`[name="${fd.k}"]`, $('#fm'));
      if (fd.type === 'days') v[fd.k] = $$(`[data-day].on`, $(`#f_${fd.k}`)).map(x => +x.dataset.day);
      else if (fd.type === 'color' || fd.type === 'seg') v[fd.k] = ($(`#f_${fd.k} .on`) || {}).dataset?.v ?? fd.value;
      else if (fd.type === 'chips') v[fd.k] = $$(`#f_${fd.k} .on`).map(x => x.dataset.v);
      else if (fd.type === 'datelist') v[fd.k] = $$(`#f_${fd.k} [data-d]`).map(x => x.dataset.d).sort();
      else if (fd.type === 'toggle') v[fd.k] = !!el?.checked;
      else v[fd.k] = el ? el.value.trim() : '';
    }
    return v;
  };
  const sync = () => { const v = read(); for (const fd of fields) if (fd.show) { const w = $(`#w_${fd.k}`); if (w) w.hidden = !fd.show(v); } };
  $('#fm').addEventListener('click', e => {
    const rm = e.target.closest('[data-rmd]'); if (rm) { rm.remove(); return; }
    const ad = e.target.closest('[data-addd]');
    if (ad) { const inp = ad.previousElementSibling; if (inp.value && !$(`[data-d="${inp.value}"]`, ad.parentElement.parentElement)) ad.parentElement.insertAdjacentHTML('beforebegin', `<button type="button" class="dchip" data-rmd data-d="${inp.value}">${fmtDate(inp.value, { year: true })} ✕</button>`); inp.value = ''; return; }
    const b = e.target.closest('[data-pick]'); if (!b) return;
    const box = b.parentElement;
    if (box.dataset.multi) b.classList.toggle('on'); else { $$('[data-pick]', box).forEach(x => x.classList.remove('on')); b.classList.add('on'); }
    sync();
  });
  $('#fm').addEventListener('change', sync); sync();
  $('#fmSave').onclick = () => { const v = read(); if (onSave(v) !== false) { closeSheet(); save(); } };
  if (onDelete) $('#fmDel').onclick = async () => { if (await onDelete()) { closeSheet(); save(); } };
  $('#fm').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'time') { e.preventDefault(); $('#fmSave').click(); } });
}
function fieldHTML(fd) {
  const id = `f_${fd.k}`, v = fd.value ?? '', lab = fd.label ? `<label for="${id}">${esc(fd.label)}</label>` : '';
  let input = '';
  switch (fd.type) {
    case 'textarea': input = `<textarea id="${id}" name="${fd.k}" rows="${fd.rows || 3}" placeholder="${esc(fd.placeholder || '')}">${esc(v)}</textarea>`; break;
    case 'select': input = `<select id="${id}" name="${fd.k}">${fd.options.map(([o, l]) => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; break;
    case 'days': input = `<div class="pick days" id="${id}" data-multi="1">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" data-pick data-day="${d}" class="${(v || []).includes(d) ? 'on' : ''}">${DAYS[d].slice(0, 2)}</button>`).join('')}</div>`; break;
    case 'color': input = `<div class="pick swatches" id="${id}">${BLOCK_COLORS.map(([n, bg]) => `<button type="button" data-pick data-v="${n}" class="${n === v ? 'on' : ''}" style="--sw:${bg}" aria-label="${n}"></button>`).join('')}</div>`; break;
    case 'seg': input = `<div class="pick seg" id="${id}">${fd.options.map(([o, l]) => `<button type="button" data-pick data-v="${esc(o)}" class="${String(o) === String(v) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`; break;
    case 'chips': input = `<div class="pick chips" id="${id}" data-multi="1">${fd.options.map(o => `<button type="button" data-pick data-v="${esc(o)}" class="${(v || []).includes(o) ? 'on' : ''}">${esc(o)}</button>`).join('')}</div>`; break;
    case 'datelist': input = `<div class="datelist" id="${id}">${(v || []).map(d => `<button type="button" class="dchip" data-rmd data-d="${d}">${fmtDate(d, { year: true })} ✕</button>`).join('')}<span class="dl-add"><input type="date" aria-label="Add a date"><button type="button" class="btn small" data-addd>Add</button></span></div>`; break;
    case 'toggle': return `<div class="field toggle-f" id="w_${fd.k}"><label class="switch"><input type="checkbox" name="${fd.k}" ${v ? 'checked' : ''}><span></span>${esc(fd.label)}</label>${fd.hint ? `<small>${fd.hint}</small>` : ''}</div>`;
    default: input = `<input id="${id}" name="${fd.k}" type="${fd.type || 'text'}" value="${esc(v)}" placeholder="${esc(fd.placeholder || '')}" ${fd.type === 'number' ? `inputmode="decimal" step="${fd.step || 'any'}"` : ''} ${fd.auto ? 'autofocus' : ''}>`;
  }
  return `<div class="field ${fd.wide ? 'wide' : ''} ${fd.half ? 'half' : ''}" id="w_${fd.k}">${lab}${input}${fd.hint ? `<small>${fd.hint}</small>` : ''}</div>`;
}
/* Part 3: Today — the editable, zoomable day timeline */

const UI = { view: 'today', date: dkey(), plan: 'month', planRef: dkey(), moneyMonth: dkey().slice(0, 7), scrolledFor: null, sel: null };

function dateHead(title = null) {
  const k = UI.date, d = parseK(k), isToday = k === dkey();
  const obs = obsOn(k), plans = S.plans.filter(p => p.date === k), ps = periodState(k);
  const bits = [tithiName(k), ...obs.map(o => `🪔 ${o.name}`), ps === 'on' ? '🌸 Period' : '', plans.length ? `${plans.length} plan${plans.length > 1 ? 's' : ''}` : ''].filter(Boolean);
  return `<header class="dayhead">
    <button class="dh-date" data-a="pickDate" aria-label="Choose date">
      <span class="dh-wd">${title ? esc(title) + ' · ' : ''}${DAYS_FULL[d.getDay()]}${isToday ? ' · today' : k === addK(dkey(), 1) ? ' · tomorrow' : k === addK(dkey(), -1) ? ' · yesterday' : ''}</span>
      <span class="dh-big">${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}</span>
    </button>
    <div class="dh-nav">
      <button class="icon-btn" data-a="dayShift" data-v="-1" aria-label="Previous day">${icon('left')}</button>
      ${isToday ? '' : '<button class="btn small" data-a="goToday">Today</button>'}
      <button class="icon-btn" data-a="dayShift" data-v="1" aria-label="Next day">${icon('right')}</button>
      <button class="icon-btn only-phone" data-a="go" data-v="settings" aria-label="Settings">${icon('gear')}</button>
    </div>
    <p class="dh-sub" data-a="openDay">${bits.map(esc).join('<i></i>')}</p>
  </header>`;
}

// ---------- geometry ----------
function tlRange(k) {
  const st = S.settings; let a = st.dayStart * 60, z = Math.min(1440, st.dayEnd * 60);
  for (const x of dayBlocks(k)) { const s = toMin(x.start); a = Math.min(a, Math.floor(s / 60) * 60); z = Math.max(z, Math.min(1440, Math.ceil((s + x.dur) / 60) * 60)); }
  return [a, Math.max(z, a + 60)];
}
const ppm = () => S.settings.zoom / 60;
const snap = m => Math.round(m / S.settings.step) * S.settings.step;

function layoutCols(items) {
  // overlapping blocks sit side by side
  const res = []; let cluster = [], end = -1;
  const flush = () => {
    const cols = [];
    for (const it of cluster) {
      let c = cols.findIndex(ce => ce <= toMin(it.start)); if (c < 0) { c = cols.length; cols.push(0); }
      cols[c] = toMin(it.start) + it.dur; it.col = c;
    }
    cluster.forEach(it => { it.ncol = cols.length; res.push(it); }); cluster = [];
  };
  for (const it of items) { const s = toMin(it.start); if (cluster.length && s >= end) { flush(); end = -1; } cluster.push(it); end = Math.max(end, s + it.dur); }
  flush();
  return res;
}

function blockHTML(x, a) {
  const p = ppm(), top = (toMin(x.start) - a) * p, h = Math.max(x.dur * p, 16);
  const [, bg, ink] = colorOf(x.color), e = toMin(x.start) + x.dur;
  const size = h < 26 ? 'xs' : h < 46 ? 'sm' : '';
  const rep = x.b.rep !== 'once', changed = rep && x.b.over && x.b.over[x.k];
  return `<div class="blk ${size} ${x.done ? 'done' : ''}" data-id="${x.id}" tabindex="0" role="button" aria-label="${esc(x.title || 'Block')} ${fmtTime(x.start)}"
    style="top:${top}px;height:${h}px;--col:${x.col};--ncol:${x.ncol};--bg:${bg};--ink:${ink}">
    <span class="h-top" aria-hidden="true"></span>
    <button class="blk-chk" data-a="toggleBlock" data-id="${x.id}" aria-label="Mark done">${icon('check')}</button>
    <div class="blk-body"><b class="blk-t">${esc(x.title || 'Untitled')}</b>
      <span class="blk-m">${fmtTime(x.start)} – ${fmtTime(toHHMM(e))} · ${fmtDur(x.dur)}${rep ? ` ${icon('repeat', changed ? 'dim' : '')}` : ''}${x.b.remind != null ? ` ${icon('bell')}` : ''}</span>
      ${x.note && h > 70 ? `<span class="blk-n">${esc(x.note)}</span>` : ''}</div>
    <span class="h-bot" aria-hidden="true"></span>
  </div>`;
}

function timelineInner(k) {
  const [a, z] = tlRange(k), p = ppm(), step = S.settings.step;
  let labels = '';
  const showMinor = step * p >= 20;
  for (let t = a; t <= z; t += step) {
    const hour = t % 60 === 0;
    if (!hour && !showMinor) continue;
    labels += `<span class="tl-lab ${hour ? 'hr' : ''}" style="top:${(t - a) * p}px">${t === 1440 ? (S.settings.clock24 ? '24:00' : '12am') : fmtTime(toHHMM(t))}</span>`;
  }
  const items = layoutCols(dayBlocks(k));
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const now = k === dkey() && nowM >= a && nowM <= z ? `<div class="tl-now" style="top:${(nowM - a) * p}px"><span>${fmtTime(toHHMM(nowM))}</span></div>` : '';
  const past = k < dkey() ? z : k === dkey() ? clamp(nowM, a, z) : a;
  return `<div class="tl-canvas" style="height:${(z - a) * p}px;--step:${step * p}px;--hour:${60 * p}px;--past:${(past - a) * p}px">
    <div class="tl-lines" aria-hidden="true"></div>${labels}
    <div class="tl-lane">${items.map(x => blockHTML(x, a)).join('')}</div>${now}
  </div>`;
}

function vToday() {
  const k = UI.date, st = S.settings, n = dayBlocks(k), done = n.filter(x => x.done).length;
  return `${dateHead()}
  <div class="tl-bar" role="toolbar" aria-label="Timeline tools">
    <button class="chip" data-a="pickStep" aria-label="Grid interval">${icon('planner')} ${st.step < 60 ? st.step + ' min' : '1 hour'}</button>
    <div class="zoom">
      <button class="icon-btn" data-a="zoom" data-v="-1" aria-label="Zoom out">${icon('zoomout')}</button>
      <input type="range" id="zoomR" min="24" max="900" step="1" value="${st.zoom}" aria-label="Zoom">
      <button class="icon-btn" data-a="zoom" data-v="1" aria-label="Zoom in">${icon('zoomin')}</button>
    </div>
    <span class="grow"></span>
    ${n.length ? `<span class="tl-count">${done}/${n.length}</span>` : ''}
    ${k === dkey() ? `<button class="icon-btn" data-a="scrollNow" aria-label="Jump to now">${icon('now')}</button>` : ''}
    <button class="icon-btn" data-a="dayMenu" aria-label="More">${icon('dots')}</button>
  </div>
  <div class="tl" id="tl">${timelineInner(k)}</div>
  <button class="fab" data-a="newBlock" aria-label="Add block">${icon('plus')}</button>`;
}

// re-draw only the timeline (used while zooming)
function redrawTimeline() { const tl = $('#tl'); if (tl) tl.innerHTML = timelineInner(UI.date); }

function scrollToNow(smooth) {
  const tl = $('#tl'); if (!tl) return;
  const [a] = tlRange(UI.date), m = new Date().getHours() * 60 + new Date().getMinutes();
  const y = tl.getBoundingClientRect().top + scrollY + (Math.max(a, m - 60) - a) * ppm() - 120;
  window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
}

// ---------- changing blocks ----------
const blockById = id => S.blocks.find(b => b.id === id);
function setBlockTime(b, k, start, dur) {
  if (b.rep === 'once') { b.start = start; b.dur = dur; save(); return; }
  b.over = b.over || {}; b.over[k] = { ...(b.over[k] || {}), start, dur };
  save();
  toast('Changed for this day only', { label: 'All days', run: () => { b.start = start; b.dur = dur; for (const o of Object.values(b.over)) { delete o.start; delete o.dur; } cleanOver(b); save(); } });
}
function cleanOver(b) { for (const [k, o] of Object.entries(b.over || {})) if (!Object.keys(o).length) delete b.over[k]; }

function openBlock(opts) {
  const k = UI.date, isNew = !opts.id, b = isNew ? null : blockById(opts.id);
  const x = isNew ? { title: '', start: opts.start, dur: opts.dur, color: opts.color || S.blocks.at(-1)?.color || 'peach', note: '' } : inst(b, k);
  const rep = isNew ? 'once' : b.rep, repeating = !isNew && b.rep !== 'once';
  const REM = [['', 'No reminder'], ['0', 'When it starts'], ['5', '5 min before'], ['10', '10 min before'], ['15', '15 min before'], ['30', '30 min before'], ['60', '1 hour before']];
  const remVal = isNew ? (S.settings.defRemind ?? '') : (b.remind ?? '');
  openForm({
    title: isNew ? 'New block' : 'Edit block',
    fields: [
      { k: 'title', label: 'What', value: x.title, placeholder: 'e.g. Read 2 papers, Gym, Lunch with Maa', auto: true },
      { k: 'start', label: 'Starts', type: 'time', value: x.start, half: true },
      { k: 'end', label: 'Ends', type: 'time', value: toHHMM(toMin(x.start) + x.dur), half: true },
      { k: 'color', label: 'Colour', type: 'color', value: x.color },
      { k: 'rep', label: 'Repeat', type: 'seg', value: rep, options: [['once', 'Just this day'], ['daily', 'Every day'], ['days', 'Some days']] },
      { k: 'days', label: 'On', type: 'days', value: isNew || !b.days?.length ? [parseK(k).getDay()] : b.days, show: v => v.rep === 'days' },
      { k: 'remind', label: 'Remind me', type: 'select', value: remVal, options: REM },
      { k: 'note', label: 'Notes', type: 'textarea', value: x.note, rows: 2, placeholder: 'Optional' },
      ...(repeating ? [{ k: 'scope', label: 'Save changes for', type: 'seg', value: 'all', options: [['day', 'This day only'], ['all', 'All days']] }] : []),
    ],
    extraFoot: isNew ? '' : '<button class="btn ghost" id="fmDup">Duplicate</button>',
    onSave: v => {
      const s = toMin(v.start), e0 = toMin(v.end); let dur = e0 - s; if (dur <= 0) dur += 1440;
      if (!v.start) { toast('Pick a start time'); return false; }
      dur = clamp(dur, 5, 1440 - s);
      const remind = v.remind === '' ? null : +v.remind;
      const fields = { title: v.title, start: v.start, dur, color: v.color, note: v.note };
      if (isNew) {
        S.blocks.push({ id: uid(), ...fields, rep: v.rep, days: v.days, date: k, since: k, remind, done: {}, skip: {}, over: {} });
        return true;
      }
      if (repeating && v.scope === 'day') { b.over = b.over || {}; b.over[k] = fields; b.remind = remind; return true; }
      Object.assign(b, fields, { remind, days: v.days });
      if (b.over) { delete b.over[k]; }
      if (v.rep !== b.rep) { if (v.rep === 'once') { b.date = k; b.over = {}; } else if (b.rep === 'once') { b.since = k; } b.rep = v.rep; }
      return true;
    },
    onDelete: isNew ? null : async () => {
      if (b.rep === 'once') { S.blocks = S.blocks.filter(y => y !== b); undoToast('Block deleted', b); return true; }
      const c = await chooseBox(`Delete “${x.title || 'block'}”`, [
        { label: 'Only this day', value: 'day' }, { label: 'This day and after', value: 'after' }, { label: 'Every day', value: 'all', danger: true }]);
      if (!c) return false;
      if (c === 'day') { b.skip = b.skip || {}; b.skip[k] = 1; }
      else if (c === 'after') { b.until = addK(k, -1); if (b.since && b.until < b.since) S.blocks = S.blocks.filter(y => y !== b); }
      else S.blocks = S.blocks.filter(y => y !== b);
      save(); return true;
    },
  });
  if (isNew) setTimeout(() => $('#f_title')?.focus(), 260);
  const dup = $('#fmDup');
  if (dup) dup.onclick = () => {
    const i = inst(b, k); const start = toHHMM(toMin(i.start) + i.dur);
    S.blocks.push({ id: uid(), title: i.title, start, dur: i.dur, color: i.color, note: i.note, rep: 'once', days: [], date: k, since: k, remind: b.remind, done: {}, skip: {}, over: {} });
    closeSheet(); save(); toast(`Copied to ${fmtTime(start)}`);
  };
}
function undoToast(msg, b) { toast(msg, { label: 'Undo', run: () => { S.blocks.push(b); save(); } }); }

async function dayMenu() {
  const k = UI.date;
  const opts = [
    { label: 'Copy yesterday here', hint: 'Adds yesterday\'s one-off blocks to this day', value: 'copy' },
    { label: 'Save this day as a template', hint: 'Reuse it for study days, office days, Sundays…', value: 'saveT' },
    ...(S.templates.length ? [{ label: 'Use a template', hint: S.templates.map(t => t.name).join(', '), value: 'useT' }] : []),
    { label: 'Clear this day', hint: 'Removes this day\'s blocks', value: 'clear', danger: true },
    { label: 'Timeline settings', hint: 'Day start and end, default length, 12/24 hour', value: 'set' },
  ];
  const c = await chooseBox(fmtDate(k, { day: true }), opts);
  const once = (src, date) => ({ id: uid(), title: src.title, start: src.start, dur: src.dur, color: src.color, note: src.note || '', rep: 'once', days: [], date, since: date, remind: src.remind ?? null, done: {}, skip: {}, over: {} });
  if (c === 'copy') {
    const y = addK(k, -1), src = dayBlocks(y).filter(x => x.b.rep === 'once');
    if (!src.length) { toast('Yesterday has no one-off blocks'); return; }
    src.forEach(x => S.blocks.push(once({ ...x, remind: x.b.remind }, k))); save(); toast(`Copied ${src.length} block${src.length > 1 ? 's' : ''}`);
  } else if (c === 'saveT') {
    const items = dayBlocks(k); if (!items.length) { toast('This day is empty'); return; }
    openForm({ title: 'Save as template', fields: [{ k: 'name', label: 'Template name', value: '', placeholder: 'e.g. Lab day, Sunday, Exam prep', auto: true }],
      onSave: v => { if (!v.name) return false; S.templates.push({ id: uid(), name: v.name, blocks: items.map(x => ({ title: x.title, start: x.start, dur: x.dur, color: x.color, note: x.note, remind: x.b.remind })) }); toast('Template saved'); } });
  } else if (c === 'useT') {
    const t = await chooseBox('Use a template', [...S.templates.map(t => ({ label: t.name, hint: `${t.blocks.length} blocks`, value: t.id })), { label: 'Delete a template…', value: '_del' }]);
    if (t === '_del') { const d = await chooseBox('Delete which template?', S.templates.map(t => ({ label: t.name, value: t.id, danger: true }))); if (d) { S.templates = S.templates.filter(x => x.id !== d); save(); } return; }
    const tp = S.templates.find(x => x.id === t); if (!tp) return;
    tp.blocks.forEach(x => S.blocks.push(once(x, k))); save(); toast(`Added “${tp.name}”`);
  } else if (c === 'clear') {
    if (!(await confirmBox('Remove every block from this day? Repeating blocks are only skipped for this day.', 'Clear day'))) return;
    const before = JSON.stringify(S.blocks);
    S.blocks = S.blocks.filter(b => !(b.rep === 'once' && b.date === k));
    S.blocks.forEach(b => { if (blockRuns(b, k)) { b.skip = b.skip || {}; b.skip[k] = 1; } });
    save(); toast('Day cleared', { label: 'Undo', run: () => { S.blocks = JSON.parse(before); save(); } });
  } else if (c === 'set') settingsTimeline();
}

function settingsTimeline() {
  const st = S.settings, hrs = Array.from({ length: 25 }, (_, h) => [h, h === 24 ? 'Midnight' : fmtTime(toHHMM(h * 60))]);
  openForm({ title: 'Timeline settings', fields: [
    { k: 'dayStart', label: 'Day starts at', type: 'select', value: st.dayStart, options: hrs.slice(0, 24), half: true },
    { k: 'dayEnd', label: 'Day ends at', type: 'select', value: st.dayEnd, options: hrs.slice(1), half: true },
    { k: 'step', label: 'Grid interval', type: 'seg', value: st.step, options: [[5, '5m'], [10, '10m'], [15, '15m'], [20, '20m'], [30, '30m'], [60, '1h']] },
    { k: 'defLen', label: 'New blocks last', type: 'seg', value: st.defLen, options: [[10, '10m'], [15, '15m'], [30, '30m'], [45, '45m'], [60, '1h'], [90, '1½h']] },
    { k: 'defRemind', label: 'Reminder for new blocks', type: 'select', value: st.defRemind ?? '', options: [['', 'None'], ['0', 'When it starts'], ['5', '5 min before'], ['10', '10 min before'], ['15', '15 min before']] },
    { k: 'clock24', label: '24-hour clock', type: 'toggle', value: st.clock24 },
  ], onSave: v => {
    if (+v.dayEnd <= +v.dayStart) { toast('The day must end after it starts'); return false; }
    Object.assign(st, { dayStart: +v.dayStart, dayEnd: +v.dayEnd, step: +v.step, defLen: +v.defLen, defRemind: v.defRemind === '' ? null : +v.defRemind, clock24: v.clock24 });
  } });
}

// ---------- touch & mouse: tap to add, hold-and-drag to draw, move, resize; pinch or Ctrl+scroll to zoom ----------
const Drag = { d: null, pts: new Map(), pinch: null, raf: 0, lastY: 0 };
function tlMinAt(clientY) { const c = $('#tl .tl-canvas'); const [a] = tlRange(UI.date); return a + (clientY - c.getBoundingClientRect().top) / ppm(); }

function bindTimeline() {
  const tl = $('#tl'); if (!tl || tl.dataset.bound) return; tl.dataset.bound = '1';
  tl.addEventListener('contextmenu', e => { if (e.target.closest('.tl-canvas')) e.preventDefault(); });
  tl.addEventListener('touchmove', e => { if ((Drag.d && Drag.d.active) || Drag.pinch || e.touches.length > 1) e.preventDefault(); }, { passive: false });
  tl.addEventListener('pointerdown', onDown);
  if (!Drag.global) { Drag.global = true; window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel); }
  tl.addEventListener('wheel', e => {
    if (!e.ctrlKey) return; e.preventDefault();
    zoomAround(S.settings.zoom * Math.exp(-e.deltaY * 0.01), e.clientY);
  }, { passive: false });
}
function zoomAround(z, clientY) {
  z = clamp(Math.round(z), 24, 900); if (z === S.settings.zoom) return;
  const m = tlMinAt(clientY); S.settings.zoom = z; redrawTimeline();
  const c = $('#tl .tl-canvas'), [a] = tlRange(UI.date), y = c.getBoundingClientRect().top + (m - a) * ppm();
  window.scrollBy(0, y - clientY);
  const r = $('#zoomR'); if (r) r.value = z;
  clearTimeout(Drag.zt); Drag.zt = setTimeout(() => save({ quiet: true }), 500);
}

function onDown(e) {
  if (e.button > 0 || e.target.closest('.blk-chk')) return;
  if (!e.target.closest('.tl-canvas')) return;
  Drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (Drag.pts.size === 2) { // pinch
    cancelDrag();
    const [p, q] = [...Drag.pts.values()];
    Drag.pinch = { d0: Math.hypot(p.x - q.x, p.y - q.y), z0: S.settings.zoom };
    return;
  }
  const el = e.target.closest('.blk');
  const mode = el ? (e.target.closest('.h-top') ? 'top' : e.target.closest('.h-bot') ? 'bot' : 'move') : 'create';
  const d = { mode, el, id: el?.dataset.id, x0: e.clientX, y0: e.clientY, touch: e.pointerType !== 'mouse', active: false, m0: tlMinAt(e.clientY), pid: e.pointerId };
  if (el) { const x = inst(blockById(d.id), UI.date); d.start = toMin(x.start); d.dur = x.dur; }
  Drag.d = d; Drag.lastY = e.clientY;
  if (d.touch) d.timer = setTimeout(() => activate(d), mode === 'create' ? 420 : 240);
}
function activate(d) {
  if (Drag.d !== d) return;
  d.active = true; navigator.vibrate?.(10);
  const tl = $('#tl'); tl.classList.add('dragging');
  if (d.mode === 'create') {
    const g = document.createElement('div'); g.className = 'blk ghost'; g.style.cssText = '--col:0;--ncol:1';
    $('.tl-lane', tl).appendChild(g); d.el = g; updateDrag(Drag.lastY);
  } else d.el.classList.add('lifted');
  autoScroll();
}
function onMove(e) {
  if (Drag.pts.has(e.pointerId)) Drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (Drag.pinch && Drag.pts.size >= 2) {
    const [p, q] = [...Drag.pts.values()], dist = Math.hypot(p.x - q.x, p.y - q.y);
    zoomAround(Drag.pinch.z0 * dist / Drag.pinch.d0, (p.y + q.y) / 2); return;
  }
  const d = Drag.d; if (!d || e.pointerId !== d.pid) return;
  Drag.lastY = e.clientY;
  const moved = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
  if (!d.active) {
    if (d.touch && moved > 9) { cancelDrag(); return; } // the finger is scrolling
    if (!d.touch && moved > 4) activate(d); else return;
  }
  updateDrag(e.clientY);
}
function updateDrag(y) {
  const d = Drag.d; if (!d || !d.active) return;
  const [a, z] = tlRange(UI.date), p = ppm(), step = S.settings.step, m = tlMinAt(y);
  let s, dur;
  if (d.mode === 'move') { s = clamp(snap(d.start + (m - d.m0)), a, z - d.dur); dur = d.dur; }
  else if (d.mode === 'top') { const e = d.start + d.dur; s = clamp(snap(m), a, e - step); dur = e - s; }
  else if (d.mode === 'bot') { s = d.start; dur = clamp(snap(m) - s, step, z - s); }
  else { const f = Math.floor(d.m0 / step) * step, g = snap(m); s = clamp(Math.min(f, g), a, z - step); dur = Math.max(step, Math.abs(g - f) || S.settings.defLen); if (g < f) dur = f - g + step; }
  d.ns = s; d.nd = dur;
  d.el.style.top = (s - a) * p + 'px'; d.el.style.height = Math.max(dur * p, 16) + 'px';
  d.el.dataset.time = `${fmtTime(toHHMM(s))} – ${fmtTime(toHHMM(s + dur))}`;
  const meta = d.el.querySelector('.blk-m'); if (meta) meta.textContent = `${d.el.dataset.time} · ${fmtDur(dur)}`;
}
function autoScroll() {
  cancelAnimationFrame(Drag.raf);
  const tick = () => {
    const d = Drag.d; if (!d || !d.active) return;
    const y = Drag.lastY, H = window.innerHeight, edge = 70;
    const v = y < edge + 60 ? -Math.ceil((edge + 60 - y) / 6) : y > H - edge - 70 ? Math.ceil((y - (H - edge - 70)) / 6) : 0;
    if (v) { window.scrollBy(0, v); updateDrag(y); }
    Drag.raf = requestAnimationFrame(tick);
  };
  Drag.raf = requestAnimationFrame(tick);
}
function cancelDrag() {
  const d = Drag.d; if (!d) return;
  clearTimeout(d.timer); cancelAnimationFrame(Drag.raf);
  if (d.active) { if (d.mode === 'create') d.el.remove(); else d.el.classList.remove('lifted'); $('#tl')?.classList.remove('dragging'); }
  Drag.d = null;
}
function onCancel(e) { Drag.pts.delete(e.pointerId); if (Drag.pts.size < 2 && Drag.pinch) { Drag.pinch = null; } cancelDrag(); }
function onUp(e) {
  Drag.pts.delete(e.pointerId);
  if (Drag.pinch) { if (Drag.pts.size < 2) { Drag.pinch = null; save({ quiet: true }); } return; }
  const d = Drag.d; if (!d || e.pointerId !== d.pid) return;
  const wasActive = d.active, ns = d.ns, nd = d.nd;
  cancelDrag();
  const k = UI.date;
  if (!wasActive) {
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 9) return;
    if (d.mode === 'create') { const s = Math.floor(d.m0 / S.settings.step) * S.settings.step; openBlock({ start: toHHMM(s), dur: S.settings.defLen }); }
    else openBlock({ id: d.id });
    return;
  }
  if (ns == null) return;
  if (d.mode === 'create') { openBlock({ start: toHHMM(ns), dur: nd }); return; }
  const b = blockById(d.id); if (!b) return;
  const cur = inst(b, k); if (toMin(cur.start) === ns && cur.dur === nd) { render(); return; }
  setBlockTime(b, k, toHHMM(ns), nd);
}
/* Part 4: Diary (chores + journal) and Body (check-in, cycle, trends) */

const MOODS = [['1', '😣', 'Awful'], ['2', '😕', 'Low'], ['3', '😐', 'Okay'], ['4', '🙂', 'Good'], ['5', '😄', 'Great']];
const ci = k => S.checkin[k] || (S.checkin[k] = {});
const pruneCI = k => { const c = S.checkin[k]; if (c && !Object.values(c).some(v => v !== '' && v != null && !(Array.isArray(v) && !v.length))) delete S.checkin[k]; };

function moodRow(k) {
  const m = (S.checkin[k] || {}).mood;
  return `<div class="moods" role="radiogroup" aria-label="Mood">${MOODS.map(([v, e, l]) => `<button class="mood ${+m === +v ? 'on' : ''}" data-a="setCI" data-f="mood" data-v="${v}" role="radio" aria-checked="${+m === +v}" title="${l}"><span>${e}</span><small>${l}</small></button>`).join('')}</div>`;
}

function vDiary() {
  const k = UI.date, d = S.diary[k] || {}, ch = choresOn(k), log = S.choreLog[k] || {};
  const doneN = ch.filter(c => log[c.id]).length;
  const ago = [addK(k, -365), addK(k, -30), addK(k, -7)].map((x, i) => [x, ['A year ago', 'A month ago', 'A week ago'][i]]).find(([x]) => S.diary[x]?.text);
  const g = d.grat || ['', '', ''];
  return `${dateHead()}
  <div class="page diary">
    <section class="blockset">
      <div class="sec-head"><h2>Chores</h2><span class="count">${ch.length ? `${doneN} of ${ch.length}` : ''}</span><button class="link" data-a="manageChores">Edit</button></div>
      ${ch.length ? `<ul class="chores">${ch.sort((a, b) => (a.time || '99').localeCompare(b.time || '99')).map(c => `<li><button class="tick ${log[c.id] ? 'on' : ''}" data-a="chore" data-id="${c.id}" aria-pressed="${!!log[c.id]}">${icon('check')}</button><span class="grow">${esc(c.name)}</span>${c.time ? `<span class="t">${fmtTime(c.time)}${c.remind ? ' ' + icon('bell') : ''}</span>` : ''}</li>`).join('')}</ul>`
        : `<p class="empty">No chores on ${DAYS_FULL[parseK(k).getDay()]}s. <button class="link" data-a="newChore">Add one</button></p>`}
    </section>
    <section class="blockset">
      <div class="sec-head"><h2>How was today?</h2></div>
      ${moodRow(k)}
    </section>
    <section class="blockset paper">
      <div class="sec-head"><h2>Dear diary</h2><button class="link" data-a="pastPages">Past pages</button></div>
      <textarea class="journal" data-bind="diary.text" rows="8" placeholder="What happened today, what you learnt, what's on your mind…">${esc(d.text || '')}</textarea>
      <label class="sub-lab">Grateful for</label>
      <ol class="grat">${[0, 1, 2].map(i => `<li><input class="hand" data-bind="diary.grat.${i}" value="${esc(g[i] || '')}" placeholder="${['Something small', 'Someone', 'Something about you'][i]}"></li>`).join('')}</ol>
      <label class="sub-lab">Best moment</label>
      <input class="hand" data-bind="diary.best" value="${esc(d.best || '')}" placeholder="The moment you want to remember">
      <label class="sub-lab">Tomorrow I will</label>
      <input class="hand" data-bind="diary.tmr" value="${esc(d.tmr || '')}" placeholder="One intention for tomorrow">
    </section>
    ${ago ? `<section class="blockset memory" data-a="openDate" data-v="${ago[0]}" role="button" tabindex="0"><div class="sec-head"><h2>${ago[1]}</h2><span class="count">${fmtDate(ago[0], { day: true, year: true })}</span></div><p class="hand-p">${esc(S.diary[ago[0]].text.slice(0, 220))}${S.diary[ago[0]].text.length > 220 ? '…' : ''}</p></section>` : ''}
  </div>`;
}

function bindInput(el) {
  const path = el.dataset.bind.split('.'), k = UI.date;
  let obj = path[0] === 'diary' ? (S.diary[k] = S.diary[k] || {}) : ci(k);
  const val = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
  if (path[1] === 'grat') { obj.grat = obj.grat || ['', '', '']; obj.grat[+path[2]] = val; }
  else obj[path[1]] = val;
  if (path[0] === 'diary' && !Object.values(S.diary[k]).some(v => Array.isArray(v) ? v.some(Boolean) : v)) delete S.diary[k];
  if (path[0] === 'ci') pruneCI(k);
  clearTimeout(bindInput.t); bindInput.t = setTimeout(() => save({ quiet: true }), 600);
}
function autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, 160) + 'px'; }

function pastPages() {
  const ks = Object.keys(S.diary).filter(k => S.diary[k]?.text || S.diary[k]?.best).sort().reverse().slice(0, 120);
  openSheet(`${sheetHead('Past pages')}${ks.length ? `<div class="pages">${ks.map(k => `<button class="pg" data-a="openDate" data-v="${k}" data-to="diary"><b>${fmtDate(k, { day: true, year: k.slice(0, 4) !== dkey().slice(0, 4) })}</b><span>${esc((S.diary[k].text || S.diary[k].best || '').slice(0, 120))}</span></button>`).join('')}</div>` : '<p class="empty">Your written pages will collect here.</p>'}`);
}

function manageChores() {
  openSheet(`${sheetHead('Daily chores')}<p class="lead small">They show up on each day's page. Turn on the bell to get a reminder at that time.</p>
    <div class="list">${S.chores.map(c => `<button class="li" data-a="editChore" data-id="${c.id}"><span class="grow"><b>${esc(c.name)}</b><small>${c.days.length === 7 ? 'Every day' : c.days.length ? [1, 2, 3, 4, 5, 6, 0].filter(d => c.days.includes(d)).map(d => DAYS[d]).join(' ') : 'No days'}${c.time ? ' · ' + fmtTime(c.time) : ''}</small></span>${c.remind && c.time ? icon('bell') : ''}${icon('right')}</button>`).join('') || '<p class="empty">No chores yet.</p>'}</div>
    <footer class="sh-foot"><span class="grow"></span><button class="btn primary" data-a="newChore">${icon('plus')} Add chore</button></footer>`);
}
function choreForm(c) {
  const isNew = !c; c = c || { name: '', time: '', days: [0, 1, 2, 3, 4, 5, 6], remind: true };
  openForm({ title: isNew ? 'New chore' : 'Edit chore', fields: [
    { k: 'name', label: 'Chore', value: c.name, placeholder: 'e.g. Take vitamins, Fill water bottles, Puja', auto: true },
    { k: 'days', label: 'On', type: 'days', value: c.days },
    { k: 'time', label: 'At (optional)', type: 'time', value: c.time, half: true },
    { k: 'remind', label: 'Remind me at that time', type: 'toggle', value: c.remind },
  ], onSave: v => {
    if (!v.name) { toast('Name the chore'); return false; }
    if (isNew) S.chores.push({ id: uid(), ...v }); else Object.assign(c, v);
    setTimeout(manageChores, 230);
  }, onDelete: isNew ? null : async () => { S.chores = S.chores.filter(x => x !== c); setTimeout(manageChores, 230); return true; } });
}

// ---------- Body ----------
function vBody() {
  const k = UI.date, c = S.checkin[k] || {}, st = S.settings;
  const water = +c.water || 0, wg = st.waterGoal;
  const syms = [...new Set([...st.symptoms, ...(c.sym || [])])];
  return `${dateHead()}
  <div class="page body">
    <section class="blockset">
      <div class="sec-head"><h2>Check-in</h2></div>
      ${moodRow(k)}
      <div class="ci-grid">
        <div class="ci"><span class="ci-l">Energy</span><div class="pips">${[1, 2, 3, 4, 5].map(i => `<button class="pip ${+c.energy >= i ? 'on' : ''}" data-a="setCI" data-f="energy" data-v="${i}" aria-label="Energy ${i}"></button>`).join('')}</div></div>
        <div class="ci"><span class="ci-l">Sleep</span><div class="stepper"><button class="icon-btn" data-a="stepCI" data-f="sleep" data-v="-0.5" aria-label="Less sleep">${icon('minus')}</button><b>${c.sleep != null && c.sleep !== '' ? c.sleep + ' h' : '—'}</b><button class="icon-btn" data-a="stepCI" data-f="sleep" data-v="0.5" aria-label="More sleep">${icon('plus')}</button></div></div>
        <div class="ci wide"><span class="ci-l">Water <small>${water}/${wg} glasses</small></span><div class="glasses">${Array.from({ length: Math.max(wg, water) + 1 }, (_, i) => i).slice(1).map(i => `<button class="glass ${water >= i ? 'on' : ''}" data-a="setCI" data-f="water" data-v="${i}" aria-label="${i} glasses"></button>`).join('')}<button class="icon-btn" data-a="stepCI" data-f="water" data-v="1" aria-label="One more glass">${icon('plus')}</button></div></div>
        <div class="ci wide"><span class="ci-l">Flow</span><div class="pick seg">${[['', 'None'], ['spot', 'Spotting'], ['light', 'Light'], ['med', 'Medium'], ['heavy', 'Heavy']].map(([v, l]) => `<button class="${(c.flow || '') === v ? 'on' : ''}" data-a="setCI" data-f="flow" data-v="${v}">${l}</button>`).join('')}</div></div>
        <div class="ci wide"><span class="ci-l">Feeling <button class="link small" data-a="editSymptoms">Edit list</button></span><div class="pick chips">${syms.map(s => `<button class="${(c.sym || []).includes(s) ? 'on' : ''}" data-a="toggleSym" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
        <div class="ci"><span class="ci-l">Weight</span><input type="number" inputmode="decimal" step="0.1" data-bind="ci.weight" value="${c.weight ?? ''}" placeholder="kg"></div>
        <div class="ci"><span class="ci-l">Body note</span><input data-bind="ci.note" value="${esc(c.note || '')}" placeholder="Anything else"></div>
      </div>
    </section>
    ${cycleCard(k)}
    ${trends()}
  </div>`;
}

function cycleCard(k) {
  const info = cycleInfo(k), open = S.periods.find(p => p.start <= k && !p.end);
  const R = 52, C = 2 * Math.PI * R;
  let ring = '', main = '';
  if (info.none) main = `<p class="lead">Log the first day of your period and Sankalpa will predict the next one.</p>`;
  else {
    const day = info.day, frac = clamp((day - 1) / info.cycle, 0, 1), pf = info.plen / info.cycle;
    const ovuFrac = (info.cycle - 14) / info.cycle;
    ring = `<svg class="ring" viewBox="0 0 130 130" aria-hidden="true"><circle cx="65" cy="65" r="${R}" class="r-track"/>
      <circle cx="65" cy="65" r="${R}" class="r-period" stroke-dasharray="${C * pf} ${C}" transform="rotate(-90 65 65)"/>
      <circle cx="65" cy="65" r="${R}" class="r-fertile" stroke-dasharray="${C * 7 / info.cycle} ${C}" transform="rotate(${-90 + (ovuFrac - 5 / info.cycle) * 360} 65 65)"/>
      <circle cx="${65 + R * Math.sin(frac * 2 * Math.PI)}" cy="${65 - R * Math.cos(frac * 2 * Math.PI)}" r="7" class="r-dot"/>
      <text x="65" y="62" class="r-n">${day}</text><text x="65" y="80" class="r-s">day of ${info.cycle}</text></svg>`;
    const nx = info.daysUntil;
    main = `<p class="big-line">${periodState(k) === 'on' ? 'On your period' : nx === 0 ? 'Period expected today' : nx < 0 ? `Period ${-nx} day${nx === -1 ? '' : 's'} late` : `Next period in ${nx} day${nx === 1 ? '' : 's'}`}</p>
      <p class="muted small">Expected ${fmtDate(info.next, { day: true })} · fertile window ≈ ${fmtDate(info.fertileFrom)}–${fmtDate(info.fertileTo)}</p>`;
  }
  const hist = [...S.periods].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8);
  return `<section class="blockset cycle">
    <div class="sec-head"><h2>Cycle</h2><span class="count">${info.none ? '' : `avg ${info.cycle} days · bleeding ${info.plen}`}</span></div>
    <div class="cyc">${ring}<div class="grow">${main}
      <div class="row wrap">${open ? `<button class="btn primary" data-a="periodEnd">Period ended ${k === dkey() ? 'today' : 'on ' + fmtDate(k)}</button>` : `<button class="btn primary rose" data-a="periodStart">Period started ${k === dkey() ? 'today' : 'on ' + fmtDate(k)}</button>`}</div></div></div>
    ${hist.length ? `<div class="hist">${hist.map((p, i) => { const nxt = hist[i - 1]; const len = p.end ? diffDays(p.start, p.end) + 1 : null; return `<button class="hrow" data-a="editPeriod" data-v="${p.start}"><b>${fmtDate(p.start, { year: p.start.slice(0, 4) !== dkey().slice(0, 4) })}</b><span>${len ? `${len} days` : 'ongoing'}</span><span class="muted">${nxt ? `${diffDays(p.start, nxt.start)}-day cycle` : ''}</span></button>`; }).join('')}</div>` : ''}
  </section>`;
}

function spark(vals, max, cls, unit) {
  const w = 14, h = 54, n = vals.length;
  return `<svg class="spark ${cls}" viewBox="0 0 ${n * w} ${h + 14}" preserveAspectRatio="none" aria-hidden="true">${vals.map((v, i) => v == null || v === '' ? `<rect x="${i * w + 4}" y="${h - 2}" width="${w - 8}" height="2" class="sp-none"/>` : `<rect x="${i * w + 3}" y="${h - Math.max(3, (v / max) * h)}" width="${w - 6}" height="${Math.max(3, (v / max) * h)}" rx="3"/>`).join('')}</svg>`;
}
function trends() {
  const days = Array.from({ length: 14 }, (_, i) => addK(dkey(), i - 13)), g = f => days.map(k => (S.checkin[k] || {})[f]);
  const sl = g('sleep'), mo = g('mood'), wa = g('water'), en = g('energy');
  const avg = a => { const v = a.filter(x => x !== '' && x != null).map(Number); return v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length * 10) / 10 : '—'; };
  const wts = Object.entries(S.checkin).filter(([, c]) => c.weight).sort(([a], [b]) => a.localeCompare(b)).slice(-2);
  return `<section class="blockset">
    <div class="sec-head"><h2>Last 14 days</h2></div>
    <div class="trends">
      <div><span class="ci-l">Sleep <b>${avg(sl)} h</b></span>${spark(sl, 10, 'sp-sleep')}</div>
      <div><span class="ci-l">Mood <b>${avg(mo)}</b></span>${spark(mo, 5, 'sp-mood')}</div>
      <div><span class="ci-l">Energy <b>${avg(en)}</b></span>${spark(en, 5, 'sp-energy')}</div>
      <div><span class="ci-l">Water <b>${avg(wa)}</b></span>${spark(wa, Math.max(S.settings.waterGoal, 1), 'sp-water')}</div>
    </div>
    ${wts.length ? `<p class="muted small">Weight ${wts.at(-1)[1].weight} kg on ${fmtDate(wts.at(-1)[0])}${wts.length > 1 ? ` (${(wts[1][1].weight - wts[0][1].weight >= 0 ? '+' : '')}${Math.round((wts[1][1].weight - wts[0][1].weight) * 10) / 10} since ${fmtDate(wts[0][0])})` : ''}</p>` : ''}
  </section>`;
}
function editPeriod(start) {
  const p = S.periods.find(x => x.start === start); if (!p) return;
  openForm({ title: 'Edit period', fields: [
    { k: 'start', label: 'First day', type: 'date', value: p.start, half: true },
    { k: 'end', label: 'Last day', type: 'date', value: p.end || '', half: true, hint: 'Leave empty if it hasn\'t ended' },
  ], onSave: v => { if (!v.start) return false; if (v.end && v.end < v.start) { toast('The last day is before the first day'); return false; } p.start = v.start; p.end = v.end || null; },
  onDelete: async () => { S.periods = S.periods.filter(x => x !== p); return true; } });
}
/* Part 5: Planner — week, month and year with calendar, plans, vrat & festivals */

const noteKey = () => { const r = UI.planRef; return UI.plan === 'week' ? 'w:' + weekStartK(r) : UI.plan === 'month' ? 'm:' + r.slice(0, 7) : 'y:' + r.slice(0, 4); };
function planTitle() {
  const r = parseK(UI.planRef);
  if (UI.plan === 'week') { const a = weekStartK(UI.planRef), b = addK(a, 6); return `${fmtDate(a)} – ${fmtDate(b)}`; }
  if (UI.plan === 'month') return `${MONTHS[r.getMonth()]} ${r.getFullYear()}`;
  return String(r.getFullYear());
}
function vPlanner() {
  const nk = noteKey(), n = S.notes[nk] || {}, items = n.items || [];
  const label = UI.plan === 'week' ? 'Focus this week' : UI.plan === 'month' ? 'Plan for the month' : 'Intentions for the year';
  return `<header class="pagehead"><h1>Planner</h1>
      <button class="chip" data-a="obsManager">${icon('lamp')} Vrat</button>
      <button class="icon-btn only-phone" data-a="go" data-v="settings" aria-label="Settings">${icon('gear')}</button></header>
  <div class="pick seg modes" role="tablist">${[['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([v, l]) => `<button class="${UI.plan === v ? 'on' : ''}" data-a="planMode" data-v="${v}" role="tab" aria-selected="${UI.plan === v}">${l}</button>`).join('')}</div>
  <div class="pnav"><button class="icon-btn" data-a="planShift" data-v="-1" aria-label="Previous">${icon('left')}</button><h2>${planTitle()}</h2><button class="icon-btn" data-a="planShift" data-v="1" aria-label="Next">${icon('right')}</button>
    <button class="btn small" data-a="planNow">${UI.plan === 'week' ? 'This week' : UI.plan === 'month' ? 'This month' : 'This year'}</button></div>
  <div class="page planner">
    ${UI.plan === 'week' ? weekView() : UI.plan === 'month' ? monthView() : yearView()}
    <section class="blockset paper focus">
      <div class="sec-head"><h2>${label}</h2><span class="count">${items.length ? `${items.filter(i => i.done).length}/${items.length}` : ''}</span></div>
      <ul class="checklist">${items.map(i => `<li><button class="tick ${i.done ? 'on' : ''}" data-a="noteTick" data-id="${i.id}">${icon('check')}</button><span class="grow hand-p">${esc(i.t)}</span><button class="icon-btn sm" data-a="noteDel" data-id="${i.id}" aria-label="Remove">${icon('close')}</button></li>`).join('')}
        <li class="add"><input class="hand" id="noteAdd" placeholder="Add a ${UI.plan === 'year' ? 'goal for the year' : UI.plan === 'month' ? 'target for the month' : 'priority for the week'}" enterkeyhint="done"><button class="icon-btn" data-a="noteAdd" aria-label="Add">${icon('plus')}</button></li></ul>
      <textarea class="journal short" data-note="${nk}" rows="3" placeholder="Notes">${esc(n.text || '')}</textarea>
    </section>
  </div>`;
}
function dayMarks(k) {
  const o = obsOn(k), p = S.plans.filter(x => x.date === k), ps = periodState(k);
  return { o, p, ps, diary: !!S.diary[k]?.text };
}
function weekView() {
  const a = weekStartK(UI.planRef);
  return `<section class="week">${Array.from({ length: 7 }, (_, i) => addK(a, i)).map(k => {
    const d = parseK(k), m = dayMarks(k), bl = dayBlocks(k);
    return `<div class="wrow ${k === dkey() ? 'today' : ''} ps-${m.ps}" data-a="openDay" data-v="${k}" role="button" tabindex="0">
      <div class="wd"><small>${DAYS[d.getDay()]}</small><b>${d.getDate()}</b></div>
      <div class="grow">
        <div class="wtags">${m.o.map(o => `<span class="tag c-${o.color}">${esc(o.name)}${S.obsKept[k]?.[o.id] ? ' ✓' : ''}</span>`).join('')}${m.ps === 'on' ? '<span class="tag period">Period</span>' : m.ps === 'predicted' ? '<span class="tag period pred">Period due</span>' : ''}</div>
        ${m.p.map(p => `<div class="wplan ${p.done ? 'done' : ''}"><button class="tick sm ${p.done ? 'on' : ''}" data-a="planTick" data-id="${p.id}">${icon('check')}</button><span>${p.time ? `<b>${fmtTime(p.time)}</b> ` : ''}${esc(p.title)}</span></div>`).join('')}
        ${!m.p.length && !m.o.length ? '<span class="muted small">Nothing planned</span>' : ''}
      </div>
      <div class="wmeta">${bl.length ? `<span>${bl.filter(x => x.done).length}/${bl.length}</span>` : ''}${m.diary ? icon('diary') : ''}</div>
    </div>`;
  }).join('')}</section>`;
}
function monthGrid(y, mo, mini) {
  const first = new Date(y, mo, 1), lead = (first.getDay() - S.settings.weekStart + 7) % 7, n = new Date(y, mo + 1, 0).getDate();
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="mc blank"></span>';
  for (let d = 1; d <= n; d++) {
    const k = dkey(new Date(y, mo, d)), m = dayMarks(k);
    const cls = `mc ${k === dkey() ? 'today' : ''} ps-${m.ps} ${m.o.length ? 'has-o' : ''} ${m.p.length ? 'has-p' : ''} ${m.diary ? 'has-d' : ''}`;
    cells += mini ? `<span class="${cls}">${d}</span>`
      : `<button class="${cls}" data-a="openDay" data-v="${k}"><span class="n">${d}</span>${m.o.slice(0, 2).map(o => `<span class="ol c-${o.color}">${esc(o.name)}</span>`).join('')}${m.p.length ? `<span class="pd">${m.p.slice(0, 3).map(p => `<i class="${p.done ? 'done' : ''}" style="--c:${colorOf(p.color)[1]}"></i>`).join('')}${m.p.length > 3 ? '+' : ''}</span>` : ''}</button>`;
  }
  const order = Array.from({ length: 7 }, (_, i) => (i + S.settings.weekStart) % 7);
  return `<div class="mgrid ${mini ? 'mini' : ''}">${order.map(i => `<b class="mh">${mini ? DAYS[i][0] : DAYS[i]}</b>`).join('')}${cells}</div>`;
}
function monthView() {
  const r = parseK(UI.planRef), y = r.getFullYear(), mo = r.getMonth(), from = dkey(new Date(y, mo, 1)), to = dkey(new Date(y, mo + 1, 0));
  const ag = [];
  for (const o of S.obs) if (o.on) for (const k of obsDates(o, from, to)) ag.push({ k, t: o.name, o });
  for (const p of S.plans) if (p.date >= from && p.date <= to) ag.push({ k: p.date, t: p.title, p });
  ag.sort((a, b) => a.k.localeCompare(b.k) || (a.p?.time || '').localeCompare(b.p?.time || ''));
  return `<section class="month">${monthGrid(y, mo)}
    <p class="legend"><span><i class="lg period"></i>Period</span><span><i class="lg pred"></i>Expected</span><span><i class="lg fert"></i>Fertile</span><span><i class="lg obs"></i>Vrat / festival</span></p></section>
    <section class="blockset agenda"><div class="sec-head"><h2>This month</h2><button class="link" data-a="newPlan">${icon('plus')} Plan</button></div>
    ${ag.length ? `<ul>${ag.map(x => `<li data-a="openDay" data-v="${x.k}" role="button" tabindex="0" class="${x.p?.done ? 'done' : ''}"><span class="ad">${fmtDate(x.k, { day: true })}</span><span class="dot c-${x.o ? x.o.color : x.p.color || 'peach'}"></span><span class="grow">${x.p?.time ? fmtTime(x.p.time) + ' · ' : ''}${esc(x.t)}</span>${x.o && S.obsKept[x.k]?.[x.o.id] ? '<small>kept</small>' : ''}</li>`).join('')}</ul>` : '<p class="empty">Tap a date to plan something, or add a vrat with the lamp button.</p>'}</section>`;
}
function yearView() {
  const y = +UI.planRef.slice(0, 4);
  return `<section class="year">${MONTHS.map((m, i) => `<button class="ym" data-a="openMonth" data-v="${y}-${pad(i + 1)}-01"><b>${m}</b>${monthGrid(y, i, true)}</button>`).join('')}</section>`;
}

function openDay(k) {
  const d = parseK(k), m = dayMarks(k), kept = S.obsKept[k] || {}, ci0 = S.checkin[k] || {};
  const html = `${sheetHead(`${DAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`)}
    <p class="muted small sh-sub">${tithiName(k)}${m.ps === 'on' ? ' · Period' : m.ps === 'predicted' ? ' · Period expected' : m.ps === 'fertile' ? ' · Fertile window' : ''}${ci0.mood ? ' · ' + MOODS[ci0.mood - 1][1] : ''}</p>
    ${m.o.length ? `<div class="list">${m.o.map(o => `<div class="li obs-li"><span class="dot c-${o.color}"></span><span class="grow"><b>${esc(o.name)}</b>${o.note ? `<small>${esc(o.note)}</small>` : ''}</span>
      <button class="btn small ${kept[o.id] ? 'on' : ''}" data-a="obsKept" data-id="${o.id}" data-v="${k}">${kept[o.id] ? '✓ Kept' : 'Mark kept'}</button>
      <button class="btn small ghost" data-a="obsSkip" data-id="${o.id}" data-v="${k}" title="Remove from this date">Not this day</button></div>`).join('')}</div>` : ''}
    <div class="list">${m.p.map(p => `<div class="li"><button class="tick ${p.done ? 'on' : ''}" data-a="planTick" data-id="${p.id}">${icon('check')}</button><button class="grow plain" data-a="editPlan" data-id="${p.id}"><b>${esc(p.title)}</b>${p.time || p.note ? `<small>${p.time ? fmtTime(p.time) : ''}${p.remind && p.time ? ' · reminder' : ''}${p.note ? ' · ' + esc(p.note) : ''}</small>` : ''}</button></div>`).join('')}</div>
    <div class="quick-add"><input id="qpTitle" placeholder="Plan something for this day" enterkeyhint="done"><input id="qpTime" type="time" aria-label="Time (optional)"><button class="btn primary" data-a="quickPlan" data-v="${k}">Add</button></div>
    <footer class="sh-foot wrap"><button class="btn ghost" data-a="addObsOn" data-v="${k}">${icon('lamp')} Vrat on this day</button><span class="grow"></span>
      <button class="btn small" data-a="openDate" data-v="${k}" data-to="today">Timeline</button><button class="btn small" data-a="openDate" data-v="${k}" data-to="diary">Diary</button></footer>`;
  openSheet(html, { focus: false, k });
}

function planForm(p, date) {
  const isNew = !p; p = p || { title: '', date: date || UI.date, time: '', remind: true, color: 'peach', note: '' };
  openForm({ title: isNew ? 'New plan' : 'Edit plan', fields: [
    { k: 'title', label: 'Plan', value: p.title, auto: true, placeholder: 'e.g. Submit abstract, Call Nani, Pay rent' },
    { k: 'date', label: 'Date', type: 'date', value: p.date, half: true },
    { k: 'time', label: 'Time (optional)', type: 'time', value: p.time, half: true },
    { k: 'remind', label: 'Remind me at that time', type: 'toggle', value: p.remind, show: v => !!v.time },
    { k: 'color', label: 'Colour', type: 'color', value: p.color },
    { k: 'note', label: 'Note', value: p.note, placeholder: 'Optional' },
  ], onSave: v => { if (!v.title || !v.date) { toast('Add a title and date'); return false; } if (isNew) S.plans.push({ id: uid(), done: false, ...v }); else Object.assign(p, v); },
  onDelete: isNew ? null : async () => { S.plans = S.plans.filter(x => x !== p); return true; } });
}

// ---------- vrat & festivals ----------
function obsSummary(o) {
  if (o.kind === 'moon') { const t = (MOON_KINDS.find(m => m[0] === o.moon) || [, ''])[1]; return t && !o.name.toLowerCase().includes(t.split(' ')[0].toLowerCase()) ? `${t}, moon calendar` : 'Moon calendar'; }
  if (o.kind === 'weekly') return 'Every ' + [1, 2, 3, 4, 5, 6, 0].filter(d => (o.days || []).includes(d)).map(d => DAYS_FULL[d]).join(', ');
  if (o.kind === 'yearly') return `Every year on ${fmtDate(o.date)}`;
  return `${(o.dates || []).length} date${(o.dates || []).length === 1 ? '' : 's'}`;
}
function obsManager() {
  const t = dkey(), end = addK(t, 400);
  openSheet(`${sheetHead('Vrat, festivals & weekly fasts')}
    <p class="lead small">Moon days are worked out from the moon's position at sunrise (${fmtTime(S.settings.sunrise)}). Panchangs sometimes differ by a day; open any date in the planner to move it.</p>
    <div class="list">${S.obs.map(o => { const nx = o.on ? obsDates(o, t, end)[0] : null; return `<div class="li"><label class="switch" aria-label="${esc(o.name)} on"><input type="checkbox" data-a="obsToggle" data-id="${o.id}" ${o.on ? 'checked' : ''}><span></span></label>
      <button class="grow plain" data-a="editObs" data-id="${o.id}"><b>${esc(o.name)}</b><small>${esc(obsSummary(o))}${nx ? ` · next ${fmtDate(nx, { day: true })}` : ''}${o.on && (o.eve || o.morn) ? ' · reminders' : ''}</small></button><span class="dot c-${o.color}"></span></div>`; }).join('')}</div>
    <footer class="sh-foot"><span class="grow"></span><button class="btn primary" data-a="newObs">${icon('plus')} Add</button></footer>`, { focus: false });
}
function obsForm(o, date) {
  const isNew = !o;
  o = o || { name: '', kind: date ? 'dates' : 'weekly', moon: 'ekadashi', days: [1], date: date || dkey(), dates: date ? [date] : [], eve: '19:00', morn: '06:30', color: 'haldi', note: '', on: true };
  openForm({ title: isNew ? 'New vrat or festival' : 'Edit', fields: [
    { k: 'name', label: 'Name', value: o.name, auto: true, placeholder: 'e.g. Somvar vrat, Karva Chauth, Maa\'s birthday' },
    { k: 'kind', label: 'When', type: 'seg', value: o.kind, options: [['weekly', 'Weekly'], ['moon', 'Moon day'], ['yearly', 'Yearly'], ['dates', 'Chosen dates']] },
    { k: 'days', label: 'Every', type: 'days', value: o.days || [], show: v => v.kind === 'weekly' },
    { k: 'moon', label: 'Tithi', type: 'select', value: o.moon, options: MOON_KINDS.map(m => [m[0], m[1]]), show: v => v.kind === 'moon' },
    { k: 'date', label: 'Date', type: 'date', value: o.date, show: v => v.kind === 'yearly' },
    { k: 'dates', label: 'Dates', type: 'datelist', value: o.dates || [], show: v => v.kind === 'dates' },
    { k: 'eve', label: 'Remind the evening before', type: 'time', value: o.eve, half: true, hint: 'Clear to turn off' },
    { k: 'morn', label: 'Remind on the day', type: 'time', value: o.morn, half: true },
    { k: 'color', label: 'Colour', type: 'color', value: o.color },
    { k: 'note', label: 'Note', value: o.note, placeholder: 'e.g. Phalahar only, Break fast after sunrise' },
  ], onSave: v => {
    if (!v.name) { toast('Give it a name'); return false; }
    if (v.kind === 'weekly' && !v.days.length) { toast('Pick at least one day'); return false; }
    if (isNew) S.obs.push({ id: uid(), on: true, ...v }); else Object.assign(o, v);
    obsCache.clear(); setTimeout(obsManager, 230);
  }, onDelete: isNew ? null : async () => { if (!(await confirmBox(`Delete “${o.name}”?`))) return false; S.obs = S.obs.filter(x => x !== o); obsCache.clear(); return true; } });
}
/* Part 6: Money */

function monthTx(m = UI.moneyMonth) { return S.money.tx.filter(t => t.date && t.date.slice(0, 7) === m); }
function vMoney() {
  const m = UI.moneyMonth, [y, mo] = m.split('-').map(Number), tx = monthTx();
  const out = tx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0), inc = tx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const byCat = {}; tx.filter(t => t.type === 'expense').forEach(t => byCat[t.cat] = (byCat[t.cat] || 0) + t.amount);
  const cats = [...new Set([...Object.keys(byCat), ...Object.keys(S.money.budget).filter(c => +S.money.budget[c] > 0)])].sort((a, b) => (byCat[b] || 0) - (byCat[a] || 0));
  const totalBudget = Object.values(S.money.budget).reduce((a, b) => a + (+b || 0), 0);
  const max = Math.max(1, ...cats.map(c => Math.max(byCat[c] || 0, +S.money.budget[c] || 0)));
  const days = [...new Set(tx.map(t => t.date))].sort().reverse();
  return `<header class="pagehead"><h1>Money</h1><button class="icon-btn only-phone" data-a="go" data-v="settings" aria-label="Settings">${icon('gear')}</button></header>
  <div class="pnav"><button class="icon-btn" data-a="moneyShift" data-v="-1" aria-label="Previous month">${icon('left')}</button><h2>${MONTHS[mo - 1]} ${y}</h2><button class="icon-btn" data-a="moneyShift" data-v="1" aria-label="Next month">${icon('right')}</button></div>
  <div class="page money">
    <section class="sums">
      <div><small>Spent</small><b>${money(out)}</b></div><div><small>Came in</small><b>${money(inc)}</b></div><div class="${inc - out < 0 ? 'neg' : ''}"><small>Left</small><b>${money(inc - out)}</b></div>
    </section>
    ${totalBudget ? `<div class="budget"><div class="bar"><i style="width:${clamp(out / totalBudget * 100, 0, 100)}%" class="${out > totalBudget ? 'over' : ''}"></i></div><small>${money(out)} of ${money(totalBudget)} budget${out > totalBudget ? ` · ${money(out - totalBudget)} over` : ` · ${money(totalBudget - out)} left`}</small></div>` : ''}
    <div class="row two"><button class="btn primary big" data-a="newTx" data-v="expense">${icon('minus')} Expense</button><button class="btn big" data-a="newTx" data-v="income">${icon('plus')} Income</button></div>
    ${cats.length ? `<section class="blockset"><div class="sec-head"><h2>Where it went</h2><button class="link" data-a="moneyCats">Categories</button></div>
      <div class="cats">${cats.map(c => { const v = byCat[c] || 0, b = +S.money.budget[c] || 0; return `<button class="cat" data-a="setBudget" data-v="${esc(c)}"><span class="cn">${esc(c)}</span><span class="cbar"><i style="width:${v / max * 100}%" class="${b && v > b ? 'over' : ''}"></i>${b ? `<em style="left:${b / max * 100}%"></em>` : ''}</span><span class="cv">${money(v)}${b ? `<small>/${money(b)}</small>` : ''}</span></button>`; }).join('')}</div></section>` : ''}
    <section class="blockset">
      <div class="sec-head"><h2>Entries</h2>${cats.length ? '' : '<button class="link" data-a="moneyCats">Categories</button>'}</div>
      ${days.length ? days.map(k => `<div class="txday"><h3>${fmtDate(k, { day: true })}</h3>${tx.filter(t => t.date === k).map(t => `<button class="tx" data-a="editTx" data-id="${t.id}"><span class="grow"><b>${esc(t.note || t.cat)}</b><small>${esc(t.cat)}${t.method ? ' · ' + esc(t.method) : ''}</small></span><span class="amt ${t.type}">${t.type === 'expense' ? '−' : '+'}${money(t.amount)}</span></button>`).join('')}</div>`).join('')
        : '<p class="empty">Nothing logged this month. Add what you spend as you go — it takes five seconds.</p>'}
    </section>
  </div>`;
}
function txForm(type, t) {
  const isNew = !t; t = t || { type, amount: '', cat: type === 'income' ? S.money.inc[0] : S.money.exp[0], date: UI.moneyMonth === dkey().slice(0, 7) ? dkey() : UI.moneyMonth + '-01', method: 'UPI', note: '' };
  openForm({ title: isNew ? (type === 'income' ? 'Money in' : 'Money spent') : 'Edit entry', fields: [
    { k: 'type', type: 'seg', value: t.type, options: [['expense', 'Spent'], ['income', 'Came in']] },
    { k: 'amount', label: `Amount (${S.settings.currency})`, type: 'number', value: t.amount, auto: true, half: true },
    { k: 'date', label: 'Date', type: 'date', value: t.date, half: true },
    { k: 'catE', label: 'Category', type: 'seg', value: t.type === 'expense' ? t.cat : S.money.exp[0], options: S.money.exp.map(c => [c, c]), show: v => v.type === 'expense' },
    { k: 'catI', label: 'Category', type: 'seg', value: t.type === 'income' ? t.cat : S.money.inc[0], options: S.money.inc.map(c => [c, c]), show: v => v.type === 'income' },
    { k: 'note', label: 'For', value: t.note, placeholder: 'e.g. Chai with lab, Train to Delhi' },
    { k: 'method', label: 'Paid by', type: 'seg', value: t.method || 'UPI', options: [['UPI', 'UPI'], ['Cash', 'Cash'], ['Card', 'Card'], ['Other', 'Other']] },
  ], onSave: v => {
    const amount = +v.amount; if (!(amount > 0)) { toast('Enter an amount'); return false; }
    const rec = { type: v.type, amount, date: v.date || dkey(), cat: v.type === 'expense' ? v.catE : v.catI, note: v.note, method: v.method };
    if (isNew) S.money.tx.push({ id: uid(), ...rec }); else Object.assign(t, rec);
    UI.moneyMonth = rec.date.slice(0, 7);
  }, onDelete: isNew ? null : async () => { S.money.tx = S.money.tx.filter(x => x !== t); return true; } });
}
function moneyCats() {
  openForm({ title: 'Categories', fields: [
    { k: 'exp', label: 'Spending categories (one per line)', type: 'textarea', rows: 6, value: S.money.exp.join('\n') },
    { k: 'inc', label: 'Income categories (one per line)', type: 'textarea', rows: 3, value: S.money.inc.join('\n') },
  ], onSave: v => {
    const L = s => [...new Set(s.split('\n').map(x => x.trim()).filter(Boolean))];
    const e = L(v.exp), i = L(v.inc); if (!e.length || !i.length) { toast('Keep at least one category in each'); return false; }
    S.money.exp = e; S.money.inc = i;
  } });
}
function setBudget(cat) {
  openForm({ title: `Monthly budget: ${cat}`, fields: [{ k: 'b', label: `Amount (${S.settings.currency}) — leave empty for no budget`, type: 'number', value: S.money.budget[cat] || '', auto: true }],
    onSave: v => { if (+v.b > 0) S.money.budget[cat] = +v.b; else delete S.money.budget[cat]; } });
}
/* Part 7: Settings, sign-in & sync (Firebase), push reminders */

function vSettings() {
  const c = Cloud.status(), st = S.settings, perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const old = Object.keys(localStorage).some(k => k.startsWith('sankalpa_old_'));
  const row = (a, t, s, v = '') => `<button class="srow" data-a="${a}" ${v ? `data-v="${v}"` : ''}><span class="grow"><b>${t}</b>${s ? `<small>${s}</small>` : ''}</span>${icon('right')}</button>`;
  const ran = c.lastRun ? Math.round((Date.now() - c.lastRun) / 60000) : null;
  return `<header class="pagehead"><h1>Settings</h1></header>
  <div class="page settings">
    ${CLOUD_CFG ? `<section class="sgroup"><h2>Account</h2><p class="small">${c.email ? `Signed in as <b>${esc(c.email)}</b>. Your pages sync across your devices and only you can see them.` : 'Not signed in.'}</p>
      ${c.email ? `<div class="row wrap"><button class="btn" data-a="signOut">Sign out</button><button class="btn ghost danger-t" data-a="deleteAccount">Delete account and data</button></div>` : ''}</section>` : `<section class="sgroup"><h2>Saved on this device</h2><p class="small">Add your Firebase keys to config.js to sign in and sync across devices.</p></section>`}
    <section class="sgroup"><h2>Notifications</h2>
      <p class="small">${perm === 'granted' ? (c.push ? 'On for this device. Reminders arrive even when Sankalpa is closed.' : 'Allowed. Tap “Turn on” to register this device for reminders when the app is closed.') : perm === 'denied' ? 'Blocked by your phone or browser. <button class="link" data-a="notifHelp">How to allow them</button>' : perm === 'unsupported' ? 'This browser can\'t show notifications. On iPhone, add Sankalpa to your home screen first.' : 'Off.'}</p>
      ${ran != null ? `<p class="small muted">${ran < 40 ? 'Reminder sender is running' : `Reminder sender last ran ${ran < 120 ? ran + ' min' : Math.round(ran / 60) + ' h'} ago`}${c.tokenCount ? ` · ${c.tokenCount} device${c.tokenCount > 1 ? 's' : ''}` : ''} · ${buildEvents().length} reminders in the next 30 days</p>` : ''}
      <div class="row wrap"><button class="btn primary" data-a="enableNotif">Turn on for this device</button><button class="btn" data-a="testNotif">Send a test</button></div>
      ${row('notifyTypes', 'What to remind me about', Object.entries({ blocks: 'Timeline', chores: 'Chores', obs: 'Vrat', plans: 'Plans', period: 'Period', diary: 'Diary', planning: 'Planning' }).filter(([k]) => st.notify[k] !== false).map(([, v]) => v).join(', ') || 'Nothing')}
      ${row('diaryRem', 'Diary & planning reminders', `${st.diaryTime ? 'Diary at ' + fmtTime(st.diaryTime) : 'No diary reminder'}${st.weekPlan.on ? ` · week plan ${DAYS[st.weekPlan.day]} ${fmtTime(st.weekPlan.time)}` : ''}`)}
    </section>
    <section class="sgroup"><h2>Your days</h2>
      ${row('settingsTimeline', 'Timeline', `${fmtTime(toHHMM(st.dayStart * 60))} to ${st.dayEnd === 24 ? 'midnight' : fmtTime(toHHMM(st.dayEnd * 60))} · ${st.step}-minute grid · ${st.clock24 ? '24' : '12'}-hour clock`)}
      ${row('manageChores', 'Daily chores', `${S.chores.length} chore${S.chores.length === 1 ? '' : 's'}`)}
      ${row('obsManager', 'Vrat, festivals & weekly fasts', `${S.obs.filter(o => o.on).length} on`)}
      ${row('generalSet', 'Calendar & moon days', `Week starts ${DAYS_FULL[st.weekStart]} · sunrise ${fmtTime(st.sunrise)}`)}
      ${row('bodySet', 'Body & cycle', `Water goal ${st.waterGoal} · usual cycle ${st.cycleLen} days`)}
      ${row('moneySet', 'Money', `Currency ${st.currency}`)}
    </section>
    <section class="sgroup"><h2>Your data</h2>
      <div class="row wrap"><button class="btn" data-a="exportData">Download backup</button><button class="btn" data-a="importData">Restore from backup</button>${old ? '<button class="btn ghost" data-a="exportOld">Download data from the old Sankalpa</button>' : ''}</div>
      <p class="small muted">Backups are a .json file with everything in Sankalpa.</p>
    </section>
  </div>`;
}
function notifyTypes() {
  const n = S.settings.notify, L = { blocks: 'Timeline blocks (the ones with a bell)', chores: 'Chores with a time', obs: 'Vrat & festivals', plans: 'Planner items with a time', period: 'Period expected in 2 days', diary: 'Write today\'s diary', planning: 'Plan the week and month' };
  openForm({ title: 'Remind me about', fields: Object.entries(L).map(([k, l]) => ({ k, label: l, type: 'toggle', value: n[k] !== false })), onSave: v => { Object.assign(n, v); } });
}
function diaryRem() {
  const st = S.settings;
  openForm({ title: 'Diary & planning reminders', fields: [
    { k: 'diaryTime', label: 'Remind me to write my diary at', type: 'time', value: st.diaryTime, hint: 'Clear to turn off' },
    { k: 'wOn', label: 'Weekly planning reminder', type: 'toggle', value: st.weekPlan.on },
    { k: 'wDay', label: 'On', type: 'select', value: st.weekPlan.day, options: DAYS_FULL.map((d, i) => [i, d]), half: true, show: v => v.wOn },
    { k: 'wTime', label: 'At', type: 'time', value: st.weekPlan.time, half: true, show: v => v.wOn },
    { k: 'mOn', label: 'Monthly planning reminder on the 1st', type: 'toggle', value: st.monthPlan.on },
  ], onSave: v => { st.diaryTime = v.diaryTime; st.weekPlan = { on: v.wOn, day: +v.wDay, time: v.wTime || '19:00' }; st.monthPlan.on = v.mOn; } });
}
function generalSet() {
  const st = S.settings;
  openForm({ title: 'Calendar & moon days', fields: [
    { k: 'name', label: 'Your name', value: st.name },
    { k: 'weekStart', label: 'Week starts on', type: 'seg', value: st.weekStart, options: [[1, 'Monday'], [0, 'Sunday']] },
    { k: 'sunrise', label: 'Sunrise time used for tithis', type: 'time', value: st.sunrise, hint: 'Bengaluru is about 6:05–6:40 through the year. A tithi is counted for the day if it is running at sunrise.' },
  ], onSave: v => { st.name = v.name; st.weekStart = +v.weekStart; st.sunrise = v.sunrise || '06:15'; obsCache.clear(); } });
}
function bodySet() {
  const st = S.settings;
  openForm({ title: 'Body & cycle', fields: [
    { k: 'waterGoal', label: 'Water goal (glasses)', type: 'number', value: st.waterGoal, half: true },
    { k: 'cycleLen', label: 'Usual cycle (days)', type: 'number', value: st.cycleLen, half: true, hint: 'Used until you have logged two periods' },
    { k: 'periodLen', label: 'Usual period length (days)', type: 'number', value: st.periodLen, half: true },
  ], onSave: v => { st.waterGoal = clamp(+v.waterGoal || 8, 1, 20); st.cycleLen = clamp(+v.cycleLen || 28, 18, 50); st.periodLen = clamp(+v.periodLen || 5, 1, 12); } });
}
function editSymptoms() {
  openForm({ title: 'Feelings & symptoms', fields: [{ k: 'l', label: 'One per line', type: 'textarea', rows: 10, value: S.settings.symptoms.join('\n') }],
    onSave: v => { S.settings.symptoms = [...new Set(v.l.split('\n').map(x => x.trim()).filter(Boolean))]; } });
}
function moneySet() {
  openForm({ title: 'Money', fields: [{ k: 'currency', label: 'Currency symbol', value: S.settings.currency }], onSave: v => { S.settings.currency = v.currency || '₹'; } });
}
function download(name, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- Firebase: sign-in, sync, push ----------
const Cloud = (() => {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const CLIENT = uid(), cfg = CLOUD_CFG;
  const st = { state: cfg ? 'loading' : 'off', email: '', error: '', push: false, lastRun: null, tokenCount: 0 };
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
    const { doc, getDoc, setDoc, onSnapshot } = fb.F;
    STORE_KEY = 'bloom_u_' + u.uid;
    let local = loadStore(STORE_KEY);
    const ref = doc(fb.db, 'users', u.uid, 'state', 'main');
    try {
      const snap = await getDoc(ref);
      const remote = snap.exists() ? snap.data() : null;
      let remoteRaw = null; try { remoteRaw = remote ? JSON.parse(remote.json) : null; } catch { }
      if (remoteRaw && isOldShape(remoteRaw)) {
        // first time on the new Sankalpa: keep a copy of the old data, then convert it
        keepOldCopy(remoteRaw, STORE_KEY);
        try { await setDoc(doc(fb.db, 'users', u.uid, 'state', 'old'), { json: remote.json, savedAt: Date.now() }); } catch (e) { console.warn('old copy', e); }
      }
      if (remoteRaw && (remote.updatedAt || 0) >= ((local && local.updatedAt) || 0)) S = upgrade(remoteRaw);
      else S = local || defaultState();
      LOCKED = false; st.state = 'on';
      saveLocalOnly();
      if (!remoteRaw || isOldShape(remoteRaw) || (local && local.updatedAt > (remote.updatedAt || 0))) { if (!S.updatedAt) S.updatedAt = Date.now(); await push(); }
      await pushEvents(true);
      unsubs.push(onSnapshot(ref, s => {
        if (!s.exists()) return; const d = s.data();
        if (d.client !== CLIENT && d.updatedAt > S.updatedAt) {
          try { const r = JSON.parse(d.json); if (isOldShape(r)) return; S = upgrade(r); } catch { return; }
          saveLocalOnly();
          const typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
          if ($('#modal').hidden && !typing && !Drag.d) render();
        }
      }));
      unsubs.push(onSnapshot(doc(fb.db, 'push', u.uid), s => {
        const d = s.exists() ? s.data() : {};
        st.lastRun = d.lastRun || null; st.tokenCount = (d.tokens || []).length;
        if (UI.view === 'settings' && $('#modal').hidden) render();
      }));
      st.push = localStorage.getItem(pushFlagKey()) === '1';
      if (st.push && 'Notification' in window && Notification.permission === 'granted') registerPush(false);
    } catch (e) { st.state = 'error'; st.error = e.code || e.message; }
    render();
  }
  function onSignedOut() {
    unsubs.forEach(f => f()); unsubs = [];
    user = null; st.email = ''; st.push = false; st.lastRun = null;
    st.state = 'signedOut'; LOCKED = true; S = defaultState(); STORE_KEY = LOCAL_KEY;
    closeSheet(); render();
  }
  async function push() {
    if (!user || !fb || LOCKED) return;
    const { doc, setDoc } = fb.F;
    try {
      await setDoc(doc(fb.db, 'users', user.uid, 'state', 'main'), { json: JSON.stringify(S), updatedAt: S.updatedAt, client: CLIENT });
      await pushEvents(false);
    } catch (e) { console.warn('sync', e); toast('Couldn\'t sync (' + (e.code || e.message) + '). Your changes are saved on this device.'); }
  }
  // the reminder list the GitHub Action reads every 15 minutes
  async function pushEvents(force) {
    if (!user || !fb || LOCKED) return;
    const events = buildEvents(), sig = JSON.stringify(events);
    if (!force && sig === lastEvents) return;
    lastEvents = sig;
    const { doc, setDoc } = fb.F;
    await setDoc(doc(fb.db, 'push', user.uid), { events, tz: tz(), email: user.email || '', updatedAt: Date.now() }, { merge: true });
  }
  async function signIn() {
    if (!fb) { toast('Still connecting… try again in a moment'); return; }
    const p = new fb.A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await fb.A.signInWithPopup(fb.auth, p); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) fb.A.signInWithRedirect(fb.auth, p);
      else if (e.code === 'auth/unauthorized-domain') toast('Add this website to Firebase → Authentication → Settings → Authorized domains');
      else if (e.code !== 'auth/popup-closed-by-user') toast('Sign-in failed: ' + (e.code || e.message));
    }
  }
  async function signOut() {
    if (!fb || !user) return;
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
    if (!fb) { toast('Still connecting…'); return; }
    email = email.trim();
    try {
      if (mode === 'reset') { if (!email) { toast('Type your email first'); return; } await fb.A.sendPasswordResetEmail(fb.auth, email); toast('Password reset email sent'); return; }
      if (mode === 'create') await fb.A.createUserWithEmailAndPassword(fb.auth, email, pass);
      else await fb.A.signInWithEmailAndPassword(fb.auth, email, pass);
    } catch (e) { toast(AUTH_MSG[e.code] || ('Sign-in failed: ' + (e.code || e.message))); }
  }
  async function deleteAccount() {
    if (!fb || !user) return;
    const { doc, deleteDoc } = fb.F, u = user;
    try {
      for (const id of ['main', 'old']) { try { await deleteDoc(doc(fb.db, 'users', u.uid, 'state', id)); } catch { } }
      await deleteDoc(doc(fb.db, 'push', u.uid));
      Object.keys(localStorage).filter(k => k.includes(u.uid)).forEach(k => localStorage.removeItem(k));
      await fb.A.deleteUser(u);
      toast('Your account and data were deleted');
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') { toast('For safety, sign in again and then delete.'); await fb.A.signOut(fb.auth); }
      else toast('Could not delete: ' + (e.code || e.message));
    }
  }
  async function enableNotifications() {
    if (!('Notification' in window)) { toast('Notifications aren\'t available here. On iPhone, add Sankalpa to your home screen first.'); return; }
    if (window.top !== window.self || !('serviceWorker' in navigator)) { toast('Notifications only work in the installed app'); return; }
    if (Notification.permission === 'denied') { notifHelp(); return; }
    const p = await Notification.requestPermission();
    if (p !== 'granted') { notifHelp(); render(); return; }
    if (!user) { toast('Allowed. Reminders will show while Sankalpa is open.'); render(); return; }
    await registerPush(true);
  }
  async function registerPush(loud) {
    try {
      if (!cfg.vapid) throw new Error('The Web Push key (VAPID) is missing from config.js');
      const m = await import(SDK + 'firebase-messaging.js');
      if (!(await m.isSupported())) throw new Error('Push isn\'t supported in this browser');
      const reg = await navigator.serviceWorker.ready;
      const token = await m.getToken(m.getMessaging(fb.app), { vapidKey: cfg.vapid, serviceWorkerRegistration: reg });
      const { doc, setDoc, arrayUnion } = fb.F;
      await setDoc(doc(fb.db, 'push', user.uid), { tokens: arrayUnion(token), events: buildEvents(), tz: tz(), updatedAt: Date.now() }, { merge: true });
      localStorage.setItem('bloom_token_' + user.uid, token);
      st.push = true; localStorage.setItem(pushFlagKey(), '1');
      if (loud) { toast('Reminders are on for this device'); render(); }
    } catch (e) {
      console.warn(e);
      if (loud) { if (/permission-(blocked|default)|NotAllowed|denied/i.test((e.code || '') + ' ' + (e.message || ''))) notifHelp(); else toast(e.message); }
    }
  }
  setInterval(() => pushEvents(false).catch(() => { }), 30 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pushEvents(false).catch(() => { }); });
  return { init, push, status: () => st, signIn, signOut, emailAuth, deleteAccount, enableNotifications };
})();

function vGate() {
  const st = Cloud.status();
  const body = st.state === 'error'
    ? `<p class="gate-err">Couldn't connect: ${esc(st.error)}</p><button class="btn primary" onclick="location.reload()">Try again</button>`
    : st.state === 'signedOut'
      ? `<p>Your days, your diary, your cycle and your money — private to you, on every device.</p>
         <button class="btn google" data-a="signIn"><span class="g">G</span> Continue with Google</button>
         <div class="or"><span>or use email</span></div>
         <form class="gate-form" onsubmit="return false">
           <input id="gEmail" type="email" autocomplete="email" placeholder="Email address">
           <input id="gPass" type="password" autocomplete="current-password" placeholder="Password (6+ characters)">
           <div class="row wrap center"><button class="btn primary" data-a="emailAuth" data-v="signin">Sign in</button><button class="btn" data-a="emailAuth" data-v="create">Create account</button></div>
           <button class="link small" data-a="emailAuth" data-v="reset">Forgot password?</button>
         </form>`
      : `<p class="muted">${st.state === 'syncing' ? 'Opening your diary…' : 'Connecting…'}</p><div class="spinner"></div>`;
  return `<section class="gate"><div class="gate-card"><div class="gate-mark">${gateArt()}</div><h1>Sankalpa</h1>${body}</div></section>`;
}
function gateArt() {
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="none" stroke="var(--margin)" stroke-width="1.5" stroke-dasharray="2 5"/>
    ${Array.from({ length: 8 }, (_, i) => `<ellipse cx="60" cy="34" rx="9" ry="24" fill="var(--c${i % 4})" opacity=".85" transform="rotate(${i * 45} 60 60)"/>`).join('')}<circle cx="60" cy="60" r="10" fill="var(--haldi)"/></svg>`;
}
function notifHelp() {
  const android = /Android/i.test(navigator.userAgent), site = location.host;
  const steps = android ? [
    'Phone <b>Settings → Apps → Sankalpa → Notifications</b> → turn <b>On</b> (and every category inside).',
    'Phone <b>Settings → Apps → Chrome → Notifications</b> → turn <b>On</b>.',
    `Chrome → ⋮ → <b>Settings → Site settings → Notifications</b> → find <b>${esc(site)}</b> under <i>Blocked</i> → <b>Allow</b>.`,
    'Close Sankalpa from recent apps, open it again, and tap <b>Turn on for this device</b>.',
  ] : ['Click the icon left of the address bar → <b>Notifications</b> → <b>Allow</b>.', 'Reload and tap <b>Turn on for this device</b> again.'];
  openSheet(`${sheetHead('Notifications are blocked')}<p class="lead small">Your ${android ? 'phone' : 'browser'} has blocked notifications for Sankalpa, so the app can't ask again. Allow them here:</p>
    <ol class="steps">${steps.map(x => `<li>${x}</li>`).join('')}</ol><p class="small muted">Also set <b>Battery → Unrestricted</b> for Sankalpa and Chrome so reminders arrive on time.</p>
    <footer class="sh-foot"><span class="grow"></span><button class="btn primary" data-a="closeSheet">Done</button></footer>`, { focus: false });
}

// while the app is open (or when push isn't set up), show due reminders locally
function localTick() {
  if (LOCKED || !('Notification' in window) || Notification.permission !== 'granted' || Cloud.status().push) return;
  let shown = {}; try { shown = JSON.parse(localStorage.getItem('sk_shown') || '{}'); } catch { }
  const now = Date.now();
  for (const e of buildEvents()) if (e.at <= now && e.at > now - 10 * 60000 && !shown[e.id]) {
    shown[e.id] = now;
    navigator.serviceWorker?.getRegistration().then(reg => reg ? reg.showNotification(e.title, { body: e.body, icon: 'icon-192.png', badge: 'icon-192.png', tag: e.id }) : new Notification(e.title, { body: e.body }));
  }
  for (const [k, t] of Object.entries(shown)) if (t < now - 2 * 864e5) delete shown[k];
  localStorage.setItem('sk_shown', JSON.stringify(shown));
}
/* Part 8: navigation, actions, render loop, start-up */

const NAV = [['today', 'Today', 'today'], ['diary', 'Diary', 'diary'], ['planner', 'Planner', 'planner'], ['body', 'Body', 'body'], ['money', 'Money', 'money']];
function renderNav() {
  const v = UI.view;
  $('#tabbar').innerHTML = NAV.map(([id, l, ic]) => `<a href="#${id}" class="${v === id ? 'on' : ''}" aria-current="${v === id ? 'page' : 'false'}">${icon(ic)}<small>${l}</small></a>`).join('');
  $('#rail').innerHTML = `<div class="brand">${gateArt()}<b>Sankalpa</b></div>${NAV.map(([id, l, ic]) => `<a href="#${id}" class="${v === id ? 'on' : ''}">${icon(ic)}<span>${l}</span></a>`).join('')}
    <span class="grow"></span><a href="#settings" class="${v === 'settings' ? 'on' : ''}">${icon('gear')}<span>Settings</span></a>`;
}
function render() {
  const main = $('#main');
  document.body.classList.toggle('locked', LOCKED);
  if (LOCKED) { main.innerHTML = vGate(); $('#tabbar').innerHTML = ''; $('#rail').innerHTML = ''; return; }
  renderNav();
  const y = scrollY;
  const views = { today: vToday, diary: vDiary, planner: vPlanner, body: vBody, money: vMoney, settings: vSettings };
  main.innerHTML = (views[UI.view] || vToday)();
  main.dataset.view = UI.view;
  if (UI.view === 'today') {
    bindTimeline();
    const key = UI.date;
    if (UI.scrolledFor !== key) { UI.scrolledFor = key; requestAnimationFrame(() => { if (key === dkey()) scrollToNow(); else { const c = $('#tl .tl-canvas'); if (c) { const [a] = tlRange(key); window.scrollTo(0, Math.max(0, c.getBoundingClientRect().top + scrollY + (Math.max(a, 8 * 60) - a) * ppm() - 140)); } } }); }
    else window.scrollTo(0, y);
  } else if (render.lastView === UI.view) window.scrollTo(0, y);
  else window.scrollTo(0, 0);
  render.lastView = UI.view;
  $$('textarea.journal', main).forEach(autoGrow);
}
function go(view) { if (location.hash !== '#' + view) location.hash = view; else { UI.view = view; render(); } }
window.addEventListener('hashchange', () => { const v = location.hash.slice(1) || 'today'; UI.view = [...NAV.map(n => n[0]), 'settings'].includes(v) ? v : 'today'; closeSheet(); render(); });

function setDate(k) { UI.date = k; render(); }
function pickDate() {
  openSheet(`${sheetHead('Go to a date')}<div class="form"><div class="field"><input type="date" id="gotoD" value="${UI.date}"></div></div>
    <footer class="sh-foot"><button class="btn" data-a="goToday">Today</button><span class="grow"></span><button class="btn primary" id="gotoB">Go</button></footer>`, { cls: 'small' });
  $('#gotoB').onclick = () => { const v = $('#gotoD').value; if (v) { closeSheet(); setDate(v); } };
}

const A = {
  closeSheet, scrimClose: () => { if (Date.now() - (openSheet.at || 0) > 450) closeSheet(); }, go: d => go(d.v), pickDate, goToday: () => { closeSheet(); setDate(dkey()); },
  dayShift: d => setDate(addK(UI.date, +d.v)),
  openDate: d => { closeSheet(); UI.date = d.v; UI.scrolledFor = null; go(d.to || UI.view); },
  openDay: d => openDay(d.v || UI.date),
  // today
  newBlock: () => { const now = new Date(), m = UI.date === dkey() ? Math.ceil((now.getHours() * 60 + now.getMinutes()) / S.settings.step) * S.settings.step : 9 * 60; openBlock({ start: toHHMM(Math.min(m, 1440 - S.settings.defLen)), dur: S.settings.defLen }); },
  toggleBlock: d => { const b = blockById(d.id), k = UI.date; b.done = b.done || {}; if (b.done[k]) delete b.done[k]; else { b.done[k] = 1; navigator.vibrate?.(8); } save(); },
  zoom: d => { const y = innerHeight / 2; zoomAround(S.settings.zoom * (+d.v > 0 ? 1.35 : 1 / 1.35), y); },
  pickStep: async () => { const v = await chooseBox('Grid interval', [5, 10, 15, 20, 30, 60].map(m => ({ label: m < 60 ? `${m} minutes` : '1 hour', hint: m === S.settings.step ? 'Current' : '', value: m }))); if (v) { S.settings.step = v; const z = { 5: 480, 10: 300, 15: 200, 20: 160, 30: 110, 60: 64 }[v]; if (S.settings.zoom < z * 0.6 || S.settings.zoom > z * 1.8) S.settings.zoom = z; save(); } },
  scrollNow: () => scrollToNow(true), dayMenu, settingsTimeline,
  // diary
  chore: d => { const k = UI.date; const L = S.choreLog[k] = S.choreLog[k] || {}; if (L[d.id]) delete L[d.id]; else L[d.id] = 1; if (!Object.keys(L).length) delete S.choreLog[k]; save(); },
  manageChores, newChore: () => choreForm(null), editChore: d => choreForm(S.chores.find(c => c.id === d.id)), pastPages,
  // body
  setCI: d => {
    const c = ci(UI.date), f = d.f; let v = d.v;
    if (f === 'flow') { c.flow = v; } else { v = +v; c[f] = (+c[f] === v && f !== 'water') ? '' : (f === 'water' && +c.water === v ? v - 1 : v); }
    pruneCI(UI.date); save();
  },
  stepCI: d => { const c = ci(UI.date), f = d.f; const base = c[f] === '' || c[f] == null ? (f === 'sleep' ? 7 : 0) : +c[f]; c[f] = clamp(base + +d.v, 0, f === 'sleep' ? 16 : 30); save(); },
  toggleSym: d => { const c = ci(UI.date); c.sym = c.sym || []; c.sym = c.sym.includes(d.v) ? c.sym.filter(x => x !== d.v) : [...c.sym, d.v]; pruneCI(UI.date); save(); },
  editSymptoms,
  periodStart: () => { const k = UI.date; S.periods = S.periods.filter(p => !(k >= p.start && k <= (p.end || addK(p.start, S.settings.periodLen - 1)))); S.periods.forEach(p => { if (!p.end && p.start < k) p.end = addK(p.start, Math.min(diffDays(p.start, k) - 1, S.settings.periodLen - 1)); }); S.periods.push({ start: k, end: null }); const c = ci(k); if (!c.flow) c.flow = 'med'; save(); toast('Period logged. Take it easy 🌸'); },
  periodEnd: () => { const k = UI.date, p = S.periods.find(x => x.start <= k && !x.end); if (p) { p.end = k; save(); toast(`Logged ${diffDays(p.start, k) + 1} days`); } },
  editPeriod: d => editPeriod(d.v),
  // planner
  planMode: d => { UI.plan = d.v; render(); },
  planShift: d => { const r = parseK(UI.planRef), n = +d.v; UI.planRef = UI.plan === 'week' ? addK(UI.planRef, 7 * n) : UI.plan === 'month' ? dkey(new Date(r.getFullYear(), r.getMonth() + n, 1)) : dkey(new Date(r.getFullYear() + n, 0, 1)); render(); },
  planNow: () => { UI.planRef = dkey(); render(); },
  openMonth: d => { UI.plan = 'month'; UI.planRef = d.v; render(); },
  newPlan: () => planForm(null, UI.plan === 'month' && UI.planRef.slice(0, 7) !== dkey().slice(0, 7) ? UI.planRef.slice(0, 7) + '-01' : dkey()),
  editPlan: d => planForm(S.plans.find(p => p.id === d.id)),
  planTick: d => { const p = S.plans.find(x => x.id === d.id); p.done = !p.done; save(); if (SHEET?.k) openDay(SHEET.k); },
  quickPlan: d => { const t = $('#qpTitle').value.trim(), tm = $('#qpTime').value; if (!t) { $('#qpTitle').focus(); return; } S.plans.push({ id: uid(), title: t, date: d.v, time: tm, remind: !!tm, color: 'peach', note: '', done: false }); save(); openDay(d.v); },
  noteAdd: () => { const el = $('#noteAdd'), t = el.value.trim(); if (!t) return; const k = noteKey(); S.notes[k] = S.notes[k] || {}; (S.notes[k].items = S.notes[k].items || []).push({ id: uid(), t, done: false }); save(); setTimeout(() => $('#noteAdd')?.focus(), 30); },
  noteTick: d => { const it = (S.notes[noteKey()]?.items || []).find(i => i.id === d.id); if (it) { it.done = !it.done; save(); } },
  noteDel: d => { const n = S.notes[noteKey()]; n.items = n.items.filter(i => i.id !== d.id); save(); },
  obsManager, newObs: () => obsForm(null), editObs: d => obsForm(S.obs.find(o => o.id === d.id)),
  obsKept: d => { const L = S.obsKept[d.v] = S.obsKept[d.v] || {}; if (L[d.id]) delete L[d.id]; else L[d.id] = 1; save(); openDay(d.v); },
  obsSkip: d => { (S.obsSkip[d.id] = S.obsSkip[d.id] || {})[d.v] = 1; if (S.obsAdd[d.id]) delete S.obsAdd[d.id][d.v]; obsCache.clear(); save(); openDay(d.v); toast('Removed from this date', { label: 'Undo', run: () => { delete S.obsSkip[d.id][d.v]; obsCache.clear(); save(); } }); },
  addObsOn: async d => {
    const k = d.v, here = obsOn(k).map(o => o.id);
    const c = await chooseBox(`Vrat on ${fmtDate(k, { day: true })}`, [...S.obs.filter(o => !here.includes(o.id)).map(o => ({ label: o.name, hint: o.kind === 'moon' ? 'Move it to this date' : 'Add this date', value: o.id })), { label: 'Something new…', value: '_new' }]);
    if (!c) return; if (c === '_new') { obsForm(null, k); return; }
    const o = S.obs.find(x => x.id === c); o.on = true;
    if (o.kind === 'dates') o.dates = [...new Set([...(o.dates || []), k])]; else { (S.obsAdd[o.id] = S.obsAdd[o.id] || {})[k] = 1; if (S.obsSkip[o.id]) delete S.obsSkip[o.id][k]; }
    obsCache.clear(); save(); openDay(k);
  },
  // money
  moneyShift: d => { const [y, m] = UI.moneyMonth.split('-').map(Number); const x = new Date(y, m - 1 + +d.v, 1); UI.moneyMonth = dkey(x).slice(0, 7); render(); },
  newTx: d => txForm(d.v), editTx: d => { const t = S.money.tx.find(x => x.id === d.id); txForm(t.type, t); }, moneyCats, setBudget: d => setBudget(d.v),
  // settings
  notifyTypes, diaryRem, generalSet, bodySet, moneySet, notifHelp,
  enableNotif: () => Cloud.enableNotifications(),
  testNotif: async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') { toast('Turn notifications on first'); return; }
    const reg = await navigator.serviceWorker?.getRegistration();
    const t = '🪷 Sankalpa', b = 'Notifications work on this device.';
    if (reg) reg.showNotification(t, { body: b, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'test' }); else new Notification(t, { body: b });
  },
  signIn: () => Cloud.signIn(), signOut: async () => { if (await confirmBox('Sign out of Sankalpa on this device?', 'Sign out')) Cloud.signOut(); },
  emailAuth: d => Cloud.emailAuth(d.v, $('#gEmail')?.value || '', $('#gPass')?.value || ''),
  deleteAccount: async () => { if (await confirmBox('This permanently deletes your account and every page, plan and entry in it.', 'Delete everything')) Cloud.deleteAccount(); },
  exportData: () => download(`sankalpa-backup-${dkey()}.json`, JSON.stringify(S, null, 1)),
  exportOld: () => { const k = Object.keys(localStorage).find(x => x.startsWith('sankalpa_old_')); if (k) download('sankalpa-old-version-data.json', localStorage.getItem(k)); },
  importData: () => $('#jsonIn').click(),
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]'); if (!t || t.tagName === 'INPUT') return;
  const fn = A[t.dataset.a]; if (!fn) return;
  e.preventDefault(); fn({ ...t.dataset });
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.a === 'obsToggle') { const o = S.obs.find(x => x.id === t.dataset.id); o.on = t.checked; save({ quiet: true }); render(); }
  if (t.id === 'jsonIn' && t.files[0]) {
    const r = new FileReader();
    r.onload = async () => {
      try { const raw = JSON.parse(r.result); if (!(await confirmBox('Replace everything in Sankalpa with this backup?', 'Restore'))) return; S = upgrade(raw); S.updatedAt = Date.now(); save(); toast('Backup restored'); }
      catch { toast('That file isn\'t a Sankalpa backup'); }
      t.value = '';
    };
    r.readAsText(t.files[0]);
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'zoomR') { zoomAround(+t.value, innerHeight / 2); return; }
  if (t.dataset.bind) { bindInput(t); if (t.tagName === 'TEXTAREA') autoGrow(t); return; }
  if (t.dataset.note) { const k = t.dataset.note; S.notes[k] = S.notes[k] || {}; S.notes[k].text = t.value; autoGrow(t); clearTimeout(bindInput.t); bindInput.t = setTimeout(() => save({ quiet: true }), 600); }
});
document.addEventListener('keydown', e => {
  const t = e.target;
  if (e.key === 'Escape' && !$('#modal').hidden) { closeSheet(); return; }
  if (e.key === 'Enter' && t.id === 'noteAdd') { e.preventDefault(); A.noteAdd(); return; }
  if (e.key === 'Enter' && t.id === 'qpTitle') { e.preventDefault(); $('[data-a="quickPlan"]')?.click(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && t.classList?.contains('blk') && t.dataset.id) { e.preventDefault(); openBlock({ id: t.dataset.id }); return; }
  if ((e.key === 'Enter' || e.key === ' ') && t.matches?.('[role="button"][data-a]') && t.tagName !== 'BUTTON') { e.preventDefault(); t.click(); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || !$('#modal').hidden || LOCKED) return;
  if (['today', 'diary', 'body'].includes(UI.view)) {
    if (e.key === 'ArrowLeft') A.dayShift({ v: -1 }); else if (e.key === 'ArrowRight') A.dayShift({ v: 1 });
    else if (e.key === 'n' && UI.view === 'today') A.newBlock();
  }
});
// swipe the date header left or right to change day
(() => {
  let sx = 0, sy = 0, ok = false;
  document.addEventListener('touchstart', e => { ok = !!e.target.closest('.dayhead'); if (ok) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!ok) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) A.dayShift({ v: dx < 0 ? 1 : -1 });
  }, { passive: true });
})();

// keep the now-line moving and roll over at midnight
let lastDay = dkey();
setInterval(() => {
  if (LOCKED) return;
  const today = dkey();
  if (today !== lastDay) { if (UI.date === lastDay) UI.date = today; lastDay = today; if ($('#modal').hidden) render(); }
  else if (UI.view === 'today' && UI.date === today && !Drag.d && $('#modal').hidden) {
    const n = $('#tl .tl-now'), [a, z] = tlRange(today), m = new Date().getHours() * 60 + new Date().getMinutes();
    if (n && m <= z) { n.style.top = (m - a) * ppm() + 'px'; n.querySelector('span').textContent = fmtTime(toHHMM(m)); $('#tl .tl-canvas').style.setProperty('--past', (m - a) * ppm() + 'px'); }
  }
  localTick();
}, 30000);

// start
(function start() {
  const v = location.hash.slice(1); UI.view = [...NAV.map(n => n[0]), 'settings'].includes(v) ? v : 'today';
  render();
  Cloud.init();
  if ('serviceWorker' in navigator && window.top === window.self) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
