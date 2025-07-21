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
import { extractLinksFromContent, safeCheckTextWithOpenAI, type TextData } from "../lib/fraudService"
import { LinkDisplay } from "./LinkDisplay"
import { ThreatRating } from "./ThreatRating"

// Define types for the text check results
export interface TextCheckResult {
  threatRating: number // 1-10 scale
  explanation: string
  content: string
  flags?: string[] // Optional indicators of fraud
  links?: string[] // Optional extracted links
}

interface TextInputAnalyzerProps {
  onBackToHome?: () => void
}

export const TextInputAnalyzer = ({ onBackToHome }: TextInputAnalyzerProps) => {
  const [textContent, setTextContent] = useState<string>("")
  const [isChecking, setIsChecking] = useState(false)
  const [isScraping] = useState(false)
  const [result, setResult] = useState<TextCheckResult | null>(null)
  const [extractedLinks, setExtractedLinks] = useState<string[]>([])
  const { apiKey, hasApiKey } = useApiKey()
  const { toast } = useCustomSnackbar()
  const theme = useTheme()

  // Handle text content changes and extract links
  const handleTextContentChange = (value: string) => {
    setTextContent(value)
    const links = extractLinksFromContent(value)
    setExtractedLinks(links)
  }

  // Function to check permission for the current tab URL
  const _checkCurrentTabPermission = async (): Promise<boolean> => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (!tab?.url) {
        toast.error("No active tab found")
        return false
      }

      const response = await chrome.runtime.sendMessage({
        action: "checkPermission",
        url: tab.url,
      })

      return response?.success && response?.hasPermission
    } catch (error) {
      console.error("Error checking tab permission:", error)
      return false
    }
  }

  // Function to request permission for the current tab URL
  const _requestCurrentTabPermission = async (): Promise<boolean> => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (!tab?.url) {
        toast.error("No active tab found")
        return false
      }

      const response = await chrome.runtime.sendMessage({
        action: "requestPermission",
        url: tab.url,
      })

      return response?.success && response?.granted
    } catch (error) {
      console.error("Error requesting tab permission:", error)
      return false
    }
  }

  // Function to extract text from the current webpage
  const _extractWebpageContent = async (): Promise<string> => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (!tab?.id) {
        throw new Error("No active tab found")
      }

      // Inject and execute the content scraping script
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Helper function to check if an element is visible
          function isVisible(element: Element): boolean {
            const style = window.getComputedStyle(element)
            return (
              style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0"
            )
          }

          // Helper function to clean text (remove extra whitespace, newlines)
          function cleanText(text: string): string {
            return text
              .replace(/\\s+/g, " ") // Collapse multiple spaces, tabs, newlines
              .trim()
          }

          // Select the main content area
          const mainContent: Element =
            document.querySelector("main") || // HTML5 <main> element
            document.querySelector("article") || // HTML5 <article> element
            document.querySelector('[role="main"]') || // ARIA role
            document.querySelector(".content, #content, .main-content") || // Common class/ID patterns
            document.body // Fallback to body

          // Elements to exclude (menus, headers, footers, asides, etc.)
          const excludeSelectors = [
            "nav",
            "header",
            "footer",
            "aside",
            '[role="navigation"]',
            '[role="banner"]',
            '[role="contentinfo"]',
            ".menu, .navbar, .sidebar, .widget, .ad, .advert, .footer, .header",
          ].join(", ")

          // Clone the main content to avoid modifying the original DOM
          const contentClone = mainContent.cloneNode(true) as Element

          // Remove excluded elements from the clone
          const excludedElements = contentClone.querySelectorAll(excludeSelectors)
          excludedElements.forEach((element) => element.remove())

          // Get all visible text nodes
          let textContent = ""
          const walker = document.createTreeWalker(contentClone, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
              const parent = node.parentElement
              // Only include text from visible elements, exclude script/style
              if (parent && isVisible(parent) && !["SCRIPT", "STYLE"].includes(parent.tagName)) {
                return NodeFilter.FILTER_ACCEPT
              }
              return NodeFilter.FILTER_REJECT
            },
          })

          // Collect and clean text
          while (walker.nextNode()) {
            if (walker.currentNode.textContent) {
              const text = cleanText(walker.currentNode.textContent)
              if (text) {
                textContent += `${text} `
              }
            }
          }

          // Final cleanup
          textContent = cleanText(textContent)

          return textContent || "No main content text found."
        },
      })

      return result.result || "No content extracted"
    } catch (error) {
      console.error("Error extracting webpage content:", error)
      throw error
    }
  }


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
        links: extractedLinks,
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
        links: extractedLinks,
      }

      setResult(checkResult)
    } catch (error) {
      console.error("Error checking text:", error)
      toast.error("An error occurred while analyzing the text. Please try again later.")
    } finally {
      setIsChecking(false)
    }
  }

  // This line was for clipboard functionality that has been removed

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

      {!result ? (
        <Fade in={!result} timeout={400}>
          <Box>
            {!hasApiKey && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
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
              onChange={(e) => handleTextContentChange(e.target.value)}
              sx={{
                mb: extractedLinks.length > 0 ? 1 : 2,
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

            {/* Show extracted links in compact form while typing */}
            {extractedLinks.length > 0 && (
              <LinkDisplay links={extractedLinks} variant="compact" />
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: extractedLinks.length > 0 ? 2 : 0 }}>
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
                disabled={isChecking || isScraping || !textContent.trim() || !hasApiKey}
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

            {/* Links Display */}
            {result.links && result.links.length > 0 && (
              <LinkDisplay links={result.links} title="Links in Text" />
            )}

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
        </Fade>
      )}
    </Card>
  )
}
