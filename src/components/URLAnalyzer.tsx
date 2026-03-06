import LinkIcon from "@mui/icons-material/Link"
import PageviewIcon from "@mui/icons-material/Pageview"
import SearchIcon from "@mui/icons-material/Search"
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
import { scrapeCurrentPage } from "../lib/pageScraper"
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
  const [url, setUrl] = useState<string>("")
  const [isChecking, setIsChecking] = useState(false)
  const [isLoadingCurrentPage, setIsLoadingCurrentPage] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<URLCheckResult | null>(null)
  const { apiKey, hasApiKey, selectedModel, connectionMode, deviceId } = useApiKey()
  const { toast } = useCustomSnackbar()

  const theme = useTheme()

  const analyzeUrl = async (urlToCheck?: string) => {
    if (connectionMode !== "proxy" && (!hasApiKey || !apiKey)) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return
    }
    if (!urlToCheck) {
      toast.error("No URL to analyze")
      return
    }

    if (!urlToCheck.startsWith("http://") && !urlToCheck.startsWith("https://")) {
      toast.warning(
        "URL does not start with http:// or https:// — analysis will proceed but results may vary"
      )
    }

    setIsChecking(true)
    try {
      const urlData: URLData = {
        url: urlToCheck,
        timestamp: new Date().toISOString(),
      }

      const [apiResult, error] = await safeCheckContentWithOpenAI(
        urlData,
        apiKey ?? "",
        selectedModel,
        connectionMode,
        deviceId
      )

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
        url: urlToCheck,
        flags: apiResult.flags,
        confidence: apiResult.confidence,
        tokenUsage: apiResult.tokenUsage,
      }

      setResult(checkResult)

      if (onAnalysisComplete) {
        onAnalysisComplete("url", { content: urlToCheck }, checkResult)
      }
    } catch (error) {
      console.error("Error checking URL:", error)
      toast.error("An error occurred while analyzing the URL. Please try again later.")
    } finally {
      setIsChecking(false)
    }
  }

  const checkUrl = async () => {
    const trimmedURL = url.trim()

    if (!trimmedURL) {
      toast.error("Please enter a URL to analyze")
      return
    }

    await analyzeUrl(trimmedURL)
  }

  const checkCurrentPage = async () => {
    setIsLoadingCurrentPage(true)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url) {
        setUrl(tab.url)
        // Small delay to let state update, then analyze
        setTimeout(() => {
          analyzeUrl(tab.url)
        }, 50)
      } else {
        toast.error("Could not get the current page URL")
      }
    } catch {
      toast.error("Could not access the current page")
    } finally {
      setIsLoadingCurrentPage(false)
    }
  }

  const scanCurrentPage = async () => {
    if (connectionMode !== "proxy" && (!hasApiKey || !apiKey)) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return
    }
    setIsScanning(true)
    try {
      const pageData = await scrapeCurrentPage()
      setUrl(pageData.url)

      const [apiResult, error] = await safeCheckContentWithOpenAI(
        pageData,
        apiKey ?? "",
        selectedModel,
        connectionMode,
        deviceId
      )

      if (error) {
        if (error.status === 401) {
          toast.error("Invalid API key. Please check your OpenAI API key.")
        } else {
          toast.error(error.message ?? "Failed to scan page. Please try again later.")
        }
        return
      }

      if (!apiResult) {
        toast.error("Failed to scan page. Please try again later.")
        return
      }

      const checkResult: URLCheckResult = {
        threatRating: apiResult.threatRating,
        explanation: apiResult.explanation,
        url: pageData.url,
        flags: apiResult.flags,
        confidence: apiResult.confidence,
        tokenUsage: apiResult.tokenUsage,
      }

      setResult(checkResult)

      if (onAnalysisComplete) {
        onAnalysisComplete("url", { content: pageData.url }, checkResult)
      }
    } catch (err) {
      console.error("Error scanning page:", err)
      const msg = err instanceof Error ? err.message : "Could not scan the current page"
      toast.error(msg)
    } finally {
      setIsScanning(false)
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
            {connectionMode !== "proxy" && !hasApiKey && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 1 }}>
                An OpenAI API key is required. Please add your API key in the settings.
              </Alert>
            )}

            <Typography
              variant="body2"
              sx={{ fontSize: "0.9rem", color: theme.palette.text.secondary, mb: 1.5 }}
            >
              Paste a web address below, or scan the page you're currently viewing:
            </Typography>

            <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                color="primary"
                onClick={checkCurrentPage}
                disabled={isLoadingCurrentPage || isChecking || isScanning}
                startIcon={isLoadingCurrentPage ? <CircularProgress size={14} /> : <PageviewIcon />}
                sx={{ flex: 1, whiteSpace: "nowrap", textTransform: "none", borderRadius: 2 }}
              >
                {isLoadingCurrentPage ? "Loading..." : "Check URL"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                onClick={scanCurrentPage}
                disabled={isScanning || isChecking || isLoadingCurrentPage}
                startIcon={isScanning ? <CircularProgress size={14} /> : <SearchIcon />}
                sx={{ flex: 1, whiteSpace: "nowrap", textTransform: "none", borderRadius: 2 }}
              >
                {isScanning ? "Scanning..." : "Scan Page Content"}
              </Button>
            </Box>

            <TextField
              fullWidth
              label="URL to analyze"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !isChecking &&
                  url.trim() &&
                  (connectionMode === "proxy" || hasApiKey)
                ) {
                  checkUrl()
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
                onClick={checkUrl}
                disabled={isChecking || !url.trim() || (connectionMode !== "proxy" && !hasApiKey)}
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
                Check Another
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}
