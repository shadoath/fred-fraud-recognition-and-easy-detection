import EmailIcon from "@mui/icons-material/Email"
import ReportProblemIcon from "@mui/icons-material/ReportProblem"
import WarningIcon from "@mui/icons-material/Warning"
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Fade,
  Paper,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { useApiKey } from "../hooks/useApiKey"
import {
  checkEmailWithOpenAI,
  type EmailData,
  type FraudCheckResponse,
  offlineCheckEmailForFraud,
} from "../lib/fraudService"
import { ThreatRating } from "./ThreatRating"

// Define types for the fraud check results for the UI
export interface EmailCheckResult {
  threatRating: number // 1-10 scale
  explanation: string
  sender: string
  subject: string
  flags?: string[] // Optional indicators of fraud
  isOfflineMode?: boolean // Flag to indicate if this is an offline/pattern-based analysis
}

export interface EmailExtractResponse {
  success: boolean
  sender: string
  subject: string
  content: string
  timestamp: string
  message?: string
}

interface EmailAnalyzerProps {
  onBackToHome?: () => void
}

export const EmailAnalyzer = ({ onBackToHome }: EmailAnalyzerProps) => {
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<EmailCheckResult | null>(null)
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false)
  const [manualSender, setManualSender] = useState<string>("")
  const [manualSubject, setManualSubject] = useState<string>("")
  const [manualContent, setManualContent] = useState<string>("")
  const { apiKey, isOfflineMode } = useApiKey()
  const { toast } = useCustomSnackbar()
  const theme = useTheme()

  // Check if API key exists on component mount
  // Function to check a manually entered email
  const checkManualEmail = async () => {
    if (!manualSender.trim() || !manualContent.trim()) {
      toast.error("Please enter at least sender and content information")
      return
    }

    setIsChecking(true)
    try {
      // Check if in offline mode
      if (isOfflineMode) {
        toast.info("No API key found. Using offline pattern-matching analysis.")
      }

      // Prepare email data
      const emailData: EmailData = {
        sender: manualSender.trim(),
        subject: manualSubject.trim() || "No Subject",
        content: manualContent.trim(),
        timestamp: new Date().toISOString(),
      }

      try {
        let fraudResult: FraudCheckResponse

        // If no API key, use offline mode directly
        if (isOfflineMode || !apiKey) {
          fraudResult = await offlineCheckEmailForFraud(emailData)
        } else {
          try {
            // Try to use OpenAI to check the email when we have an API key
            fraudResult = await checkEmailWithOpenAI(emailData, apiKey)
          } catch (apiError) {
            console.warn("OpenAI API error, using offline mode:", apiError)

            // If OpenAI fails, fall back to the offline implementation
            fraudResult = await offlineCheckEmailForFraud(emailData)

            // Notify the user that we're using offline mode
            toast.info("Using offline analysis mode due to API connection issues")
          }
        }

        // Transform the API response to our UI result format
        const checkResult: EmailCheckResult = {
          threatRating: fraudResult.threatRating,
          explanation: fraudResult.explanation,
          sender: emailData.sender,
          subject: emailData.subject || "Unknown Subject",
          flags: fraudResult.flags,
          isOfflineMode: fraudResult.isOfflineMode,
        }

        setResult(checkResult)

        // Reset manual entry fields
        setManualSender("")
        setManualSubject("")
        setManualContent("")
        setShowManualEntry(false)
      } catch (error) {
        console.error("Email analysis error:", error)
        toast.error("Error analyzing email. Using pattern matching instead.")

        try {
          // Final fallback to offline implementation
          const fraudResult = await offlineCheckEmailForFraud(emailData)

          const checkResult: EmailCheckResult = {
            threatRating: fraudResult.threatRating,
            explanation: fraudResult.explanation,
            sender: emailData.sender,
            subject: emailData.subject || "Unknown Subject",
            flags: fraudResult.flags,
            isOfflineMode: true,
          }

          setResult(checkResult)
        } catch (offlineError) {
          toast.error("Failed to analyze email. Please try again later.")
        }
      }
    } catch (error) {
      console.error("Error checking email:", error)
      toast.error(error instanceof Error ? error.message : "Error checking email")
    } finally {
      setIsChecking(false)
    }
  }

  // Function to check the currently open email
  const checkCurrentEmail = async () => {
    setIsChecking(true)
    try {
      // Check if in offline mode
      if (isOfflineMode) {
        toast.info("No API key found. Using offline pattern-matching analysis.")
      }

      // Send message to the content script to extract the current email
      let emailExtractResponse: EmailExtractResponse | null = null
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })

        if (!tabs[0]?.id) {
          throw new Error("No active tab found")
        }

        emailExtractResponse = await chrome.tabs
          .sendMessage(tabs[0].id, { action: "extractEmailData" })
          .catch((error) => {
            console.error("Content script communication error:", error)

            // Check if this is a connection error
            if (
              error.message.includes("Receiving end does not exist") ||
              error.message.includes("Could not establish connection")
            ) {
              throw new Error(
                "Content script not available. Please make sure you're viewing a Gmail message and refresh the page."
              )
            }

            throw error
          })
      } catch (error) {
        if (error instanceof Error && error.message.includes("Content script not available")) {
          throw error
        }
        throw new Error("Failed to communicate with Gmail content script. Try refreshing the page.")
      }

      // Handle the response
      if (emailExtractResponse?.success) {
        // Prepare email data for fraud check
        const emailData: EmailData = {
          sender: emailExtractResponse.sender,
          subject: emailExtractResponse.subject,
          content: emailExtractResponse.content,
          timestamp: emailExtractResponse.timestamp,
        }

        try {
          let fraudResult: FraudCheckResponse | null = null

          // If no API key, use offline mode directly
          if (isOfflineMode || !apiKey) {
            fraudResult = await offlineCheckEmailForFraud(emailData)
          } else {
            try {
              // Try to use OpenAI to check the email when we have an API key
              fraudResult = await checkEmailWithOpenAI(emailData, apiKey)
            } catch (apiError) {
              console.warn("OpenAI API error, using offline mode:", apiError)

              // If OpenAI fails, fall back to the offline implementation
              fraudResult = await offlineCheckEmailForFraud(emailData)

              // Notify the user that we're using offline mode
              toast.info("Using offline analysis mode due to API connection issues")
            }
          }

          // Transform the API response to our UI result format
          const checkResult: EmailCheckResult = {
            threatRating: fraudResult.threatRating,
            explanation: fraudResult.explanation,
            sender: emailData.sender,
            subject: emailData.subject || "Unknown Subject",
            flags: fraudResult.flags,
            isOfflineMode: fraudResult.isOfflineMode,
          }

          setResult(checkResult)
        } catch (error) {
          console.error("Email analysis error:", error)
          if (typeof error === "object" && error !== null && "status" in error) {
            // Handle specific API errors
            if (error.status === 401) {
              toast.error("Invalid API key. Please check your OpenAI API key.")
            } else if ("message" in error) {
              toast.error(`Analysis error: ${error.message}`)
            }
          } else {
            toast.error("Error analyzing email. Using pattern matching instead.")

            try {
              // Final fallback to offline implementation if everything else fails
              const fraudResult = await offlineCheckEmailForFraud(emailData)

              const checkResult: EmailCheckResult = {
                threatRating: fraudResult.threatRating,
                explanation: fraudResult.explanation,
                sender: emailData.sender,
                subject: emailData.subject || "Unknown Subject",
                flags: fraudResult.flags,
                isOfflineMode: true,
              }

              setResult(checkResult)
            } catch (mockError) {
              toast.error("Failed to analyze email. Please try again later.")
            }
          }
        }
      } else {
        throw new Error(emailExtractResponse?.message || "Failed to extract email data")
      }
    } catch (error) {
      const errorString = "Error checking email"
      console.error(errorString, error)
      toast.error(error instanceof Error ? `${errorString}: ${error.message}` : errorString)
    } finally {
      setIsChecking(false)
    }
  }

  // Function to get color based on threat rating
  const getThreatColor = (rating: number): string => {
    if (rating <= 3) return "#4caf50" // Green for low threat
    if (rating <= 7) return "#ff9800" // Orange for medium threat
    return "#f44336" // Red for high threat
  }

  return (
    <Card
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "none",
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
        <EmailIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h5" sx={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Email Analysis
        </Typography>
      </Box>

      {/* Optional API Key Info Banner - removed since we now have a global banner */}

      {!result ? (
        <Box>
          <Typography variant="body2" sx={{ mb: 3, fontSize: "0.9rem" }}>
            Open an email in Gmail and click the button below to check it for potential fraud.
            <Box
              component="span"
              sx={{
                display: "block",
                mt: 1,
                fontSize: "0.8rem",
                color: theme.palette.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              Note: If you receive connection errors, please refresh the Gmail tab and try again.
            </Box>
          </Typography>

          {/* Manual Email Entry Form */}
          {showManualEntry ? (
            <Box
              sx={{
                mt: 1,
                mb: 3,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                p: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor:
                  theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.01)",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                }}
              >
                Manual Email Entry
              </Typography>

              <TextField
                label="Sender Email"
                placeholder="from@example.com"
                value={manualSender}
                onChange={(e) => setManualSender(e.target.value)}
                fullWidth
                size="small"
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />

              <TextField
                label="Subject"
                placeholder="Email subject (optional)"
                value={manualSubject}
                onChange={(e) => setManualSubject(e.target.value)}
                fullWidth
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />

              <TextField
                label="Email Content"
                placeholder="Paste the email content here..."
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                fullWidth
                multiline
                rows={5}
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowManualEntry(false)}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={checkManualEmail}
                  disabled={isChecking || !manualSender.trim() || !manualContent.trim()}
                  startIcon={isChecking ? <CircularProgress size={16} color="inherit" /> : null}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                  }}
                  size="small"
                >
                  {isChecking ? "Analyzing..." : "Analyze Email"}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
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

              <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setShowManualEntry(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                  }}
                  size="medium"
                >
                  Manual Entry
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={checkCurrentEmail}
                  disabled={isChecking}
                  startIcon={
                    isChecking ? <CircularProgress size={18} color="inherit" /> : <WarningIcon />
                  }
                  sx={{
                    borderRadius: 2,
                    px: 2,
                    textTransform: "none",
                    boxShadow: 2,
                  }}
                  size="medium"
                >
                  {isChecking ? "Analyzing..." : "Check Current Email"}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <Fade in={!!result} timeout={600}>
          <Box sx={{ width: "100%" }}>
            {/* Using our custom ThreatRating component */}
            <ThreatRating rating={result.threatRating} />

            {/* Email Info */}
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                backgroundColor:
                  theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: 600, color: theme.palette.primary.main }}
              >
                Email Details
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 65 }}>
                    From:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {result.sender}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 65 }}>
                    Subject:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {result.subject}
                  </Typography>
                </Box>
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
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <ReportProblemIcon fontSize="small" />
                  {result.isOfflineMode ? "Pattern Analysis" : "AI Analysis"}
                </Typography>

                {result.isOfflineMode && (
                  <Chip
                    label="OFFLINE MODE"
                    size="small"
                    sx={{
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? "rgba(255,193,7,0.2)"
                          : "rgba(255,193,7,0.1)",
                      color: "#b2930c",
                      fontSize: "0.65rem",
                      height: 20,
                      fontWeight: 600,
                      border: "1px solid rgba(255,193,7,0.3)",
                    }}
                  />
                )}
              </Box>

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
                Check Another Email
              </Button>
            </Box>
          </Box>
        </Fade>
      )}
    </Card>
  )
}
