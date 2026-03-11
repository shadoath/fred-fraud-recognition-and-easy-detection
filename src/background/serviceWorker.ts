// FRED background service worker.
// Orchestrates Tier 1 → 2 → 3 scanning for the Gmail content script.
// Uses native fetch (not axios) — XHR is not available in service workers.

import { getAutoScanSettings } from "../lib/autoScanStorage"
import { getDeviceId } from "../lib/deviceId"
import { runHeuristics } from "../lib/heuristics"
import {
  API_KEY_STORAGE_KEY,
  CONNECTION_MODE_STORAGE_KEY,
  SELECTED_MODEL_STORAGE_KEY,
  recoverApiKey,
} from "../lib/keyStorage"

// Must match fraudService.ts values
const PROXY_URL = "https://fred-proxy.skylar-bolton.workers.dev"
const PROXY_SECRET = "8ca9bd89-9b8b-4b36-8578-a9ba2e3c69b0"
const LICENSE_KEY_STORAGE_KEY = "fredLicenseKey"

const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const TIER2_MODEL_BYOK = "gpt-4o-mini"
const MAX_CONTENT_TIER2 = 600
const MAX_CONTENT_TIER3 = 12000
const FLAG_INSTRUCTION =
  "each written in plain simple language that a non-technical person can easily understand (avoid technical jargon)"
const JSON_FOOTER = "\nEnsure the JSON is valid and properly formatted."

// ---------------------------------------------------------------------------
// Message types (shared protocol with gmailScanner.ts)
// ---------------------------------------------------------------------------

export interface ScanEmailMessage {
  type: "SCAN_EMAIL"
  emailData: { sender: string; subject: string; content: string; links: { href: string; text: string }[] }
}

export interface GetLastResultMessage {
  type: "GET_LAST_RESULT"
  tabId: number
}

type InboundMessage = ScanEmailMessage | GetLastResultMessage

interface Tier1ResultMessage {
  type: "TIER1_RESULT"
  score: number
  flags: string[]
}

interface Tier2ResultMessage {
  type: "TIER2_RESULT"
  suspicious: boolean
  confidence: number
}

interface ScanCompleteMessage {
  type: "SCAN_COMPLETE"
  result: { threatRating: number; explanation: string; flags: string[]; confidence?: number }
}

interface ScanErrorMessage {
  type: "SCAN_ERROR"
  message: string
}

// ---------------------------------------------------------------------------
// Prompt builders (duplicated from fraudService.ts to avoid bundling axios)
// ---------------------------------------------------------------------------

const buildTier2Prompt = (
  sender: string,
  subject: string,
  content: string,
  tier1Flags: string[]
): string => {
  const excerpt = content.slice(0, MAX_CONTENT_TIER2)
  const flagsText = tier1Flags.length > 0 ? tier1Flags.join("; ") : "none"
  return `You are a fraud detection filter. Quickly determine if this email needs deeper fraud analysis.

Sender: ${sender}
Subject: ${subject}
Content (first ${MAX_CONTENT_TIER2} chars): ${excerpt}
Automated flags: ${flagsText}

Reply with valid JSON only:
{"suspicious": true, "confidence": 0.85}
or
{"suspicious": false, "confidence": 0.90}

Use confidence 0.6+ when suspicious, 0.8+ when clearly phishing.${JSON_FOOTER}`
}

const buildTier3EmailPrompt = (sender: string, subject: string, content: string): string => {
  const truncated = content.slice(0, MAX_CONTENT_TIER3)
  const body = `${truncated}${content.length > MAX_CONTENT_TIER3 ? "...(truncated)" : ""}`
  return `You are a cybersecurity expert analyzing an email for potential fraud or phishing. Please analyze this email:

Sender: ${sender}
Subject: ${subject || "(No subject)"}
Content:
${body}

Analyze this email for signs of fraud, such as:
1. Suspicious URLs or domain names
2. Urgency language or pressure tactics
3. Grammar or spelling errors that could indicate a scam
4. Requests for sensitive information
5. Unexpected attachments or links
6. Mismatched sender display name vs. email domain
7. Impersonation of legitimate organizations
8. Suspicious offers, deals, or requests

Provide your analysis in JSON format with the following fields:
- threatRating: A number from 1 to 100 where 1 is completely safe and 100 is highly dangerous
- explanation: A detailed explanation of why this email is or isn't suspicious
- flags: An array of suspicious things found, ${FLAG_INSTRUCTION}
- confidence: A number between 0 and 1 indicating your confidence in the assessment
${JSON_FOOTER}`
}

