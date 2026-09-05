/**
 * Vues. Chaque fonction renvoie du HTML et déclare éventuellement
 * une phase `mount` pour brancher ses écouteurs.
 */
import {
  PROFILE, SUPPLEMENTS_AM, SUPPLEMENTS_PW, ALL_SUPPLEMENTS,
  WEEK_PLAN, GYM_SESSION, MEAL_PLAN, SHOPPING, MEAL_TYPES
} from './config.js';
import {
  getState, update, reset, today, mealsOn, waterOn, totalsOn,
  weightSeries, movingAverage, BASELINE
} from './store.js';
import {
  esc, fr, clamp, ring, bar, lineChart, weightChart, longDate, toast
} from './ui.js';

/* ═══════════════ AUJOURD'HUI ═══════════════ */

export const todayView = {
  render() {
    const date = today();
    const { goals } = getState();
    const t = totalsOn(date);
    const water = waterOn(date);
    const meals = mealsOn(date).slice().sort((a, b) => a.time.localeCompare(b.time));
    const left = Math.max(0, goals.kcal - t.kcal);

    const mealRows = meals.length ? meals.map(m => `
      <div class="row-item">
        <div class="time">${esc(m.time)}</div>
        <div class="body">
          <b>${esc(m.desc)}${m.isSupplement ? '<span class="tag">compléments</span>' : ''}</b>
          <em>${m.protein} g protéines · ${m.carbs} g glucides · ${m.fat} g lipides · ${m.fiber} g fibres${m.caffeine ? ` · ${m.caffeine} mg caféine` : ''}</em>
        </div>
        <div class="kcal">${fr.format(m.kcal)}</div>
        <button class="icon-btn" data-remove="${esc(m.id)}" aria-label="Supprimer ce repas">
          <svg viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
        </button>
      </div>`).join('')
      : '<p class="empty">Rien encore aujourd\'hui. Le premier repas ouvre la journée.</p>';

    const filled = Math.round(water / 250);
    const drops = Array.from({ length: 12 }, (_, i) => `
      <button class="drop" data-water="${i + 1}" aria-pressed="${i < filled}"
              aria-label="${(i + 1) * 250} millilitres"></button>`).join('');

    return `
    <header class="page">
      <div>
        <h2 class="serif">${longDate(date)}</h2>
        <p>${meals.length} repas · ${fr.format(t.kcal)} kcal · ${t.protein} g de protéines · ${fr.format(water)} ml d'eau</p>
      </div>
      <a class="act" href="#/journal" style="text-decoration:none">Ajouter un repas</a>
    </header>

    <section class="hero">
      <div>
        <p class="herolabel">Énergie restante aujourd'hui</p>
        <p class="bignum"><b class="serif">${fr.format(left)}</b><span>kcal sur ${fr.format(goals.kcal)}</span></p>
        <div class="budgetbar"><i style="width:${clamp(t.kcal / goals.kcal * 100, 0, 100).toFixed(1)}%"></i></div>
        <div class="budgetmeta">
          <span>${fr.format(t.kcal)} kcal consommées</span>
          <span>${Math.round(t.kcal / goals.kcal * 100)}%</span>
        </div>
      </div>
      <div class="rings">
        ${ring(t.protein, goals.protein, 'Protéines', 'var(--sea)')}
        ${ring(t.carbs, goals.carbs, 'Glucides', 'var(--amber)')}
        ${ring(t.fat, goals.fat, 'Lipides', 'var(--violet)')}
      </div>
    </section>

    <div class="grid g2 mb">
      <section class="card">
        <h3>Répartition du jour</h3>
        <p class="sub">Fibres, sucre et caféine comptent autant que les macros</p>
        ${bar({ label: 'Fibres', value: t.fiber, goal: goals.fiber, color: 'var(--sea)', suffix: ' minimum' })}
        ${bar({ label: 'Sucre', value: t.sugar, goal: goals.sugar, color: t.sugar > goals.sugar ? 'var(--coral)' : 'var(--amber)' })}
        ${bar({ label: 'Caféine', value: t.caffeine, goal: 400, color: 'var(--violet)', unit: 'mg' })}
      </section>

      <section class="card">
        <h3>Hydratation</h3>
        <p class="sub">Chaque verre vaut 250 ml — clique pour ajuster</p>
        <div class="drops">${drops}</div>
        <p class="bignum"><b class="serif">${fr.format(water)}</b><span>ml sur ${fr.format(goals.water)}</span></p>
        <p class="note">Avec la chaleur de Valence et neuf heures de sport par semaine, la soif arrive après la baisse de performance.</p>
      </section>
    </div>

    <section class="card">
      <h3>Repas enregistrés</h3>
      <p class="sub">Journée du ${longDate(date)}</p>
      ${mealRows}
    </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-water]').forEach(btn => {
      btn.addEventListener('click', () => {
        const glasses = Number(btn.dataset.water);
        update(s => {
          s.water = s.water.filter(w => w.date !== today());
          s.water.push({ date: today(), ml: glasses * 250 });
        });
      });
    });
    root.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        update(s => { s.meals = s.meals.filter(m => m.id !== btn.dataset.remove); });
        toast('Repas supprimé');
      });
    });
  }
};

/* ═══════════════ JOURNAL ═══════════════ */

export const journalView = {
  render() {
    const options = Object.entries(MEAL_TYPES)
      .map(([v, l]) => `<option value="${v}"${v === 'lunch' ? ' selected' : ''}>${l}</option>`).join('');
    return `
    <header class="page">
      <div><h2 class="serif">Journal</h2><p>Ce que tu ajoutes ici recalcule tout le tableau de bord</p></div>
    </header>

    <div class="grid g2">
      <section class="card">
        <h3>Nouveau repas</h3>
        <p class="sub">Les valeurs sont des estimations, pas une mesure de laboratoire</p>
        <div class="field">
          <label for="f-desc">Ce que tu as mangé</label>
          <input id="f-desc" required placeholder="Poulet a la plancha, salade de pois chiches">
        </div>
        <div class="row">
          <div class="field"><label for="f-type">Moment</label><select id="f-type">${options}</select></div>
          <div class="field"><label for="f-time">Heure</label><input id="f-time" type="time" value="14:00"></div>
        </div>
        <div class="row">
          <div class="field"><label for="f-kcal">Calories</label><input id="f-kcal" type="number" min="0" placeholder="700"></div>
          <div class="field"><label for="f-protein">Protéines g</label><input id="f-protein" type="number" min="0" placeholder="55"></div>
          <div class="field"><label for="f-carbs">Glucides g</label><input id="f-carbs" type="number" min="0" placeholder="60"></div>
          <div class="field"><label for="f-fat">Lipides g</label><input id="f-fat" type="number" min="0" placeholder="20"></div>
        </div>
        <div class="row">
          <div class="field"><label for="f-fiber">Fibres g</label><input id="f-fiber" type="number" min="0" placeholder="14"></div>
          <div class="field"><label for="f-sugar">Sucre g</label><input id="f-sugar" type="number" min="0" placeholder="6"></div>
          <div class="field"><label for="f-caffeine">Caféine mg</label><input id="f-caffeine" type="number" min="0" placeholder="0"></div>
        </div>
        <div class="actions"><button class="act" id="saveMeal">Enregistrer le repas</button></div>
      </section>

      <section class="card">
        <h3>Poids</h3>
        <p class="sub">Le matin à jeun, dans les mêmes conditions</p>
        <div class="row">
          <div class="field"><label for="f-weight">Poids kg</label><input id="f-weight" type="number" step="0.1" min="30" placeholder="88.6"></div>
          <div class="field"><label for="f-wdate">Date</label><input id="f-wdate" type="date" value="${today()}"></div>
        </div>
        <div class="actions"><button class="act" id="saveWeight">Enregistrer le poids</button></div>
        <p class="note">Ne juge jamais une seule pesée. La moyenne sur sept jours est la seule ligne qui dit la vérité — le reste, c'est de l'eau et du sel.</p>
      </section>
    </div>`;
  },

  mount(root) {
    const val = id => Number(root.querySelector('#' + id).value) || 0;

    root.querySelector('#saveMeal').addEventListener('click', () => {
      const descField = root.querySelector('#f-desc');
      const desc = descField.value.trim();
      if (!desc) { descField.focus(); toast('Décris le repas avant de l\'enregistrer'); return; }
      update(s => s.meals.push({
        id: crypto.randomUUID(),
        date: today(),
        time: root.querySelector('#f-time').value || '12:00',
        type: root.querySelector('#f-type').value,
        desc,
        kcal: val('f-kcal'), protein: val('f-protein'), carbs: val('f-carbs'),
        fat: val('f-fat'), fiber: val('f-fiber'), sugar: val('f-sugar'), caffeine: val('f-caffeine')
      }));
      toast('Repas enregistré');
      location.hash = '#/today';
    });

    root.querySelector('#saveWeight').addEventListener('click', () => {
      const field = root.querySelector('#f-weight');
      const kg = Number(field.value);
      if (!kg) { field.focus(); toast('Indique un poids'); return; }
      const date = root.querySelector('#f-wdate').value || today();
      update(s => {
        s.weights = s.weights.filter(w => w.date !== date);
        s.weights.push({ date, kg });
      });
      toast('Poids enregistré');
      location.hash = '#/weight';
    });
  }
};

/* ═══════════════ COMPLÉMENTS ═══════════════ */

export const supplementsView = {
  render() {
    const taken = getState().supplements[today()] || {};
    const row = (s, cls, badge) => `
      <div class="row-item">
        <button class="chk" data-supp="${s.key}" aria-pressed="${!!taken[s.key]}" aria-label="${esc(s.name)}">
          <svg viewBox="0 0 24 24"><path d="M4 12l6 6L20 6"/></svg>
        </button>
        <div class="body"><b>${esc(s.name)}</b><em>${esc(s.brand)}</em></div>
        <span class="pill ${cls}">${badge}</span>
      </div>`;

    const cells = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today());
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const record = getState().supplements[iso];
      if (record) {
        const n = Object.values(record).filter(Boolean).length;
        cells.push(n >= 5 ? 'full' : n > 0 ? 'part' : '');
      } else {
        cells.push('');
      }
    }
    const done = Object.values(taken).filter(Boolean).length;

    return `
    <header class="page">
      <div><h2 class="serif">Compléments</h2><p>Consum le matin, Nutripure après les séances</p></div>
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
        <p class="note">La protéine végétale et les peptides de collagène ne s'ajoutent pas à ton alimentation : ils en font partie.</p>
      </section>
    </div>

    <section class="card">
      <h3>Assiduité sur quatorze jours</h3>
      <p class="sub">Plein : tout pris · pâle : partiel · vide : rien enregistré</p>
      <div class="adh">${cells.map(c => `<i class="${c}"></i>`).join('')}</div>
      <p class="note">Aujourd'hui : ${done} compléments sur ${ALL_SUPPLEMENTS.length} cochés. Les cases antérieures à ton premier jour de suivi restent vides tant que rien n'y a été enregistré.</p>
    </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-supp]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.supp;
        update(s => {
          const day = s.supplements[today()] ||= {};
          day[key] = !day[key];
        });
      });
    });
  }
};

