import { BrightnessMedium } from "@mui/icons-material"
import { IconButton } from "@mui/material"
import { useCustomThemeContext } from "../../contexts/CustomThemeContext"

export const ToggleDarkModeButton = () => {
  const { toggleDarkMode, darkMode } = useCustomThemeContext()
  return (
    <IconButton
      onClick={toggleDarkMode}
      style={darkMode ? { transform: "scaleX(-1)" } : {}}
      sx={{
        color: (theme) => (darkMode ? theme.palette.common.white : theme.palette.common.black),
      }}
    >
      <BrightnessMedium />
    </IconButton>
  )
}
