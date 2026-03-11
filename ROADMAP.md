# FRED Roadmap

The goal is to transform FRED from a tool users actively invoke into a protection layer that silently watches and warns — catching fraud before users engage with it.

---

## Phase 1: Auto-scan Gmail (proactive protection)

**The core shift:** FRED currently requires the user to open the popup and manually paste or extract content. Phase 1 makes FRED run automatically whenever an email is opened in Gmail, showing a threat badge inline without any user action.

### Access gates

The content script and Gmail badge run for **all users** — everyone gets the in-page experience. What differs is the trigger mode:

| User type | Trigger mode | Notes |
|-----------|-------------|-------|
| **Free proxy** | Manual — "Scan this email" button injected into Gmail | Button initiates a full Tier 1 → 2 → 3 scan on click. Uses their 3 free monthly checks. Acts as a conversion funnel toward Premium. |
| **BYOK** | Automatic — scans immediately when email opens | Each scan costs the user their own OpenAI API credits. |
| **Paid proxy** | Automatic — scans immediately when email opens | Counts against their 300 monthly checks. |

Free users who try to enable "automatic scan" in settings see an upgrade prompt. Their manual button always works within their monthly check limit.

### Scanning tiers

Auto-scan runs up to three tiers per email, escalating only when needed.

**Tier 1 — Client-side heuristics (always runs, zero cost)**

Runs entirely in the content script. No API call, no proxy, instant.

Checks:
- Sender display name vs. actual email domain mismatch (e.g. "PayPal Support" from `noreply@secure-paypa1.net`)
- Known phishing domain patterns (homoglyphs, brand names with appended words like `-secure`, `-verify`, `-update`)
- Urgency and pressure language ("act now", "your account will be suspended", "verify immediately", "limited time")
- Links where the display text doesn't match the href domain
- IP address used instead of a domain name in links
- URL shorteners hiding the destination (bit.ly, tinyurl, t.co, etc.)
- Requests for sensitive data ("enter your password", "confirm your SSN", "provide your card number")
- Excessive ALL CAPS or exclamation marks
- Grammar/spelling signals (a curated list of common phishing misspellings)

Output: `{ score: number (0–100), flags: string[] }`. Score ≥ 40 triggers Tier 2.

**Tier 2 — AI triage (triggers when Tier 1 score ≥ 40)**

A short, cheap prompt sent to `gpt-4o-mini` via the proxy. Sends: sender, subject, first 800 chars of content, and Tier 1 flags. Returns only: `{ suspicious: boolean, confidence: number }`. Uses 1 proxy check.

If `suspicious === true && confidence ≥ 0.7`, escalates to Tier 3.

**Tier 3 — Deep scan (triggers when Tier 2 flags suspicious)**

Full analysis using the existing `checkContentWithOpenAI` flow — same prompt, same response shape as today. Returns `threatRating`, `explanation`, `flags`, `confidence`. Saves to history. Uses 1 proxy check (paid model).

### Gmail badge / UI injection

The content script injects a small FRED badge at the top of each opened email. It is non-intrusive — a thin bar or chip-style element above the email header.

**Badge states:**
- `[Scan this email]` — free users only; button that triggers a manual scan on click
- `scanning…` — spinner while any tier is running (auto or manual)
- `✓ No threats found` — Tier 1 score < 40, or Tier 2 returns safe
- `⚠ Suspicious` — Tier 2/3 flagged, medium threat (rating 40–69)
- `🚨 Dangerous` — Tier 3 threat rating ≥ 70

Clicking the badge on a suspicious/dangerous result opens the FRED popup pre-loaded with the full result. The popup detects the `pendingResult` via `chrome.storage.local` and renders it immediately.

### Architecture changes

**New files:**
```
src/background/serviceWorker.ts     — coordinates scan jobs, holds API key access
src/content/gmailScanner.ts         — MutationObserver, email extraction, badge injection
src/lib/heuristics.ts               — Tier 1 engine (pure functions, fully testable)
src/lib/autoScanStorage.ts          — persists auto-scan settings
src/content/gmailBadge.ts           — badge DOM lifecycle (mount, update, unmount)
```

**Changed files:**
```
public/manifest.json                — add background service_worker, content_scripts for mail.google.com
vite.config.ts                      — add content script + service worker as separate Rollup entry points
src/lib/fraudService.ts             — add buildTier2Prompt() and checkTier2()
src/components/ApiKeySettings.tsx   — add auto-scan toggle + sensitivity setting UI
```

**Messaging protocol:**

All messages use `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`.

```
content → background:  { type: "SCAN_EMAIL",   data: EmailData, tabId: number }
background → content:  { type: "TIER1_RESULT", result: HeuristicsResult }
background → content:  { type: "TIER2_RESULT", result: Tier2Result }
background → content:  { type: "SCAN_COMPLETE", result: FraudCheckResponse }
background → content:  { type: "SCAN_ERROR",   error: string }
popup → background:    { type: "GET_LAST_RESULT", tabId: number }
background → popup:    { type: "LAST_RESULT",   result: FraudCheckResponse | null }
```

