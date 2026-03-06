import AnalyticsIcon from "@mui/icons-material/Analytics"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material"
import { useEffect, useState } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"
import type { EmailCheckResult } from "./EmailAnalyzer"
import type { TextCheckResult } from "./TextInputAnalyzer"
import { TabPanel } from "./TabPanel"
import { getThreatColor, ThreatRating } from "./ThreatRating"
import type { URLCheckResult } from "./URLAnalyzer"

interface AnalysisData {
  type: "email" | "text" | "url"
  input: {
    sender?: string
    subject?: string
    content: string
  }
  result: EmailCheckResult | TextCheckResult | URLCheckResult
  timestamp: string
}

interface AnalysisTabProps {
  analysisData: AnalysisData | null
}

export const AnalysisTab = ({ analysisData }: AnalysisTabProps) => {
  const [tabValue, setTabValue] = useState(analysisData ? 1 : 0)
  const theme = useTheme()
  const { toast } = useCustomSnackbar()

  // Update tab to Analysis Results when new analysis data arrives
  useEffect(() => {
    if (analysisData) {
      setTabValue(1) // Switch to Analysis Results tab
    }
  }, [analysisData])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Copied to clipboard")
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard")
      })
  }

  if (!analysisData) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
            pb: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <AnalyticsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Analysis Results
          </Typography>
        </Box>

        <Alert severity="info" sx={{ borderRadius: 1 }}>
          <Typography variant="body2">
            No analysis data available. Run an analysis from the Email, Text, or URL tabs to view results
            here.
          </Typography>
        </Alert>
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
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
          "& .MuiTab-root": {
            minHeight: "40px",
            fontSize: "0.875rem",
            textTransform: "none",
          },
          "& .Mui-selected": {
            fontWeight: "bold",
          },
          "& .MuiTabs-indicator": {
            height: 2,
          },
        }}
      >
        <Tab label="Input Data" id="analysis-tab-0" aria-controls="analysis-tabpanel-0" />
        <Tab label="Analysis Results" id="analysis-tab-1" aria-controls="analysis-tabpanel-1" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
        <TabPanel value={tabValue} index={0} idPrefix="analysis">
          {/* Input Data Panel */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                }}
              >
                Original {analysisData.type === "email" ? "Email" : analysisData.type === "url" ? "URL" : "Text"}
              </Typography>
              <Tooltip title="Copy content to clipboard">
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(analysisData.input.content)}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {analysisData.type === "email" && (
              <>
                {analysisData.input.sender && (
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
                      {analysisData.input.sender}
                    </Typography>
                  </Box>
                )}

                {analysisData.input.subject && (
                  <Box sx={{ mb: 2 }}>
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
                      {analysisData.input.subject}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ mb: 2 }} />
              </>
            )}

            <Typography
              variant="body2"
              sx={{
                mb: 1,
                fontWeight: 500,
                color: theme.palette.text.primary,
              }}
            >
              Content:
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                maxHeight: 300,
                overflow: "auto",
                backgroundColor:
                  theme.palette.mode === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.8)",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-wrap",
                  fontSize: "0.85rem",
                  lineHeight: 1.4,
                  color: theme.palette.text.secondary,
                }}
              >
                {analysisData.input.content}
              </Typography>
            </Paper>

            <Box
              sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <Typography variant="caption" color="textSecondary">
                Analyzed on {new Date(analysisData.timestamp).toLocaleString()}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SwapHorizIcon />}
                onClick={() => setTabValue(1)}
                sx={{ textTransform: "none" }}
              >
                View Results
              </Button>
            </Box>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={1} idPrefix="analysis">
          {/* Analysis Results Panel */}
          <Box>
            <ThreatRating rating={analysisData.result.threatRating} confidence={analysisData.result.confidence} />

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
                <Tooltip title="Copy analysis to clipboard">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(analysisData.result.explanation)}
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.5, fontSize: "0.9rem" }}>
                {analysisData.result.explanation}
              </Typography>
            </Paper>

            {analysisData.result.flags && analysisData.result.flags.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? `${getThreatColor(analysisData.result.threatRating)}10`
                      : `${getThreatColor(analysisData.result.threatRating)}08`,
                  border: `1px solid ${getThreatColor(analysisData.result.threatRating)}30`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1.5,
                    fontWeight: 600,
                    color: getThreatColor(analysisData.result.threatRating),
                  }}
                >
                  Detected Indicators:
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                  {analysisData.result.flags.map((flag) => (
                    <Chip
                      key={flag}
                      label={flag}
                      size="small"
                      sx={{
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? `${getThreatColor(analysisData.result.threatRating)}20`
                            : `${getThreatColor(analysisData.result.threatRating)}15`,
                        color: getThreatColor(analysisData.result.threatRating),
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

            {analysisData.result.tokenUsage && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 2 }}
              >
                ~{analysisData.result.tokenUsage.totalTokens} tokens used (prompt: {analysisData.result.tokenUsage.promptTokens}, response: {analysisData.result.tokenUsage.completionTokens})
              </Typography>
            )}

            <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SwapHorizIcon />}
                onClick={() => setTabValue(0)}
                sx={{ textTransform: "none" }}
              >
                View Input
              </Button>
              <Typography variant="caption" color="textSecondary" sx={{ alignSelf: "center" }}>
                Threat Level: {analysisData.result.threatRating}/100
              </Typography>
            </Box>
          </Box>
        </TabPanel>
      </Box>
    </Box>
  )
}
