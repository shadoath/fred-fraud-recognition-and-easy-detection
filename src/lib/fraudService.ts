import axios, { type AxiosError } from "axios"
import type {
  ApiErrorResponse,
  EmailData,
  FraudCheckResponse,
  PageData,
  TextData,
  URLData,
} from "../types/fraudTypes"
import type { ConnectionMode } from "./keyStorage"

export const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
export const PROXY_URL = "https://fred-proxy.skylar-bolton.workers.dev"
export const PROXY_SECRET = "8ca9bd89-9b8b-4b36-8578-a9ba2e3c69b0"

// Free tier monthly check limit — must match FREE_MONTHLY_LIMIT in fred-proxy/wrangler.toml
export const FREE_CHECKS_PER_MONTH = 5

// Paid tier monthly check limit — must match PAID_MONTHLY_LIMIT in fred-proxy/wrangler.toml
export const PAID_CHECKS_PER_MONTH = 300

const DEFAULT_MODEL = "gpt-3.5-turbo"
const MAX_CONTENT_LENGTH = 12000
const DEFAULT_TEMPERATURE = 0.2
const MAX_TOKENS = 4000

interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

type ContentData = EmailData | TextData | URLData | PageData

function isEmailData(data: ContentData): data is EmailData {
  return "sender" in data && "subject" in data
}

function isURLData(data: ContentData): data is URLData {
  return "url" in data && !("visibleText" in data) && !("content" in data)
}

function isPageData(data: ContentData): data is PageData {
  return "visibleText" in data
}

const JSON_FOOTER = `\nEnsure the JSON is valid and properly formatted.`

const FLAG_INSTRUCTION = `each written in plain simple language that a non-technical person can easily understand (avoid technical jargon like 'typosquatting', 'homograph', 'TLD' — instead say things like 'the web address has a misspelling to look like a real company' or 'the web address ending is commonly used by scammers')`

function buildURLPrompt(data: URLData): string {
  return `You are a cybersecurity expert analyzing a URL for potential fraud, phishing, or malicious content. Please analyze this URL:

URL: ${data.url}

Analyze this URL for signs of danger, such as:
1. Suspicious or misspelled domain names (typosquatting)
2. URL shorteners that hide the real destination
3. Excessive subdomains or unusual URL structure
4. Known phishing patterns or brand impersonation
5. Suspicious TLDs (.xyz, .tk, .ml, etc. used for scams)
6. IP address used instead of domain name
7. Unusual ports or query parameters
8. Look-alike characters (homograph attacks)

Provide your analysis in JSON format with the following fields:
- threatRating: A number from 1 to 100 where 1 is completely safe and 100 is highly dangerous
- explanation: A detailed explanation of why this URL is or isn't suspicious
- flags: An array of suspicious things found, ${FLAG_INSTRUCTION}
- confidence: A number between 0 and 1 indicating your confidence in the assessment
${JSON_FOOTER}`
}

function buildPagePrompt(data: PageData): string {
  const sensitiveFieldNames = ["password", "ssn", "social", "card", "cvv", "cvc", "account", "routing", "pin", "dob", "birth"]
  const hasSensitiveForms = data.forms.some(
    (f) => f.fieldTypes.includes("password") || f.fieldNames.some((n) => sensitiveFieldNames.some((s) => n.includes(s)))
  )
  const hasIframes = data.iframeSources.length > 0
  const formSummary =
    data.forms.length === 0
      ? "None"
      : data.forms
          .map((f, i) => `Form ${i + 1}: field types [${f.fieldTypes.join(", ")}], field names [${f.fieldNames.join(", ")}]`)
          .join("\n")

  return `You are a cybersecurity expert analyzing a web page for potential fraud, scams, or phishing. Here is the page data:

URL: ${data.url}
Title: ${data.title}
Meta description: ${data.metaDescription || "(none)"}

Visible text (first 6000 chars):
${data.visibleText}

External domains linked from this page (${data.externalDomains.length}):
${data.externalDomains.join(", ") || "None"}

Forms on the page:
${formSummary}
Sensitive form fields detected: ${hasSensitiveForms ? "YES" : "No"}

Embedded iframes: ${hasIframes ? data.iframeSources.join(", ") : "None"}

Phone numbers found on page: ${data.phoneNumbers.join(", ") || "None"}

Analyze this page for signs of fraud such as:
1. Fake login pages designed to steal passwords or account credentials
2. Tech support scams (fake warnings, prominent phone numbers, urgency)
3. Fake prize, lottery, or giveaway pages
4. Impersonation of banks, government agencies, or well-known brands
5. Scam shopping sites with unrealistic deals
6. Unexpected forms asking for sensitive personal or financial information
7. Suspicious embedded content or iframes hiding malicious material
8. Investment or cryptocurrency fraud
9. Urgency tactics designed to pressure you into acting fast
10. Mismatch between what the page claims to be and its actual domain

Provide your analysis in JSON format with the following fields:
- threatRating: A number from 1 to 100 where 1 is completely safe and 100 is highly dangerous
- explanation: A detailed explanation of why this page is or isn't suspicious, written so a non-technical person can understand
- flags: An array of suspicious things found, each written in plain simple language (avoid jargon — say 'the page has a login form but the web address is not the real company' rather than 'credential phishing')
- confidence: A number between 0 and 1 indicating your confidence in the assessment
${JSON_FOOTER}`
}

