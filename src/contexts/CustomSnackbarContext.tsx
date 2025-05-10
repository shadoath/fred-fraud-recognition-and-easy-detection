import { styled } from "@mui/material/styles"
import {
  type OptionsObject,
  SnackbarContent,
  type SnackbarMessage,
  SnackbarProvider as NotistackProvider,
  useSnackbar,
} from "notistack"
import type React from "react"
import { createContext, type ReactNode, useContext, useMemo } from "react"

interface CustomSnackbarContextProps {
  toast: {
    closeSnackbar: (key?: string | number) => void
    success: (message: SnackbarMessage, options?: OptionsObject) => void
    error: (message: SnackbarMessage, options?: OptionsObject) => void
    info: (message: SnackbarMessage, options?: OptionsObject) => void
    warning: (message: SnackbarMessage, options?: OptionsObject) => void
  }
}

const CustomSnackbarContext = createContext<CustomSnackbarContextProps | undefined>(undefined)

const InnerSnackbarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()

  const toast = useMemo(
    () => ({
      closeSnackbar,
      success: (message: SnackbarMessage, options?: OptionsObject) =>
        enqueueSnackbar(message, { variant: "success", ...options }),
      error: (message: SnackbarMessage, options?: OptionsObject) =>
        enqueueSnackbar(message, { variant: "error", ...options }),
      info: (message: SnackbarMessage, options?: OptionsObject) =>
        enqueueSnackbar(message, { variant: "info", ...options }),
      warning: (message: SnackbarMessage, options?: OptionsObject) =>
        enqueueSnackbar(message, { variant: "warning", ...options }),
    }),
    [enqueueSnackbar, closeSnackbar]
  )

  return (
    <CustomSnackbarContext.Provider value={{ toast }}>{children}</CustomSnackbarContext.Provider>
  )
}

export const CustomSnackbarProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <NotistackProvider
      maxSnack={2}
      Components={{
        // not working
        default: CustomSnackbarContent,
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <InnerSnackbarProvider>{children}</InnerSnackbarProvider>
    </NotistackProvider>
  )
}

export const useCustomSnackbar = (): CustomSnackbarContextProps => {
  const context = useContext(CustomSnackbarContext)
  if (!context) {
    throw new Error("useCustomSnackbar must be used within a CustomSnackbarProvider")
  }
  return context
}

const CustomSnackbarContent = styled(SnackbarContent)(({ theme }) => ({
  width: "auto", // Make the width auto to fit content
  minWidth: "unset", // Remove any minimum width restrictions
  padding: theme.spacing(0.25, 0.5), // Adjust the padding
  color: "pink",
  fontSize: "0.75rem", // Adjust the font size
  boxShadow: theme.shadows[2], // Optional: Adjust the shadow to make it less prominent
  borderRadius: theme.shape.borderRadius, // Apply consistent border radius
  display: "inline-flex", // Ensure the snackbar only takes up the space it needs
  alignItems: "center", // Center the content vertically
  [theme.breakpoints.up("sm")]: {
    minWidth: "75px", // Smaller width for larger screens
  },
}))