/* ═══════════════ TENDANCES ═══════════════ */

let trendWindow = 7;

export const trendsView = {
  render() {
    const { goals } = getState();
    const slice = BASELINE.slice(-trendWindow);
    const logged = slice.filter(d => d.logged);
    const avg = key => Math.round(logged.reduce((t, d) => t + d[key], 0) / (logged.length || 1));

    const card = (title, value, unit, delta, invert = false) => {
      const cls = delta === 0 ? 'flat' : (invert ? (delta < 0 ? 'up' : 'down') : (delta > 0 ? 'up' : 'down'));
      return `<section class="card">
        <h3>${title}</h3>
        <p class="kpi">${fr.format(value)}<small>${unit}</small></p>
        <p class="delta ${cls}">${delta > 0 ? '+' : ''}${delta} ${unit} vs objectif</p>
      </section>`;
    };

    const weekend = BASELINE.filter(d => d.dow === 0 || d.dow === 6);
    const weekday = BASELINE.filter(d => d.dow > 0 && d.dow < 6);
    const avgWe = Math.round(weekend.reduce((t, d) => t + d.kcal, 0) / weekend.length);
    const avgWd = Math.round(weekday.reduce((t, d) => t + d.kcal, 0) / weekday.length);
    const fiberShort = BASELINE.filter(d => d.fiber < goals.fiber).length;

    return `
    <header class="page">
      <div><h2 class="serif">Tendances</h2><p>Ce que la moyenne raconte, et qu'une journée ne dit jamais</p></div>
      <div class="seg" role="group" aria-label="Période">
        ${[7, 14, 30].map(d => `<button data-window="${d}" aria-pressed="${d === trendWindow}">${d} j</button>`).join('')}
      </div>
    </header>

    <div class="grid g4 mb">
      ${card('Calories / jour', avg('kcal'), 'kcal', avg('kcal') - goals.kcal)}
      ${card('Protéines / jour', avg('protein'), 'g', avg('protein') - goals.protein, true)}
      ${card('Fibres / jour', avg('fiber'), 'g', avg('fiber') - goals.fiber, true)}
      <section class="card">
        <h3>Jours enregistrés</h3>
        <p class="kpi">${logged.length}<small>/ ${trendWindow}</small></p>
        <p class="delta flat">${Math.round(logged.length / trendWindow * 100)}% de la période</p>
      </section>
    </div>

    <section class="card mb">
      <h3>Calories par jour</h3>
      <p class="sub">La ligne ambre est ton objectif de ${fr.format(goals.kcal)} kcal</p>
      ${lineChart(slice, 'kcal', goals.kcal, 'var(--amber)')}
    </section>

    <div class="grid g2">
      <section class="card">
        <h3>Protéines par jour</h3>
        <p class="sub">Objectif ${goals.protein} g — le levier qui protège ton muscle</p>
        ${lineChart(slice, 'protein', goals.protein, 'var(--sea)')}
      </section>
      <section class="card">
        <h3>Ce qui ressort</h3>
        <p class="sub">Lecture des trente derniers jours</p>
        ${bar({ label: 'Week-end', value: avgWe, goal: 3200, color: 'var(--coral)', unit: 'kcal' })}
        ${bar({ label: 'Semaine', value: avgWd, goal: 3200, color: 'var(--sea)', unit: 'kcal' })}
        <p class="prose" style="margin-top:14px">Le samedi et le dimanche pèsent ${avgWe - avgWd} kcal de plus par jour que le reste de la semaine. Sur un mois, cela efface l'équivalent d'une semaine entière de déficit.</p>
        <p class="prose">Les fibres passent sous les ${goals.fiber} g sur ${fiberShort} jours sur ${BASELINE.length}. Légumineuses et légumes à chaque repas règlent cela sans effort.</p>
      </section>
    </div>`;
  },

  mount(root) {
    root.querySelectorAll('[data-window]').forEach(btn => {
      btn.addEventListener('click', () => {
        trendWindow = Number(btn.dataset.window);
        window.dispatchEvent(new CustomEvent('rerender'));
      });
    });
  }
};

