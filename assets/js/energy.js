/**
 * Énergie : dépense de base, dépense sportive, balance du jour.
 * Les formules sont des estimations grand public, pas des mesures.
 */
import { PROFILE } from './config.js';

/**
 * Activités et leur MET (coût énergétique relatif au repos).
 * Valeurs issues du Compendium of Physical Activities, arrondies.
 */
export const ACTIVITIES = [
  { kind: 'volley',   label: 'Volley',        emoji: '🏐', met: 4.5,  minutes: 90 },
  { kind: 'gym',      label: 'Musculation',   emoji: '🏋️', met: 5.0,  minutes: 60 },
  { kind: 'run',      label: 'Course',        emoji: '🏃', met: 9.8,  minutes: 40 },
  { kind: 'bike',     label: 'Vélo',          emoji: '🚴', met: 7.5,  minutes: 60 },
  { kind: 'swim',     label: 'Natation',      emoji: '🏊', met: 8.0,  minutes: 45 },
  { kind: 'padel',    label: 'Padel / tennis', emoji: '🎾', met: 7.0,  minutes: 90 },
  { kind: 'football', label: 'Football',      emoji: '⚽', met: 7.0,  minutes: 90 },
  { kind: 'walk',     label: 'Marche',        emoji: '🚶', met: 3.5,  minutes: 45 },
  { kind: 'yoga',     label: 'Yoga / mobilité', emoji: '🧘', met: 3.0, minutes: 40 },
  { kind: 'free',     label: 'Session libre', emoji: '🔥', met: 6.5,  minutes: 120 },
  { kind: 'other',    label: 'Autre',         emoji: '✨', met: 5.0,  minutes: 45 },
  { kind: 'rest',     label: 'Repos',         emoji: '😴', met: 0,    minutes: 0 }
];

export const activity = kind => ACTIVITIES.find(a => a.kind === kind) || ACTIVITIES.at(-2);

/** Métabolisme de base, Mifflin-St Jeor (homme). */
export function bmr(weightKg) {
  return Math.round(10 * weightKg + 6.25 * PROFILE.heightCm - 5 * PROFILE.age + 5);
}

/**
 * Dépense hors sport : métabolisme de base plus la vie courante.
 * Le sport étant compté à part, séance par séance, ce facteur ne couvre que
 * le reste — se lever, marcher, cuisiner. Un facteur d'activité classique
 * (1,35 et au-delà) inclut déjà l'entraînement : l'appliquer ici compterait
 * le sport deux fois.
 */
export const NEAT_FACTOR = 1.15;

export const baseBurn = weightKg => Math.round(bmr(weightKg) * NEAT_FACTOR);

/** kcal d'une séance : MET × 3,5 × kg / 200 × minutes. */
export function sessionBurn(met, minutes, weightKg) {
  return Math.round((met * 3.5 * weightKg) / 200 * minutes);
}

export const burnFor = (kind, minutes, weightKg) =>
  sessionBurn(activity(kind).met, minutes, weightKg);
