import type { EmailData, FraudCheckResponse, FraudPattern, TextData } from "../types/fraudTypes"

// Define common fraud patterns with categories for reuse
const commonFraudPatterns: FraudPattern[] = [
  // Urgency tactics
  {
    pattern: "urgent action required",
    weight: 0.8,
    category: "Urgency Tactics",
  },
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
  {
    pattern: "follow these instructions",
    weight: 0.4,
    category: "Action Demands",
  },

  // Financial topics
  { pattern: "bank account", weight: 0.4, category: "Financial Topics" },
  {
    pattern: "credit card information",
    weight: 0.8,
    category: "Financial Topics",
  },
  { pattern: "credit card details", weight: 1.0, category: "Financial Topics" },
  { pattern: "payment details", weight: 0.7, category: "Financial Topics" },
  { pattern: "billing information", weight: 0.7, category: "Financial Topics" },
  {
    pattern: "low investment minimum",
    weight: 0.8,
    category: "Financial Topics",
  },

  // Get-rich-quick schemes
  { pattern: "inheritance", weight: 0.8, category: "Get-Rich-Quick Schemes" },
  {
    pattern: "lottery winner",
    weight: 0.9,
    category: "Get-Rich-Quick Schemes",
  },
  {
    pattern: "million dollars",
    weight: 0.7,
    category: "Get-Rich-Quick Schemes",
  },
  {
    pattern: "cryptocurrency investment",
    weight: 0.7,
    category: "Get-Rich-Quick Schemes",
  },
  { pattern: "bitcoin", weight: 0.5, category: "Get-Rich-Quick Schemes" },
  {
    pattern: "guaranteed return",
    weight: 0.8,
    category: "Get-Rich-Quick Schemes",
  },
  { pattern: "risk-free", weight: 0.6, category: "Get-Rich-Quick Schemes" },
  {
    pattern: "make money fast",
    weight: 0.9,
    category: "Get-Rich-Quick Schemes",
  },
  {
    pattern: "risk free investment",
    weight: 0.8,
    category: "Get-Rich-Quick Schemes",
  },

  // Personal information
  {
    pattern: "social security",
    weight: 1.0,
    category: "Personal Information Requests",
  },
  {
    pattern: "social security number",
    weight: 1.0,
    category: "Personal Information Requests",
  },
  {
    pattern: "date of birth",
    weight: 0.6,
    category: "Personal Information Requests",
  },
  {
    pattern: "mother's maiden name",
    weight: 0.9,
    category: "Personal Information Requests",
  },

  // Impersonation
  { pattern: "official notice", weight: 0.5, category: "Impersonation" },
  {
    pattern: "customer service representative",
    weight: 0.5,
    category: "Impersonation",
  },
  { pattern: "support team", weight: 0.4, category: "Impersonation" },
]

/**
 * Offline pattern-matching analysis function for when the API is unavailable
 * @param emailData The email data to analyze
 * @returns The fraud check results with offline mode indicator
 */
export async function offlineCheckEmailForFraud(emailData: EmailData): Promise<FraudCheckResponse> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Check for common fraud indicators in the email
  const lowerContent = emailData.content.toLowerCase()
  const lowerSubject = (emailData.subject || "").toLowerCase()

  // Calculate a simple threat score
  let threatScore = 0
  const flags: string[] = []
  const categories = new Set<string>()

  // Check if sender looks suspicious (simple check)
  if (!emailData.sender.includes("@") || emailData.sender.includes("no-reply")) {
    threatScore += 2
    flags.push("Suspicious sender address")
    categories.add("Sender Verification")
  }

  // Check sender domain against display name (if available)
  const senderParts = emailData.sender.split("@")
  if (senderParts.length === 2) {
    const domain = senderParts[1]
    if (emailData.subject?.toLowerCase().includes("bank") && !domain.includes("bank")) {
      threatScore += 3
      flags.push("Sender domain doesn't match claimed organization")
      categories.add("Impersonation")
    }
  }

  // Check for fraud patterns in content
  commonFraudPatterns.forEach(({ pattern, weight, category }) => {
    if (lowerContent.includes(pattern) || lowerSubject.includes(pattern)) {
      threatScore += weight * 10
      flags.push(`Contains suspicious phrase: "${pattern}"`)
      categories.add(category)
    }
  })

  // Additional check for links/URLs in content
  const urlMatches = lowerContent.match(/https?:\/\//g) || []
  if (urlMatches.length > 3) {
    threatScore += 3
    flags.push("Contains multiple URLs")
    categories.add("Suspicious Links")
  }

  // Check for suspicious links with mismatched text and URL
  if (
    lowerContent.includes("href=") &&
    (lowerContent.includes("click here") || lowerContent.includes("log in"))
  ) {
    threatScore += 2
    flags.push("Contains potentially misleading links")
    categories.add("Suspicious Links")
  }

  // Check for suspicious formatting
  if ((lowerContent.match(/!/g) || []).length > 5 || lowerContent.includes("$$$")) {
    threatScore += 2
    flags.push("Contains excessive punctuation or symbols often used in scams")
    categories.add("Suspicious Formatting")
  }

  // Cap the threat rating between 1-10
  const threatRating = Math.max(1, Math.min(10, Math.round(threatScore)))

  // Generate appropriate explanation based on threat level
  const explanation = generateExplanation("email", categories, threatRating, flags)

  // Return the offline pattern-based fraud check response
  return {
    success: true,
    threatRating,
    explanation,
    flags,
    confidence: 0.5, // Lower confidence than AI analysis
  }
}

