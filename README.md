# Mediterráneo

Application de suivi nutrition, sport et poids. Scanner de code-barres branché sur
Open Food Facts, analyse de photo de repas par Claude, calendrier hebdomadaire et
bilan énergétique jour par jour. Sans build, adossée à Supabase pour le compte et
la synchronisation entre appareils.

Conçue pour un objectif précis : perdre le gras en gardant le muscle, avec neuf
heures de sport par semaine.

Site statique prêt pour GitHub Pages. Installable sur téléphone.

---

## Ce que fait l'application

**Trois façons d'enregistrer un repas.** Le bouton central de la barre d'onglets
mène au carrefour : scanner un code-barres, photographier l'assiette, ou saisir
à la main.

**Scanner Open Food Facts.** Vise un code-barres, l'application interroge la base
ouverte [Open Food Facts](https://world.openfoodfacts.org) et rapporte le produit,
son Nutri-Score et ses valeurs nutritionnelles. Choisis la quantité, c'est en base.
La recherche par nom prend le relais pour le vrac et les produits sans code.

Le décodage marche partout : `BarcodeDetector` quand le navigateur le propose
(Chrome, Android), et sinon un décodeur EAN-13 / EAN-8 / UPC-A écrit à la main dans
`assets/js/barcode.js` — c'est ce qui fait fonctionner le scan sur iPhone, où Safari
n'expose pas l'API native. Aucune bibliothèque tierce.

**Photo du repas.** Claude estime la composition de l'assiette, avec un niveau de
confiance et des questions sur ce qui reste incertain. Rien n'est enregistré avant
ta validation.

**Calendrier de la semaine.** Sept jours en bandeau, chacun avec son anneau de
calories et son état. En dessous, un agenda : repas, séances faites, séances prévues,
et la balance nette de chaque journée. Une touche ouvre le détail du jour.

**Détail d'une journée.** Le déroulé heure par heure — les repas et les séances posés
sur une ligne du temps, comme des rendez-vous. Au-dessus, la balance : ce qui entre
contre ce qui sort. En dessous, les macros, les objectifs, et de quoi ajouter une
séance à cette date.

**Quel sport as-tu fait ?** Douze activités, une durée, c'est enregistré. Les calories
sont estimées, puis modifiables.

**Objectifs du jour.** Six objectifs qui rapportent des points, une série de jours
consécutifs, et des confettis quand la journée est parfaite. Ce qui fait revenir.

---

## Comment les calories dépensées sont estimées

Deux morceaux, additionnés :

**La dépense de base** — métabolisme au repos par la formule de Mifflin-St Jeor
(`10 × poids + 6,25 × taille − 5 × âge + 5`), multipliée par 1,15 pour la vie
courante — se lever, marcher, cuisiner. Le sport étant compté à part, séance par
séance, un facteur d'activité classique le compterait deux fois.

**Le sport, séance par séance** — la formule MET, celle des montres connectées :

```
kcal = MET × 3,5 × poids(kg) ÷ 200 × minutes
```

Le MET mesure l'intensité d'une activité par rapport au repos : 1 assis, 3,5 en
marchant, 4,5 au volley de loisir, 9,8 en courant. Les valeurs viennent du *Compendium of
Physical Activities* et vivent dans `assets/js/energy.js`. L'écran Entraînement
affiche ce que vaut une heure de chaque activité pour ton poids du moment.

Ce sont des estimations. Une ceinture cardio sera plus juste : la valeur reste
modifiable avant d'enregistrer la séance, et c'est la valeur enregistrée qui est
conservée — changer la formule ne réécrit jamais le passé.

**La balance** d'une journée vaut `apport − dépense`. Un déficit cumulé de 7 700 kcal
correspond à environ un kilo de graisse ; l'application traduit le chiffre en grammes
pour que le calcul reste concret.

---

## Mise en ligne sur GitHub Pages

Dans le dépôt : **Settings → Pages**, puis sous **Source** choisis **GitHub Actions**.

Le workflow `.github/workflows/deploy.yml` se déclenche à chaque `push` sur `main`.

```
https://TON-PSEUDO.github.io/mediterraneo/
```

Sur iPhone, ouvre cette adresse dans Safari puis **Partager → Sur l'écran d'accueil**.
Sur Android, Chrome propose **Installer l'application**.

Le scan par caméra exige une origine sécurisée : `https://` ou `localhost`.

---

## Développement en local

Les modules ES imposent un serveur HTTP — ouvrir `index.html` par double-clic ne suffit pas.

```bash
python3 -m http.server 8000
```

Puis `http://localhost:8000`.

Le décodeur de code-barres a son test, sans dépendance :

```bash
node tests/barcode.test.mjs
```

---

## Structure

```
.
├── index.html                  coquille, rail et barre d'onglets
├── manifest.webmanifest        métadonnées d'installation
├── sw.js                       cache hors ligne
├── assets/
│   ├── css/
│   │   ├── tokens.css          palette, typographie, espacements
│   │   └── app.css             composants et mise en page
│   ├── js/
│   │   ├── config.js           profil, objectifs, compléments, menus
│   │   ├── date.js             dates ISO locales, semaines
│   │   ├── energy.js           MET, métabolisme, dépense
│   │   ├── off.js              client Open Food Facts
│   │   ├── barcode.js          décodeur EAN-13 / EAN-8 / UPC-A
│   │   ├── scanner.js          caméra et boucle de lecture
│   │   ├── data.js             client Supabase, requêtes, temps réel
│   │   ├── auth.js             écran de connexion
│   │   ├── photo.js            capture, analyse, validation
│   │   ├── store.js            état, écritures, sélecteurs
│   │   ├── ui.js               formatage, composants, graphiques SVG
│   │   ├── views.js            regroupement des écrans
│   │   ├── views/              un fichier par famille d'écrans
│   │   └── app.js              authentification, routeur, amorçage
│   └── icons/
├── tests/
│   └── barcode.test.mjs        codes EAN fabriqués puis relus
├── supabase/functions/analyze-meal/
│   └── index.ts                Edge Function d'analyse de photo
└── .github/workflows/deploy.yml
```

### Choix techniques

**Pas d'étape de compilation.** Le code envoyé est le code exécuté. La seule
dépendance, `supabase-js`, est importée en module ES depuis un CDN.
Le décodeur de code-barres suit la même règle : deux cents lignes lisibles plutôt
qu'une bibliothèque de plusieurs centaines de kilo-octets.

**Graphiques faits main.** Les courbes sont du SVG généré à partir des données.

**La base est la source de vérité.** `store.js` tient un miroir en mémoire :
toute écriture part au serveur, puis l'état local suit et les vues sont notifiées.
Le seul stockage local est la liste des derniers produits scannés — un confort
d'usage, pas une donnée de santé.

**Aucune donnée inventée.** Les courbes ne montrent que les journées réellement
enregistrées. Un écran vide dit qu'il est vide plutôt que d'afficher une moyenne
qui n'existe pas.

**Échappement systématique.** Toute donnée saisie — y compris les noms de produits
venus d'Open Food Facts et les descriptions renvoyées par le modèle — traverse
`esc()` avant d'être insérée dans le DOM.

**Mobile d'abord.** Barre d'onglets en bas, bouton d'ajout au centre, cibles
tactiles larges. Le rail latéral n'apparaît qu'à partir de 900 pixels.

**Accessibilité.** Contrastes vérifiés en clair comme en sombre (AA sur l'ensemble
des textes), navigation au clavier, `aria-current` sur l'onglet actif,
`aria-pressed` sur les bascules, lien d'évitement, focus visible, et respect de
`prefers-reduced-motion`.

**Thème clair et sombre**, selon le réglage du système.

---

## Compte et synchronisation

Les données vivent dans une base Postgres hébergée par Supabase, en Europe
(Francfort), rattachées à un compte. Elles sont accessibles depuis tous les
appareils connectés au même compte et se mettent à jour en direct.

Le Row Level Security garantit qu'un compte ne peut lire ou écrire que ses
propres lignes, indépendamment de la requête envoyée. Aucun traqueur n'est chargé.
L'écran **Données** permet d'exporter en CSV à tout moment.

### Schéma

Cinq tables portent le suivi — `goals`, `meals`, `sessions`, `weights`,
`supplements` — toutes avec RLS activé et une politique restreignant l'accès à
`auth.uid() = user_id`.

`sessions` porte les séances de sport : `date`, `time`, `kind`, `label`, `minutes`,
`kcal`. La table `water` existe encore et garde ses lignes, mais l'application ne
suit plus l'hydratation : un compteur de verres qu'aucun écran n'exploitait.

Ces cinq tables sont publiées dans `supabase_realtime` avec `replica identity full`,
sans quoi une suppression faite sur un appareil ne parviendrait pas aux autres.

### Configuration

L'URL du projet et la clé anonyme se trouvent en tête de `assets/js/data.js`.
Ces deux valeurs sont conçues pour être publiques. La clé `service_role` ne doit
jamais figurer dans ce dépôt.

Cette application ne se connecte pas au serveur Nutrition MCP. Les deux outils
coexistent : le MCP conserve l'historique tenu par Claude, cette application offre
l'interface et la saisie directe.

---

## Analyse de photo de repas

Le module Photo capture une image, l'envoie à une Edge Function Supabase, et
propose une estimation nutritionnelle à valider avant enregistrement.

### Pourquoi une fonction serveur

La clé d'API du modèle ne peut pas vivre dans le code envoyé au navigateur : il
est public. Elle est stockée dans les secrets du projet Supabase, et seule la
fonction y accède. La fonction vérifie en plus que l'appelant est authentifié,
pour qu'un tiers ne puisse pas consommer le crédit.

### Déploiement

```bash
supabase functions deploy analyze-meal
```

Le secret `ANTHROPIC_API_KEY` doit être défini au préalable dans
Project Settings → Edge Functions → Secrets.

### Principe de conception

L'estimation n'est jamais écrite directement en base. Elle est affichée avec un
niveau de confiance, d'éventuelles questions sur ce qui reste incertain, et tous
les champs modifiables. Une valeur corrigée par l'utilisateur vaut mieux qu'une
valeur exacte imposée — et les portions restent la principale source d'erreur.

---

## Ce qui sort de l'appareil

Trois sorties, et trois seulement :

1. **Supabase** — tes repas, séances, pesées, compléments et objectifs, sur ton compte.
2. **Open Food Facts** — le code-barres scanné, pour obtenir la fiche du produit.
3. **L'Edge Function** — la photo du repas, transmise à l'API Claude puis oubliée ;
   aucune photo n'est conservée.

Les données produits proviennent d'Open Food Facts, sous licence ouverte ODbL.

---

## Avertissement

Les valeurs affichées sont des estimations destinées à un adulte en bonne santé.
Elles ne constituent ni un avis médical ni une prescription diététique. Pour une
cible personnalisée, ou en cas de condition médicale, d'allergie ou de traitement
en cours, l'avis d'un médecin ou d'un diététicien reste nécessaire.

---

## Licence

MIT — voir `LICENSE`.
