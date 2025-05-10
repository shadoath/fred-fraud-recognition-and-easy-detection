import { obfuscateApiKey, recoverApiKey } from "./keyStorage"

describe("Key Storage Utilities", () => {
  // Test API key examples
  const testCases = [
    "sk-1234567890abcdef",
    "sk-thisIsALongerTestKeyWithMoreCharacters",
    "", // Empty string case
  ]

  test("should recover original API key after obfuscation", () => {
    testCases.forEach((originalKey) => {
      // Obfuscate the key
      const obfuscated = obfuscateApiKey(originalKey)

      // Should produce a non-empty string for non-empty inputs
      if (originalKey) {
        expect(obfuscated).toBeTruthy()
        expect(obfuscated).not.toEqual(originalKey)
      } else {
        expect(obfuscated).toEqual("")
      }

      // Recover the key
      const recovered = recoverApiKey(obfuscated)

      // Original and recovered should match
      expect(recovered).toEqual(originalKey)
    })
  })

  test("should handle empty input gracefully", () => {
    expect(obfuscateApiKey("")).toEqual("")
    expect(recoverApiKey("")).toEqual("")
  })

  test("should handle null/undefined input gracefully", () => {
    // @ts-ignore - Testing invalid inputs
    expect(obfuscateApiKey(null)).toEqual("")
    // @ts-ignore - Testing invalid inputs
    expect(obfuscateApiKey(undefined)).toEqual("")
    // @ts-ignore - Testing invalid inputs
    expect(recoverApiKey(null)).toEqual("")
    // @ts-ignore - Testing invalid inputs
    expect(recoverApiKey(undefined)).toEqual("")
  })

  test("should generate different obfuscated values for different keys", () => {
    const key1 = "sk-testKey1"
    const key2 = "sk-testKey2"

    const obfuscated1 = obfuscateApiKey(key1)
    const obfuscated2 = obfuscateApiKey(key2)

    expect(obfuscated1).not.toEqual(obfuscated2)
  })

  test("should handle invalid obfuscated input gracefully", () => {
    const invalidObfuscated = "not-a-valid-obfuscated-key"
    expect(recoverApiKey(invalidObfuscated)).toEqual("")
  })
})
