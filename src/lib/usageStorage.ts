export const THREAT_THRESHOLD = 70

interface UsageStats {
  allTimeChecks: number
  allTimeThreats: number
  monthlyChecks: number
  monthlyThreats: number
  monthStart: string // YYYY-MM format
}

const USAGE_KEY = "fredUsageStats"

const getMonthStart = (): string => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

const defaultStats = (): UsageStats => ({
  allTimeChecks: 0,
  allTimeThreats: 0,
  monthlyChecks: 0,
  monthlyThreats: 0,
  monthStart: getMonthStart(),
})

export const getUsageStats = async (): Promise<UsageStats> => {
  const result = await chrome.storage.local.get(USAGE_KEY)
  const stored: UsageStats = result[USAGE_KEY] ?? defaultStats()

  // Reset monthly counters if the month has rolled over
  if (stored.monthStart !== getMonthStart()) {
    stored.monthlyChecks = 0
    stored.monthlyThreats = 0
    stored.monthStart = getMonthStart()
  }

  return stored
}

export const recordCheck = async (threatRating: number): Promise<void> => {
  const stats = await getUsageStats()
  const isThreat = threatRating >= THREAT_THRESHOLD

  stats.allTimeChecks += 1
  stats.monthlyChecks += 1
  if (isThreat) {
    stats.allTimeThreats += 1
    stats.monthlyThreats += 1
  }

  await chrome.storage.local.set({ [USAGE_KEY]: stats })
}
