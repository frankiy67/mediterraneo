/**
 * Calendrier — la semaine d'un coup d'œil, puis le détail d'une journée
 * comme un agenda : les repas et les séances posés sur une ligne du temps.
 */
import { mealType, plannedFor } from '../config.js';
import {
  getState, today, mealsOn, sessionsOn, totalsOn, energyOn, weightAt,
  quests, isLogged, addSession, removeMeal, removeSession, plannedSession, weekXp
} from '../store.js';
import { activity } from '../energy.js';
import { esc, fr, miniRing, bar, ring, balanceBlock, run, icon, empty } from '../ui.js';
import {
  weekOf, weekLabel, addDays, dayIndex, dayNum, DAY_LETTERS, DAY_NAMES,
  todayISO, isFuture, relativeLabel, longDate
} from '../date.js';
import { sportPicker, mountSportPicker } from './sport.js';

/** Les dates de semaine et de jour transitent par l'URL : #/week/2026-09-05 */
const safeDate = value => (/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : todayISO());

/* ═══════════════ SEMAINE ═══════════════ */

function dayPill(date, anchor) {
  const { goals } = getState();
  const t = totalsOn(date);
  const energy = energyOn(date);
  const idx = dayIndex(date);
  const classes = [
    'daypill',
    date === todayISO() ? 'today' : '',
    date === anchor && date !== todayISO() ? 'sel' : '',
    isFuture(date) ? 'future' : ''
  ].filter(Boolean).join(' ');

  const dot = !isLogged(date) ? '' : energy.balance < 0 ? 'ok' : 'over';
  const colour = t.kcal > goals.kcal ? 'var(--red-ink)' : 'var(--brand)';

  return `<a class="${classes}" href="#/day/${date}"
             aria-label="${esc(longDate(date))} — ${fr.format(t.kcal)} kcal">
    <span class="dow">${DAY_LETTERS[idx]}</span>
    ${miniRing(t.kcal, goals.kcal, colour)}
    <span class="num">${dayNum(date)}</span>
    <span class="dot ${dot}"></span>
  </a>`;
}

function agendaRow(date) {
  const meals = mealsOn(date);
  const sessions = sessionsOn(date);
  const energy = energyOn(date);
  const planned = plannedFor(dayIndex(date));
  const idx = dayIndex(date);

  const chips = [];
  if (meals.length) chips.push(`<span class="chip food">🍽️ ${meals.length} repas · ${fr.format(energy.intake)} kcal</span>`);
  for (const s of sessions) {
    const a = activity(s.kind);
    chips.push(`<span class="chip sport">${a.emoji} ${esc(s.label || a.label)} ${s.minutes} min</span>`);
  }
  if (!sessions.length) {
    for (const p of planned) {
      const a = activity(p.kind);
      chips.push(`<span class="chip plan">${a.emoji} ${esc(p.label)} — prévu</span>`);
    }
  }
  if (!chips.length) chips.push('<span class="chip">Rien d’enregistré</span>');

  const balanceClass = !isLogged(date) ? 'flat' : energy.balance < 0 ? 'down' : 'up';
  const balanceText = isLogged(date)
    ? `${energy.balance > 0 ? '+' : ''}${fr.format(energy.balance)}`
    : '—';

  return `<a class="agendaday ${date === todayISO() ? 'today' : ''}" href="#/day/${date}">
    <span class="date"><b>${dayNum(date)}</b><span>${DAY_NAMES[idx].slice(0, 3)}</span></span>
    <span>
      <span class="title">${date === todayISO() ? "Aujourd'hui" : DAY_NAMES[idx]}</span>
      <span class="chips">${chips.join('')}</span>
    </span>
    <span class="bal ${balanceClass}">${balanceText}<small>kcal net</small></span>
  </a>`;
}

