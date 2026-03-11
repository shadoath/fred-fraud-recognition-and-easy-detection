import { CssBaseline, GlobalStyles, type Theme } from "@mui/material"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import React, { createContext, useEffect, useRef, useState } from "react"
import { getTheme } from "../lib/theme"

export const DEFAULT_TEXT_SIZE = 14

export const CustomThemeContext = createContext<{
  theme: Theme
  textSize: number
  setTextSize: (size: number) => void
}>({
  theme: createTheme(getTheme()),
  textSize: DEFAULT_TEXT_SIZE,
  setTextSize: () => {},
})

export const CustomThemeContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [textSize, setTextSizeState] = useState(DEFAULT_TEXT_SIZE)

  // Run once on load to get text size preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("preferred-text-size")
    if (stored === "large") {
      setTextSizeState(16)
    } else if (stored === "normal") {
      setTextSizeState(14)
    } else {
      const parsed = Number(stored)
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 20) setTextSizeState(parsed)
    }
  }, [])

  const firstTextUpdate = useRef(true)
  useEffect(() => {
    if (firstTextUpdate.current) {
      firstTextUpdate.current = false
      return
    }
    localStorage.setItem("preferred-text-size", String(textSize))
  }, [textSize])

  const setTextSize = (size: number) => setTextSizeState(size)

  const theme = React.useMemo(() => createTheme(getTheme(textSize)), [textSize]) as Theme

  return (
    <CustomThemeContext.Provider
      value={{
        theme,
        textSize,
        setTextSize,
      }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={() => ({
            "html, body": {
              margin: "0 !important",
              padding: "0 !important",
              width: "420px !important",
              height: "600px !important",
              overflow: "hidden !important",
              overflowX: "hidden !important",
              background: "transparent !important",
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              textRendering: "optimizeLegibility",
            },
            "#root": {
              width: "420px",
              height: "600px",
              margin: 0,
              padding: 0,
              overflow: "hidden",
              overflowX: "hidden",
            },
            "a": {
              textDecoration: "inherit",
              color: "inherit",
            },
            "::-webkit-scrollbar": { width: "6px" },
            "::-webkit-scrollbar-track": { background: "transparent" },
            "::-webkit-scrollbar-thumb": {
              background: "rgba(0,0,0,0.2)",
              borderRadius: "3px",
            },
            "::-webkit-scrollbar-thumb:hover": {
              background: "rgba(0,0,0,0.3)",
            },
          })}
        />
        {children}
      </ThemeProvider>
    </CustomThemeContext.Provider>
  )
}

export const useCustomThemeContext = () => {
  return React.useContext(CustomThemeContext)
}
