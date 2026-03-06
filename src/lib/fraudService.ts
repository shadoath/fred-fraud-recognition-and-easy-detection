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

// OpenAI API URL (used in BYOK mode)
export const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

// Proxy URL — update after deploying the Cloudflare Worker
export const PROXY_URL = "https://fred-proxy.skylar-bolton.workers.dev"

// Shared secret sent with proxy requests (must match FRED_SECRET worker secret)
export const PROXY_SECRET = "8ca9bd89-9b8b-4b36-8578-a9ba2e3c69b0"

// Free tier weekly check limit — must match WEEKLY_LIMIT in fred-proxy/wrangler.toml
export const FREE_CHECKS_PER_WEEK = 25

// Configuration constants
const DEFAULT_MODEL = "gpt-3.5-turbo"
const MAX_CONTENT_LENGTH = 12000
const DEFAULT_TEMPERATURE = 0.2
const MAX_TOKENS = 4000

// OpenAI API response structure
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

/**
 * Helper function to determine if data is EmailData
 */
function isEmailData(data: ContentData): data is EmailData {
  return "sender" in data && "subject" in data
}

/**
 * Helper function to determine if data is URLData
 */
function isURLData(data: ContentData): data is URLData {
  return "url" in data && !("visibleText" in data)
}

/**
 * Helper function to determine if data is PageData
 */
function isPageData(data: ContentData): data is PageData {
  return "visibleText" in data
}

/**
 * Helper function to build the prompt based on content type
 */
