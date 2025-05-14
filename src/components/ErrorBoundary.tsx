import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import RefreshIcon from "@mui/icons-material/Refresh"
import { Box, Button, Paper, Typography, useTheme } from "@mui/material"
import React, { Component, type ErrorInfo, type ReactNode } from "react"
import { useCustomSnackbar } from "../contexts/CustomSnackbarContext"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error boundary component that catches JavaScript errors in its child component tree
 * and displays a fallback UI instead of crashing the whole application.
 */
class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo)
    this.setState({
      errorInfo,
    })
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback
      }

      // Default fallback UI
      return <ErrorFallback error={error} resetErrorBoundary={this.resetErrorBoundary} />
    }

    return children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  resetErrorBoundary: () => void
}

/**
 * Default fallback UI component for the error boundary
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const theme = useTheme()
  const { toast } = useCustomSnackbar()

  React.useEffect(() => {
    // Show a toast notification when an error occurs
    if (error) {
      toast.error("An error occurred in the application")
    }
  }, [error, toast])

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        m: 2,
        borderRadius: 2,
        backgroundColor:
          theme.palette.mode === "dark" ? "rgba(255,0,0,0.05)" : "rgba(255,0,0,0.03)",
        border: "1px solid rgba(255,0,0,0.1)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <ErrorOutlineIcon color="error" sx={{ mr: 1, fontSize: "1.5rem" }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
          Something went wrong
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
        An unexpected error occurred in this component. The application is still usable, but this
        feature may not function correctly until it's fixed.
      </Typography>

      {error && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2,
            backgroundColor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)",
            borderRadius: 1,
            fontFamily: "monospace",
            fontSize: "0.8rem",
            overflowX: "auto",
          }}
        >
          <code>{error.toString()}</code>
        </Paper>
      )}

      <Button
        variant="contained"
        color="primary"
        size="small"
        startIcon={<RefreshIcon />}
        onClick={resetErrorBoundary}
        sx={{ borderRadius: 2, textTransform: "none" }}
      >
        Try Again
      </Button>
    </Paper>
  )
}

/**
 * HOC that wraps the ErrorBoundaryClass to allow hooks in the fallback UI
 */
export const ErrorBoundary: React.FC<Props> = (props) => {
  return <ErrorBoundaryClass {...props} />
}
