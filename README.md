# Mediterráneo

Application de suivi nutrition, poids et entraînement. Sans dépendance, sans build,
sans serveur. Conçue pour un objectif précis : perdre le gras en gardant le muscle,
avec neuf heures de sport par semaine.

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
│   │   ├── store.js            état, persistance, sélecteurs
│   │   ├── ui.js               formatage et graphiques SVG
│   │   ├── views.js            écrans
│   │   └── app.js              routeur et amorçage
│   └── icons/
└── .github/workflows/deploy.yml
```

### Choix techniques

**Aucune dépendance.** Pas de framework, pas d'étape de compilation, pas de
`node_modules`. Le code envoyé est le code exécuté, ce qui supprime toute
maintenance de chaîne de build et toute alerte de vulnérabilité transitive.

**Graphiques faits main.** Les courbes sont du SVG généré à partir des données.
Une bibliothèque de graphiques pèserait plus lourd que l'application entière.

**État centralisé.** `store.js` détient la seule source de vérité, persiste dans
`localStorage` et notifie les vues. Les vues ne modifient jamais l'état
directement : elles passent par `update()`.

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

Tout reste dans le navigateur, dans `localStorage`. Rien n'est envoyé nulle part,
aucun compte n'est requis, aucun traqueur n'est chargé. Vider les données du site
les efface définitivement : l'écran **Données** permet d'exporter en CSV avant.

Cette application ne se connecte pas au serveur Nutrition MCP. Une page ouverte
dans un navigateur ne peut pas s'authentifier à ta place auprès de ce service.
Les deux outils coexistent : le MCP conserve l'historique de référence, cette
application offre l'interface.

---

## Avertissement

Les valeurs affichées sont des estimations destinées à un adulte en bonne santé.
Elles ne constituent ni un avis médical ni une prescription diététique. Pour une
cible personnalisée, ou en cas de condition médicale, d'allergie ou de traitement
en cours, l'avis d'un médecin ou d'un diététicien reste nécessaire.

---

## Licence

MIT — voir `LICENSE`.
