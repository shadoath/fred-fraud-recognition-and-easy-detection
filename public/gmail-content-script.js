// Gmail Content Script
// This script extracts email data from Gmail and adds a fraud check button to the UI

// Initialize the script once the page is fully loaded
let buttonAdded = false
let observer = null

// Function to extract email data
function extractEmailData() {
  try {
    // Extract email sender
    const senderElement = document.querySelector("[data-message-id] [email]")
    const sender = senderElement ? senderElement.getAttribute("email") : null

    // Extract email subject - Improved selector based on Gmail's HTML structure
    // Looking for h2 with class 'hP' and jsname 'r4nke' which contains the subject
    const subjectElement = document.querySelector(".ha h2")

    // If the above selector fails, try alternative selectors
    let subject = null
    if (subjectElement) {
      // This handles the case with emojis or other HTML inside the subject
      subject = subjectElement.textContent.trim()
    } else {
      // Fallback to more general selectors
      const fallbackElement =
        document.querySelector("[data-message-id] h2") ||
        document.querySelector(".hP") ||
        document.querySelector("[data-thread-perm-id]")
      subject = fallbackElement ? fallbackElement.textContent.trim() : "No Subject"
    }

    // Extract email body
    // Gmail's structure is complex, so we're targeting the main content area
    const bodyElement = document.querySelector("[data-message-id] .a3s.aiL")
    let content = bodyElement ? bodyElement.innerText : null

    // Limit content size to avoid performance issues
    if (content && content.length > 5000) {
      content = content.substring(0, 5000) + "... (truncated)"
    }

    // Log the extracted data for debugging
    console.log("FRED - Extracted email data:", {
      sender,
      subject: subject?.substring(0, 50) + "...",
    })

    // Return the extracted data
    if (sender && content) {
      return {
        success: true,
        sender,
        subject,
        content,
        timestamp: new Date().toISOString(),
      }
    } else {
      return {
        success: false,
        message: "Could not extract email data. Make sure you have an email open.",
      }
    }
  } catch (error) {
    console.error("Error extracting email data:", error)
    return {
      success: false,
      message: `Error extracting email data: ${error.message}`,
    }
  }
}

// Function to add the fraud check button to Gmail's UI
function addFraudCheckButton() {
  // If we've already added the button, don't add it again
  if (buttonAdded) return

  // Find the toolbar area in an open email
  const toolbarElement = document.querySelector("[data-message-id] .G-tF")

  if (toolbarElement) {
    // Create our custom button
    const button = document.createElement("div")
    button.className = "G-Ni J-J5-Ji fraud-check-button"
    button.innerHTML = `
      <div class="T-I J-J5-Ji T-I-Js-Gs ash T-I-ax7 L3" role="button" tabindex="0" 
           style="user-select: none; background-color: #2979ff; color: white; margin-right: 10px; border-radius: 4px; display: flex; align-items: center; padding: 0 12px; height: 32px;"
           data-tooltip="Check for fraud">
        <span style="font-weight: 500; font-size: 13px; white-space: nowrap;">Check for Fraud</span>
      </div>
    `

    // Add click handler that opens the extension popup
    button.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openPopup" })
    })

    // Add the button to the toolbar
    toolbarElement.prepend(button)
    buttonAdded = true

    console.log("FRED - Fraud check button added to Gmail UI")
  }
}

// Function to observe for changes in the DOM that indicate an email has been opened
function setupObserver() {
  if (observer) {
    observer.disconnect()
  }

  // Target the main content area
  const targetNode = document.querySelector("body")
  if (!targetNode) return

  // Configure the observer
  const config = { childList: true, subtree: true }

  // Callback to execute when mutations are observed
  const callback = (mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        // Check if an email is now open
        const isEmailOpen = document.querySelector("[data-message-id]")
        if (isEmailOpen) {
          addFraudCheckButton()
        } else {
          // Email view closed, reset buttonAdded flag
          buttonAdded = false
        }
      }
    }
  }

  // Create and start the observer
  observer = new MutationObserver(callback)
  observer.observe(targetNode, config)
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractEmailData") {
    const emailData = extractEmailData()
    sendResponse(emailData)
    return true // Indicates we'll send a response asynchronously
  }
})

// Run on script load
function initialize() {
  console.log("FRED - Fraud Recognition & Easy Detection initialized")

  // Initial check
  const isEmailOpen = document.querySelector("[data-message-id]")
  if (isEmailOpen) {
    addFraudCheckButton()
  }

  // Setup observer to watch for Gmail navigation
  setupObserver()
}

// Wait for page to be fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize)
} else {
  initialize()
}
