// A local stand-in for the Apps Script endpoint, for testing the tracking without a Sheet.
//   bun tracking/mock-endpoint.ts          (listens on :8787)
//   VITE_TRACKING_URL=http://localhost:8787 npx vite --port 5201
// POST / receives batches; GET /events returns everything received; DELETE /events clears it.
const events: Record<string, unknown>[] = []
const port = Number(process.env.PORT ?? 8787)

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url)
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' }
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (url.pathname === '/events') {
      if (req.method === 'DELETE') { events.length = 0; return new Response('cleared', { headers: cors }) }
      return Response.json(events, { headers: cors })
    }
    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await req.text()) as { token?: string; events?: Record<string, unknown>[] }
        for (const e of body.events ?? []) {
          events.push(e)
          console.log(`${e.layout} ${String(e.sid)} ${String(e.name)}${e.stepId ? ` ${e.stepId}` : e.tour ? ` ${e.tour}` : ''}${e.reason ? ` (${e.reason})` : ''}`)
        }
      } catch { return new Response('bad json', { status: 400, headers: cors }) }
      return new Response('ok', { headers: cors })
    }
    return new Response('mock tracking endpoint', { headers: cors })
  },
})
console.log(`mock tracking endpoint on http://localhost:${port}`)
