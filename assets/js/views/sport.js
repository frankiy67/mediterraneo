/**
 * « Quel sport as-tu fait ? » — sélecteur d'activité réutilisable.
 *
 * Les calories dépensées viennent de la formule MET, la même que celle des
 * montres connectées : kcal = MET × 3,5 × poids(kg) ÷ 200 × minutes.
 * Le MET de chaque activité est celui du Compendium of Physical Activities.
 * L'estimation reste modifiable à la main avant enregistrement.
 */
import { ACTIVITIES, activity, sessionBurn } from '../energy.js';
import { addSession, weightAt } from '../store.js';
import { esc, fr, toast, run, icon } from '../ui.js';

const DURATIONS = [20, 30, 45, 60, 90, 120];

export function sportPicker(date, { title = '🔥 Quel sport as-tu fait ?' } = {}) {
  const kg = weightAt(date);
  const choices = ACTIVITIES.filter(a => a.kind !== 'rest').map((a, i) => `
    <button type="button" class="choice" data-act="${a.kind}" aria-pressed="${i === 0}">
      <span aria-hidden="true">${a.emoji}</span> ${esc(a.label)}
    </button>`).join('');

  const durations = DURATIONS.map(d => `
    <button type="button" class="choice" data-min="${d}" aria-pressed="${d === 90}">${d} min</button>`).join('');

  return `<section class="card" data-sport data-date="${date}">
    <h3>${title}</h3>
    <p class="sub">Choisis l'activité, la durée, c'est enregistré</p>

    <div class="choices mb">${choices}</div>

    <label for="sp-min-${date}">Durée</label>
    <div class="choices mb">${durations}</div>
    <div class="row mb">
      <div class="field"><label for="sp-min-${date}">Minutes</label>
        <input id="sp-min-${date}" type="number" min="1" max="600" step="5" value="90" data-minutes></div>
      <div class="field"><label for="sp-time-${date}">Heure</label>
        <input id="sp-time-${date}" type="time" value="18:30" data-time></div>
      <div class="field"><label for="sp-kcal-${date}">Calories brûlées</label>
        <input id="sp-kcal-${date}" type="number" min="0" step="10" value="0" data-kcal></div>
    </div>

    <p class="prose" data-estimate></p>
    <div class="actions"><button class="btn wide" data-add-session>${icon.plus} Enregistrer la séance</button></div>
    <p class="note">Estimation par la formule MET : <b>MET × 3,5 × ${kg} kg ÷ 200 × minutes</b>.
    Le MET mesure l'intensité d'une activité — 1 au repos, 4,5 au volley de loisir, 9,8 en course.
    C'est une estimation : corrige la valeur si ta montre dit autre chose.</p>
  </section>`;
}

export function mountSportPicker(root, onAdded) {
  root.querySelectorAll('[data-sport]').forEach(card => {
    const date = card.dataset.date;
    const minutesField = card.querySelector('[data-minutes]');
    const kcalField = card.querySelector('[data-kcal]');
    const timeField = card.querySelector('[data-time]');
    const estimate = card.querySelector('[data-estimate]');
    let kind = 'volley';
    let touchedKcal = false;

    const pressed = (list, match) => list.forEach(b => b.setAttribute('aria-pressed', String(match(b))));

    function refresh() {
      const act = activity(kind);
      const minutes = Number(minutesField.value) || 0;
      const kcal = sessionBurn(act.met, minutes, weightAt(date));
      if (!touchedKcal) kcalField.value = kcal;
      estimate.innerHTML = `<b>${esc(act.label)}</b> pendant ${minutes} min ≈ <b>${fr.format(kcal)} kcal</b> (MET ${act.met}).`;
    }

    card.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        kind = btn.dataset.act;
        touchedKcal = false;
        pressed(card.querySelectorAll('[data-act]'), b => b.dataset.act === kind);
        const act = activity(kind);
        if (act.minutes) {
          minutesField.value = act.minutes;
          pressed(card.querySelectorAll('[data-min]'), b => Number(b.dataset.min) === act.minutes);
        }
        refresh();
      });
    });

    card.querySelectorAll('[data-min]').forEach(btn => {
      btn.addEventListener('click', () => {
        minutesField.value = btn.dataset.min;
        touchedKcal = false;
        pressed(card.querySelectorAll('[data-min]'), b => b === btn);
        refresh();
      });
    });

    minutesField.addEventListener('input', () => { touchedKcal = false; refresh(); });
    kcalField.addEventListener('input', () => { touchedKcal = true; });

    card.querySelector('[data-add-session]').addEventListener('click', async () => {
      const minutes = Number(minutesField.value) || 0;
      if (minutes <= 0) { minutesField.focus(); toast('Indique une durée'); return; }
      const act = activity(kind);
      const button = card.querySelector('[data-add-session]');
      button.disabled = true;
      const saved = await run(addSession({
        date,
        time: timeField.value || '18:30',
        kind,
        label: act.label,
        minutes,
        kcal: Number(kcalField.value) || sessionBurn(act.met, minutes, weightAt(date))
      }), { ok: `${act.emoji} ${act.label} enregistré · +25 points` });
      button.disabled = false;
      if (saved) onAdded?.();
    });

    refresh();
  });
}
