/**
 * Couche de données Supabase.
 * Authentification, lecture et écriture. Toutes les requêtes sont filtrées
 * côté base par le Row Level Security : chaque compte ne voit que ses lignes.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DEFAULT_GOALS } from './config.js';

const SUPABASE_URL = 'https://dwxduynqotbevyzmzddn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3eGR1eW5xb3RiZXZ5em16ZGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTEyNzMsImV4cCI6MjEwNDE4NzI3M30.CEQ31TLsKeKLfhVmCSkDvNHl0rh2VaJq_iZkDvi_cT0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── authentification ────────────────────────── */

export async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password });

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signInWithGitHub = () =>
  supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });

export const signOut = () => supabase.auth.signOut();

export const onAuthChange = fn =>
  supabase.auth.onAuthStateChange((_event, session) => fn(session?.user ?? null));

/* ── objectifs ───────────────────────────────── */

export async function fetchGoals(userId) {
  const { data, error } = await supabase
    .from('goals').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) {
    await supabase.from('goals').insert({ user_id: userId });
    return { ...DEFAULT_GOALS };
  }
  return {
    kcal: data.kcal, protein: data.protein, carbs: data.carbs, fat: data.fat,
    fiber: data.fiber, sugar: data.sugar, water: data.water,
    targetWeight: Number(data.target_weight)
  };
}

export async function saveGoals(userId, g) {
  const { error } = await supabase.from('goals').upsert({
    user_id: userId,
    kcal: g.kcal, protein: g.protein, carbs: g.carbs, fat: g.fat,
    fiber: g.fiber, sugar: g.sugar, water: g.water,
    target_weight: g.targetWeight, updated_at: new Date().toISOString()
  });
  if (error) throw error;
}

/* ── repas ───────────────────────────────────── */

const toMeal = r => ({
  id: r.id, date: r.date, time: r.time, type: r.type, desc: r.description,
  kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat,
  fiber: r.fiber, sugar: r.sugar, caffeine: r.caffeine, isSupplement: r.is_supplement
});

export async function fetchMeals(userId, fromDate) {
  let q = supabase.from('meals').select('*').eq('user_id', userId).order('date', { ascending: true });
  if (fromDate) q = q.gte('date', fromDate);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(toMeal);
}

export async function insertMeal(userId, m) {
  const { data, error } = await supabase.from('meals').insert({
    user_id: userId, date: m.date, time: m.time, type: m.type,
    description: m.desc, kcal: m.kcal, protein: m.protein, carbs: m.carbs,
    fat: m.fat, fiber: m.fiber, sugar: m.sugar, caffeine: m.caffeine,
    is_supplement: !!m.isSupplement
  }).select().single();
  if (error) throw error;
  return toMeal(data);
}

export async function deleteMeal(id) {
  const { error } = await supabase.from('meals').delete().eq('id', id);
  if (error) throw error;
}

/* ── eau ─────────────────────────────────────── */

export async function fetchWater(userId, fromDate) {
  let q = supabase.from('water').select('*').eq('user_id', userId);
  if (fromDate) q = q.gte('date', fromDate);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(r => ({ date: r.date, ml: r.ml }));
}

export async function setWater(userId, date, ml) {
  const { error } = await supabase.from('water')
    .upsert({ user_id: userId, date, ml }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

/* ── poids ───────────────────────────────────── */

export async function fetchWeights(userId) {
  const { data, error } = await supabase
    .from('weights').select('*').eq('user_id', userId).order('date', { ascending: true });
  if (error) throw error;
  return data.map(r => ({ date: r.date, kg: Number(r.kg) }));
}

export async function setWeight(userId, date, kg) {
  const { error } = await supabase.from('weights')
    .upsert({ user_id: userId, date, kg }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

/* ── compléments ─────────────────────────────── */

export async function fetchSupplements(userId, fromDate) {
  let q = supabase.from('supplements').select('*').eq('user_id', userId);
  if (fromDate) q = q.gte('date', fromDate);
  const { data, error } = await q;
  if (error) throw error;
  const byDate = {};
  for (const r of data) {
    (byDate[r.date] ||= {})[r.key] = r.taken;
  }
  return byDate;
}

export async function setSupplement(userId, date, key, taken) {
  const { error } = await supabase.from('supplements')
    .upsert({ user_id: userId, date, key, taken }, { onConflict: 'user_id,date,key' });
  if (error) throw error;
}

/* ── synchronisation temps réel ──────────────── */

/**
 * Rappelle `fn` dès qu'une table change, y compris depuis un autre appareil.
 */
export function subscribeRealtime(userId, fn) {
  const channel = supabase.channel('mediterraneo-sync');
  for (const table of ['meals', 'water', 'weights', 'supplements', 'goals']) {
    channel.on('postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      fn);
  }
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
