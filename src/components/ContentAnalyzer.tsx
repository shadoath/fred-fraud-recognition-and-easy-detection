import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import LinkIcon from "@mui/icons-material/Link"
import SearchIcon from "@mui/icons-material/Search"
import WarningIcon from "@mui/icons-material/Warning"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
  useTheme,
  Zoom,
} from "@mui/material"
import { useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { useApiKey } from "../hooks/useApiKey"
import { safeCheckContentWithOpenAI, type TextData, type URLData } from "../lib/fraudService"
import { scrapeCurrentPage } from "../lib/pageScraper"
import type { PageData } from "../types/fraudTypes"
import { getThreatColor, ThreatRating } from "./ThreatRating"

export interface ContentCheckResult {
  threatRating: number
  explanation: string
  flags?: string[]
  confidence?: number
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

interface ContentAnalyzerProps {
  onAnalysisComplete?: (
    type: "text" | "url",
    input: { content: string },
    result: ContentCheckResult
  ) => void
}

export const ContentAnalyzer = ({ onAnalysisComplete }: ContentAnalyzerProps) => {
  const [subjectOrUrl, setSubjectOrUrl] = useState("")
  const [textContent, setTextContent] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<ContentCheckResult | null>(null)
  const [scannedPageData, setScannedPageData] = useState<PageData | null>(null)
  const { apiKey, hasApiKey, selectedModel, connectionMode, deviceId } = useApiKey()
  const { toast } = useCustomSnackbar()
  const theme = useTheme()

  const requiresKey = connectionMode !== "proxy" && (!hasApiKey || !apiKey)
  const busy = isChecking || isScanning

  const handleReset = () => {
    setResult(null)
    setScannedPageData(null)
    setSubjectOrUrl("")
    setTextContent("")
  }

  const finishWithResult = (apiResult: { threatRating: number; explanation: string; flags?: string[]; confidence?: number; tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number } }, type: "text" | "url", inputContent: string) => {
    const checkResult: ContentCheckResult = {
      threatRating: apiResult.threatRating,
      explanation: apiResult.explanation,
      flags: apiResult.flags,
      confidence: apiResult.confidence,
      tokenUsage: apiResult.tokenUsage,
    }
    setResult(checkResult)
    onAnalysisComplete?.(type, { content: inputContent }, checkResult)
  }

  const handleSubmit = async () => {
    const trimmedContent = textContent.trim()
    const trimmedSubjectOrUrl = subjectOrUrl.trim()

    if (!trimmedContent && !trimmedSubjectOrUrl) {
      toast.error("Please enter a URL or some text to analyze")
      return
    }
    if (requiresKey) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return
    }

    setIsChecking(true)
    try {
      if (trimmedContent) {
        // Content present → TextData (with optional url context)
        const textData: TextData = {
          content: trimmedContent,
          source: "pasted",
          ...(trimmedSubjectOrUrl ? { url: trimmedSubjectOrUrl } : {}),
          timestamp: new Date().toISOString(),
        }
        const [apiResult, error] = await safeCheckContentWithOpenAI(
          textData,
          apiKey ?? "",
          selectedModel,
          connectionMode,
          deviceId
        )
        if (error) {
          toast.error(
            error.status === 401
              ? "Invalid API key. Please check your OpenAI API key."
              : (error.message ?? "Failed to analyze text. Please try again later.")
          )
          return
        }
        if (!apiResult) {
          toast.error("Failed to analyze text. Please try again later.")
          return
        }
        finishWithResult(apiResult, "text", trimmedContent)
      } else {
        // Only subjectOrUrl filled → URLData
        if (!trimmedSubjectOrUrl.startsWith("http://") && !trimmedSubjectOrUrl.startsWith("https://")) {
          toast.warning(
            "URL does not start with http:// or https:// — analysis will proceed but results may vary"
          )
        }
        const urlData: URLData = { url: trimmedSubjectOrUrl, timestamp: new Date().toISOString() }
        const [apiResult, error] = await safeCheckContentWithOpenAI(
          urlData,
          apiKey ?? "",
          selectedModel,
          connectionMode,
          deviceId
        )
        if (error) {
          toast.error(
            error.status === 401
              ? "Invalid API key. Please check your OpenAI API key."
              : (error.message ?? "Failed to analyze URL. Please try again later.")
          )
          return
        }
        if (!apiResult) {
          toast.error("Failed to analyze URL. Please try again later.")
          return
        }
        finishWithResult(apiResult, "url", trimmedSubjectOrUrl)
      }
    } catch {
      toast.error("An error occurred during analysis. Please try again later.")
    } finally {
      setIsChecking(false)
    }
  }

  const handleUseCurrentUrl = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url) {
        setSubjectOrUrl(tab.url)
      } else {
        toast.error("Could not get the current tab URL")
      }
    } catch {
      toast.error("Could not get the current tab URL")
    }
  }

  const handleScanPageContent = async () => {
    if (requiresKey) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return
    }
    setIsScanning(true)
    try {
      const pageData = await scrapeCurrentPage()
      setScannedPageData(pageData)
      setSubjectOrUrl(pageData.url)
      setTextContent(pageData.visibleText)
      const [apiResult, error] = await safeCheckContentWithOpenAI(
        pageData,
        apiKey ?? "",
        selectedModel,
        connectionMode,
        deviceId
      )
      if (error) {
        toast.error(
          error.status === 401
            ? "Invalid API key. Please check your OpenAI API key."
            : (error.message ?? "Failed to scan page. Please try again later.")
        )
        return
      }
      if (!apiResult) {
        toast.error("Failed to scan page. Please try again later.")
        return
      }
      finishWithResult(apiResult, "url", pageData.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not scan the current page")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
              sx={{ mb: 2, fontSize: "0.9rem", color: theme.palette.text.secondary }}
            >
              Paste text or a URL below to check for potential fraud or scams using AI analysis.
            </Typography>

            <TextField
              fullWidth
              label="Subject or URL (optional)"
              placeholder="https://example.com or email subject line..."
              value={subjectOrUrl}
              onChange={(e) => setSubjectOrUrl(e.target.value)}
              sx={{
                mb: 1.5,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.01)",
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

            <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                onClick={handleScanPageContent}
                disabled={busy}
                startIcon={isScanning ? <CircularProgress size={14} /> : <SearchIcon />}
                sx={{ whiteSpace: "nowrap", textTransform: "none", borderRadius: 2 }}
              >
                {isScanning ? "Scanning..." : "Scan Page Content"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                onClick={handleUseCurrentUrl}
                disabled={busy}
                startIcon={<LinkIcon />}
                sx={{ whiteSpace: "nowrap", textTransform: "none", borderRadius: 2 }}
              >
                Use Current URL
              </Button>
            </Box>

            <TextField
              fullWidth
              label="Paste content to analyze"
              placeholder="Paste the text you want to check for fraud indicators..."
              multiline
              rows={6}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.01)",
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

            {textContent.trim().length > 0 && (
              <Zoom in timeout={500}>
                <Alert
                  severity="info"
                  variant="standard"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    fontSize: "0.75rem",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(41, 182, 246, 0.15)"
                        : "rgba(41, 182, 246, 0.1)",
                  }}
                >
                  Characters: {textContent.length} | Words:{" "}
                  {textContent.trim().split(/\s+/).length}
                </Alert>
              </Zoom>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={busy || (!textContent.trim() && !subjectOrUrl.trim()) || requiresKey}
                startIcon={
                  isChecking ? <CircularProgress size={18} color="inherit" /> : <WarningIcon />
                }
                sx={{ ml: "auto", borderRadius: 2, px: 2, textTransform: "none", boxShadow: 2 }}
                size="medium"
              >
                {isChecking ? "Analyzing..." : "Check For Fraud"}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ width: "100%" }}>
            <ThreatRating rating={result.threatRating} />

            {subjectOrUrl && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1,
                  color: theme.palette.text.secondary,
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                }}
              >
                {subjectOrUrl}
              </Typography>
            )}

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
                variant="subtitle2"
                sx={{ fontWeight: 600, color: theme.palette.primary.main, mb: 1 }}
              >
                AI Analysis:
              </Typography>
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
                  sx={{ mb: 1.5, fontWeight: 600, color: getThreatColor(result.threatRating) }}
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
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            )}

            {scannedPageData && (
              <Accordion
                elevation={0}
                sx={{
                  mt: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: "8px !important",
                  "&:before": { display: "none" },
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.02)",
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    View scanned content sent to AI
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 1.5,
                      overflow: "auto",
                      fontSize: "0.7rem",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      color: theme.palette.text.secondary,
                      maxHeight: 300,
                    }}
                  >
                    {JSON.stringify(scannedPageData, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleReset}
                sx={{ ml: "auto", borderRadius: 2, textTransform: "none", boxShadow: 2 }}
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
