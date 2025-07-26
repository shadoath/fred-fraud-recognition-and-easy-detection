import AnalyticsIcon from "@mui/icons-material/Analytics"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import MailOutlineIcon from "@mui/icons-material/MailOutline"
import SettingsIcon from "@mui/icons-material/Settings"
import TextSnippetIcon from "@mui/icons-material/TextSnippet"
import {
  AppBar,
  Box,
  Fade,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material"
import { useRef, useState } from "react"
import { useCustomThemeContext } from "../contexts/CustomThemeContext"
import { useManifestHook } from "../hooks/useManifestHook"
import { AnalysisTab } from "./AnalysisTab"
import { ApiKeySettings } from "./ApiKeySettings"
import { EmailAnalyzer, type EmailAnalyzerRef, type EmailCheckResult } from "./EmailAnalyzer"
import { ErrorBoundary } from "./ErrorBoundary"
import { type TextCheckResult, TextInputAnalyzer } from "./TextInputAnalyzer"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

interface AnalysisData {
  type: "email" | "text"
  input: {
    sender?: string
    subject?: string
    content: string
  }
  result: EmailCheckResult | TextCheckResult
  timestamp: string
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`fred-tabpanel-${index}`}
      aria-labelledby={`fred-tab-${index}`}
      {...other}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "auto",
      }}
    >
      {value === index && (
        <Fade in={value === index} timeout={500}>
          <Box sx={{ p: 2, height: "100%", boxSizing: "border-box" }}>{children}</Box>
        </Fade>
      )}
    </div>
  )
}

export const MainDisplay = () => {
  const manifest = useManifestHook()
  const theme = useTheme()
  const { darkMode, toggleDarkMode } = useCustomThemeContext()
  const [tabValue, setTabValue] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const emailAnalyzerRef = useRef<EmailAnalyzerRef>(null)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  // Function to handle analysis completion and switch to analysis tab
  const handleAnalysisComplete = (
    type: "email" | "text",
    input: { sender?: string; subject?: string; content: string },
    result: EmailCheckResult | TextCheckResult
  ) => {
    const newAnalysisData: AnalysisData = {
      type,
      input,
      result,
      timestamp: new Date().toISOString(),
    }
    setAnalysisData(newAnalysisData)
    setTabValue(2) // Switch to analysis tab
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
        <Toolbar variant="dense" sx={{ minHeight: 56, justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
            FRED
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton color="inherit" onClick={toggleDarkMode} size="small">
              {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
            <IconButton color="inherit" onClick={toggleSettings} size="small">
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {showSettings ? (
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          <ErrorBoundary>
            <ApiKeySettings />
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
            <Tab icon={<MailOutlineIcon fontSize="small" />} label="Email" iconPosition="start" />
            <Tab icon={<TextSnippetIcon fontSize="small" />} label="Text" iconPosition="start" />
            <Tab icon={<AnalyticsIcon fontSize="small" />} label="Analysis" iconPosition="start" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
            <TabPanel value={tabValue} index={0}>
              <ErrorBoundary>
                <EmailAnalyzer ref={emailAnalyzerRef} onAnalysisComplete={handleAnalysisComplete} />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <ErrorBoundary>
                <TextInputAnalyzer onAnalysisComplete={handleAnalysisComplete} />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <ErrorBoundary>
                <AnalysisTab analysisData={analysisData} />
              </ErrorBoundary>
            </TabPanel>
          </Box>
        </>
      )}

      <Box sx={{ p: 1, textAlign: "center", borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
          F.R.E.D. • v{manifest?.version || "?"}
        </Typography>
      </Box>
    </Paper>
  )
}