function buildPrompt(data: ContentData): string {
  if (isURLData(data)) {
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
- flags: An array of suspicious things found, each written in plain simple language that a non-technical person can easily understand (avoid technical jargon like 'typosquatting', 'homograph', 'TLD' — instead say things like 'the web address has a misspelling to look like a real company' or 'the web address ending is commonly used by scammers')
- confidence: A number between 0 and 1 indicating your confidence in the assessment

Ensure the JSON is valid and properly formatted.`
  }

  if (isPageData(data)) {
    const sensitiveFieldNames = ["password", "ssn", "social", "card", "cvv", "cvc", "account", "routing", "pin", "dob", "birth"]
    const hasSensitiveForms = data.forms.some((f) =>
      f.fieldTypes.includes("password") ||
      f.fieldNames.some((n) => sensitiveFieldNames.some((s) => n.includes(s)))
    )
    const hasIframes = data.iframeSources.length > 0

    const formSummary = data.forms.length === 0
      ? "None"
      : data.forms.map((f, i) =>
          `Form ${i + 1}: field types [${f.fieldTypes.join(", ")}], field names [${f.fieldNames.join(", ")}]`
        ).join("\n")

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

Ensure the JSON is valid and properly formatted.`
  }

  const truncatedContent = (data as EmailData | TextData).content.substring(0, MAX_CONTENT_LENGTH)
  const isTruncated = (data as EmailData | TextData).content.length > MAX_CONTENT_LENGTH
  const contentDisplay = `${truncatedContent}${isTruncated ? "...(truncated)" : ""}`

  if (isEmailData(data)) {
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
- flags: An array of suspicious things found, each written in plain simple language that a non-technical person can easily understand (avoid technical jargon like 'typosquatting', 'homograph', 'TLD' — instead say things like 'the web address has a misspelling to look like a real company' or 'the web address ending is commonly used by scammers')
- confidence: A number between 0 and 1 indicating your confidence in the assessment

Ensure the JSON is valid and properly formatted.`
  } else {
    return `You are a cybersecurity expert analyzing text for potential fraud, scams, or suspicious content. Please analyze this text:

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
- flags: An array of suspicious things found, each written in plain simple language that a non-technical person can easily understand (avoid technical jargon like 'typosquatting', 'homograph', 'TLD' — instead say things like 'the web address has a misspelling to look like a real company' or 'the web address ending is commonly used by scammers')
- confidence: A number between 0 and 1 indicating your confidence in the assessment

Ensure the JSON is valid and properly formatted.`
  }
}

interface CheckOptions {
  apiKey?: string
  model?: string
  connectionMode?: ConnectionMode
  deviceId?: string
}

/**
 * Unified function to check content for fraud using OpenAI (BYOK or proxy)
 */
export async function checkContentWithOpenAI(
  data: ContentData,
  apiKey: string,
  model: string = DEFAULT_MODEL,
  connectionMode: ConnectionMode = "byok",
  deviceId?: string
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
      // Route through FRED's Cloudflare Worker proxy
      response = await axios.post<OpenAIResponse>(
        PROXY_URL,
        { deviceId, payload: openaiPayload },
        {
          headers: {
            "Content-Type": "application/json",
            "X-FRED-Secret": PROXY_SECRET,
          },
        }
      )
    } else {
      // Direct BYOK call to OpenAI
      response = await axios.post<OpenAIResponse>(OPENAI_API_URL, openaiPayload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      })
    }

    // Parse the response content from OpenAI
    if (response.data.choices?.length > 0) {
      try {
        const content = response.data.choices[0].message.content
        const result = JSON.parse(content)

        // Validate the response format
        if (!result.threatRating || !result.explanation) {
          throw new Error("Invalid response format from OpenAI")
        }

        // Ensure threatRating is within the expected range (1-100)
        const threatRating = Math.max(1, Math.min(100, Math.round(result.threatRating)))

        // Return the standardized response
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

    // Handle OpenAI API errors
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      if (axiosError.response) {
        throw {
          success: false,
          message: `OpenAI API error: ${axiosError.response.status}`,
          status: axiosError.response.status,
          error: axiosError.response.data,
        }
      }
    }

    // For other errors, standardize the format
    const contentType = isEmailData(data) ? "email" : isURLData(data) ? "url" : isPageData(data) ? "page" : "text"
    throw {
      success: false,
      message: error instanceof Error ? error.message : `Unknown error analyzing ${contentType}`,
    } as ApiErrorResponse
  }
}

/**
 * Backward compatibility wrapper for email checking
 * @param emailData The email data to analyze
 * @param apiKey OpenAI API key
 * @returns The fraud check results
 */
export async function checkEmailWithOpenAI(
  emailData: EmailData,
  apiKey: string
): Promise<FraudCheckResponse> {
  return checkContentWithOpenAI(emailData, apiKey)
}

/**
 * Backward compatibility wrapper for text checking
 * @param textData The text data to analyze
 * @param apiKey OpenAI API key
 * @returns The fraud check results
 */
export async function checkTextWithOpenAI(
  textData: TextData,
  apiKey: string
): Promise<FraudCheckResponse> {
  return checkContentWithOpenAI(textData, apiKey)
}

/**
 * Unified safe check function for content analysis
 * @param data The content data to analyze
 * @param apiKey OpenAI API key
 * @param model Optional model override
 * @returns A tuple with [data, error] where only one is defined
 */
export async function safeCheckContentWithOpenAI(
  data: ContentData,
  apiKey: string,
  model?: string,
  connectionMode: ConnectionMode = "byok",
  deviceId?: string
): Promise<[FraudCheckResponse | null, ApiErrorResponse | null]> {
  try {
    const result = await checkContentWithOpenAI(data, apiKey, model, connectionMode, deviceId)
    return [result, null]
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      message: "An unexpected error occurred during fraud check",
    }

    if (error && typeof error === "object" && "success" in error && !error.success) {
      return [null, error as ApiErrorResponse]
    }

    if (error instanceof Error) {
      errorResponse.message = error.message
    }

    return [null, errorResponse]
  }
}

/**
 * Backward compatibility wrapper for safe email checking
 * @param emailData The email data to analyze
 * @param apiKey OpenAI API key
 * @returns A tuple with [data, error] where only one is defined
 */
export async function safeCheckEmailWithOpenAI(
  emailData: EmailData,
  apiKey: string
): Promise<[FraudCheckResponse | null, ApiErrorResponse | null]> {
  return safeCheckContentWithOpenAI(emailData, apiKey)
}

/**
 * Backward compatibility wrapper for safe text checking
 * @param textData The text data to analyze
 * @param apiKey OpenAI API key
 * @returns A tuple with [data, error] where only one is defined
 */
export async function safeCheckTextWithOpenAI(
  textData: TextData,
  apiKey: string
): Promise<[FraudCheckResponse | null, ApiErrorResponse | null]> {
  return safeCheckContentWithOpenAI(textData, apiKey)
}

// Export type references for backward compatibility
export type {
  ApiErrorResponse,
  EmailData,
  FraudCheckResponse,
  PageData,
  TextData,
  URLData,
} from "../types/fraudTypes"
