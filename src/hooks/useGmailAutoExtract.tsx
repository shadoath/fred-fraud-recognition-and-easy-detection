import { useEffect, useState } from "react"
import { devError } from "../lib/devUtils"
import { extractLinksFromContent } from "../lib/fraudService"

interface GmailEmailData {
  sender: string
  subject: string
  content: string
  htmlContent: string
  timestamp: string
  links: string[]
}

interface UseGmailAutoExtractResult {
  isExtracting: boolean
  extractedData: GmailEmailData | null
  error: string | null
  isGmail: boolean
  retryExtraction: () => void
}

export const useGmailAutoExtract = (): UseGmailAutoExtractResult => {
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<GmailEmailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGmail, setIsGmail] = useState(false)

  const extractGmailContent = async (): Promise<void> => {
    setIsExtracting(true)
    setError(null)

    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tabs[0]?.id) {
        throw new Error("No active tab found")
      }

      const currentTab = tabs[0]
      const url = currentTab.url || ""

      // Check if we're on Gmail
      if (!url.includes("mail.google.com")) {
        setIsGmail(false)
        setExtractedData(null)
        return
      }

      setIsGmail(true)

      // Check if we have permission to access this tab
      try {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id! },
          func: () => {
            // Simple test to see if we can execute scripts
            return true
          },
        })
      } catch (permissionError) {
        throw new Error(
          "Permission required. Please make sure you've allowed this extension to access Gmail."
        )
      }

      // Extract the email data using content script
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id! },
        func: () => {
          try {
            // Gmail-specific selectors for extracting email content
            const email1 = document
              .querySelector("[data-message-id] [email]")
              ?.getAttribute("email")
            const email2 = document.querySelector(".gE [email]")?.getAttribute("email")
            const email3 = document.querySelector(".gD [email]")?.getAttribute("email")
            const email4 = document
              .querySelector("[data-hovercard-id]")
              ?.getAttribute("data-hovercard-id")
            const email5 = document.querySelector(".go")?.textContent?.trim()
            const sender = email1 || email2 || email3 || email4 || email5

            // Extract subject
            const subject =
              document.querySelector(".ha h2")?.textContent ||
              document.querySelector("[data-message-id] .hP")?.textContent

            // Extract content
            const content =
              document
                .querySelector("[data-message-id] .a3s.aiL")
                ?.textContent?.replace(/\n+/g, " ")
                .trim() || document.querySelector(".a3s")?.textContent?.replace(/\n+/g, " ").trim()
            const htmlContent = document.querySelector("[data-message-id] .a3s.aiL")?.innerHTML

            if (sender && content) {
              return {
                success: true,
                sender,
                subject: subject || "No Subject",
                content,
                htmlContent,
                timestamp: new Date().toISOString(),
              }
            } else {
              return {
                success: false,
                message: "Could not extract email data. Make sure you have an email open in Gmail.",
              }
            }
          } catch (error) {
            return {
              success: false,
              message:
                "Error extracting email: " +
                (error instanceof Error ? error.message : String(error)),
            }
          }
        },
      })

      const extractResult = result.result || null

      if (!extractResult || !extractResult.success) {
        throw new Error(extractResult?.message || "Failed to extract email content from Gmail")
      }

      // Extract links from the content (use HTML parsing for Gmail emails)
      const links = extractLinksFromContent(
        extractResult.htmlContent || extractResult.content || "",
        true
      )

      // Set the extracted data
      const emailData: GmailEmailData = {
        sender: extractResult.sender || "",
        subject: extractResult.subject || "No Subject",
        content: extractResult.content || "",
        htmlContent: extractResult.htmlContent || extractResult.content || "",
        timestamp: extractResult.timestamp || new Date().toISOString(),
        links,
      }

      setExtractedData(emailData)
    } catch (error) {
      devError("Gmail extraction error:", error)

      if (error instanceof Error) {
        const errorMsg = error.message || ""

        if (errorMsg.includes("Permission")) {
          setError(
            "Permission required to access Gmail. Please reload the Gmail page and try again."
          )
        } else if (errorMsg.includes("Could not extract email data")) {
          setError("No email content found. Please open an email in Gmail first.")
        } else if (
          errorMsg.includes("Connection") ||
          errorMsg.includes("Receiving end does not exist")
        ) {
          setError("Connection to Gmail failed. Try refreshing the Gmail page.")
        } else {
          setError(errorMsg)
        }
      } else {
        setError("Failed to extract email from Gmail. Please make sure you have an email open.")
      }
    } finally {
      setIsExtracting(false)
    }
  }

  const retryExtraction = () => {
    extractGmailContent()
  }

  // Auto-extract when hook is first used
  useEffect(() => {
    extractGmailContent()
  }, []) // Empty dependency array means this runs once on mount

  return {
    isExtracting,
    extractedData,
    error,
    isGmail,
    retryExtraction,
  }
}
