/**
 * Lightweight key obfuscation utility for obscuring API keys in storage.
 *
 * ⚠️ This is **not cryptographically secure** — it's intended to prevent
 * casual inspection only. Use real encryption for sensitive data.
 */

const OBFUSCATION_KEY = "FRED-2025-PROTECTION"

/**
 * Obfuscates an API key using XOR and encodes the result in hexadecimal.
 * @param apiKey The raw API key to obfuscate.
 * @returns Obfuscated key string.
 */
export function obfuscateApiKey(apiKey: string): string {
  if (!apiKey) return ""

  const base64 = btoa(apiKey)
  const xorChars = Array.from(base64, (char, i) =>
    String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length))
  )

  return xorChars.map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
}

/**
 * Recovers the original API key from an obfuscated string.
 * @param obfuscated Obfuscated key string.
 * @returns The original API key, or an empty string if invalid.
 */
export function recoverApiKey(obfuscated: string): string {
  if (!obfuscated) return ""

  try {
    const bytes = obfuscated.match(/.{2}/g) || []
    const xorChars = bytes.map((byte) => String.fromCharCode(Number.parseInt(byte, 16))).join("")

    const base64 = Array.from(xorChars, (char, i) =>
      String.fromCharCode(
        char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
      )
    ).join("")

    return atob(base64)
  } catch (error) {
    console.error("Error recovering API key:", error)
    return ""
  }
}
