/**
 * API key storage utility with obfuscation and legacy migration.
 */

import {
  enhancedObfuscate,
  enhancedRecover,
  validateApiKeyFormat
} from "./simpleEnhancedStorage"

/** Chrome storage key for the API key */
export const API_KEY_STORAGE_KEY = "openai_api_key"

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

  // Check if it's enhanced obfuscation (V3 format)
  if (obfuscated.startsWith("V3.")) {
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
 * Migrates from legacy "apiKey" storage to current format.
 */
export async function attemptMigration(): Promise<boolean> {
  try {
    const oldStorage = await chrome.storage.local.get("apiKey")
    if (!oldStorage.apiKey) return false

    const apiKey = legacyRecover(oldStorage.apiKey)
    if (!apiKey || !validateApiKeyFormat(apiKey)) return false

    const newObfuscated = enhancedObfuscate(apiKey)
    await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: newObfuscated })
    await chrome.storage.local.remove("apiKey")

    return true
  } catch (error) {
    console.error("Migration failed:", error)
    return false
  }
}

/** Chrome storage key for the selected model */
export const SELECTED_MODEL_STORAGE_KEY = "fredSelectedModel"

/** Default model to use if none is saved */
export const DEFAULT_MODEL = "gpt-4o-mini"

/**
 * Saves the selected model to Chrome storage.
 * @param model The model identifier to save.
 */
export const saveSelectedModel = async (model: string): Promise<void> => {
  await chrome.storage.local.set({ [SELECTED_MODEL_STORAGE_KEY]: model })
}

/**
 * Retrieves the selected model from Chrome storage.
 * @returns The saved model identifier, or the default if not set.
 */
export const getSelectedModel = async (): Promise<string> => {
  const result = await chrome.storage.local.get(SELECTED_MODEL_STORAGE_KEY)
  return result[SELECTED_MODEL_STORAGE_KEY] ?? DEFAULT_MODEL
}

/** Chrome storage key for connection mode */
export const CONNECTION_MODE_STORAGE_KEY = "fredConnectionMode"

export type ConnectionMode = "proxy" | "byok"

/** Default: use FRED's proxy (no API key needed) */
export const DEFAULT_CONNECTION_MODE: ConnectionMode = "proxy"

export const saveConnectionMode = async (mode: ConnectionMode): Promise<void> => {
  await chrome.storage.local.set({ [CONNECTION_MODE_STORAGE_KEY]: mode })
}

export const getConnectionMode = async (): Promise<ConnectionMode> => {
  const result = await chrome.storage.local.get(CONNECTION_MODE_STORAGE_KEY)
  return (result[CONNECTION_MODE_STORAGE_KEY] as ConnectionMode) ?? DEFAULT_CONNECTION_MODE
}

// Export additional utilities
export { validateApiKeyFormat } from "./simpleEnhancedStorage"
