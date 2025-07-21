/**
 * Shared type definitions for fraud detection services
 */

// Base API response types
export type ApiSuccessResponse = {
  success: true
  message?: string
}

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
  links?: string[] // Optional array of extracted links from email content
}

export interface TextData {
  content: string
  source?: string // Optional source of the text (e.g., 'pasted', 'website', etc.)
  timestamp: string
  links?: string[] // Optional array of extracted links from text content
}

// Response type
export interface FraudCheckResponse extends ApiSuccessResponse {
  threatRating: number // 1-10 scale
  explanation: string
  flags?: string[] // Optional array of specific fraud indicators
  confidence?: number // Optional confidence score
}

