/**
 * Permission management service for FRED extension
 * Handles requesting URL access and checking current permissions
 */

/**
 * Check if we have host permission for a specific URL
 */
export const hasHostPermission = async (url: string): Promise<boolean> => {
  try {
    // Parse the URL to get the origin in proper format
    const urlObj = new URL(url)
    const origin = urlObj.origin

    // Check if we have permission for this origin
    const result = await chrome.permissions.contains({
      origins: [`${origin}/*`],
    })

    return result
  } catch (error) {
    console.error("Error checking host permission:", error)
    return false
  }
}

/**
 * Request host permission for a specific URL
 * Returns true if permission was granted, false otherwise
 */
export const requestHostPermission = async (url: string): Promise<boolean> => {
  try {
    // Parse the URL to get the origin in proper format
    const urlObj = new URL(url)
    const origin = urlObj.origin

    // Request permission
    const granted = await chrome.permissions.request({
      origins: [`${origin}/*`],
    })

    return granted
  } catch (error) {
    console.error("Error requesting host permission:", error)
    return false
  }
}

/**
 * Request host permission with a user-friendly UI prompt
 * Returns true if permission was granted, false otherwise
 */
export const requestPermissionWithPrompt = async (
  url: string,
  reason: string
): Promise<boolean> => {
  // Parse the URL to get just the hostname for user-friendly display
  let hostname = ""
  try {
    const urlObj = new URL(url)
    hostname = urlObj.hostname
  } catch (e) {
    hostname = url // Fallback if URL parsing fails
  }

  // Check if we already have permission
  const hasPermission = await hasHostPermission(url)
  if (hasPermission) {
    return true
  }

  // Create a friendly permission prompt
  const confirmMessage =
    `FRED needs permission to analyze content from "${hostname}" ${
      reason ? `for ${reason}` : ""
    }\n\n` + `Click OK to grant access, or Cancel to deny.`

  // Show the confirmation dialog
  const userConfirmed = window.confirm(confirmMessage)

  // If user cancels, don't even try to request permission
  if (!userConfirmed) {
    return false
  }

  // User confirmed, let's request the permission
  return await requestHostPermission(url)
}

/**
 * Get all currently granted host permissions
 */
export const getGrantedHostPermissions = async (): Promise<string[]> => {
  try {
    const permissions = await chrome.permissions.getAll()
    return permissions.origins || []
  } catch (error) {
    console.error("Error getting permissions:", error)
    return []
  }
}

/**
 * Remove a specific host permission
 */
export const removeHostPermission = async (url: string): Promise<boolean> => {
  try {
    // Parse the URL to get the origin in proper format
    const urlObj = new URL(url)
    const origin = urlObj.origin

    // Remove permission
    return await chrome.permissions.remove({
      origins: [`${origin}/*`],
    })
  } catch (error) {
    console.error("Error removing host permission:", error)
    return false
  }
}