**Settings stored in `chrome.storage.local`:**
```ts
interface AutoScanSettings {
  enabled: boolean              // master switch
  tier2Threshold: number        // Tier 1 score needed to trigger Tier 2 (default: 40)
  tier3Threshold: number        // Tier 2 confidence needed to trigger Tier 3 (default: 0.7)
  showSafeBadge: boolean        // show the ✓ badge even when no threat found (default: true)
}
```

### Phase 1 build order

1. `heuristics.ts` — pure functions, write tests alongside
2. `autoScanStorage.ts` — settings read/write
3. `manifest.json` + `vite.config.ts` — get the build pipeline working for content script + service worker
4. `serviceWorker.ts` — message handler, tier orchestration, settings gate
5. `gmailBadge.ts` — badge DOM mount/update/unmount
6. `gmailScanner.ts` — MutationObserver, email extraction, wires badge + messaging
7. `fraudService.ts` — add Tier 2 prompt + call
8. `ApiKeySettings.tsx` — auto-scan toggle UI
9. Popup: detect and display `pendingResult` when opened from badge click

### Key risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Gmail DOM changes break extraction | Robust multi-selector fallback chain (already in EmailAnalyzer); monitor and patch |
| Badge injection breaks Gmail layout | Inject as an absolutely positioned overlay, not inline; test across Gmail views |
| MutationObserver fires too often | Debounce + deduplicate by message-id; don't re-scan the same email twice per session |
| Auto-scan spamming proxy | Gate behind paid/BYOK; debounce scan trigger; skip if email already in history |
| Content script conflicts with Gmail's own scripts | Use a shadow DOM for badge to fully isolate styles |

---

## Phase 2: More email providers

Once the Phase 1 architecture exists, adding providers is mostly writing new DOM scrapers and content script match patterns.

**Priority order:**
1. Outlook Web (`outlook.live.com`, `outlook.office.com`, `outlook.office365.com`) — largest enterprise footprint
2. Yahoo Mail (`mail.yahoo.com`)
3. ProtonMail (`mail.proton.me`) — privacy-conscious users, strong overlap with FRED's audience

Each provider needs:
- A content script DOM extractor (same interface as `gmailScanner.ts`)
- A badge injector tuned to that provider's layout
- Entry in `manifest.json` `content_scripts.matches`

---

## Phase 3: Distribution and growth

The best protection tool is worthless if no one installs it. Phase 3 is about reach.

**Chrome Web Store listing:**
- New screenshots showing the auto-scan badge catching a phishing email in real time
- Short description rewritten around the proactive angle: "Automatically scans every email before you read it"
- Demo GIF: email opens → badge shows "scanning…" → flips to "🚨 Dangerous"

**Landing page:**
- Show the badge in context (Gmail screenshot with FRED badge visible)
- One real caught-phishing example with the threat breakdown UI
- Clear tier comparison: Free (manual scan) / BYOK / Premium

**Public threat dashboard:**
- Aggregated, fully anonymized stats: emails scanned this week, threats caught, top threat categories
- Builds social proof and gives press something to write about
- Can be a simple static page rebuilt weekly from proxy-side aggregate counters in KV

**Share a threat report:**
- After any analysis, generate a shareable link (proxy creates a short-lived read-only record in KV)
- Link opens a read-only version of the threat breakdown with FRED branding
- Viral loop: someone gets a phishing email → shares the FRED report with their team → team installs FRED

**Firefox / Edge:**
- Manifest V3 is now stable in Firefox; most of the code is portable
- Edge uses Chromium, so the Chrome build works with minor tweaks
- Doubles addressable audience

---

## Phase 4: Teams and enterprise

Once individuals trust it, organizations want it deployed centrally.

**What's needed:**
- Admin-managed Chrome policy deployment (no individual install required)
- Org-level license: one license key covers N seats
- Admin dashboard: threat activity across the org, per-user stats
- Custom blocklist/allowlist rules pushed to all users
- SIEM integration (webhook on high-threat detections)
- Volume licensing tiers

This phase requires a more substantial backend beyond the Cloudflare Worker — likely a proper database, org/user management, and a dashboard web app.

---

## Guiding principles across all phases

- **Privacy first:** Email content is never stored on the proxy. It goes in, the AI result comes back, the content is discarded. The threat report (rating + flags) may be cached locally in history but raw email text never leaves the device except for the transient API call.
- **User control:** Auto-scan is opt-in, with a clear per-provider toggle. Users can disable it or set it to Tier 1 only.
- **Fail safe:** If any scan tier errors, the badge shows a neutral state — never a false negative presented as "safe."
- **Performance:** The content script adds no measurable load to Gmail. Tier 1 runs synchronously in < 5ms. Tier 2/3 are kicked off asynchronously and don't block rendering.
