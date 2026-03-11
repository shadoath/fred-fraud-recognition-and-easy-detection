import HistoryIcon from "@mui/icons-material/History"
import SettingsIcon from "@mui/icons-material/Settings"
import {
  AppBar,
  Box,
  IconButton,
  Paper,
  Toolbar,
  Tooltip,
} from "@mui/material"
import { useEffect, useState } from "react"
import { type HistoryEntry, saveHistoryEntry } from "../lib/historyStorage"
import { recordCheck } from "../lib/usageStorage"
import { ApiKeySettings } from "./ApiKeySettings"
import { GeneralSettings } from "./GeneralSettings"
import { DetectedIndicators } from "./DetectedIndicators"
import { ErrorBoundary } from "./ErrorBoundary"
import { HelpContent } from "./HelpContent"
import { HistoryTab } from "./HistoryTab"
import { Scanner, type ScanResult } from "./Scanner"
import { ThreatRating } from "./ThreatRating"
import { UsageStatsSection } from "./UsageStatsSection"

const HistoryDetail = ({ entry }: { entry: HistoryEntry }) => (
  <Box sx={{ p: 0, m: 0 }}>
    <ThreatRating rating={entry.result.threatRating} explanation={entry.result.explanation} />

    {entry.result.flags && entry.result.flags.length > 0 && (
      <DetectedIndicators flags={entry.result.flags} threatRating={entry.result.threatRating} />
    )}
  </Box>
)

export const MainDisplay = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<HistoryEntry | null>(null)
  const [autoScanResult, setAutoScanResult] = useState<{
    threatRating: number
    explanation: string
    flags: string[]
    confidence?: number
  } | null>(null)

  useEffect(() => {
    const checkPendingResult = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

        // Check for a pending auto-scan result from the Gmail badge
        if (tab?.id) {
          const storage = await chrome.storage.local.get("fredPendingResult")
          const pending = storage.fredPendingResult as
            | { tabId: number; result: { threatRating: number; explanation: string; flags: string[]; confidence?: number } }
            | undefined
          if (pending?.tabId === tab.id) {
            setAutoScanResult(pending.result)
            await chrome.storage.local.remove("fredPendingResult")
          }
        }
      } catch {
        // ignore
      }
    }
    checkPendingResult()
  }, [])

  const toggleSettings = () => {
    setShowSettings((s) => !s)
    setShowHistory(false)
  }

  const toggleHistory = () => {
    setShowHistory((h) => !h)
    setShowSettings(false)
    setSelectedHistoryEntry(null)
  }

  const handleAnalysisComplete = (
    type: "email" | "url",
    input: { sender?: string; subject?: string; title?: string; content: string },
    result: ScanResult
  ) => {
    const historyEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      type,
      input,
      result: {
        threatRating: result.threatRating,
        explanation: result.explanation,
        flags: result.flags,
        confidence: result.confidence,
      },
      timestamp: new Date().toISOString(),
    }
    saveHistoryEntry(historyEntry)
    recordCheck(result.threatRating)
  }

  const panel = autoScanResult
    ? "autoscan"
    : showSettings
      ? "settings"
      : showHistory
        ? "history"
        : "main"

  const goHome = () => {
    setShowSettings(false)
    setShowHistory(false)
    setSelectedHistoryEntry(null)
    setAutoScanResult(null)
  }

  return (
    <Paper
      elevation={2}
      sx={{
        width: 420,
        height: 600,
        borderRadius: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        margin: 0,
        padding: 0,
      }}
    >
      <AppBar position="static" elevation={0} sx={{ backgroundColor: "#000000", margin: 0 }}>
        <Toolbar variant="dense" sx={{ minHeight: 52 }}>
          <Box
            onClick={goHome}
            sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
          >
            <Box
              component="img"
              src="/fred-logo.png"
              alt="Fred"
              sx={{ height: 42, objectFit: "contain" }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, ml: "auto" }}>
            <UsageStatsSection />
            <Tooltip title="History">
              <IconButton
                onClick={toggleHistory}
                size="medium"
                sx={{ color: "#ffffff", opacity: showHistory ? 1 : 0.7 }}
              >
                <HistoryIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings & Help">
              <IconButton
                onClick={toggleSettings}
                size="medium"
                sx={{ color: "#ffffff", opacity: showSettings ? 1 : 0.7 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {panel === "autoscan" && autoScanResult && (
        <Box sx={{ flex: 1, overflow: "auto", p: 0 }}>
          <ThreatRating rating={autoScanResult.threatRating} explanation={autoScanResult.explanation} />
          {autoScanResult.flags && autoScanResult.flags.length > 0 && (
            <DetectedIndicators flags={autoScanResult.flags} threatRating={autoScanResult.threatRating} />
          )}
        </Box>
      )}

      {panel === "settings" && (
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          <GeneralSettings />
          <ErrorBoundary>
            <HelpContent />
          </ErrorBoundary>
          <ErrorBoundary>
            <ApiKeySettings />
          </ErrorBoundary>
        </Box>
      )}

      {panel === "history" && (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {selectedHistoryEntry ? (
            <HistoryDetail entry={selectedHistoryEntry} />
          ) : (
            <HistoryTab onSelectEntry={setSelectedHistoryEntry} />
          )}
        </Box>
      )}

      {panel !== "autoscan" && panel !== "settings" && panel !== "history" && (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Scanner onAnalysisComplete={handleAnalysisComplete} />
        </Box>
      )}
    </Paper>
  )
}
