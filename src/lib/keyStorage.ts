/**
 * API Key Storage Utility
 *
 * Uses chrome.storage.session for improved security:
 * - Keys stored in memory only (not persisted to disk)
 * - Automatically cleared when browser closes
 * - Not accessible to other extensions
 * - No obfuscation needed (not written to disk)
 *
 * Note: Requires Chrome 102+ for chrome.storage.session API
 */

const API_KEY_STORAGE_KEY = "openai_api_key"

/**
 * Stores an API key securely in session storage
 * @param apiKey The API key to store
 */
export async function storeApiKey(apiKey: string): Promise<void> {
  if (!apiKey) {
    throw new Error("API key cannot be empty")
  }

  try {
    // Use session storage for better security
    // Keys are cleared when browser closes and not persisted to disk
    await chrome.storage.session.set({ [API_KEY_STORAGE_KEY]: apiKey })
  } catch (error) {
    console.error("Error storing API key:", error)
    throw new Error("Failed to store API key")
  }
}

/**
 * Retrieves the API key from session storage
 * @returns The API key, or null if not found
 */
export async function getApiKey(): Promise<string | null> {
  try {
    const result = await chrome.storage.session.get(API_KEY_STORAGE_KEY)
    return result[API_KEY_STORAGE_KEY] || null
  } catch (error) {
    console.error("Error retrieving API key:", error)
    return null
  }
}

/**
 * Removes the API key from session storage
 */
export async function removeApiKey(): Promise<void> {
  try {
    await chrome.storage.session.remove(API_KEY_STORAGE_KEY)
  } catch (error) {
    console.error("Error removing API key:", error)
    throw new Error("Failed to remove API key")
  }
}

/**
 * Checks if an API key exists in session storage
 * @returns True if an API key is stored, false otherwise
 */
export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey()
  return key !== null && key.length > 0
}

// Legacy functions for backward compatibility with existing code
// These now use the new session storage instead of obfuscation

/**
 * @deprecated Use storeApiKey() instead. This function is maintained for backward compatibility.
 * Obfuscates and stores an API key (now using secure session storage)
 */
export const obfuscateApiKey = (apiKey: string): string => {
  // Return the key as-is for compatibility
  // The actual security is now handled by session storage
  return apiKey
}

/**
 * @deprecated Use getApiKey() instead. This function is maintained for backward compatibility.
 * Recovers an API key from obfuscated format (now just returns the key)
 */
export const recoverApiKey = (key: string | null | undefined): string => {
  // No longer needs to deobfuscate since we're using session storage
  // Just return the key if it exists
  return key || ""
}
