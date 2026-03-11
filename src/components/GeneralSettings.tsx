import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import TuneIcon from "@mui/icons-material/Tune"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Fade,
  FormControlLabel,
  Slider,
  Switch,
  Typography,
  useTheme,
} from "@mui/material"
import { useEffect, useState } from "react"
import { useCustomThemeContext } from "../contexts/CustomThemeContext"
import { useApiKey } from "../hooks/useApiKey"
import {
  type AutoScanSettings,
  DEFAULT_AUTO_SCAN_SETTINGS,
  getAutoScanSettings,
  saveAutoScanSettings,
} from "../lib/autoScanStorage"

const TEXT_SIZE_MARKS = [
  { value: 12, label: "S" },
  { value: 14, label: "M" },
  { value: 16, label: "L" },
  { value: 18, label: "XL" },
]

export const GeneralSettings = () => {
  const theme = useTheme()
  const { textSize, setTextSize } = useCustomThemeContext()
  const { connectionMode, isPaidUser } = useApiKey()
  const [autoScan, setAutoScan] = useState<AutoScanSettings>(DEFAULT_AUTO_SCAN_SETTINGS)

  useEffect(() => {
    getAutoScanSettings().then(setAutoScan)
  }, [])

  const handleAutoScanToggle = async (updated: AutoScanSettings) => {
    setAutoScan(updated)
    await saveAutoScanSettings(updated)
  }

  return (
    <Fade in={true} timeout={400}>
      <Accordion
        defaultExpanded
        disableGutters
        sx={{
          mb: 2,
          borderRadius: "8px !important",
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "none",
          backgroundColor: "#ffffff",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, px: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TuneIcon sx={{ color: theme.palette.primary.main, fontSize: "1.2rem" }} />
            <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>General Settings</Typography>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
          {/* Text size */}
          <Box sx={{ py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.875rem", mb: 1 }}>
              Text size
            </Typography>
            <Box sx={{ px: 1 }}>
              <Slider
                value={textSize}
                min={12}
                max={18}
                step={null}
                marks={TEXT_SIZE_MARKS}
                onChange={(_e, val) => setTextSize(val as number)}
                sx={{
                  color: theme.palette.primary.main,
                  "& .MuiSlider-markLabel": { fontSize: "0.75rem" },
                }}
              />
            </Box>
          </Box>

          {/* Gmail Auto-scan */}
          <Box sx={{ pt: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, pb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Gmail Auto-scan
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {connectionMode === "proxy" && !isPaidUser
                    ? "Requires FRED Premium or your own API key"
                    : "Automatically scans emails as you open them"}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={autoScan.enabled}
                    disabled={connectionMode === "proxy" && !isPaidUser}
                    onChange={(e) => handleAutoScanToggle({ ...autoScan, enabled: e.target.checked })}
                  />
                }
                label=""
                sx={{ m: 0 }}
              />
            </Box>
            {connectionMode === "proxy" && !isPaidUser && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Free users can still use the manual "Scan this email" button in Gmail.
              </Typography>
            )}
          </Box>

          {/* Website Auto-scan */}
          <Box sx={{ pt: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Website Auto-scan
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {connectionMode === "proxy" && !isPaidUser
                    ? "Requires FRED Premium or your own API key"
                    : "Automatically scans pages when you open the popup"}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={autoScan.autoScanPages}
                    disabled={connectionMode === "proxy" && !isPaidUser}
                    onChange={(e) => handleAutoScanToggle({ ...autoScan, autoScanPages: e.target.checked })}
                  />
                }
                label=""
                sx={{ m: 0 }}
              />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Fade>
  )
}
