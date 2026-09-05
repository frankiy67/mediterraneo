/**
 * Utilitaires de rendu : échappement, formatage, graphiques SVG.
 * Aucune dépendance externe.
 */

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Échappe toute donnée saisie avant insertion dans le HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export const fr = new Intl.NumberFormat('fr-FR');

export function formatDayMonth(iso) {
  return `${iso.slice(8)}/${iso.slice(5, 7)}`;
}

export function longDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ── graphiques ──────────────────────────────── */

const GEO = { w: 680, h: 210, left: 40, right: 12, top: 16, bottom: 26 };

/**
 * Courbe simple avec ligne d'objectif.
 * @param {{date:string}[]} data
 * @param {string} key   propriété numérique à tracer
 * @param {number} goal  valeur de référence
 * @param {string} color couleur CSS
 */
export function lineChart(data, key, goal, color) {
  if (!data.length) return '<p class="empty">Pas encore de données.</p>';
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
    <text class="axis" x="4" y="${(y(t) + 3).toFixed(1)}">${Math.round(t)}</text>`).join('');

  const dots = data.map((d, i) =>
    (i % 3 === 0 || i === data.length - 1)
      ? `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(d[key]).toFixed(1)}" r="3" fill="${color}"/>`
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

/**
 * Nuage de pesées avec moyenne mobile et ligne de cible.
 */
export function weightChart(points, average, target) {
  if (!points.length) return '<p class="empty">Pas encore de pesée.</p>';
  const w = 680, h = 230, left = 42, right = 12, top = 16, bottom = 26;
  const values = points.map(p => p.kg);
  const min = Math.min(...values, target) - 0.5;
  const max = Math.max(...values) + 0.5;
  const x = i => left + (i * (w - left - right)) / Math.max(1, points.length - 1);
  const y = v => top + (1 - (v - min) / (max - min)) * (h - top - bottom);

  const ticks = [min, (min + max) / 2, max];
  const gridlines = ticks.map(t => `
    <line class="gl" x1="${left}" x2="${w - right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
    <text class="axis" x="4" y="${(y(t) + 3).toFixed(1)}">${t.toFixed(1)}</text>`).join('');

  const avgPath = average
    .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ');

  const scatter = points.map((p, i) =>
    `<circle cx="${x(i).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="2.4" fill="rgba(233,240,240,.42)"/>`
  ).join('');

  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Trajectoire de poids">
    ${gridlines}
    <line class="goal" x1="${left}" x2="${w - right}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}"/>
    <text class="axis" x="${w - right}" y="${(y(target) - 6).toFixed(1)}" text-anchor="end" fill="var(--amber)">cible ${target} kg</text>
    ${scatter}
    <path class="ln" d="${avgPath}" stroke="var(--sea)"/>
  </svg>`;
}

/** Anneau de progression. */
export function ring(value, goal, label, color) {
  const pct = clamp(value / goal, 0, 1);
  const circumference = 2 * Math.PI * 31;
  return `<div class="ring">
    <svg viewBox="0 0 76 76" aria-hidden="true">
      <circle class="bg" cx="38" cy="38" r="31"/>
      <circle class="val" cx="38" cy="38" r="31" stroke="${color}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${(circumference * (1 - pct)).toFixed(1)}"/>
    </svg>
    <b>${Math.round(value)}<i> / ${goal}</i></b>
    <span>${esc(label)}</span>
  </div>`;
}

/** Barre horizontale objectif/consommé. */
export function bar({ label, value, goal, color, unit = 'g', suffix = '' }) {
  return `<div class="mbar">
    <div class="top"><b>${esc(label)}</b><em>${fr.format(Math.round(value))} / ${fr.format(goal)} ${unit}${suffix}</em></div>
    <div class="track"><i style="width:${clamp(value / goal * 100, 0, 100).toFixed(1)}%;background:${color}"></i></div>
  </div>`;
}
