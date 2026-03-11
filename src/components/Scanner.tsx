import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import SearchIcon from "@mui/icons-material/Search"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material"
import { useEffect, useRef, useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { useApiKey } from "../hooks/useApiKey"
import { toastApiError } from "../lib/apiErrorUtils"
import { getAutoScanSettings } from "../lib/autoScanStorage"
import { type EmailData, safeCheckContentWithOpenAI } from "../lib/fraudService"
import { findHistoryMatch } from "../lib/historyStorage"
import { scrapeCurrentPage } from "../lib/pageScraper"
import type { PageData } from "../types/fraudTypes"
import { AnalysisResultPanel } from "./AnalysisResultPanel"
import { ScanningIndicator } from "./ScanningIndicator"

export interface ScanResult {
  threatRating: number
  explanation: string
  flags?: string[]
  confidence?: number
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

interface ScannerProps {
  onAnalysisComplete?: (
    type: "email" | "url",
    input: { sender?: string; subject?: string; title?: string; content: string },
    result: ScanResult
  ) => void
}

type ScanMode = "email" | "page" | null

const isGmailEmailUrl = (url: string): boolean => {
  try {
    return url.includes("mail.google.com") && /^#\w+\/[\w-]{10,}/.test(new URL(url).hash)
  } catch {
    return false
  }
}

export const Scanner = ({ onAnalysisComplete }: ScannerProps) => {
  const [scanMode, setScanMode] = useState<ScanMode>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scannedPageData, setScannedPageData] = useState<PageData | null>(null)
  const autoScanFiredRef = useRef(false)

  const { apiKey, hasApiKey, isLoading: keyLoading, selectedModel, connectionMode, deviceId, licenseKey, isPaidUser } = useApiKey()
  const { toast } = useCustomSnackbar()

  const requiresKey = connectionMode !== "proxy" && (!hasApiKey || !apiKey)

  // Detect current tab once on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.url) { setScanMode(null); return }
      setScanMode(isGmailEmailUrl(tab.url) ? "email" : tab.url.startsWith("http") ? "page" : null)
    })
  }, [])

  // Auto-scan when popup opens, once key is ready
  useEffect(() => {
    if (keyLoading || autoScanFiredRef.current || scanMode === null) return
    if (scanMode === "email") {
      autoScanFiredRef.current = true
      void runEmailScan()
    } else if (scanMode === "page") {
      const isEligible = connectionMode !== "proxy" || isPaidUser
      if (!isEligible) return
      getAutoScanSettings().then((settings) => {
        if (settings.autoScanPages && !autoScanFiredRef.current) {
          autoScanFiredRef.current = true
          void runPageScan()
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanMode, keyLoading])

  const finishWithResult = (
    apiResult: ScanResult,
    type: "email" | "url",
    input: { sender?: string; subject?: string; title?: string; content: string },
    fromCache = false
  ) => {
    setResult(apiResult)
    if (!fromCache) onAnalysisComplete?.(type, input, apiResult)
  }

  const runEmailScan = async () => {
    if (requiresKey) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return
    }
    setIsLoading(true)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error("No active tab found")
      if (!tab.url?.includes("mail.google.com")) throw new Error("Open an email in Gmail to scan it.")

      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => true })

      const [injectionResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const sender =
            document.querySelector("[data-message-id] [email]")?.getAttribute("email") ||
            document.querySelector(".gE [email]")?.getAttribute("email") ||
            document.querySelector(".gD [email]")?.getAttribute("email") ||
            document.querySelector("[data-hovercard-id]")?.getAttribute("data-hovercard-id") ||
            document.querySelector(".go")?.textContent?.trim() ||
            null
          const subject =
            document.querySelector(".ha h2")?.textContent ||
            document.querySelector("[data-message-id] .hP")?.textContent ||
            null
          const content =
            document.querySelector("[data-message-id] .a3s.aiL")?.textContent?.replace(/\n+/g, " ").trim() ||
            document.querySelector(".a3s")?.textContent?.replace(/\n+/g, " ").trim() ||
            null
          if (sender && content) return { success: true, sender, subject: subject ?? "No Subject", content }
          return { success: false, message: "Could not find email content. Make sure an email is open." }
        },
      })

      const extracted = injectionResult.result
      if (!extracted?.success) throw new Error(extracted?.message ?? "Failed to extract email")

      const { sender, subject, content } = extracted as { success: true; sender: string; subject: string; content: string }

      const cached = await findHistoryMatch("email", { sender, content })
      if (cached) {
        finishWithResult(cached.result, "email", { sender, subject, content }, true)
        toast.info("Loaded from history")
        return
      }

      const emailData: EmailData = { sender, subject, content, timestamp: new Date().toISOString() }
      const [apiResult, error] = await safeCheckContentWithOpenAI(
        emailData, apiKey ?? "", selectedModel, connectionMode, deviceId, licenseKey ?? undefined
      )
      if (error) { toastApiError(toast.error, error); return }
      if (!apiResult) { toast.error("Failed to analyze email. Please try again."); return }

      finishWithResult(apiResult, "email", { sender, subject, content })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not scan email"
      if (msg.includes("Cannot access") || msg.includes("chrome://")) {
        toast.error("Click the Gmail page once before scanning.")
      } else {
        toast.error(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const runPageScan = async () => {
    if (requiresKey) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return
    }
    setIsLoading(true)
    try {
      const pageData = await scrapeCurrentPage()
      setScannedPageData(pageData)

      const cached = await findHistoryMatch("url", { content: pageData.url })
      if (cached) {
        finishWithResult(cached.result, "url", { content: pageData.url, title: pageData.title }, true)
        toast.info("Loaded from history")
        return
      }

      const [apiResult, error] = await safeCheckContentWithOpenAI(
        pageData, apiKey ?? "", selectedModel, connectionMode, deviceId, licenseKey ?? undefined
      )
      if (error) { toastApiError(toast.error, error); return }
      if (!apiResult) { toast.error("Failed to scan page. Please try again."); return }

      finishWithResult(apiResult, "url", { content: pageData.url, title: pageData.title })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not scan the current page")
    } finally {
      setIsLoading(false)
    }
  }

  const handleScan = () => {
    if (scanMode === "email") void runEmailScan()
    else void runPageScan()
  }

  const footerContent = scannedPageData ? (
    <Accordion
      elevation={0}
      sx={{
        mt: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px !important",
        "&:before": { display: "none" },
        backgroundColor: "rgba(0,0,0,0.02)",
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="caption" color="text.secondary">
          View scanned content sent to AI
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <Box
          component="pre"
          sx={{
            m: 2, p: 0, overflow: "auto",
            fontSize: "0.7rem", fontFamily: "monospace",
            whiteSpace: "pre-wrap", wordBreak: "break-all",
            color: "text.secondary", maxHeight: 300,
          }}
        >
          {JSON.stringify(scannedPageData, null, 2)}
        </Box>
      </AccordionDetails>
    </Accordion>
  ) : undefined

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {isLoading ? (
          <ScanningIndicator />
        ) : result ? (
          <AnalysisResultPanel
            result={result}
            footerContent={footerContent}
          />
        ) : (
          <Box
            sx={{
              height: "100%",
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              px: 3,
            }}
          >
            {requiresKey && (
              <Alert severity="warning" sx={{ width: "100%", borderRadius: 2 }}>
                An OpenAI API key is required. Add one in Settings.
              </Alert>
            )}

            {scanMode === null && !keyLoading && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Navigate to a web page or open an email in Gmail, then click Scan.
              </Typography>
            )}

            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleScan}
              disabled={isLoading || requiresKey || scanMode === null}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              sx={{ borderRadius: 2, textTransform: "none", py: 1.5, px: 4, fontSize: "1rem" }}
            >
              {isLoading
                ? "Scanning…"
                : scanMode === "email"
                  ? "Scan This Email"
                  : "Scan This Page"}
            </Button>

            <Typography variant="caption" color="text.secondary" textAlign="center">
              {scanMode === "email"
                ? "Analyzes the email currently open in Gmail"
                : "Analyzes the page currently open in your browser"}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
