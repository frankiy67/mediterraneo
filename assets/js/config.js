/**
 * Configuration et données de référence.
 * Tout ce qui est propre à l'utilisateur est regroupé ici.
 */

export const PROFILE = {
  city: 'Valencia',
  age: 35,
  heightCm: 183,
  startWeight: 89,
  startDate: '2026-09-05'
};

export const DEFAULT_GOALS = {
  kcal: 2500,
  protein: 165,
  carbs: 285,
  fat: 80,
  fiber: 30,
  sugar: 55,
  water: 3000,
  targetWeight: 80
};

/** Compléments du matin — micronutriments, impact calorique négligeable. */
export const SUPPLEMENTS_AM = [
  { key: 'multi',  name: 'Multivitamine',         brand: 'Consum' },
  { key: 'vitc',   name: 'Vitamine C',            brand: 'Consum' },
  { key: 'colmag', name: 'Collagène + magnésium', brand: 'Consum' },
  { key: 'artic',  name: 'Articulaciones',        brand: 'Consum' },
  { key: 'omega',  name: 'Oméga 3',               brand: 'Consum' }
];

/** Compléments post-séance — ceux-ci comptent dans le total de la journée. */
export const SUPPLEMENTS_PW = [
  { key: 'prot', name: 'Protéine végétale',     brand: 'Nutripure · 1 dose', kcal: 120, protein: 24 },
  { key: 'crea', name: 'Créatine',              brand: 'Nutripure · 3 à 5 g', kcal: 0,  protein: 0  },
  { key: 'pept', name: 'Peptides de collagène', brand: 'Nutripure · 1 dose', kcal: 40,  protein: 10 }
];

export const ALL_SUPPLEMENTS = [...SUPPLEMENTS_AM, ...SUPPLEMENTS_PW];

export const WEEK_PLAN = [
  { day: 'Lundi',    sessions: [{ label: 'Volley 1 h 30',      kind: 'volley' }] },
  { day: 'Mardi',    sessions: [{ label: 'Gym full-body 1 h',  kind: 'gym'    }] },
  { day: 'Mercredi', sessions: [{ label: 'Repos',              kind: 'rest'   }] },
  { day: 'Jeudi',    sessions: [{ label: 'Volley 1 h 30',      kind: 'volley' }] },
  { day: 'Vendredi', sessions: [{ label: 'Gym full-body 1 h',  kind: 'gym'    }] },
  { day: 'Samedi',   sessions: [{ label: 'Session libre 2 h',  kind: 'free'   }] },
  { day: 'Dimanche', sessions: [{ label: 'Session libre 2 h',  kind: 'free'   }] }
];

export const GYM_SESSION = [
  ['Squat ou presse',               '4 séries de 6 à 8'],
  ['Soulevé de terre roumain',      '3 séries de 8 à 10'],
  ['Développé couché ou militaire', '4 séries de 6 à 8'],
  ['Tirage horizontal',             '4 séries de 8 à 10'],
  ['Fentes marchées',               '3 séries de 10 par jambe'],
  ['Gainage et rotations',          '3 séries de 45 secondes']
];

