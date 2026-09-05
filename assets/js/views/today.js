/**
 * Aujourd'hui — l'écran d'accueil : où j'en suis, et quoi faire maintenant.
 */
import { mealType, PROFILE } from '../config.js';
import {
  getState, today, mealsOn, sessionsOn, totalsOn, energyOn,
  quests, streak, removeMeal, removeSession
} from '../store.js';
import { activity } from '../energy.js';
import { esc, fr, clamp, ring, bar, balanceBlock, run, celebrate, icon, empty } from '../ui.js';
import { relativeLabel } from '../date.js';
import { sportPicker, mountSportPicker } from './sport.js';

/** Bandeau série + xp, repris sur plusieurs écrans. */
export function counters(date = today()) {
  const s = streak();
  const q = quests(date);
  return `<div class="counters">
    <span class="counter ${s ? 'fire' : 'cold'}" title="Jours d'affilée avec un repas enregistré">
      <span class="ic" aria-hidden="true">🔥</span>${s}</span>
    <span class="counter xp" title="Points gagnés aujourd'hui">
      <span class="ic" aria-hidden="true">⭐</span>${q.xp}</span>
  </div>`;
}

function questRow(q) {
  const progress = q.value !== undefined && !q.done
    ? `<em>${fr.format(Math.round(q.value))} / ${fr.format(q.goal)}</em>` : '';
  return `<div class="quest ${q.done ? 'done' : ''}">
    <span class="ic" aria-hidden="true">${q.emoji}</span>
    <div class="body"><b>${esc(q.label)}</b>${progress}</div>
    <span class="xp">+${q.xp}</span>
    <span class="mark" role="img" aria-label="${q.done ? 'fait' : 'à faire'}">${icon.check}</span>
  </div>`;
}

