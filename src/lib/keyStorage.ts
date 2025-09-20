/**
 * Enhanced key storage utility with improved security for API keys.
 *
 * This module now provides:
 * - API key format validation
 * - Multi-layer obfuscation (better than simple XOR)
 * - Backward compatibility with legacy storage
 */

import {
  enhancedObfuscate,
  enhancedRecover,
  validateApiKeyFormat
} from "./simpleEnhancedStorage"

// Legacy obfuscation key for migration purposes
const LEGACY_OBFUSCATION_KEY = "FRED-2025-PROTECTION"

/**
 * Legacy XOR obfuscation - kept for migration purposes only
 */
function legacyObfuscate(apiKey: string): string {
  if (!apiKey) return ""

  const base64 = btoa(apiKey)
  const xorChars = Array.from(base64, (char, i) =>
    String.fromCharCode(char.charCodeAt(0) ^ LEGACY_OBFUSCATION_KEY.charCodeAt(i % LEGACY_OBFUSCATION_KEY.length))
  )

  return xorChars.map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
}

/**
 * Legacy XOR recovery - kept for migration purposes only
 */
function legacyRecover(obfuscated: string): string {
  if (!obfuscated) return ""

  try {
    const bytes = obfuscated.match(/.{2}/g) || []
    const xorChars = bytes.map((byte) => String.fromCharCode(Number.parseInt(byte, 16))).join("")

    const base64 = Array.from(xorChars, (char, i) =>
      String.fromCharCode(
        char.charCodeAt(0) ^ LEGACY_OBFUSCATION_KEY.charCodeAt(i % LEGACY_OBFUSCATION_KEY.length)
      )
    ).join("")

    return atob(base64)
  } catch (error) {
    console.error("Error recovering API key with legacy method:", error)
    return ""
  }
}

/**
 * Obfuscates an API key using enhanced protection.
 * @param apiKey The raw API key to obfuscate.
 * @returns Obfuscated key string.
 */
export const obfuscateApiKey = (apiKey: string): string => {
  if (!apiKey) return ""

  // Validate the API key format first
  if (!validateApiKeyFormat(apiKey)) {
    console.warn("Invalid API key format detected")
  }

  // Use enhanced obfuscation
  return enhancedObfuscate(apiKey)
}

/**
 * Recovers the original API key from an obfuscated string.
 * Handles both legacy and enhanced obfuscation methods.
 * @param obfuscated Obfuscated key string.
 * @returns The original API key, or an empty string if invalid.
 */
export const recoverApiKey = (obfuscated: string): string => {
  if (!obfuscated) return ""

  // Check if it's enhanced obfuscation (V3 or V2)
  if (obfuscated.startsWith("V3.") || obfuscated.startsWith("V2_")) {
    return enhancedRecover(obfuscated)
  }

  // Try legacy recovery for backward compatibility
  const legacyKey = legacyRecover(obfuscated)

  // If we successfully recovered a legacy key, consider migrating it
  if (legacyKey && validateApiKeyFormat(legacyKey)) {
    console.log("Legacy key detected, consider migrating to enhanced storage")
  }

  return legacyKey
}

/**
 * Attempts to migrate from old storage format to new enhanced format
 */
export async function attemptMigration(): Promise<boolean> {
  try {
    // Check if old key exists
    const oldStorage = await chrome.storage.local.get("apiKey")
    if (!oldStorage.apiKey) return false

    // Try to recover using legacy method
    const apiKey = legacyRecover(oldStorage.apiKey)
    if (!apiKey || !validateApiKeyFormat(apiKey)) return false

    // Store using new method
    const newObfuscated = enhancedObfuscate(apiKey)
    await chrome.storage.local.set({ apiKey: newObfuscated })

    console.log("Successfully migrated to enhanced storage")
    return true
  } catch (error) {
    console.error("Migration failed:", error)
    return false
  }
}

// Export additional utilities
export { validateApiKeyFormat } from "./simpleEnhancedStorage"
