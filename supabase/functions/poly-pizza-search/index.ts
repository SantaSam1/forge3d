import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  'Access-Control-Allow-Origin': 'https://3d-prin.ru',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, max = 30): boolean {
  const now = Date.now();
  const e = rateLimitMap.get(key);
  if (!e || now > e.resetAt) { rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= max) return false;
  e.count++; return true;
}

// API v1.1 - GET requests, params in URL
// License: 0=CC-BY, 1=CC0
// Category: 0=Food&Drink, 1=Clutter, 2=Weapons, 3=Transport, 4=Furniture, 5=Objects, 6=Nature, 7=Animals, 8=Buildings, 9=Characters, 10=Scenes, 11=Other

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });

  const clientKey = req.headers.get('Authorization') || req.headers.get('x-forwarded-for') || 'anon';
  if (!checkRateLimit(clientKey, 30)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const PP_KEY = Deno.env.get('POLY_PIZZA_KEY') ?? '';
  if (!PP_KEY) return new Response(JSON.stringify({ error: 'POLY_PIZZA_KEY not set' }), {
    status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
  });

  try {
    const { q, limit = 24, offset = 0 } = await req.json();
    const page = Math.floor(Number(offset) / 32);

    // Build query params - License=1 means CC0 (free)
    const params = new URLSearchParams({
      License: '1',   // CC0 only
      Limit: String(Math.min(Number(limit), 32)),
      Page: String(page),
    });

    // Use keyword endpoint if query provided, filter endpoint otherwise
    const keyword = q && q.trim() ? encodeURIComponent(q.trim()) : '';
    const baseUrl = 'https://api.poly.pizza/v1.1';
    const url = keyword
      ? `${baseUrl}/search/${keyword}?${params}`
      : `${baseUrl}/search?${params}`;

    const res = await fetch(url, {
      headers: { 'x-auth-token': PP_KEY },
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
