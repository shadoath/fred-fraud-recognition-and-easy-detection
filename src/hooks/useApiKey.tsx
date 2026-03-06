import { useEffect, useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import {
  API_KEY_STORAGE_KEY,
  DEFAULT_MODEL,
  DEFAULT_CONNECTION_MODE,
  attemptMigration,
  getSelectedModel,
  getConnectionMode,
  obfuscateApiKey,
  recoverApiKey,
  saveSelectedModel as persistSelectedModel,
  saveConnectionMode as persistSaveConnectionMode,
  validateApiKeyFormat,
  type ConnectionMode,
} from "../lib/keyStorage"
import { getDeviceId } from "../lib/deviceId"

export interface ApiKeyState {
  apiKey: string | null
  setApiKey: (apiKey: string | null) => void
  hasApiKey: boolean
  isLoading: boolean
  isSaving: boolean
  isApiKeySaved: boolean
  saveApiKey: () => void
  clearApiKey: () => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  saveSelectedModel: (model: string) => Promise<void>
  connectionMode: ConnectionMode
  setConnectionMode: (mode: ConnectionMode) => void
  saveConnectionMode: (mode: ConnectionMode) => Promise<void>
  deviceId: string
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
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL)
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(DEFAULT_CONNECTION_MODE)
  const [deviceId, setDeviceId] = useState<string>("")
  const { toast } = useCustomSnackbar()

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        // First, attempt migration from old storage if needed
        const migrated = await attemptMigration()
        if (migrated) {
          console.log("Successfully migrated to enhanced key storage")
        }

        const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY)
        const obfuscatedKey = result[API_KEY_STORAGE_KEY]

        // If we have an obfuscated key, recover the original
        const key = obfuscatedKey ? recoverApiKey(obfuscatedKey) : null
        setApiKey(key || null)

        // Load the saved model
        const model = await getSelectedModel()
        setSelectedModel(model)

        // Load the connection mode
        const mode = await getConnectionMode()
        setConnectionMode(mode)

        // Load the device ID
        const id = await getDeviceId()
        setDeviceId(id)
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

  const saveApiKey = async () => {
    setIsSaving(true)
    try {
      const trimmedKey = apiKey?.trim() || ""

      // Validate the API key format first
      if (!validateApiKeyFormat(trimmedKey)) {
        toast.error("Invalid API key format. OpenAI keys should start with 'sk-'")
        setIsSaving(false)
        return
      }

      // Obfuscate the API key before storing it (now uses enhanced obfuscation)
      const obfuscatedKey = obfuscateApiKey(trimmedKey)
      await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: obfuscatedKey })
      toast.success("API key saved securely")
      setIsApiKeySaved(true)
    } catch (error) {
      console.error("Error saving API key:", error)
      toast.error("Error saving API key")
    } finally {
      setIsSaving(false)
    }
  }

  // Save the selected model to Chrome storage
  const saveSelectedModel = async (model: string): Promise<void> => {
    setSelectedModel(model)
    await persistSelectedModel(model)
  }

  // Save the connection mode to Chrome storage
  const saveConnectionMode = async (mode: ConnectionMode): Promise<void> => {
    setConnectionMode(mode)
    await persistSaveConnectionMode(mode)
  }

  // Clear API key from Chrome storage
  const clearApiKey = async () => {
    setIsSaving(true)
    try {
      await chrome.storage.local.remove(API_KEY_STORAGE_KEY)
      setApiKey(null)
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
    selectedModel,
    setSelectedModel,
    saveSelectedModel,
    connectionMode,
    setConnectionMode,
    saveConnectionMode,
    deviceId,
  }
}
