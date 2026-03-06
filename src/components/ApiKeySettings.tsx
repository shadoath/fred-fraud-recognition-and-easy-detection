import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import KeyIcon from "@mui/icons-material/Key"
import LinkIcon from "@mui/icons-material/Link"
import SettingsIcon from "@mui/icons-material/Settings"
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
import { useState } from "react"
import { useApiKey } from "../hooks/useApiKey"

export const ApiKeySettings = () => {
  const theme = useTheme()
  const { apiKey, setApiKey, isApiKeySaved, isLoading, isSaving, saveApiKey, clearApiKey, selectedModel, saveSelectedModel, connectionMode, saveConnectionMode } =
    useApiKey()
  const [showApiKey, setShowApiKey] = useState<boolean>(false)

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
                <ToggleButton value="proxy">Free (5/week)</ToggleButton>
                <ToggleButton value="byok">My Own Key</ToggleButton>
              </ToggleButtonGroup>

              {connectionMode === "proxy" && (
                <Alert
                  severity="success"
                  icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                  sx={{ mb: 2, borderRadius: 1.5 }}
                >
                  5 free checks per week included. No API key needed.
                </Alert>
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
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontSize: "0.8rem", lineHeight: 1.5, display: "block" }}
            >
              🔒 Privacy: When you analyze content, the text is sent to OpenAI for analysis and is not stored by FRED or Anthropic. Your API key never leaves your device.
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
