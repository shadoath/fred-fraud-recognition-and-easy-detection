import SecurityIcon from "@mui/icons-material/Security"
import WarningIcon from "@mui/icons-material/Warning"
import { Box, LinearProgress, Paper, Typography, useTheme } from "@mui/material"

interface ThreatRatingProps {
  rating: number // 1-100 scale
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

export const ThreatRating = ({ rating }: ThreatRatingProps) => {
  const theme = useTheme()

  const getThreatLevelText = (rating: number): string => {
    if (rating <= 30) return "Low Risk"
    if (rating <= 70) return "Medium Risk"
    return "High Risk"
  }

  const getVerdictText = (rating: number): string => {
    if (rating <= 30) return "✓ Looks Safe"
    if (rating <= 70) return "⚠ Be Careful"
    return "✗ Likely a Scam"
  }

  const getActionableAdvice = (rating: number): string => {
    if (rating <= 30) {
      return "This content appears safe. No action needed, but always stay alert."
    }
    if (rating <= 70) {
      return "Proceed carefully. Do not click links unless you are certain where they lead. Do not share personal information. When in doubt, contact the sender using a phone number you already know."
    }
    return "Do not click any links. Do not reply. Never share passwords, account numbers, or personal details. If this claims to be from your bank or government, call them directly using the number on the back of your card or their official website."
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
        {/* Verdict Banner */}
        <Box
          sx={{
            borderRadius: 2,
            p: 1.5,
            mb: 2,
            backgroundColor: `${ratingColor}25`,
            border: `1px solid ${ratingColor}60`,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: ratingColor,
            }}
          >
            {getVerdictText(rating)}
          </Typography>
        </Box>

        {/* Threat Level Label and Score */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              fontSize: "1rem",
            }}
          >
            {getThreatLevelText(rating)}
          </Typography>

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
        </Box>

        {/* Progress Bar */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <SecurityIcon sx={{ color: "#4caf50", mr: 1 }} />
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
          <WarningIcon sx={{ color: "#f44336", ml: 1 }} />
        </Box>

        {/* Rating Caption */}
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

        {/* What should you do? Box */}
        <Box
          sx={{
            mt: 2,
            borderRadius: 2,
            p: 1.5,
            backgroundColor: `${ratingColor}15`,
            border: `1px solid ${ratingColor}40`,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontSize: "0.8rem",
              mb: 0.5,
              color: ratingColor,
            }}
          >
            What should you do?
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.85rem",
              lineHeight: 1.5,
              color: theme.palette.text.primary,
            }}
          >
            {getActionableAdvice(rating)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}
