import { serve } from 'https://deno.land/std/http/server.ts'

serve(async (req) => {
  const url = new URL(req.url)

  const query = url.searchParams.toString()

  const res = await fetch(
    `https://api.sketchfab.com/v3/search?${query}`,
    {
      headers: {
        Authorization: `Token ${Deno.env.get('SKETCHFAB_TOKEN')}`,
      },
    }
  )

  const data = await res.text()

  return new Response(data, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})