import { Box } from "@mui/material"
import type { ReactNode } from "react"
import { DetectedIndicators } from "./DetectedIndicators"
import { ThreatRating } from "./ThreatRating"

interface AnalysisResultPanelProps {
  result: {
    threatRating: number
    explanation: string
    flags?: string[]
  }
  // Rendered between ThreatRating and DetectedIndicators
  headerContent?: ReactNode
  // Rendered after DetectedIndicators
  footerContent?: ReactNode
}

export const AnalysisResultPanel = ({
  result,
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
  </Box>
)
