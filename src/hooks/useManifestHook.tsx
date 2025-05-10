import { useMemo } from "react"

export const useManifestHook = () => {
  return useMemo(() => {
    return chrome.runtime.getManifest()
  }, [])
}
