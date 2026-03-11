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

Open a suspicious email or webpage, click the FRED icon, and hit the Scan button — FRED auto-detects what you're looking at and gives you a plain-English threat assessment in seconds. You get a 1–100 threat score, an AI confidence rating, a clear explanation of what looks suspicious, and a list of specific red flags detected in the content.

--- TWO WAYS TO SCAN ---

Email Scanning — Open any Gmail email and click "Scan This Email" to analyze the full message including sender details and headers. Enable auto-scan to have FRED check emails automatically when you open them (paid/BYOK only).

Web Page Scanning — On any webpage, click "Scan This Page" to analyze the page content for fraud signals. Enable auto-scan to have FRED run automatically when you open the popup (paid/BYOK only).

History — Your last 20 analyses are saved locally in a card layout with type labels (Email/Website), threat icons, and color-coded status pills so you can revisit past results at a glance.

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
3. For unlimited checks: get a free API key at platform.openai.com, open FRED → Settings → API Settings → switch to "My Own Key", and paste your key

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
| `storage` | Saves the user's API key, settings, and analysis history locally in the browser |
| `scripting` | Extracts page content from tabs when the user triggers an analysis |
| `tabs` | Identifies the active tab to determine scan type and extract content |
| `activeTab` | Reads the currently active tab to support email and page scanning |
| `host_permissions: mail.google.com` | Required for the Gmail content script that reads email body, sender info, and badge scanning |

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

1. **Scan button** — "One click scans your Gmail email or current webpage automatically"
2. **Threat result** — "Color-coded 1–100 threat score with AI confidence rating and detailed explanation"
3. **History tab** — "Review your last 20 analyses in a card layout with type labels and status pills"
4. **Settings panel** — "General Settings and API Settings in clean accordions — text size slider, auto-scan toggles, and key management"
