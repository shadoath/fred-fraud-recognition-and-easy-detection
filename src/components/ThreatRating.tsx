import SecurityIcon from "@mui/icons-material/Security"
import ShieldIcon from "@mui/icons-material/Shield"
import WarningIcon from "@mui/icons-material/Warning"
import { Box, LinearProgress, Paper, Rating, Tooltip, Typography, useTheme } from "@mui/material"
import { useState } from "react"

interface ThreatRatingProps {
  rating: number // 1-10 scale
  readOnly?: boolean
  onRatingChange?: (newRating: number) => void
}

export const ThreatRating = ({ rating, readOnly = true, onRatingChange }: ThreatRatingProps) => {
  const [hover, setHover] = useState(-1)
  const theme = useTheme()

  // Convert 1-10 scale to 1-5 for MUI Rating component
  const normalizedRating = Math.ceil(rating / 2)

  // Get color based on threat level
  const getThreatColor = (rating: number): string => {
    if (rating <= 3) return "#4caf50" // Green for low threat
    if (rating <= 7) return "#ff9800" // Orange for medium threat
    return "#f44336" // Red for high threat
  }

  // Get threat level text
  const getThreatLevelText = (rating: number): string => {
    if (rating <= 3) return "Low Threat"
    if (rating <= 7) return "Medium Threat"
    return "High Threat"
  }

  // Handle rating change (if not read-only)
  const handleRatingChange = (_: React.SyntheticEvent, newValue: number | null) => {
    if (!readOnly && onRatingChange && newValue) {
      // Convert back to 1-10 scale
      onRatingChange(newValue * 2)
    }
  }

  const ratingColor = getThreatColor(rating)
  const ratingText = threatLevels[rating as keyof typeof threatLevels]

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
              {rating}/10
            </Typography>
          </Tooltip>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <Tooltip title="Safe" arrow placement="top">
            <SecurityIcon sx={{ color: "#4caf50", mr: 1 }} />
          </Tooltip>
          <LinearProgress
            variant="determinate"
            value={rating * 10}
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
                  color: getThreatColor(hover !== -1 ? hover * 2 : rating),
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
      </Box>
    </Paper>
  )
}

// Threat level descriptors for reference
export const threatLevels = {
  1: "Very Safe",
  2: "Safe",
  3: "Likely Safe",
  4: "Mild Concern",
  5: "Some Concern",
  6: "Moderate Concern",
  7: "Concerning",
  8: "Highly Suspicious",
  9: "Dangerous",
  10: "Very Dangerous",
}
