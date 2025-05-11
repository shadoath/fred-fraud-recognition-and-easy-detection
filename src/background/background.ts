/**
 * FRED Extension Background Script
 * Handles background tasks, permission management, and communication
 */

import { setupEmailAnalysisListeners } from "../lib/emailAnalysisService"
import { hasHostPermission, requestHostPermission } from "../lib/permissionsService"

// Initialize the background script
function initializeBackgroundScript() {
  console.log("FRED Background Script Initialized")

  // Set up email analysis listeners
  setupEmailAnalysisListeners()

  // Set up additional message listeners for permissions and other functionality
  setupMessageListeners()
}

// Set up message listeners for various extension features
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("FRED - Background script received message:", request.action)

    // Handle popup opening
    if (request.action === "openPopup") {
      chrome.action.openPopup()
      sendResponse({ success: true })
      return false
    }

    // Handle permission checking
    if (request.action === "checkPermission") {
      hasHostPermission(request.url)
        .then((hasPermission) => {
          sendResponse({ success: true, hasPermission })
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error.message || "Failed to check permission",
          })
        })
      return true // Will respond asynchronously
    }

    // Handle permission requests
    if (request.action === "requestPermission") {
      requestHostPermission(request.url)
        .then((granted) => {
          sendResponse({ success: true, granted })
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error.message || "Failed to request permission",
          })
        })
      return true // Will respond asynchronously
    }

    // Handle clipboard paste requests
    if (request.action === "pasteFromClipboard") {
      navigator.clipboard
        .readText()
        .then((text) => {
          sendResponse({ success: true, text })
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error.message || "Failed to read from clipboard",
          })
        })
      return true // Will respond asynchronously
    }
  })
}

// Initialize the background script
initializeBackgroundScript()