/* ═══════════════ POIDS ═══════════════ */

export const weightView = {
  render() {
    const { goals } = getState();
    const points = weightSeries();
    const kgs = points.map(p => p.kg);
    const average = movingAverage(kgs, 7);
    const last = points.at(-1);
    const first = points[0];
    const ma7 = average.at(-1);
    const toGo = +(last.kg - goals.targetWeight).toFixed(1);
    const weeks = Math.max(1, Math.ceil(toGo / 0.5));
    const eta = new Date(today());
    eta.setDate(eta.getDate() + weeks * 7);
    const delta = +(last.kg - first.kg).toFixed(1);

    return `
    <header class="page">
      <div><h2 class="serif">Poids</h2><p>${PROFILE.startWeight} kg au départ · cible ${goals.targetWeight} kg</p></div>
    </header>

    <div class="grid g4 mb">
      <section class="card"><h3>Dernière pesée</h3>
        <p class="kpi">${last.kg.toFixed(1)}<small>kg</small></p>
        <p class="delta ${delta < 0 ? 'down' : delta > 0 ? 'up' : 'flat'}">${delta > 0 ? '+' : ''}${delta} kg depuis le début</p></section>
      <section class="card"><h3>Moyenne 7 jours</h3>
        <p class="kpi">${ma7.toFixed(1)}<small>kg</small></p>
        <p class="delta flat">La ligne qui compte</p></section>
      <section class="card"><h3>Reste à perdre</h3>
        <p class="kpi">${toGo.toFixed(1)}<small>kg</small></p>
        <p class="delta flat">Jusqu'à ${goals.targetWeight} kg</p></section>
      <section class="card"><h3>Échéance estimée</h3>
        <p class="kpi" style="font-size:29px">${eta.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
        <p class="delta flat">À 0,5 kg par semaine</p></section>
    </div>

    <section class="card">
      <h3>Trajectoire</h3>
      <p class="sub">Points : pesées · ligne pleine : moyenne 7 jours · ligne ambre : cible</p>
      ${weightChart(points, average, goals.targetWeight)}
      <p class="note">Perdre un demi-kilo par semaine avec neuf heures de sport et ${goals.protein} g de protéines, c'est perdre du gras en gardant le muscle. Aller plus vite reviendrait à sacrifier ta détente au volley.</p>
    </section>`;
  }
};

