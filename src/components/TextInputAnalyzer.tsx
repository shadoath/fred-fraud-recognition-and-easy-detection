import WarningIcon from "@mui/icons-material/Warning"
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
  Zoom,
} from "@mui/material"
import { useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { useApiKey } from "../hooks/useApiKey"
import { safeCheckTextWithOpenAI, type TextData } from "../lib/fraudService"
import { ThreatRating } from "./ThreatRating"

// Define types for the text check results
export interface TextCheckResult {
  threatRating: number // 1-10 scale
  explanation: string
  content: string
  flags?: string[] // Optional indicators of fraud
}

interface TextInputAnalyzerProps {
  onBackToHome?: () => void
  onAnalysisComplete?: (type: "text", input: { content: string }, result: TextCheckResult) => void
}

export const TextInputAnalyzer = ({ onBackToHome, onAnalysisComplete }: TextInputAnalyzerProps) => {
  const [textContent, setTextContent] = useState<string>("")
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<TextCheckResult | null>(null)
  const { apiKey, hasApiKey } = useApiKey()
  const { toast } = useCustomSnackbar()
  const theme = useTheme()

  // Function to check the text for fraud
  const checkTextForFraud = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter some text to analyze")
      return
    }

    if (!hasApiKey || !apiKey) {
      toast.error("API key required. Please add an OpenAI API key in the settings.")
      return
    }

    setIsChecking(true)
    try {
      // Prepare text data for fraud check
      const textData: TextData = {
        content: textContent,
        source: "pasted",
        timestamp: new Date().toISOString(),
      }

      // Use OpenAI API for analysis
      const [apiResult, error] = await safeCheckTextWithOpenAI(textData, apiKey)

      if (error) {
        console.error("OpenAI API error:", error)
        toast.error(`OpenAI API error: ${error.message || "Unknown error"}`)
        return
      }

      if (!apiResult) {
        toast.error("Failed to analyze text. Please try again later.")
        return
      }

      // Transform the API response to our UI result format
      const checkResult: TextCheckResult = {
        threatRating: apiResult.threatRating,
        explanation: apiResult.explanation,
        content: textContent.substring(0, 100) + (textContent.length > 100 ? "..." : ""),
        flags: apiResult.flags,
      }

      setResult(checkResult)

      // Call the analysis complete callback if provided
      if (onAnalysisComplete) {
        onAnalysisComplete(
          "text",
          {
            content: textContent,
          },
          checkResult
        )
      }
    } catch (error) {
      console.error("Error checking text:", error)
      toast.error("An error occurred while analyzing the text. Please try again later.")
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
              Paste any text below to check for potential fraud or scams using AI analysis.
            </Typography>

            <TextField
              fullWidth
              label="Paste text to analyze"
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

              <Button
                variant="contained"
                color="primary"
                onClick={checkTextForFraud}
                disabled={isChecking || !textContent.trim() || !hasApiKey}
                startIcon={
                  isChecking ? <CircularProgress size={18} color="inherit" /> : <WarningIcon />
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
                {isChecking ? "Analyzing..." : "Check For Fraud"}
              </Button>
            </Box>

            {/* Small info card */}
            {textContent.trim().length > 0 && (
              <Zoom in={textContent.trim().length > 0} timeout={500}>
                <Alert
                  severity="info"
                  variant="standard"
                  sx={{
                    mt: 2,
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
          </Box>
        ) : (
          <Box sx={{ width: "100%" }}>
            {/* Using our custom ThreatRating component */}
            <ThreatRating rating={result.threatRating} />

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
                Analyze New Text
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}
