import axios, { type AxiosError } from "axios"
import type { ApiErrorResponse, EmailData, FraudCheckResponse, TextData } from "../types/fraudTypes"

// OpenAI API URL
export const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

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
    const prompt = `You are a cybersecurity expert analyzing an email for potential fraud or phishing. Please analyze this email:

Sender: ${emailData.sender}
Subject: ${emailData.subject || "(No subject)"}
Content:
${emailData.content.substring(0, 4000)} ${emailData.content.length > 4000 ? "...(truncated)" : ""}

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
    const prompt = `You are a cybersecurity expert analyzing text for potential fraud, scams, or suspicious content. Please analyze this text:

Content:
${textData.content.substring(0, 4000)} ${textData.content.length > 4000 ? "...(truncated)" : ""}

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
  EmailData,
  FraudCheckResponse,
  TextData,
} from "../types/fraudTypes"
