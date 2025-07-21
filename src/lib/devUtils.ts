/**
 * Developer utilities for the FRED Chrome extension
 */

const DEV_EXTENSION_ID = "dnmadaccmijgdbnlcplcbbknbenfmplj"

/**
 * Checks if the extension is running in development mode
 * @returns true if running in dev mode (extension ID matches dev ID)
 */
export function isDevMode(): boolean {
  try {
    // In a Chrome extension context, chrome.runtime.id gives us the extension ID
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      return chrome.runtime.id === DEV_EXTENSION_ID
    }
    
    // Fallback for testing environments
    return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
  } catch (error) {
    // If we can't determine dev mode, default to false (production)
    return false
  }
}

/**
 * Conditional console.info that only logs in dev mode
 * @param message Message to log
 * @param optionalParams Additional parameters to log
 */
export function devInfo(message: any, ...optionalParams: any[]): void {
  if (isDevMode()) {
    console.info(message, ...optionalParams)
  }
}

/**
 * Conditional console.debug that only logs in dev mode
 * @param message Message to log
 * @param optionalParams Additional parameters to log
 */
export function devDebug(message: any, ...optionalParams: any[]): void {
  if (isDevMode()) {
    console.debug(message, ...optionalParams)
  }
}

/**
 * Conditional console.warn that only logs in dev mode
 * @param message Message to log
 * @param optionalParams Additional parameters to log
 */
export function devWarn(message: any, ...optionalParams: any[]): void {
  if (isDevMode()) {
    console.warn(message, ...optionalParams)
  }
}

/**
 * Conditional console.error that only logs in dev mode
 * @param message Message to log
 * @param optionalParams Additional parameters to log
 */
export function devError(message: any, ...optionalParams: any[]): void {
  if (isDevMode()) {
    console.error(message, ...optionalParams)
  }
}