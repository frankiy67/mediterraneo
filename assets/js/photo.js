/**
 * Photo de repas : capture, analyse, correction, enregistrement.
 *
 * L'estimation n'est jamais enregistrée directement. Elle est présentée
 * pour validation, avec les champs modifiables et les questions du modèle.
 */
import { supabase, SUPABASE_URL } from './data.js';
import { today, addMeal } from './store.js';
import { esc, toast, fr } from './ui.js';
import { MEAL_TYPES } from './config.js';

let capture = null;   // { dataUrl, base64, mediaType }
let result = null;    // estimation renvoyée par la fonction

export const photoView = {
  render() {
    const options = Object.entries(MEAL_TYPES)
      .map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

    return `
    <header class="page">
      <div><h2 class="serif">Photo du repas</h2><p>Prends la photo, corrige si besoin, enregistre</p></div>
    </header>

    <div class="grid g2">
      <section class="card">
        <h3>Capture</h3>
        <p class="sub">L'appareil photo s'ouvre directement sur mobile</p>

        <div class="shot" id="shot">
          ${capture
            ? `<img src="${capture.dataUrl}" alt="Repas photographié">`
            : `<div class="shot-empty">
                 <svg viewBox="0 0 24 24" aria-hidden="true">
                   <path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/>
                 </svg>
                 <span>Aucune photo pour l'instant</span>
               </div>`}
        </div>

        <input type="file" id="f-photo" accept="image/*" capture="environment" hidden>

        <div class="field" style="margin-top:14px">
          <label for="f-note">Précisions (facultatif)</label>
          <input id="f-note" placeholder="Cuit à l'huile d'olive, j'ai mangé la moitié">
        </div>

        <div class="actions">
          <button class="act" id="btn-shot">${capture ? 'Reprendre' : 'Prendre une photo'}</button>
          <button class="act ghost" id="btn-analyze" ${capture ? '' : 'disabled'}>Analyser</button>
        </div>

        <p class="note">Les valeurs proposées sont des estimations. Corrige-les avant d'enregistrer : une portion mal jugée pèse plus lourd qu'une erreur de calcul.</p>
      </section>

      <section class="card" id="panel">
        ${result ? resultPanel(options) : `
          <h3>Estimation</h3>
          <p class="sub">Elle apparaîtra ici après l'analyse</p>
          <p class="empty">Prends une photo pour commencer.</p>`}
      </section>
    </div>`;
  },

  mount(root) {
    const file = root.querySelector('#f-photo');

    root.querySelector('#btn-shot').addEventListener('click', () => file.click());

    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { toast('Photo trop lourde, réessaie'); return; }
      capture = await readImage(f);
      result = null;
      rerender();
    });

    root.querySelector('#btn-analyze')?.addEventListener('click', async () => {
      if (!capture) return;
      const btn = root.querySelector('#btn-analyze');
      btn.disabled = true;
      btn.textContent = 'Analyse en cours…';

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { toast('Session expirée, reconnecte-toi'); return; }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-meal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            image: capture.base64,
            mediaType: capture.mediaType,
            note: root.querySelector('#f-note').value.trim()
          })
        });

        const body = await res.json();
        if (!res.ok) { toast(body.error || "L'analyse a échoué"); return; }

        result = body;
        rerender();
        toast('Estimation prête — vérifie avant d\'enregistrer');
      } catch {
        toast('Analyse impossible, vérifie ta connexion');
      } finally {
        const b = document.querySelector('#btn-analyze');
        if (b) { b.disabled = false; b.textContent = 'Analyser'; }
      }
    });

    root.querySelector('#btn-save')?.addEventListener('click', async () => {
      const v = id => Number(root.querySelector('#' + id)?.value) || 0;
      const desc = root.querySelector('#r-desc').value.trim();
      if (!desc) { toast('Décris le repas'); return; }

      try {
        await addMeal({
          date: today(),
          time: root.querySelector('#r-time').value || '12:00',
          type: root.querySelector('#r-type').value,
          desc,
          kcal: v('r-kcal'), protein: v('r-protein'), carbs: v('r-carbs'),
          fat: v('r-fat'), fiber: v('r-fiber'), sugar: v('r-sugar'),
          caffeine: v('r-caffeine')
        });
        capture = null;
        result = null;
        toast('Repas enregistré');
        location.hash = '#/today';
      } catch {
        toast('Enregistrement impossible');
      }
    });

    root.querySelector('#btn-discard')?.addEventListener('click', () => {
      result = null;
      rerender();
    });
  }
};

function resultPanel(options) {
  const r = result;
  const badge = { haute: 'ok', moyenne: 'mid', basse: 'low' }[r.confiance] || 'mid';
  const label = { haute: 'Estimation fiable', moyenne: 'Estimation moyenne', basse: 'Estimation incertaine' }[r.confiance];

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  return `
    <h3>Estimation</h3>
    <p class="sub">Corrige ce qui te semble faux, puis enregistre</p>

    <p class="conf ${badge}">${label}</p>

    ${r.questions.length ? `
      <div class="asks">
        ${r.questions.map(q => `<p>${esc(q)}</p>`).join('')}
        <span>Réponds en corrigeant les champs ci-dessous.</span>
      </div>` : ''}

    <div class="field">
      <label for="r-desc">Description</label>
      <input id="r-desc" value="${esc(r.description)}">
    </div>

    <div class="row">
      <div class="field"><label for="r-type">Moment</label><select id="r-type">${options}</select></div>
      <div class="field"><label for="r-time">Heure</label><input id="r-time" type="time" value="${hh}:${mm}"></div>
    </div>

    <div class="row">
      <div class="field"><label for="r-kcal">Calories</label><input id="r-kcal" type="number" min="0" value="${r.kcal}"></div>
      <div class="field"><label for="r-protein">Protéines g</label><input id="r-protein" type="number" min="0" value="${r.protein}"></div>
      <div class="field"><label for="r-carbs">Glucides g</label><input id="r-carbs" type="number" min="0" value="${r.carbs}"></div>
      <div class="field"><label for="r-fat">Lipides g</label><input id="r-fat" type="number" min="0" value="${r.fat}"></div>
    </div>

    <div class="row">
      <div class="field"><label for="r-fiber">Fibres g</label><input id="r-fiber" type="number" min="0" value="${r.fiber}"></div>
      <div class="field"><label for="r-sugar">Sucre g</label><input id="r-sugar" type="number" min="0" value="${r.sugar}"></div>
      <div class="field"><label for="r-caffeine">Caféine mg</label><input id="r-caffeine" type="number" min="0" value="${r.caffeine}"></div>
    </div>

    <div class="actions">
      <button class="act" id="btn-save">Enregistrer le repas</button>
      <button class="act ghost" id="btn-discard">Effacer</button>
    </div>

    ${r.usage ? `<p class="note">Analyse effectuée — ${fr.format(r.usage.input_tokens || 0)} jetons en entrée, ${fr.format(r.usage.output_tokens || 0)} en sortie, soit moins d'un centime.</p>` : ''}`;
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      resolve({
        dataUrl,
        base64: dataUrl.split(',')[1],
        mediaType: file.type || 'image/jpeg'
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function rerender() {
  window.dispatchEvent(new CustomEvent('rerender'));
}
