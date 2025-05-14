import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import MailOutlineIcon from "@mui/icons-material/MailOutline"
import SettingsIcon from "@mui/icons-material/Settings"
import TextSnippetIcon from "@mui/icons-material/TextSnippet"
import {
  AppBar,
  Box,
  Container,
  Fade,
  IconButton,
  Paper,
  Slide,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material"
import { useEffect, useState } from "react"
import { useCustomThemeContext } from "../contexts/CustomThemeContext"
import { useManifestHook } from "../hooks/useManifestHook"
import { ApiKeySettings } from "./ApiKeySettings"
import { EmailAnalyzer } from "./EmailAnalyzer"
import { ErrorBoundary } from "./ErrorBoundary"
import { TextInputAnalyzer } from "./TextInputAnalyzer"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
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
      style={{ width: "100%" }}
    >
      {value === index && (
        <Fade in={value === index} timeout={500}>
          <Box sx={{ pt: 2 }}>{children}</Box>
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
  const [emailProvider, setEmailProvider] = useState<string | null>(null)

  // Email provider detection
  useEffect(() => {
    const detectEmailProvider = async () => {
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

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
  }, []) // Empty dependency array means this runs once on mount

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  return (
    <Container style={{ padding: 0 }}>
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
          transition: "all 0.3s ease",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <AppBar
          position="static"
          color="primary"
          sx={{
            boxShadow: "none",
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(45deg, #1a237e 30%, #283593 90%)"
                : "linear-gradient(45deg, #2979ff 30%, #2196f3 90%)",
          }}
        >
          <Toolbar variant="dense" sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  fontSize: "1.1rem",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                FRED
                <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.9,
                    ml: 1,
                    display: { xs: "none", sm: "block" },
                    fontSize: "0.8rem",
                    fontWeight: 400,
                  }}
                >
                  Fraud Recognition & Easy Detection
                </Typography>
              </Typography>
            </Box>

            <Box sx={{ display: "flex" }}>
              <IconButton color="inherit" onClick={toggleDarkMode} size="small" sx={{ mr: 1 }}>
                {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
              <IconButton edge="end" color="inherit" onClick={toggleSettings} size="small">
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Slide direction="right" in={showSettings} mountOnEnter unmountOnExit>
          <Box>
            <ErrorBoundary>
              <ApiKeySettings />
              {/* <PermissionsManager /> */}
            </ErrorBoundary>
          </Box>
        </Slide>

        <Slide direction="left" in={!showSettings} mountOnEnter>
          <div>
            <Tabs
              hidden={!showSettings}
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": {
                  minHeight: "48px",
                  fontSize: "0.875rem",
                  transition: "all 0.2s",
                },
                "& .Mui-selected": {
                  fontWeight: "bold",
                },
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                },
              }}
            >
              <Tab
                icon={<MailOutlineIcon fontSize="small" />}
                label={emailProvider ? `Email (${emailProvider})` : "Email"}
                iconPosition="start"
                id="fred-tab-0"
                aria-controls="fred-tabpanel-0"
              />
              <Tab
                icon={<TextSnippetIcon fontSize="small" />}
                label="Text"
                iconPosition="start"
                id="fred-tab-1"
                aria-controls="fred-tabpanel-1"
              />
            </Tabs>

            {/* Offline mode has been removed - API key is now required */}

            <Box>
              <TabPanel value={tabValue} index={0}>
                <ErrorBoundary>
                  <EmailAnalyzer />
                </ErrorBoundary>
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <ErrorBoundary>
                  <TextInputAnalyzer />
                </ErrorBoundary>
              </TabPanel>
            </Box>
          </div>
        </Slide>
      </Paper>

      <Box sx={{ mt: 1, textAlign: "center" }}>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{
            fontSize: "0.7rem",
            opacity: 0.8,
          }}
        >
          F.R.E.D. • v{manifest?.version || "?"}
        </Typography>
      </Box>
    </Container>
  )
}
