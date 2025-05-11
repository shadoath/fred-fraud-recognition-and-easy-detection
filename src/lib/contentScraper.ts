/**
 * Content Scraper Service
 * Dynamically extracts email content from various mail clients
 */

// Email client types supported by the scraper
export enum EmailClient {
  GMAIL = "gmail",
  OUTLOOK = "outlook",
  YAHOO = "yahoo",
  PROTONMAIL = "protonmail",
  GENERIC = "generic",
  UNKNOWN = "unknown"
}

// Email extraction response type
export interface EmailExtractResponse {
  success: boolean;
  sender?: string;
  subject?: string;
  content?: string;
  timestamp?: string;
  message?: string;
  client?: EmailClient;
  clientData?: {
    url: string;
    detectionMethod: string;
    clientVersion?: string;
  };
}

// Client detection selectors and extractors
interface ClientConfig {
  urlPatterns: RegExp[];
  name: EmailClient;
  senderSelectors: string[];
  subjectSelectors: string[];
  contentSelectors: string[];
  validationElement?: string;  // Element to validate proper client detection
  fallbackStrategy?: (document: Document) => Partial<EmailExtractResponse>;
}

// Common selectors shared across clients
const commonSelectors = {
  // Generic selectors that might work across various clients
  senderCommon: [
    "[class*='sender']",
    "[class*='from']",
    "[id*='sender']",
    "[id*='from']"
  ],
  subjectCommon: [
    "[class*='subject']",
    "[id*='subject']",
    "h1", 
    "h2"
  ],
  contentCommon: [
    "[class*='body']",
    "[class*='content']",
    "[id*='body']",
    "[id*='content']",
    "article",
    "main",
    ".main",
    "#main"
  ]
};

// Common utility functions used across the scraper
const utils = {
  // Extract email using regex pattern
  extractEmailAddress: (text: string): string | null => {
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    return emailMatch ? emailMatch[0] : null;
  },
  
  // Format client name for display
  formatClientName: (client: EmailClient): string => {
    return client.charAt(0).toUpperCase() + client.slice(1);
  },
  
  // Truncate text to specified length
  truncateText: (text: string, maxLength: number): string => {
    return text.length > maxLength 
      ? `${text.substring(0, maxLength)}... (truncated)` 
      : text;
  }
};

// Selector-based extraction logic for email clients
const clientConfigs: ClientConfig[] = [
  {
    urlPatterns: [/mail\.google\.com/],
    name: EmailClient.GMAIL,
    validationElement: '[data-message-id]',
    senderSelectors: [
      "[data-message-id] [email]",
      ".gD [email]",
      ".gE [email]",
      "[data-hovercard-id]"
    ],
    subjectSelectors: [
      ".ha h2",
      "[data-message-id] .hP",
      ".nH h2"
    ],
    contentSelectors: [
      "[data-message-id] .a3s.aiL",
      ".a3s",
      ".adn .gs"
    ],
    fallbackStrategy: (document) => {
      // Gmail-specific fallback logic for sender
      const fromLabels = Array.from(document.querySelectorAll(".adn .gE, .adn .gF"));
      for (const label of fromLabels) {
        if (label.textContent?.includes("@")) {
          const emailAddress = utils.extractEmailAddress(label.textContent);
          if (emailAddress) return { sender: emailAddress };
        }
      }
      return {};
    }
  },
  {
    urlPatterns: [/outlook\.live\.com/, /outlook\.office\.com/, /outlook\.office365\.com/],
    name: EmailClient.OUTLOOK,
    validationElement: '[data-tid="messageBodyContent"]',
    senderSelectors: [
      ".allowTextSelection span[data-tid='from'] span",
      ".from span",
      "span[data-tid='from']",
      "[role='heading'] + div span"
    ],
    subjectSelectors: [
      "[role='heading']",
      ".subjectLine",
      ".subject"
    ],
    contentSelectors: [
      "[role='region'][aria-label*='Message body']",
      ".ReadMsgBody",
      ".rps_b9c8",
      "[data-tid='messageBodyContent']"
    ]
  },
  {
    urlPatterns: [/mail\.yahoo\.com/],
    name: EmailClient.YAHOO,
    senderSelectors: [
      ".message-from span",
      ".pointer.ellipsis.from"
    ],
    subjectSelectors: [
      ".message-subject span",
      ".subject-text"
    ],
    contentSelectors: [
      ".msg-body",
      ".mail-content"
    ]
  },
  {
    urlPatterns: [/mail\.protonmail\.com/],
    name: EmailClient.PROTONMAIL,
    senderSelectors: [
      ".item-sender-address",
      ".message-sender"
    ],
    subjectSelectors: [
      ".item-subject",
      ".message-subject"
    ],
    contentSelectors: [
      ".message-content",
      ".content"
    ]
  },
  // Generic email client as fallback
  {
    urlPatterns: [/.*/],
    name: EmailClient.GENERIC,
    senderSelectors: commonSelectors.senderCommon,
    subjectSelectors: commonSelectors.subjectCommon,
    contentSelectors: commonSelectors.contentCommon
  }
];

