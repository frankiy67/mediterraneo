/**
 * Client Open Food Facts — base de données ouverte et collaborative.
 * Lecture seule, sans clé d'API, sans compte.
 */
const BASE = 'https://world.openfoodfacts.org';

const FIELDS = [
  'code', 'product_name', 'product_name_fr', 'generic_name_fr', 'brands',
  'quantity', 'serving_size', 'serving_quantity', 'nutriscore_grade',
  'nova_group', 'image_front_small_url', 'nutriments'
].join(',');

const TIMEOUT = 9000;

async function getJSON(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const num = v => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Un produit brut d'Open Food Facts ramené à ce dont l'application a besoin. */
export function normalise(p) {
  const n = p?.nutriments || {};
  const kcal100 = num(n['energy-kcal_100g']) || Math.round(num(n.energy_100g) / 4.184);
  return {
    code: String(p?.code || ''),
    name: (p?.product_name_fr || p?.product_name || p?.generic_name_fr || '').trim() || 'Produit sans nom',
    brand: (p?.brands || '').split(',')[0].trim(),
    quantity: p?.quantity || '',
    image: p?.image_front_small_url || '',
    nutriscore: (p?.nutriscore_grade || '').toLowerCase(),
    nova: Number(p?.nova_group) || 0,
    servingG: num(p?.serving_quantity) || 0,
    servingLabel: p?.serving_size || '',
    per100: {
      kcal: Math.round(kcal100),
      protein: num(n.proteins_100g),
      carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g),
      fiber: num(n.fiber_100g),
      sugar: num(n.sugars_100g),
      caffeine: num(n.caffeine_100g) * 1000 // g pour 100 g → mg pour 100 g
    }
  };
}

/** Recherche par code-barres. Renvoie null si le produit est inconnu. */
export async function fetchProduct(barcode) {
  const code = String(barcode).replace(/\D/g, '');
  if (code.length < 6) throw new Error('Code-barres invalide');
  const data = await getJSON(`${BASE}/api/v2/product/${code}.json?fields=${FIELDS}`);
  if (data.status !== 1 || !data.product) return null;
  return normalise(data.product);
}

/** Recherche par nom. Les vingt premiers résultats suffisent largement. */
export async function searchProducts(query) {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}`
    + `&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`;
  const data = await getJSON(url);
  return (data.products || [])
    .map(normalise)
    .filter(p => p.per100.kcal > 0);
}

/** Convertit un produit et une quantité en grammes en entrée de journal. */
export function toEntry(product, grams) {
  const k = grams / 100;
  const round = v => Math.round(v * k * 10) / 10;
  return {
    kcal: Math.round(product.per100.kcal * k),
    protein: round(product.per100.protein),
    carbs: round(product.per100.carbs),
    fat: round(product.per100.fat),
    fiber: round(product.per100.fiber),
    sugar: round(product.per100.sugar),
    caffeine: Math.round(product.per100.caffeine * k)
  };
}