/**
 * Offline pattern-matching analysis function for analyzing text when API is unavailable
 * @param textData The text data to analyze
 * @returns The fraud check results with offline mode indicator
 */
export async function offlineCheckTextForFraud(textData: TextData): Promise<FraudCheckResponse> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Check for common fraud indicators in the text
  const lowerContent = textData.content.toLowerCase()

  // Calculate a simple threat score
  let threatScore = 0
  const flags: string[] = []
  const categories = new Set<string>()

  // Check for fraud patterns in content
  commonFraudPatterns.forEach(({ pattern, weight, category }) => {
    if (lowerContent.includes(pattern)) {
      threatScore += weight * 10
      flags.push(`Contains suspicious phrase: "${pattern}"`)
      categories.add(category)
    }
  })

  // Additional check for links/URLs in content
  const urlMatches = lowerContent.match(/https?:\/\//g) || []
  if (urlMatches.length > 3) {
    threatScore += 3
    flags.push("Contains multiple URLs")
    categories.add("Suspicious Links")
  }

  // Check for suspicious formatting
  if ((lowerContent.match(/!/g) || []).length > 5 || lowerContent.includes("$$$")) {
    threatScore += 2
    flags.push("Contains excessive punctuation or symbols often used in scams")
    categories.add("Suspicious Formatting")
  }

  // Cap the threat rating between 1-10
  const threatRating = Math.max(1, Math.min(10, Math.round(threatScore)))

  // Generate appropriate explanation based on threat level
  const explanation = generateExplanation("text", categories, threatRating, flags)

  // Return the offline pattern-based fraud check response
  return {
    success: true,
    threatRating,
    explanation,
    flags,
    confidence: 0.3, // Lower confidence than AI analysis
  }
}

/**
 * Helper function to generate explanation text based on analysis results
 */
function generateExplanation(
  contentType: "email" | "text",
  categories: Set<string>,
  threatRating: number,
  flags: string[]
): string {
  // Create category-based explanation
  if (categories.size > 0) {
    let explanation = `[OFFLINE MODE ANALYSIS] This ${contentType} ${
      threatRating > 5 ? "shows suspicious patterns" : "has been analyzed"
    } using pattern matching. `

    if (threatRating <= 3) {
      explanation += `Based on pattern matching, this ${contentType} appears to be legitimate. No significant fraud indicators were detected.`
    } else if (threatRating <= 7) {
      explanation += `The ${contentType} shows some suspicious characteristics in the following categories: ${Array.from(
        categories
      ).join(", ")}. Review with caution before taking any action.`
    } else {
      explanation += `The ${contentType} contains multiple suspicious patterns in these categories: ${Array.from(
        categories
      ).join(", ")}. This matches known fraud tactics. Exercise extreme caution.`
    }

    if (flags.length > 0) {
      explanation += ` Specific indicators: ${flags.join(", ")}.`
    }

    return explanation
  } else {
    return `[OFFLINE MODE ANALYSIS] No suspicious patterns were detected in this ${contentType} using the offline pattern-matching system.`
  }
}
