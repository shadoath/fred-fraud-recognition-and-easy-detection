// Gmail Content Script - Enhanced Version
// This script extracts email data from Gmail and adds a fraud check button to the UI
// With direct analysis capabilities

// Initialize the script once the page is fully loaded
let buttonAdded = false;
let observer = null;

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
      content = content.substring(0, 5000) + "... (truncated)";
    }

    // Log the extracted data for debugging
    console.log("FRED - Extracted email data:", {
      gmailVersion: detectGmailVersion(),
      sender: sender || "Not found",
      subject: subject ? (subject.substring(0, 50) + "...") : "Not found",
      contentFound: !!content
    });

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
      };
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
      };
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
    };
  }
}

// Function to add the fraud check button to Gmail's UI with direct analysis capability
function addFraudCheckButton() {
  // If we've already added the button, don't add it again
  if (buttonAdded) return;

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
    const button = document.createElement("div");
    button.className = "G-Ni J-J5-Ji fraud-check-button";
    button.id = "fred-fraud-check-button";
    button.setAttribute("data-fred-version", "1.0");
    button.innerHTML = `
      <div class="T-I J-J5-Ji T-I-Js-Gs ash T-I-ax7 L3" role="button" tabindex="0" 
           style="user-select: none; background-color: #2979ff; color: white; margin-right: 10px; border-radius: 4px; display: flex; align-items: center; padding: 0 12px; height: 32px;"
           data-tooltip="Check for fraud">
        <span style="font-weight: 500; font-size: 13px; white-space: nowrap;">Check for Fraud</span>
      </div>
    `;

    // Add click handler that performs direct analysis
    button.addEventListener("click", async () => {
      // Show an in-progress indicator
      button.classList.add('analyzing');
      const originalContent = button.innerHTML;
      button.innerHTML = `
        <div class="T-I J-J5-Ji T-I-Js-Gs ash T-I-ax7 L3" role="button" tabindex="0" 
             style="user-select: none; background-color: #7a7a7a; color: white; margin-right: 10px; border-radius: 4px; display: flex; align-items: center; padding: 0 12px; height: 32px; position: relative; overflow: hidden;">
          <span style="font-weight: 500; font-size: 13px; white-space: nowrap;">Analyzing...</span>
          <span style="position: absolute; bottom: 0; left: 0; height: 3px; width: 100%; background: linear-gradient(to right, #2979ff, #64b5f6); animation: fred-progress 1.5s infinite linear;"></span>
        </div>
      `;
      
      // Add animation styles
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fred-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `;
      document.head.appendChild(style);
      
      try {
        // Extract email data
        const emailData = extractEmailData();
        
        if (!emailData.success) {
          throw new Error(emailData.message || "Failed to extract email data");
        }
        
        // Get API key from storage
        const storage = await chrome.storage.local.get("openai_api_key");
        const apiKey = storage["openai_api_key"];
        
        // Send data to the extension's background script for analysis
        chrome.runtime.sendMessage({
          action: "analyzeEmail",
          data: emailData,
          apiKey: apiKey
        }, (response) => {
          // Restore button state
          button.classList.remove('analyzing');
          button.innerHTML = originalContent;
          
          if (response && response.success) {
            // Show results in an overlay
            showResultsOverlay(response.result, emailData);
          } else {
            // Handle error - show a toast-like notification
            showNotification('Error analyzing email: ' + (response?.error || 'Unknown error'), 'error');
            // Open popup as fallback
            chrome.runtime.sendMessage({ action: "openPopup" });
          }
        });
      } catch (error) {
        // Restore button state
        button.classList.remove('analyzing');
        button.innerHTML = originalContent;
        
        // Show error notification and fallback to popup
        showNotification('Error: ' + (error.message || 'Failed to analyze email'), 'error');
        chrome.runtime.sendMessage({ action: "openPopup" });
      }
    });

    // Add the button to the toolbar
    toolbarElement.prepend(button);
    buttonAdded = true;

    console.log(`FRED - Fraud check button added to Gmail UI (${gmailVersion} version)`);
  } else {
    console.log(`FRED - Could not find toolbar to add button (Gmail ${gmailVersion} version)`);
    
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
        
        // Add click handler that opens the extension popup
        fallbackButton.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "openPopup" });
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

// Function to display a notification
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.fred-notification');
  existingNotifications.forEach(notification => notification.remove());
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fred-notification fred-${type}`;
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 20px;
    background-color: ${type === 'error' ? '#f44336' : '#2979ff'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 9999;
    font-family: 'Roboto', Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: fred-notification-slide-in 0.3s ease-out forwards;
  `;
  
  // Add icon and message
  notification.innerHTML = `
    <div style="display: flex; align-items: center;">
      <span style="margin-right: 8px;">
        ${type === 'error' ? '⚠️' : 'ℹ️'}
      </span>
      <span>${message}</span>
    </div>
  `;
  
  // Add animation styles if not already present
  if (!document.getElementById('fred-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'fred-notification-styles';
    style.textContent = `
      @keyframes fred-notification-slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fred-notification-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after timeout
  setTimeout(() => {
    notification.style.animation = 'fred-notification-fade-out 0.3s ease-out forwards';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Function to display results overlay
function showResultsOverlay(result, emailData) {
  // Remove any existing overlay
  const existingOverlay = document.querySelector('.fred-results-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  // Create overlay container
  const overlay = document.createElement('div');
  overlay.className = 'fred-results-overlay';
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
  `;
  
  // Determine threat color
  const threatRating = result.threatRating || 0;
  let threatColor = '#4caf50'; // Green for low threat
  let threatText = 'Low Risk';
  
  if (threatRating > 7) {
    threatColor = '#f44336'; // Red for high threat
    threatText = 'High Risk';
  } else if (threatRating > 3) {
    threatColor = '#ff9800'; // Orange for medium threat
    threatText = 'Medium Risk';
  }
  
  // Create content
  const content = document.createElement('div');
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
  `;
  
  // Generate flags HTML if available
  let flagsHTML = '';
  if (result.flags && result.flags.length > 0) {
    flagsHTML = `
      <div style="margin-top: 16px; padding: 12px; background-color: ${threatColor}10; border-radius: 4px; border: 1px solid ${threatColor}30;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: ${threatColor}; font-weight: bold;">Suspicious Indicators:</h3>
        <ul style="margin: 0; padding-left: 24px;">
          ${result.flags.map(flag => `<li style="margin-bottom: 4px; font-size: 13px;">${flag}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  // Add offline mode indicator if applicable
  const offlineIndicator = result.isOfflineMode ? 
    `<div style="display: inline-block; padding: 4px 8px; background-color: #f1c40f20; border: 1px solid #f1c40f50; border-radius: 4px; font-size: 12px; margin-left: 8px; color: #7e6500;">OFFLINE MODE</div>` : '';
  
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
        <img src="${chrome.runtime.getURL('fred-48.png')}" width="24" height="24" alt="FRED Logo" style="margin-right: 8px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #333;">FRED Analysis Results ${offlineIndicator}</h2>
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
            Subject: ${emailData.subject || 'No Subject'}
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
  `;
  
  // Add close button handler
  content.querySelector('.fred-close-button').addEventListener('click', () => {
    overlay.style.animation = 'fred-fade-in 0.2s ease-in reverse';
    setTimeout(() => overlay.remove(), 200);
  });
  
  // Allow clicking outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.animation = 'fred-fade-in 0.2s ease-in reverse';
      setTimeout(() => overlay.remove(), 200);
    }
  });
  
  // Add content to overlay and overlay to document
  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

// Function to observe for changes in the DOM that indicate an email has been opened
function setupObserver() {
  if (observer) {
    observer.disconnect();
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
  };

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
  };

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
  } else if (request.action === "performAnalysis") {
    // Direct action to perform fraud analysis from extension
    try {
      const emailData = extractEmailData();
      sendResponse(emailData);
    } catch (error) {
      sendResponse({
        success: false,
        message: error.message || "Error extracting email data"
      });
    }
    return true;
  }
});

// Run on script load with retry mechanism to ensure proper initialization
function initialize(retryCount = 0) {
  console.log(`FRED - Fraud Recognition & Easy Detection initializing (attempt ${retryCount + 1})`);

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