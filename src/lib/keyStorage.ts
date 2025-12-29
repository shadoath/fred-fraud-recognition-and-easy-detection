/**
 * API Key Storage Utility
 *
 * Uses chrome.storage.local for secure storage:
 * - Keys stored in Chrome's local storage (encrypted at rest by Chrome)
 * - Not accessible to other extensions
 * - Persists across browser sessions
 * - No client-side obfuscation needed (Chrome handles encryption)
 *
 * Security: Chrome automatically encrypts local storage on disk using OS-level
 * encryption (Keychain on macOS, DPAPI on Windows, libsecret on Linux).
 */

const API_KEY_STORAGE_KEY = "openai_api_key"

/**
 * Stores an API key in Chrome's local storage
 * @param apiKey The API key to store
 */
export async function storeApiKey(apiKey: string): Promise<void> {
  if (!apiKey) {
    throw new Error("API key cannot be empty")
  }

  try {
    await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey })
  } catch (error) {
    console.error("Error storing API key:", error)
    throw new Error("Failed to store API key")
  }
}

/**
 * Retrieves the API key from Chrome's local storage
 * @returns The API key, or null if not found
 */
export async function getApiKey(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY)
    return result[API_KEY_STORAGE_KEY] || null
  } catch (error) {
    console.error("Error retrieving API key:", error)
    return null
  }
}

/**
 * Removes the API key from Chrome's local storage
 */
export async function removeApiKey(): Promise<void> {
  try {
    await chrome.storage.local.remove(API_KEY_STORAGE_KEY)
  } catch (error) {
    console.error("Error removing API key:", error)
    throw new Error("Failed to remove API key")
  }
}

/**
 * Checks if an API key exists in Chrome's local storage
 * @returns True if an API key is stored, false otherwise
 */
export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey()
  return key !== null && key.length > 0
}
