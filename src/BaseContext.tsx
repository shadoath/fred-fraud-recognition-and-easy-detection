import React, { type Dispatch, type SetStateAction, useMemo, useState } from "react"

type BaseContextType = {
  // State data
  display: DisplaType
  setDisplay: Dispatch<SetStateAction<DisplaType>>
}

export const Display = {
  home: "home",
} as const
type DisplaType = keyof typeof Display

const BaseContext = React.createContext<BaseContextType | undefined>(undefined)

export const BaseContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [display, setDisplay] = useState<DisplaType>(Display.home)

  const value = useMemo(() => {
    return {
      // State data
      display,
      setDisplay,
    }
  }, [
    // State data
    display,
  ])

  return <BaseContext.Provider value={value}>{children}</BaseContext.Provider>
}

export const useBaseContext = () => {
  const context = React.useContext(BaseContext)

  if (context === undefined) throw new Error("useBaseContext must be used in a context provider")

  return context
}
