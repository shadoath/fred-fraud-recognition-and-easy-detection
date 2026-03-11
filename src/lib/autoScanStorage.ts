export interface AutoScanSettings {
  enabled: boolean
  tier2Threshold: number  // Tier 1 score that triggers Tier 2 AI triage (default: 40)
  tier3Threshold: number  // Tier 2 confidence that triggers Tier 3 deep scan (default: 0.7)
  showSafeBadge: boolean  // Show ✓ badge even when no threat found (default: true)
}

export const DEFAULT_AUTO_SCAN_SETTINGS: AutoScanSettings = {
  enabled: false,
  tier2Threshold: 40,
  tier3Threshold: 0.7,
  showSafeBadge: true,
}

const AUTO_SCAN_KEY = "fredAutoScanSettings"

export const getAutoScanSettings = async (): Promise<AutoScanSettings> => {
  const result = await chrome.storage.local.get(AUTO_SCAN_KEY)
  return { ...DEFAULT_AUTO_SCAN_SETTINGS, ...result[AUTO_SCAN_KEY] }
}

export const saveAutoScanSettings = async (settings: AutoScanSettings): Promise<void> => {
  await chrome.storage.local.set({ [AUTO_SCAN_KEY]: settings })
}
