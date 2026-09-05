/**
 * Progression — tendances de nutrition et trajectoire de poids.
 */
import { PROFILE } from '../config.js';
import {
  getState, dailySeries, loggedDays, weightSeries, movingAverage, energyOn, streak, today
} from '../store.js';
import { esc, fr, bar, lineChart, weightChart, empty } from '../ui.js';
import { addDays } from '../date.js';

let trendWindow = 7;

export const trendsView = {
  render() {
    const { goals } = getState();
    const series = dailySeries(trendWindow);
    const avg = key => Math.round(series.reduce((t, d) => t + d[key], 0) / (series.length || 1));

    const month = dailySeries(30);
    const mean = list => Math.round(list.reduce((t, d) => t + d.kcal, 0) / (list.length || 1));
    const weekend = month.filter(d => d.dow >= 5);
    const weekday = month.filter(d => d.dow < 5);
    const avgWe = mean(weekend);
    const avgWd = mean(weekday);
    const fiberShort = month.filter(d => d.fiber < goals.fiber).length;

    // Balance réelle sur la période : la somme de ce qui a été enregistré.
    const balance = series.reduce((t, d) => t + energyOn(d.date).balance, 0);

    if (!series.length) return `
      <header class="page">
        <div><h2>📈 Tendances</h2><p>Les moyennes arrivent avec les premiers jours</p></div>
      </header>
      <section class="card">
        ${empty('📈', 'Aucun jour enregistré sur cette période.')}
        <p class="prose" style="text-align:center">Enregistre tes repas quelques jours :
        les courbes se construisent avec tes vraies données, jamais avec des valeurs inventées.</p>
        <div class="actions" style="justify-content:center">
          <a class="btn" href="#/scan">Scanner un produit</a>
          <a class="btn ghost" href="#/journal">Ajouter à la main</a>
        </div>
      </section>`;

    const card = (title, value, unit, delta, invert = false) => {
      const cls = delta === 0 ? 'flat' : (invert ? (delta < 0 ? 'up' : 'down') : (delta > 0 ? 'up' : 'down'));
      return `<section class="card">
        <h3>${title}</h3>
        <p class="kpi">${fr.format(value)}<small>${unit}</small></p>
        <p class="delta ${cls}">${delta > 0 ? '+' : ''}${delta} ${unit} vs objectif</p>
      </section>`;
    };

    return `
    <header class="page">
      <div><h2>📈 Tendances</h2><p>Ce que la moyenne raconte, et qu'une journée ne dit jamais</p></div>
      <div class="seg" role="group" aria-label="Période">
        ${[7, 14, 30].map(d => `<button data-window="${d}" aria-pressed="${d === trendWindow}">${d} j</button>`).join('')}
      </div>
    </header>

    <div class="grid g4 tight mb">
      ${card('Calories / jour', avg('kcal'), 'kcal', avg('kcal') - goals.kcal)}
      ${card('Protéines / jour', avg('protein'), 'g', avg('protein') - goals.protein, true)}
      ${card('Fibres / jour', avg('fiber'), 'g', avg('fiber') - goals.fiber, true)}
      <section class="card">
        <h3>Série en cours</h3>
        <p class="kpi">${streak()}<small>jours</small></p>
        <p class="delta flat">${loggedDays(trendWindow)} / ${trendWindow} jours suivis</p>
      </section>
    </div>

    <section class="card mb">
      <h3>Calories par jour</h3>
      <p class="sub">La ligne orange est ton objectif de ${fr.format(goals.kcal)} kcal</p>
      ${lineChart(series, 'kcal', goals.kcal, 'var(--orange)')}
    </section>

    <div class="grid g2">
      <section class="card">
        <h3>Protéines par jour</h3>
        <p class="sub">Objectif ${goals.protein} g — le levier qui protège ton muscle</p>
        ${lineChart(series, 'protein', goals.protein, 'var(--blue)')}
      </section>
      <section class="card">
        <h3>Ce qui ressort</h3>
        <p class="sub">Lecture de tes ${month.length} journée${month.length > 1 ? 's' : ''} enregistrée${month.length > 1 ? 's' : ''}</p>
        ${weekend.length && weekday.length ? `
          ${bar({ label: 'Week-end', value: avgWe, goal: Math.max(avgWe, avgWd, goals.kcal), color: 'var(--red-ink)', unit: 'kcal' })}
          ${bar({ label: 'Semaine', value: avgWd, goal: Math.max(avgWe, avgWd, goals.kcal), color: 'var(--blue)', unit: 'kcal' })}
          <p class="prose" style="margin-top:14px">Le samedi et le dimanche pèsent ${Math.abs(avgWe - avgWd)} kcal
          ${avgWe >= avgWd ? 'de plus' : 'de moins'} par jour que le reste de la semaine.</p>`
        : '<p class="prose">La comparaison semaine / week-end apparaîtra quand les deux auront été enregistrés.</p>'}
        <p class="prose">Les fibres passent sous les ${goals.fiber} g sur ${fiberShort} de ces journées.
        Légumineuses et légumes à chaque repas règlent cela sans effort.</p>
        <p class="prose">Sur ${trendWindow} jours, ta balance cumulée est de
        <b style="color:${balance < 0 ? 'var(--green-ink)' : 'var(--red-ink)'}">${balance > 0 ? '+' : ''}${fr.format(balance)} kcal</b>,
        soit environ ${(Math.abs(balance) / 7700).toFixed(2)} kg de gras ${balance < 0 ? 'perdus' : 'pris'}.</p>
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

export const weightView = {
  render() {
    const { goals } = getState();
    const points = weightSeries();
    if (!points.length) return `
      <header class="page"><div><h2>⚖️ Poids</h2><p>Cible ${goals.targetWeight} kg</p></div></header>
      <section class="card">
        ${empty('⚖️', 'Aucune pesée pour l’instant.')}
        <div class="actions" style="justify-content:center"><a class="btn" href="#/journal">Ajouter ma première pesée</a></div>
      </section>`;

    const kgs = points.map(p => p.kg);
    const average = movingAverage(kgs, 7);
    const last = points.at(-1);
    const first = points[0];
    const ma7 = average.at(-1);
    const toGo = +(last.kg - goals.targetWeight).toFixed(1);
    const weeks = Math.max(1, Math.ceil(toGo / 0.5));
    const eta = addDays(today(), weeks * 7);
    const delta = +(last.kg - first.kg).toFixed(1);

    return `
    <header class="page">
      <div><h2>⚖️ Poids</h2><p>${PROFILE.startWeight} kg au départ · cible ${goals.targetWeight} kg</p></div>
      <a class="btn sm blue" href="#/journal">Ajouter une pesée</a>
    </header>

    <div class="grid g4 tight mb">
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
        <p class="kpi" style="font-size:var(--t-xl)">${esc(new Date(eta + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}</p>
        <p class="delta flat">À 0,5 kg par semaine</p></section>
    </div>

    <section class="card">
      <h3>Trajectoire</h3>
      <p class="sub">Points : pesées · ligne bleue : moyenne 7 jours · ligne orange : cible</p>
      ${weightChart(points, average, goals.targetWeight)}
      <p class="note">Perdre un demi-kilo par semaine avec neuf heures de sport et ${goals.protein} g de protéines,
      c'est perdre du gras en gardant le muscle. Aller plus vite reviendrait à sacrifier ta détente au volley.</p>
    </section>`;
  }
};
