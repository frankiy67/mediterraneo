/**
 * Programme — semaine type d'entraînement, menus et liste de courses.
 */
import { WEEK_PLAN, GYM_SESSION, MEAL_PLAN, SHOPPING } from '../config.js';
import { sessionsOn, weightAt } from '../store.js';
import { ACTIVITIES, sessionBurn, baseBurn, bmr } from '../energy.js';
import { esc, fr, icon } from '../ui.js';
import { weekOf, todayISO, dayIndex } from '../date.js';

export const trainingView = {
  render() {
    const kg = weightAt(todayISO());
    const week = weekOf(todayISO());
    const doneMinutes = week.reduce((t, d) => t + sessionsOn(d).reduce((n, s) => n + s.minutes, 0), 0);
    const doneKcal = week.reduce((t, d) => t + sessionsOn(d).reduce((n, s) => n + s.kcal, 0), 0);

    const plannedMinutes = WEEK_PLAN.reduce((t, d) =>
      t + d.sessions.reduce((n, s) => n + (s.minutes || 0), 0), 0);

    const days = WEEK_PLAN.map((d, i) => {
      const date = week[i];
      const logged = sessionsOn(date);
      return `<div class="day">
        <b>${d.day}</b>
        ${d.sessions.map(s => `<div class="sess s-${s.kind}">${esc(s.label)}${s.minutes ? `<br>${s.minutes} min` : ''}</div>`).join('')}
        ${logged.length ? `<div class="sess s-free">✅ ${logged.reduce((t, s) => t + s.minutes, 0)} min faites</div>` : ''}
      </div>`;
    }).join('');

    const table = ACTIVITIES.filter(a => a.kind !== 'rest').map(a => `
      <div class="row-item">
        <span class="ic" aria-hidden="true">${a.emoji}</span>
        <div class="body"><b>${esc(a.label)}</b><em>MET ${a.met} — intensité de l'effort</em></div>
        <div class="kcal">${fr.format(sessionBurn(a.met, 60, kg))}<span style="font-size:var(--t-xs);color:var(--ink-faint)"> /h</span></div>
      </div>`).join('');

    return `
    <header class="page">
      <div><h2>🏐 Entraînement</h2><p>Deux volley, deux gym, deux sessions libres</p></div>
      <a class="btn sm" href="#/journal">${icon.plus} Enregistrer une séance</a>
    </header>

    <section class="card mb">
      <h3>Semaine type</h3>
      <p class="sub">Un jour sans charge, et ce n'est pas une faiblesse</p>
      <div class="week">${days}</div>
    </section>

    <div class="grid g3 tight mb">
      <section class="card"><h3>Prévu</h3><p class="kpi">${Math.round(plannedMinutes / 60)}<small>h / semaine</small></p><p class="delta flat">Six séances</p></section>
      <section class="card"><h3>Fait cette semaine</h3><p class="kpi">${Math.round(doneMinutes / 60 * 10) / 10}<small>h</small></p><p class="delta ${doneMinutes ? 'down' : 'flat'}">${fr.format(doneKcal)} kcal brûlées</p></section>
      <section class="card"><h3>Dépense de base</h3><p class="kpi">${fr.format(baseBurn(kg))}<small>kcal / jour</small></p><p class="delta flat">Métabolisme ${fr.format(bmr(kg))} × 1,35</p></section>
    </div>

    <section class="card mb">
      <h3>Combien brûle une heure ?</h3>
      <p class="sub">Estimations pour ${kg} kg — formule MET × 3,5 × poids ÷ 200 × minutes</p>
      ${table}
      <p class="note">Le MET compare l'effort au repos : marcher vaut 3,5 fois le repos, courir près de 10.
      Ces valeurs viennent du Compendium of Physical Activities. Une montre cardio sera plus juste :
      la valeur reste modifiable au moment d'enregistrer la séance.</p>
    </section>

    <section class="card">
      <h3>La séance de gym qui compte</h3>
      <p class="sub">Full-body, une heure, en cherchant à progresser un peu chaque semaine</p>
      ${GYM_SESSION.map(([name, sets]) => `
        <div class="row-item"><div class="body"><b>${esc(name)}</b><em>${esc(sets)}</em></div></div>`).join('')}
      <p class="note">En déficit calorique, la musculation ne sert pas à brûler des calories — le volley s'en charge.
      Elle donne à ton corps une raison de garder son muscle plutôt que de le consommer.</p>
    </section>`;
  }
};

export const planView = {
  render() {
    const idx = dayIndex(todayISO());
    const days = MEAL_PLAN.map((d, i) => `
      <section class="card ${i === idx ? 'blue' : ''}">
        <h3>${d.day}${i === idx ? ' · aujourd’hui' : ''}</h3>
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
      <div><h2>🥗 Menus de la semaine</h2><p>Plus de glucides les jours d'entraînement, autant de protéines partout</p></div>
      <button class="btn sm ghost" id="printPlan">Imprimer</button>
    </header>

    <div class="grid g2 mb">${days}</div>

    <header class="page"><div><h2>🛒 Liste de courses</h2><p>Une semaine complète</p></div></header>
    <div class="grid g3">${lists}</div>`;
  },

  mount(root) {
    root.querySelector('#printPlan')?.addEventListener('click', () => window.print());
  }
};
