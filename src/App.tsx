import "./App.css"
import { MainDisplay } from "./components/MainDisplay"
import { CustomSnackbarProvider } from "./contexts/CustomSnackbarContext"
import { CustomThemeContextProvider } from "./contexts/CustomThemeContext"

function App() {
  return (
    <CustomThemeContextProvider>
      <CustomSnackbarProvider>
        <MainDisplay />
      </CustomSnackbarProvider>
    </CustomThemeContextProvider>
  )
}

export default App
