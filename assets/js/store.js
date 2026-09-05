/**
 * Magasin d'état, adossé à Supabase.
 * L'état en mémoire est un miroir de la base : toute écriture part au serveur,
 * puis l'état local est mis à jour et les vues notifiées.
 *
 * Rien n'est inventé ici. Les sélecteurs ne lisent que des lignes réelles ;
 * une journée sans repas est une journée sans repas, pas une moyenne.
 */
import { DEFAULT_GOALS, PROFILE } from './config.js';
import { todayISO, addDays, dayIndex, weekOf } from './date.js';
import { baseBurn, activity, sessionBurn } from './energy.js';
import * as db from './data.js';

let state = {
  user: null,
  ready: false,
  syncing: false,
  error: '',
  goals: { ...DEFAULT_GOALS },
  meals: [],
  sessions: [],
  weights: [],
  supplements: {},
  recent: []
};

const listeners = new Set();

export const getState = () => state;
export const today = todayISO;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() { listeners.forEach(fn => fn(state)); }

function patch(partial) {
  state = { ...state, ...partial };
  emit();
}

/* ── produits scannés récemment ──────────────── */

/**
 * Les derniers produits scannés sont un confort d'usage, pas une donnée de
 * santé : ils restent sur l'appareil plutôt que d'occuper une table.
 */
const RECENT_KEY = 'mediterraneo:recent';

