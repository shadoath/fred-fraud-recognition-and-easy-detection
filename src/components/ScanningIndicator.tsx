import { Box, LinearProgress, Typography, useTheme } from "@mui/material"
import { useEffect, useState } from "react"

const MESSAGES = [
  "Analyzing content…",
  "Checking for fraud patterns…",
  "Evaluating suspicious indicators…",
  "Assessing threat level…",
  "Almost there…",
]

export const ScanningIndicator = () => {
  const theme = useTheme()
  const [messageIndex, setMessageIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMessageIndex((i) => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, 300)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: 260,
        gap: 3,
        px: 3,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor:
            theme.palette.mode === "dark" ? "rgba(245,166,35,0.12)" : "rgba(245,166,35,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "fredPulse 1.8s ease-in-out infinite",
          "@keyframes fredPulse": {
            "0%, 100%": { transform: "scale(1)", opacity: 0.8 },
            "50%": { transform: "scale(1.1)", opacity: 1 },
          },
        }}
      >
        <Box
          component="img"
          src="/fred-logo.png"
          alt="Scanning"
          sx={{ width: 48, height: 48, objectFit: "contain" }}
        />
      </Box>

      <Box sx={{ width: "100%", maxWidth: 280 }}>
        <LinearProgress
          sx={{
            borderRadius: 4,
            height: 4,
            backgroundColor:
              theme.palette.mode === "dark" ? "rgba(245,166,35,0.15)" : "rgba(245,166,35,0.2)",
            "& .MuiLinearProgress-bar": { backgroundColor: "#F5A623" },
          }}
        />
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          fontWeight: 500,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          textAlign: "center",
        }}
      >
        {MESSAGES[messageIndex]}
      </Typography>
    </Box>
  )
}
