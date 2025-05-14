import { useEffect, useState } from "react"
import { API_KEY_STORAGE_KEY } from "../components/ApiKeySettings"
import { recoverApiKey } from "../lib/keyStorage"

export interface ApiKeyState {
  apiKey: string | null
  setApiKey: (apiKey: string | null) => void
  hasApiKey: boolean
  isLoading: boolean
}

/**
 * Custom hook to handle API key retrieval and management
 * @returns ApiKeyState containing API key information and offline mode status
 */
export const useApiKey = (): ApiKeyState => {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY)
        const obfuscatedKey = result[API_KEY_STORAGE_KEY]

        // If we have an obfuscated key, recover the original
        const key = obfuscatedKey ? recoverApiKey(obfuscatedKey) : null
        setApiKey(key || null)
      } catch (error) {
        console.error("Error checking API key:", error)
        setApiKey(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkApiKey()

    // Listen for changes to the API key in storage
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[API_KEY_STORAGE_KEY]) {
        const newObfuscatedValue = changes[API_KEY_STORAGE_KEY].newValue
        // If we have a new obfuscated value, recover the original
        const newKey = newObfuscatedValue ? recoverApiKey(newObfuscatedValue) : null
        setApiKey(newKey || null)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  return {
    apiKey,
    setApiKey,
    hasApiKey: !!apiKey,
    isLoading,
  }
}
