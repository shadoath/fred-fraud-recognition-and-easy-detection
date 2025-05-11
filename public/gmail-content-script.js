// Gmail Content Script - Lightweight Version
// This script only adds the fraud check button to the Gmail UI
// All extraction and analysis logic is moved to the main app

// Initialize the script once the page is fully loaded
let buttonAdded = false
let observer = null

// Function to add the fraud check button to Gmail's UI
function addFraudCheckButton() {
  // If we've already added the button, don't add it again
  if (buttonAdded) return

  // Find the toolbar area with multiple possible selectors
  const toolbarSelectors = [
    // Primary selectors
    "[data-message-id] .G-tF",
    // Gmail version-specific selectors
    "[role='main'] [data-message-id] .G-tF",
    ".AO [data-message-id] .G-tF",
    // Fallback selectors
    "[data-message-id] .ade",
    "[data-message-id] .iN",
    ".G-tF", // Most generic
    ".nH .oo", // Last resort
  ]

  // Try each toolbar selector
  let toolbarElement = null
  for (const selector of toolbarSelectors) {
    toolbarElement = document.querySelector(selector)
    if (toolbarElement) break
  }

  if (toolbarElement) {
    // Create our custom button
    const button = document.createElement("div")
    button.className = "G-Ni J-J5-Ji fraud-check-button"
    button.id = "fred-fraud-check-button"
    button.innerHTML = `
      <div class="T-I J-J5-Ji T-I-Js-Gs ash T-I-ax7 L3" role="button" tabindex="0" 
           style="user-select: none; background-color: #2979ff; color: white; margin-right: 10px; border-radius: 4px; display: flex; align-items: center; padding: 0 12px; height: 32px;"
           data-tooltip="Check for fraud">
        <span style="font-weight: 500; font-size: 13px; white-space: nowrap;">Check for Fraud</span>
      </div>
    `

    // Add click handler that delegates to the main extension
    button.addEventListener("click", () => {
      // Show an in-progress indicator
      button.classList.add("analyzing")
      const originalContent = button.innerHTML
      button.innerHTML = `
        <div class="T-I J-J5-Ji T-I-Js-Gs ash T-I-ax7 L3" role="button" tabindex="0" 
             style="user-select: none; background-color: #7a7a7a; color: white; margin-right: 10px; border-radius: 4px; display: flex; align-items: center; padding: 0 12px; height: 32px; position: relative; overflow: hidden;">
          <span style="font-weight: 500; font-size: 13px; white-space: nowrap;">Analyzing...</span>
          <span style="position: absolute; bottom: 0; left: 0; height: 3px; width: 100%; background: linear-gradient(to right, #2979ff, #64b5f6); animation: fred-progress 1.5s infinite linear;"></span>
        </div>
      `

      // Add animation styles
      const style = document.createElement("style")
      style.textContent = `
        @keyframes fred-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `
      document.head.appendChild(style)

      // Send request to the background script to handle extraction and analysis
      chrome.runtime.sendMessage(
        {
          action: "analyzeCurrentEmail",
          source: "gmailButton",
          url: window.location.href,
        },
        (response) => {
          // Restore button state
          button.classList.remove("analyzing")
          button.innerHTML = originalContent

          // Handle any error messages that came back
          if (response && !response.success) {
            // Show error as a temporary toast notification (handled by background)
            chrome.runtime.sendMessage({
              action: "showNotification",
              message: response.message || "Error analyzing email",
              type: "error",
            })
          }
        }
      )
    })

    // Add the button to the toolbar
    toolbarElement.prepend(button)
    buttonAdded = true

    console.log("FRED - Fraud check button added to Gmail UI")
  } else {
    console.log("FRED - Could not find toolbar to add button")

    // Try inserting button using alternative method for problematic Gmail versions
    try {
      const actionBar = document.querySelector(".aaq, .aeH, .aic")
      if (actionBar) {
        // Create a simpler button as fallback
        const fallbackButton = document.createElement("button")
        fallbackButton.id = "fred-fallback-button"
        fallbackButton.innerHTML = "Check for Fraud"
        fallbackButton.style.cssText =
          "background-color: #2979ff; color: white; border: none; padding: 8px 12px; border-radius: 4px; margin: 5px; cursor: pointer; font-weight: bold;"

        // Add click handler that delegates to main extension
        fallbackButton.addEventListener("click", () => {
          chrome.runtime.sendMessage({
            action: "analyzeCurrentEmail",
            source: "gmailButton",
            url: window.location.href,
          })
        })

        // Add the fallback button
        actionBar.appendChild(fallbackButton)
        buttonAdded = true

        console.log("FRED - Fallback fraud check button added to Gmail UI")
      }
    } catch (e) {
      console.error("FRED - Failed to add fallback button:", e)
    }
  }
}

