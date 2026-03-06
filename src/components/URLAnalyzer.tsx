import LinkIcon from "@mui/icons-material/Link"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { useApiKey } from "../hooks/useApiKey"
import { safeCheckContentWithOpenAI, type URLData } from "../lib/fraudService"
import { getThreatColor, ThreatRating } from "./ThreatRating"

export interface URLCheckResult {
  threatRating: number
  explanation: string
  url: string
  flags?: string[]
  confidence?: number
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface URLAnalyzerProps {
  onAnalysisComplete?: (type: "url", input: { content: string }, result: URLCheckResult) => void
}

export const URLAnalyzer = ({ onAnalysisComplete }: URLAnalyzerProps) => {
  const [urlInput, setUrlInput] = useState<string>("")
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<URLCheckResult | null>(null)
  const { apiKey, hasApiKey, selectedModel } = useApiKey()
  const { toast } = useCustomSnackbar()
  const theme = useTheme()

  const checkURLForFraud = async () => {
    const trimmedURL = urlInput.trim()

    if (!trimmedURL) {
      toast.error("Please enter a URL to analyze")
      return
    }

    if (!hasApiKey || !apiKey) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return
    }

    if (!trimmedURL.startsWith("http://") && !trimmedURL.startsWith("https://")) {
      toast.warning("URL does not start with http:// or https:// — analysis will proceed but results may vary")
    }

    setIsChecking(true)
    try {
      const urlData: URLData = {
        url: trimmedURL,
        timestamp: new Date().toISOString(),
      }

      const [apiResult, error] = await safeCheckContentWithOpenAI(urlData, apiKey, selectedModel)

      if (error) {
        if (error.status === 401) {
          toast.error("Invalid API key. Please check your OpenAI API key.")
        } else {
          toast.error(error.message ?? "Failed to analyze URL. Please try again later.")
        }
        return
      }

      if (!apiResult) {
        toast.error("Failed to analyze URL. Please try again later.")
        return
      }

      const checkResult: URLCheckResult = {
        threatRating: apiResult.threatRating,
        explanation: apiResult.explanation,
        url: trimmedURL,
        flags: apiResult.flags,
        confidence: apiResult.confidence,
        tokenUsage: apiResult.tokenUsage,
      }

      setResult(checkResult)

      if (onAnalysisComplete) {
        onAnalysisComplete("url", { content: trimmedURL }, checkResult)
      }
    } catch (error) {
      console.error("Error checking URL:", error)
      toast.error("An error occurred while analyzing the URL. Please try again later.")
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {!result ? (
          <Box>
            {!hasApiKey && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 1 }}>
                An OpenAI API key is required. Please add your API key in the settings.
              </Alert>
            )}

            <Typography
              variant="body2"
              sx={{
                mb: 2,
                fontSize: "0.9rem",
                color: theme.palette.text.secondary,
              }}
            >
              Enter a URL below to check for typosquatting, phishing patterns, suspicious domains, and other malicious indicators.
            </Typography>

            <TextField
              fullWidth
              label="URL to analyze"
              placeholder="https://example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isChecking && urlInput.trim() && hasApiKey) {
                  checkURLForFraud()
                }
              }}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor:
                    theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.01)",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: `${theme.palette.primary.main}80`,
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderWidth: "1px",
                  },
                },
              }}
              variant="outlined"
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={checkURLForFraud}
                disabled={isChecking || !urlInput.trim() || !hasApiKey}
                startIcon={
                  isChecking ? <CircularProgress size={18} color="inherit" /> : <LinkIcon />
                }
                sx={{
                  ml: "auto",
                  borderRadius: 2,
                  px: 2,
                  textTransform: "none",
                  boxShadow: 2,
                }}
                size="medium"
              >
                {isChecking ? "Analyzing..." : "Check URL"}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ width: "100%" }}>
            <ThreatRating rating={result.threatRating} />

            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor:
                  theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mb: 1,
                  color: theme.palette.text.secondary,
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                }}
              >
                {result.url}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                  }}
                >
                  AI Analysis:
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.5, fontSize: "0.9rem" }}>
                {result.explanation}
              </Typography>
            </Paper>

            {result.flags && result.flags.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? `${getThreatColor(result.threatRating)}10`
                      : `${getThreatColor(result.threatRating)}08`,
                  border: `1px solid ${getThreatColor(result.threatRating)}30`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1.5,
                    fontWeight: 600,
                    color: getThreatColor(result.threatRating),
                  }}
                >
                  Detected Indicators:
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                  {result.flags.map((flag) => (
                    <Chip
                      key={flag}
                      label={flag}
                      size="small"
                      sx={{
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? `${getThreatColor(result.threatRating)}20`
                            : `${getThreatColor(result.threatRating)}15`,
                        color: getThreatColor(result.threatRating),
                        borderRadius: 1,
                        fontSize: "0.75rem",
                        "& .MuiChip-label": {
                          px: 1,
                        },
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setResult(null)}
                sx={{
                  ml: "auto",
                  borderRadius: 2,
                  textTransform: "none",
                  boxShadow: 2,
                }}
                size="medium"
              >
                Check Another URL
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}
