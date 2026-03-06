import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import HistoryIcon from "@mui/icons-material/History"
import LinkIcon from "@mui/icons-material/Link"
import MailOutlineIcon from "@mui/icons-material/MailOutline"
import SettingsIcon from "@mui/icons-material/Settings"
import TextSnippetIcon from "@mui/icons-material/TextSnippet"
import {
  AppBar,
  Box,
  Button,
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
import { ApiKeySettings } from "./ApiKeySettings"
import { EmailAnalyzer, type EmailAnalyzerRef, type EmailCheckResult } from "./EmailAnalyzer"
import { ErrorBoundary } from "./ErrorBoundary"
import { HelpContent } from "./HelpContent"
import { HistoryTab } from "./HistoryTab"
import { TabPanel } from "./TabPanel"
import { getThreatColor, ThreatRating } from "./ThreatRating"
import { type TextCheckResult, TextInputAnalyzer } from "./TextInputAnalyzer"
import { type URLCheckResult, URLAnalyzer } from "./URLAnalyzer"

const HistoryDetail = ({
  entry,
  onBack,
}: {
  entry: HistoryEntry
  onBack: () => void
}) => {
  const theme = useTheme()
  return (
    <Box sx={{ p: 2 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        size="small"
        sx={{ mb: 2, textTransform: "none" }}
      >
        Back to History
      </Button>

      <ThreatRating rating={entry.result.threatRating} />

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor:
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.primary.main, mb: 1 }}>
          AI Analysis:
        </Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
          {entry.result.explanation}
        </Typography>
      </Paper>

      {entry.result.flags && entry.result.flags.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            p: 2,
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
    result: EmailCheckResult | TextCheckResult | URLCheckResult
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
  }

  const panel = showSettings ? "settings" : showHistory ? "history" : "tabs"

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
            FRED {manifest?.version ? `v${manifest.version}` : ""}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="History">
              <IconButton
                color="inherit"
                onClick={toggleHistory}
                size="medium"
                sx={{ opacity: showHistory ? 1 : 0.8 }}
              >
                <HistoryIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings & Help">
              <IconButton
                color="inherit"
                onClick={toggleSettings}
                size="medium"
                sx={{ opacity: showSettings ? 1 : 0.8 }}
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
          <Tabs
            value={tabValue}
            onChange={(_e, v) => setTabValue(v)}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": { minHeight: 48, fontSize: "0.875rem" },
              "& .MuiTabs-indicator": { height: 2 },
            }}
          >
            <Tab
              icon={<MailOutlineIcon fontSize="small" />}
              label={emailProvider ? `Email (${emailProvider})` : "Email"}
              iconPosition="start"
            />
            <Tab icon={<TextSnippetIcon fontSize="small" />} label="Text" iconPosition="start" />
            <Tab icon={<LinkIcon fontSize="small" />} label="URL" iconPosition="start" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
            <TabPanel value={tabValue} index={0} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <EmailAnalyzer ref={emailAnalyzerRef} onAnalysisComplete={handleAnalysisComplete} />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel value={tabValue} index={1} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <TextInputAnalyzer onAnalysisComplete={handleAnalysisComplete} />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel value={tabValue} index={2} idPrefix="fred" timeout={500}>
              <ErrorBoundary>
                <URLAnalyzer onAnalysisComplete={handleAnalysisComplete} />
              </ErrorBoundary>
            </TabPanel>
          </Box>
        </>
      )}
    </Paper>
  )
}