function buildEmailPrompt(data: EmailData): string {
  const truncated = data.content.substring(0, MAX_CONTENT_LENGTH)
  const contentDisplay = `${truncated}${data.content.length > MAX_CONTENT_LENGTH ? "...(truncated)" : ""}`

  return `You are a cybersecurity expert analyzing an email for potential fraud or phishing. Please analyze this email:

Sender: ${data.sender}
Subject: ${data.subject || "(No subject)"}
Content:
${contentDisplay}

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

function buildTextPrompt(data: TextData): string {
  const truncated = data.content.substring(0, MAX_CONTENT_LENGTH)
  const contentDisplay = `${truncated}${data.content.length > MAX_CONTENT_LENGTH ? "...(truncated)" : ""}`
  const urlContext = data.url ? `\nSource URL or subject: ${data.url}\n` : ""

  return `You are a cybersecurity expert analyzing text for potential fraud, scams, or suspicious content. Please analyze this text:
${urlContext}
Content:
${contentDisplay}

Analyze this text for signs of fraud, such as:
1. Suspicious URLs or domain names
2. Urgency language or pressure tactics
3. Grammar or spelling errors that could indicate a scam
4. Requests for sensitive information
5. Unusual or unexpected claims
6. Impersonation of legitimate organizations
7. Suspicious offers, deals, or requests
8. Potential investment or cryptocurrency scams
9. Romance or relationship manipulation tactics
10. Fear-based or threatening language

Provide your analysis in JSON format with the following fields:
- threatRating: A number from 1 to 100 where 1 is completely safe and 100 is highly dangerous
- explanation: A detailed explanation of why this content is or isn't suspicious
- flags: An array of suspicious things found, ${FLAG_INSTRUCTION}
- confidence: A number between 0 and 1 indicating your confidence in the assessment
${JSON_FOOTER}`
}

function buildPrompt(data: ContentData): string {
  if (isURLData(data)) return buildURLPrompt(data)
  if (isPageData(data)) return buildPagePrompt(data)
  if (isEmailData(data)) return buildEmailPrompt(data)
  return buildTextPrompt(data as TextData)
}

export async function checkContentWithOpenAI(
  data: ContentData,
  apiKey: string,
  model: string = DEFAULT_MODEL,
  connectionMode: ConnectionMode = "byok",
  deviceId?: string,
  licenseKey?: string
): Promise<FraudCheckResponse> {
  try {
    const prompt = buildPrompt(data)

    const openaiPayload = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: { type: "json_object" },
    }

    let response: { data: OpenAIResponse }

    if (connectionMode === "proxy") {
      response = await axios.post<OpenAIResponse>(
        PROXY_URL,
        { deviceId, licenseKey, payload: openaiPayload },
        { headers: { "Content-Type": "application/json", "X-FRED-Secret": PROXY_SECRET } }
      )
    } else {
      response = await axios.post<OpenAIResponse>(OPENAI_API_URL, openaiPayload, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      })
    }

    if (response.data.choices?.length > 0) {
      try {
        const content = response.data.choices[0].message.content
        const result = JSON.parse(content)

        if (!result.threatRating || !result.explanation) {
          throw new Error("Invalid response format from OpenAI")
        }

        const threatRating = Math.max(1, Math.min(100, Math.round(result.threatRating)))

        return {
          success: true,
          threatRating,
          explanation: result.explanation,
          flags: Array.isArray(result.flags) ? result.flags : [],
          confidence: typeof result.confidence === "number" ? result.confidence : undefined,
          tokenUsage: response.data.usage
            ? {
                promptTokens: response.data.usage.prompt_tokens,
                completionTokens: response.data.usage.completion_tokens,
                totalTokens: response.data.usage.total_tokens,
              }
            : undefined,
        }
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError)
        throw new Error("Failed to parse fraud analysis results")
      }
    } else {
      throw new Error("No valid response from OpenAI")
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error)

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      if (axiosError.response) {
        const responseData = axiosError.response.data as { code?: string; message?: string; isPaid?: boolean } | undefined
        const isRateLimited = axiosError.response.status === 429 && responseData?.code === "RATE_LIMITED"
        const licenseNotRecognized = isRateLimited && responseData?.isPaid === false && !!licenseKey
        const proxyMessage = isRateLimited
          ? licenseNotRecognized
            ? "Your license key couldn't be verified. Check that your subscription is active."
            : (responseData?.message ?? "Monthly check limit reached.")
          : undefined
        throw {
          success: false,
          message: proxyMessage ?? `OpenAI API error: ${axiosError.response.status}`,
          status: axiosError.response.status,
        }
      }
    }

    const contentType = isEmailData(data) ? "email" : isURLData(data) ? "url" : isPageData(data) ? "page" : "text"
    throw {
      success: false,
      message: error instanceof Error ? error.message : `Unknown error analyzing ${contentType}`,
    } as ApiErrorResponse
  }
}

export async function safeCheckContentWithOpenAI(
  data: ContentData,
  apiKey: string,
  model?: string,
  connectionMode: ConnectionMode = "byok",
  deviceId?: string,
  licenseKey?: string
): Promise<[FraudCheckResponse | null, ApiErrorResponse | null]> {
  try {
    const result = await checkContentWithOpenAI(data, apiKey, model, connectionMode, deviceId, licenseKey)
    return [result, null]
  } catch (error) {
    if (error && typeof error === "object" && "success" in error && !error.success) {
      return [null, error as ApiErrorResponse]
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred during fraud check",
    }
    return [null, errorResponse]
  }
}

export const activateLicenseKey = async (
  licenseKey: string,
  deviceId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await axios.post<{ success: boolean; error?: string }>(
      `${PROXY_URL}/activate`,
      { licenseKey, deviceId },
      { headers: { "Content-Type": "application/json", "X-FRED-Secret": PROXY_SECRET } }
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      return { success: false, error: error.response.data.error }
    }
    return { success: false, error: "Failed to activate license key" }
  }
}

export type {
  ApiErrorResponse,
  EmailData,
  FraudCheckResponse,
  PageData,
  TextData,
  URLData,
} from "../types/fraudTypes"
