import { Box, Fade } from "@mui/material"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
  idPrefix?: string
  timeout?: number
}

export const TabPanel = ({
  children,
  value,
  index,
  idPrefix = "tab",
  timeout = 300,
  ...other
}: TabPanelProps) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`${idPrefix}-tabpanel-${index}`}
    aria-labelledby={`${idPrefix}-tab-${index}`}
    {...other}
    style={{
      width: "100%",
      height: "100%",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: "auto",
    }}
  >
    {value === index && (
      <Fade in={value === index} timeout={timeout}>
        <Box sx={{ p: 2, height: "100%", boxSizing: "border-box" }}>{children}</Box>
      </Fade>
    )}
  </div>
)
