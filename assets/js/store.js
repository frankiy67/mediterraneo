/**
 * Magasin d'état, adossé à Supabase.
 * L'état en mémoire est un miroir de la base : toute écriture part au serveur,
 * puis l'état local est mis à jour et les vues notifiées.
 */
import { DEFAULT_GOALS, PROFILE } from './config.js';
import * as db from './data.js';

/** Historique de référence, pour que les courbes soient lisibles dès le premier jour. */
function buildBaseline() {
  const out = [];
  const end = new Date(PROFILE.startDate);
  end.setDate(end.getDate() - 1);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    out.push({
      date: d.toISOString().slice(0, 10),
      dow,
      kcal: Math.round(2380 + (weekend ? 430 : 0) + Math.sin(i * 1.7) * 210 + (i % 5 === 0 ? -260 : 0)),
      protein: Math.round(138 + Math.cos(i * 1.1) * 22 + (weekend ? -16 : 0)),
      fiber: Math.round(21 + Math.sin(i * 0.9) * 7 + (weekend ? -5 : 0)),
      kg: +(90.4 - (29 - i) * 0.048 + Math.sin(i * 2.1) * 0.32).toFixed(1),
      logged: i !== 11 && i !== 23
    });
  }
  return out;
}

export const BASELINE = buildBaseline();

let state = {
  user: null,
  ready: false,
  syncing: false,
  goals: { ...DEFAULT_GOALS },
  meals: [],
  water: [],
  weights: [],
  supplements: {}
};

const listeners = new Set();

export const getState = () => state;
export const today = () => new Date().toISOString().slice(0, 10);

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() { listeners.forEach(fn => fn(state)); }

function patch(partial) {
  state = { ...state, ...partial };
  emit();
}

/* ── chargement ──────────────────────────────── */

export async function loadAll() {
  if (!state.user) return;
  patch({ syncing: true });
  const uid = state.user.id;
  try {
    const [goals, meals, water, weights, supplements] = await Promise.all([
      db.fetchGoals(uid), db.fetchMeals(uid), db.fetchWater(uid),
      db.fetchWeights(uid), db.fetchSupplements(uid)
    ]);
    patch({ goals, meals, water, weights, supplements, ready: true, syncing: false });
  } catch (e) {
    console.error('Chargement impossible', e);
    patch({ syncing: false, ready: true });
  }
}

export function setUser(user) {
  patch({ user, ready: !user });
  if (user) loadAll();
  else patch({ goals: { ...DEFAULT_GOALS }, meals: [], water: [], weights: [], supplements: {} });
}

/* ── écritures ───────────────────────────────── */

export async function addMeal(meal) {
  const saved = await db.insertMeal(state.user.id, meal);
  patch({ meals: [...state.meals, saved] });
}

export async function removeMeal(id) {
  await db.deleteMeal(id);
  patch({ meals: state.meals.filter(m => m.id !== id) });
}

export async function setWaterFor(date, ml) {
  await db.setWater(state.user.id, date, ml);
  patch({ water: [...state.water.filter(w => w.date !== date), { date, ml }] });
}

export async function setWeightFor(date, kg) {
  await db.setWeight(state.user.id, date, kg);
  patch({ weights: [...state.weights.filter(w => w.date !== date), { date, kg }] });
}

export async function toggleSupplement(date, key) {
  const current = state.supplements[date]?.[key] ?? false;
  await db.setSupplement(state.user.id, date, key, !current);
  const supplements = { ...state.supplements, [date]: { ...state.supplements[date], [key]: !current } };
  patch({ supplements });
}

export async function updateGoals(goals) {
  await db.saveGoals(state.user.id, goals);
  patch({ goals });
}

/* ── sélecteurs ──────────────────────────────── */

export const mealsOn = date => state.meals.filter(m => m.date === date);

export const waterOn = date =>
  state.water.filter(w => w.date === date).reduce((t, w) => t + w.ml, 0);

export function totalsOn(date) {
  const keys = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'caffeine'];
  const out = Object.fromEntries(keys.map(k => [k, 0]));
  for (const m of mealsOn(date)) for (const k of keys) out[k] += Number(m[k]) || 0;
  return out;
}

/** Pesées de référence complétées par les vraies, sans doublon de date. */
export function weightSeries() {
  const map = new Map();
  for (const b of BASELINE) map.set(b.date, b.kg);
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
