import { serve } from 'https://deno.land/std/http/server.ts'

serve(async (req) => {
  const url = new URL(req.url)

  const uid = url.searchParams.get('uid')

  if (!uid) {
    return new Response('Missing uid', { status: 400 })
  }

  const res = await fetch(
    `https://api.sketchfab.com/v3/models/${uid}/download`,
    {
      headers: {
        Authorization: `Token ${Deno.env.get('SKETCHFAB_TOKEN')}`,
      },
    }
  )

  const data = await res.json()

  return new Response(
    JSON.stringify({
      url: data?.gltf?.url || null,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
})