/**
 * Detects the email client being used based on URL and DOM structure
 */
function detectEmailClient(url: string, document: Document): { client: EmailClient, detectionMethod: string } {
  // First try to match by URL pattern
  for (const config of clientConfigs) {
    if (config.urlPatterns.some(pattern => pattern.test(url))) {
      // Additional validation for clients with specific elements
      if (config.validationElement && document.querySelector(config.validationElement)) {
        return { client: config.name, detectionMethod: "url+element" };
      } else if (config.name !== EmailClient.GENERIC) {
        return { client: config.name, detectionMethod: "url" };
      }
    }
  }

  // If no specific client matched, return generic/unknown
  return { client: EmailClient.GENERIC, detectionMethod: "fallback" };
}

/**
 * Extracts content based on element selector
 */
function extractBySelectors(document: Document, selectors: string[]): string | null {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (!element) continue;
      
      // Use helper function to safely extract text
      return safeExtractText(element);
    } catch (error) {
      console.error(`Error with selector ${selector}:`, error);
    }
  }
  return null;
}

/**
 * Safely extracts text from an element with fallbacks
 */
function safeExtractText(element: Element | null): string | null {
  if (!element) return null;
  
  // Try textContent first
  const text = element.textContent?.trim();
  if (text) return text;
  
  // Fallback to innerHTML with cleanup
  if (element.innerHTML) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = element.innerHTML;
    // Remove all script tags
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    // Get the clean text
    return tempDiv.textContent?.trim() || null;
  }
  
  return null;
}

/**
 * Extracts the largest text block in case other selectors fail
 */
function findLargestTextBlock(document: Document): string | null {
  // Target potential content elements
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
}

/**
 * Handles the actual DOM traversal and data extraction
 * This function is injected into the page context via executeScript,
 * so it needs to be self-contained with all required utilities
 */
