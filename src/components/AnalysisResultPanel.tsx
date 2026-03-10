import { Box, Button } from "@mui/material"
import type { ReactNode } from "react"
import { DetectedIndicators } from "./DetectedIndicators"
import { ThreatRating } from "./ThreatRating"

interface AnalysisResultPanelProps {
  result: {
    threatRating: number
    explanation: string
    flags?: string[]
  }
  onReset: () => void
  resetLabel: string
  // Rendered between ThreatRating and DetectedIndicators
  headerContent?: ReactNode
  // Rendered between DetectedIndicators and the reset button
  footerContent?: ReactNode
}

export const AnalysisResultPanel = ({
  result,
  onReset,
  resetLabel,
  headerContent,
  footerContent,
}: AnalysisResultPanelProps) => (
  <Box sx={{ width: "100%" }}>
    <ThreatRating rating={result.threatRating} explanation={result.explanation} />

    {headerContent}

    {result.flags && result.flags.length > 0 && (
      <DetectedIndicators flags={result.flags} threatRating={result.threatRating} />
    )}

    {footerContent}

    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={onReset}
        sx={{ borderRadius: 2, textTransform: "none", boxShadow: 2 }}
        size="medium"
      >
        {resetLabel}
      </Button>
    </Box>
  </Box>
)
