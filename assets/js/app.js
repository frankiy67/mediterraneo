/**
 * Point d'entrée : authentification, routage par ancre, synchronisation.
 * Une route peut porter un paramètre : #/day/2026-09-05
 */
import { getState, subscribe, setUser, loadAll } from './store.js';
import { currentUser, onAuthChange, subscribeRealtime } from './data.js';
import { authView } from './auth.js';
import {
  todayView, weekView, dayView, addView, scanView, journalView, trendsView,
  weightView, trainingView, planView, supplementsView, settingsView, dataView, moreView
} from './views.js';
import { photoView } from './photo.js';

const ROUTES = {
  today: { view: todayView, title: "Aujourd'hui", tab: 'today' },
  week: { view: weekView, title: 'Ma semaine', tab: 'week' },
  day: { view: dayView, title: 'Journée', tab: 'week' },
  add: { view: addView, title: 'Ajouter', tab: 'add' },
  scan: { view: scanView, title: 'Scanner', tab: 'add' },
  photo: { view: photoView, title: 'Photo du repas', tab: 'add' },
  journal: { view: journalView, title: 'Saisie', tab: 'add' },
  trends: { view: trendsView, title: 'Tendances', tab: 'trends' },
  weight: { view: weightView, title: 'Poids', tab: 'trends' },
  training: { view: trainingView, title: 'Entraînement', tab: 'more' },
  plan: { view: planView, title: 'Menus', tab: 'more' },
  supplements: { view: supplementsView, title: 'Compléments', tab: 'more' },
  settings: { view: settingsView, title: 'Objectifs', tab: 'more' },
  data: { view: dataView, title: 'Données', tab: 'more' },
  more: { view: moreView, title: 'Plus', tab: 'more' }
};

const DEFAULT_ROUTE = 'today';
const main = document.getElementById('main');
const shell = document.querySelector('.shell');

let unsubscribeRealtime = null;
let current = null;

function parseHash() {
  const [name, param] = location.hash.replace(/^#\/?/, '').split('/');
  return ROUTES[name] ? { name, param } : { name: DEFAULT_ROUTE, param: undefined };
}

function leaveCurrent() {
  current?.unmount?.();
  current = null;
}

function render() {
  const { user, ready, error } = getState();

  // non connecté : écran d'authentification plein cadre
  if (!user) {
    leaveCurrent();
    shell.classList.add('signed-out');
    document.body.classList.add('signed-out');
    main.innerHTML = authView.render();
    authView.mount(main);
    document.title = 'Mediterráneo';
    return;
  }

  shell.classList.remove('signed-out');
  document.body.classList.remove('signed-out');

  if (!ready) {
    leaveCurrent();
    main.innerHTML = '<div class="loading"><i aria-hidden="true"></i>Chargement de tes données…</div>';
    return;
  }

  const { name, param } = parseHash();
  const route = ROUTES[name];
  const params = { date: param };

  if (current && current !== route.view) leaveCurrent();
  current = route.view;

  main.innerHTML = (error ? `<p class="prose" style="color:var(--red-ink);margin-bottom:12px">⚠️ ${error}</p>` : '')
    + route.view.render(params);
  route.view.mount?.(main, params);

  document.querySelectorAll('[data-route]').forEach(link => {
    if (link.dataset.route === name || link.dataset.route === route.tab) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  document.title = `Mediterráneo — ${route.title}`;
}

function handleUser(user) {
  setUser(user);

  unsubscribeRealtime?.();
  unsubscribeRealtime = null;

  if (user) {
    // une saisie faite sur un autre appareil rafraîchit celui-ci
    unsubscribeRealtime = subscribeRealtime(user.id, () => loadAll());
  }
}

async function boot() {
  window.addEventListener('hashchange', () => {
    render();
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  });

  window.addEventListener('rerender', render);
  subscribe(render);
  onAuthChange(handleUser);

  handleUser(await currentUser());

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
