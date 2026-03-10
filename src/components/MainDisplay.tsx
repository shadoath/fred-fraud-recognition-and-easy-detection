import HistoryIcon from "@mui/icons-material/History"
import MailOutlineIcon from "@mui/icons-material/MailOutline"
import SearchIcon from "@mui/icons-material/Search"
import SettingsIcon from "@mui/icons-material/Settings"
import {
  AppBar,
  Box,
  Chip,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material"
import { useEffect, useRef, useState } from "react"
import { useManifestHook } from "../hooks/useManifestHook"
import { saveHistoryEntry, type HistoryEntry } from "../lib/historyStorage"
import { recordCheck } from "../lib/usageStorage"
import { ApiKeySettings } from "./ApiKeySettings"
import { EmailAnalyzer, type EmailAnalyzerRef, type EmailCheckResult } from "./EmailAnalyzer"
import { ErrorBoundary } from "./ErrorBoundary"
import { HelpContent } from "./HelpContent"
import { HistoryTab } from "./HistoryTab"
import { TabPanel } from "./TabPanel"
import { getThreatColor, ThreatRating } from "./ThreatRating"
import { type ContentCheckResult, ContentAnalyzer } from "./ContentAnalyzer"

const HistoryDetail = ({ entry }: { entry: HistoryEntry; onBack: () => void }) => {
  const theme = useTheme()
  return (
    <Box sx={{ p: 0, m: 0 }}>
      <ThreatRating rating={entry.result.threatRating} explanation={entry.result.explanation} />

      {entry.result.flags && entry.result.flags.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 0,
            m: 0,
            borderRadius: 2,
            backgroundColor:
              theme.palette.mode === "dark"
                ? `${getThreatColor(entry.result.threatRating)}10`
                : `${getThreatColor(entry.result.threatRating)}08`,
            border: `1px solid ${getThreatColor(entry.result.threatRating)}30`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 600, color: getThreatColor(entry.result.threatRating) }}
          >
            Detected Indicators:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
            {entry.result.flags.map((flag) => (
              <Chip
                key={flag}
                label={flag}
                size="small"
                sx={{
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? `${getThreatColor(entry.result.threatRating)}20`
                      : `${getThreatColor(entry.result.threatRating)}15`,
                  color: getThreatColor(entry.result.threatRating),
                  borderRadius: 1,
                  fontSize: "0.75rem",
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        {new Date(entry.timestamp).toLocaleString()}
      </Typography>
    </Box>
  )
}

export const MainDisplay = () => {
  const manifest = useManifestHook()
  const theme = useTheme()
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
    input: { sender?: string; subject?: string; content: string },
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
              alt="FRED"
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
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          <ErrorBoundary>
            <ApiKeySettings />
          </ErrorBoundary>
          <ErrorBoundary>
            <HelpContent />
          </ErrorBoundary>
        </Box>
      )}

      {panel === "history" && (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {selectedHistoryEntry ? (
            <HistoryDetail
              entry={selectedHistoryEntry}
              onBack={() => setSelectedHistoryEntry(null)}
            />
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