// ---------------------------------------------------------------------------
// OpenAI / proxy call (native fetch)
// ---------------------------------------------------------------------------

interface UserCredentials {
  apiKey: string
  connectionMode: string
  selectedModel: string
  deviceId: string
  licenseKey: string | null
}

const readCredentials = async (): Promise<UserCredentials | null> => {
  const storage = await chrome.storage.local.get([
    API_KEY_STORAGE_KEY,
    CONNECTION_MODE_STORAGE_KEY,
    SELECTED_MODEL_STORAGE_KEY,
    LICENSE_KEY_STORAGE_KEY,
  ])
  const connectionMode: string = storage[CONNECTION_MODE_STORAGE_KEY] ?? "proxy"
  const obfuscated: string | undefined = storage[API_KEY_STORAGE_KEY]
  const apiKey = obfuscated ? recoverApiKey(obfuscated) : ""
  const selectedModel: string = storage[SELECTED_MODEL_STORAGE_KEY] ?? "gpt-4o-mini"
  const licenseKey: string | null = storage[LICENSE_KEY_STORAGE_KEY] ?? null
  const deviceId = await getDeviceId()

  // Must have either a valid API key (byok) or be using the proxy
  if (connectionMode === "byok" && !apiKey) return null
  return { apiKey, connectionMode, selectedModel, deviceId, licenseKey }
}

