/**
 * Email Analysis Service
 * Coordinates email extraction, permission handling, and analysis
 */

import { checkEmailWithOpenAI, type EmailData } from "./fraudService"
import {
  extractEmailFromTab,
  showNotificationInGmail,
  showResultsOverlayInGmail,
} from "./gmailExtractor"
import { hasHostPermission, requestHostPermission } from "./permissionsService"

/**
 * Analyze the currently open email in Gmail
 * @param tabId The ID of the tab containing the email
 * @param apiKey OpenAI API key for analysis
 * @returns Promise resolving to the analysis result
 */
export async function analyzeCurrentEmail(
  tabId: number,
  apiKey: string
): Promise<{
  success: boolean
  result?: any
  message?: string
}> {
  try {
    // Check if we have permission for the tab URL
    const tab = await chrome.tabs.get(tabId)
    if (!tab.url) {
      throw new Error("Tab URL not found")
    }

    const hasPermission = await hasHostPermission(tab.url)
    if (!hasPermission) {
      // Try to request permission
      const granted = await requestHostPermission(tab.url)
      if (!granted) {
        return {
          success: false,
          message: "Permission required to analyze emails from this site",
        }
      }
    }

    // Extract email data from the tab
    const emailData = await extractEmailFromTab(tabId)

    // Check if extraction was successful
    if (!emailData.success) {
      await showNotificationInGmail(
        tabId,
        emailData.message || "Failed to extract email data",
        "error"
      )
      return {
        success: false,
        message: emailData.message || "Failed to extract email data",
      }
    }

    // Prepare data for OpenAI analysis
    const analysisData: EmailData = {
      sender: emailData.sender!,
      subject: emailData.subject || "No Subject",
      content: emailData.content!,
      timestamp: emailData.timestamp || new Date().toISOString(),
    }

    // Perform analysis with OpenAI
    const fraudResult = await checkEmailWithOpenAI(analysisData, apiKey)

    // Display results in Gmail UI
    await showResultsOverlayInGmail(tabId, fraudResult, analysisData)

    return {
      success: true,
      result: fraudResult,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error analyzing email"
    console.error("Error analyzing current email:", error)

    // Show error notification in Gmail
    try {
      await showNotificationInGmail(tabId, errorMessage, "error")
    } catch (notifyError) {
      console.error("Failed to show error notification:", notifyError)
    }

    return {
      success: false,
      message: errorMessage,
    }
  }
}

/**
 * Configure background script listeners for email analysis requests
 */
export function setupEmailAnalysisListeners(): void {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzeCurrentEmail") {
      // Get the API key from storage
      chrome.storage.local
        .get("openai_api_key")
        .then(async (storage) => {
          const apiKey = storage["openai_api_key"]

          if (!apiKey) {
            sendResponse({
              success: false,
              message: "API key required. Please set up your OpenAI API key in the settings.",
            })
            return
          }

          // Get the tab ID (either from the sender or from the active tab)
          let tabId: number | undefined
          if (sender.tab?.id) {
            tabId = sender.tab.id
          } else if (request.tabId) {
            tabId = request.tabId
          } else {
            // Try to get the active tab
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
            tabId = activeTab?.id
          }

          if (!tabId) {
            sendResponse({
              success: false,
              message: "No active tab found",
            })
            return
          }

          // Analyze the email
          const result = await analyzeCurrentEmail(tabId, apiKey)
          sendResponse(result)
        })
        .catch((error) => {
          console.error("Error getting API key:", error)
          sendResponse({
            success: false,
            message: "Failed to get API key",
          })
        })

      // Return true to indicate we'll send a response asynchronously
      return true
    }

    // Handle notification display request
    if (request.action === "showNotification") {
      chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
        if (tab?.id) {
          await showNotificationInGmail(
            tab.id,
            request.message || "Notification from FRED",
            request.type || "info"
          )
        }
      })
      return false // No response needed
    }
  })
}
