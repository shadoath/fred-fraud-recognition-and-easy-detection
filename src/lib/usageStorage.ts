export const THREAT_THRESHOLD = 70

interface UsageStats {
  allTimeChecks: number
  allTimeThreats: number
  weeklyChecks: number
  weeklyThreats: number
  weekStart: string // ISO date string of the Monday of the current week
}

const USAGE_KEY = "fredUsageStats"

const getWeekStart = (): string => {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day) // shift to Monday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  return monday.toISOString().slice(0, 10)
}

const defaultStats = (): UsageStats => ({
  allTimeChecks: 0,
  allTimeThreats: 0,
  weeklyChecks: 0,
  weeklyThreats: 0,
  weekStart: getWeekStart(),
})

export const getUsageStats = async (): Promise<UsageStats> => {
  const result = await chrome.storage.local.get(USAGE_KEY)
  const stored: UsageStats = result[USAGE_KEY] ?? defaultStats()

  // Reset weekly counters if the week has rolled over
  if (stored.weekStart !== getWeekStart()) {
    stored.weeklyChecks = 0
    stored.weeklyThreats = 0
    stored.weekStart = getWeekStart()
  }

  return stored
}

export const recordCheck = async (threatRating: number): Promise<void> => {
  const stats = await getUsageStats()
  const isThreat = threatRating >= THREAT_THRESHOLD

  stats.allTimeChecks += 1
  stats.weeklyChecks += 1
  if (isThreat) {
    stats.allTimeThreats += 1
    stats.weeklyThreats += 1
  }

  await chrome.storage.local.set({ [USAGE_KEY]: stats })
}
