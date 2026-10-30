// Vercel serverless function: GET /api/sightings
// Fetches Acartia's public current-sightings feed (last 7 days) on the server so
// the browser doesn't hit cross-origin (CORS) restrictions. ACARTIA_TOKEN is
// optional and, if set, never reaches the browser.

const ACARTIA_URL = 'https://acartia.io/api/v1/sightings/current'

export async function GET(): Promise<Response> {
  const token = process.env.ACARTIA_TOKEN
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const upstream = await fetch(ACARTIA_URL, { headers })
    if (!upstream.ok) {
      return Response.json(
        { error: `Acartia responded with ${upstream.status}`, hasToken: Boolean(token) },
        { status: 502 },
      )
    }
    const data = await upstream.text()
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        // Let Vercel's CDN cache for a minute so we're polite to Acartia.
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 })
  }
}
