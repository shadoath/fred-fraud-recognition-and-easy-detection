/**
 * Gmail Email Extraction Service
 * Handles extracting email data from Gmail via chrome.scripting.executeScript
 * Moved from the content script to enable TypeScript and code reuse
 */

// Define Gmail UI version enum
export enum GmailVersion {
  UNKNOWN = "unknown",
  CLASSIC = "classic",
  MODERN = "modern",
  NEW = "new",
}

// Email extraction response interface
export interface EmailExtractResponse {
  success: boolean
  sender?: string
  subject?: string
  content?: string
  timestamp?: string
  message?: string
  metadata?: {
    gmailVersion: GmailVersion
    extractionMethod: string
  }
  partialData?: {
    sender: string | null
    subject: string | null
    contentFound: boolean
    gmailVersion: GmailVersion
  }
  error?: {
    name: string
    message: string
    stack: string | null
    gmailVersion: GmailVersion
  }
}

/**
 * Main function to extract email data from the current tab
 * Uses chrome.scripting.executeScript to inject and run extraction code
 * @param tabId The ID of the tab to extract email data from
 * @returns Promise resolving to the extracted email data
 */
export async function extractEmailFromTab(tabId: number): Promise<EmailExtractResponse> {
  try {
    // Execute the extraction script in the content context
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractEmailData,
    })

    return result.result as EmailExtractResponse
  } catch (error) {
    console.error("Error executing email extraction script:", error)
    return {
      success: false,
      message: `Failed to extract email data: ${(error as Error).message}`,
    }
  }
}

/**
 * Function that will be injected into the page via executeScript
 * Handles the actual DOM traversal and data extraction
 * @returns The extracted email data
 */
