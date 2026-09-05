/**
 * Scanner — code-barres et recherche Open Food Facts.
 *
 * Open Food Facts est une base de données alimentaire ouverte et collaborative :
 * pas de clé d'API, pas de compte, et rien qui parte d'ici sinon le code lu.
 */
import { fetchProduct, searchProducts, toEntry } from '../off.js';
import { startScanner, hasCamera } from '../scanner.js';
import { addMeal, rememberProduct, getState, today } from '../store.js';
import { MEAL_TYPES, mealType, guessMealType, PORTIONS } from '../config.js';
import { esc, fr, toast, run, icon, empty } from '../ui.js';

/* Écran local : ce qui est affiché ne concerne que cette vue. */
let ui = { product: null, grams: 100, type: guessMealType(), busy: '', error: '', results: null, query: '' };
let stopCamera = null;

const rerender = () => window.dispatchEvent(new CustomEvent('rerender'));

function reset() {
  ui = { product: null, grams: 100, type: guessMealType(), busy: '', error: '', results: null, query: '' };
}

async function lookup(code) {
  ui.busy = 'Recherche du produit…';
  ui.error = '';
  ui.results = null;
  rerender();
  try {
    const product = await fetchProduct(code);
    if (!product) {
      ui.error = `Aucun produit ne correspond au code ${code}. Tu peux le chercher par son nom, ou le saisir à la main.`;
    } else {
      ui.product = product;
      ui.grams = product.servingG || 100;
      rememberProduct(product);
    }
  } catch {
    ui.error = "Open Food Facts est injoignable. Vérifie ta connexion, ou saisis le produit à la main.";
  } finally {
    ui.busy = '';
    rerender();
  }
}

async function search(query) {
  ui.busy = 'Recherche…';
  ui.error = '';
  ui.query = query;
  rerender();
  try {
    const results = await searchProducts(query);
    ui.results = results;
    if (!results.length) ui.error = `Rien trouvé pour « ${query} ».`;
  } catch {
    ui.error = "Open Food Facts est injoignable. Vérifie ta connexion.";
  } finally {
    ui.busy = '';
    rerender();
  }
}

const thumb = p => p.image
  ? `<img src="${esc(p.image)}" alt="" loading="lazy">`
  : `<span class="ph" aria-hidden="true">🥫</span>`;

const nutriscore = grade => /^[a-e]$/.test(grade)
  ? `<span class="nutriscore ns-${grade}" title="Nutri-Score ${grade.toUpperCase()}">${grade}</span>` : '';

function productCard(p) {
  const entry = toEntry(p, ui.grams);
  const portions = PORTIONS.map(g =>
    `<button type="button" class="choice" data-grams="${g}" aria-pressed="${g === ui.grams}">${g} g</button>`).join('');
  const serving = p.servingG
    ? `<button type="button" class="choice" data-grams="${p.servingG}" aria-pressed="${p.servingG === ui.grams}">1 portion (${p.servingG} g)</button>`
    : '';
  const types = Object.entries(MEAL_TYPES).map(([key, meta]) =>
    `<button type="button" class="choice" data-type="${key}" aria-pressed="${key === ui.type}">${meta.emoji} ${meta.label}</button>`).join('');

  return `<section class="card mb">
    <div class="product mb">
      ${thumb(p)}
      <div class="body" style="flex:1;min-width:0">
        <b>${esc(p.name)}</b>
        <em>${esc(p.brand || 'Marque inconnue')}${p.quantity ? ' · ' + esc(p.quantity) : ''} · ${esc(p.code)}</em>
      </div>
      ${nutriscore(p.nutriscore)}
    </div>

    <label>Quantité</label>
    <div class="choices mb">${serving}${portions}</div>
    <div class="field">
      <label for="sc-grams">Grammes</label>
      <input id="sc-grams" type="number" min="1" max="3000" step="10" value="${ui.grams}">
    </div>

    <div class="macrogrid">
      <div><b>${fr.format(entry.kcal)}</b><span>kcal</span></div>
      <div><b>${entry.protein}</b><span>prot g</span></div>
      <div><b>${entry.carbs}</b><span>gluc g</span></div>
      <div><b>${entry.fat}</b><span>lip g</span></div>
    </div>

    <p class="prose" style="margin-top:10px">Pour 100 g : ${fr.format(p.per100.kcal)} kcal ·
      ${p.per100.protein} g de protéines · ${p.per100.carbs} g de glucides · ${p.per100.fat} g de lipides ·
      ${p.per100.fiber} g de fibres · ${p.per100.sugar} g de sucre.</p>

    <label style="margin-top:14px">Moment du repas</label>
    <div class="choices mb">${types}</div>

    <div class="actions">
      <button class="btn lg wide" id="addProduct">${icon.plus} Ajouter au journal</button>
      <button class="btn ghost wide" id="another">Scanner un autre produit</button>
    </div>
    <p class="note">Données Open Food Facts, sous licence ouverte ODbL. Les valeurs viennent de l'étiquette : elles peuvent manquer ou être approximatives.</p>
  </section>`;
}

