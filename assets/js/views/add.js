/**
 * Ajouter — le carrefour des trois façons d'enregistrer un repas.
 * Le bouton central de la barre d'onglets mène ici.
 */
import { icon } from '../ui.js';

const WAYS = [
  ['#/scan', '📷', 'Scanner un code-barres', 'La fiche Open Food Facts, la quantité, c’est enregistré', 'green'],
  ['#/photo', '🍽️', 'Photographier le repas', 'Claude estime les calories, tu corriges avant d’enregistrer', 'blue'],
  ['#/journal', '✏️', 'Saisir à la main', 'Pour ce qui n’a ni code-barres ni photo', 'orange']
];

export const addView = {
  render() {
    return `
    <header class="page">
      <div><h2>➕ Ajouter</h2><p>Trois façons, la plus rapide d'abord</p></div>
    </header>

    <div class="grid mb">
      ${WAYS.map(([href, emoji, title, sub, tint]) => `
        <a class="card tinted ${tint} bigchoice" href="${href}">
          <span class="ic" aria-hidden="true">${emoji}</span>
          <span class="body"><b>${title}</b><em>${sub}</em></span>
          ${icon.right}
        </a>`).join('')}
    </div>

    <section class="card">
      <h3>🔥 Une séance de sport</h3>
      <p class="sub">Le sport se note sur la journée concernée</p>
      <div class="actions">
        <a class="btn wide" href="#/today">Ajouter une séance à aujourd'hui</a>
        <a class="btn ghost wide" href="#/week">Choisir un autre jour</a>
      </div>
    </section>`;
  }
};
