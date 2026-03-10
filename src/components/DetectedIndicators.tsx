import { Box, Chip, Paper, Typography, useTheme } from "@mui/material"
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
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        backgroundColor: theme.palette.mode === "dark" ? `${color}10` : `${color}08`,
        border: `1px solid ${color}30`,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color }}>
        Detected Indicators:
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
        {flags.map((flag) => (
          <Chip
            key={flag}
            label={flag}
            size="small"
            sx={{
              backgroundColor: theme.palette.mode === "dark" ? `${color}20` : `${color}15`,
              color,
              borderRadius: 1,
              fontSize: "0.75rem",
              "& .MuiChip-label": { px: 1 },
            }}
          />
        ))}
      </Box>
    </Paper>
  )
}