/* ═══════════════ ENTRAÎNEMENT ═══════════════ */

export const trainingView = {
  render() {
    const days = WEEK_PLAN.map(d => `
      <div class="day"><b>${d.day}</b>
        ${d.sessions.map(s => `<div class="sess s-${s.kind}">${esc(s.label)}</div>`).join('')}
      </div>`).join('');

    return `
    <header class="page">
      <div><h2 class="serif">Semaine type</h2><p>Deux volley, deux gym, deux sessions libres — environ neuf heures</p></div>
    </header>

    <section class="card mb">
      <h3>Répartition hebdomadaire</h3>
      <p class="sub">Un jour sans charge, et ce n'est pas une faiblesse</p>
      <div class="week">${days}</div>
    </section>

    <div class="grid g3 mb">
      <section class="card"><h3>Volume</h3><p class="kpi">9<small>h / semaine</small></p><p class="delta flat">Six séances</p></section>
      <section class="card"><h3>Dépense estimée</h3><p class="kpi">3000<small>kcal / jour</small></p><p class="delta flat">Déficit de 500</p></section>
      <section class="card"><h3>Récupération</h3><p class="kpi">1<small>jour off</small></p><p class="delta up">À surveiller de près</p></section>
    </div>

    <section class="card">
      <h3>La séance de gym qui compte</h3>
      <p class="sub">Full-body, une heure, en cherchant à progresser un peu chaque semaine</p>
      ${GYM_SESSION.map(([name, sets]) => `
        <div class="row-item"><div class="body"><b>${esc(name)}</b><em>${esc(sets)}</em></div></div>`).join('')}
      <p class="note">En déficit calorique, la musculation ne sert pas à brûler des calories — le volley s'en charge. Elle donne à ton corps une raison de garder son muscle plutôt que de le consommer.</p>
    </section>`;
  }
};

