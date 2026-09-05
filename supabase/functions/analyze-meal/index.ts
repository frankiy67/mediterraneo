/**
 * Analyse une photo de repas et renvoie une estimation nutritionnelle.
 *
 * La clé d'API vit dans les secrets du projet et ne quitte jamais le serveur.
 * L'appelant doit être authentifié : le jeton de session est vérifié avant
 * tout appel au modèle, ce qui évite qu'un tiers consomme le crédit.
 *
 * Déploiement : supabase functions deploy analyze-meal
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SYSTEM = `Tu es un assistant nutritionnel qui estime la composition d'un repas à partir d'une photo.

Réponds UNIQUEMENT par un objet JSON valide, sans texte avant ou après, sans balises de code.

Format attendu :
{
  "description": "Nom du plat avec les portions en mesures visuelles",
  "confiance": "haute" | "moyenne" | "basse",
  "kcal": nombre,
  "protein": nombre,
  "carbs": nombre,
  "fat": nombre,
  "fiber": nombre,
  "sugar": nombre,
  "caffeine": nombre,
  "questions": ["question 1", "question 2"]
}

Règles :
- Décris les portions en mesures que l'on peut évaluer à l'œil (une poignée, un verre, une paume), jamais en grammes.
- Estime TOUJOURS les fibres et le sucre. Un zéro est correct là où c'est vrai (viande, œufs, huile) ; l'omission ne l'est jamais.
- La caféine ne concerne que le café, le thé, les colas, les boissons énergisantes et le chocolat. Mets 0 sinon.
- Tiens compte des matières grasses invisibles : huile de cuisson, beurre, sauces. C'est la principale source de sous-estimation.
- Dans "questions", pose au maximum deux questions courtes sur ce qui reste incertain et changerait sensiblement le résultat (portion réelle, mode de cuisson, ingrédient caché). Tableau vide si tout est clair.
- "confiance" reflète honnêtement la lisibilité de la photo.
- Ces valeurs sont des estimations, pas des mesures.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // ── l'appelant doit être un utilisateur connecté ──
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return json({ error: 'Authentification requise' }, 401);
    }

    const userCheck = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/user`,
      {
        headers: {
          Authorization: auth,
          apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        }
      }
    );
    if (!userCheck.ok) {
      return json({ error: 'Session invalide' }, 401);
    }

    const { image, mediaType, note } = await req.json();
    if (!image) return json({ error: 'Aucune image reçue' }, 400);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'Clé API absente côté serveur' }, 500);

    const content: unknown[] = [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image }
      },
      {
        type: 'text',
        text: note
          ? `Analyse ce repas. Précisions de l'utilisateur : ${note}`
          : 'Analyse ce repas.'
      }
    ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: 'user', content }]
      })
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Anthropic', res.status, detail);
      return json({ error: "L'analyse a échoué", status: res.status }, 502);
    }

    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
      .replace(/```json|```/g, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('Réponse non analysable', text);
      return json({ error: 'Réponse du modèle illisible' }, 502);
    }

    // valeurs sûres, quoi que renvoie le modèle
    const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

    return json({
      description: String(parsed.description ?? 'Repas'),
      confiance: ['haute', 'moyenne', 'basse'].includes(parsed.confiance)
        ? parsed.confiance : 'moyenne',
      kcal: num(parsed.kcal),
      protein: num(parsed.protein),
      carbs: num(parsed.carbs),
      fat: num(parsed.fat),
      fiber: num(parsed.fiber),
      sugar: num(parsed.sugar),
      caffeine: num(parsed.caffeine),
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.slice(0, 2).map(String) : [],
      usage: data.usage ?? null
    }, 200);

  } catch (e) {
    console.error(e);
    return json({ error: 'Erreur interne' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}
