import { getApiKey, hasApiKey, removeApiKey, storeApiKey } from "./keyStorage"

// Mock chrome.storage.local
const mockStorage = new Map<string, string>()

global.chrome = {
  storage: {
    local: {
      get: jest.fn(async (key: string) => {
        if (typeof key === "string") {
          return { [key]: mockStorage.get(key) }
        }
        return {}
      }),
      set: jest.fn(async (items: Record<string, string>) => {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value)
        })
      }),
      remove: jest.fn(async (key: string) => {
        mockStorage.delete(key)
      }),
    },
  },
} as any

describe("Key Storage Utilities", () => {
  beforeEach(() => {
    // Clear mock storage before each test
    mockStorage.clear()
    jest.clearAllMocks()
  })

  describe("storeApiKey", () => {
    test("should store API key in local storage", async () => {
      const testKey = "sk-1234567890abcdef"
      await storeApiKey(testKey)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        openai_api_key: testKey,
      })
      expect(mockStorage.get("openai_api_key")).toBe(testKey)
    })

    test("should throw error for empty API key", async () => {
      await expect(storeApiKey("")).rejects.toThrow("API key cannot be empty")
    })

    test("should handle storage errors gracefully", async () => {
      ;(chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(new Error("Storage error"))

      await expect(storeApiKey("sk-test")).rejects.toThrow("Failed to store API key")
    })
  })

  describe("getApiKey", () => {
    test("should retrieve stored API key", async () => {
      const testKey = "sk-test-key-12345"
      mockStorage.set("openai_api_key", testKey)

      const result = await getApiKey()

      expect(result).toBe(testKey)
      expect(chrome.storage.local.get).toHaveBeenCalledWith("openai_api_key")
    })

    test("should return null when no key is stored", async () => {
      const result = await getApiKey()

      expect(result).toBeNull()
    })

    test("should return null on storage error", async () => {
      ;(chrome.storage.local.get as jest.Mock).mockRejectedValueOnce(new Error("Storage error"))

      const result = await getApiKey()

      expect(result).toBeNull()
    })
  })

  describe("removeApiKey", () => {
    test("should remove API key from local storage", async () => {
      mockStorage.set("openai_api_key", "sk-test-key")

      await removeApiKey()

      expect(chrome.storage.local.remove).toHaveBeenCalledWith("openai_api_key")
      expect(mockStorage.has("openai_api_key")).toBe(false)
    })

    test("should handle removal errors gracefully", async () => {
      ;(chrome.storage.local.remove as jest.Mock).mockRejectedValueOnce(new Error("Storage error"))

      await expect(removeApiKey()).rejects.toThrow("Failed to remove API key")
    })
  })

  describe("hasApiKey", () => {
    test("should return true when API key exists", async () => {
      mockStorage.set("openai_api_key", "sk-test-key")

      const result = await hasApiKey()

      expect(result).toBe(true)
    })

    test("should return false when no API key exists", async () => {
      const result = await hasApiKey()

      expect(result).toBe(false)
    })

    test("should return false for empty API key", async () => {
      mockStorage.set("openai_api_key", "")

      const result = await hasApiKey()

      expect(result).toBe(false)
    })
  })

  describe("Integration tests", () => {
    test("should store and retrieve API key", async () => {
      const testKey = "sk-integration-test-key"

      await storeApiKey(testKey)
      const retrieved = await getApiKey()

      expect(retrieved).toBe(testKey)
    })

    test("should store, check existence, and remove API key", async () => {
      const testKey = "sk-full-cycle-test"

      // Store
      await storeApiKey(testKey)
      expect(await hasApiKey()).toBe(true)

      // Remove
      await removeApiKey()
      expect(await hasApiKey()).toBe(false)
      expect(await getApiKey()).toBeNull()
    })
  })
})
