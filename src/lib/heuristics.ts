// Tier 1 client-side heuristics engine.
// Pure functions only — no Chrome APIs, no network calls. Fully unit-testable.

export interface HeuristicsInput {
  sender: string // Full "From" field, e.g. "PayPal <noreply@paypa1.com>" or "noreply@paypa1.com"
  subject: string
  content: string
  links?: { href: string; text: string }[]
}

export interface HeuristicsResult {
  score: number // 0–100 (additive, capped)
  flags: string[] // human-readable, jargon-free descriptions
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

interface KnownBrand {
  names: string[]
  domains: string[]
}

const KNOWN_BRANDS: KnownBrand[] = [
  { names: ["paypal"], domains: ["paypal.com"] },
  {
    names: ["amazon", "prime"],
    domains: ["amazon.com", "amazon.co.uk", "amazon.de", "amazon.ca", "amazon.co.jp"],
  },
  {
    names: ["google", "gmail", "youtube"],
    domains: ["google.com", "gmail.com", "youtube.com", "accounts.google.com"],
  },
  {
    names: ["microsoft", "windows", "outlook", "azure"],
    domains: ["microsoft.com", "live.com", "outlook.com", "hotmail.com"],
  },
  { names: ["apple", "icloud", "itunes"], domains: ["apple.com", "icloud.com"] },
  {
    names: ["facebook", "instagram", "meta", "whatsapp"],
    domains: ["facebook.com", "meta.com", "instagram.com", "fb.com"],
  },
  { names: ["netflix"], domains: ["netflix.com"] },
  { names: ["bank of america", "bankofamerica"], domains: ["bankofamerica.com"] },
  { names: ["wells fargo", "wellsfargo"], domains: ["wellsfargo.com"] },
  { names: ["chase", "jpmorgan"], domains: ["chase.com", "jpmorgan.com"] },
  { names: ["irs", "internal revenue"], domains: ["irs.gov"] },
  { names: ["social security", "ssa"], domains: ["ssa.gov"] },
  { names: ["ups"], domains: ["ups.com"] },
  { names: ["fedex"], domains: ["fedex.com"] },
  { names: ["dhl"], domains: ["dhl.com"] },
  { names: ["usps", "postal service"], domains: ["usps.com"] },
  { names: ["ebay"], domains: ["ebay.com"] },
  { names: ["linkedin"], domains: ["linkedin.com"] },
  { names: ["twitter", "x.com"], domains: ["twitter.com", "x.com"] },
  { names: ["coinbase"], domains: ["coinbase.com"] },
]

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "live.com",
  "protonmail.com",
  "mail.com",
  "yandex.com",
  "zoho.com",
])

// Words commonly appended to real brand names in phishing domains
const SUSPICIOUS_DOMAIN_KEYWORDS = [
  "-secure",
  "-verify",
  "-verification",
  "-update",
  "-account",
  "-support",
  "-login",
  "-signin",
  "-help",
  "-alert",
  "-service",
  "-billing",
  "-payment",
  "-customer",
  "secure-",
  "verify-",
  "account-",
  "login-",
  "support-",
  ".secure.",
  ".verify.",
  ".login.",
]

const SUSPICIOUS_TLDS = [
  ".xyz",
  ".tk",
  ".ml",
  ".ga",
  ".cf",
  ".gq",
  ".pw",
  ".top",
  ".click",
  ".loan",
  ".win",
  ".bid",
  ".review",
  ".party",
  ".trade",
  ".download",
]

const URL_SHORTENER_DOMAINS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "short.link",
  "tiny.cc",
  "is.gd",
  "rb.gy",
  "cutt.ly",
  "shorturl.at",
  "snip.ly",
  "buff.ly",
])

