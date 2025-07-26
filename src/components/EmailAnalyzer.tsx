import ContentPasteIcon from "@mui/icons-material/ContentPaste"
import WarningIcon from "@mui/icons-material/Warning"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material"
import { forwardRef, useImperativeHandle, useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { useApiKey } from "../hooks/useApiKey"
import { checkEmailWithOpenAI, type EmailData } from "../lib/fraudService"
import { ThreatRating } from "./ThreatRating"

// Define types for the fraud check results for the UI
export interface EmailCheckResult {
  threatRating: number // 1-10 scale
  explanation: string
  sender: string
  subject: string
  flags?: string[] // Optional indicators of fraud
}

interface EmailAnalyzerProps {
  onBackToHome?: () => void
  onAnalysisComplete?: (
    type: "email",
    input: { sender?: string; subject?: string; content: string },
    result: EmailCheckResult
  ) => void
}

export interface EmailAnalyzerRef {
  extractEmail: () => void
}

const DEFAULT_VALUES = {
  SUBJECT: "No Subject",
}

export const EmailAnalyzer = forwardRef<EmailAnalyzerRef, EmailAnalyzerProps>(
  ({ onBackToHome, onAnalysisComplete }, ref) => {
  // State management
  const [isChecking, setIsChecking] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [result, setResult] = useState<EmailCheckResult | null>(null)
  const [emailFormData, setEmailFormData] = useState({
    sender: "",
    subject: "",
    content: "",
  })

  // Hooks
  const { apiKey, hasApiKey } = useApiKey()
  const { toast } = useCustomSnackbar()
  const theme = useTheme()

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    extractEmail: extractCurrentEmail,
  }))

  // Form field handlers
  const handleFieldChange =
    (field: keyof typeof emailFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setEmailFormData({
        ...emailFormData,
        [field]: e.target.value,
      })
    }

  // Reset form fields
  const resetForm = () => {
    setEmailFormData({
      sender: "",
      subject: "",
      content: "",
    })
  }

  // API key validation
  const validateApiKey = (): boolean => {
    if (!hasApiKey) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return false
    }
    return true
  }

  // Function to extract email from the current tab
  const extractCurrentEmail = async () => {
    if (!validateApiKey()) return

    setIsExtracting(true)
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tabs[0]?.id) {
        throw new Error("No active tab found")
      }

      // Check if we're on Gmail
      const url = tabs[0].url || ""
      if (!url.includes("mail.google.com")) {
        throw new Error("Please open Gmail to extract email content")
      }

      // Execute the scrapeGmail function from our injected content script
      // First ensure we have permission to access the tab
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          // Do nothing, just verify we can execute scripts in this tab
          return true
        },
      })

      // Now extract the email data
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try {
            // Gmail-specific selectors
            const email1 = document
              .querySelector("[data-message-id] [email]")
              ?.getAttribute("email")
            const email2 = document.querySelector(".gE [email]")?.getAttribute("email")
            const email3 = document.querySelector(".gD [email]")?.getAttribute("email")
            const email4 = document
              .querySelector("[data-hovercard-id]")
              ?.getAttribute("data-hovercard-id")
            const email5 = document.querySelector(".go")?.textContent?.trim()
            const sender = email1 || email2 || email3 || email4 || email5
            console.info({ email1, email2, email3, email4, email5, sender })
            const subject =
              document.querySelector(".ha h2")?.textContent ||
              document.querySelector("[data-message-id] .hP")?.textContent
            const content =
              document
                .querySelector("[data-message-id] .a3s.aiL")
                ?.textContent?.replace(/\n+/g, " ")
                .trim() || document.querySelector(".a3s")?.textContent?.replace(/\n+/g, " ").trim()

            if (sender && content) {
              return {
                success: true,
                sender,
                subject: subject || "No Subject",
                content,
                timestamp: new Date().toISOString(),
              }
            } else {
              return {
                success: false,
                message: "Could not extract email data. Make sure you have an email open.",
              }
            }
          } catch (error) {
            return {
              success: false,
              message:
                "Error extracting email: " +
                (error instanceof Error ? error.message : String(error)),
            }
          }
        },
      })

      const extractResult = result.result || null

      if (!extractResult || !extractResult.success) {
        throw new Error(extractResult?.message || "Failed to extract email content")
      }

      // Populate the form with extracted data
      setEmailFormData({
        sender: extractResult.sender || "",
        subject: extractResult.subject || "",
        content: extractResult.content || "",
      })

      toast.success("Email extracted from Gmail")
    } catch (error) {
      console.error("Gmail extraction error:", error)

      // Provide more helpful error messages
      if (error instanceof Error) {
        const errorMsg = error.message || ""

        if (errorMsg.includes("Please open Gmail")) {
          toast.error(
            "Please open Gmail to extract email content. This extension currently only supports Gmail."
          )
        } else if (errorMsg.includes("Permission")) {
          toast.error(
            "Permission required. Please make sure you've allowed this extension to access Gmail."
          )
        } else if (
          errorMsg.includes("Could not establish connection") ||
          errorMsg.includes("Receiving end does not exist")
        ) {
          toast.error("Connection to Gmail failed. Try refreshing the Gmail page and try again.")
          console.error("ContentScript connection error:", error)
        } else if (errorMsg.includes("Cannot access a chrome")) {
          toast.error(
            "Access to Gmail denied. Please click on the Gmail page once before extracting."
          )
        } else {
          toast.error(errorMsg || "Failed to extract email from Gmail")
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

  // Function to check a manually entered email
  const checkEmail = async () => {
    // Validation
    if (!emailFormData.sender.trim() || !emailFormData.content.trim()) {
      toast.error("Please enter at least sender and content information")
      return
    }

    if (!validateApiKey()) return

    setIsChecking(true)
    try {
      // Prepare email data
      const emailData: EmailData = {
        sender: emailFormData.sender.trim(),
        subject: emailFormData.subject.trim() || DEFAULT_VALUES.SUBJECT,
        content: emailFormData.content.trim(),
        timestamp: new Date().toISOString(),
      }

      // Use OpenAI to check the email
      const fraudResult = await checkEmailWithOpenAI(emailData, apiKey || "")

      // Transform the API response to our UI result format
      const checkResult: EmailCheckResult = {
        threatRating: fraudResult.threatRating,
        explanation: fraudResult.explanation,
        sender: emailData.sender,
        subject: emailData.subject || DEFAULT_VALUES.SUBJECT,
        flags: fraudResult.flags,
      }

      // Update UI
      setResult(checkResult)
      
      // Call the analysis complete callback if provided
      if (onAnalysisComplete) {
        onAnalysisComplete("email", {
          sender: emailData.sender,
          subject: emailData.subject,
          content: emailData.content,
        }, checkResult)
      }
      
      resetForm()
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsChecking(false)
    }
  }

  // Handle API errors
  const handleApiError = (error: unknown) => {
    console.error("Email analysis error:", error)

    if (error && typeof error === "object" && "status" in error) {
      // Handle specific API errors
      if ((error as any).status === 401) {
        toast.error("Invalid API key. Please check your OpenAI API key.")
      } else {
        toast.error(`OpenAI API error: ${(error as any).message || "Unknown error"}`)
      }
    } else {
      toast.error("Failed to analyze email. Please try again later.")
    }
  }

  // Function to get color based on threat rating
  const getThreatColor = (rating: number): string => {
    if (rating <= 3) return "#4caf50" // Green for low threat
    if (rating <= 7) return "#ff9800" // Orange for medium threat
    return "#f44336" // Red for high threat
  }

  // UI Component: Email Input Form
  const EmailInputForm = () => (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: "0.9rem",
            color: theme.palette.text.secondary,
          }}
        >
          Enter email details or extract from a mail client.
        </Typography>

        <Tooltip title="Extract email from current tab">
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={extractCurrentEmail}
            disabled={isExtracting || isChecking}
            startIcon={
              isExtracting ? <CircularProgress size={14} color="inherit" /> : <ContentPasteIcon />
            }
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontSize: "0.8rem",
            }}
          >
            {isExtracting ? "Extracting..." : "Extract from Tab"}
          </Button>
        </Tooltip>
      </Box>

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
        sx={{ mb: 3 }}
        variant="outlined"
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          color="primary"
          disabled={
            isChecking ||
            isExtracting ||
            !emailFormData.sender.trim() ||
            !emailFormData.content.trim() ||
            !hasApiKey
          }
          onClick={checkEmail}
          startIcon={isChecking ? <CircularProgress size={18} color="inherit" /> : <WarningIcon />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
          }}
        >
          {isChecking ? "Analyzing..." : "Check For Fraud"}
        </Button>
      </Box>
    </Box>
  )

  // UI Component: Results Display
  const ResultsDisplay = () => {
    if (!result) return null

    return (
      <Box sx={{ width: "100%" }}>
        {/* Using our custom ThreatRating component */}
        <ThreatRating rating={result.threatRating} />

        {/* Email Summary */}
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
            sx={{
              mb: 1,
              fontWeight: 600,
              color: theme.palette.primary.main,
            }}
          >
            Email Details:
          </Typography>

          <Box sx={{ mb: 1 }}>
            <Typography
              variant="body2"
              component="span"
              sx={{ fontWeight: 500, color: theme.palette.text.primary }}
            >
              From:
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ ml: 1, color: theme.palette.text.secondary }}
            >
              {result.sender}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="body2"
              component="span"
              sx={{ fontWeight: 500, color: theme.palette.text.primary }}
            >
              Subject:
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ ml: 1, color: theme.palette.text.secondary }}
            >
              {result.subject}
            </Typography>
          </Box>
        </Paper>

        {/* Analysis */}
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
            sx={{
              mb: 1,
              fontWeight: 600,
              color: theme.palette.primary.main,
            }}
          >
            AI Analysis:
          </Typography>

          <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.5, fontSize: "0.9rem" }}>
            {result.explanation}
          </Typography>
        </Paper>

        {/* Detected Indicators */}
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

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          {onBackToHome && (
            <Button
              variant="outlined"
              onClick={onBackToHome}
              size="medium"
              sx={{
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              Back
            </Button>
          )}

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
            Analyze Another Email
          </Button>
        </Box>
      </Box>
    )
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
            <EmailInputForm />
          </Box>
        ) : (
          <ResultsDisplay />
        )}
      </Box>
    </Box>
  )
})
