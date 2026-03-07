# Chrome Web Store Listing — FRED

Reference document for the Chrome Web Store submission fields.

---

## Name

FRED - Fraud Recognition & Easy Detection

---

## Short Description

(132 character max)

```
AI-powered fraud and phishing detector for emails, text, and URLs. 25 free checks/week included. Use your own OpenAI key for unlimited.
```

---

## Detailed Description

(Paste this into the "Description" field on the store listing)

```
FRED (Fraud Recognition & Easy Detection) helps you instantly spot fraud, scams, and phishing attempts before they catch you off guard. Get started immediately with 25 free checks per week — no API key or account needed. For unlimited checks, bring your own OpenAI API key.

--- WHAT IT DOES ---

Paste an email, a suspicious message, or a sketchy link and FRED gives you a plain-English threat assessment in seconds. You get a 1–100 threat score, an AI confidence rating, a clear explanation of what looks suspicious, and a list of specific red flags detected in the content.

--- FOUR WAYS TO ANALYZE ---

Email Analysis — Open Gmail, switch to the Email tab, and click "Check Current Email" to scan the full message including sender details and headers.

Text Analysis — Paste any text: a forwarded message, a letter, a chat snippet, a suspicious notification. FRED will tell you if it looks like a scam.

URL Analysis — Got a link you don't trust? Paste it into the URL tab and FRED will analyze the domain structure, redirects, and other signals that indicate phishing or malicious destinations.

History — Your last 20 analyses are saved locally so you can revisit past results without re-running them.

--- THREAT RATING SYSTEM ---

• 1–25: Low risk (green) — content appears legitimate
• 26–50: Moderate risk (yellow) — some suspicious elements worth noting
• 51–75: High risk (orange) — multiple red flags, treat with caution
• 76–100: Critical risk (red) — strong indicators of fraud or phishing

Each result also includes an AI confidence score so you know how certain the model is about its assessment.

--- YOUR PRIVACY COMES FIRST ---

FRED is designed around the principle that your data belongs to you:

• Free tier: content is routed through FRED's Cloudflare Worker to OpenAI. The worker does not log or store your content — it only tracks a per-device check count for rate limiting.
• BYOK mode: content goes directly from your browser to OpenAI — FRED's servers are never involved.
• Your OpenAI API key is stored only in your browser's local storage using obfuscation; never transmitted to our servers.
• No tracking, analytics, or telemetry is collected about your content.
• Text you analyze is never stored persistently (history is kept locally on your device only).
• The extension requests only the minimum permissions needed to function.

--- HOW TO GET STARTED ---

1. Install FRED from the Chrome Web Store
2. Open FRED — you get 25 free checks per week immediately, no setup needed
3. For unlimited checks: get a free API key at platform.openai.com, open FRED → Settings → switch to "My Own Key", and paste your key

OpenAI API usage costs fractions of a cent per analysis. There is no subscription fee for FRED itself.

--- OPEN SOURCE ---

FRED is open source. You can review the full source code on GitHub:
https://github.com/shadoath/fred-fraud-recognition-and-easy-detection

Store listing: https://chromewebstore.google.com/detail/fred-fraud-recognition-ea/bjdbcabacnlmbpcmiapcdfancfgcakfn
```

---

## Category

Productivity

(Secondary suggestion: Security)

---

## Language

English

---

## Privacy Practices

### Single purpose description

FRED analyzes user-provided text, email content, and URLs for fraud, phishing, and scam indicators using the OpenAI API.

### Permissions justification

| Permission | Reason |
|---|---|
| `storage` | Saves the user's API key and analysis history locally in the browser |
| `scripting` | Extracts email content from Gmail tabs when the user triggers an analysis |
| `tabs` | Identifies the active Gmail tab to extract email content from |
| `activeTab` | Reads the currently active tab to support email analysis |
| `host_permissions: mail.google.com` | Required to inject the content script that reads Gmail email body and sender info |

### Data usage

- **Personally identifiable information**: Not collected
- **Health info**: Not collected
- **Financial info**: Not collected
- **Authentication info**: The user's OpenAI API key (BYOK mode) is stored locally only; never transmitted to our servers
- **Personal communications**: Email/text content is sent to OpenAI for analysis via the user's browser (BYOK mode) or FRED's Cloudflare proxy (free tier); content is not logged or stored by FRED in either case
- **Website content**: URL strings are sent to OpenAI for analysis; not collected by FRED
- **User activity**: Not collected
- **Website content**: Not collected beyond what the user explicitly submits for analysis

### Data handling

- Data is NOT sold to third parties
- Data is NOT used or transferred for purposes unrelated to the extension's core functionality
- Data is NOT used or transferred to determine creditworthiness or for lending purposes

---

## Store Assets Checklist

- [ ] Icon 128x128 PNG (already in `/public/fred-128.png`)
- [ ] At least 1 screenshot (1280x800 or 640x400)
- [ ] Optional: promotional tile 440x280
- [ ] Optional: marquee image 1400x560

### Suggested screenshot captions

1. **Email tab** — "Scan any Gmail email for fraud indicators with one click"
2. **Text tab** — "Paste any suspicious message and get an instant threat rating"
3. **URL tab** — "Check suspicious links before you click them"
4. **History tab** — "Review your last 20 analyses any time"
5. **Threat result** — "Color-coded 1–100 threat score with AI confidence rating and detailed explanation"