function extractEmailData(url: string): EmailExtractResponse {
  try {
    // Define local utility functions that will be available in the injected context
    const localUtils = {
      // Extract email using regex pattern
      extractEmailAddress: (text: string): string | null => {
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        return emailMatch ? emailMatch[0] : null;
      },

      // Format client name for display
      formatClientName: (clientName: string): string => {
        return clientName.charAt(0).toUpperCase() + clientName.slice(1);
      },

      // Truncate text to specified length
      truncateText: (text: string, maxLength: number): string => {
        return text.length > maxLength
          ? `${text.substring(0, maxLength)}... (truncated)`
          : text;
      }
    };

    // Recreate the emailClient enum since it won't be available in injected context
    const EmailClientEnum = {
      GMAIL: "gmail",
      OUTLOOK: "outlook",
      YAHOO: "yahoo",
      PROTONMAIL: "protonmail",
      GENERIC: "generic",
      UNKNOWN: "unknown"
    };

    // Helper function to detect email client
    function detectEmailClientLocal(urlStr: string, doc: Document): { client: string, detectionMethod: string } {
      // Check for Gmail
      if (/mail\.google\.com/.test(urlStr)) {
        if (doc.querySelector('[data-message-id]')) {
          return { client: EmailClientEnum.GMAIL, detectionMethod: "url+element" };
        }
        return { client: EmailClientEnum.GMAIL, detectionMethod: "url" };
      }

      // Check for Outlook
      if (/outlook\.(live|office|office365)\.com/.test(urlStr)) {
        if (doc.querySelector('[data-tid="messageBodyContent"]')) {
          return { client: EmailClientEnum.OUTLOOK, detectionMethod: "url+element" };
        }
        return { client: EmailClientEnum.OUTLOOK, detectionMethod: "url" };
      }

      // Check for Yahoo Mail
      if (/mail\.yahoo\.com/.test(urlStr)) {
        return { client: EmailClientEnum.YAHOO, detectionMethod: "url" };
      }

      // Check for ProtonMail
      if (/mail\.protonmail\.com/.test(urlStr)) {
        return { client: EmailClientEnum.PROTONMAIL, detectionMethod: "url" };
      }

      // Default to generic
      return { client: EmailClientEnum.GENERIC, detectionMethod: "fallback" };
    }

    // Helper function to safely extract text
    function safeExtractTextLocal(element: Element | null): string | null {
      if (!element) return null;

      // Try textContent first
      const text = element.textContent?.trim();
      if (text) return text;

      // Fallback to innerHTML with cleanup
      if (element.innerHTML) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = element.innerHTML;
        // Remove all script tags
        const scripts = tempDiv.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        // Get the clean text
        return tempDiv.textContent?.trim() || null;
      }

      return null;
    }

    // Helper function to extract content using selectors
    function extractBySelectorLocal(doc: Document, selectors: string[]): string | null {
      for (const selector of selectors) {
        try {
          const element = doc.querySelector(selector);
          if (!element) continue;

          return safeExtractTextLocal(element);
        } catch (error) {
          console.error(`Error with selector ${selector}:`, error);
        }
      }
      return null;
    }

    // Helper function to find largest text block
    function findLargestTextBlockLocal(doc: Document): string | null {
      const contentSelector = "article, section, div, p";

      // Filter elements with meaningful text content
      const contentBlocks = Array.from(doc.querySelectorAll(contentSelector)).filter(el => {
        const text = el.textContent?.trim() || "";
        return text.length > 100 && text.includes(" ") && !el.querySelector("script");
      });

      if (contentBlocks.length === 0) return null;

      // Sort by text length to find the largest content block
      contentBlocks.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0));

      return contentBlocks[0].textContent?.trim() || null;
    }

    // Common selectors for various email elements
    const commonSelectorsLocal = {
      senderCommon: [
        "[class*='sender']", "[class*='from']", "[id*='sender']", "[id*='from']"
      ],
      subjectCommon: [
        "[class*='subject']", "[id*='subject']", "h1", "h2"
      ],
      contentCommon: [
        "[class*='body']", "[class*='content']", "[id*='body']", "[id*='content']",
        "article", "main", ".main", "#main"
      ]
    };

    // Client-specific selectors
    const clientConfigsLocal = {
      [EmailClientEnum.GMAIL]: {
        senderSelectors: [
          // Direct email attribute when available
          "[data-message-id] [email]",
          // Try to get the actual email text (highest priority)
          ".go.gD",
          // Fallback to email attribute in other elements
          ".gD [email]",
          ".gE [email]",
          "[data-hovercard-id]"
        ],
        subjectSelectors: [
          ".ha h2", "[data-message-id] .hP", ".nH h2"
        ],
        contentSelectors: [
          "[data-message-id] .a3s.aiL", ".a3s", ".adn .gs"
        ],
        // Gmail-specific fallback for sender
        fallbackStrategy: (doc: Document) => {
          // First try to extract from .go.gD which typically contains the raw email
          const emailElement = doc.querySelector(".go.gD");
          if (emailElement && emailElement.textContent?.includes("@")) {
            return { sender: emailElement.textContent.trim() };
          }

          // Second, check if there's a span with the email attribute
          const emailAttrs = Array.from(doc.querySelectorAll("[email]"));
          for (const el of emailAttrs) {
            const email = el.getAttribute("email");
            if (email && email.includes("@")) {
              return { sender: email };
            }
          }

          // Third, look for elements with data-hovercard-id which often contains email
          const hoverElements = Array.from(doc.querySelectorAll("[data-hovercard-id]"));
          for (const el of hoverElements) {
            const hoverId = el.getAttribute("data-hovercard-id");
            if (hoverId && hoverId.includes("@")) {
              return { sender: hoverId };
            }
          }

          // Last, find any text that looks like an email address
          const fromLabels = Array.from(doc.querySelectorAll(".adn .gE, .adn .gF, .go, .g2"));
          for (const label of fromLabels) {
            if (label.textContent?.includes("@")) {
              const emailAddress = localUtils.extractEmailAddress(label.textContent);
              if (emailAddress) return { sender: emailAddress };
            }
          }

          return {};
        }
      },
      [EmailClientEnum.OUTLOOK]: {
        senderSelectors: [
          ".allowTextSelection span[data-tid='from'] span", ".from span",
          "span[data-tid='from']", "[role='heading'] + div span"
        ],
        subjectSelectors: [
          "[role='heading']", ".subjectLine", ".subject"
        ],
        contentSelectors: [
          "[role='region'][aria-label*='Message body']", ".ReadMsgBody",
          ".rps_b9c8", "[data-tid='messageBodyContent']"
        ]
      },
      [EmailClientEnum.YAHOO]: {
        senderSelectors: [
          ".message-from span", ".pointer.ellipsis.from"
        ],
        subjectSelectors: [
          ".message-subject span", ".subject-text"
        ],
        contentSelectors: [
          ".msg-body", ".mail-content"
        ]
      },
      [EmailClientEnum.PROTONMAIL]: {
        senderSelectors: [
          ".item-sender-address", ".message-sender"
        ],
        subjectSelectors: [
          ".item-subject", ".message-subject"
        ],
        contentSelectors: [
          ".message-content", ".content"
        ]
      },
      [EmailClientEnum.GENERIC]: {
        senderSelectors: commonSelectorsLocal.senderCommon,
        subjectSelectors: commonSelectorsLocal.subjectCommon,
        contentSelectors: commonSelectorsLocal.contentCommon
      }
    };

    // Detect the email client type
    const { client, detectionMethod } = detectEmailClientLocal(url, document);

    // Get the client config
    const config = clientConfigsLocal[client] || clientConfigsLocal[EmailClientEnum.GENERIC];

    // Extract the email parts
    const extractedData = {
      sender: extractBySelectorLocal(document, config.senderSelectors),
      subject: extractBySelectorLocal(document, config.subjectSelectors),
      content: extractBySelectorLocal(document, config.contentSelectors)
    };

    // Use client-specific fallback strategies if needed
    if (config.fallbackStrategy && (!extractedData.sender || !extractedData.content)) {
      const fallbackData = config.fallbackStrategy(document);

      // Apply fallback data where needed
      if (!extractedData.sender && fallbackData.sender) extractedData.sender = fallbackData.sender;
      if (!extractedData.content && fallbackData.content) extractedData.content = fallbackData.content;
      if (!extractedData.subject && fallbackData.subject) extractedData.subject = fallbackData.subject;
    }

    // Last resort fallback for content
    if (!extractedData.content) {
      extractedData.content = findLargestTextBlockLocal(document);
    }

    // Extract email addresses using regex if we have text but not a clear email
    if (extractedData.sender && !extractedData.sender.includes('@')) {
      // First check if we can use querySelector to find any email address in the page
      const allEmails = document.querySelectorAll('.go.gD, [email], [data-hovercard-id]');
      for (const el of allEmails) {
        // Try attribute first
        const emailAttr = el.getAttribute('email') || el.getAttribute('data-hovercard-id');
        if (emailAttr && emailAttr.includes('@')) {
          extractedData.sender = emailAttr;
          break;
        }

        // Then try text content
        if (el.textContent && el.textContent.includes('@')) {
          const emailMatch = localUtils.extractEmailAddress(el.textContent);
          if (emailMatch) {
            extractedData.sender = emailMatch;
            break;
          }
        }
      }

      // If still no email, try regex on the current sender text
      if (!extractedData.sender.includes('@')) {
        const emailAddress = localUtils.extractEmailAddress(extractedData.sender);
        if (emailAddress) extractedData.sender = emailAddress;
      }
    }

    // Limit content size to avoid performance issues
    if (extractedData.content) {
      extractedData.content = localUtils.truncateText(extractedData.content, 5000);
    }
    
    // Log extraction details
    console.log("FRED - Email extraction:", {
      client,
      detectionMethod,
      senderFound: !!extractedData.sender,
      subjectFound: !!extractedData.subject,
      contentFound: !!extractedData.content,
      contentLength: extractedData.content?.length || 0
    });

    // Prepare the consistent response format
    const commonResponse = {
      client,
      clientData: {
        url,
        detectionMethod
      }
    };

    // Create error message function locally
    function createErrorMessage(data: { sender?: string | null, content?: string | null }): string {
      const missingParts = [];
      if (!data.sender) missingParts.push('sender email');
      if (!data.content) missingParts.push('email content');

      return `Could not extract complete email data. Missing: ${missingParts.join(', ')}.
              Please ensure you have an email open in your mail client.`;
    }

    // Return success or failure based on required data presence
    if (extractedData.sender && extractedData.content) {
      return {
        success: true,
        sender: extractedData.sender,
        subject: extractedData.subject || "No Subject",
        content: extractedData.content,
        timestamp: new Date().toISOString(),
        ...commonResponse
      };
    } else {
      // Return partial data with informative error message
      return {
        success: false,
        sender: extractedData.sender,
        subject: extractedData.subject,
        content: extractedData.content,
        message: createErrorMessage(extractedData),
        ...commonResponse
      };
    }
  } catch (error) {
    console.error("Error extracting email data:", error);
    return {
      success: false,
      message: `Error extracting email data: ${error instanceof Error ? error.message : String(error)}`,
      client: EmailClientEnum.UNKNOWN,
      clientData: {
        url,
        detectionMethod: "error"
      }
    };
  }
}