const URGENCY_PHRASES = [
  "act now",
  "act immediately",
  "urgent action required",
  "immediate action",
  "your account will be suspended",
  "your account has been suspended",
  "account suspended",
  "account terminated",
  "account blocked",
  "verify your account",
  "verify your identity",
  "confirm your identity",
  "confirm your account",
  "confirm your information",
  "unusual activity detected",
  "suspicious activity detected",
  "unauthorized access",
  "unauthorized login",
  "limited time",
  "offer expires",
  "expires today",
  "expires soon",
  "last chance",
  "click here immediately",
  "respond immediately",
  "failure to respond",
  "your account will be closed",
  "account termination",
  "you have been selected",
  "you have won",
  "claim your prize",
  "claim your reward",
  "claim your refund",
  "congratulations you have",
  "free gift",
  "free prize",
  "as soon as possible",
  "within 24 hours",
  "within 48 hours",
  "action required",
  "important notice",
  "security alert",
  "update your information",
  "update your payment",
  "update your details",
  "your payment was declined",
  "your payment failed",
  "delivery failed",
  "delivery attempt failed",
  "package on hold",
]

const SENSITIVE_DATA_PHRASES = [
  "enter your password",
  "enter your pin",
  "enter your passcode",
  "confirm your password",
  "confirm your pin",
  "provide your social security",
  "your social security number",
  "your ssn",
  "provide your ssn",
  "credit card number",
  "enter your card",
  "card details",
  "card information",
  "bank account number",
  "routing number",
  "date of birth",
  "mother's maiden name",
  "provide your username and password",
  "login credentials",
  "enter your credentials",
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ParsedSender {
  displayName: string
  domain: string
}

const parseSender = (sender: string): ParsedSender => {
  const match = sender.match(/^(.+?)\s*<[^@>]+@([^>]+)>$/)
  if (match) {
    return {
      displayName: match[1].trim().replace(/^["']|["']$/g, ""),
      domain: match[2].trim().toLowerCase(),
    }
  }
  const emailMatch = sender.match(/@(.+)$/)
  return {
    displayName: "",
    domain: emailMatch ? emailMatch[1].trim().toLowerCase() : "",
  }
}

const extractDomain = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Individual checks — each returns points + optional flag string(s)
// ---------------------------------------------------------------------------

const checkBrandImpersonation = (displayName: string, domain: string): { points: number; flag: string | null } => {
  if (!displayName || !domain) return { points: 0, flag: null }
  const displayLower = displayName.toLowerCase()

  for (const brand of KNOWN_BRANDS) {
    if (!brand.names.some((n) => displayLower.includes(n))) continue
    const domainMatch = brand.domains.some((d) => domain === d || domain.endsWith("." + d))
    if (!domainMatch) {
      return {
        points: 30,
        flag: `Sender claims to be "${displayName}" but the email address "${domain}" doesn't belong to that company`,
      }
    }
  }
  return { points: 0, flag: null }
}

const checkFreeEmailWithBrandName = (displayName: string, domain: string): { points: number; flag: string | null } => {
  if (!displayName || !domain) return { points: 0, flag: null }
  if (!FREE_EMAIL_PROVIDERS.has(domain)) return { points: 0, flag: null }

  const displayLower = displayName.toLowerCase()
  for (const brand of KNOWN_BRANDS) {
    if (brand.names.some((n) => displayLower.includes(n))) {
      return {
        points: 20,
        flag: `A real company like "${displayName}" would never send official emails from a personal address like ${domain}`,
      }
    }
  }
  return { points: 0, flag: null }
}

const checkSuspiciousDomainKeywords = (domain: string): { points: number; flag: string | null } => {
  for (const keyword of SUSPICIOUS_DOMAIN_KEYWORDS) {
    if (domain.includes(keyword)) {
      return {
        points: 20,
        flag: `The sender's web address "${domain}" uses a word like "secure" or "verify" — a common trick scammers use to appear official`,
      }
    }
  }
  return { points: 0, flag: null }
}

const checkSuspiciousTld = (domain: string): { points: number; flag: string | null } => {
  for (const tld of SUSPICIOUS_TLDS) {
    if (domain.endsWith(tld)) {
      return {
        points: 10,
        flag: `The sender's web address ends in "${tld}" — a domain ending commonly used by scam websites`,
      }
    }
  }
  return { points: 0, flag: null }
}

const checkUrgencyLanguage = (text: string): { points: number; flags: string[] } => {
  const lower = text.toLowerCase()
  const matched: string[] = []
  for (const phrase of URGENCY_PHRASES) {
    if (lower.includes(phrase)) matched.push(phrase)
    if (matched.length >= 3) break
  }
  if (matched.length === 0) return { points: 0, flags: [] }
  return {
    points: Math.min(20, matched.length * 7),
    flags: [
      `Uses pressure tactics to make you act fast ("${matched[0]}"${matched.length > 1 ? ` and ${matched.length - 1} more` : ""})`,
    ],
  }
}

const checkSensitiveDataRequest = (text: string): { points: number; flag: string | null } => {
  const lower = text.toLowerCase()
  for (const phrase of SENSITIVE_DATA_PHRASES) {
    if (lower.includes(phrase)) {
      return {
        points: 20,
        flag: "Asks you to enter sensitive information like a password, card number, or social security number",
      }
    }
  }
  return { points: 0, flag: null }
}

const checkLinkMismatches = (links: { href: string; text: string }[]): { points: number; flags: string[] } => {
  const flags: string[] = []
  let points = 0
  for (const link of links) {
    if (points >= 25) break
    const hrefDomain = extractDomain(link.href)
    if (!hrefDomain) continue
    const textTrimmed = link.text.trim()
    if (!textTrimmed || textTrimmed.length < 6) continue
    // Only check when the link text itself looks like a URL
    if (!textTrimmed.includes(".") && !textTrimmed.startsWith("http")) continue
    try {
      const asUrl = textTrimmed.startsWith("http") ? textTrimmed : "https://" + textTrimmed
      const textDomain = new URL(asUrl).hostname.toLowerCase()
      if (
        textDomain &&
        textDomain !== hrefDomain &&
        !hrefDomain.endsWith("." + textDomain) &&
        !textDomain.endsWith("." + hrefDomain)
      ) {
        flags.push(`A link says "${textTrimmed}" but actually leads to "${hrefDomain}"`)
        points += 15
      }
    } catch {
      // text wasn't a parseable URL, skip
    }
  }
  return { points: Math.min(25, points), flags }
}

const checkIpAddressLinks = (links: { href: string; text: string }[]): { points: number; flag: string | null } => {
  for (const link of links) {
    try {
      const { hostname } = new URL(link.href)
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
        return {
          points: 25,
          flag: "Contains a link to a raw IP address instead of a website name — a common sign of a phishing or malware link",
        }
      }
    } catch {
      // not a valid URL
    }
  }
  return { points: 0, flag: null }
}

const checkUrlShorteners = (links: { href: string; text: string }[]): { points: number; flag: string | null } => {
  let count = 0
  for (const link of links) {
    const domain = extractDomain(link.href)
    if (domain && URL_SHORTENER_DOMAINS.has(domain)) count++
    if (count >= 2) break
  }
  if (count === 0) return { points: 0, flag: null }
  return {
    points: Math.min(15, count * 10),
    flag: "Contains shortened links that hide where they actually go",
  }
}

const checkExcessiveCaps = (subject: string, content: string): { points: number; flag: string | null } => {
  const combined = `${subject} ${content.slice(0, 600)}`
  const words = combined.split(/\s+/).filter((w) => w.length > 3)
  if (words.length < 5) return { points: 0, flag: null }
  const capsCount = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w)).length
  if (capsCount / words.length > 0.3) {
    return { points: 8, flag: "Uses an unusual amount of capital letters — a common attention-grabbing tactic in spam" }
  }
  return { points: 0, flag: null }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const runHeuristics = (input: HeuristicsInput): HeuristicsResult => {
  const { sender, subject, content, links = [] } = input
  const fullText = `${subject} ${content}`
  const { displayName, domain } = parseSender(sender)

  const flags: string[] = []
  let score = 0

  const add = (result: { points: number; flag?: string | null; flags?: string[] }) => {
    score += result.points
    if (result.flag) flags.push(result.flag)
    if (result.flags) flags.push(...result.flags)
  }

  add(checkBrandImpersonation(displayName, domain))
  add(checkFreeEmailWithBrandName(displayName, domain))
  add(checkSuspiciousDomainKeywords(domain))
  add(checkSuspiciousTld(domain))
  add(checkUrgencyLanguage(fullText))
  add(checkSensitiveDataRequest(fullText))
  add(checkLinkMismatches(links))
  add(checkIpAddressLinks(links))
  add(checkUrlShorteners(links))
  add(checkExcessiveCaps(subject, content))

  return { score: Math.min(100, score), flags }
}
