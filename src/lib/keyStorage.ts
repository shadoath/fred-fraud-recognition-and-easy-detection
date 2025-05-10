/**
 * Key storage utility that provides simple obfuscation for API keys
 * 
 * Note: This doesn't provide high-security encryption but helps protect 
 * against casual inspection of the Chrome storage.
 */

// Simple obfuscation key (not for cryptographic security)
const OBFUSCATION_KEY = "FRED-2025-PROTECTION";

/**
 * Obfuscates the API key using a simple XOR operation
 * @param apiKey The raw API key to obfuscate
 * @returns An obfuscated string representation
 */
export function obfuscateApiKey(apiKey: string): string {
  if (!apiKey) return '';
  
  // Convert to Base64 first
  const base64 = btoa(apiKey);
  
  // XOR with the obfuscation key
  let result = '';
  for (let i = 0; i < base64.length; i++) {
    const charCode = base64.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  
  // Return as hex string for better storage
  return Array.from(result)
    .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Recovers the original API key from the obfuscated string
 * @param obfuscated The obfuscated string to decode
 * @returns The original API key
 */
export function recoverApiKey(obfuscated: string): string {
  if (!obfuscated) return '';
  
  try {
    // Convert from hex string back to characters
    const hexPairs = obfuscated.match(/.{1,2}/g) || [];
    const intermediate = hexPairs
      .map(hex => String.fromCharCode(parseInt(hex, 16)))
      .join('');
    
    // Reverse the XOR operation
    let base64 = '';
    for (let i = 0; i < intermediate.length; i++) {
      const charCode = intermediate.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
      base64 += String.fromCharCode(charCode);
    }
    
    // Decode from Base64
    return atob(base64);
  } catch (error) {
    console.error("Error recovering API key:", error);
    return '';
  }
}