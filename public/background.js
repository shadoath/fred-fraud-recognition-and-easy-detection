// FRED - Background Script
// Handles background analysis tasks and communication between content scripts and the extension

// Listen for messages from content scripts or the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("FRED - Background script received message:", request.action);
  
  if (request.action === "openPopup") {
    // Open the extension popup
    chrome.action.openPopup();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === "analyzeEmail") {
    // Handle direct email analysis from the content script
    handleEmailAnalysisWithPermissions(request, sender, sendResponse);
    return true; // Indicates we'll send a response asynchronously
  }
  
  if (request.action === "requestPermission") {
    // Handle permission request
    requestUrlPermission(request.url)
      .then(granted => {
        sendResponse({ success: true, granted });
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.message || "Failed to request permission" 
        });
      });
    return true;
  }
  
  if (request.action === "checkPermission") {
    // Check if we have permission for a URL
    checkUrlPermission(request.url)
      .then(hasPermission => {
        sendResponse({ success: true, hasPermission });
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.message || "Failed to check permission" 
        });
      });
    return true;
  }
});

// Function to check URL permission
async function checkUrlPermission(url) {
  try {
    // Parse the URL to get the origin
    const urlObj = new URL(url);
    const origin = urlObj.origin;
    
    // Check if we have permission for this origin
    const result = await chrome.permissions.contains({
      origins: [origin + "/*"]
    });
    
    return result;
  } catch (error) {
    console.error("Error checking URL permission:", error);
    return false;
  }
}

// Function to request URL permission
async function requestUrlPermission(url) {
  try {
    // Parse the URL to get the origin
    const urlObj = new URL(url);
    const origin = urlObj.origin;
    
    // Request permission
    const granted = await chrome.permissions.request({
      origins: [origin + "/*"]
    });
    
    return granted;
  } catch (error) {
    console.error("Error requesting URL permission:", error);
    return false;
  }
}

// Handle email analysis with permission checks
async function handleEmailAnalysisWithPermissions(request, sender, sendResponse) {
  try {
    // Get source URL from sender or request
    const sourceUrl = sender.tab?.url || request.sourceUrl;
    
    if (!sourceUrl) {
      throw new Error("Source URL not provided");
    }
    
    // Check if we have permission to access this URL
    const hasPermission = await checkUrlPermission(sourceUrl);
    
    if (!hasPermission) {
      sendResponse({
        success: false,
        error: "PERMISSION_REQUIRED",
        message: "Permission required to analyze content from this site"
      });
      return;
    }
    
    // Now that we have permission, handle the analysis
    handleEmailAnalysis(request.data, request.apiKey)
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error("FRED - Error analyzing email:", error);
        sendResponse({ 
          success: false, 
          error: error.message || "Failed to analyze email" 
        });
      });
  } catch (error) {
    console.error("FRED - Error in permission check:", error);
    sendResponse({ 
      success: false, 
      error: error.message || "Failed to check permissions" 
    });
  }
}

// Function to handle email analysis
async function handleEmailAnalysis(emailData, apiKey) {
  if (!emailData || !emailData.success) {
    throw new Error("Invalid email data");
  }
  
  try {
    // If no API key, use offline analysis
    if (!apiKey) {
      return await performOfflineEmailAnalysis(emailData);
    }
    
    // Try OpenAI API analysis, with fallback to offline
    try {
      return await performOpenAIEmailAnalysis(emailData, apiKey);
    } catch (error) {
      console.warn("FRED - API error, falling back to offline analysis:", error);
      return await performOfflineEmailAnalysis(emailData);
    }
  } catch (error) {
    console.error("FRED - Email analysis error:", error);
    throw error;
  }
}

