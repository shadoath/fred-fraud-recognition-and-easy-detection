import EmailIcon from "@mui/icons-material/Email"
import WarningIcon from "@mui/icons-material/Warning"
import {
  Alert,
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
}

export const EmailAnalyzer = ({ onBackToHome }: EmailAnalyzerProps) => {
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<EmailCheckResult | null>(null)
  const [manualSender, setManualSender] = useState<string>("")
  const [manualSubject, setManualSubject] = useState<string>("")
  const [manualContent, setManualContent] = useState<string>("")
  const { apiKey, hasApiKey } = useApiKey()
  const { toast } = useCustomSnackbar()
  const theme = useTheme()

  // Function to check a manually entered email
  const checkManualEmail = async () => {
    if (!manualSender.trim() || !manualContent.trim()) {
      toast.error("Please enter at least sender and content information")
      return
    }

    if (!hasApiKey) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return
    }

    setIsChecking(true)
    try {
      // Prepare email data
      const emailData: EmailData = {
        sender: manualSender.trim(),
        subject: manualSubject.trim() || "No Subject",
        content: manualContent.trim(),
        timestamp: new Date().toISOString(),
      }

      try {
        // Use OpenAI to check the email
        const fraudResult = await checkEmailWithOpenAI(emailData, apiKey!)

        // Transform the API response to our UI result format
        const checkResult: EmailCheckResult = {
          threatRating: fraudResult.threatRating,
          explanation: fraudResult.explanation,
          sender: emailData.sender,
          subject: emailData.subject || "Unknown Subject",
          flags: fraudResult.flags,
        }

        setResult(checkResult)

        // Reset manual entry fields
        setManualSender("")
        setManualSubject("")
        setManualContent("")
      } catch (error) {
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
    } catch (error) {
      console.error("Error checking email:", error)
      toast.error(error instanceof Error ? error.message : "Error checking email")
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

      {!result ? (
        <Fade in={!result} timeout={400}>
          <Box>
            {!hasApiKey && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                An OpenAI API key is required. Please add your API key in the settings.
              </Alert>
            )}

            <Box>
              <Typography
                variant="body2"
                sx={{
                  mb: 2,
                  fontSize: "0.9rem",
                  color: theme.palette.text.secondary,
                }}
              >
                Enter the email details to analyze for potential fraud.
              </Typography>

              <TextField
                fullWidth
                label="Sender Email"
                placeholder="e.g., sender@domain.com"
                value={manualSender}
                onChange={(e) => setManualSender(e.target.value)}
                sx={{ mb: 2 }}
                size="small"
                variant="outlined"
              />

              <TextField
                fullWidth
                label="Subject (optional)"
                placeholder="Email subject line"
                value={manualSubject}
                onChange={(e) => setManualSubject(e.target.value)}
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
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                sx={{ mb: 3 }}
                variant="outlined"
              />

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={
                    isChecking || !manualSender.trim() || !manualContent.trim() || !hasApiKey
                  }
                  onClick={checkManualEmail}
                  startIcon={
                    isChecking ? <CircularProgress size={18} color="inherit" /> : <WarningIcon />
                  }
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                  }}
                >
                  {isChecking ? "Analyzing..." : "Check For Fraud"}
                </Button>
              </Box>
            </Box>
          </Box>
        </Fade>
      ) : (
        <Fade in={!!result} timeout={600}>
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
                  {result.flags.map((flag, index) => (
                    <Chip
                      key={index}
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
        </Fade>
      )}
    </Card>
  )
}