/**
 * Creates an informative error message based on missing data
 */
function constructErrorMessage(data: { sender?: string | null, content?: string | null }): string {
  const missingParts = [];
  if (!data.sender) missingParts.push('sender email');
  if (!data.content) missingParts.push('email content');
  
  return `Could not extract complete email data. Missing: ${missingParts.join(', ')}. 
          Please ensure you have an email open in your mail client.`;
}

/**
 * Main function to extract email data from the current tab using chrome APIs
 */
export async function extractEmailFromTab(tabId: number): Promise<EmailExtractResponse> {
  try {
    // Validate tab and permissions
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) {
      return {
        success: false,
        message: "Tab URL not found"
      };
    }

    // Quick check if it looks like a mail client
    const isEmailPage = /mail|inbox|outlook|proton|yahoo/.test(tab.url.toLowerCase());
    if (!isEmailPage) {
      return {
        success: false,
        message: "Not a recognized email client. Please open an email to extract content."
      };
    }

    // Execute the extraction script in the content context
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractEmailData,
      args: [tab.url]
    });

    return result.result as EmailExtractResponse;
  } catch (error) {
    console.error("Error executing email extraction script:", error);
    return {
      success: false,
      message: `Failed to extract email data: ${(error as Error).message}`
    };
  }
}