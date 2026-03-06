export interface HistoryEntry {
  id: string
  type: "email" | "text" | "url"
  input: {
    sender?: string
    subject?: string
    content: string
  }
  result: {
    threatRating: number
    explanation: string
    flags?: string[]
    confidence?: number
  }
  timestamp: string
}

const HISTORY_KEY = "fredAnalysisHistory"
const MAX_HISTORY_ENTRIES = 20

export const saveHistoryEntry = async (entry: HistoryEntry): Promise<void> => {
  const existing = await getHistory()
  const updated = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES)
  await chrome.storage.local.set({ [HISTORY_KEY]: updated })
}

export const getHistory = async (): Promise<HistoryEntry[]> => {
  const result = await chrome.storage.local.get(HISTORY_KEY)
  return result[HISTORY_KEY] || []
}

export const clearHistory = async (): Promise<void> => {
  await chrome.storage.local.remove(HISTORY_KEY)
}
