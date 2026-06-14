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
  if (!checkRateLimit(authResult.userId, 20)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const uid = url.searchParams.get('uid');
  if (!uid || !/^[a-zA-Z0-9]+$/.test(uid)) {
    return new Response(JSON.stringify({ error: 'Invalid uid' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
    headers: { Authorization: `Token ${Deno.env.get('SKETCHFAB_TOKEN')}` },
  });
  const data = await res.json();
  return new Response(JSON.stringify({ url: data?.gltf?.url || null }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