function extractEmailData(): EmailExtractResponse {
  try {
    const gmailVersion = detectGmailVersion()
    console.log("FRED - Detected Gmail version:", gmailVersion)

    // Extract email sender with multiple fallback methods
    const senderSelectors = [
      // Primary selectors
      "[data-message-id] [email]",
      "[role='main'] [data-message-id] [email]",
      // Fallback selectors for different Gmail versions
      ".gD [email]",
      ".gE [email]",
      "[data-hovercard-id]",
      // Last resort - try to find any element with an email attribute
      "[email]",
    ]

    // Try each selector until we find a match
    let sender = null
    for (const selector of senderSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        sender = element.getAttribute("email") || element.textContent
        if (sender) break
      }
    }

    // If still no sender, try to extract from the From field text
    if (!sender) {
      const fromLabels = Array.from(document.querySelectorAll(".adn .gE, .adn .gF"))
      for (const label of fromLabels) {
        if (label.textContent?.includes("@")) {
          // Extract email using regex
          const emailMatch = label.textContent.match(/[\w.-]+@[\w.-]+\.\w+/)
          if (emailMatch) {
            sender = emailMatch[0]
            break
          }
        }
      }
    }

    // Extract email subject with improved selector chain
    const subjectSelectors = [
      // Primary selectors
      ".ha h2",
      "[data-message-id] .hP",
      // Gmail version-specific selectors
      "[role='main'] [data-message-id] .hP",
      ".AO [data-message-id] .hP",
      // Last resort selectors
      "[data-message-id] h2",
      ".hP",
      "[data-thread-perm-id]",
      // Try finding something that looks like a subject line
      ".nH h2",
      "[role='heading']",
    ]

    // Try each subject selector
    let subject = null
    for (const selector of subjectSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        subject = element.textContent?.trim()
        if (subject) break
      }
    }

    // Default subject if all selectors fail
    if (!subject) {
      subject = "No Subject"
    }

    // Extract email body with multiple fallback methods
    const bodySelectors = [
      // Primary selectors
      "[data-message-id] .a3s.aiL",
      // Gmail version-specific selectors
      "[role='main'] [data-message-id] .a3s.aiL",
      ".AO [data-message-id] .a3s.aiL",
      // Fallback selectors
      "[data-message-id] .ajV .ajR",
      ".a3s",
      // Try to find the general email container
      ".adn .gs",
    ]

    // Try each body selector
    let bodyElement = null
    for (const selector of bodySelectors) {
      bodyElement = document.querySelector(selector)
      if (bodyElement) break
    }

    // Extract content, preferring innerText but falling back to innerHTML if needed
    let content = null
    if (bodyElement) {
      content = bodyElement.innerText || bodyElement.textContent

      // If still no content, try innerHTML as last resort but clean it
      if (!content && bodyElement.innerHTML) {
        const tempDiv = document.createElement("div")
        tempDiv.innerHTML = bodyElement.innerHTML
        content = tempDiv.textContent
      }
    }

    // Limit content size to avoid performance issues
    if (content && content.length > 5000) {
      content = content.substring(0, 5000) + "... (truncated)"
    }

    // Log the extracted data for debugging
    console.log("FRED - Extracted email data:", {
      gmailVersion: detectGmailVersion(),
      sender: sender || "Not found",
      subject: subject ? subject.substring(0, 50) + "..." : "Not found",
      contentFound: !!content,
    })

    // Return the extracted data with detailed diagnostics
    if (sender && content) {
      return {
        success: true,
        sender,
        subject,
        content,
        timestamp: new Date().toISOString(),
        metadata: {
          gmailVersion: detectGmailVersion(),
          extractionMethod: "automatic",
        },
      }
    } else {
      // More detailed error message with diagnostic info
      const missingFields = []
      if (!sender) missingFields.push("sender email")
      if (!content) missingFields.push("email content")

      return {
        success: false,
        message: `Could not extract complete email data. Missing: ${missingFields.join(
          ", "
        )}. Make sure you have an email open and try refreshing the page.`,
        partialData: {
          sender: sender || null,
          subject: subject || null,
          contentFound: !!content,
          gmailVersion: detectGmailVersion(),
        },
      }
    }
  } catch (error) {
    console.error("Error extracting email data:", error)

    // More robust error reporting
    return {
      success: false,
      message: `Error extracting email data: ${
        (error as Error).message
      }. Try refreshing Gmail and reopening the email.`,
      error: {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack ? (error as Error).stack.split("\n")[0] : null,
        gmailVersion: detectGmailVersion(),
      },
    }
  }

  // Helper function to detect Gmail version - defined inside the main function
  // so it's available in the injected context
  function detectGmailVersion(): GmailVersion {
    // Check for newer Gmail UI indicators
    if (document.querySelector('[role="main"] [data-message-id]')) {
      return GmailVersion.NEW
    }
    // Check for modern Gmail UI indicators
    else if (document.querySelector(".AO [data-message-id]")) {
      return GmailVersion.MODERN
    }
    // Check for classic Gmail UI indicators
    else if (document.querySelector(".nH [data-message-id]")) {
      return GmailVersion.CLASSIC
    }

    return GmailVersion.UNKNOWN
  }
}

/**
 * Displays a notification in the Gmail UI
 * @param tabId The tab ID to show the notification in
 * @param message The message to display
 * @param type The type of notification (info, error, etc.)
 */
