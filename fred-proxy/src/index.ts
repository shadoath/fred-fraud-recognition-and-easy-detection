export interface Env {
  USAGE_KV: KVNamespace
  OPENAI_API_KEY: string
  FRED_SECRET: string
  FREE_MONTHLY_LIMIT: string
  PAID_MONTHLY_LIMIT: string
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const DEFAULT_FREE_LIMIT = 3
const DEFAULT_PAID_LIMIT = 300
const LICENSE_CACHE_TTL = 60 * 60 // 1 hour in seconds
const KV_EXPIRATION_TTL = 60 * 24 * 60 * 60 // 60 days in seconds

const FREE_MODEL = "gpt-4o-mini"
const PAID_MODEL = "gpt-4o"

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

const getMonthKey = (): string => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

const isValidDeviceId = (id: unknown): id is string =>
  typeof id === "string" && /^[0-9a-f-]{36}$/.test(id)

interface LicenseValidation {
  valid: boolean
  cachedAt: number
}

const validateLicenseKey = async (licenseKey: string, env: Env): Promise<boolean> => {
  if (!licenseKey) return false

  // Check KV cache first
  const cacheKey = `ls:valid:${licenseKey}`
  const cached = await env.USAGE_KV.get<LicenseValidation>(cacheKey, "json")

  if (cached && Date.now() / 1000 - cached.cachedAt < LICENSE_CACHE_TTL) {
    return cached.valid
  }

  // Validate license key via LemonSqueezy public endpoint
  try {
    const response = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: licenseKey }),
    })

    const data = await response.json()

    const typed = data as { valid?: boolean; license_key?: { status?: string } }
    const status = typed.license_key?.status
    const valid = typed.valid === true && status !== "disabled" && status !== "expired"

    // Cache the result
    await env.USAGE_KV.put(cacheKey, JSON.stringify({ valid, cachedAt: Date.now() / 1000 }), {
      expirationTtl: LICENSE_CACHE_TTL * 2,
    })

    return valid
  } catch {
    // On network failure, fall back to cached value if any (even stale)
    return cached?.valid ?? false
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405)
    }

    // Verify shared secret
    const secret = request.headers.get("X-FRED-Secret")
    if (!env.FRED_SECRET || secret !== env.FRED_SECRET) {
      return json({ error: "Unauthorized" }, 401)
    }

    const url = new URL(request.url)

    // License key activation endpoint
    if (url.pathname === "/activate") {
      let body: { licenseKey?: unknown; deviceId?: unknown }
      try {
        body = await request.json()
      } catch {
        return json({ error: "Invalid JSON body" }, 400)
      }

      const { licenseKey, deviceId } = body

      if (typeof licenseKey !== "string" || !licenseKey) {
        return json({ error: "Missing licenseKey" }, 400)
      }
      if (!isValidDeviceId(deviceId)) {
        return json({ error: "Invalid or missing deviceId" }, 400)
      }

      try {
        const lsResponse = await fetch("https://api.lemonsqueezy.com/v1/licenses/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ license_key: licenseKey, instance_name: deviceId }),
        })

        const data = (await lsResponse.json()) as { activated?: boolean; error?: string }

        // "already activated for this instance" still means the key is valid
        const alreadyActive = data.error?.toLowerCase().includes("already")
        if (data.activated || alreadyActive) {
          // Clear any cached invalid result so next check re-validates cleanly
          await env.USAGE_KV.delete(`ls:valid:${licenseKey}`)
          return json({ success: true })
        }

        return json({ success: false, error: data.error ?? "Activation failed" }, 422)
      } catch {
        return json({ error: "Failed to reach LemonSqueezy" }, 502)
      }
    }

    let body: { deviceId?: unknown; licenseKey?: unknown; payload?: unknown }
    try {
      body = await request.json()
    } catch {
      return json({ error: "Invalid JSON body" }, 400)
    }

    const { deviceId, licenseKey, payload } = body

    if (!isValidDeviceId(deviceId)) {
      return json({ error: "Invalid or missing deviceId" }, 400)
    }

    if (!payload || typeof payload !== "object") {
      return json({ error: "Invalid or missing payload" }, 400)
    }

    // Determine if this is a paid user
    const isPaid =
      typeof licenseKey === "string" && licenseKey.length > 0
        ? await validateLicenseKey(licenseKey, env)
        : false

    // Rate limiting — monthly, keyed by license (paid) or device (free)
    const monthKey = getMonthKey()
    const limit = isPaid
      ? Number.parseInt(env.PAID_MONTHLY_LIMIT ?? String(DEFAULT_PAID_LIMIT))
      : Number.parseInt(env.FREE_MONTHLY_LIMIT ?? String(DEFAULT_FREE_LIMIT))

    const kvKey = isPaid ? `paid:${licenseKey}:${monthKey}` : `free:${deviceId}:${monthKey}`

    const currentCount = Number.parseInt((await env.USAGE_KV.get(kvKey)) ?? "0")

    if (currentCount >= limit) {
      return json(
        {
          error: "Monthly limit reached",
          code: "RATE_LIMITED",
          isPaid,
          used: currentCount,
          limit,
          message: isPaid
            ? `You've used all ${limit} checks this month. Your limit resets next month.`
            : `You've used all ${limit} free checks this month. Upgrade to FRED Premium for ${DEFAULT_PAID_LIMIT} checks/month and better AI analysis.`,
        },
        429
      )
    }

    // Increment usage before the OpenAI call
    await env.USAGE_KV.put(kvKey, String(currentCount + 1), {
      expirationTtl: KV_EXPIRATION_TTL,
    })

    // Force the appropriate model based on tier
    const sanitizedPayload = {
      ...(payload as Record<string, unknown>),
      model: isPaid ? PAID_MODEL : FREE_MODEL,
    }

    // Forward to OpenAI
    let openaiResponse: Response
    try {
      openaiResponse = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(sanitizedPayload),
      })
    } catch {
      // Refund the check on network failure
      await env.USAGE_KV.put(kvKey, String(currentCount), {
        expirationTtl: KV_EXPIRATION_TTL,
      })
      return json({ error: "Failed to reach OpenAI" }, 502)
    }

    const data = await openaiResponse.json()

    // Pass through OpenAI errors without consuming the check
    if (!openaiResponse.ok) {
      await env.USAGE_KV.put(kvKey, String(currentCount), {
        expirationTtl: KV_EXPIRATION_TTL,
      })
      return json(data, openaiResponse.status)
    }

    return json(data)
  },
}
