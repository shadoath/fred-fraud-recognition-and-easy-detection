import AnalyticsIcon from "@mui/icons-material/Analytics"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import HistoryIcon from "@mui/icons-material/History"
import LightModeIcon from "@mui/icons-material/LightMode"
import LinkIcon from "@mui/icons-material/Link"
import MailOutlineIcon from "@mui/icons-material/MailOutline"
import SettingsIcon from "@mui/icons-material/Settings"
import TextDecreaseIcon from "@mui/icons-material/TextDecrease"
import TextIncreaseIcon from "@mui/icons-material/TextIncrease"
import TextSnippetIcon from "@mui/icons-material/TextSnippet"
import {
  AppBar,
  Box,
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
import { useCustomThemeContext } from "../contexts/CustomThemeContext"
import { useManifestHook } from "../hooks/useManifestHook"
import { saveHistoryEntry, type HistoryEntry } from "../lib/historyStorage"
import { AnalysisTab } from "./AnalysisTab"
import { ApiKeySettings } from "./ApiKeySettings"
import { HelpContent } from "./HelpContent"
import { EmailAnalyzer, type EmailAnalyzerRef, type EmailCheckResult } from "./EmailAnalyzer"
import { ErrorBoundary } from "./ErrorBoundary"
import { HistoryTab } from "./HistoryTab"
import { TabPanel } from "./TabPanel"
import { type TextCheckResult, TextInputAnalyzer } from "./TextInputAnalyzer"
import { type URLCheckResult, URLAnalyzer } from "./URLAnalyzer"

interface AnalysisData {
  type: "email" | "text" | "url"
  input: {
    sender?: string
    subject?: string
    content: string
  }
  result: EmailCheckResult | TextCheckResult | URLCheckResult
  timestamp: string
}

export const MainDisplay = () => {
  const manifest = useManifestHook()
  const theme = useTheme()
  const { darkMode, toggleDarkMode, largeText, toggleLargeText } = useCustomThemeContext()
  const [tabValue, setTabValue] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [emailProvider, setEmailProvider] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [resultKey, setResultKey] = useState(0)
  const emailAnalyzerRef = useRef<EmailAnalyzerRef>(null)

  // Email provider detection
  useEffect(() => {
    const detectEmailProvider = async () => {
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        })

        if (tab?.url) {
          const url = new URL(tab.url)
          const hostname = url.hostname.toLowerCase()

          // Define known email providers hostnames
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

          // Find the matching provider
          const matchedProvider = emailProviders.find((provider) =>
            hostname.includes(provider.domain)
          )

          if (matchedProvider) {
            // We're on an email provider site
            setEmailProvider(matchedProvider.name)
            setTabValue(0) // Email tab

            // Auto-extract email content if on Gmail
            if (matchedProvider.name === "Gmail") {
              // Use a small delay to ensure the EmailAnalyzer component has mounted
              setTimeout(() => {
                emailAnalyzerRef.current?.extractEmail()
              }, 100)
            }
          } else {
            // Not on an email provider site
            setEmailProvider(null)
            setTabValue(1) // Text tab
          }
        }
      } catch (error) {
        console.error("Error detecting email provider:", error)
        setEmailProvider(null)
        // Default to text tab on error
        setTabValue(1)
      }
    }

    // Run the detection
    detectEmailProvider()

    // Restore last analysis from session storage
    chrome.storage.session
      .get("fredLastAnalysis")
      .then((stored) => {
        if (stored.fredLastAnalysis) {
          setAnalysisData(stored.fredLastAnalysis as AnalysisData)
        }
      })
      .catch(() => {})
  }, []) // Empty dependency array means this runs once on mount

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  // Function to handle analysis completion and switch to analysis tab
  const handleAnalysisComplete = (
    type: "email" | "text" | "url",
    input: { sender?: string; subject?: string; content: string },
    result: EmailCheckResult | TextCheckResult | URLCheckResult
  ) => {
    const newAnalysisData: AnalysisData = {
      type,
      input,
      result,
      timestamp: new Date().toISOString(),
    }
    setAnalysisData(newAnalysisData)
    chrome.storage.session.set({ fredLastAnalysis: newAnalysisData }).catch(() => {})
    setResultKey((k) => k + 1)
    setTabValue(3) // Switch to analysis tab

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
      timestamp: newAnalysisData.timestamp,
    }
    saveHistoryEntry(historyEntry)
  }

  const handleHistorySelect = (entry: HistoryEntry) => {
    const baseResult = {
      threatRating: entry.result.threatRating,
      explanation: entry.result.explanation,
      flags: entry.result.flags,
      confidence: entry.result.confidence,
    }
    const restoredResult: EmailCheckResult | TextCheckResult | URLCheckResult =
      entry.type === "email"
        ? ({
            ...baseResult,
            sender: entry.input.sender ?? "",
            subject: entry.input.subject ?? "",
          } as EmailCheckResult)
        : entry.type === "url"
          ? ({ ...baseResult, url: entry.input.content } as URLCheckResult)
          : ({ ...baseResult, content: entry.input.content } as TextCheckResult)
    const restoredData: AnalysisData = {
      type: entry.type,
      input: entry.input,
      result: restoredResult,
      timestamp: entry.timestamp,
    }
    setAnalysisData(restoredData)
    chrome.storage.session.set({ fredLastAnalysis: restoredData }).catch(() => {})
    setTabValue(3) // Switch to analysis tab
  }

  return (
    <Paper
      elevation={2}
      sx={{
        width: 600,
        height: 600,
        borderRadius: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        padding: 1,
        margin: 0,
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(45deg, #1a237e 30%, #283593 90%)"
              : "linear-gradient(45deg, #2979ff 30%, #2196f3 90%)",
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 40, justifyContent: "space-between", px: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 700, letterSpacing: "0.05em" }}>
            FRED
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton color="inherit" onClick={toggleDarkMode} size="medium">
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={largeText ? "Switch to normal text size" : "Switch to larger text"}>
              <IconButton color="inherit" onClick={toggleLargeText} size="medium">
                {largeText ? <TextDecreaseIcon /> : <TextIncreaseIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings & Help">
              <IconButton color="inherit" onClick={toggleSettings} size="medium">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {showSettings ? (
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          <ErrorBoundary>
            <ApiKeySettings />
          </ErrorBoundary>
          <ErrorBoundary>
            <HelpContent />
          </ErrorBoundary>
        </Box>
      ) : (
        <>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": {
                minHeight: 48,
                fontSize: "0.875rem",
              },
              "& .MuiTabs-indicator": {
                height: 2,
              },
            }}
          >
            <Tab
              icon={<MailOutlineIcon fontSize="small" />}
              label={emailProvider ? `Email (${emailProvider})` : "Email"}
              iconPosition="start"
            />
            <Tab icon={<TextSnippetIcon fontSize="small" />} label="Text" iconPosition="start" />
            <Tab icon={<LinkIcon fontSize="small" />} label="URL" iconPosition="start" />
            <Tab icon={<AnalyticsIcon fontSize="small" />} label="Analysis" iconPosition="start" />
            <Tab icon={<HistoryIcon fontSize="small" />} label="History" iconPosition="start" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
            <TabPanel value={tabValue} index={0} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <EmailAnalyzer
                  key={resultKey}
                  ref={emailAnalyzerRef}
                  onAnalysisComplete={handleAnalysisComplete}
                />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel value={tabValue} index={1} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <TextInputAnalyzer key={resultKey} onAnalysisComplete={handleAnalysisComplete} />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel value={tabValue} index={2} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <URLAnalyzer key={resultKey} onAnalysisComplete={handleAnalysisComplete} />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel value={tabValue} index={3} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <AnalysisTab analysisData={analysisData} />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel value={tabValue} index={4} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <HistoryTab onSelectEntry={handleHistorySelect} />
              </ErrorBoundary>
            </TabPanel>
          </Box>
        </>
      )}

      <Box sx={{ p: 1, textAlign: "center", borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
          F.R.E.D. • v{manifest?.version || "?"}
        </Typography>
      </Box>
    </Paper>
  )
}