export async function showNotificationInGmail(
  tabId: number,
  message: string,
  type: "info" | "error" = "info"
): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (message, type) => {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll(".fred-notification")
        existingNotifications.forEach((notification) => notification.remove())

        // Create notification element
        const notification = document.createElement("div")
        notification.className = `fred-notification fred-${type}`
        notification.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          background-color: ${type === "error" ? "#f44336" : "#2979ff"};
          color: white;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 9999;
          font-family: 'Roboto', Arial, sans-serif;
          font-size: 14px;
          max-width: 300px;
          animation: fred-notification-slide-in 0.3s ease-out forwards;
        `

        // Add icon and message
        notification.innerHTML = `
          <div style="display: flex; align-items: center;">
            <span style="margin-right: 8px;">
              ${type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <span>${message}</span>
          </div>
        `

        // Add animation styles if not already present
        if (!document.getElementById("fred-notification-styles")) {
          const style = document.createElement("style")
          style.id = "fred-notification-styles"
          style.textContent = `
            @keyframes fred-notification-slide-in {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fred-notification-fade-out {
              from { opacity: 1; }
              to { opacity: 0; }
            }
          `
          document.head.appendChild(style)
        }

        // Add to document
        document.body.appendChild(notification)

        // Remove after timeout
        setTimeout(() => {
          notification.style.animation = "fred-notification-fade-out 0.3s ease-out forwards"
          setTimeout(() => notification.remove(), 300)
        }, 5000)
      },
      args: [message, type],
    })
  } catch (error) {
    console.error("Error showing notification in Gmail:", error)
  }
}

/**
 * Displays analysis results in the Gmail UI as an overlay
 * @param tabId The tab ID to show the results in
 * @param result The analysis result to display
 * @param emailData The email data that was analyzed
 */
export async function showResultsOverlayInGmail(
  tabId: number,
  result: any,
  emailData: any
): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (result, emailData, extensionURL) => {
        // Remove any existing overlay
        const existingOverlay = document.querySelector(".fred-results-overlay")
        if (existingOverlay) {
          existingOverlay.remove()
        }

        // Create overlay container
        const overlay = document.createElement("div")
        overlay.className = "fred-results-overlay"
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: fred-fade-in 0.2s ease-out;
        `

        // Determine threat color
        const threatRating = result.threatRating || 0
        let threatColor = "#4caf50" // Green for low threat
        let threatText = "Low Risk"

        if (threatRating > 7) {
          threatColor = "#f44336" // Red for high threat
          threatText = "High Risk"
        } else if (threatRating > 3) {
          threatColor = "#ff9800" // Orange for medium threat
          threatText = "Medium Risk"
        }

        // Create content
        const content = document.createElement("div")
        content.style.cssText = `
          background-color: white;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          position: relative;
          animation: fred-slide-up 0.3s ease-out;
        `

        // Generate flags HTML if available
        let flagsHTML = ""
        if (result.flags && result.flags.length > 0) {
          flagsHTML = `
            <div style="margin-top: 16px; padding: 12px; background-color: ${threatColor}10; border-radius: 4px; border: 1px solid ${threatColor}30;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; color: ${threatColor}; font-weight: bold;">Suspicious Indicators:</h3>
              <ul style="margin: 0; padding-left: 24px;">
                ${result.flags
                  .map((flag) => `<li style="margin-bottom: 4px; font-size: 13px;">${flag}</li>`)
                  .join("")}
              </ul>
            </div>
          `
        }

        // Add header and content to overlay
        content.innerHTML = `
          <style>
            @keyframes fred-fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fred-slide-up {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            .fred-close-button:hover {
              background-color: rgba(0, 0, 0, 0.05);
            }
          </style>
          
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #eee;">
            <div style="display: flex; align-items: center;">
              <img src="${extensionURL}/fred-48.png" width="24" height="24" alt="FRED Logo" style="margin-right: 8px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #333;">FRED Analysis Results</h2>
            </div>
            <button class="fred-close-button" style="background: none; border: none; cursor: pointer; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          
          <div style="padding: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 16px;">
              <div style="width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: ${threatColor}15; margin-right: 16px;">
                <div style="width: 48px; height: 48px; border-radius: 50%; background-color: ${threatColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold;">
                  ${threatRating}
                </div>
              </div>
              
              <div>
                <div style="font-size: 20px; font-weight: bold; color: ${threatColor}; margin-bottom: 4px;">
                  ${threatText}
                </div>
                <div style="font-size: 13px; color: #666;">
                  From: ${emailData.sender}
                </div>
                <div style="font-size: 13px; color: #666;">
                  Subject: ${emailData.subject || "No Subject"}
                </div>
              </div>
            </div>
            
            <div style="margin-top: 16px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">Analysis:</h3>
              <p style="margin: 0; line-height: 1.5; font-size: 14px;">
                ${result.explanation}
              </p>
            </div>
            
            ${flagsHTML}
          </div>
        `

        // Add close button handler
        content.querySelector(".fred-close-button")?.addEventListener("click", () => {
          overlay.style.animation = "fred-fade-in 0.2s ease-in reverse"
          setTimeout(() => overlay.remove(), 200)
        })

        // Allow clicking outside to close
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) {
            overlay.style.animation = "fred-fade-in 0.2s ease-in reverse"
            setTimeout(() => overlay.remove(), 200)
          }
        })

        // Add content to overlay and overlay to document
        overlay.appendChild(content)
        document.body.appendChild(overlay)
      },
      args: [result, emailData, chrome.runtime.getURL("")],
    })
  } catch (error) {
    console.error("Error showing results in Gmail:", error)
  }
}