export const scanView = {
  render() {
    const recent = getState().recent || [];

    if (ui.product) return `
      <header class="page"><div><h2>📷 Produit trouvé</h2><p>Vérifie la quantité, puis ajoute</p></div></header>
      ${productCard(ui.product)}`;

    const results = ui.results?.length ? `
      <section class="card mb">
        <h3>Résultats pour « ${esc(ui.query)} »</h3>
        <p class="sub">${ui.results.length} produits</p>
        <div class="results">${ui.results.map((p, i) => `
          <button class="result" data-pick="${i}">
            ${thumb(p)}
            <span style="flex:1;min-width:0">
              <b>${esc(p.name)}</b>
              <em>${esc(p.brand || '—')} · ${fr.format(p.per100.kcal)} kcal / 100 g</em>
            </span>
            ${nutriscore(p.nutriscore)}
          </button>`).join('')}</div>
      </section>` : '';

    const recents = recent.length ? `
      <section class="card">
        <h3>🕑 Déjà scannés</h3>
        <p class="sub">Un geste pour les rajouter</p>
        <div class="results">${recent.map((p, i) => `
          <button class="result" data-recent="${i}">
            ${thumb(p)}
            <span style="flex:1;min-width:0">
              <b>${esc(p.name)}</b>
              <em>${esc(p.brand || '—')} · ${fr.format(p.per100.kcal)} kcal / 100 g</em>
            </span>
          </button>`).join('')}</div>
      </section>` : '';

    return `
    <header class="page">
      <div><h2>📷 Scanner</h2><p>Le code-barres fait le reste</p></div>
    </header>

    <section class="card mb">
      <h3>Code-barres</h3>
      <p class="sub">${hasCamera() ? 'Vise le code-barres, garde-le bien à plat' : 'Caméra indisponible sur cet appareil'}</p>
      <div class="scanframe" id="frame" hidden>
        <video id="cam" playsinline muted></video>
        <div class="reticle" aria-hidden="true"></div>
        <p class="scanhint">Approche le code jusqu'à ce qu'il remplisse le cadre</p>
      </div>
      <div class="actions">
        <button class="btn lg" id="startCam" ${hasCamera() ? '' : 'disabled'}>${icon.scan} Ouvrir la caméra</button>
        <button class="btn ghost" id="stopCam" hidden>Arrêter</button>
      </div>
      <div class="row" style="margin-top:14px">
        <div class="field"><label for="sc-code">Ou saisis le code</label>
          <input id="sc-code" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="3017624010701"></div>
        <div class="field" style="align-self:end">
          <button class="btn blue wide" id="findCode">Chercher</button></div>
      </div>
      ${ui.busy ? `<p class="prose">⏳ ${esc(ui.busy)}</p>` : ''}
      ${ui.error ? `<p class="prose" style="color:var(--red-ink)">⚠️ ${esc(ui.error)}</p>` : ''}
    </section>

    <section class="card mb">
      <h3>🔎 Chercher par nom</h3>
      <p class="sub">Utile pour le vrac, le pain, les fruits</p>
      <div class="row">
        <div class="field"><label for="sc-q">Nom du produit</label>
          <input id="sc-q" type="search" placeholder="yaourt grec, lentilles…" value="${esc(ui.query)}"></div>
        <div class="field" style="align-self:end">
          <button class="btn blue wide" id="doSearch">Rechercher</button></div>
      </div>
    </section>

    ${results}
    ${recents || (ui.results ? '' : empty('🥫', 'Scanne ton premier produit pour le retrouver ici.'))}`;
  },

  mount(root) {
    // Un rendu peut survenir caméra allumée : on coupe l'ancien flux.
    stopCamera?.();
    stopCamera = null;

    const codeField = root.querySelector('#sc-code');
    const queryField = root.querySelector('#sc-q');

    root.querySelector('#findCode')?.addEventListener('click', () => {
      const code = (codeField.value || '').replace(/\D/g, '');
      if (code.length < 6) { codeField.focus(); toast('Un code-barres fait au moins 8 chiffres'); return; }
      lookup(code);
    });
    codeField?.addEventListener('keydown', e => { if (e.key === 'Enter') root.querySelector('#findCode').click(); });

    root.querySelector('#doSearch')?.addEventListener('click', () => {
      const q = (queryField.value || '').trim();
      if (q.length < 2) { queryField.focus(); return; }
      search(q);
    });
    queryField?.addEventListener('keydown', e => { if (e.key === 'Enter') root.querySelector('#doSearch').click(); });

    root.querySelector('#startCam')?.addEventListener('click', async () => {
      const frame = root.querySelector('#frame');
      const video = root.querySelector('#cam');
      frame.hidden = false;
      root.querySelector('#startCam').hidden = true;
      root.querySelector('#stopCam').hidden = false;
      try {
        stopCamera = await startScanner(video, code => {
          stopCamera = null;
          toast('Code lu : ' + code);
          lookup(code);
        });
      } catch {
        frame.hidden = true;
        root.querySelector('#startCam').hidden = false;
        root.querySelector('#stopCam').hidden = true;
        ui.error = "Impossible d'ouvrir la caméra. Autorise l'accès dans les réglages du navigateur, ou saisis le code à la main.";
        rerender();
      }
    });

    root.querySelector('#stopCam')?.addEventListener('click', () => {
      stopCamera?.();
      stopCamera = null;
      root.querySelector('#frame').hidden = true;
      root.querySelector('#startCam').hidden = false;
      root.querySelector('#stopCam').hidden = true;
    });

    root.querySelectorAll('[data-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = ui.results[Number(btn.dataset.pick)];
        ui.product = product;
        ui.grams = product.servingG || 100;
        rememberProduct(product);
        rerender();
      });
    });

    root.querySelectorAll('[data-recent]').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = (getState().recent || [])[Number(btn.dataset.recent)];
        if (!product) return;
        ui.product = product;
        ui.grams = product.servingG || 100;
        rerender();
      });
    });

    root.querySelectorAll('[data-grams]').forEach(btn => {
      btn.addEventListener('click', () => { ui.grams = Number(btn.dataset.grams); rerender(); });
    });

    root.querySelector('#sc-grams')?.addEventListener('change', e => {
      ui.grams = Math.max(1, Number(e.target.value) || 100);
      rerender();
    });

    root.querySelectorAll('[data-type]').forEach(btn => {
      btn.addEventListener('click', () => { ui.type = btn.dataset.type; rerender(); });
    });

    root.querySelector('#another')?.addEventListener('click', () => { reset(); rerender(); });

    root.querySelector('#addProduct')?.addEventListener('click', async () => {
      const p = ui.product;
      const entry = toEntry(p, ui.grams);
      const now = new Date();
      const button = root.querySelector('#addProduct');
      button.disabled = true;
      const saved = await run(addMeal({
        date: today(),
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        type: ui.type,
        desc: `${p.name}${p.brand ? ' — ' + p.brand : ''} (${ui.grams} g)`,
        barcode: p.code,
        ...entry
      }), { ok: `${mealType(ui.type).emoji} ${p.name} ajouté · +10 points` });
      button.disabled = false;
      if (!saved) return;
      reset();
      location.hash = '#/today';
    });
  },

  /** Rendre la caméra quand on quitte l'écran : sinon elle reste allumée. */
  unmount() {
    stopCamera?.();
    stopCamera = null;
  }
};