// Function to observe for changes in the DOM that indicate an email has been opened
function setupObserver() {
  if (observer) {
    observer.disconnect()
  }

  // Target the main content area - try multiple possible selectors
  const possibleTargets = [
    document.querySelector("body"),
    document.querySelector('[role="main"]'),
    document.querySelector(".AO"),
    document.querySelector(".nH"),
  ].filter(Boolean)

  if (possibleTargets.length === 0) {
    console.error("FRED - Could not find any valid target for mutation observer")
    // Set up a retry mechanism
    setTimeout(setupObserver, 2000)
    return
  }

  // Configure the observer with extensive options for better detection
  const config = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-message-id", "class"],
  }

  // Callback to execute when mutations are observed
  const callback = () => {
    // Throttle the callback to prevent performance issues with rapid mutations
    if (callback.throttleTimeout) {
      clearTimeout(callback.throttleTimeout)
    }

    callback.throttleTimeout = setTimeout(() => {
      // Check the current state regardless of mutation type
      const isEmailOpen = document.querySelector("[data-message-id]")
      const fredButton =
        document.getElementById("fred-fraud-check-button") ||
        document.getElementById("fred-fallback-button")

      if (isEmailOpen && !fredButton) {
        // We have an open email but no button - try to add it
        buttonAdded = false // Reset flag to force button creation
        addFraudCheckButton()
      } else if (!isEmailOpen && buttonAdded) {
        // Email view was closed
        console.log("FRED - Email view closed, resetting button state")
        buttonAdded = false
      }
    }, 200) // Throttle to run at most every 200ms
  }

  // Create and start the observer on all potential targets
  observer = new MutationObserver(callback)
  possibleTargets.forEach((target) => {
    observer.observe(target, config)
  })

  console.log(`FRED - Observer set up on ${possibleTargets.length} targets`)

  // Add periodic checks to catch changes the observer might miss
  // This helps with slow-loading emails and edge cases
  setInterval(() => {
    const isEmailOpen = document.querySelector("[data-message-id]")
    const fredButton =
      document.getElementById("fred-fraud-check-button") ||
      document.getElementById("fred-fallback-button")

    if (isEmailOpen && !fredButton && !buttonAdded) {
      console.log("FRED - Email open detected during periodic check")
      addFraudCheckButton()
    }
  }, 2000) // Check every 2 seconds
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle any commands from the background script
  if (request.action === "checkButtonState") {
    // Allow the extension to check if our button is present
    const fredButton =
      document.getElementById("fred-fraud-check-button") ||
      document.getElementById("fred-fallback-button")
    sendResponse({
      buttonPresent: !!fredButton,
      buttonAddedFlag: buttonAdded,
      emailOpen: !!document.querySelector("[data-message-id]"),
    })
    return true
  }
})

// Run on script load with retry mechanism to ensure proper initialization
function initialize(retryCount = 0) {
  console.log(`FRED - Initializing lightweight content script (attempt ${retryCount + 1})`)

  try {
    // Initial check for open email
    const isEmailOpen = document.querySelector("[data-message-id]")
    if (isEmailOpen) {
      console.log("FRED - Email already open on initialization")
      addFraudCheckButton()
    }

    // Setup observer to watch for Gmail navigation
    setupObserver()

    console.log("FRED - Extension successfully initialized", {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    })
  } catch (error) {
    console.error("FRED - Error during initialization:", error)

    // Retry initialization a few times if it fails
    if (retryCount < 3) {
      setTimeout(() => initialize(retryCount + 1), 1500)
    }
  }
}

// Wait for page to be fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initialize())
} else {
  // If already loaded, initialize with a small delay to ensure Gmail UI is ready
  setTimeout(() => initialize(), 500)
}
