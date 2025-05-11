function extractMainContentText() {
  // Helper function to check if an element is visible
  function isVisible(element) {
    const style = window.getComputedStyle(element)
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0"
  }

  // Helper function to clean text (remove extra whitespace, newlines)
  function cleanText(text) {
    return text
      .replace(/\s+/g, " ") // Collapse multiple spaces, tabs, newlines
      .trim()
  }

  // Select the main content area
  let mainContent =
    document.querySelector("main") || // HTML5 <main> element
    document.querySelector("article") || // HTML5 <article> element
    document.querySelector('[role="main"]') || // ARIA role
    document.querySelector(".content, #content, .main-content") // Common class/ID patterns

  // Fallback: If no main content is found, use the body but exclude common non-content elements
  if (!mainContent) {
    mainContent = document.body
  }

  // Elements to exclude (menus, headers, footers, asides, etc.)
  const excludeSelectors = [
    "nav",
    "header",
    "footer",
    "aside",
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    ".menu, .navbar, .sidebar, .widget, .ad, .advert, .footer, .header",
  ].join(", ")

  // Clone the main content to avoid modifying the original DOM
  const contentClone = mainContent.cloneNode(true)

  // Remove excluded elements from the clone
  const excludedElements = contentClone.querySelectorAll(excludeSelectors)
  excludedElements.forEach((element) => element.remove())

  // Get all visible text nodes
  let textContent = ""
  const walker = document.createTreeWalker(contentClone, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement
      // Only include text from visible elements, exclude script/style
      if (parent && isVisible(parent) && !["SCRIPT", "STYLE"].includes(parent.tagName)) {
        return NodeFilter.FILTER_ACCEPT
      }
      return NodeFilter.FILTER_REJECT
    },
  })

  // Collect and clean text
  while (walker.nextNode()) {
    const text = cleanText(walker.currentNode.textContent)
    if (text) {
      textContent += text + " "
    }
  }

  // Final cleanup
  textContent = cleanText(textContent)

  return textContent || "No main content text found."
}

// Execute and log the result
console.log(extractMainContentText())