/* ═══════════════ MENUS ═══════════════ */

export const planView = {
  render() {
    const days = MEAL_PLAN.map(d => `
      <section class="card">
        <h3>${d.day}</h3>
        <p class="sub">${esc(d.training)}</p>
        ${d.meals.map(([slot, text]) => `
          <div class="row-item"><div class="body"><b>${esc(slot)}</b><em>${esc(text)}</em></div></div>`).join('')}
      </section>`).join('');

    const lists = SHOPPING.map(([title, items]) => `
      <section class="card">
        <h3>${esc(title)}</h3>
        <p class="sub">${items.length} articles</p>
        ${items.map(i => `<div class="row-item"><div class="body"><b>${esc(i)}</b></div></div>`).join('')}
      </section>`).join('');

    return `
    <header class="page">
      <div><h2 class="serif">Menus de la semaine</h2><p>Plus de glucides les jours d'entraînement, autant de protéines partout</p></div>
      <button class="act ghost" onclick="window.print()">Imprimer</button>
    </header>

    <div class="grid g2 mb">${days}</div>

    <header class="page"><div><h2 class="serif">Liste de courses</h2><p>Une semaine complète</p></div></header>
    <div class="grid g3">${lists}</div>`;
  }
};

/* ═══════════════ OBJECTIFS ═══════════════ */

