/**
 * Utilitaires de rendu : échappement, formatage, composants, graphiques SVG.
 * Aucune dépendance externe.
 */
export { formatDayMonth, longDate, shortDate, relativeLabel } from './date.js';
import { formatDayMonth } from './date.js';

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Échappe toute donnée saisie avant insertion dans le HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export const fr = new Intl.NumberFormat('fr-FR');
export const round1 = n => Math.round(n * 10) / 10;

let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/**
 * Enveloppe une écriture qui part au serveur : message de réussite, message
 * d'échec lisible, et jamais d'exception qui casse la vue.
 */
export async function run(promise, { ok, fail = 'Enregistrement impossible — vérifie ta connexion' } = {}) {
  try {
    await promise;
    if (ok) toast(ok);
    return true;
  } catch (e) {
    console.error(e);
    toast(fail);
    return false;
  }
}

const CONFETTI_COLOURS = ['#58CC02', '#1CB0F6', '#FF9600', '#CE82FF', '#FFC800', '#FF4B4B'];

/** Petite pluie de confettis. Silencieuse si l'utilisateur limite les animations. */
export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 60; i++) {
    const bit = document.createElement('i');
    bit.style.left = Math.random() * 100 + 'vw';
    bit.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
    bit.style.animationDuration = (1.4 + Math.random() * 1.3) + 's';
    bit.style.animationDelay = (Math.random() * 0.5) + 's';
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3400);
}

/* ── composants ──────────────────────────────── */

/** Anneau de progression. */
export function ring(value, goal, label, color) {
  const pct = clamp(value / goal, 0, 1);
  const circumference = 2 * Math.PI * 32;
  return `<div class="ring">
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle class="bg" cx="40" cy="40" r="32"/>
      <circle class="val" cx="40" cy="40" r="32" stroke="${color}"
              stroke-dasharray="${circumference.toFixed(1)}"
              stroke-dashoffset="${(circumference * (1 - pct)).toFixed(1)}"/>
    </svg>
    <b>${Math.round(value)}<i> / ${goal}</i></b>
    <span>${esc(label)}</span>
  </div>`;
}

/** Anneau miniature, pour les cases du calendrier. */
export function miniRing(value, goal, color) {
  const pct = clamp(value / goal, 0, 1);
  const c = 2 * Math.PI * 13;
  return `<svg class="mini" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="13" stroke="var(--line)"/>
    <circle cx="16" cy="16" r="13" stroke="${color}" stroke-linecap="round"
            transform="rotate(-90 16 16)"
            stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/>
  </svg>`;
}

/** Barre horizontale objectif/consommé. */
export function bar({ label, value, goal, color, unit = 'g', suffix = '' }) {
  return `<div class="mbar">
    <div class="top"><b>${esc(label)}</b><em>${fr.format(Math.round(value))} / ${fr.format(goal)} ${unit}${suffix}</em></div>
    <div class="track"><i style="width:${clamp(value / goal * 100, 0, 100).toFixed(1)}%;background:${color}"></i></div>
  </div>`;
}

/**
 * Bloc « apport contre dépense ». Une journée sans repas n'affiche pas de
 * déficit : ne rien avoir mangé n'est pas un résultat, c'est une absence.
 */
export function balanceBlock(energy, { bars = true } = {}) {
  const scale = Math.max(energy.intake, energy.out, 1);
  const nothing = energy.intake === 0;
  const state = nothing ? 'none' : energy.balance < 0 ? 'good' : 'bad';
  const verdict = nothing
    ? 'Rien enregistré pour l’instant'
    : energy.balance < 0
      ? `déficit — environ ${Math.round(Math.abs(energy.balance) / 7.7)} g de gras`
      : 'au-dessus de ta dépense';

  return `<div class="balance">
      <div class="side"><b style="color:var(--orange-ink)">${fr.format(energy.intake)}</b><span>Apport</span></div>
      <div class="vs">vs</div>
      <div class="side"><b style="color:var(--purple-ink)">${fr.format(energy.out)}</b><span>Dépense</span></div>
    </div>
    ${bars ? `<div class="netbar">
      <i style="width:${(energy.intake / scale * 50).toFixed(1)}%;background:var(--orange)"></i>
      <i style="width:${(energy.out / scale * 50).toFixed(1)}%;background:var(--purple)"></i>
    </div>` : ''}
    <div class="netresult ${state}">
      <b>${nothing ? '—' : `${energy.balance > 0 ? '+' : ''}${fr.format(energy.balance)} kcal`}</b>
      ${verdict}
    </div>`;
}

