export interface Env {
  USAGE_KV: KVNamespace
  OPENAI_API_KEY: string
  FRED_SECRET: string
  WEEKLY_LIMIT: string
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const DEFAULT_WEEKLY_LIMIT = 25

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-FRED-Secret",
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })

const getWeekNumber = (): number => Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))

const isValidDeviceId = (id: unknown): id is string =>
  typeof id === "string" && /^[0-9a-f-]{36}$/.test(id)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405)
    }

    // Verify shared secret to prevent casual abuse
    const secret = request.headers.get("X-FRED-Secret")
    if (!env.FRED_SECRET || secret !== env.FRED_SECRET) {
      return json({ error: "Unauthorized" }, 401)
    }

    let body: { deviceId?: unknown; payload?: unknown }
    try {
      body = await request.json()
    } catch {
      return json({ error: "Invalid JSON body" }, 400)
    }

    const { deviceId, payload } = body

    if (!isValidDeviceId(deviceId)) {
      return json({ error: "Invalid or missing deviceId" }, 400)
    }

    if (!payload || typeof payload !== "object") {
      return json({ error: "Invalid or missing payload" }, 400)
    }

    // Rate limiting
    const weeklyLimit = Number.parseInt(env.WEEKLY_LIMIT ?? String(DEFAULT_WEEKLY_LIMIT))
    const kvKey = `${deviceId}:${getWeekNumber()}`
    const currentCount = Number.parseInt((await env.USAGE_KV.get(kvKey)) ?? "0")

    if (currentCount >= weeklyLimit) {
      return json(
        {
          error: "Weekly limit reached",
          code: "RATE_LIMITED",
          used: currentCount,
          limit: weeklyLimit,
          message: `You've used all ${weeklyLimit} free checks this week. Checks reset every Monday. Add your own OpenAI key in FRED's settings for unlimited access.`,
        },
        429
      )
    }

    // Increment usage before the OpenAI call (prevents race-condition abuse)
    await env.USAGE_KV.put(kvKey, String(currentCount + 1), {
      expirationTtl: 14 * 24 * 60 * 60, // 14 days, auto-cleanup
    })

    // Forward to OpenAI
    let openaiResponse: Response
    try {
      openaiResponse = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      })
    } catch {
      // Refund the check on network failure
      await env.USAGE_KV.put(kvKey, String(currentCount), {
        expirationTtl: 14 * 24 * 60 * 60,
      })
      return json({ error: "Failed to reach OpenAI" }, 502)
    }

    const data = await openaiResponse.json()

    // Pass through OpenAI errors without consuming the check
    if (!openaiResponse.ok) {
      await env.USAGE_KV.put(kvKey, String(currentCount), {
        expirationTtl: 14 * 24 * 60 * 60,
      })
      return json(data, openaiResponse.status)
    }

    return json(data)
  },
}
