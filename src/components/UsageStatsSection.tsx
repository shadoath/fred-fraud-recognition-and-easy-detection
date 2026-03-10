import BarChartIcon from "@mui/icons-material/BarChart"
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useTheme,
} from "@mui/material"
import { useState } from "react"
import { useApiKey } from "../hooks/useApiKey"
import { FREE_CHECKS_PER_MONTH, PAID_CHECKS_PER_MONTH } from "../lib/fraudService"
import { getUsageStats } from "../lib/usageStorage"

type UsageStats = {
  allTimeChecks: number
  allTimeThreats: number
  monthlyChecks: number
  monthlyThreats: number
}

const StatRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 1.25,
        px: 2,
        borderBottom: "1px solid #E0E0E0",
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
        {value}
      </Typography>
    </Box>
  )
}

export const UsageStatsSection = () => {
  const [open, setOpen] = useState(false)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const { connectionMode, isPaidUser } = useApiKey()

  const handleOpen = () => {
    getUsageStats().then(setUsageStats)
    setOpen(true)
  }

  const monthLimit = isPaidUser ? PAID_CHECKS_PER_MONTH : FREE_CHECKS_PER_MONTH

  return (
    <>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Button
          size="small"
          startIcon={<BarChartIcon fontSize="small" />}
          onClick={handleOpen}
          variant="outlined"
          sx={{
            textTransform: "none",
            fontSize: "0.8125rem",
            fontWeight: 600,
            borderColor: "divider",
            color: "text.secondary",
            "&:hover": {
              borderColor: "#F5A623",
              color: "#F5A623",
              bgcolor: "rgba(245, 166, 35, 0.08)",
            },
          }}
        >
          Your stats
        </Button>
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            m: 2,
            width: "100%",
            maxWidth: 340,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 0,
            pt: 2,
            px: 2.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: "1.125rem",
            fontWeight: 600,
          }}
        >
          <BarChartIcon sx={{ color: "#F5A623", fontSize: 28 }} />
          Your Stats
        </DialogTitle>
        <DialogContent sx={{ pt: 2, px: 0, pb: 1 }}>
          {usageStats ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <StatRow label="All-time checks" value={String(usageStats.allTimeChecks)} />
              <StatRow label="Threats caught" value={String(usageStats.allTimeThreats)} />
              {connectionMode === "proxy" && (
                <StatRow
                  label="Used this month"
                  value={`${usageStats.monthlyChecks} / ${monthLimit}`}
                />
              )}
            </Box>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, pt: 1 }}>
          <Button
            onClick={() => setOpen(false)}
            size="small"
            variant="contained"
            sx={{ bgcolor: "#F5A623", "&:hover": { bgcolor: "#e0941a" } }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
