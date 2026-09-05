/**
 * Point d'entrée : authentification, routage par ancre, synchronisation.
 */
import { getState, subscribe, setUser, today } from './store.js';
import { currentUser, onAuthChange, subscribeRealtime } from './data.js';
import { PROFILE } from './config.js';
import { authView } from './auth.js';
import {
  todayView, journalView, supplementsView, trendsView,
  weightView, trainingView, planView, settingsView, dataView
} from './views.js';
import { photoView } from './photo.js';

const ROUTES = {
  today: todayView,
  photo: photoView,
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
const shell = document.querySelector('.shell');

let unsubscribeRealtime = null;

function currentRoute() {
  const name = location.hash.replace(/^#\//, '');
  return ROUTES[name] ? name : DEFAULT_ROUTE;
}

function render() {
  const { user, ready } = getState();

  // non connecté : écran d'authentification plein cadre
  if (!user) {
    shell.classList.add('signed-out');
    main.innerHTML = authView.render();
    authView.mount(main);
    document.title = 'Mediterráneo';
    return;
  }

  shell.classList.remove('signed-out');

  if (!ready) {
    main.innerHTML = '<p class="empty" style="padding:60px 0">Chargement de tes données…</p>';
    return;
  }

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

function handleUser(user) {
  setUser(user);

  unsubscribeRealtime?.();
  unsubscribeRealtime = null;

  if (user) {
    // une saisie faite sur un autre appareil rafraîchit celui-ci
    unsubscribeRealtime = subscribeRealtime(user.id, () => {
      import('./store.js').then(m => m.loadAll());
    });
  }
}

async function boot() {
  const sub = document.getElementById('brandSub');
  if (sub) sub.textContent = `${PROFILE.city} · ${PROFILE.startWeight} → 80 kg`;

  window.addEventListener('hashchange', () => {
    render();
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  });

  subscribe(render);
  onAuthChange(handleUser);

  handleUser(await currentUser());

  if (!location.hash) location.hash = '#/' + DEFAULT_ROUTE;
  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

boot();