export const icon = {
  scan: '<svg viewBox="0 0 24 24"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M4 12l6 6L20 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>'
};

/** Message d'état vide, avec une émoticône plutôt qu'un vide gris. */
export const empty = (emoji, text) =>
  `<p class="empty"><span class="ic" aria-hidden="true">${emoji}</span>${esc(text)}</p>`;

/* ── graphiques ──────────────────────────────── */

const GEO = { w: 680, h: 210, left: 42, right: 12, top: 16, bottom: 26 };

/**
 * Courbe simple avec ligne d'objectif.
 * @param {{date:string}[]} data
 * @param {string} key   propriété numérique à tracer
 * @param {number} goal  valeur de référence
 * @param {string} color couleur CSS
 */
export function lineChart(data, key, goal, color) {
  if (!data.length) return empty('📈', 'Pas encore de données.');
  if (data.length < 2) return empty('📈', 'Deux jours enregistrés au minimum pour tracer une courbe.');
  const { w, h, left, right, top, bottom } = GEO;
  const values = data.map(d => d[key]);
  const min = Math.min(...values, goal) * 0.93;
  const max = Math.max(...values, goal) * 1.06;
  const x = i => left + (i * (w - left - right)) / Math.max(1, data.length - 1);
  const y = v => top + (1 - (v - min) / (max - min)) * (h - top - bottom);

  const path = data
    .map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`)
    .join(' ');

  const ticks = [min, (min + max) / 2, max];
  const gridlines = ticks.map(t => `
    <line class="gl" x1="${left}" x2="${w - right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
    <text class="axis" x="4" y="${(y(t) + 4).toFixed(1)}">${Math.round(t)}</text>`).join('');

  const dots = data.map((d, i) =>
    (i % 3 === 0 || i === data.length - 1)
      ? `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(d[key]).toFixed(1)}" r="5" fill="${color}"/>`
      : '').join('');

  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Évolution sur ${data.length} jours">
    ${gridlines}
    <line class="goal" x1="${left}" x2="${w - right}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}"/>
    <path class="ln" d="${path}" stroke="${color}"/>
    ${dots}
    <text class="axis" x="${left}" y="${h - 8}">${formatDayMonth(data[0].date)}</text>
    <text class="axis" x="${w - right}" y="${h - 8}" text-anchor="end">${formatDayMonth(data.at(-1).date)}</text>
  </svg>`;
}

/** Nuage de pesées avec moyenne mobile et ligne de cible. */
export function weightChart(points, average, target) {
  if (!points.length) return empty('⚖️', 'Pas encore de pesée.');
  const w = 680, h = 230, left = 46, right = 12, top = 16, bottom = 26;
  const values = points.map(p => p.kg);
  const min = Math.min(...values, target) - 0.5;
  const max = Math.max(...values) + 0.5;
  const x = i => left + (i * (w - left - right)) / Math.max(1, points.length - 1);
  const y = v => top + (1 - (v - min) / (max - min)) * (h - top - bottom);

  const ticks = [min, (min + max) / 2, max];
  const gridlines = ticks.map(t => `
    <line class="gl" x1="${left}" x2="${w - right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
    <text class="axis" x="4" y="${(y(t) + 4).toFixed(1)}">${t.toFixed(1)}</text>`).join('');

  const avgPath = average
    .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ');

  const scatter = points.map((p, i) =>
    `<circle cx="${x(i).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="3.4" fill="var(--ink-faint)" opacity=".5"/>`
  ).join('');

  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Trajectoire de poids">
    ${gridlines}
    <line class="goal" x1="${left}" x2="${w - right}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}"/>
    <text class="axis" x="${w - right}" y="${(y(target) - 8).toFixed(1)}" text-anchor="end" fill="var(--orange-ink)">cible ${target} kg</text>
    ${scatter}
    <path class="ln" d="${avgPath}" stroke="var(--blue)"/>
  </svg>`;
}
