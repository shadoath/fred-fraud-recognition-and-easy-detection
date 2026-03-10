import { Alert, Box, Chip, Paper, Typography, useTheme } from "@mui/material"
import { getThreatColor } from "../lib/threatUtils"

interface DetectedIndicatorsProps {
  flags: string[]
  threatRating: number
}

export const DetectedIndicators = ({ flags, threatRating }: DetectedIndicatorsProps) => {
  const theme = useTheme()
  const color = getThreatColor(threatRating)

  if (flags.length === 0) return null

  return (
    <Box sx={{ m: "20px", p: 0 }}>
      <Alert
        severity={threatRating > 70 ? "error" : threatRating > 30 ? "warning" : "info"}
        icon={false}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              mb: 1.2,
              fontWeight: 600,
              color,
            }}
          >
            Detected Indicators:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 0, mt: 0, color }}>
            {flags.map((flag) => (
              <li
                key={flag}
                style={{
                  fontSize: "0.95em",
                  lineHeight: 1.6,
                  marginBottom: 2,
                  listStyleType: "disc",
                }}
              >
                {flag}
              </li>
            ))}
          </Box>
        </Box>
      </Alert>
    </Box>
  )
}
