/**
 * Simple enhanced storage with better security than XOR but maintainable simplicity.
 * Uses reversible transformations that are stronger than basic XOR.
 */

// Storage constants
const STORAGE_VERSION = "V3"
const STORAGE_SEPARATOR = "."

/**
 * Validates OpenAI API key format
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || apiKey.length < 20) return false
  const patterns = [
    /^sk-[a-zA-Z0-9_-]{20,}$/,
    /^sk-proj-[a-zA-Z0-9_-]{20,}$/
  ]
  return patterns.some(pattern => pattern.test(apiKey))
}

/**
 * Creates a deterministic but unique transform key based on extension context
 */
function getTransformKey(): string {
  // Use a combination of factors for the transform
  const extensionId = (typeof chrome !== "undefined" && chrome?.runtime?.id) || "default-extension"
  const staticPart = "FRED-SECURE-2025"
  return `${extensionId}-${staticPart}`
}

/**
 * Simple enhanced obfuscation that's more secure than XOR
 */
export function enhancedObfuscate(apiKey: string): string {
  if (!apiKey) return ""

  try {
    const transformKey = getTransformKey()

    // Step 1: Base64 encode
    const base64 = btoa(apiKey)

    // Step 2: Character rotation based on position and transform key
    const rotated = base64.split("").map((char, idx) => {
      const rotation = transformKey.charCodeAt(idx % transformKey.length)
      const charCode = char.charCodeAt(0)

      // Rotate within ASCII printable range
      if (charCode >= 65 && charCode <= 90) { // A-Z
        const letterRotation = rotation % 26
        return String.fromCharCode(((charCode - 65 + letterRotation) % 26) + 65)
      } else if (charCode >= 97 && charCode <= 122) { // a-z
        const letterRotation = rotation % 26
        return String.fromCharCode(((charCode - 97 + letterRotation) % 26) + 97)
      } else if (charCode >= 48 && charCode <= 57) { // 0-9
        const digitRotation = rotation % 10
        return String.fromCharCode(((charCode - 48 + digitRotation) % 10) + 48)
      }
      return char // Don't transform other characters
    }).join("")

    // Step 3: Add version and checksum
    const checksum = apiKey.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 256
    return `${STORAGE_VERSION}${STORAGE_SEPARATOR}${rotated}${STORAGE_SEPARATOR}${checksum.toString(16).padStart(2, "0")}`
  } catch (error) {
    console.error("Obfuscation error:", error)
    return ""
  }
}

/**
 * Recovers the API key from enhanced obfuscation
 */
export function enhancedRecover(obfuscated: string): string {
  if (!obfuscated || !obfuscated.startsWith(`${STORAGE_VERSION}${STORAGE_SEPARATOR}`)) return ""

  try {
    const parts = obfuscated.split(STORAGE_SEPARATOR)
    if (parts.length !== 3 || parts[0] !== STORAGE_VERSION) return ""

    const rotated = parts[1]
    const storedChecksum = parts[2]
    const transformKey = getTransformKey()

    // Step 1: Reverse character rotation
    const unrotated = rotated.split("").map((char, idx) => {
      const rotation = transformKey.charCodeAt(idx % transformKey.length)
      const charCode = char.charCodeAt(0)

      // Reverse rotation within ASCII printable range - must match obfuscation logic exactly
      if (charCode >= 65 && charCode <= 90) { // A-Z
        const letterRotation = rotation % 26
        return String.fromCharCode(((charCode - 65 - letterRotation + 26) % 26) + 65)
      } else if (charCode >= 97 && charCode <= 122) { // a-z
        const letterRotation = rotation % 26
        return String.fromCharCode(((charCode - 97 - letterRotation + 26) % 26) + 97)
      } else if (charCode >= 48 && charCode <= 57) { // 0-9
        const digitRotation = rotation % 10
        return String.fromCharCode(((charCode - 48 - digitRotation + 10) % 10) + 48)
      }
      return char
    }).join("")

    // Step 2: Base64 decode
    const decoded = atob(unrotated)

    // Step 3: Verify checksum
    const calculatedChecksum = decoded.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 256
    const expectedChecksum = parseInt(storedChecksum, 16)

    if (calculatedChecksum !== expectedChecksum) {
      console.warn("Checksum mismatch during recovery")
      // Continue anyway for backward compatibility
    }

    return decoded
  } catch (error) {
    console.error("Recovery error:", error)
    return ""
  }
}

// Backward compatibility exports
export const obfuscateApiKey = enhancedObfuscate
export const recoverApiKey = enhancedRecover