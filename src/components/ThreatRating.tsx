import SecurityIcon from "@mui/icons-material/Security"
import ShieldIcon from "@mui/icons-material/Shield"
import WarningIcon from "@mui/icons-material/Warning"
import { Box, LinearProgress, Paper, Rating, Tooltip, Typography, useTheme } from "@mui/material"
import { useState } from "react"

interface ThreatRatingProps {
  rating: number // 1-100 scale
  readOnly?: boolean
  onRatingChange?: (newRating: number) => void
  confidence?: number
}

export const getThreatColor = (rating: number): string => {
  if (rating <= 30) return "#4caf50"
  if (rating <= 70) return "#ff9800"
  return "#f44336"
}

export const getThreatLevelFromScore = (score: number): string => {
  if (score <= 10) return "Very Safe"
  if (score <= 20) return "Safe"
  if (score <= 30) return "Likely Safe"
  if (score <= 40) return "Mild Concern"
  if (score <= 50) return "Some Concern"
  if (score <= 60) return "Moderate Concern"
  if (score <= 70) return "Concerning"
  if (score <= 80) return "Highly Suspicious"
  if (score <= 90) return "Dangerous"
  return "Very Dangerous"
}

export const ThreatRating = ({ rating, readOnly = true, onRatingChange, confidence }: ThreatRatingProps) => {
  const [hover, setHover] = useState(-1)
  const theme = useTheme()

  // Convert 1-100 scale to 1-5 for MUI Rating component
  const normalizedRating = Math.ceil(rating / 20)

  // Get threat level text
  const getThreatLevelText = (rating: number): string => {
    if (rating <= 30) return "Low Threat"
    if (rating <= 70) return "Medium Threat"
    return "High Threat"
  }

  // Handle rating change (if not read-only)
  const handleRatingChange = (_: React.SyntheticEvent, newValue: number | null) => {
    if (!readOnly && onRatingChange && newValue) {
      // Convert back to 1-100 scale
      onRatingChange(newValue * 20)
    }
  }

  const ratingColor = getThreatColor(rating)
  const ratingText = getThreatLevelFromScore(rating)

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.background.paper,
        transition: "all 0.3s ease",
      }}
    >
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShieldIcon sx={{ color: ratingColor, fontSize: "1.5rem" }} />
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                fontSize: "1rem",
              }}
            >
              {getThreatLevelText(rating)}
            </Typography>
          </Box>

          <Tooltip title={ratingText} arrow placement="top">
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: ratingColor,
                display: "flex",
                alignItems: "center",
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                backgroundColor: `${ratingColor}15`,
                border: `1px solid ${ratingColor}30`,
                fontSize: "1.125rem",
              }}
            >
              {rating}/100
            </Typography>
          </Tooltip>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <Tooltip title="Safe" arrow placement="top">
            <SecurityIcon sx={{ color: "#4caf50", mr: 1 }} />
          </Tooltip>
          <LinearProgress
            variant="determinate"
            value={rating}
            sx={{
              height: 12,
              borderRadius: 6,
              width: "100%",
              backgroundColor:
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: ratingColor,
                borderRadius: 6,
                transition: "transform 1s cubic-bezier(0.4, 0, 0.2, 1)",
              },
            }}
          />
          <Tooltip title="Dangerous" arrow placement="top">
            <WarningIcon sx={{ color: "#f44336", ml: 1 }} />
          </Tooltip>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mt: 1,
            p: 0.5,
            borderRadius: 1,
            backgroundColor:
              theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
          }}
        >
          <Rating
            value={normalizedRating}
            readOnly={readOnly}
            onChange={handleRatingChange}
            onChangeActive={(_, newHover) => {
              if (!readOnly) {
                setHover(newHover)
              }
            }}
            icon={
              <WarningIcon
                style={{
                  width: "24px",
                  height: "24px",
                  color: getThreatColor(hover !== -1 ? hover * 20 : rating),
                }}
              />
            }
            emptyIcon={
              <WarningIcon
                style={{
                  width: "24px",
                  height: "24px",
                  color:
                    theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)",
                }}
              />
            }
          />
        </Box>

        <Typography
          variant="body2"
          align="center"
          sx={{
            mt: 1,
            fontSize: "0.75rem",
            color: theme.palette.text.secondary,
            fontStyle: "italic",
          }}
        >
          {ratingText}
        </Typography>

        {typeof confidence === "number" && (
          <Typography
            variant="caption"
            align="center"
            sx={{
              display: "block",
              mt: 0.5,
              color: "text.secondary",
              fontStyle: "italic",
            }}
          >
            Confidence: {Math.round(confidence * 100)}%
          </Typography>
        )}
      </Box>
    </Paper>
  )
}

