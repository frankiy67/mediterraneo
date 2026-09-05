/**
 * Journal — la saisie à la main, quand le code-barres ne suffit pas.
 */
import { MEAL_TYPES, mealType, guessMealType } from '../config.js';
import { addMeal, setWeightFor, today, weightAt } from '../store.js';
import { esc, toast, run, icon } from '../ui.js';
import { todayISO, relativeLabel } from '../date.js';
import { sportPicker, mountSportPicker } from './sport.js';

const safeDate = value => (/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : todayISO());

export const journalView = {
  render(params = {}) {
    const date = safeDate(params.date);
    const chosen = guessMealType();
    const types = Object.entries(MEAL_TYPES).map(([key, meta]) =>
      `<button type="button" class="choice" data-mtype="${key}" aria-pressed="${key === chosen}">${meta.emoji} ${meta.label}</button>`).join('');

    return `
    <header class="page">
      <div><h2>✏️ Ajouter</h2><p>${esc(relativeLabel(date))}</p></div>
      <a class="btn sm" href="#/scan">${icon.scan} Scanner plutôt</a>
    </header>

    <section class="card mb">
      <h3>🍽️ Un repas</h3>
      <p class="sub">Les valeurs sont des estimations, pas une mesure de laboratoire</p>

      <div class="field">
        <label for="f-desc">Ce que tu as mangé</label>
        <input id="f-desc" required placeholder="Poulet a la plancha, salade de pois chiches">
      </div>

      <label>Moment</label>
      <div class="choices mb">${types}</div>

      <div class="row">
        <div class="field"><label for="f-date">Jour</label><input id="f-date" type="date" value="${date}"></div>
        <div class="field"><label for="f-time">Heure</label><input id="f-time" type="time" value="${mealType(chosen).time}"></div>
        <div class="field"><label for="f-kcal">Calories</label><input id="f-kcal" type="number" min="0" placeholder="700"></div>
      </div>
      <div class="row">
        <div class="field"><label for="f-protein">Protéines g</label><input id="f-protein" type="number" min="0" placeholder="55"></div>
        <div class="field"><label for="f-carbs">Glucides g</label><input id="f-carbs" type="number" min="0" placeholder="60"></div>
        <div class="field"><label for="f-fat">Lipides g</label><input id="f-fat" type="number" min="0" placeholder="20"></div>
      </div>
      <div class="row">
        <div class="field"><label for="f-fiber">Fibres g</label><input id="f-fiber" type="number" min="0" placeholder="14"></div>
        <div class="field"><label for="f-sugar">Sucre g</label><input id="f-sugar" type="number" min="0" placeholder="6"></div>
        <div class="field"><label for="f-caffeine">Caféine mg</label><input id="f-caffeine" type="number" min="0" placeholder="0"></div>
      </div>
      <div class="actions"><button class="btn lg wide" id="saveMeal">${icon.plus} Enregistrer le repas</button></div>
    </section>

    <section class="card mb">
      <h3>⚖️ Une pesée</h3>
      <p class="sub">Le matin à jeun, dans les mêmes conditions</p>
      <div class="row">
        <div class="field"><label for="f-weight">Poids kg</label>
          <input id="f-weight" type="number" step="0.1" min="30" max="300" placeholder="${weightAt(date)}"></div>
        <div class="field"><label for="f-wdate">Date</label><input id="f-wdate" type="date" value="${date}"></div>
      </div>
      <div class="actions"><button class="btn blue wide" id="saveWeight">Enregistrer le poids</button></div>
      <p class="note">Ne juge jamais une seule pesée. La moyenne sur sept jours est la seule ligne qui dit la vérité — le reste, c'est de l'eau et du sel.</p>
    </section>

    ${sportPicker(date)}`;
  },

  mount(root) {
    const val = id => Number(root.querySelector('#' + id).value) || 0;
    let type = guessMealType();

    root.querySelectorAll('[data-mtype]').forEach(btn => {
      btn.addEventListener('click', () => {
        type = btn.dataset.mtype;
        root.querySelectorAll('[data-mtype]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        root.querySelector('#f-time').value = mealType(type).time;
      });
    });

    root.querySelector('#saveMeal').addEventListener('click', async () => {
      const descField = root.querySelector('#f-desc');
      const desc = descField.value.trim();
      if (!desc) { descField.focus(); toast('Décris le repas avant de l’enregistrer'); return; }
      const date = root.querySelector('#f-date').value || today();
      const button = root.querySelector('#saveMeal');
      button.disabled = true;
      const saved = await run(addMeal({
        date,
        time: root.querySelector('#f-time').value || '12:00',
        type,
        desc,
        kcal: val('f-kcal'), protein: val('f-protein'), carbs: val('f-carbs'),
        fat: val('f-fat'), fiber: val('f-fiber'), sugar: val('f-sugar'), caffeine: val('f-caffeine')
      }), { ok: 'Repas enregistré · +10 points' });
      button.disabled = false;
      if (saved) location.hash = date === today() ? '#/today' : '#/day/' + date;
    });

    root.querySelector('#saveWeight').addEventListener('click', async () => {
      const field = root.querySelector('#f-weight');
      const kg = Number(field.value);
      if (!kg) { field.focus(); toast('Indique un poids'); return; }
      const saved = await run(setWeightFor(root.querySelector('#f-wdate').value || today(), kg),
        { ok: 'Poids enregistré' });
      if (saved) location.hash = '#/weight';
    });

    mountSportPicker(root);
  }
};
