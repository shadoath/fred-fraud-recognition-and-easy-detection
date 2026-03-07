/**
 * Shared type definitions for fraud detection services
 */

export type ApiErrorResponse = {
  success: false
  message: string
  status?: number
}

// Input data types
export interface EmailData {
  sender: string
  subject?: string
  content: string
  timestamp: string
}

export interface TextData {
  content: string
  source?: string // Optional source of the text (e.g., 'pasted', 'website', etc.)
  url?: string // Optional subject line or URL context
  timestamp: string
}

export interface URLData {
  url: string
  timestamp: string
}

export interface PageData {
  url: string
  title: string
  metaDescription: string
  visibleText: string
  links: { href: string; text: string }[]
  externalDomains: string[]
  forms: { fieldTypes: string[]; fieldNames: string[] }[]
  iframeSources: string[]
  phoneNumbers: string[]
  timestamp: string
}

// Response type
export interface FraudCheckResponse {
  success: true
  threatRating: number // 1-100 scale
  explanation: string
  flags?: string[] // Optional array of specific fraud indicators
  confidence?: number // Optional confidence score
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}
