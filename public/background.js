// FRED - Background Script
// Handles background analysis tasks and communication between content scripts and the extension

// Listen for messages from content scripts or the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("FRED - Background script received message:", request.action)

  if (request.action === "openPopup") {
    // Open the extension popup
    chrome.action.openPopup()
    sendResponse({ success: true })
    return true
  }

  if (request.action === "analyzeEmail") {
    // Handle direct email analysis from the content script
    handleEmailAnalysisWithPermissions(request, sender, sendResponse)
    return true // Indicates we'll send a response asynchronously
  }

  if (request.action === "requestPermission") {
    // Handle permission request
    requestUrlPermission(request.url)
      .then((granted) => {
        sendResponse({ success: true, granted })
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error.message || "Failed to request permission",
        })
      })
    return true
  }

  if (request.action === "checkPermission") {
    // Check if we have permission for a URL
    checkUrlPermission(request.url)
      .then((hasPermission) => {
        sendResponse({ success: true, hasPermission })
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error.message || "Failed to check permission",
        })
      })
    return true
  }
})

// Function to check URL permission
async function checkUrlPermission(url) {
  try {
    // Parse the URL to get the origin
    const urlObj = new URL(url)
    const origin = urlObj.origin

    // Check if we have permission for this origin
    const result = await chrome.permissions.contains({
      origins: [origin + "/*"],
    })

    return result
  } catch (error) {
    console.error("Error checking URL permission:", error)
    return false
  }
}

// Function to request URL permission
async function requestUrlPermission(url) {
  try {
    // Parse the URL to get the origin
    const urlObj = new URL(url)
    const origin = urlObj.origin

    // Request permission
    const granted = await chrome.permissions.request({
      origins: [origin + "/*"],
    })

    return granted
  } catch (error) {
    console.error("Error requesting URL permission:", error)
    return false
  }
}

// Handle email analysis with permission checks
async function handleEmailAnalysisWithPermissions(request, sender, sendResponse) {
  try {
    // Get source URL from sender or request
    const sourceUrl = sender.tab?.url || request.sourceUrl

    if (!sourceUrl) {
      throw new Error("Source URL not provided")
    }

    // Check if we have permission to access this URL
    const hasPermission = await checkUrlPermission(sourceUrl)

    if (!hasPermission) {
      sendResponse({
        success: false,
        error: "PERMISSION_REQUIRED",
        message: "Permission required to analyze content from this site",
      })
      return
    }

    // Now that we have permission, handle the analysis
    handleEmailAnalysis(request.data, request.apiKey)
      .then((result) => {
        sendResponse({ success: true, result })
      })
      .catch((error) => {
        console.error("FRED - Error analyzing email:", error)
        sendResponse({
          success: false,
          error: error.message || "Failed to analyze email",
        })
      })
  } catch (error) {
    console.error("FRED - Error in permission check:", error)
    sendResponse({
      success: false,
      error: error.message || "Failed to check permissions",
    })
  }
}

// Function to handle email analysis
async function handleEmailAnalysis(emailData, apiKey) {
  if (!emailData || !emailData.success) {
    throw new Error("Invalid email data")
  }

  try {
    // If no API key, use offline analysis

    // Try OpenAI API analysis, with fallback to offline
    try {
      return await performOpenAIEmailAnalysis(emailData, apiKey)
    } catch (error) {
      console.warn("FRED - API error, falling back to offline analysis:", error)
      return {
        success: false,
        error: "API_ERROR",
        message: "Failed to analyze email with OpenAI",
      }
    }
  } catch (error) {
    console.error("FRED - Email analysis error:", error)
    throw error
  }
}

// Perform offline pattern-based email analysis

// Perform OpenAI API-based email analysis
async function performOpenAIEmailAnalysis(emailData, apiKey) {
  const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

  const prompt = `You are a cybersecurity expert analyzing an email for potential fraud or phishing. Please analyze this email:

Sender: ${emailData.sender}
Subject: ${emailData.subject || "(No subject)"}
Content:
${emailData.content.substring(0, 4000)} ${emailData.content.length > 4000 ? "...(truncated)" : ""}

Analyze this email for signs of fraud, such as:
1. Suspicious URLs or domain names
2. Urgency language or pressure tactics 
3. Grammar or spelling errors that could indicate a scam
4. Requests for sensitive information
5. Unexpected attachments or links
6. Mismatched sender display name vs. email domain
7. Impersonation of legitimate organizations
8. Suspicious offers, deals, or requests

Provide your analysis in JSON format with the following fields:
- threatRating: A number from 1 to 10 where 1 is completely safe and 10 is highly dangerous
- explanation: A detailed explanation of why this email is or isn't suspicious
- flags: An array of specific suspicious elements detected
- confidence: A number between 0 and 1 indicating your confidence in the assessment

Ensure the JSON is valid and properly formatted.
`

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        `OpenAI API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`
      )
    }

    const responseData = await response.json()

    // Parse the response content from OpenAI
    if (responseData.choices && responseData.choices.length > 0) {
      try {
        const content = responseData.choices[0].message.content
        const result = JSON.parse(content)

        // Validate the response format
        if (!result.threatRating || !result.explanation) {
          throw new Error("Invalid response format from OpenAI")
        }

        // Ensure threatRating is within the expected range (1-10)
        const threatRating = Math.max(1, Math.min(10, Math.round(result.threatRating)))

        // Return the standardized response
        return {
          success: true,
          threatRating,
          explanation: result.explanation,
          flags: Array.isArray(result.flags) ? result.flags : [],
          confidence: typeof result.confidence === "number" ? result.confidence : undefined,
          isOfflineMode: false,
        }
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError)
        throw new Error("Failed to parse fraud analysis results")
      }
    } else {
      throw new Error("No valid response from OpenAI")
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error)
    throw error
  }
}
