// Edge Function « stylist » — la clé API reste côté serveur.
// Déploiement : supabase functions deploy stylist
// Secret      : supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { message, history = [], wardrobe = [], weather, date } = await req.json()
    const system =
      'Tu es le styliste personnel d’un homme au goût sûr. Tu composes des tenues UNIQUEMENT avec les pièces de la liste fournie ' +
      '(identifiants exacts). N’invente aucune pièce. Tiens compte de la météo, de la saison, des couleurs, de la formalité et des pièces peu portées. ' +
      'Réponds en JSON strict : {"title": string, "message": string (2-3 phrases en français), "itemIds": string[]} avec un haut, un bas (ou un costume), des chaussures, éventuellement une veste et un accessoire.'
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5',
        max_tokens: 600,
        system,
        messages: [
          ...history,
          { role: 'user', content: `Date: ${date}\nMétéo: ${JSON.stringify(weather)}\nDressing: ${JSON.stringify(wardrobe)}\n\nDemande: ${message}` },
        ],
      }),
    })
    if (!r.ok) return new Response(JSON.stringify({ error: 'upstream' }), { status: 502, headers: cors })
    const j: any = await r.json()
    const text: string = j.content?.[0]?.text ?? '{}'
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    return new Response(JSON.stringify(parsed), { headers: { ...cors, 'content-type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: cors })
  }
})
