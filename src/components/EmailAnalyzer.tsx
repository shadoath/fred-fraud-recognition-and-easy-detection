import ContentPasteIcon from "@mui/icons-material/ContentPaste"
import WarningIcon from "@mui/icons-material/Warning"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Tooltip,
} from "@mui/material"
import { forwardRef, useImperativeHandle, useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { useApiKey } from "../hooks/useApiKey"
import { toastApiError } from "../lib/apiErrorUtils"
import { type EmailData, safeCheckContentWithOpenAI } from "../lib/fraudService"
import { findHistoryMatch } from "../lib/historyStorage"
import { AnalysisResultPanel } from "./AnalysisResultPanel"
import { ScanningIndicator } from "./ScanningIndicator"

export interface EmailCheckResult {
  threatRating: number
  explanation: string
  sender: string
  subject: string
  flags?: string[]
  confidence?: number
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

interface EmailAnalyzerProps {
  onAnalysisComplete?: (
    type: "email",
    input: { sender?: string; subject?: string; content: string },
    result: EmailCheckResult
  ) => void
}

export interface EmailAnalyzerRef {
  extractEmail: () => void
}

const DEFAULT_SUBJECT = "No Subject"

export const EmailAnalyzer = forwardRef<EmailAnalyzerRef, EmailAnalyzerProps>(
  ({ onAnalysisComplete }, ref) => {
    const [isChecking, setIsChecking] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [result, setResult] = useState<EmailCheckResult | null>(null)
    const [emailFormData, setEmailFormData] = useState({ sender: "", subject: "", content: "" })

    const { apiKey, hasApiKey, selectedModel, connectionMode, deviceId, licenseKey } = useApiKey()
    const { toast } = useCustomSnackbar()

    useImperativeHandle(ref, () => ({ extractEmail: extractCurrentEmail }))

    const handleFieldChange =
      (field: keyof typeof emailFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEmailFormData({ ...emailFormData, [field]: e.target.value })
      }

    const resetForm = () => setEmailFormData({ sender: "", subject: "", content: "" })

    const validateApiKey = (): boolean => {
      if (connectionMode !== "proxy" && !hasApiKey) {
        toast.error("API key required. Please add an OpenAI API key in the settings.")
        return false
      }
      return true
    }

    const extractCurrentEmail = async () => {
      if (!validateApiKey()) return

      setIsExtracting(true)
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tabs[0]?.id) throw new Error("No active tab found")

        const url = tabs[0].url || ""
        if (!url.includes("mail.google.com")) {
          throw new Error("Email extraction is only supported for Gmail. Please manually enter the email details above.")
        }

        // Verify script access
        await chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, func: () => true })

        const [injectionResult] = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            try {
              const email1 = document.querySelector("[data-message-id] [email]")?.getAttribute("email")
              const email2 = document.querySelector(".gE [email]")?.getAttribute("email")
              const email3 = document.querySelector(".gD [email]")?.getAttribute("email")
              const email4 = document.querySelector("[data-hovercard-id]")?.getAttribute("data-hovercard-id")
              const email5 = document.querySelector(".go")?.textContent?.trim()
              const sender = email1 || email2 || email3 || email4 || email5
              console.info({ email1, email2, email3, email4, email5, sender })
              const subject =
                document.querySelector(".ha h2")?.textContent ||
                document.querySelector("[data-message-id] .hP")?.textContent
              const content =
                document.querySelector("[data-message-id] .a3s.aiL")?.textContent?.replace(/\n+/g, " ").trim() ||
                document.querySelector(".a3s")?.textContent?.replace(/\n+/g, " ").trim()

              if (sender && content) {
                return { success: true, sender, subject: subject || "No Subject", content, timestamp: new Date().toISOString() }
              }
              return { success: false, message: "Could not extract email data. Make sure you have an email open." }
            } catch (error) {
              return { success: false, message: "Error extracting email: " + (error instanceof Error ? error.message : String(error)) }
            }
          },
        })

        const extractResult = injectionResult.result ?? null
        if (!extractResult?.success) throw new Error(extractResult?.message || "Failed to extract email content")

        const emailData = {
          sender: extractResult.sender || "",
          subject: extractResult.subject || "",
          content: extractResult.content || "",
        }
        setEmailFormData(emailData)
        toast.success("Email extracted from Gmail")

        if (emailData.sender && emailData.content) {
          await analyzeEmail(emailData)
        }
      } catch (error) {
        console.error("Gmail extraction error:", error)
        if (error instanceof Error) {
          const msg = error.message || ""
          if (msg.includes("Please open Gmail")) {
            toast.error("Please open Gmail to extract email content. This extension currently only supports Gmail.")
          } else if (msg.includes("Permission")) {
            toast.error("Permission required. Please make sure you've allowed this extension to access Gmail.")
          } else if (msg.includes("Could not establish connection") || msg.includes("Receiving end does not exist")) {
            toast.error("Connection to Gmail failed. Try refreshing the Gmail page and try again.")
            console.error("ContentScript connection error:", error)
          } else if (msg.includes("Cannot access a chrome")) {
            toast.error("Access to Gmail denied. Please click on the Gmail page once before extracting.")
          } else {
            toast.error(msg || "Failed to extract email from Gmail")
            console.error("Extraction error:", error)
          }
        } else {
          toast.error("Failed to extract email from Gmail. Please make sure you have an email open.")
          console.error("Unknown error:", error)
        }
      } finally {
        setIsExtracting(false)
      }
    }

    const analyzeEmail = async (emailData: { sender: string; subject: string; content: string }) => {
      if (!validateApiKey()) return

      setIsChecking(true)
      try {
        const emailDataForAnalysis: EmailData = {
          sender: emailData.sender.trim(),
          subject: emailData.subject.trim() || DEFAULT_SUBJECT,
          content: emailData.content.trim(),
          timestamp: new Date().toISOString(),
        }

        const cached = await findHistoryMatch("email", {
          sender: emailDataForAnalysis.sender,
          content: emailDataForAnalysis.content,
        })
        if (cached) {
          setResult({
            ...cached.result,
            sender: emailDataForAnalysis.sender,
            subject: emailDataForAnalysis.subject ?? DEFAULT_SUBJECT,
          })
          toast.info("Loaded from history")
          resetForm()
          return
        }

        const [fraudResult, error] = await safeCheckContentWithOpenAI(
          emailDataForAnalysis, apiKey || "", selectedModel, connectionMode, deviceId, licenseKey ?? undefined
        )

        if (error) { toastApiError(toast.error, error); return }
        if (!fraudResult) { toast.error("Failed to analyze email. Please try again later."); return }

        const checkResult: EmailCheckResult = {
          threatRating: fraudResult.threatRating,
          explanation: fraudResult.explanation,
          sender: emailDataForAnalysis.sender,
          subject: emailDataForAnalysis.subject ?? DEFAULT_SUBJECT,
          flags: fraudResult.flags,
          confidence: fraudResult.confidence,
          tokenUsage: fraudResult.tokenUsage,
        }

        setResult(checkResult)
        onAnalysisComplete?.("email", {
          sender: emailDataForAnalysis.sender,
          subject: emailDataForAnalysis.subject,
          content: emailDataForAnalysis.content,
        }, checkResult)
        resetForm()
      } finally {
        setIsChecking(false)
      }
    }

    const checkEmail = async () => {
      if (!emailFormData.sender.trim() || !emailFormData.content.trim()) {
        toast.error("Please enter at least sender and content information")
        return
      }
      await analyzeEmail(emailFormData)
    }

    const hasFormContent = emailFormData.sender.trim() && emailFormData.content.trim()

    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {isChecking || isExtracting ? (
            <ScanningIndicator />
          ) : result ? (
            <AnalysisResultPanel
              result={result}
              onReset={() => setResult(null)}
              resetLabel="Analyze Another Email"
            />
          ) : (
            <Box>
              {connectionMode !== "proxy" && !hasApiKey && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 1 }}>
                  An OpenAI API key is required. Please add your API key in the settings.
                </Alert>
              )}

              <TextField
                fullWidth
                label="Sender Email"
                placeholder="e.g., sender@domain.com"
                value={emailFormData.sender}
                onChange={handleFieldChange("sender")}
                sx={{ mb: 2 }}
                size="small"
                variant="outlined"
              />

              <TextField
                fullWidth
                label="Subject (optional)"
                placeholder="Email subject line"
                value={emailFormData.subject}
                onChange={handleFieldChange("subject")}
                sx={{ mb: 2 }}
                size="small"
                variant="outlined"
              />

              <TextField
                fullWidth
                label="Email Content"
                placeholder="Paste the email content here..."
                multiline
                rows={5}
                value={emailFormData.content}
                onChange={handleFieldChange("content")}
                sx={{ mb: 2 }}
                variant="outlined"
              />

              <Box sx={{ mt: "auto" }}>
                {hasFormContent ? (
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={isChecking || isExtracting || (connectionMode !== "proxy" && !hasApiKey)}
                    onClick={checkEmail}
                    startIcon={isChecking ? <CircularProgress size={18} color="inherit" /> : <WarningIcon />}
                    sx={{ borderRadius: 2, textTransform: "none", py: 1.25 }}
                  >
                    {isChecking ? "Analyzing..." : "Check For Fraud"}
                  </Button>
                ) : (
                  <Tooltip title="Extract email from current Gmail tab">
                    <span style={{ display: "block" }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={extractCurrentEmail}
                        disabled={isExtracting || isChecking || (connectionMode !== "proxy" && !hasApiKey)}
                        startIcon={isExtracting ? <CircularProgress size={18} color="inherit" /> : <ContentPasteIcon />}
                        sx={{ borderRadius: 2, textTransform: "none", py: 1.25 }}
                      >
                        {isExtracting ? "Extracting..." : "Extract from Tab"}
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    )
  }
)
