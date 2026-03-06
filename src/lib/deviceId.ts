const DEVICE_ID_KEY = "fredDeviceId"

/**
 * Returns the persistent device ID for this install, generating one if it doesn't exist.
 * Used for proxy rate limiting — never sent to OpenAI directly.
 */
export const getDeviceId = async (): Promise<string> => {
  const result = await chrome.storage.local.get(DEVICE_ID_KEY)
  if (result[DEVICE_ID_KEY]) {
    return result[DEVICE_ID_KEY] as string
  }
  const newId = crypto.randomUUID()
  await chrome.storage.local.set({ [DEVICE_ID_KEY]: newId })
  return newId
}
