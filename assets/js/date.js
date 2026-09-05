/**
 * Dates. Tout est manipulé en ISO local (AAAA-MM-JJ), jamais en UTC :
 * `new Date('2026-09-05')` décale d'un jour selon le fuseau, `+T12:00:00` non.
 */

export const iso = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = () => iso(new Date());

export const parseISO = s => new Date(s + 'T12:00:00');

export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** 0 = lundi … 6 = dimanche. */
export const dayIndex = s => (parseISO(s).getDay() + 6) % 7;

export const startOfWeek = s => addDays(s, -dayIndex(s));

export const weekOf = s => {
  const first = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
};

export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const dayName = s => DAY_NAMES[dayIndex(s)];

export const dayNum = s => Number(s.slice(8));

export const isToday = s => s === todayISO();
export const isFuture = s => s > todayISO();
export const isPast = s => s < todayISO();

export function longDate(s) {
  return parseISO(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function shortDate(s) {
  return parseISO(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatDayMonth(s) {
  return `${s.slice(8)}/${s.slice(5, 7)}`;
}

/** « 1 — 7 septembre » ou « 29 septembre — 5 octobre ». */
export function weekLabel(s) {
  const days = weekOf(s);
  const a = parseISO(days[0]);
  const b = parseISO(days[6]);
  const sameMonth = a.getMonth() === b.getMonth();
  const opts = { day: 'numeric', month: 'long' };
  return sameMonth
    ? `${a.getDate()} — ${b.toLocaleDateString('fr-FR', opts)}`
    : `${a.toLocaleDateString('fr-FR', opts)} — ${b.toLocaleDateString('fr-FR', opts)}`;
}

/** Étiquette relative : aujourd'hui, hier, demain, sinon la date longue. */
export function relativeLabel(s) {
  const t = todayISO();
  if (s === t) return "Aujourd'hui";
  if (s === addDays(t, -1)) return 'Hier';
  if (s === addDays(t, 1)) return 'Demain';
  return longDate(s);
}
