import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import KeyIcon from "@mui/icons-material/Key"
import LightModeIcon from "@mui/icons-material/LightMode"
import LinkIcon from "@mui/icons-material/Link"
import SettingsIcon from "@mui/icons-material/Settings"
import TextDecreaseIcon from "@mui/icons-material/TextDecrease"
import TextIncreaseIcon from "@mui/icons-material/TextIncrease"
import VisibilityIcon from "@mui/icons-material/Visibility"
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Fade,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material"
import { useEffect, useState } from "react"
import { useCustomThemeContext } from "../contexts/CustomThemeContext"
import { FREE_CHECKS_PER_MONTH, PAID_CHECKS_PER_MONTH } from "../lib/fraudService"
import { useApiKey } from "../hooks/useApiKey"
import { getUsageStats } from "../lib/usageStorage"

export const ApiKeySettings = () => {
  const theme = useTheme()
  const { apiKey, setApiKey, isApiKeySaved, isLoading, isSaving, saveApiKey, clearApiKey, selectedModel, saveSelectedModel, connectionMode, saveConnectionMode, licenseKey, isPaidUser, saveLicenseKey, clearLicenseKey } =
    useApiKey()
  const [licenseInput, setLicenseInput] = useState("")
  const { darkMode, toggleDarkMode, largeText, toggleLargeText } = useCustomThemeContext()
  const [showApiKey, setShowApiKey] = useState<boolean>(false)
  const [usageStats, setUsageStats] = useState<{ allTimeChecks: number; allTimeThreats: number; monthlyChecks: number; monthlyThreats: number } | null>(null)

  useEffect(() => {
    getUsageStats().then(setUsageStats)
  }, [])

  return (
    <Fade in={true} timeout={400}>
      <Card
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "none",
          backgroundColor:
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
            pb: 1,
            borderBottom: `1px dashed ${theme.palette.divider}`,
          }}
        >
          <SettingsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
            API Settings
          </Typography>
        </Box>

        <Box sx={{ px: 0.5 }}>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={connectionMode}
                onChange={(_e, newMode) => { if (newMode) saveConnectionMode(newMode) }}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="proxy">Free ({FREE_CHECKS_PER_MONTH}/month)</ToggleButton>
                <ToggleButton value="byok">My Own Key</ToggleButton>
              </ToggleButtonGroup>

              {connectionMode === "proxy" && (
                <>
                  <Alert
                    severity="success"
                    icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                    sx={{ mb: 2, borderRadius: 1.5 }}
                  >
                    {isPaidUser
                      ? `FRED Premium active — ${PAID_CHECKS_PER_MONTH} checks/month with enhanced AI.`
                      : `${FREE_CHECKS_PER_MONTH} free checks per month included. No API key needed.`}
                  </Alert>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      border: `1px solid ${isPaidUser ? theme.palette.success.main : theme.palette.primary.main}40`,
                      backgroundColor: isPaidUser
                        ? theme.palette.mode === "dark" ? "rgba(76, 175, 80, 0.08)" : "rgba(76, 175, 80, 0.04)"
                        : theme.palette.mode === "dark" ? "rgba(66, 165, 245, 0.08)" : "rgba(66, 165, 245, 0.04)",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: isPaidUser ? theme.palette.success.main : theme.palette.primary.main }}>
                      {isPaidUser ? "FRED Premium" : "Upgrade to FRED Premium"}
                    </Typography>

                    {!isPaidUser && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: "0.85rem", mb: 1, color: theme.palette.text.secondary }}>
                          For the price of a cup of coffee, get peace of mind:
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                          <Typography component="li" variant="body2" sx={{ fontSize: "0.85rem", mb: 0.5 }}>
                            {PAID_CHECKS_PER_MONTH} checks per month (vs {FREE_CHECKS_PER_MONTH} free)
                          </Typography>
                          <Typography component="li" variant="body2" sx={{ fontSize: "0.85rem", mb: 0.5 }}>
                            Enhanced AI analysis for better accuracy
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          href="https://fred-security.lemonsqueezy.com/checkout/buy/61ff0f2b-4995-4759-8bdf-a724499a6f8d"
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ mt: 1.5, borderRadius: 2, textTransform: "none", boxShadow: 2 }}
                        >
                          Subscribe — $4.99/month
                        </Button>
                      </Box>
                    )}

                    <Typography variant="caption" sx={{ display: "block", mb: 1, color: theme.palette.text.secondary }}>
                      {isPaidUser ? "Your license key is active." : "Already subscribed? Enter your license key below:"}
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Paste your license key..."
                        value={isPaidUser ? (licenseKey ?? "") : licenseInput}
                        onChange={(e) => setLicenseInput(e.target.value)}
                        disabled={isPaidUser}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            fontSize: "0.85rem",
                          },
                        }}
                      />
                      {isPaidUser ? (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={clearLicenseKey}
                          sx={{ borderRadius: 2, textTransform: "none", whiteSpace: "nowrap" }}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            if (licenseInput.trim()) {
                              saveLicenseKey(licenseInput.trim())
                              setLicenseInput("")
                            }
                          }}
                          disabled={!licenseInput.trim()}
                          sx={{ borderRadius: 2, textTransform: "none", whiteSpace: "nowrap" }}
                        >
                          Activate
                        </Button>
                      )}
                    </Box>
                  </Paper>
                </>
              )}

              {connectionMode === "byok" && (
                <>
                  {!isApiKeySaved && (
                    <Typography
                      variant="body2"
                      sx={{
                        mb: 2,
                        color: theme.palette.text.secondary,
                        fontSize: "0.875rem",
                        lineHeight: 1.5,
                      }}
                    >
                      FRED uses OpenAI's AI service to analyze content for you. To get started, you need a
                      free OpenAI account and a personal API key. Your key is stored only on your device and
                      is never shared with anyone.
                    </Typography>
                  )}

                  <TextField
                    fullWidth
                    label="OpenAI API Key"
                    variant="outlined"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    sx={{
                      mb: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        backgroundColor: theme.palette.background.paper,
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: `${theme.palette.primary.main}80`,
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderWidth: "1px",
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyIcon color="primary" fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowApiKey(!showApiKey)}
                            edge="end"
                            size="small"
                          >
                            {showApiKey ? (
                              <VisibilityOffIcon fontSize="small" />
                            ) : (
                              <VisibilityIcon fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="model-select-label">AI Analysis Level</InputLabel>
                    <Select
                      labelId="model-select-label"
                      value={selectedModel}
                      label="AI Analysis Level"
                      onChange={(e: SelectChangeEvent) => saveSelectedModel(e.target.value)}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      <MenuItem value="gpt-4o-mini">Standard (recommended)</MenuItem>
                      <MenuItem value="gpt-4o">More Thorough (slower, higher cost)</MenuItem>
                      <MenuItem value="gpt-3.5-turbo">Basic (fastest, lower cost)</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={saveApiKey}
                      disabled={isSaving || !apiKey?.trim().startsWith("sk-")}
                      sx={{
                        flex: 1,
                        borderRadius: 2,
                        textTransform: "none",
                        py: 0.8,
                        boxShadow: 2,
                        fontSize: "0.875rem",
                      }}
                      size="medium"
                    >
                      {isSaving ? <CircularProgress size={20} color="inherit" /> : "Save API Key"}
                    </Button>

                    <Button
                      variant="outlined"
                      color="error"
                      onClick={clearApiKey}
                      disabled={isSaving || !apiKey}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        minWidth: "80px",
                        fontSize: "0.875rem",
                      }}
                      size="medium"
                    >
                      Clear
                    </Button>
                  </Box>

                  {!isApiKeySaved && <HowToGetApiKey />}
                </>
              )}
            </>
          )}

          <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 1 }}>
              Display
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={toggleDarkMode}
                startIcon={darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                {darkMode ? "Light Mode" : "Dark Mode"}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={toggleLargeText}
                startIcon={largeText ? <TextDecreaseIcon fontSize="small" /> : <TextIncreaseIcon fontSize="small" />}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                {largeText ? "Normal Text" : "Larger Text"}
              </Button>
            </Box>
          </Box>

          {usageStats && (
            <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 1 }}>
                Your Stats
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>All time checks</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{usageStats.allTimeChecks}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Threats caught</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: usageStats.allTimeThreats > 0 ? theme.palette.warning.main : "text.secondary" }}>
                    {usageStats.allTimeThreats}
                  </Typography>
                </Box>
                {connectionMode === "proxy" && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Used this month</Typography>
                    <Typography variant="caption" sx={{
                      fontWeight: 600,
                      color: usageStats.monthlyChecks >= (isPaidUser ? PAID_CHECKS_PER_MONTH : FREE_CHECKS_PER_MONTH)
                        ? theme.palette.error.main
                        : "text.secondary"
                    }}>
                      {usageStats.monthlyChecks} / {isPaidUser ? PAID_CHECKS_PER_MONTH : FREE_CHECKS_PER_MONTH}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontSize: "0.8rem", lineHeight: 1.5, display: "block" }}
            >
              🔒 Privacy: When you analyze content, the text is sent to OpenAI for analysis and is not stored by FRED. Your API key never leaves your device.
            </Typography>
          </Box>
        </Box>
      </Card>
    </Fade>
  )
}

