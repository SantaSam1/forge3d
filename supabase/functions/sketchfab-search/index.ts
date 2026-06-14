import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyUser, checkRateLimit } from "../_shared/auth.ts";

const cors = {
  'Access-Control-Allow-Origin': 'https://3d-prin.ru',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });

  const authResult = await verifyUser(req);
  if (authResult instanceof Response) return authResult;
  if (!checkRateLimit(authResult.userId, 30)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const query = url.searchParams.toString();
  const res = await fetch(`https://api.sketchfab.com/v3/search?${query}`, {
    headers: { Authorization: `Token ${Deno.env.get('SKETCHFAB_TOKEN')}` },
  });
  const data = await res.text();
  return new Response(data, { headers: { ...cors, 'Content-Type': 'application/json' } });
});
