import DescriptionIcon from "@mui/icons-material/Description"
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
  Zoom,
} from "@mui/material"
import { useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { useApiKey } from "../hooks/useApiKey"
import {
  type FraudCheckResponse,
  offlineCheckTextForFraud,
  safeCheckTextWithOpenAI,
  type TextData,
} from "../lib/fraudService"
import { ThreatRating } from "./ThreatRating"

// Define types for the text check results
export interface TextCheckResult {
  threatRating: number // 1-10 scale
  explanation: string
  content: string
  flags?: string[] // Optional indicators of fraud
  isOfflineMode?: boolean // Flag to indicate if this is an offline/pattern-based analysis
}

interface TextInputAnalyzerProps {
  onBackToHome?: () => void
}

export const TextInputAnalyzer = ({ onBackToHome }: TextInputAnalyzerProps) => {
  const [textContent, setTextContent] = useState<string>("")
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<TextCheckResult | null>(null)
  const { apiKey, isOfflineMode } = useApiKey()
  const { toast } = useCustomSnackbar()
  const theme = useTheme()

  // Function to check the text for fraud
  const checkTextForFraud = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter some text to analyze")
      return
    }

    setIsChecking(true)
    try {
      // Check if in offline mode
      if (isOfflineMode) {
        toast.info("No API key found. Using offline pattern-matching analysis.")
      }

      // Prepare text data for fraud check
      const textData: TextData = {
        content: textContent,
        source: "pasted",
        timestamp: new Date().toISOString(),
      }

      let fraudResult: FraudCheckResponse | null = null

      // If no API key, use offline mode directly
      if (isOfflineMode) {
        fraudResult = await offlineCheckTextForFraud(textData)
      } else {
        // Try with OpenAI first when we have an API key
        const [apiResult, error] = await safeCheckTextWithOpenAI(textData, apiKey!)

        // If OpenAI API fails, use offline implementation
        if (error) {
          console.warn("OpenAI API error, using offline mode:", error)
          toast.info("Using offline analysis mode due to API connection issues")

          fraudResult = await offlineCheckTextForFraud(textData)
        } else {
          fraudResult = apiResult
        }

        if (!fraudResult) {
          // Final fallback to offline implementation if nothing worked
          fraudResult = await offlineCheckTextForFraud(textData)
        }
      }

      // Transform the API response to our UI result format
      const checkResult: TextCheckResult = {
        threatRating: fraudResult.threatRating,
        explanation: fraudResult.explanation,
        content: textContent.substring(0, 100) + (textContent.length > 100 ? "..." : ""),
        flags: fraudResult.flags,
        isOfflineMode: fraudResult.isOfflineMode,
      }

      setResult(checkResult)
    } catch (error) {
      console.error("Error checking text:", error)
      if (typeof error === "object" && error !== null && "status" in error) {
        // Handle specific API errors
        if ((error as any).status === 401) {
          toast.error("Invalid API key. Please check your OpenAI API key.")
        } else {
          toast.error(`OpenAI API error: ${(error as any).message || "Unknown error"}`)
        }
      } else {
        toast.error("Error analyzing text. Using pattern matching instead.")

        try {
          // Final fallback if everything else fails
          const fraudResult = await offlineCheckTextForFraud({
            content: textContent.trim(),
            source: "pasted",
            timestamp: new Date().toISOString(),
          })

          const checkResult: TextCheckResult = {
            threatRating: fraudResult.threatRating,
            explanation: fraudResult.explanation,
            content: textContent.substring(0, 100) + (textContent.length > 100 ? "..." : ""),
            flags: fraudResult.flags,
            isOfflineMode: true,
          }

          setResult(checkResult)
        } catch (mockError) {
          toast.error("Failed to analyze text. Please try again later.")
        }
      }
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
        <DescriptionIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h5" sx={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Text Analysis
        </Typography>
      </Box>

      {/* Optional API Key Info Banner - removed since we now have a global banner */}

      {!result ? (
        <Fade in={!result} timeout={400}>
          <Box>
            <Typography
              variant="body2"
              sx={{
                mb: 2,
                fontSize: "0.9rem",
                color: theme.palette.text.secondary,
              }}
            >
              Paste any text below to check for potential fraud or scams. The analysis will be
              performed using AI or pattern-matching if offline.
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
                    borderColor: theme.palette.primary.main + "80",
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
                disabled={isChecking || !textContent.trim()}
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
        </Fade>
      ) : (
        <Fade in={!!result} timeout={600}>
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
                  {result.isOfflineMode ? "Pattern Analysis:" : "AI Analysis:"}
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
                Analyze New Text
              </Button>
            </Box>
          </Box>
        </Fade>
      )}
    </Card>
  )
}
