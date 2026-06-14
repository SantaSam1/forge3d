import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  'Access-Control-Allow-Origin': 'https://3d-prin.ru',
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Rate limit by IP or Authorization header
  const clientKey = req.headers.get('Authorization') || req.headers.get('x-forwarded-for') || 'anon';
  if (!checkRateLimit(clientKey, 30)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const GROQ_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_KEY) return new Response(JSON.stringify({ error: 'no key' }), {
    status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
  });

  try {
    const { userText, isRu } = await req.json();
    if (!userText || typeof userText !== 'string' || userText.length > 500) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Write a short English 3D model prompt (under 150 chars). Only the prompt, no extra text.' },
          { role: 'user', content: `3D model of: ${userText}` }
        ],
        max_tokens: 100,
      }),
    });
    const d = await res.json();
    const prompt = d.choices?.[0]?.message?.content?.trim() ?? '';
    return new Response(JSON.stringify({ prompt }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
