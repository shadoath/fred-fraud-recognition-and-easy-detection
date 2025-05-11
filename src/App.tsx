import "./App.css"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { MainDisplay } from "./components/MainDisplay"
import { CustomSnackbarProvider } from "./contexts/CustomSnackbarContext"
import { CustomThemeContextProvider } from "./contexts/CustomThemeContext"

function App() {
  return (
    <CustomThemeContextProvider>
      <CustomSnackbarProvider>
        <ErrorBoundary>
          <MainDisplay />
        </ErrorBoundary>
      </CustomSnackbarProvider>
    </CustomThemeContextProvider>
  )
}

export default App
