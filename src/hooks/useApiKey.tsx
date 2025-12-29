import { useEffect, useState } from "react"
import { API_KEY_STORAGE_KEY } from "../components/ApiKeySettings"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { getApiKey, removeApiKey, storeApiKey } from "../lib/keyStorage"

export interface ApiKeyState {
  apiKey: string | null
  setApiKey: (apiKey: string | null) => void
  hasApiKey: boolean
  isLoading: boolean
  isSaving: boolean
  isApiKeySaved: boolean
  saveApiKey: () => void
  clearApiKey: () => void
}

/**
 * Custom hook to handle API key retrieval and management
 * @returns ApiKeyState containing API key information and offline mode status
 */
export const useApiKey = (): ApiKeyState => {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isApiKeySaved, setIsApiKeySaved] = useState<boolean>(false)
  const { toast } = useCustomSnackbar()

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        // Use the new secure storage API
        const key = await getApiKey()
        setApiKey(key || null)
      } catch (error) {
        console.error("Error checking API key:", error)
        setApiKey(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkApiKey()

    // Listen for changes to the API key in local storage
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      // Only respond to local storage changes
      if (areaName === "local" && changes[API_KEY_STORAGE_KEY]) {
        const newValue = changes[API_KEY_STORAGE_KEY].newValue
        setApiKey(newValue || null)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const saveApiKey = async () => {
    setIsSaving(true)
    try {
      const trimmedKey = apiKey?.trim() || ""
      if (!trimmedKey) {
        toast.error("API key cannot be empty")
        return
      }
      // Store the API key securely in local storage
      await storeApiKey(trimmedKey)
      toast.success("API key saved successfully")
      setIsApiKeySaved(true)
      // Test the API key (optional)
      // You could add a simple test request here
    } catch (error) {
      console.error("Error saving API key:", error)
      toast.error("Error saving API key")
    } finally {
      setIsSaving(false)
    }
  }

  // Clear API key from Chrome storage
  const clearApiKey = async () => {
    setIsSaving(true)
    try {
      await removeApiKey()
      setApiKey("")
      toast.success("API key removed")
    } catch (error) {
      console.error("Error removing API key:", error)
      toast.error("Error removing API key")
    } finally {
      setIsSaving(false)
    }
  }

  return {
    apiKey,
    setApiKey,
    hasApiKey: !!apiKey,
    isLoading,
    isSaving,
    isApiKeySaved,
    saveApiKey,
    clearApiKey,
  }
}
