import { CssBaseline, type Theme } from "@mui/material"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import React, { createContext, useEffect, useRef, useState } from "react"
import { darkTheme, getTheme } from "../lib/theme"

export const CustomThemeContext = createContext<{
  theme: Theme
  darkMode: boolean
  toggleDarkMode: () => void
  largeText: boolean
  toggleLargeText: () => void
}>({
  theme: createTheme(darkTheme),
  darkMode: false,
  toggleDarkMode: () => {},
  largeText: false,
  toggleLargeText: () => {},
})

export const CustomThemeContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkMode] = useState(() => {
    return true
  })
  const [largeText, setLargeText] = useState(false)

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const toggleLargeText = () => {
    setLargeText(!largeText)
  }

  // Run once on load to get theme if set in localStorage
  useEffect(() => {
    const preferredTheme = localStorage.getItem("preferred-theme")
    if (preferredTheme) {
      if (preferredTheme === "dark") {
        setDarkMode(true)
      } else {
        setDarkMode(false)
      }
    }
    const preferredTextSize = localStorage.getItem("preferred-text-size")
    setLargeText(preferredTextSize === "large")
  }, [])

  const firstUpdate = useRef(true)
  useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false
      return
    }
    localStorage.setItem("preferred-theme", darkMode ? "dark" : "light")
  }, [darkMode])

  const firstTextUpdate = useRef(true)
  useEffect(() => {
    if (firstTextUpdate.current) {
      firstTextUpdate.current = false
      return
    }
    localStorage.setItem("preferred-text-size", largeText ? "large" : "normal")
  }, [largeText])

  const theme = React.useMemo(() => createTheme(getTheme(darkMode, largeText)), [darkMode, largeText]) as Theme

  return (
    <CustomThemeContext.Provider
      value={{
        theme,
        darkMode,
        toggleDarkMode,
        largeText,
        toggleLargeText,
      }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CustomThemeContext.Provider>
  )
}

export const useCustomThemeContext = () => {
  return React.useContext(CustomThemeContext)
}
