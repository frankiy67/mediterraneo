/**
 * Magasin d'état.
 * Source unique de vérité, persistée localement, avec notification des vues.
 */
import { DEFAULT_GOALS, PROFILE, SEED_MEALS } from './config.js';

const KEY = 'mediterraneo:v1';

/** Historique de référence, pour que les courbes soient lisibles dès le premier jour. */
function buildBaseline() {
  const out = [];
  const end = new Date(PROFILE.startDate);
  end.setDate(end.getDate() - 1);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    out.push({
      date: iso,
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

function initialState() {
  return {
    goals: { ...DEFAULT_GOALS },
    meals: SEED_MEALS.map(m => ({ ...m })),
    water: [{ date: PROFILE.startDate, ml: 1000 }],
    weights: [{ date: PROFILE.startDate, kg: PROFILE.startWeight }],
    supplements: {
      [PROFILE.startDate]: { multi: true, vitc: true, colmag: true, artic: true, omega: true }
    }
  };
}

let state = initialState();
const listeners = new Set();

/* ── persistance ─────────────────────────────── */

function readStorage() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeStorage(value) {
  try { window.localStorage.setItem(KEY, JSON.stringify(value)); }
  catch { /* mode privé ou quota atteint : on reste en mémoire */ }
}

export function hydrate() {
  const saved = readStorage();
  if (saved && saved.goals && Array.isArray(saved.meals)) {
    state = { ...initialState(), ...saved };
  }
  return state;
}

/* ── lecture et écriture ─────────────────────── */

export const getState = () => state;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function commit(next) {
  state = next;
  writeStorage(state);
  listeners.forEach(fn => fn(state));
}

export function update(mutator) {
  const draft = structuredClone(state);
  mutator(draft);
  commit(draft);
}

export function reset() {
  commit(initialState());
}

/* ── sélecteurs ──────────────────────────────── */

export const today = () => PROFILE.startDate;

export const mealsOn = date => state.meals.filter(m => m.date === date);

export const waterOn = date =>
  state.water.filter(w => w.date === date).reduce((t, w) => t + w.ml, 0);

export function totalsOn(date) {
  const keys = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'caffeine'];
  const meals = mealsOn(date);
  const out = Object.fromEntries(keys.map(k => [k, 0]));
  for (const m of meals) for (const k of keys) out[k] += Number(m[k]) || 0;
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
