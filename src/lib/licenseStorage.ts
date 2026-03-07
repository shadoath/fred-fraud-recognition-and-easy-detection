const LICENSE_KEY_STORAGE_KEY = "fredLicenseKey"

export const saveLicenseKey = async (key: string): Promise<void> => {
  await chrome.storage.local.set({ [LICENSE_KEY_STORAGE_KEY]: key.trim() })
}

export const getLicenseKey = async (): Promise<string | null> => {
  const result = await chrome.storage.local.get(LICENSE_KEY_STORAGE_KEY)
  return result[LICENSE_KEY_STORAGE_KEY] ?? null
}

export const clearLicenseKey = async (): Promise<void> => {
  await chrome.storage.local.remove(LICENSE_KEY_STORAGE_KEY)
}