const HowToGetApiKey = () => {
  const theme = useTheme()
  return (
    <Paper
      elevation={0}
      sx={{
        mt: 3,
        p: 2,
        borderRadius: 2,
        backgroundColor:
          theme.palette.mode === "dark" ? "rgba(66, 165, 245, 0.08)" : "rgba(66, 165, 245, 0.05)",
        border: `1px solid ${theme.palette.primary.main}20`,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          mb: 1.5,
          fontWeight: 600,
          color: theme.palette.primary.main,
          display: "flex",
          alignItems: "center",
          gap: 0.7,
        }}
      >
        <InfoOutlinedIcon fontSize="small" />
        How to set up FRED (one-time setup):
      </Typography>

      <Box component="ol" sx={{ pl: 2, mb: 0, mt: 0 }}>
        <Typography
          component="li"
          variant="body2"
          sx={{
            mb: 0.5,
            fontSize: "0.85rem",
            "& a": {
              display: "inline-flex",
              alignItems: "center",
              gap: 0.3,
              color: theme.palette.primary.main,
            },
          }}
        >
          Go to{" "}
          <Link
            href="https://platform.openai.com/account/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
          >
            the OpenAI API keys page
            <LinkIcon sx={{ fontSize: "0.9rem" }} />
          </Link>
        </Typography>
        <Typography component="li" variant="body2" sx={{ mb: 0.5, fontSize: "0.85rem" }}>
          Create a free account if you don't have one
        </Typography>
        <Typography component="li" variant="body2" sx={{ mb: 0.5, fontSize: "0.85rem" }}>
          Click "Create new secret key" — give it any name
        </Typography>
        <Typography component="li" variant="body2" sx={{ fontSize: "0.85rem" }}>
          Copy the long key that appears (it starts with "sk-") and paste it above
        </Typography>
      </Box>

      <Divider sx={{ my: 1.5, opacity: 0.6 }} />

      <Alert
        severity="info"
        variant="outlined"
        icon={false}
        sx={{
          borderRadius: 1.5,
          py: 0.5,
          backgroundColor: "transparent",
          "& .MuiAlert-message": {
            padding: 0,
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: "0.75rem",
            fontStyle: "italic",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <InfoOutlinedIcon fontSize="inherit" />
          Each check costs a tiny fraction of a cent. Most users spend less than $1 per month.
        </Typography>
      </Alert>
    </Paper>
  )
}
