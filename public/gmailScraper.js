/**
 * Gmail Scraper
 * Extracts email subject, sender, and body text from Gmail
 */

// Main function that handles extraction
function extractGmailContent() {
  try {
    // Return early if not in Gmail
    if (!window.location.href.includes("mail.google.com")) {
      return {
        success: false,
        message: "Not in Gmail. Please open Gmail to extract email content.",
      }
    }

    // Helper function to extract content using selectors
    const extractBySelector = (selectors) => {
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector)
          if (!element) continue

          return element?.innerText.replace(/\n+/g, " ").trim()
        } catch (error) {
          console.error(`Error with selector ${selector}:`, error)
        }
      }
      return null
    }

    // Extract email address using regex
    const extractEmailAddress = (text) => {
      const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/)
      return emailMatch ? emailMatch[0] : null
    }

    // Truncate text to specified length
    const truncateText = (text, maxLength) => {
      return text.length > maxLength ? `${text.substring(0, maxLength)}... (truncated)` : text
    }

    // Gmail-specific selectors
    const senderSelectors = [
      ".go.gD", // Direct email class
      "[data-message-id] [email]",
      ".gD [email]",
      ".gE [email]",
      "[data-hovercard-id]",
    ]

    const subjectSelectors = [".ha h2", "[data-message-id] .hP", ".nH h2"]

    const contentSelectors = ["div.a3s.aiL", "[data-message-id] .a3s.aiL", ".a3s", ".adn .gs"]

    // Extract the email parts
    const extractedData = {
      sender: extractBySelector(senderSelectors),
      subject: extractBySelector(subjectSelectors),
      content: extractBySelector(contentSelectors),
    }

    // Limit content size to avoid performance issues
    if (extractedData.content) {
      extractedData.content = truncateText(extractedData.content, 5000)
    }

    // Create error message if needed
    const createErrorMessage = () => {
      const missingParts = []
      if (!extractedData.sender) missingParts.push("sender email")
      if (!extractedData.content) missingParts.push("email content")

      return `Could not extract complete email data. Missing: ${missingParts.join(", ")}.
              Please ensure you have an email open in Gmail.`
    }

    // Return success or failure based on required data presence
    if (extractedData.sender && extractedData.content) {
      return {
        success: true,
        sender: extractedData.sender,
        subject: extractedData.subject || "No Subject",
        content: extractedData.content,
        timestamp: new Date().toISOString(),
      }
    } else {
      return {
        success: false,
        sender: extractedData.sender || undefined,
        subject: extractedData.subject || undefined,
        content: extractedData.content || undefined,
        message: createErrorMessage(),
      }
    }
  } catch (error) {
    console.error("Error extracting email data:", error)
    return {
      success: false,
      message: `Error extracting email data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  }
}

// Function to execute from the extension - expose it globally
window.scrapeGmail = () => {
  return extractGmailContent()
}
