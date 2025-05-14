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
        message: "Not in Gmail. Please open Gmail to extract email content."
      };
    }
    
    // Helper function to safely extract text
    const safeExtractText = (element) => {
      if (!element) return null;
      
      // Try textContent first
      const text = element?.textContent?.trim();
      if (text) return text;
      
      // Fallback to innerHTML with cleanup
      if (element.innerHTML) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = element.innerHTML;
        // Remove all script tags
        const scripts = tempDiv.querySelectorAll("script");
        scripts.forEach(script => script.remove());
        // Get the clean text
        return tempDiv.textContent?.trim() || null;
      }
      
      return null;
    };

    // Helper function to extract content using selectors
    const extractBySelector = (selectors) => {
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (!element) continue;
          
          return safeExtractText(element);
        } catch (error) {
          console.error(`Error with selector ${selector}:`, error);
        }
      }
      return null;
    };
    
    // Find largest text block (fallback for email body)
    const findLargestTextBlock = () => {
      const contentSelector = "article, section, div, p";
      
      // Filter elements with meaningful text content
      const contentBlocks = Array.from(document.querySelectorAll(contentSelector)).filter(el => {
        const text = el.textContent?.trim() || "";
        return text.length > 100 && text.includes(" ") && !el.querySelector("script");
      });
      
      if (contentBlocks.length === 0) return null;
      
      // Sort by text length to find the largest content block
      contentBlocks.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0));
      
      return contentBlocks[0].textContent?.trim() || null;
    };
    
    // Extract email address using regex
    const extractEmailAddress = (text) => {
      const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
      return emailMatch ? emailMatch[0] : null;
    };
    
    // Truncate text to specified length
    const truncateText = (text, maxLength) => {
      return text.length > maxLength ? `${text.substring(0, maxLength)}... (truncated)` : text;
    };

    // Gmail-specific selectors
    const senderSelectors = [
      ".go.gD", // Direct email class
      "[data-message-id] [email]",
      ".gD [email]",
      ".gE [email]",
      "[data-hovercard-id]"
    ];
    
    const subjectSelectors = [
      ".ha h2", 
      "[data-message-id] .hP", 
      ".nH h2"
    ];
    
    const contentSelectors = [
      "[data-message-id] .a3s.aiL", 
      ".a3s", 
      ".adn .gs"
    ];

    // Extract the email parts
    const extractedData = {
      sender: extractBySelector(senderSelectors),
      subject: extractBySelector(subjectSelectors),
      content: extractBySelector(contentSelectors)
    };

    // Gmail-specific fallback for sender
    if (!extractedData.sender || !extractedData.sender.includes("@")) {
      const fromLabels = Array.from(document.querySelectorAll(".adn .gE, .adn .gF, .go"));
      for (const label of fromLabels) {
        if (label.textContent?.includes("@")) {
          const emailAddress = extractEmailAddress(label.textContent);
          if (emailAddress) {
            extractedData.sender = emailAddress;
            break;
          }
        }
      }

      // Check for email attributes if still not found
      if (!extractedData.sender || !extractedData.sender.includes("@")) {
        const emailElements = document.querySelectorAll("[email]");
        for (const el of emailElements) {
          const emailAttr = el.getAttribute("email");
          if (emailAttr?.includes("@")) {
            extractedData.sender = emailAttr;
            break;
          }
        }
      }
    }

    // Last resort fallback for content
    if (!extractedData.content) {
      extractedData.content = findLargestTextBlock();
    }

    // Extract email addresses using regex if we have text but not a clear email
    if (extractedData.sender && !extractedData.sender.includes("@")) {
      const allEmails = document.querySelectorAll(".go.gD, [email], [data-hovercard-id]");
      for (const el of allEmails) {
        const emailAttr = el.getAttribute("email") || el.getAttribute("data-hovercard-id");
        if (emailAttr?.includes("@")) {
          extractedData.sender = emailAttr;
          break;
        }

        if (el.textContent?.includes("@")) {
          const emailMatch = extractEmailAddress(el.textContent);
          if (emailMatch) {
            extractedData.sender = emailMatch;
            break;
          }
        }
      }

      if (!extractedData.sender || !extractedData.sender.includes("@")) {
        const emailAddress = extractEmailAddress(extractedData.sender || "");
        if (emailAddress) extractedData.sender = emailAddress;
      }
    }

    // Limit content size to avoid performance issues
    if (extractedData.content) {
      extractedData.content = truncateText(extractedData.content, 5000);
    }

    // Create error message if needed
    const createErrorMessage = () => {
      const missingParts = [];
      if (!extractedData.sender) missingParts.push("sender email");
      if (!extractedData.content) missingParts.push("email content");
      
      return `Could not extract complete email data. Missing: ${missingParts.join(", ")}.
              Please ensure you have an email open in Gmail.`;
    };

    // Return success or failure based on required data presence
    if (extractedData.sender && extractedData.content) {
      return {
        success: true,
        sender: extractedData.sender,
        subject: extractedData.subject || "No Subject",
        content: extractedData.content,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        sender: extractedData.sender || undefined,
        subject: extractedData.subject || undefined,
        content: extractedData.content || undefined,
        message: createErrorMessage()
      };
    }
  } catch (error) {
    console.error("Error extracting email data:", error);
    return {
      success: false,
      message: `Error extracting email data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Function to execute from the extension - expose it globally
window.scrapeGmail = function() {
  return extractGmailContent();
}