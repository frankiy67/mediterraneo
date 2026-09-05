/**
 * Compléments, objectifs, données, et le menu « Plus » du mobile.
 */
import { PROFILE, SUPPLEMENTS_AM, SUPPLEMENTS_PW, ALL_SUPPLEMENTS, DEFAULT_GOALS } from '../config.js';
import {
  getState, updateGoals, today, toggleSupplement, weightSeries, weightAt
} from '../store.js';
import { signOut } from '../data.js';
import { bmr, baseBurn } from '../energy.js';
import { esc, fr, toast, run, icon } from '../ui.js';
import { addDays, longDate } from '../date.js';

/* ═══════════════ COMPLÉMENTS ═══════════════ */

export const supplementsView = {
  render() {
    const date = today();
    const taken = getState().supplements[date] || {};
    const row = (s, cls, badge) => `
      <div class="row-item">
        <button class="chk" data-supp="${s.key}" aria-pressed="${!!taken[s.key]}" aria-label="${esc(s.name)}">
          ${icon.check}
        </button>
        <div class="body"><b>${esc(s.name)}</b><em>${esc(s.brand)}</em></div>
        <span class="pill ${cls}">${badge}</span>
      </div>`;

    const cells = [];
    for (let i = 13; i >= 0; i--) {
      const iso = addDays(date, -i);
      const record = getState().supplements[iso];
      const n = record ? Object.values(record).filter(Boolean).length : 0;
      cells.push(n >= 5 ? 'full' : n > 0 ? 'part' : '');
    }
    const done = Object.values(taken).filter(Boolean).length;

    return `
    <header class="page">
      <div><h2>💊 Compléments</h2><p>Consum le matin, Nutripure après les séances</p></div>
    </header>

    <div class="grid g2 mb">
      <section class="card">
        <h3>Prise du matin</h3>
        <p class="sub">Micronutriments — impact calorique négligeable</p>
        ${SUPPLEMENTS_AM.map(s => row(s, 'am', 'matin')).join('')}
      </section>
      <section class="card">
        <h3>Après la séance</h3>
        <p class="sub">Ceux-ci comptent dans tes ${getState().goals.protein} g de protéines</p>
        ${SUPPLEMENTS_PW.map(s => row(s, 'pw', 'post-séance')).join('')}
        <p class="note">La protéine végétale et les peptides de collagène ne s'ajoutent pas à ton alimentation :
        ils en font partie. Pense à les enregistrer comme un repas si tu veux qu'ils comptent dans tes macros.</p>
      </section>
    </div>

    <section class="card">
      <h3>Assiduité sur quatorze jours</h3>
      <p class="sub">Plein : tout pris · pâle : partiel · vide : rien enregistré</p>
      <div class="adh">${cells.map(c => `<i class="${c}"></i>`).join('')}</div>
      <p class="note">Aujourd'hui : ${done} compléments sur ${ALL_SUPPLEMENTS.length} cochés.</p>
    </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-supp]').forEach(btn => {
      btn.addEventListener('click', () => run(toggleSupplement(today(), btn.dataset.supp)));
    });
  }
};

/* ═══════════════ OBJECTIFS ═══════════════ */

export const settingsView = {
  render() {
    const g = getState().goals;
    const kg = weightAt(today());
    const f = (id, label, value, step = '1') =>
      `<div class="field"><label for="${id}">${label}</label>
       <input id="${id}" type="number" step="${step}" min="0" value="${value}"></div>`;

    return `
    <header class="page">
      <div><h2>🎯 Objectifs</h2><p>Recalés sur neuf heures de sport par semaine</p></div>
    </header>

    <div class="grid g2">
      <section class="card">
        <h3>Cibles quotidiennes</h3>
        <p class="sub">Calories, protéines, glucides, lipides et fibres sont à atteindre ; le sucre est un plafond</p>
        <div class="row">
          ${f('g-kcal', 'Calories', g.kcal)}
          ${f('g-protein', 'Protéines g', g.protein)}
          ${f('g-carbs', 'Glucides g', g.carbs)}
        </div>
        <div class="row">
          ${f('g-fat', 'Lipides g', g.fat)}
          ${f('g-fiber', 'Fibres g', g.fiber)}
          ${f('g-sugar', 'Sucre max g', g.sugar)}
          ${f('g-target', 'Poids cible kg', g.targetWeight, '0.1')}
        </div>
        <div class="actions"><button class="btn lg wide" id="saveGoals">Enregistrer les objectifs</button></div>
      </section>

      <section class="card">
        <h3>D'où viennent ces chiffres</h3>
        <p class="sub">Estimations de départ, à corriger avec la réalité</p>
        <div class="row-item"><div class="body"><b>Métabolisme de base</b>
          <em>${fr.format(bmr(kg))} kcal — ${PROFILE.age} ans, ${(PROFILE.heightCm / 100).toFixed(2)} m, ${kg} kg (Mifflin-St Jeor)</em></div></div>
        <div class="row-item"><div class="body"><b>Dépense hors sport</b>
          <em>${fr.format(baseBurn(kg))} kcal — métabolisme × 1,35 pour la vie courante</em></div></div>
        <div class="row-item"><div class="body"><b>Sport</b>
          <em>Compté séance par séance : MET × 3,5 × poids ÷ 200 × minutes</em></div></div>
        <div class="row-item"><div class="body"><b>Déficit retenu</b>
          <em>Environ 500 kcal par jour, soit 0,5 kg par semaine</em></div></div>
        <div class="row-item"><div class="body"><b>Protéines élevées</b>
          <em>Près de 1,9 g par kilo, relevé car la protéine est végétale</em></div></div>
        <p class="note">Ce sont des estimations, pas une prescription. Sans perte après trois semaines, on baisse ;
        en cas de fatigue persistante, on remonte. Pour une cible personnalisée, l'avis d'un médecin ou d'un
        diététicien reste nécessaire.</p>
      </section>
    </div>`;
  },

  mount(root) {
    root.querySelector('#saveGoals').addEventListener('click', () => {
      const n = id => Number(root.querySelector('#' + id).value) || 0;
      run(updateGoals({
        kcal: n('g-kcal') || DEFAULT_GOALS.kcal,
        protein: n('g-protein') || DEFAULT_GOALS.protein,
        carbs: n('g-carbs') || DEFAULT_GOALS.carbs,
        fat: n('g-fat') || DEFAULT_GOALS.fat,
        fiber: n('g-fiber') || DEFAULT_GOALS.fiber,
        sugar: n('g-sugar') || DEFAULT_GOALS.sugar,
        targetWeight: n('g-target') || DEFAULT_GOALS.targetWeight
      }), { ok: 'Objectifs enregistrés' });
    });
  }
};

/* ═══════════════ DONNÉES ═══════════════ */

function download(filename, rows) {
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const dataView = {
  render() {
    const s = getState();
    return `
    <header class="page">
      <div><h2>💾 Données</h2><p>Elles sont à toi — emporte-les quand tu veux</p></div>
    </header>

    <div class="grid g2">
      <section class="card">
        <h3>Exporter</h3>
        <p class="sub">Des fichiers CSV lisibles par n'importe quel tableur</p>
        <div class="actions">
          <button class="btn" data-export="meals">Repas (${s.meals.length})</button>
          <button class="btn blue" data-export="sessions">Séances (${s.sessions.length})</button>
          <button class="btn ghost" data-export="weight">Poids</button>
          <button class="btn ghost" data-export="supplements">Compléments</button>
        </div>
        <p class="note">Le serveur Nutrition MCP propose lui aussi un export complet — il suffit de le demander à Claude.</p>
      </section>

      <section class="card">
        <h3>Où vivent tes données</h3>
        <p class="sub">Ce que cette application fait, et ce qu'elle ne fait pas</p>
        <p class="prose">Tes repas, tes séances, tes pesées et tes compléments vivent dans une base Postgres
        hébergée par Supabase en Europe. Chaque ligne porte ton identifiant, et la base ne renvoie que les
        tiennes : c'est ce qui permet de retrouver ta journée sur un autre appareil.</p>
        <p class="prose">Deux sorties vers l'extérieur, et deux seulement : le code-barres scanné, envoyé à
        Open Food Facts pour obtenir la fiche du produit, et la photo de repas, envoyée à l'API Claude via une
        fonction serveur qui vérifie d'abord ta session. Aucune photo n'est conservée.</p>
        <div class="actions">
          <button class="btn ghost" id="signOut">Se déconnecter</button>
        </div>
        <p class="note">Compte connecté : ${esc(getState().user?.email || '—')}.
        Pour supprimer un repas ou une séance, l'écran du jour concerné fait le travail ligne à ligne.</p>
      </section>
    </div>`;
  },

  mount(root) {
    root.querySelectorAll('[data-export]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = getState();
        const kind = btn.dataset.export;
        if (kind === 'meals') {
          download('repas.csv', [
            ['date', 'heure', 'type', 'description', 'code_barres', 'kcal', 'proteines_g', 'glucides_g', 'lipides_g', 'fibres_g', 'sucre_g', 'cafeine_mg'],
            ...s.meals.map(m => [m.date, m.time, m.type, quote(m.desc), m.barcode || '',
              m.kcal, m.protein, m.carbs, m.fat, m.fiber, m.sugar, m.caffeine])
          ]);
        } else if (kind === 'sessions') {
          download('seances.csv', [
            ['date', 'heure', 'activite', 'libelle', 'minutes', 'kcal'],
            ...s.sessions.map(x => [x.date, x.time, x.kind, quote(x.label), x.minutes, x.kcal])
          ]);
        } else if (kind === 'weight') {
          download('poids.csv', [['date', 'poids_kg'], ...weightSeries().map(w => [w.date, w.kg])]);
        } else {
          const rows = [['date', 'complement', 'pris']];
          for (const [date, day] of Object.entries(s.supplements))
            for (const [key, value] of Object.entries(day))
              rows.push([date, key, value ? 'oui' : 'non']);
          download('complements.csv', rows);
        }
        toast('Fichier téléchargé');
      });
    });

    root.querySelector('#signOut').addEventListener('click', () => {
      if (confirm('Se déconnecter de ce compte ? Tes données restent en base.')) signOut();
    });
  }
};

/* ═══════════════ PLUS ═══════════════ */

const MORE_LINKS = [
  ['#/photo', '🍽️', 'Photo du repas', 'Claude estime, tu corriges'],
  ['#/journal', '✏️', 'Ajouter à la main', 'Repas, pesée, séance'],
  ['#/supplements', '💊', 'Compléments', 'Le suivi du matin et d’après séance'],
  ['#/training', '🏐', 'Entraînement', 'Semaine type et dépense par activité'],
  ['#/plan', '🥗', 'Menus et courses', 'Sept jours, une liste'],
  ['#/weight', '⚖️', 'Poids', 'Trajectoire et moyenne 7 jours'],
  ['#/settings', '🎯', 'Objectifs', 'Calories, macros, poids cible'],
  ['#/data', '💾', 'Données', 'Export CSV, remise à zéro']
];

export const moreView = {
  render() {
    return `
    <header class="page"><div><h2>☰ Plus</h2><p>Tout le reste de l'application</p></div></header>
    <section class="card">
      ${MORE_LINKS.map(([href, emoji, title, sub]) => `
        <a class="row-item" href="${href}">
          <span class="ic" aria-hidden="true">${emoji}</span>
          <div class="body"><b>${esc(title)}</b><em>${esc(sub)}</em></div>
          ${icon.right}
        </a>`).join('')}
    </section>
    <p class="note">Mediterráneo — ${esc(longDate(today()))} · connecté en tant que
    ${esc(getState().user?.email || '—')}. Les valeurs affichées sont des estimations destinées à un adulte
    en bonne santé, sans valeur d'avis médical.</p>`;
  }
};
