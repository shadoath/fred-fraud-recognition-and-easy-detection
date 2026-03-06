import {
  enhancedObfuscate,
  enhancedRecover,
  validateApiKeyFormat
} from "./simpleEnhancedStorage"

// Mock chrome runtime
global.chrome = {
  runtime: {
    id: "test-extension-id"
  }
} as any

describe("Simple Enhanced Storage", () => {
  describe("validateApiKeyFormat", () => {
    it("should validate correct OpenAI API key formats", () => {
      expect(validateApiKeyFormat("sk-1234567890abcdefghijk")).toBe(true)
      expect(validateApiKeyFormat("sk-proj-1234567890abcdefghijk")).toBe(true)
      expect(validateApiKeyFormat("sk-" + "a".repeat(48))).toBe(true)
      expect(validateApiKeyFormat("sk-proj-abc_123_def_456_ghi_789_xyz")).toBe(true)
      expect(validateApiKeyFormat("sk-abc-123-def-456-ghi-789-xyz")).toBe(true)
    })

    it("should reject invalid API key formats", () => {
      expect(validateApiKeyFormat("")).toBe(false)
      expect(validateApiKeyFormat("not-an-api-key")).toBe(false)
      expect(validateApiKeyFormat("sk-")).toBe(false)
      expect(validateApiKeyFormat("sk-123")).toBe(false) // Too short
      expect(validateApiKeyFormat("SK-1234567890abcdefghijk")).toBe(false) // Wrong case
      expect(validateApiKeyFormat("sk_1234567890abcdefghijk")).toBe(false) // Wrong separator
    })
  })

  describe("enhancedObfuscate and enhancedRecover", () => {
    const testKeys = [
      "sk-1234567890abcdefghijklmnopqrstuv",
      "sk-proj-abcdefghijklmnopqrstuvwxyz123456",
      "sk-" + "x".repeat(48)
    ]

    it("should recover original key after obfuscation", () => {
      testKeys.forEach(originalKey => {
        const obfuscated = enhancedObfuscate(originalKey)

        // Should produce a V3 prefixed string
        expect(obfuscated).toMatch(/^V3\./)
        expect(obfuscated).not.toEqual(originalKey)
        expect(obfuscated).not.toContain(originalKey)

        // Should have 3 parts separated by dots
        const parts = obfuscated.split(".")
        expect(parts.length).toBe(3)
        expect(parts[0]).toBe("V3")

        // Should recover the original
        const recovered = enhancedRecover(obfuscated)
        expect(recovered).toEqual(originalKey)
      })
    })

    it("should produce different obfuscated values for different keys", () => {
      const key1 = "sk-key1234567890abcdefghijklmnop"
      const key2 = "sk-key2234567890abcdefghijklmnop"

      const obfuscated1 = enhancedObfuscate(key1)
      const obfuscated2 = enhancedObfuscate(key2)

      expect(obfuscated1).not.toEqual(obfuscated2)
    })

    it("should handle empty input gracefully", () => {
      expect(enhancedObfuscate("")).toEqual("")
      expect(enhancedRecover("")).toEqual("")
    })

    it("should handle invalid obfuscated input", () => {
      expect(enhancedRecover("invalid")).toEqual("")
      expect(enhancedRecover("V3.invalid")).toEqual("")
      expect(enhancedRecover("V2_old_format")).toEqual("") // Old format not supported
    })

    it("should maintain consistent obfuscation", () => {
      const key = "sk-consistent1234567890abcdefghijk"

      const obfuscated1 = enhancedObfuscate(key)
      const obfuscated2 = enhancedObfuscate(key)

      // Same key should produce same obfuscated result
      expect(obfuscated1).toEqual(obfuscated2)
    })

    it("should include valid checksum", () => {
      const key = "sk-checksum1234567890abcdefghijk"
      const obfuscated = enhancedObfuscate(key)

      const parts = obfuscated.split(".")
      const checksum = parts[2]

      // Checksum should be 2 hex characters
      expect(checksum).toMatch(/^[0-9a-f]{2}$/)
    })
  })
})