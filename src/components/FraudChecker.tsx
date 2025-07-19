import EmailIcon from "@mui/icons-material/Email"
import SettingsIcon from "@mui/icons-material/Settings"
import WarningIcon from "@mui/icons-material/Warning"
import { Box, Button, Card, CircularProgress, Collapse, Divider, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import { checkEmailWithOpenAI, type EmailData } from "../lib/fraudService"
import { recoverApiKey } from "../lib/keyStorage"
import { API_KEY_STORAGE_KEY, ApiKeySettings } from "./ApiKeySettings"
import { threatLevels, ThreatRating } from "./ThreatRating"
// Define types for the fraud check results for the UI
export interface FraudCheckResult {
  threatRating: number // 1-10 scale
  explanation: string
  sender: string
  subject: string
  flags?: string[] // Optional indicators of fraud
}

export const FraudChecker = () => {
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<FraudCheckResult | null>(null)
  const [hasApiKey, setHasApiKey] = useState<boolean>(false)
  const [isLoadingApiKey, setIsLoadingApiKey] = useState<boolean>(true)
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const { toast } = useCustomSnackbar()

  // Check if API key exists on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY)
        setHasApiKey(!!result[API_KEY_STORAGE_KEY])
      } catch (error) {
        console.error("Error checking API key:", error)
      } finally {
        setIsLoadingApiKey(false)
      }
    }

    checkApiKey()
  }, [])

  // Listen for changes to the API key in storage
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[API_KEY_STORAGE_KEY]) {
        setHasApiKey(!!changes[API_KEY_STORAGE_KEY].newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  // Function to check the currently open email
  const checkCurrentEmail = async () => {
    setIsChecking(true)
    try {
      // First check if we have an API key
      const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY)
      const apiKey = result[API_KEY_STORAGE_KEY]
      const recoveredKey = recoverApiKey(apiKey)

      if (!recoveredKey) {
        setShowSettings(true)

        throw new Error("No OpenAI API key found. Please add your API key in settings.")
      }

      // Send message to the content script to extract the current email
      const response = await chrome.tabs
        .query({ active: true, currentWindow: true })
        .then((tabs) => {
          if (tabs[0]?.id) {
            return chrome.tabs.sendMessage(tabs[0].id, { action: "extractEmailData" })
          }
          throw new Error("No active tab found")
        })

      // Handle the response
      if (response?.success) {
        // Prepare email data for fraud check
        const emailData: EmailData = {
          sender: response.sender,
          subject: response.subject,
          content: response.content,
          timestamp: response.timestamp,
        }

        try {
          // Use OpenAI to check the email
          const fraudResult = await checkEmailWithOpenAI(emailData, recoveredKey)

          // Transform the API response to our UI result format
          const checkResult: FraudCheckResult = {
            threatRating: fraudResult.threatRating,
            explanation: fraudResult.explanation,
            sender: emailData.sender,
            subject: emailData.subject || "Unknown Subject",
            flags: fraudResult.flags,
          }

          setResult(checkResult)
        } catch (error) {
          console.error("OpenAI API error:", error)
          if (typeof error === "object" && error !== null && "status" in error) {
            // Handle specific API errors
            if ((error as any).status === 401) {
              toast.error("Invalid API key. Please check your OpenAI API key.")
              setShowSettings(true)
            } else {
              toast.error(`OpenAI API error: ${(error as any).message || "Unknown error"}`)
            }
          } else {
            toast.error("Error connecting to OpenAI")
          }
        }
      } else {
        console.error("Failed to extract email data", response)
        toast.error("Failed to extract email data")
        throw new Error(response?.message || "Failed to extract email data")
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
    <Box sx={{ maxWidth: 400 }}>
      {/* API Key Settings */}
      <Collapse in={showSettings}>
        <ApiKeySettings />
      </Collapse>

      {/* Main Card */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EmailIcon /> Email Fraud Detector
          </Typography>

          <Button
            variant="text"
            size="small"
            onClick={() => setShowSettings(!showSettings)}
            startIcon={<SettingsIcon />}
          >
            Settings
          </Button>
        </Box>

        {isLoadingApiKey ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : !hasApiKey && !showSettings ? (
          <Box sx={{ textAlign: "center", my: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              To analyze emails, you need to add your OpenAI API key.
            </Typography>
            <Button variant="contained" color="primary" onClick={() => setShowSettings(true)}>
              Add API Key
            </Button>
          </Box>
        ) : (
          <>
            {!result ? (
              <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={checkCurrentEmail}
                  disabled={isChecking || !hasApiKey}
                  startIcon={
                    isChecking ? <CircularProgress size={20} color="inherit" /> : <WarningIcon />
                  }
                  sx={{ mt: 1 }}
                >
                  {isChecking ? "Checking..." : "Check This Email"}
                </Button>
              </Box>
            ) : (
              <Box sx={{ width: "100%", mt: 2 }}>
                {/* Using our custom ThreatRating component */}
                <ThreatRating rating={result.threatRating} />

                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 1,
                    backgroundColor: `${getThreatColor(result.threatRating)}11`,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: "bold", color: getThreatColor(result.threatRating) }}
                  >
                    {threatLevels[result.threatRating as keyof typeof threatLevels]}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Sender:</strong> {result.sender}
                </Typography>

                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Subject:</strong> {result.subject}
                </Typography>

                <Typography variant="h6">Analysis:</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {result.explanation}
                </Typography>

                {result.flags && result.flags.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Detected Indicators:</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {result.flags.map((flag) => (
                        <Typography
                          key={flag}
                          variant="body2"
                          sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
                        >
                          • {flag}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Button variant="outlined" color="primary" onClick={() => setResult(null)}>
                    Check Another Email
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Card>
    </Box>
  )
}
