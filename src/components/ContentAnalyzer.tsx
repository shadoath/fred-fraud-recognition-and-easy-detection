import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import SearchIcon from "@mui/icons-material/Search"
import WarningIcon from "@mui/icons-material/Warning"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
  useTheme,
  Zoom,
} from "@mui/material"
import { useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { useApiKey } from "../hooks/useApiKey"
import { toastApiError } from "../lib/apiErrorUtils"
import { safeCheckContentWithOpenAI, type TextData, type URLData } from "../lib/fraudService"
import { findHistoryMatch } from "../lib/historyStorage"
import { scrapeCurrentPage } from "../lib/pageScraper"
import type { PageData } from "../types/fraudTypes"
import { AnalysisResultPanel } from "./AnalysisResultPanel"
import { ScanningIndicator } from "./ScanningIndicator"

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
    input: { content: string; title?: string },
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
  const { apiKey, hasApiKey, selectedModel, connectionMode, deviceId, licenseKey } = useApiKey()
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

  const finishWithResult = (
    apiResult: {
      threatRating: number
      explanation: string
      flags?: string[]
      confidence?: number
      tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number }
    },
    type: "text" | "url",
    inputContent: string,
    title?: string
  ) => {
    const checkResult: ContentCheckResult = {
      threatRating: apiResult.threatRating,
      explanation: apiResult.explanation,
      flags: apiResult.flags,
      confidence: apiResult.confidence,
      tokenUsage: apiResult.tokenUsage,
    }
    setResult(checkResult)
    onAnalysisComplete?.(type, { content: inputContent, title }, checkResult)
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
        const cached = await findHistoryMatch("text", { content: trimmedContent })
        if (cached) {
          finishWithResult(cached.result, "text", trimmedContent)
          toast.info("Loaded from history")
          return
        }
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
          deviceId,
          licenseKey ?? undefined
        )
        if (error) {
          toastApiError(toast.error, error)
          return
        }
        if (!apiResult) {
          toast.error("Failed to analyze text. Please try again later.")
          return
        }
        finishWithResult(apiResult, "text", trimmedContent)
      } else {
        const cached = await findHistoryMatch("url", { content: trimmedSubjectOrUrl })
        if (cached) {
          finishWithResult(cached.result, "url", trimmedSubjectOrUrl)
          toast.info("Loaded from history")
          return
        }
        if (
          !trimmedSubjectOrUrl.startsWith("http://") &&
          !trimmedSubjectOrUrl.startsWith("https://")
        ) {
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
          deviceId,
          licenseKey ?? undefined
        )
        if (error) {
          toastApiError(toast.error, error)
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
      const cached = await findHistoryMatch("url", { content: pageData.url })
      if (cached) {
        finishWithResult(cached.result, "url", pageData.url, pageData.title)
        toast.info("Loaded from history")
        return
      }
      const [apiResult, error] = await safeCheckContentWithOpenAI(
        pageData,
        apiKey ?? "",
        selectedModel,
        connectionMode,
        deviceId,
        licenseKey ?? undefined
      )
      if (error) {
        toastApiError(toast.error, error)
        return
      }
      if (!apiResult) {
        toast.error("Failed to scan page. Please try again later.")
        return
      }
      finishWithResult(apiResult, "url", pageData.url, pageData.title)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not scan the current page")
    } finally {
      setIsScanning(false)
    }
  }

  const fieldSx = {
    mb: 1.5,
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
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {busy ? (
          <ScanningIndicator />
        ) : result ? (
          <AnalysisResultPanel
            result={result}
            onReset={handleReset}
            resetLabel="Check Another"
            footerContent={
              scannedPageData ? (
                <Accordion
                  elevation={0}
                  sx={{
                    mt: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "8px !important",
                    "&:before": { display: "none" },
                    backgroundColor:
                      theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
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
                        m: 2,
                        p: 0,
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
              ) : undefined
            }
          />
        ) : (
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
              sx={fieldSx}
              variant="outlined"
            />

            <TextField
              fullWidth
              label="Paste content to analyze"
              placeholder="Paste the text you want to check for fraud indicators..."
              multiline
              rows={6}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              sx={fieldSx}
              variant="outlined"
            />

            {textContent.trim().length > 0 && (
              <Zoom in timeout={500}>
                <Alert
                  severity="info"
                  variant="standard"
                  sx={{
                    mb: 1.5,
                    borderRadius: 2,
                    fontSize: "0.75rem",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(41, 182, 246, 0.15)"
                        : "rgba(41, 182, 246, 0.1)",
                  }}
                >
                  Characters: {textContent.length} | Words: {textContent.trim().split(/\s+/).length}
                </Alert>
              </Zoom>
            )}

            {textContent.trim() || subjectOrUrl.trim() ? (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={busy || requiresKey}
                startIcon={
                  isChecking ? <CircularProgress size={18} color="inherit" /> : <WarningIcon />
                }
                sx={{ borderRadius: 2, textTransform: "none", py: 1.25 }}
              >
                {isChecking ? "Analyzing..." : "Check For Fraud"}
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleScanPageContent}
                disabled={busy || requiresKey}
                startIcon={
                  isScanning ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />
                }
                sx={{ borderRadius: 2, textTransform: "none", py: 1.25 }}
              >
                {isScanning ? "Scanning..." : "Scan Current Page"}
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