export const MEAL_PLAN = [
  { day: 'Lundi', training: 'Volley 1 h 30', meals: [
    ['Petit-déjeuner', "Omelette de 3 œufs aux épinards et tomate, 2 tranches de pain complet, café"],
    ['Déjeuner', "Poulet a la plancha, riz complet, grande salade, 1 c. à soupe d'huile d'olive"],
    ['Après la séance', "1 dose de protéine Nutripure dans l'eau et 1 banane"],
    ['Dîner', "Merluza au four, poivrons et courgettes rôtis, une poignée de pois chiches"]
  ]},
  { day: 'Mardi', training: 'Gym full-body 1 h', meals: [
    ['Petit-déjeuner', "Porridge de flocons d'avoine au lait, amandes, cannelle"],
    ['Déjeuner', "Lentilles à l'espagnole, dés de jambon maigre, salade verte, 1 orange"],
    ['Après la séance', "1 dose de protéine Nutripure et 2 tranches de pain complet"],
    ['Dîner', "Saumon grillé, brocoli vapeur, petite patate douce au four"]
  ]},
  { day: 'Mercredi', training: 'Repos', meals: [
    ['Petit-déjeuner', "Yaourt grec nature, graines de chia, fruits rouges, noix"],
    ['Déjeuner', "Salade de thon, œuf dur, haricots blancs, tomate, oignon rouge"],
    ['Collation', "Fromage blanc et une pomme"],
    ['Dîner', "Escalope de dinde a la plancha, ratatouille, petite portion de quinoa"]
  ]},
  { day: 'Jeudi', training: 'Volley 1 h 30', meals: [
    ['Petit-déjeuner', "Tortilla de 3 œufs aux champignons, pain complet, café"],
    ['Déjeuner', "Poulet au citron et paprika, riz complet, salade de pois chiches"],
    ['Après la séance', "1 dose de protéine Nutripure et une poignée de dattes"],
    ['Dîner', "Dorade au four, épinards à l'ail, une poignée de lentilles"]
  ]},
  { day: 'Vendredi', training: 'Gym full-body 1 h', meals: [
    ['Petit-déjeuner', "Porridge d'avoine, beurre de cacahuète, banane"],
    ['Déjeuner', "Bœuf maigre sauté aux légumes, riz complet, salade"],
    ['Après la séance', "1 dose de protéine Nutripure et pain complet"],
    ['Dîner', "Omelette aux légumes, haricots verts, une tranche de pain complet"]
  ]},
  { day: 'Samedi', training: 'Session libre 2 h', meals: [
    ['Petit-déjeuner', "Œufs brouillés, tomate, un demi-avocat, pain complet"],
    ['Déjeuner', "Paella de poisson ou riz aux fruits de mer, grande salade"],
    ['Après la séance', "1 dose de protéine Nutripure et un fruit"],
    ['Dîner', "Poulet grillé, légumes rôtis, houmous et crudités"]
  ]},
  { day: 'Dimanche', training: 'Session libre 2 h', meals: [
    ['Petit-déjeuner', "Yaourt grec, granola sans sucre ajouté, fruits rouges"],
    ['Déjeuner', "Poisson blanc a la plancha, pommes de terre vapeur, salade"],
    ['Après la séance', "1 dose de protéine Nutripure"],
    ['Dîner', "Soupe de légumes et lentilles, œufs pochés, pain complet"]
  ]}
];

export const SHOPPING = [
  ['Protéines animales', ['Blanc de poulet 1,2 kg','Escalopes de dinde 400 g','Bœuf maigre 400 g','Merluza 600 g','Saumon 300 g','Dorade 1 pièce','Fruits de mer 400 g','Thon au naturel 4 boîtes','Jambon maigre 150 g','Œufs 2 douzaines']],
  ['Produits laitiers', ['Yaourt grec nature 1 kg','Fromage blanc 500 g','Lait 1 litre']],
  ['Légumineuses et céréales', ['Lentilles 500 g','Pois chiches 3 bocaux','Haricots blancs 2 bocaux','Riz complet 1 kg','Quinoa 250 g','Flocons d\'avoine 500 g','Pain complet 2 pains','Granola sans sucre ajouté']],
  ['Légumes', ['Épinards 500 g','Brocoli 2 têtes','Courgettes 4','Poivrons 4','Tomates 1,5 kg','Concombres 3','Roquette et salade 3 sachets','Haricots verts 400 g','Champignons 300 g','Oignons et ail','Patates douces 2','Pommes de terre 1 kg','Aubergine 1']],
  ['Fruits', ['Bananes 6','Oranges 6','Pommes 5','Fruits rouges surgelés 500 g','Dattes 200 g','Avocats 3','Citrons 3']],
  ['Épicerie', ['Huile d\'olive vierge extra','Amandes 200 g','Noix 200 g','Graines de chia 100 g','Beurre de cacahuète sans sucre','Houmous 1 pot','Paprika, cumin, herbes']]
];

export const MEAL_TYPES = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation'
};
