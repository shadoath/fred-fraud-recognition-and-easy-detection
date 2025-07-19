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
  IconButton,
  InputAdornment,
  Link,
  Paper,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { useState } from "react"
import { useApiKey } from "../hooks/useApiKey"
// API Key storage key in Chrome storage
export const API_KEY_STORAGE_KEY = "openai_api_key"

export const ApiKeySettings = () => {
  const theme = useTheme()
  const { apiKey, setApiKey, isApiKeySaved, isLoading, isSaving, saveApiKey, clearApiKey } =
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
              To analyze content for potential fraud, you need to provide your OpenAI API key. The
              key is stored securely in your browser and is only used to communicate with OpenAI's
              API.
            </Typography>
          )}

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
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
        How to get an OpenAI API key:
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
            platform.openai.com/account/api-keys
            <LinkIcon sx={{ fontSize: "0.9rem" }} />
          </Link>
        </Typography>
        <Typography component="li" variant="body2" sx={{ mb: 0.5, fontSize: "0.85rem" }}>
          Sign in or create an account
        </Typography>
        <Typography component="li" variant="body2" sx={{ mb: 0.5, fontSize: "0.85rem" }}>
          Click on "Create new secret key"
        </Typography>
        <Typography component="li" variant="body2" sx={{ fontSize: "0.85rem" }}>
          Copy the key and paste it here
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
          Using OpenAI's API incurs charges based on your usage.
        </Typography>
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
          Check their{" "}
          <Link
            href="https://openai.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            style={{ textDecoration: "underline" }}
          >
            pricing page
          </Link>{" "}
          for details.
        </Typography>
      </Alert>
    </Paper>
  )
}
