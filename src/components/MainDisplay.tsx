import DarkModeIcon from "@mui/icons-material/DarkMode"
import HistoryIcon from "@mui/icons-material/History"
import LightModeIcon from "@mui/icons-material/LightMode"
import MailOutlineIcon from "@mui/icons-material/MailOutline"
import SearchIcon from "@mui/icons-material/Search"
import SettingsIcon from "@mui/icons-material/Settings"
import TextDecreaseIcon from "@mui/icons-material/TextDecrease"
import TextIncreaseIcon from "@mui/icons-material/TextIncrease"
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
} from "@mui/material"
import { useEffect, useRef, useState } from "react"
import { useCustomThemeContext } from "../contexts/CustomThemeContext"
import { type HistoryEntry, saveHistoryEntry } from "../lib/historyStorage"
import { recordCheck } from "../lib/usageStorage"
import { ApiKeySettings } from "./ApiKeySettings"
import { ContentAnalyzer, type ContentCheckResult } from "./ContentAnalyzer"
import { DetectedIndicators } from "./DetectedIndicators"
import { EmailAnalyzer, type EmailAnalyzerRef, type EmailCheckResult } from "./EmailAnalyzer"
import { ErrorBoundary } from "./ErrorBoundary"
import { HelpContent } from "./HelpContent"
import { HistoryTab } from "./HistoryTab"
import { TabPanel } from "./TabPanel"
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
  const [tabValue, setTabValue] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<HistoryEntry | null>(null)
  const [emailProvider, setEmailProvider] = useState<string | null>(null)
  const emailAnalyzerRef = useRef<EmailAnalyzerRef>(null)

  useEffect(() => {
    const detectEmailProvider = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.url) {
          const url = new URL(tab.url)
          const hostname = url.hostname.toLowerCase()
          const emailProviders = [
            { domain: "mail.google.com", name: "Gmail" },
            { domain: "outlook.live.com", name: "Outlook" },
            { domain: "outlook.office.com", name: "Outlook" },
            { domain: "outlook.office365.com", name: "Outlook" },
            { domain: "mail.yahoo.com", name: "Yahoo Mail" },
            { domain: "aol.com", name: "AOL Mail" },
            { domain: "protonmail.com", name: "ProtonMail" },
            { domain: "mail.proton.me", name: "ProtonMail" },
            { domain: "zoho.com", name: "Zoho Mail" },
          ]
          const matchedProvider = emailProviders.find((p) => hostname.includes(p.domain))
          if (matchedProvider) {
            setEmailProvider(matchedProvider.name)
            setTabValue(0)
            if (matchedProvider.name === "Gmail") {
              setTimeout(() => emailAnalyzerRef.current?.extractEmail(), 100)
            }
          } else {
            setEmailProvider(null)
            setTabValue(1)
          }
        }
      } catch {
        setEmailProvider(null)
        setTabValue(1)
      }
    }
    detectEmailProvider()
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
    type: "email" | "text" | "url",
    input: { sender?: string; subject?: string; title?: string; content: string },
    result: EmailCheckResult | ContentCheckResult
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

  const panel = showSettings ? "settings" : showHistory ? "history" : "tabs"

  const goHome = () => {
    setShowSettings(false)
    setShowHistory(false)
    setSelectedHistoryEntry(null)
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
      <AppBar position="static" elevation={0} sx={{ backgroundColor: "#F5A623", margin: 0 }}>
        <Toolbar variant="dense" sx={{ minHeight: 52, position: "relative" }}>
          <Box
            onClick={goHome}
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
            }}
          >
            <Box
              component="img"
              src="/fred-logo.png"
              alt="Fred"
              sx={{ height: 42, objectFit: "contain" }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, ml: "auto" }}>
            <Tooltip title="History">
              <IconButton
                onClick={toggleHistory}
                size="medium"
                sx={{ color: "#1a1a1a", opacity: showHistory ? 1 : 0.7 }}
              >
                <HistoryIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings & Help">
              <IconButton
                onClick={toggleSettings}
                size="medium"
                sx={{ color: "#1a1a1a", opacity: showSettings ? 1 : 0.7 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {panel === "settings" && (
        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
            <DisplayButtons />
            <ErrorBoundary>
              <HelpContent />
            </ErrorBoundary>
            <ErrorBoundary>
              <ApiKeySettings />
            </ErrorBoundary>
          </Box>
          <UsageStatsSection />
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

      {panel === "tabs" && (
        <>
          <Box sx={{ backgroundColor: "#2a2a2a" }}>
            <Tabs
              value={tabValue}
              onChange={(_e, v) => setTabValue(v)}
              variant="fullWidth"
              sx={{
                minHeight: 36,
                backgroundColor: "#3d3d3d",
                borderRadius: 2,
                py: 0.5,

                "& .MuiTabs-indicator": { display: "none" },
                "& .MuiTab-root": {
                  minHeight: 24,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.5)",
                  borderRadius: 1.5,
                  textTransform: "none",
                  transition: "all 0.2s ease",
                  py: 0.5,
                },
                "& .Mui-selected": {
                  color: "#1a1a1a !important",
                  backgroundColor: "#F5A623",
                  borderRadius: 1.5,
                },
              }}
            >
              <Tab
                icon={<MailOutlineIcon fontSize="small" />}
                label={emailProvider ? `Email (${emailProvider})` : "Email"}
                iconPosition="start"
              />
              <Tab icon={<SearchIcon fontSize="small" />} label="URL" iconPosition="start" />
            </Tabs>
          </Box>

          <Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
            <TabPanel value={tabValue} index={0} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <EmailAnalyzer ref={emailAnalyzerRef} onAnalysisComplete={handleAnalysisComplete} />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel value={tabValue} index={1} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <ContentAnalyzer onAnalysisComplete={handleAnalysisComplete} />
              </ErrorBoundary>
            </TabPanel>
          </Box>
        </>
      )}
    </Paper>
  )
}

const DisplayButtons = () => {
  const { darkMode, toggleDarkMode, largeText, toggleLargeText } = useCustomThemeContext()
  return (
    <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}>
      <Button
        variant="outlined"
        size="small"
        onClick={toggleDarkMode}
        startIcon={darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        sx={{ textTransform: "none", borderRadius: 2 }}
      >
        {darkMode ? "Light Mode" : "Dark Mode"}
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={toggleLargeText}
        startIcon={largeText ? <TextDecreaseIcon fontSize="small" /> : <TextIncreaseIcon fontSize="small" />}
        sx={{ textTransform: "none", borderRadius: 2 }}
      >
        {largeText ? "Normal Text" : "Larger Text"}
      </Button>
    </Box>
  )
}
