// FRED Gmail content script.
// Watches for emails being opened, extracts data, and orchestrates badge injection.
// Communicates with the background service worker for Tier 2 and Tier 3 analysis.

import {
  type BadgeState,
  mountBadge,
  removeBadge,
  removeDetailPanel,
  showDetailPanel,
} from "./gmailBadge"

// ---------------------------------------------------------------------------
// Storage key constants (must match keyStorage.ts / licenseStorage.ts)
// ---------------------------------------------------------------------------

const CONNECTION_MODE_KEY = "fredConnectionMode"
const LICENSE_KEY_STORAGE_KEY = "fredLicenseKey"
const AUTO_SCAN_KEY = "fredAutoScanSettings"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let updateBadge: ((state: BadgeState) => void) | null = null
let lastUrl = location.href
let lastMessageId: string | null = null
let pendingScan = false

// Stores the latest scan result for the current email (for the detail panel)
let currentResult: { threatRating: number; explanation: string; flags: string[] } | null = null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isEmailViewUrl = (url: string): boolean => {
  const hash = new URL(url).hash
  // Gmail email URLs look like #inbox/FMfcgz..., #sent/..., #all/..., etc.
  return /^#\w+\/[\w-]{10,}/.test(hash)
}

const waitForElement = (selector: string, maxMs = 5000): Promise<Element | null> =>
  new Promise((resolve) => {
    const el = document.querySelector(selector)
    if (el) { resolve(el); return }

    const start = Date.now()
    const interval = setInterval(() => {
      const found = document.querySelector(selector)
      if (found) { clearInterval(interval); resolve(found); return }
      if (Date.now() - start > maxMs) { clearInterval(interval); resolve(null) }
    }, 200)
  })

const extractEmailData = (): {
  sender: string
  subject: string
  content: string
  links: { href: string; text: string }[]
  messageId: string | null
} | null => {
  // Sender — multiple fallback selectors (Gmail's DOM changes over time)
  const sender =
    document.querySelector("[data-message-id] [email]")?.getAttribute("email") ||
    document.querySelector(".gE [email]")?.getAttribute("email") ||
    document.querySelector(".gD [email]")?.getAttribute("email") ||
    document.querySelector("[data-hovercard-id]")?.getAttribute("data-hovercard-id") ||
    document.querySelector(".go")?.textContent?.trim() ||
    ""

  // Subject
  const subject =
    document.querySelector(".ha h2")?.textContent?.trim() ||
    document.querySelector("[data-message-id] .hP")?.textContent?.trim() ||
    ""

  // Body
  const bodyEl =
    document.querySelector("[data-message-id] .a3s.aiL") ||
    document.querySelector(".a3s.aiL")

  const content = bodyEl?.textContent?.replace(/\n+/g, " ").trim() || ""

  // Links
  const links: { href: string; text: string }[] = []
  if (bodyEl) {
    bodyEl.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href")
      const text = a.textContent?.trim() || ""
      if (href && href.startsWith("http")) links.push({ href, text })
    })
  }

  // Message ID (for deduplication)
  const messageId =
    document.querySelector("[data-message-id]")?.getAttribute("data-message-id") || null

  if (!sender || !content) return null
  return { sender, subject, content, links, messageId }
}

const isAutoScanEligible = async (): Promise<boolean> => {
  const storage = await chrome.storage.local.get([CONNECTION_MODE_KEY, LICENSE_KEY_STORAGE_KEY, AUTO_SCAN_KEY])
  const mode: string = storage[CONNECTION_MODE_KEY] ?? "proxy"
  const licenseKey: string | null = storage[LICENSE_KEY_STORAGE_KEY] ?? null
  const settings = { enabled: false, ...(storage[AUTO_SCAN_KEY] as object | undefined) } as { enabled: boolean }

  if (!settings.enabled) return false
  if (mode === "byok") return true
  if (mode === "proxy" && licenseKey) return true
  return false
}

// ---------------------------------------------------------------------------
// Badge + scan orchestration
// ---------------------------------------------------------------------------

const handleDetailsClick = (): void => {
  if (!currentResult) return
  if (document.getElementById("fred-detail-panel")) {
    removeDetailPanel()
  } else {
    showDetailPanel(currentResult)
  }
}

const startScan = (emailData: ReturnType<typeof extractEmailData>): void => {
  if (!emailData || pendingScan) return
  pendingScan = true
  currentResult = null

  chrome.runtime.sendMessage({
    type: "SCAN_EMAIL",
    emailData: {
      sender: emailData.sender,
      subject: emailData.subject,
      content: emailData.content,
      links: emailData.links,
    },
  })
}

const injectBadge = async (autoScan: boolean): Promise<void> => {
  // Wait for the email header to be present
  const headerEl = await waitForElement("[data-message-id] .ha")
  if (!headerEl) return

  const emailData = extractEmailData()
  if (!emailData) return

  // Skip if same email re-opened
  if (emailData.messageId && emailData.messageId === lastMessageId) return
  lastMessageId = emailData.messageId

  // Clean up previous badge
  removeBadge()
  removeDetailPanel()
  updateBadge = null

  const onScanClick = () => {
    if (updateBadge) updateBadge({ type: "scanning" })
    startScan(emailData)
  }

  updateBadge = mountBadge(headerEl, onScanClick, handleDetailsClick)

  if (autoScan) {
    startScan(emailData)
  } else {
    // Free users: show the manual scan button
    updateBadge({ type: "button" })
  }
}

// ---------------------------------------------------------------------------
// Service worker message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message: { type: string; score?: number; flags?: string[]; suspicious?: boolean; confidence?: number; result?: { threatRating: number; explanation: string; flags: string[]; confidence?: number }; message?: string }) => {
    if (!updateBadge) return

    switch (message.type) {
      case "TIER1_RESULT":
        // Keep "scanning" state — tier 2 may follow
        break

      case "TIER2_RESULT":
        if (message.suspicious) {
          updateBadge({ type: "tier2" })
        }
        break

      case "SCAN_COMPLETE": {
        pendingScan = false
        const result = message.result!
        currentResult = result

        if (result.threatRating >= 70) {
          updateBadge({ type: "dangerous", rating: result.threatRating })
        } else if (result.threatRating >= 40) {
          updateBadge({ type: "suspicious", rating: result.threatRating })
        } else {
          updateBadge({ type: "safe" })
        }
        break
      }

      case "SCAN_ERROR":
        pendingScan = false
        updateBadge({ type: "error" })
        break
    }
  }
)

// ---------------------------------------------------------------------------
// URL change detection (Gmail is a SPA, hash changes on email open)
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const handleUrlChange = async (): Promise<void> => {
  const url = location.href
  if (url === lastUrl) return
  lastUrl = url

  // Clean up immediately on navigation
  removeBadge()
  removeDetailPanel()
  updateBadge = null
  pendingScan = false
  currentResult = null
  lastMessageId = null

  if (!isEmailViewUrl(url)) return

  // Debounce: Gmail sometimes fires multiple hash changes in quick succession
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const autoScan = await isAutoScanEligible()
    await injectBadge(autoScan)
  }, 400)
}

// hashchange fires for Gmail navigation
window.addEventListener("hashchange", handleUrlChange)

// MutationObserver catches cases where Gmail changes URL without firing hashchange
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    handleUrlChange()
  }
})
urlObserver.observe(document.body, { childList: true, subtree: true })

// Check on initial load (if user opens Gmail directly on an email URL)
;(async () => {
  if (isEmailViewUrl(location.href)) {
    const autoScan = await isAutoScanEligible()
    await injectBadge(autoScan)
  }
})()