// Perform offline pattern-based email analysis
async function performOfflineEmailAnalysis(emailData) {
  // Common fraud patterns with categories
  const commonFraudPatterns = [
    // Urgency tactics
    { pattern: "urgent action required", weight: 0.8, category: "Urgency Tactics" },
    { pattern: "immediate attention", weight: 0.7, category: "Urgency Tactics" },
    { pattern: "act now", weight: 0.6, category: "Urgency Tactics" },
    { pattern: "time sensitive", weight: 0.6, category: "Urgency Tactics" },
    { pattern: "limited time offer", weight: 0.5, category: "Urgency Tactics" },
    { pattern: "space is limited", weight: 0.5, category: "Urgency Tactics" },
    
    // Account security
    { pattern: "verify your account", weight: 0.6, category: "Account Security" },
    { pattern: "password expired", weight: 0.7, category: "Account Security" },
    { pattern: "unusual activity", weight: 0.5, category: "Account Security" },
    { pattern: "suspicious login", weight: 0.7, category: "Account Security" },
    { pattern: "security alert", weight: 0.5, category: "Account Security" },
    
    // Action demands
    { pattern: "click here to avoid", weight: 0.9, category: "Action Demands" },
    { pattern: "click the link below", weight: 0.6, category: "Action Demands" },
    { pattern: "follow these instructions", weight: 0.4, category: "Action Demands" },
    
    // Financial topics
    { pattern: "bank account", weight: 0.4, category: "Financial Topics" },
    { pattern: "credit card information", weight: 0.8, category: "Financial Topics" },
    { pattern: "credit card details", weight: 1.0, category: "Financial Topics" },
    { pattern: "payment details", weight: 0.7, category: "Financial Topics" },
    { pattern: "billing information", weight: 0.7, category: "Financial Topics" },
    { pattern: "low investment minimum", weight: 0.8, category: "Financial Topics" },
    
    // Get-rich-quick schemes
    { pattern: "inheritance", weight: 0.8, category: "Get-Rich-Quick Schemes" },
    { pattern: "lottery winner", weight: 0.9, category: "Get-Rich-Quick Schemes" },
    { pattern: "million dollars", weight: 0.7, category: "Get-Rich-Quick Schemes" },
    { pattern: "cryptocurrency investment", weight: 0.7, category: "Get-Rich-Quick Schemes" },
    { pattern: "bitcoin", weight: 0.5, category: "Get-Rich-Quick Schemes" },
    { pattern: "guaranteed return", weight: 0.8, category: "Get-Rich-Quick Schemes" },
    { pattern: "risk-free", weight: 0.6, category: "Get-Rich-Quick Schemes" },
    { pattern: "make money fast", weight: 0.9, category: "Get-Rich-Quick Schemes" },
    { pattern: "risk free investment", weight: 0.8, category: "Get-Rich-Quick Schemes" },
    
    // Personal information
    { pattern: "social security", weight: 1.0, category: "Personal Information Requests" },
    { pattern: "social security number", weight: 1.0, category: "Personal Information Requests" },
    { pattern: "date of birth", weight: 0.6, category: "Personal Information Requests" },
    { pattern: "mother's maiden name", weight: 0.9, category: "Personal Information Requests" },
    
    // Impersonation
    { pattern: "official notice", weight: 0.5, category: "Impersonation" },
    { pattern: "customer service representative", weight: 0.5, category: "Impersonation" },
    { pattern: "support team", weight: 0.4, category: "Impersonation" },
  ];

  // Simulate API call delay for perceived thoroughness
  await new Promise((resolve) => setTimeout(resolve, 750));

  // Check for common fraud indicators in the email
  const lowerContent = emailData.content.toLowerCase();
  const lowerSubject = (emailData.subject || "").toLowerCase();

  // Calculate a simple threat score
  let threatScore = 0;
  const flags = [];
  const categories = new Set();

  // Check if sender looks suspicious (simple check)
  if (!emailData.sender.includes("@") || emailData.sender.includes("no-reply")) {
    threatScore += 2;
    flags.push("Suspicious sender address");
    categories.add("Sender Verification");
  }

  // Check sender domain against display name (if available)
  const senderParts = emailData.sender.split("@");
  if (senderParts.length === 2) {
    const domain = senderParts[1];
    if (emailData.subject?.toLowerCase().includes("bank") && !domain.includes("bank")) {
      threatScore += 3;
      flags.push("Sender domain doesn't match claimed organization");
      categories.add("Impersonation");
    }
  }

  // Check for fraud patterns in content
  commonFraudPatterns.forEach(({ pattern, weight, category }) => {
    if (lowerContent.includes(pattern) || lowerSubject.includes(pattern)) {
      threatScore += weight * 10;
      flags.push(`Contains suspicious phrase: "${pattern}"`);
      categories.add(category);
    }
  });

  // Additional check for links/URLs in content
  const urlMatches = lowerContent.match(/https?:\/\//g) || [];
  if (urlMatches.length > 3) {
    threatScore += 3;
    flags.push("Contains multiple URLs");
    categories.add("Suspicious Links");
  }

  // Check for suspicious links with mismatched text and URL
  if (
    lowerContent.includes("href=") &&
    (lowerContent.includes("click here") || lowerContent.includes("log in"))
  ) {
    threatScore += 2;
    flags.push("Contains potentially misleading links");
    categories.add("Suspicious Links");
  }

  // Check for suspicious formatting
  if ((lowerContent.match(/!/g) || []).length > 5 || lowerContent.includes("$$$")) {
    threatScore += 2;
    flags.push("Contains excessive punctuation or symbols often used in scams");
    categories.add("Suspicious Formatting");
  }

  // Cap the threat rating between 1-10
  const threatRating = Math.max(1, Math.min(10, Math.round(threatScore)));

  // Generate appropriate explanation based on threat level
  let explanation = `[OFFLINE MODE ANALYSIS] This email ${
    threatRating > 5 ? "shows suspicious patterns" : "has been analyzed"
  } using pattern matching. `;

  if (threatRating <= 3) {
    explanation +=
      "Based on pattern matching, this email appears to be legitimate. No significant fraud indicators were detected.";
  } else if (threatRating <= 7) {
    explanation += `The email shows some suspicious characteristics in the following categories: ${Array.from(
      categories
    ).join(", ")}. Review with caution before taking any action.`;
  } else {
    explanation += `The email contains multiple suspicious patterns in these categories: ${Array.from(
      categories
    ).join(", ")}. This matches known fraud tactics. Exercise extreme caution.`;
  }

  if (flags.length > 0) {
    explanation += ` Specific indicators: ${flags.join(", ")}.`;
  }

  // Return the offline pattern-based fraud check response
  return {
    success: true,
    threatRating,
    explanation,
    flags,
    confidence: 0.5, // Lower confidence than AI analysis
    isOfflineMode: true, // Indicate this is an offline analysis
  };
}

// Perform OpenAI API-based email analysis
async function performOpenAIEmailAnalysis(emailData, apiKey) {
  const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
  
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
`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const responseData = await response.json();
    
    // Parse the response content from OpenAI
    if (responseData.choices && responseData.choices.length > 0) {
      try {
        const content = responseData.choices[0].message.content;
        const result = JSON.parse(content);

        // Validate the response format
        if (!result.threatRating || !result.explanation) {
          throw new Error("Invalid response format from OpenAI");
        }

        // Ensure threatRating is within the expected range (1-10)
        const threatRating = Math.max(1, Math.min(10, Math.round(result.threatRating)));

        // Return the standardized response
        return {
          success: true,
          threatRating,
          explanation: result.explanation,
          flags: Array.isArray(result.flags) ? result.flags : [],
          confidence: typeof result.confidence === "number" ? result.confidence : undefined,
          isOfflineMode: false,
        };
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        throw new Error("Failed to parse fraud analysis results");
      }
    } else {
      throw new Error("No valid response from OpenAI");
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}