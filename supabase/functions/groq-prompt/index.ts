Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY secret not set in Supabase Edge Functions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { userText, isRu } = await req.json();
    if (!userText) {
      return new Response(
        JSON.stringify({ error: 'userText is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing prompts for AI 3D model generators like Meshy and Shap-E. Given a short idea, write a detailed English prompt for a 3D model. Include: object name, style (realistic/cartoon/low-poly), materials, colors, details. Reply with ONLY the prompt text, under 200 characters, no quotes.'
          },
          {
            role: 'user',
            content: isRu
              ? `Write a 3D model prompt in English for: "${userText}"`
              : `Write a 3D model prompt for: "${userText}"`
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `Groq API error ${res.status}: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    const prompt = data.choices?.[0]?.message?.content?.trim() ?? '';

    return new Response(
      JSON.stringify({ prompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Exception: ${String(e)}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
