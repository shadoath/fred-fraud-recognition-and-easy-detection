# FRED — Development Guide

## Tech Stack

- React + TypeScript
- Material UI
- Vite
- Chrome Extension Manifest V3
- Cloudflare Workers + KV (proxy / rate limiting)

## Setup

```bash
git clone https://github.com/shadoath/fred-fraud-recognition-and-easy-detection.git
cd fred-fraud-recognition-and-easy-detection
npm install
npm run build
```

Load the extension in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked" and select the `dist` folder

## Commands

```bash
npm run dev       # Start the dev server
npm run build     # Build the extension (output in dist/)
npm run watch     # Watch for changes and rebuild
npm run lint      # Lint the code
npm run test      # Run all tests
npm run test:watch # Run tests in watch mode
```

## Project Structure

```
src/
  components/       # React UI components
    MainDisplay.tsx        # Root layout, toolbar, settings/history panels
    Scanner.tsx            # Single "Scan This Email" / "Scan This Page" button + result display
    GeneralSettings.tsx    # Text size slider, Gmail auto-scan toggle, website auto-scan toggle
    ApiKeySettings.tsx     # Connection mode (proxy/BYOK), license key, model selector, usage stats
    AnalysisResultPanel.tsx # Renders threat result after a scan
    ThreatRating.tsx       # Threat score display component
    DetectedIndicators.tsx # List of flagged threat indicators
    HistoryTab.tsx         # Analysis history — card layout with type chips and status pills
    ScanningIndicator.tsx  # Spinner/progress shown while scan is running
    UsageStatsSection.tsx  # All-time and weekly usage stats
    HelpContent.tsx        # Help/FAQ panel
    ErrorBoundary.tsx      # Top-level React error boundary
  background/
    serviceWorker.ts       # Background service worker — Tier 1/2/3 scan orchestration
  content/
    gmailScanner.ts        # MutationObserver, email extraction, badge injection for Gmail
    gmailBadge.ts          # Badge DOM lifecycle (mount, update, unmount)
  hooks/
    useApiKey.tsx          # API key, model, connection mode, license key state
  lib/
    fraudService.ts        # OpenAI API integration, prompt building, Tier 2/3 calls
    heuristics.ts          # Tier 1 client-side fraud pattern matching
    keyStorage.ts          # API key obfuscation and Chrome storage
    licenseStorage.ts      # License key persistence
    usageStorage.ts        # Weekly usage tracking (checks, threats caught)
    historyStorage.ts      # Analysis history (last 20 entries)
    autoScanStorage.ts     # Auto-scan settings persistence
    pageScraper.ts         # Page content extraction via chrome.scripting
    deviceId.ts            # Persistent device ID for rate limiting
    theme.ts               # Single light theme (fredBlue = #47b1e5)
    threatUtils.ts         # Shared threat scoring helpers
    apiErrorUtils.ts       # API error parsing and messaging
    simpleEnhancedStorage.ts # V3 key obfuscation format
  types/
    fraudTypes.ts          # Shared type definitions
fred-proxy/
  src/index.ts             # Cloudflare Worker — proxy, rate limiting, license validation
  wrangler.toml            # Worker configuration
docs/                      # GitHub Pages site (fredsecurity.com)
```

## Cloudflare Worker (Proxy)

The free/premium proxy lives in `fred-proxy/`. It handles:

- Rate limiting (monthly, per device ID or license key)
- License key validation against LemonSqueezy API (cached in KV)
- Model tier enforcement (gpt-4o-mini for free, gpt-4o for premium)
- OpenAI API forwarding

### Worker Secrets

Set via `wrangler secret put <NAME>` from within `fred-proxy/`:

- `OPENAI_API_KEY` — OpenAI API key for proxy requests
- `FRED_SECRET` — shared secret for request authentication
- `LEMONSQUEEZY_API_KEY` — LemonSqueezy API key for license validation

### Deploy

```bash
cd fred-proxy
wrangler deploy
```

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- `npm run build` must pass before committing
- Use double quotes, no semicolons, arrow functions, optional chaining (`?.`)
- Keep changes focused — don't refactor beyond what's needed
- Both `package.json` and `public/manifest.json` need version bumps for releases

## AI Acknowledgment

This project was built with assistance from Claude AI using Claude Code.