function readRecent() {
  try { return JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

export function rememberProduct(product) {
  const recent = [product, ...readRecent().filter(p => p.code !== product.code)].slice(0, 12);
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch { /* mode privé */ }
  patch({ recent });
}

/* ── chargement ──────────────────────────────── */

export async function loadAll() {
  if (!state.user) return;
  patch({ syncing: true });
  const uid = state.user.id;
  try {
    const [goals, meals, sessions, weights, supplements] = await Promise.all([
      db.fetchGoals(uid), db.fetchMeals(uid), db.fetchSessions(uid),
      db.fetchWeights(uid), db.fetchSupplements(uid)
    ]);
    patch({ goals, meals, sessions, weights, supplements, recent: readRecent(), ready: true, syncing: false, error: '' });
  } catch (e) {
    console.error('Chargement impossible', e);
    patch({ syncing: false, ready: true, error: 'Synchronisation impossible — tes données arrivent dès le retour du réseau.' });
  }
}

export function setUser(user) {
  patch({ user, ready: !user });
  if (user) loadAll();
  else patch({ goals: { ...DEFAULT_GOALS }, meals: [], sessions: [], weights: [], supplements: {}, recent: [] });
}

/* ── écritures ───────────────────────────────── */

export async function addMeal(meal) {
  const saved = await db.insertMeal(state.user.id, meal);
  patch({ meals: [...state.meals, saved] });
  return saved;
}

export async function removeMeal(id) {
  await db.deleteMeal(id);
  patch({ meals: state.meals.filter(m => m.id !== id) });
}

export async function addSession(session) {
  const saved = await db.insertSession(state.user.id, session);
  patch({ sessions: [...state.sessions, saved] });
  return saved;
}

export async function removeSession(id) {
  await db.deleteSession(id);
  patch({ sessions: state.sessions.filter(s => s.id !== id) });
}

export async function setWeightFor(date, kg) {
  await db.setWeight(state.user.id, date, kg);
  patch({ weights: [...state.weights.filter(w => w.date !== date), { date, kg }] });
}

export async function toggleSupplement(date, key) {
  const current = state.supplements[date]?.[key] ?? false;
  await db.setSupplement(state.user.id, date, key, !current);
  patch({ supplements: { ...state.supplements, [date]: { ...state.supplements[date], [key]: !current } } });
}

export async function updateGoals(goals) {
  await db.saveGoals(state.user.id, goals);
  patch({ goals });
}

/* ── sélecteurs ──────────────────────────────── */

export const mealsOn = date =>
  state.meals.filter(m => m.date === date).sort((a, b) => String(a.time).localeCompare(String(b.time)));

export const sessionsOn = date =>
  state.sessions.filter(s => s.date === date).sort((a, b) => String(a.time).localeCompare(String(b.time)));

export const supplementsOn = date => state.supplements[date] || {};

const KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'caffeine'];

export function totalsOn(date) {
  const out = Object.fromEntries(KEYS.map(k => [k, 0]));
  for (const m of mealsOn(date)) for (const k of KEYS) out[k] += Number(m[k]) || 0;
  for (const k of KEYS) out[k] = Math.round(out[k] * 10) / 10;
  out.kcal = Math.round(out.kcal);
  return out;
}

/** Poids connu le plus récent à cette date, sinon la pesée la plus proche. */
export function weightAt(date) {
  const sorted = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const past = sorted.filter(w => w.date <= date);
  if (past.length) return past.at(-1).kg;
  return sorted.length ? sorted[0].kg : PROFILE.startWeight;
}

/** Bilan énergétique d'une journée : ce qui entre, ce qui sort, ce qui reste. */
export function energyOn(date) {
  const kg = weightAt(date);
  const intake = totalsOn(date).kcal;
  const base = baseBurn(kg);
  const day = sessionsOn(date);
  const sport = day.reduce((t, s) => t + (Number(s.kcal) || 0), 0);
  const minutes = day.reduce((t, s) => t + (Number(s.minutes) || 0), 0);
  return { intake, base, sport, minutes, out: base + sport, balance: intake - base - sport };
}

/** Une journée n'est « enregistrée » que si un repas y figure. */
export const isLogged = date => state.meals.some(m => m.date === date);

/** Jours d'affilée avec au moins un repas, en tolérant la journée en cours. */
export function streak() {
  let cursor = todayISO();
  if (!isLogged(cursor)) cursor = addDays(cursor, -1);
  let n = 0;
  while (isLogged(cursor) && n < 400) { n++; cursor = addDays(cursor, -1); }
  return n;
}

/**
 * Objectifs du jour — la partie ludique.
 * Chacun vaut des points ; les remplir tous fait la journée parfaite.
 */
export function quests(date = todayISO()) {
  const { goals } = state;
  const t = totalsOn(date);
  const supp = Object.values(supplementsOn(date)).filter(Boolean).length;
  const energy = energyOn(date);
  const list = [
    { key: 'meal',    emoji: '🍽️', label: 'Enregistrer un repas', done: mealsOn(date).length > 0, xp: 10 },
    { key: 'protein', emoji: '💪', label: `${goals.protein} g de protéines`, done: t.protein >= goals.protein, xp: 30,
      value: t.protein, goal: goals.protein },
    { key: 'fiber',   emoji: '🥦', label: `${goals.fiber} g de fibres`, done: t.fiber >= goals.fiber, xp: 20,
      value: t.fiber, goal: goals.fiber },
    { key: 'sport',   emoji: '🔥', label: 'Bouger aujourd’hui', done: energy.sport > 0, xp: 25 },
    { key: 'supp',    emoji: '💊', label: 'Compléments du matin', done: supp >= 5, xp: 10, value: supp, goal: 5 },
    { key: 'deficit', emoji: '🎯', label: 'Rester en déficit', done: t.kcal > 0 && energy.balance < 0, xp: 30 }
  ];
  const xp = list.filter(q => q.done).reduce((total, q) => total + q.xp, 0);
  const maxXp = list.reduce((total, q) => total + q.xp, 0);
  return { list, xp, maxXp, done: list.filter(q => q.done).length, total: list.length };
}

/** XP cumulés sur la semaine d'une date. */
export const weekXp = date => weekOf(date).reduce((t, d) => t + quests(d).xp, 0);

/** Séance déduite d'un plan hebdomadaire, prête à être enregistrée. */
export function plannedSession(date, planned) {
  const act = activity(planned.kind);
  const minutes = planned.minutes ?? act.minutes;
  return {
    date,
    time: planned.time || '18:00',
    kind: planned.kind,
    label: planned.label || act.label,
    minutes,
    kcal: sessionBurn(act.met, minutes, weightAt(date))
  };
}

/** Pesées, du plus ancien au plus récent, une seule par date. */
export function weightSeries() {
  const map = new Map();
  for (const w of state.weights) map.set(w.date, w.kg);
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, kg]) => ({ date, kg }));
}

export function movingAverage(values, window = 7) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((t, v) => t + v, 0) / slice.length;
  });
}

/**
 * Série journalière des jours réellement enregistrés sur la période.
 * Un jour sans repas n'apparaît pas dans les courbes.
 */
export function dailySeries(days) {
  const end = todayISO();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    if (!isLogged(date)) continue;
    const t = totalsOn(date);
    out.push({ date, kcal: t.kcal, protein: t.protein, fiber: t.fiber, dow: dayIndex(date) });
  }
  return out;
}

/** Nombre de jours enregistrés sur les `days` derniers jours. */
export function loggedDays(days) {
  const end = todayISO();
  let n = 0;
  for (let i = 0; i < days; i++) if (isLogged(addDays(end, -i))) n++;
  return n;
}
