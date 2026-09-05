/**
 * Point d'entrée : routage par ancre, rendu et amorçage.
 */
import { hydrate, subscribe } from './store.js';
import { PROFILE } from './config.js';
import {
  todayView, journalView, supplementsView, trendsView,
  weightView, trainingView, planView, settingsView, dataView
} from './views.js';

const ROUTES = {
  today: todayView,
  journal: journalView,
  supplements: supplementsView,
  trends: trendsView,
  weight: weightView,
  training: trainingView,
  plan: planView,
  settings: settingsView,
  data: dataView
};

const DEFAULT_ROUTE = 'today';
const main = document.getElementById('main');

function currentRoute() {
  const name = location.hash.replace(/^#\//, '');
  return ROUTES[name] ? name : DEFAULT_ROUTE;
}

function render() {
  const name = currentRoute();
  const view = ROUTES[name];

  main.innerHTML = view.render();
  view.mount?.(main);

  document.querySelectorAll('nav a').forEach(a => {
    if (a.dataset.route === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  document.title = `Mediterráneo — ${name}`;
}

function boot() {
  hydrate();

  const sub = document.getElementById('brandSub');
  if (sub) sub.textContent = `${PROFILE.city} · ${PROFILE.startWeight} → 80 kg`;

  window.addEventListener('hashchange', () => {
    render();
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  });

  window.addEventListener('rerender', render);
  subscribe(render);

  if (!location.hash) location.hash = '#/' + DEFAULT_ROUTE;
  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* hors ligne indisponible : l'application fonctionne quand même */
      });
    });
  }
}

boot();
