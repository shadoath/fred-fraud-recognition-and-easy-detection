import { createTheme, type PaletteOptions, type ThemeOptions } from "@mui/material/styles"

export const fredBlue = "#1D5AEF"
export const fredRed = "#FF4F4F"
export const fredYellow = "#FFD93B"
export const fredGreen = "#2ECC71"

export const baseTheme = createTheme({
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    button: {
      textTransform: "none",
    },
    h1: {
      fontSize: "3rem",
      fontWeight: 500,
    },
    h2: {
      fontSize: "2.5rem",
      fontWeight: 500,
    },
    h3: {
      fontSize: "2rem",
      fontWeight: 500,
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 500,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 500,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 500,
    },
    body1: {
      fontSize: "1rem",
    },
    body2: {
      fontSize: "0.875rem",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          margin: "0 4px",
          padding: "4px 8px",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: "8px",
          margin: "4px",
        },
      },
    },
    // Make muiTab hover a light green
    MuiTab: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "#e0f7fa",
          },
        },
      },
    },
  },
})
const lightPalette: PaletteOptions = {
  mode: "light",
  background: {
    default: "#FFFFFF",
    paper: "#F5F5F5",
  },
  text: {
    primary: "#000000",
    secondary: "#555555",
  },
  primary: {
    main: fredBlue,
  },
  secondary: {
    main: fredRed,
  },
  warning: {
    main: fredYellow,
  },
  success: {
    main: fredGreen,
  },
}

const lightTheme: ThemeOptions = {
  ...baseTheme,
  palette: lightPalette,
}

const darkPalette: PaletteOptions = {
  mode: "dark",
  primary: {
    main: fredBlue,
  },
  secondary: {
    main: fredRed,
  },
  warning: {
    main: fredYellow,
  },
  success: {
    main: fredGreen,
  },
  background: {
    default: "#121212",
    paper: "#1D1D1D",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#B3B3B3",
  },
}
const darkTheme: ThemeOptions = {
  ...baseTheme,
  palette: darkPalette,
}

const getTheme = (darkMode: boolean): ThemeOptions => ({
  ...(darkMode ? darkTheme : lightTheme),
})

export { darkTheme, getTheme, lightTheme }