export const settingsView = {
  render() {
    const g = getState().goals;
    const f = (id, label, value, step = '1') =>
      `<div class="field"><label for="${id}">${label}</label>
       <input id="${id}" type="number" step="${step}" min="0" value="${value}"></div>`;

    return `
    <header class="page">
      <div><h2 class="serif">Objectifs</h2><p>Recalés sur neuf heures de sport par semaine</p></div>
    </header>

    <div class="grid g2">
      <section class="card">
        <h3>Cibles quotidiennes</h3>
        <p class="sub">Calories, protéines, glucides, lipides et fibres sont à atteindre ; le sucre est un plafond</p>
        <div class="row">
          ${f('g-kcal', 'Calories', g.kcal)}
          ${f('g-protein', 'Protéines g', g.protein)}
          ${f('g-carbs', 'Glucides g', g.carbs)}
          ${f('g-fat', 'Lipides g', g.fat)}
        </div>
        <div class="row">
          ${f('g-fiber', 'Fibres g', g.fiber)}
          ${f('g-sugar', 'Sucre max g', g.sugar)}
          ${f('g-water', 'Eau ml', g.water)}
          ${f('g-target', 'Poids cible kg', g.targetWeight, '0.1')}
        </div>
        <div class="actions"><button class="act" id="saveGoals">Enregistrer les objectifs</button></div>
      </section>

      <section class="card">
        <h3>D'où viennent ces chiffres</h3>
        <p class="sub">Estimations de départ, à corriger avec la réalité</p>
        <div class="row-item"><div class="body"><b>Métabolisme de base</b><em>Environ 1860 kcal — ${PROFILE.age} ans, ${(PROFILE.heightCm / 100).toFixed(2)} m, ${PROFILE.startWeight} kg</em></div></div>
        <div class="row-item"><div class="body"><b>Dépense totale</b><em>Environ 3000 kcal avec neuf heures de sport par semaine</em></div></div>
        <div class="row-item"><div class="body"><b>Déficit retenu</b><em>500 kcal, soit environ 0,5 kg par semaine</em></div></div>
        <div class="row-item"><div class="body"><b>Protéines élevées</b><em>Près de 1,9 g par kilo, relevé car la protéine est végétale</em></div></div>
        <div class="row-item"><div class="body"><b>Sucre</b><em>Sucres totaux, fruits et lait compris, pas seulement le sucre ajouté</em></div></div>
        <p class="note">Ce sont des estimations, pas une prescription. Sans perte après trois semaines, on baisse ; en cas de fatigue persistante, on remonte. Pour une cible personnalisée, l'avis d'un médecin ou d'un diététicien reste nécessaire.</p>
      </section>
    </div>`;
  },

  mount(root) {
    root.querySelector('#saveGoals').addEventListener('click', () => {
      const n = id => Number(root.querySelector('#' + id).value) || 0;
      update(s => {
        s.goals = {
          kcal: n('g-kcal') || 2500, protein: n('g-protein') || 165,
          carbs: n('g-carbs') || 285, fat: n('g-fat') || 80,
          fiber: n('g-fiber') || 30, sugar: n('g-sugar') || 55,
          water: n('g-water') || 3000, targetWeight: n('g-target') || 80
        };
      });
      toast('Objectifs enregistrés');
    });
  }
};

/* ═══════════════ DONNÉES ═══════════════ */

function download(filename, rows) {
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const dataView = {
  render() {
    return `
    <header class="page">
      <div><h2 class="serif">Données</h2><p>Elles sont à toi — emporte-les quand tu veux</p></div>
    </header>

    <div class="grid g2">
      <section class="card">
        <h3>Exporter</h3>
        <p class="sub">Des fichiers CSV lisibles par n'importe quel tableur</p>
        <div class="actions">
          <button class="act" data-export="meals">Repas</button>
          <button class="act ghost" data-export="weight">Poids</button>
          <button class="act ghost" data-export="supplements">Compléments</button>
        </div>
        <p class="note">Le serveur Nutrition MCP propose lui aussi un export complet en archive ZIP — il suffit de le demander à Claude.</p>
      </section>

      <section class="card">
        <h3>Où vivent tes données</h3>
        <p class="sub">Ce que cette application fait, et ce qu'elle ne fait pas</p>
        <p class="prose">Tout reste dans ton navigateur. Rien n'est envoyé sur un serveur, et aucun compte n'est nécessaire. Vider les données du site les efface définitivement, d'où l'intérêt d'exporter de temps en temps.</p>
        <p class="prose">Cette application ne se connecte pas au serveur Nutrition MCP : une page ouverte dans un navigateur ne peut pas s'authentifier à ta place. Ce que tu dis à Claude est enregistré là-bas ; ce que tu saisis ici reste ici.</p>
        <div class="actions" style="margin-top:16px">
          <button class="act ghost" id="resetAll">Repartir des données d'origine</button>
        </div>
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
            ['date', 'heure', 'type', 'description', 'kcal', 'proteines_g', 'glucides_g', 'lipides_g', 'fibres_g', 'sucre_g', 'cafeine_mg'],
            ...s.meals.map(m => [m.date, m.time, m.type, `"${m.desc.replace(/"/g, '""')}"`,
              m.kcal, m.protein, m.carbs, m.fat, m.fiber, m.sugar, m.caffeine])
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

    root.querySelector('#resetAll').addEventListener('click', () => {
      if (confirm('Effacer tes saisies et repartir des données d\'origine ?')) {
        reset();
        toast('Données réinitialisées');
      }
    });
  }
};
