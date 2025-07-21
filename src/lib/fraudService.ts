import axios, { type AxiosError } from "axios"
import type { ApiErrorResponse, EmailData, FraudCheckResponse, TextData } from "../types/fraudTypes"
import { devInfo, devDebug } from "./devUtils"

// OpenAI API URL
export const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

/**
 * Extracts all URLs from text content
 * @param content Text content to extract links from
 * @param isEmail Whether this content is from an email (enables HTML parsing)
 * @returns Array of unique URLs found in the content
 */
export function extractLinksFromContent(content: string, isEmail = false): string[] {
  devInfo(
    `[Link Extraction] Starting extraction - isEmail: ${isEmail}, content length: ${content.length}`
  )
  devInfo(content)
  const allLinks: string[] = []

  // For email content, try to parse as HTML and extract actual <a> tags
  if (isEmail) {
    devInfo(`[Link Extraction] Using HTML parsing for email content`)
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(content, "text/html")

      // Check if parsing was successful (no parsing errors)
      const parserError = doc.querySelector("parsererror")
      if (!parserError) {
        devInfo(`[Link Extraction] HTML parsed successfully, no parsing errors detected`)
        // Extract all <a href="..."> links
        const linkElements = doc.querySelectorAll("a[href]")
        devInfo(
          `[Link Extraction] Found ${linkElements.length} <a> elements with href attributes`
        )
        linkElements.forEach((link) => {
          const href = link.getAttribute("href")
          if (href) {
            // Clean and normalize the URL
            let cleanUrl = href.trim()

            // Skip javascript:, mailto:, tel:, and other non-http protocols
            if (/^(?:javascript|mailto|tel|sms|fax):/i.test(cleanUrl)) {
              devDebug(`[Link Extraction] Skipping non-http protocol: ${cleanUrl}`)
              return
            }

            // Skip anchor links and relative paths without domain
            if (
              cleanUrl.startsWith("#") ||
              (cleanUrl.startsWith("/") && !cleanUrl.startsWith("//"))
            ) {
              devDebug(`[Link Extraction] Skipping anchor/relative link: ${cleanUrl}`)
              return
            }

            // Handle protocol-relative URLs
            if (cleanUrl.startsWith("//")) {
              cleanUrl = "https:" + cleanUrl
            }

            // Add protocol if missing for domain-only URLs
            if (!cleanUrl.match(/^[a-z]+:/i) && cleanUrl.includes(".")) {
              cleanUrl = "https://" + cleanUrl
            }

            // Validate that it's a proper URL
            if (cleanUrl.match(/^https?:\/\/.+\..+/i)) {
              devDebug(`[Link Extraction] Added link from <a> tag: ${cleanUrl}`)
              allLinks.push(cleanUrl)
            } else {
              devDebug(`[Link Extraction] Invalid URL format, skipping: ${cleanUrl}`)
            }
          }
        })

        // Also extract URLs from other HTML elements that might contain them
        const elementsWithUrls = [
          { selector: "img[src]", attr: "src" },
          { selector: "form[action]", attr: "action" },
          { selector: "iframe[src]", attr: "src" },
          { selector: "embed[src]", attr: "src" },
          { selector: "object[data]", attr: "data" },
        ]
        devInfo(
          `[Link Extraction] Searching for URLs in other HTML elements: ${elementsWithUrls
            .map((e) => e.selector)
            .join(", ")}`
        )

        elementsWithUrls.forEach(({ selector, attr }) => {
          const elements = doc.querySelectorAll(selector)
          devDebug(
            `[Link Extraction] Found ${elements.length} elements for selector: ${selector}`
          )
          elements.forEach((element) => {
            const url = element.getAttribute(attr)
            if (url && url.match(/^https?:\/\/.+\..+/i)) {
              devDebug(`[Link Extraction] Added URL from ${selector}: ${url.trim()}`)
              allLinks.push(url.trim())
            }
          })
        })
      } else {
        devInfo(
          `[Link Extraction] HTML parsing detected errors, falling back to text extraction`
        )
      }
    } catch (error) {
      // HTML parsing failed, continue to text-based extraction
      devInfo(`[Link Extraction] HTML parsing failed, falling back to text extraction:`, error)
    }
  }

  // If HTML parsing didn't find any links, or if content isn't HTML, fall back to simple text extraction
  if (allLinks.length === 0) {
    devInfo(
      `[Link Extraction] ${
        isEmail ? "HTML parsing found no links, " : ""
      }Using text-based regex extraction`
    )
    // Simple but accurate regex for full URLs (including FTP, HTTP, HTTPS)
    const urlRegex = /(?:https?|ftp):\/\/[^\s<>"'(){}|\\^`]+[^\s<>"'(){}|\\^`.,;:!?]/gi
    const matches = content.match(urlRegex) || []
    devInfo(`[Link Extraction] Regex found ${matches.length} potential URLs`)

    matches.forEach((url) => {
      // Basic cleanup
      let cleanUrl = url.trim()

      // Remove common trailing punctuation
      cleanUrl = cleanUrl.replace(/[.,;:!?'")\]}]+$/, "")

      // Validate it has a proper domain structure (allow HTTP/HTTPS/FTP)
      if (cleanUrl.match(/^(?:https?|ftp):\/\/[^\/\s]+\.[^\/\s]{2,}/)) {
        devDebug(`[Link Extraction] Added URL from regex: ${cleanUrl}`)
        allLinks.push(cleanUrl)
      } else {
        devDebug(`[Link Extraction] Regex URL failed validation: ${cleanUrl}`)
      }
    })

    // Also look for www. domains and common domains in plain text
    const domainRegex =
      /(?:www\.|(?:^|\s))([a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|mil|co\.uk|tk|ly|me|io)\b)/gi
    const domainMatches = content.match(domainRegex) || []
    devInfo(`[Link Extraction] Domain regex found ${domainMatches.length} potential domains`)

    domainMatches.forEach((match) => {
      let domain = match.trim()

      // Skip if it looks like a name or title
      if (/^(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\./i.test(domain)) {
        devDebug(`[Link Extraction] Skipping title/name pattern: ${domain}`)
        return
      }

      // Clean up the domain
      if (!domain.startsWith("www.") && !domain.match(/^https?:/)) {
        // Extract just the domain part
        const domainMatch = domain.match(
          /([a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|mil|co\.uk|tk|ly|me|io))/i
        )
        if (domainMatch) {
          domain = domainMatch[1]
        }
      }

      // Add protocol
      if (!domain.match(/^https?:/)) {
        domain = "https://" + domain
      }

      // Validate and add
      if (domain.match(/^https?:\/\/[^\/\s]+\.[^\/\s]{2,}/)) {
        devDebug(`[Link Extraction] Added domain as URL: ${domain}`)
        allLinks.push(domain)
      } else {
        devDebug(`[Link Extraction] Domain failed final validation: ${domain}`)
      }
    })
  }

  // Remove duplicates and return
  const uniqueLinks = [...new Set(allLinks)]
  devInfo(
    `[Link Extraction] Extraction complete - Found ${allLinks.length} total links, ${uniqueLinks.length} unique links`
  )
  devInfo(`[Link Extraction] Final links:`, uniqueLinks)
  return uniqueLinks
}

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

/**
 * Calls OpenAI API to analyze an email for fraud
 * @param emailData The email data to analyze
 * @param apiKey OpenAI API key
 * @returns The fraud check results
 */
export async function checkEmailWithOpenAI(
  emailData: EmailData,
  apiKey: string
): Promise<FraudCheckResponse> {
  try {
    // Extract links from email content if not already provided (use HTML parsing for emails)
    const extractedLinks = emailData.links || extractLinksFromContent(emailData.content, true)

    const linksSection =
      extractedLinks.length > 0
        ? `\nLinks found in email:\n${extractedLinks
            .map((link, index) => `${index + 1}. ${link}`)
            .join("\n")}`
        : "\nNo links found in email."

    const prompt = `You are a cybersecurity expert analyzing an email for potential fraud or phishing. Please analyze this email:

Sender: ${emailData.sender}
Subject: ${emailData.subject || "(No subject)"}
Content:
${emailData.content.substring(0, 3500)} ${
      emailData.content.length > 3500 ? "...(truncated)" : ""
    }${linksSection}

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
- threatRating: A number from 1 to 10 where 1 is completely safe and 10 is highly dangerous
- explanation: A detailed explanation of why this email is or isn't suspicious
- flags: An array of specific suspicious elements detected
- confidence: A number between 0 and 1 indicating your confidence in the assessment

Ensure the JSON is valid and properly formatted.
`

    const response = await axios.post<OpenAIResponse>(
      OPENAI_API_URL,
      {
        model: "gpt-3.5-turbo", // Using the standard GPT model to reduce costs
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2, // Low temperature for more deterministic responses
        max_tokens: 1000, // Limit response size
        response_format: { type: "json_object" }, // Request JSON format
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    // Parse the response content from OpenAI
    if (response.data.choices && response.data.choices.length > 0) {
      try {
        const content = response.data.choices[0].message.content
        const result = JSON.parse(content)

        // Validate the response format
        if (!result.threatRating || !result.explanation) {
          throw new Error("Invalid response format from OpenAI")
        }

        // Ensure threatRating is within the expected range (1-10)
        const threatRating = Math.max(1, Math.min(10, Math.round(result.threatRating)))

        // Return the standardized response
        return {
          success: true,
          threatRating,
          explanation: result.explanation,
          flags: Array.isArray(result.flags) ? result.flags : [],
          confidence: typeof result.confidence === "number" ? result.confidence : undefined,
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
    throw {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error analyzing email",
    } as ApiErrorResponse
  }
}

/**
 * Calls OpenAI API to analyze generic text content for fraud
 * @param textData The text data to analyze
 * @param apiKey OpenAI API key
 * @returns The fraud check results
 */
export async function checkTextWithOpenAI(
  textData: TextData,
  apiKey: string
): Promise<FraudCheckResponse> {
  try {
    // Extract links from text content if not already provided (use text parsing for general text)
    const extractedLinks = textData.links || extractLinksFromContent(textData.content, false)

    const linksSection =
      extractedLinks.length > 0
        ? `\nLinks found in text:\n${extractedLinks
            .map((link, index) => `${index + 1}. ${link}`)
            .join("\n")}`
        : "\nNo links found in text."

    const prompt = `You are a cybersecurity expert analyzing text for potential fraud, scams, or suspicious content. Please analyze this text:

Content:
${textData.content.substring(0, 3500)} ${
      textData.content.length > 3500 ? "...(truncated)" : ""
    }${linksSection}

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
- threatRating: A number from 1 to 10 where 1 is completely safe and 10 is highly dangerous
- explanation: A detailed explanation of why this content is or isn't suspicious
- flags: An array of specific suspicious elements detected
- confidence: A number between 0 and 1 indicating your confidence in the assessment

Ensure the JSON is valid and properly formatted.
`

    const response = await axios.post<OpenAIResponse>(
      OPENAI_API_URL,
      {
        model: "gpt-3.5-turbo", // Using the standard GPT model to reduce costs
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2, // Low temperature for more deterministic responses
        max_tokens: 1000, // Limit response size
        response_format: { type: "json_object" }, // Request JSON format
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    // Parse the response content from OpenAI
    if (response.data.choices && response.data.choices.length > 0) {
      try {
        const content = response.data.choices[0].message.content
        const result = JSON.parse(content)

        // Validate the response format
        if (!result.threatRating || !result.explanation) {
          throw new Error("Invalid response format from OpenAI")
        }

        // Ensure threatRating is within the expected range (1-10)
        const threatRating = Math.max(1, Math.min(10, Math.round(result.threatRating)))

        // Return the standardized response
        return {
          success: true,
          threatRating,
          explanation: result.explanation,
          flags: Array.isArray(result.flags) ? result.flags : [],
          confidence: typeof result.confidence === "number" ? result.confidence : undefined,
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
    throw {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error analyzing text",
    } as ApiErrorResponse
  }
}

/**
 * Safely checks an email for fraud using OpenAI with standardized error handling
 * @param emailData The email data to analyze
 * @param apiKey OpenAI API key
 * @returns A tuple with [data, error] where only one is defined
 */
export async function safeCheckEmailWithOpenAI(
  emailData: EmailData,
  apiKey: string
): Promise<[FraudCheckResponse | null, ApiErrorResponse | null]> {
  try {
    const result = await checkEmailWithOpenAI(emailData, apiKey)
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
 * Safely checks text for fraud using OpenAI with standardized error handling
 * @param textData The text data to analyze
 * @param apiKey OpenAI API key
 * @returns A tuple with [data, error] where only one is defined
 */
export async function safeCheckTextWithOpenAI(
  textData: TextData,
  apiKey: string
): Promise<[FraudCheckResponse | null, ApiErrorResponse | null]> {
  try {
    const result = await checkTextWithOpenAI(textData, apiKey)
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

// Export type references for backward compatibility
export type {
  ApiErrorResponse,
  ApiSuccessResponse,
  EmailData,
  FraudCheckResponse,
  TextData,
} from "../types/fraudTypes"

// Offline mode has been removed - API key is now required