export const weekView = {
  render(params = {}) {
    const anchor = safeDate(params.date);
    const days = weekOf(anchor);
    const { goals } = getState();

    const totals = days.reduce((acc, d) => {
      const e = energyOn(d);
      if (isLogged(d)) {
        acc.intake += e.intake;
        acc.out += e.out;
        acc.days++;
      }
      acc.sport += e.sport;
      acc.minutes += e.minutes;
      return acc;
    }, { intake: 0, out: 0, sport: 0, minutes: 0, days: 0 });

    const net = totals.intake - totals.out;
    const avg = totals.days ? Math.round(totals.intake / totals.days) : 0;
    const xp = weekXp(anchor);

    return `
    <header class="page">
      <div>
        <h2>📅 Ma semaine</h2>
        <p>${esc(weekLabel(anchor))}</p>
      </div>
      <div class="actions" style="margin:0">
        <button class="iconbtn nav" data-week="${addDays(anchor, -7)}" aria-label="Semaine précédente">${icon.left}</button>
        <button class="btn sm ghost" data-week="${todayISO()}">Cette semaine</button>
        <button class="iconbtn nav" data-week="${addDays(anchor, 7)}" aria-label="Semaine suivante">${icon.right}</button>
      </div>
    </header>

    <div class="weekstrip">${days.map(d => dayPill(d, anchor)).join('')}</div>

    <div class="grid g4 tight mb">
      <section class="card"><h3>Apport</h3>
        <p class="kpi">${fr.format(totals.intake)}<small>kcal</small></p>
        <p class="delta flat">${totals.days} jour${totals.days > 1 ? 's' : ''} enregistré${totals.days > 1 ? 's' : ''}</p></section>
      <section class="card"><h3>Dépense</h3>
        <p class="kpi">${fr.format(totals.out)}<small>kcal</small></p>
        <p class="delta flat">dont ${fr.format(totals.sport)} de sport</p></section>
      <section class="card"><h3>Balance</h3>
        <p class="kpi" style="color:${net < 0 ? 'var(--green-ink)' : 'var(--red-ink)'}">${net > 0 ? '+' : ''}${fr.format(net)}<small>kcal</small></p>
        <p class="delta ${net < 0 ? 'down' : 'up'}">${net < 0 ? `≈ ${(Math.abs(net) / 7700).toFixed(2)} kg de gras` : 'au-dessus de la dépense'}</p></section>
      <section class="card"><h3>Sport</h3>
        <p class="kpi">${Math.round(totals.minutes / 60 * 10) / 10}<small>h</small></p>
        <p class="delta flat">${xp} points cette semaine</p></section>
    </div>

    <section class="card mb">
      <h3>Jour par jour</h3>
      <p class="sub">Touche une journée pour voir le détail</p>
      <div class="agenda">${days.map(agendaRow).join('')}</div>
    </section>

    <section class="card">
      <h3>Moyenne quotidienne</h3>
      <p class="sub">Sur les jours réellement enregistrés</p>
      ${bar({ label: 'Calories', value: avg, goal: goals.kcal, color: avg > goals.kcal ? 'var(--red-ink)' : 'var(--brand)', unit: 'kcal' })}
      <p class="note">Un déficit de 7 700 kcal correspond à environ un kilo de graisse. Une semaine à −3 500 kcal, c'est un demi-kilo : c'est le rythme visé, et c'est celui qui préserve le muscle.</p>
    </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-week]').forEach(btn => {
      btn.addEventListener('click', () => { location.hash = '#/week/' + btn.dataset.week; });
    });
  }
};

/* ═══════════════ JOURNÉE ═══════════════ */

function timelineItems(date) {
  const items = [];

  for (const m of mealsOn(date)) {
    items.push({
      time: m.time, kind: 'meal',
      html: `<div class="tl-card">
        <span class="hour">${esc(m.time)}</span>
        <span class="ic" aria-hidden="true">${m.isSupplement ? '💊' : mealType(m.type).emoji}</span>
        <div class="body">
          <b>${esc(m.desc)}</b>
          <em>${esc(mealType(m.type).label)} · ${m.protein} g prot · ${m.carbs} g gluc · ${m.fat} g lip</em>
        </div>
        <span class="amount">${fr.format(m.kcal)}</span>
        <button class="iconbtn" data-remove="${esc(m.id)}" aria-label="Supprimer ${esc(m.desc)}">${icon.trash}</button>
      </div>`
    });
  }

  for (const s of sessionsOn(date)) {
    const a = activity(s.kind);
    items.push({
      time: s.time, kind: 'sport',
      html: `<div class="tl-card">
        <span class="hour">${esc(s.time)}</span>
        <span class="ic" aria-hidden="true">${a.emoji}</span>
        <div class="body"><b>${esc(s.label || a.label)}</b><em>${s.minutes} minutes · MET ${a.met}</em></div>
        <span class="amount">−${fr.format(s.kcal)}</span>
        <button class="iconbtn" data-rmsession="${esc(s.id)}" aria-label="Supprimer cette séance">${icon.trash}</button>
      </div>`
    });
  }

  // Séances prévues par la semaine type, tant qu'aucune séance n'est enregistrée.
  const logged = sessionsOn(date);
  if (!logged.length) {
    for (const p of plannedFor(dayIndex(date))) {
      const a = activity(p.kind);
      items.push({
        time: p.time || '18:00', kind: 'sport planned',
        html: `<div class="tl-card">
          <span class="hour">${esc(p.time || '18:00')}</span>
          <span class="ic" aria-hidden="true">${a.emoji}</span>
          <div class="body"><b>${esc(p.label)} — prévu</b><em>${p.minutes} minutes au programme</em></div>
          <button class="btn sm" data-doplan="${esc(JSON.stringify(p))}">${icon.check} Fait</button>
        </div>`
      });
    }
  }

  return items.sort((a, b) => a.time.localeCompare(b.time));
}

export const dayView = {
  render(params = {}) {
    const date = safeDate(params.date);
    const { goals } = getState();
    const t = totalsOn(date);
    const energy = energyOn(date);
    const q = quests(date);
    const kg = weightAt(date);
    const supp = Object.values(getState().supplements[date] || {}).filter(Boolean).length;

    const items = timelineItems(date);
    const timeline = items.length ? `<div class="timeline">${items.map(i => `
      <div class="tl-item ${i.kind}">
        <span class="bullet"></span>
        ${i.html}
      </div>`).join('')}</div>`
      : empty('🗓️', 'Journée vide. Ajoute un repas ou une séance.');

    return `
    <header class="page">
      <div>
        <h2>${esc(relativeLabel(date))}</h2>
        <p>${esc(DAY_NAMES[dayIndex(date)])} · ${kg} kg${plannedFor(dayIndex(date)).length ? ' · ' + esc(plannedFor(dayIndex(date)).map(p => p.label).join(', ')) + ' au programme' : ''}</p>
      </div>
      <div class="actions" style="margin:0">
        <button class="iconbtn nav" data-day="${addDays(date, -1)}" aria-label="Jour précédent">${icon.left}</button>
        <a class="btn sm ghost" href="#/week/${date}">📅 Semaine</a>
        <button class="iconbtn nav" data-day="${addDays(date, 1)}" aria-label="Jour suivant">${icon.right}</button>
      </div>
    </header>

    <section class="card mb">
      <h3>⚖️ Balance du jour</h3>
      <p class="sub">Apport contre dépense</p>
      ${balanceBlock(energy)}
      <p class="note">Dépense = ${fr.format(energy.base)} kcal de base (métabolisme et vie courante à ${kg} kg)
      ${energy.sport ? `+ ${fr.format(energy.sport)} kcal de sport sur ${energy.minutes} min` : 'sans sport enregistré'}.</p>
    </section>

    <section class="card mb">
      <h3>🗓️ Le déroulé de la journée</h3>
      <p class="sub">${mealsOn(date).length} repas · ${sessionsOn(date).length} séance${sessionsOn(date).length > 1 ? 's' : ''}</p>
      ${timeline}
      <div class="actions">
        <a class="btn sm" href="#/scan">${icon.scan} Scanner</a>
        <a class="btn sm blue" href="#/journal/${date}">${icon.plus} Ajouter un repas</a>
        <a class="btn sm ghost" href="#/photo">🍽️ Photo</a>
      </div>
    </section>

    <div class="grid g2 mb">
      <section class="card">
        <h3>🥗 Nutrition</h3>
        <p class="sub">Objectifs du ${esc(relativeLabel(date).toLowerCase())}</p>
        <div class="rings mb">
          ${ring(t.protein, goals.protein, 'Protéines', 'var(--blue)')}
          ${ring(t.carbs, goals.carbs, 'Glucides', 'var(--orange)')}
          ${ring(t.fat, goals.fat, 'Lipides', 'var(--purple)')}
        </div>
        ${bar({ label: 'Calories', value: t.kcal, goal: goals.kcal, color: t.kcal > goals.kcal ? 'var(--red-ink)' : 'var(--brand)', unit: 'kcal' })}
        ${bar({ label: 'Fibres', value: t.fiber, goal: goals.fiber, color: 'var(--teal)' })}
        ${bar({ label: 'Sucre', value: t.sugar, goal: goals.sugar, color: t.sugar > goals.sugar ? 'var(--red-ink)' : 'var(--yellow)' })}
      </section>

      <section class="card">
        <h3>🎯 Objectifs</h3>
        <p class="sub">${q.done} sur ${q.total} · ${q.xp} points</p>
        <div class="quests">${q.list.map(item => `
          <div class="quest ${item.done ? 'done' : ''}">
            <span class="ic" aria-hidden="true">${item.emoji}</span>
            <div class="body"><b>${esc(item.label)}</b></div>
            <span class="mark">${icon.check}</span>
          </div>`).join('')}</div>
        <p class="note">Compléments cochés ce jour-là : ${supp} sur 8.</p>
      </section>
    </div>

    ${sportPicker(date, { title: '🔥 Ajouter une séance à cette journée' })}`;
  },

  mount(root) {
    root.querySelectorAll('[data-day]').forEach(btn => {
      btn.addEventListener('click', () => { location.hash = '#/day/' + btn.dataset.day; });
    });

    root.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => run(removeMeal(btn.dataset.remove),
        { ok: 'Repas supprimé', fail: 'Suppression impossible — vérifie ta connexion' }));
    });

    root.querySelectorAll('[data-rmsession]').forEach(btn => {
      btn.addEventListener('click', () => run(removeSession(btn.dataset.rmsession),
        { ok: 'Séance supprimée', fail: 'Suppression impossible — vérifie ta connexion' }));
    });

    root.querySelectorAll('[data-doplan]').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = location.hash.split('/')[2] || today();
        const planned = JSON.parse(btn.dataset.doplan);
        run(addSession(plannedSession(date, planned)), { ok: 'Séance enregistrée · +25 points' });
      });
    });

    mountSportPicker(root);
  }
};
