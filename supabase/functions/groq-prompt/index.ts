Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const GROQ_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_KEY) return new Response(JSON.stringify({ error: 'no key' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const { userText, isRu } = await req.json();
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
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