export const todayView = {
  render() {
    const date = today();
    const { goals } = getState();
    const t = totalsOn(date);
    const meals = mealsOn(date);
    const sessions = sessionsOn(date);
    const energy = energyOn(date);
    const q = quests(date);
    const left = Math.round(goals.kcal - t.kcal);
    const over = left < 0;

    const mealRows = meals.length ? meals.map(m => `
      <div class="row-item">
        <span class="ic" aria-hidden="true">${m.isSupplement ? '💊' : mealType(m.type).emoji}</span>
        <div class="body">
          <b>${esc(m.desc)}</b>
          <em>${m.time} · ${m.protein} g prot · ${m.carbs} g gluc · ${m.fat} g lip${m.fiber ? ` · ${m.fiber} g fibres` : ''}</em>
        </div>
        <div class="kcal">${fr.format(m.kcal)}</div>
        <button class="iconbtn" data-remove="${esc(m.id)}" aria-label="Supprimer ${esc(m.desc)}">${icon.trash}</button>
      </div>`).join('')
      : empty('🍽️', "Rien encore aujourd'hui. Scanne ou ajoute ton premier repas.");

    const sessionRows = sessions.length ? sessions.map(s => {
      const a = activity(s.kind);
      return `<div class="row-item">
        <span class="ic" aria-hidden="true">${a.emoji}</span>
        <div class="body"><b>${esc(s.label || a.label)}</b><em>${s.time} · ${s.minutes} min</em></div>
        <div class="kcal" style="color:var(--purple-ink)">−${fr.format(s.kcal)}</div>
        <button class="iconbtn" data-rmsession="${esc(s.id)}" aria-label="Supprimer cette séance">${icon.trash}</button>
      </div>`;
    }).join('') : empty('🏐', 'Aucune séance enregistrée aujourd’hui.');

    return `
    <header class="page">
      <div>
        <h2>${relativeLabel(date)} 👋</h2>
        <p>${PROFILE.city} · objectif ${goals.targetWeight} kg</p>
      </div>
      ${counters(date)}
    </header>

    <section class="hero">
      <div>
        <p class="herolabel">${over ? 'Dépassement' : 'Il te reste'}</p>
        <p class="bignum">
          <b style="color:${over ? 'var(--red-ink)' : 'var(--green-ink)'}">${fr.format(Math.abs(left))}</b>
          <span>kcal ${over ? 'au-dessus de' : 'sur'} ${fr.format(goals.kcal)}</span>
        </p>
        <div class="budgetbar"><i class="${over ? 'over' : ''}" style="width:${clamp(t.kcal / goals.kcal * 100, 0, 100).toFixed(1)}%"></i></div>
        <div class="budgetmeta">
          <span>${fr.format(t.kcal)} kcal mangées</span>
          <span>${Math.round(t.kcal / goals.kcal * 100)} %</span>
        </div>
      </div>
      <div class="rings">
        ${ring(t.protein, goals.protein, 'Protéines', 'var(--blue)')}
        ${ring(t.carbs, goals.carbs, 'Glucides', 'var(--orange)')}
        ${ring(t.fat, goals.fat, 'Lipides', 'var(--purple)')}
      </div>
    </section>

    <div class="actions mb">
      <a class="btn lg" href="#/scan">${icon.scan} Scanner un produit</a>
      <a class="btn lg blue" href="#/photo">🍽️ Photo du repas</a>
      <a class="btn lg ghost" href="#/journal">${icon.plus} À la main</a>
    </div>

    <section class="card mb">
      <h3>🎯 Tes objectifs du jour</h3>
      <p class="sub">${q.done} sur ${q.total} · ${q.xp} points sur ${q.maxXp}</p>
      <div class="track mb" style="height:14px"><i style="width:${(q.xp / q.maxXp * 100).toFixed(1)}%;background:var(--yellow)"></i></div>
      <div class="quests">${q.list.map(questRow).join('')}</div>
    </section>

    <div class="grid g2 mb">
      <section class="card">
        <h3>⚖️ Apport et dépense</h3>
        <p class="sub">Ce qui entre, ce qui sort</p>
        ${balanceBlock(energy, { bars: false })}
        <p class="note">Dépense estimée : ${fr.format(energy.base)} kcal de base${energy.sport ? ` et ${fr.format(energy.sport)} kcal de sport (${energy.minutes} min)` : ', aucun sport enregistré'}.</p>
      </section>

      <section class="card">
        <h3>🥦 Le reste de l'assiette</h3>
        <p class="sub">Fibres, sucre et caféine comptent aussi</p>
        ${bar({ label: 'Fibres', value: t.fiber, goal: goals.fiber, color: 'var(--teal)', suffix: ' minimum' })}
        ${bar({ label: 'Sucre', value: t.sugar, goal: goals.sugar, color: t.sugar > goals.sugar ? 'var(--red-ink)' : 'var(--yellow)' })}
        ${bar({ label: 'Caféine', value: t.caffeine, goal: 400, color: 'var(--purple)', unit: 'mg', suffix: ' maximum' })}
      </section>
    </div>

    <section class="card mb">
      <h3>🍽️ Repas du jour</h3>
      <p class="sub">${meals.length} enregistré${meals.length > 1 ? 's' : ''}</p>
      ${mealRows}
    </section>

    <section class="card">
      <h3>🔥 Séances du jour</h3>
      <p class="sub">${sessions.length ? `${energy.minutes} minutes · ${fr.format(energy.sport)} kcal` : 'Rien pour l’instant'}</p>
      ${sessionRows}
    </section>

    ${sportPicker(date)}`;
  },

  mount(root) {
    const date = today();

    mountSportPicker(root);

    root.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => run(removeMeal(btn.dataset.remove),
        { ok: 'Repas supprimé', fail: 'Suppression impossible — vérifie ta connexion' }));
    });

    root.querySelectorAll('[data-rmsession]').forEach(btn => {
      btn.addEventListener('click', () => run(removeSession(btn.dataset.rmsession),
        { ok: 'Séance supprimée', fail: 'Suppression impossible — vérifie ta connexion' }));
    });

    // Journée parfaite : on fête, une seule fois par jour.
    const q = quests(date);
    const flag = 'mediterraneo:party:' + date;
    if (q.done === q.total) {
      try {
        if (!sessionStorage.getItem(flag)) {
          sessionStorage.setItem(flag, '1');
          celebrate();
          window.setTimeout(() => run(Promise.resolve(), { ok: `Journée parfaite ! ${q.maxXp} points 🎉` }), 0);
        }
      } catch { /* stockage indisponible : on saute la fête */ }
    }
  }
};
