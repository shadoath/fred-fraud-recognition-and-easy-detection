import type { PageData } from "../types/fraudTypes"

/**
 * Injected into the page via chrome.scripting.executeScript.
 * Must be fully self-contained — no imports, no closures over outer scope.
 */
function scrapePageContent(): Omit<PageData, "timestamp"> {
  const currentDomain = window.location.hostname

  // Visible text — strip excess whitespace, cap length
  const visibleText = (document.body?.innerText ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 6000)

  // All links with their anchor text
  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => {
      const anchor = a as HTMLAnchorElement
      return { href: anchor.href, text: (anchor.textContent ?? "").trim().substring(0, 80) }
    })
    .filter((l) => l.href.startsWith("http"))
    .slice(0, 80)

  // Unique external domains
  const externalDomains = [
    ...new Set(
      links
        .map((l) => {
          try {
            return new URL(l.href).hostname
          } catch {
            return ""
          }
        })
        .filter((d) => d && d !== currentDomain)
    ),
  ].slice(0, 20)

  // Forms — collect input field types and names/placeholders
  const forms = Array.from(document.querySelectorAll("form")).map((form) => {
    const inputs = Array.from(form.querySelectorAll("input, select, textarea"))
    return {
      fieldTypes: inputs.map((el) => (el as HTMLInputElement).type ?? el.tagName.toLowerCase()),
      fieldNames: inputs
        .map(
          (el) =>
            ((el as HTMLInputElement).name ||
              (el as HTMLInputElement).id ||
              (el as HTMLInputElement).placeholder ||
              "")
              .toLowerCase()
              .substring(0, 40)
        )
        .filter(Boolean),
    }
  })

  // Iframe source domains
  const iframeSources = Array.from(document.querySelectorAll("iframe[src]"))
    .map((f) => {
      try {
        return new URL((f as HTMLIFrameElement).src).hostname
      } catch {
        return ""
      }
    })
    .filter(Boolean)

  // Phone numbers from visible text
  const phoneMatches =
    (document.body?.innerText ?? "").match(
      /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g
    ) ?? []
  const phoneNumbers = [...new Set(phoneMatches)].slice(0, 5)

  // Meta description
  const metaDescription =
    (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content ?? ""

  return {
    url: window.location.href,
    title: document.title,
    metaDescription,
    visibleText,
    links,
    externalDomains,
    forms,
    iframeSources,
    phoneNumbers,
  }
}

/**
 * Scrapes the active tab's page content and returns structured PageData.
 */
export const scrapeCurrentPage = async (): Promise<PageData> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (!tab?.id) {
    throw new Error("No active tab found")
  }

  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapePageContent,
  })

  if (!injectionResult?.result) {
    throw new Error("Failed to scrape page content")
  }

  const scraped = injectionResult.result as Omit<PageData, "timestamp">

  return {
    ...scraped,
    timestamp: new Date().toISOString(),
  }
}