const callOpenAI = async (
  prompt: string,
  model: string,
  maxTokens: number,
  creds: UserCredentials
): Promise<string> => {
  const payload = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  }

  let response: Response
  if (creds.connectionMode === "proxy") {
    response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-FRED-Secret": PROXY_SECRET },
      body: JSON.stringify({ deviceId: creds.deviceId, licenseKey: creds.licenseKey, payload }),
    })
  } else {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${creds.apiKey}` },
      body: JSON.stringify({ ...payload, model }),
    })
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
    code?: string
    message?: string
  }

  if (!response.ok) {
    const msg = data.message ?? data.error?.message ?? `API error ${response.status}`
    throw new Error(msg)
  }

  return data.choices?.[0]?.message?.content ?? ""
}

// ---------------------------------------------------------------------------
// Tier 2 — cheap AI triage
// ---------------------------------------------------------------------------

const runTier2 = async (
  sender: string,
  subject: string,
  content: string,
  tier1Flags: string[],
  creds: UserCredentials
): Promise<{ suspicious: boolean; confidence: number }> => {
  const model = creds.connectionMode === "byok" ? TIER2_MODEL_BYOK : creds.selectedModel
  const prompt = buildTier2Prompt(sender, subject, content, tier1Flags)
  const raw = await callOpenAI(prompt, model, 100, creds)
  const parsed = JSON.parse(raw) as { suspicious?: boolean; confidence?: number }
  return {
    suspicious: parsed.suspicious === true,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
  }
}

// ---------------------------------------------------------------------------
// Tier 3 — full email analysis
// ---------------------------------------------------------------------------

const runTier3 = async (
  sender: string,
  subject: string,
  content: string,
  creds: UserCredentials
): Promise<{ threatRating: number; explanation: string; flags: string[]; confidence?: number }> => {
  const prompt = buildTier3EmailPrompt(sender, subject, content)
  const raw = await callOpenAI(prompt, creds.selectedModel, 1200, creds)
  const parsed = JSON.parse(raw) as {
    threatRating?: number
    explanation?: string
    flags?: unknown
    confidence?: number
  }

  if (!parsed.threatRating || !parsed.explanation) {
    throw new Error("Unexpected response format from AI")
  }

  return {
    threatRating: Math.max(1, Math.min(100, Math.round(parsed.threatRating))),
    explanation: parsed.explanation,
    flags: Array.isArray(parsed.flags) ? (parsed.flags as string[]) : [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
  }
}

// ---------------------------------------------------------------------------
// Access gate: auto-scan requires BYOK or paid proxy
// ---------------------------------------------------------------------------

const isAutoScanEligible = (connectionMode: string, licenseKey: string | null): boolean => {
  if (connectionMode === "byok") return true
  if (connectionMode === "proxy" && licenseKey) return true
  return false
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message: InboundMessage, sender, sendResponse) => {
    if (message.type === "GET_LAST_RESULT") {
      const tabId = message.tabId
      chrome.storage.local.get("fredPendingResult").then((storage) => {
        const pending = storage.fredPendingResult as { tabId: number; result: unknown } | undefined
        sendResponse(pending?.tabId === tabId ? pending.result : null)
      })
      return true // keep channel open for async sendResponse
    }

    if (message.type === "SCAN_EMAIL") {
      const tabId = sender.tab?.id
      if (!tabId) return

      const { emailData } = message
      handleScan(tabId, emailData).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Unknown error"
        chrome.tabs.sendMessage(tabId, { type: "SCAN_ERROR", message: msg } satisfies ScanErrorMessage)
      })
    }
  }
)

const handleScan = async (
  tabId: number,
  emailData: ScanEmailMessage["emailData"]
): Promise<void> => {
  const { sender, subject, content, links } = emailData

  // ── Tier 1: heuristics ──────────────────────────────────────────────────
  const { score, flags } = runHeuristics({ sender, subject, content, links })

  chrome.tabs.sendMessage(tabId, {
    type: "TIER1_RESULT",
    score,
    flags,
  } satisfies Tier1ResultMessage)

  // Read settings after Tier 1 (fast path above doesn't need them)
  const settings = await getAutoScanSettings()
  const creds = await readCredentials()

  if (!creds) {
    chrome.tabs.sendMessage(tabId, {
      type: "SCAN_ERROR",
      message: "No API key configured",
    } satisfies ScanErrorMessage)
    return
  }

  // Gate: auto-scan AI tiers require BYOK or paid proxy
  if (!isAutoScanEligible(creds.connectionMode, creds.licenseKey)) {
    // For free users: Tier 1 result is all they get via auto-scan.
    // The manual button in the badge triggers a full scan.
    const completeResult = {
      threatRating: score,
      explanation:
        score >= settings.tier2Threshold
          ? "Automated checks found suspicious patterns. Upgrade to FRED Premium or use your own API key for a full AI analysis."
          : "Automated checks found no obvious threats. Upgrade to FRED Premium for a full AI analysis.",
      flags,
    }
    chrome.tabs.sendMessage(tabId, {
      type: "SCAN_COMPLETE",
      result: completeResult,
    } satisfies ScanCompleteMessage)
    await chrome.storage.local.set({ fredPendingResult: { tabId, result: completeResult } })
    return
  }

  // Only escalate if Tier 1 scored above threshold
  if (score < settings.tier2Threshold) {
    const completeResult = { threatRating: score, explanation: "No significant threats detected by automated checks.", flags }
    chrome.tabs.sendMessage(tabId, { type: "SCAN_COMPLETE", result: completeResult } satisfies ScanCompleteMessage)
    await chrome.storage.local.set({ fredPendingResult: { tabId, result: completeResult } })
    return
  }

  // ── Tier 2: cheap AI triage ──────────────────────────────────────────────
  let tier2Result: { suspicious: boolean; confidence: number }
  try {
    tier2Result = await runTier2(sender, subject, content, flags, creds)
  } catch {
    // Tier 2 failure: fall back to Tier 1 result
    const fallback = { threatRating: score, explanation: "AI triage unavailable. Showing automated check results.", flags }
    chrome.tabs.sendMessage(tabId, { type: "SCAN_COMPLETE", result: fallback } satisfies ScanCompleteMessage)
    await chrome.storage.local.set({ fredPendingResult: { tabId, result: fallback } })
    return
  }

  chrome.tabs.sendMessage(tabId, {
    type: "TIER2_RESULT",
    suspicious: tier2Result.suspicious,
    confidence: tier2Result.confidence,
  } satisfies Tier2ResultMessage)

  if (!tier2Result.suspicious || tier2Result.confidence < settings.tier3Threshold) {
    const completeResult = { threatRating: score, explanation: "AI triage found no significant threats.", flags }
    chrome.tabs.sendMessage(tabId, { type: "SCAN_COMPLETE", result: completeResult } satisfies ScanCompleteMessage)
    await chrome.storage.local.set({ fredPendingResult: { tabId, result: completeResult } })
    return
  }

  // ── Tier 3: full AI analysis ─────────────────────────────────────────────
  let tier3Result: { threatRating: number; explanation: string; flags: string[]; confidence?: number }
  try {
    tier3Result = await runTier3(sender, subject, content, creds)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Deep scan failed"
    chrome.tabs.sendMessage(tabId, { type: "SCAN_ERROR", message: msg } satisfies ScanErrorMessage)
    return
  }

  chrome.tabs.sendMessage(tabId, { type: "SCAN_COMPLETE", result: tier3Result } satisfies ScanCompleteMessage)
  await chrome.storage.local.set({ fredPendingResult: { tabId, result: tier3Result } })
}
