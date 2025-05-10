// Gmail Content Script
// This script extracts email data from Gmail and adds a fraud check button to the UI

// Initialize the script once the page is fully loaded
let buttonAdded = false
let observer = null

// Gmail UI version detection
const GMAIL_VERSION = {
  UNKNOWN: 'unknown',
  CLASSIC: 'classic',
  MODERN: 'modern',
  NEW: 'new'
};

// Function to detect which Gmail UI version is being used
function detectGmailVersion() {
  // Check for newer Gmail UI indicators
  if (document.querySelector('[role="main"] [data-message-id]')) {
    return GMAIL_VERSION.NEW;
  }
  // Check for modern Gmail UI indicators
  else if (document.querySelector('.AO [data-message-id]')) {
    return GMAIL_VERSION.MODERN;
  }
  // Check for classic Gmail UI indicators
  else if (document.querySelector('.nH [data-message-id]')) {
    return GMAIL_VERSION.CLASSIC;
  }

  return GMAIL_VERSION.UNKNOWN;
}

// Function to extract email data with improved selectors and fallbacks
function extractEmailData() {
  try {
    const gmailVersion = detectGmailVersion();
    console.log("FRED - Detected Gmail version:", gmailVersion);

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
      "[email]"
    ];

    // Try each selector until we find a match
    let sender = null;
    for (const selector of senderSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        sender = element.getAttribute("email") || element.textContent;
        if (sender) break;
      }
    }

    // If still no sender, try to extract from the From field text
    if (!sender) {
      const fromLabels = Array.from(document.querySelectorAll(".adn .gE, .adn .gF"));
      for (const label of fromLabels) {
        if (label.textContent.includes("@")) {
          // Extract email using regex
          const emailMatch = label.textContent.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) {
            sender = emailMatch[0];
            break;
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
      "[role='heading']"
    ];

    // Try each subject selector
    let subject = null;
    for (const selector of subjectSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        subject = element.textContent.trim();
        if (subject) break;
      }
    }

    // Default subject if all selectors fail
    if (!subject) {
      subject = "No Subject";
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
      ".adn .gs"
    ];

    // Try each body selector
    let bodyElement = null;
    for (const selector of bodySelectors) {
      bodyElement = document.querySelector(selector);
      if (bodyElement) break;
    }

    // Extract content, preferring innerText but falling back to innerHTML if needed
    let content = null;
    if (bodyElement) {
      content = bodyElement.innerText || bodyElement.textContent;

      // If still no content, try innerHTML as last resort but clean it
      if (!content && bodyElement.innerHTML) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = bodyElement.innerHTML;
        content = tempDiv.textContent;
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
      subject: subject ? (subject.substring(0, 50) + "...") : "Not found",
      contentFound: !!content
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
          extractionMethod: "automatic"
        }
      }
    } else {
      // More detailed error message with diagnostic info
      const missingFields = [];
      if (!sender) missingFields.push("sender email");
      if (!content) missingFields.push("email content");

      return {
        success: false,
        message: `Could not extract complete email data. Missing: ${missingFields.join(", ")}. Make sure you have an email open and try refreshing the page.`,
        partialData: {
          sender: sender || null,
          subject: subject || null,
          contentFound: !!content,
          gmailVersion: detectGmailVersion()
        }
      }
    }
  } catch (error) {
    console.error("Error extracting email data:", error);

    // More robust error reporting
    return {
      success: false,
      message: `Error extracting email data: ${error.message}. Try refreshing Gmail and reopening the email.`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack ? error.stack.split("\n")[0] : null,
        gmailVersion: detectGmailVersion()
      }
    }
  }
}

