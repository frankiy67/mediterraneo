/**
 * Écran de connexion. Email et mot de passe, plus GitHub si le fournisseur
 * est activé côté Supabase.
 */
import { signIn, signUp, signInWithGitHub } from './data.js';
import { toast } from './ui.js';

export const authView = {
  render() {
    return `
    <div class="auth">
      <div class="auth-card">
        <h1 class="serif">Mediterráneo</h1>
        <p class="auth-sub">Ton suivi te suit d'un appareil à l'autre.</p>

        <div class="field">
          <label for="a-email">Adresse e-mail</label>
          <input id="a-email" type="email" autocomplete="email" placeholder="toi@exemple.com">
        </div>
        <div class="field">
          <label for="a-pass">Mot de passe</label>
          <input id="a-pass" type="password" autocomplete="current-password" placeholder="Au moins six caractères">
        </div>

        <div class="actions" style="margin-top:18px">
          <button class="act" id="a-signin">Se connecter</button>
          <button class="act ghost" id="a-signup">Créer un compte</button>
        </div>

        <div class="auth-or"><span>ou</span></div>

        <button class="act ghost auth-gh" id="a-github">
          <svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px">
            <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/>
          </svg>
          Continuer avec GitHub
        </button>

        <p class="auth-note">
          À la création d'un compte, un e-mail de confirmation peut t'être envoyé.
          Tes données restent privées : la base ne renvoie que les lignes de ton compte.
        </p>
      </div>
    </div>`;
  },

  mount(root) {
    const email = () => root.querySelector('#a-email').value.trim();
    const pass = () => root.querySelector('#a-pass').value;

    const guard = () => {
      if (!email() || !pass()) { toast('Renseigne ton e-mail et ton mot de passe'); return false; }
      if (pass().length < 6) { toast('Le mot de passe fait au moins six caractères'); return false; }
      return true;
    };

    root.querySelector('#a-signin').addEventListener('click', async () => {
      if (!guard()) return;
      const { error } = await signIn(email(), pass());
      if (error) toast(error.message === 'Invalid login credentials'
        ? 'Identifiants incorrects' : error.message);
    });

    root.querySelector('#a-signup').addEventListener('click', async () => {
      if (!guard()) return;
      const { data, error } = await signUp(email(), pass());
      if (error) { toast(error.message); return; }
      toast(data.session ? 'Compte créé' : 'Vérifie ta boîte mail pour confirmer');
    });

    root.querySelector('#a-github').addEventListener('click', async () => {
      const { error } = await signInWithGitHub();
      if (error) toast('GitHub n\'est pas activé côté Supabase');
    });

    root.querySelector('#a-pass').addEventListener('keydown', e => {
      if (e.key === 'Enter') root.querySelector('#a-signin').click();
    });
  }
};
