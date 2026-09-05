# Mediterráneo

Application de suivi nutrition, poids et entraînement. Sans build, adossée à Supabase
pour l'authentification et la synchronisation entre appareils. Conçue pour un objectif
précis : perdre le gras en gardant le muscle, avec neuf heures de sport par semaine.

Site statique prêt pour GitHub Pages. Installable sur téléphone.

---

## Mise en ligne sur GitHub Pages

### 1. Créer le dépôt

Sur GitHub, crée un dépôt **public** — appelons-le `mediterraneo`. Ne coche ni README,
ni licence, ni `.gitignore` : ils sont déjà dans ces fichiers.

### 2. Envoyer le code

Depuis le dossier décompressé, en remplaçant `TON-PSEUDO` par ton identifiant GitHub :

```bash
git init
git add .
git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/mediterraneo.git
git push -u origin main
```

### 3. Activer Pages

Dans le dépôt : **Settings → Pages**, puis sous **Source** choisis **GitHub Actions**.

Le workflow `.github/workflows/deploy.yml` se déclenche à chaque `push` sur `main`.
Le premier déploiement prend une minute environ.

### 4. Ouvrir le site

```
https://TON-PSEUDO.github.io/mediterraneo/
```

Sur iPhone, ouvre cette adresse dans Safari puis **Partager → Sur l'écran d'accueil**.
Sur Android, Chrome propose **Installer l'application**. Elle s'ouvre alors en plein
écran, sans barre de navigateur, et fonctionne hors connexion.

---

## Développement en local

Les modules ES imposent un serveur HTTP — ouvrir `index.html` par double-clic ne suffit pas.

```bash
python3 -m http.server 8000
```

Puis `http://localhost:8000`.

---

## Structure

```
.
├── index.html                  coquille et navigation
├── manifest.webmanifest        métadonnées d'installation
├── sw.js                       cache hors ligne
├── assets/
│   ├── css/
│   │   ├── tokens.css          palette, typographie, espacements
│   │   └── app.css             composants et mise en page
│   ├── js/
│   │   ├── config.js           profil, objectifs, compléments, menus
│   │   ├── data.js             client Supabase, requêtes, temps réel
│   │   ├── auth.js             écran de connexion
│   │   ├── store.js            état, écritures, sélecteurs
│   │   ├── ui.js               formatage et graphiques SVG
│   │   ├── views.js            écrans
│   │   └── app.js              routeur et amorçage
│   └── icons/
└── .github/workflows/deploy.yml
```

### Choix techniques

**Pas d'étape de build.** Pas de framework, pas de `node_modules`. La seule
dépendance, `supabase-js`, est importée en module ES depuis un CDN. Le code
envoyé est le code exécuté.

**Graphiques faits main.** Les courbes sont du SVG généré à partir des données.
Une bibliothèque de graphiques pèserait plus lourd que l'application entière.

**État centralisé.** `store.js` détient l'état en mémoire, miroir de la base.
Toute écriture part d'abord au serveur, puis met à jour l'état et notifie les vues.
Les vues n'écrivent jamais directement dans l'état.

**Sécurité par la base.** La clé publique de l'application ne donne aucun accès :
le Row Level Security filtre chaque requête sur `auth.uid()`, donc la base ne
renvoie que les lignes du compte connecté. C'est pour cela qu'elle peut vivre
dans du code public.

**Synchronisation en direct.** Un abonnement `postgres_changes` recharge les
données dès qu'une modification arrive, y compris depuis un autre appareil.

**Échappement systématique.** Toute donnée saisie traverse `esc()` avant d'être
insérée dans le DOM.

**Accessibilité.** Navigation au clavier, `aria-current` sur l'onglet actif,
`aria-pressed` sur les bascules, lien d'évitement, focus visible, et respect de
`prefers-reduced-motion`.

---

## Personnalisation

Presque tout se règle dans `assets/js/config.js` : profil, objectifs par défaut,
liste des compléments, semaine d'entraînement, séance de gym, menus et liste de courses.

Les couleurs et la typographie vivent dans `assets/css/tokens.css`.

---

## Données

Les données vivent dans une base Postgres hébergée par Supabase, en Europe
(Francfort), rattachées à un compte. Elles sont accessibles depuis tous les
appareils connectés au même compte et se mettent à jour en direct.

Le Row Level Security garantit qu'un compte ne peut lire ou écrire que ses
propres lignes, indépendamment de la requête envoyée. Aucun traqueur n'est chargé.
L'écran **Données** permet d'exporter en CSV à tout moment.

### Schéma

Cinq tables — `goals`, `meals`, `water`, `weights`, `supplements` — toutes avec
RLS activé et une politique restreignant l'accès à `auth.uid() = user_id`.
Un déclencheur crée les objectifs par défaut à l'inscription.

### Configuration

L'URL du projet et la clé anonyme se trouvent en tête de `assets/js/data.js`.
Ces deux valeurs sont conçues pour être publiques. La clé `service_role` ne doit
jamais figurer dans ce dépôt.

Cette application ne se connecte pas au serveur Nutrition MCP. Les deux outils
coexistent : le MCP conserve l'historique tenu par Claude, cette application offre
l'interface et la saisie directe.

---

## Avertissement

Les valeurs affichées sont des estimations destinées à un adulte en bonne santé.
Elles ne constituent ni un avis médical ni une prescription diététique. Pour une
cible personnalisée, ou en cas de condition médicale, d'allergie ou de traitement
en cours, l'avis d'un médecin ou d'un diététicien reste nécessaire.

---

## Licence

MIT — voir `LICENSE`.