// Function to add the fraud check button to Gmail's UI
function addFraudCheckButton() {
  // If we've already added the button, don't add it again
  if (buttonAdded) return

  // Detect Gmail version for proper button placement
  const gmailVersion = detectGmailVersion();

  // Find the toolbar area based on Gmail version
  const toolbarSelectors = [
    // Primary selectors
    "[data-message-id] .G-tF",
    // Gmail version-specific selectors
    "[role='main'] [data-message-id] .G-tF",
    ".AO [data-message-id] .G-tF",
    // Fallback selectors
    "[data-message-id] .ade",
    "[data-message-id] .iN",
    ".G-tF",  // Most generic
    ".nH .oo" // Last resort
  ];

  // Try each toolbar selector
  let toolbarElement = null;
  for (const selector of toolbarSelectors) {
    toolbarElement = document.querySelector(selector);
    if (toolbarElement) break;
  }

  if (toolbarElement) {
    // Create our custom button
    const button = document.createElement("div")
    button.className = "G-Ni J-J5-Ji fraud-check-button"
    button.id = "fred-fraud-check-button"
    button.setAttribute("data-fred-version", "1.0")
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

    console.log(`FRED - Fraud check button added to Gmail UI (${gmailVersion} version)`)
  } else {
    console.log(`FRED - Could not find toolbar to add button (Gmail ${gmailVersion} version)`)

    // Try inserting button using alternative method for problematic Gmail versions
    try {
      const actionBar = document.querySelector('.aaq, .aeH, .aic');
      if (actionBar) {
        // Create a simpler button as fallback
        const fallbackButton = document.createElement("button");
        fallbackButton.id = "fred-fallback-button";
        fallbackButton.setAttribute("data-fred-version", "1.0");
        fallbackButton.innerHTML = "Check for Fraud";
        fallbackButton.style.cssText = "background-color: #2979ff; color: white; border: none; padding: 8px 12px; border-radius: 4px; margin: 5px; cursor: pointer; font-weight: bold;";

        // Add click handler
        fallbackButton.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "openPopup" })
        });

        // Add the fallback button
        actionBar.appendChild(fallbackButton);
        buttonAdded = true;

        console.log("FRED - Fallback fraud check button added to Gmail UI");
      }
    } catch(e) {
      console.error("FRED - Failed to add fallback button:", e);
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
    document.querySelector('.AO'),
    document.querySelector('.nH')
  ].filter(Boolean);

  if (possibleTargets.length === 0) {
    console.error("FRED - Could not find any valid target for mutation observer");

    // Set up a retry mechanism
    setTimeout(setupObserver, 2000);
    return;
  }

  // Configure the observer with more extensive options for better detection
  const config = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-message-id', 'class']
  }

  // Callback to execute when mutations are observed
  const callback = (mutationsList) => {
    // Throttle the callback to prevent performance issues with rapid mutations
    if (callback.throttleTimeout) {
      clearTimeout(callback.throttleTimeout);
    }

    callback.throttleTimeout = setTimeout(() => {
      // Check the current state regardless of mutation type
      const isEmailOpen = document.querySelector("[data-message-id]");
      const fredButton = document.getElementById("fred-fraud-check-button") ||
                          document.getElementById("fred-fallback-button");

      if (isEmailOpen && !fredButton) {
        // We have an open email but no button - try to add it
        buttonAdded = false;  // Reset flag to force button creation
        addFraudCheckButton();
      } else if (!isEmailOpen && buttonAdded) {
        // Email view was closed
        console.log("FRED - Email view closed, resetting button state");
        buttonAdded = false;
      }
    }, 200);  // Throttle to run at most every 200ms
  }

  // Create and start the observer on all potential targets
  observer = new MutationObserver(callback);
  possibleTargets.forEach(target => {
    observer.observe(target, config);
  });

  console.log(`FRED - Observer set up on ${possibleTargets.length} targets for Gmail ${detectGmailVersion()} version`);

  // Add periodic checks to catch changes the observer might miss
  // This helps with slow-loading emails and edge cases
  setInterval(() => {
    const isEmailOpen = document.querySelector("[data-message-id]");
    const fredButton = document.getElementById("fred-fraud-check-button") ||
                        document.getElementById("fred-fallback-button");

    if (isEmailOpen && !fredButton && !buttonAdded) {
      console.log("FRED - Email open detected during periodic check");
      addFraudCheckButton();
    }
  }, 2000);  // Check every 2 seconds
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractEmailData") {
    const emailData = extractEmailData();
    sendResponse(emailData);
    return true; // Indicates we'll send a response asynchronously
  } else if (request.action === "getGmailVersion") {
    // Add ability to query Gmail version for diagnostics
    sendResponse({
      version: detectGmailVersion(),
      detectionTime: new Date().toISOString()
    });
    return true;
  } else if (request.action === "checkButtonState") {
    // Allow the extension to check if our button is present
    const fredButton = document.getElementById("fred-fraud-check-button") ||
                       document.getElementById("fred-fallback-button");
    sendResponse({
      buttonPresent: !!fredButton,
      buttonAddedFlag: buttonAdded,
      emailOpen: !!document.querySelector("[data-message-id]")
    });
    return true;
  }
});

// Run on script load with retry mechanism to ensure proper initialization
function initialize(retryCount = 0) {
  console.log(`FRED - Fraud Recognition & Easy Detection initializing (attempt ${retryCount + 1})`)

  try {
    // Detect Gmail version
    const gmailVersion = detectGmailVersion();
    console.log(`FRED - Detected Gmail version: ${gmailVersion}`);

    // Initial check for open email
    const isEmailOpen = document.querySelector("[data-message-id]");
    if (isEmailOpen) {
      console.log("FRED - Email already open on initialization");
      addFraudCheckButton();
    }

    // Setup observer to watch for Gmail navigation
    setupObserver();

    // Send install information to console for debugging
    console.log("FRED - Extension successfully initialized", {
      timestamp: new Date().toISOString(),
      gmailVersion,
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  } catch (error) {
    console.error("FRED - Error during initialization:", error);

    // Retry initialization a few times if it fails
    if (retryCount < 3) {
      setTimeout(() => initialize(retryCount + 1), 1500);
    }
  }
}

// Wait for page to be fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initialize());
} else {
  // If already loaded, initialize with a small delay to ensure Gmail UI is ready
  setTimeout(() => initialize(), 500);
}
