/**
 * Shared type definitions for fraud detection services
 */

export type ApiErrorResponse = {
  success: false
  message: string
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
  timestamp: string
}

// Response type
export interface FraudCheckResponse {
  success: true
  threatRating: number // 1-10 scale
  explanation: string
  flags?: string[] // Optional array of specific fraud indicators
  confidence?: number // Optional confidence score
}
