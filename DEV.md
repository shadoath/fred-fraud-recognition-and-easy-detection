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
    MainDisplay.tsx      # Root layout, toolbar, tab switching
    ContentAnalyzer.tsx  # Unified text/URL/page analysis form
    EmailAnalyzer.tsx    # Gmail extraction and email analysis
    ApiKeySettings.tsx   # Settings panel, Premium upgrade, usage stats
    ThreatRating.tsx     # Threat score display component
    HistoryTab.tsx       # Analysis history list
  hooks/
    useApiKey.tsx        # API key, model, connection mode, license key state
  lib/
    fraudService.ts      # OpenAI API integration, prompt building
    keyStorage.ts        # API key obfuscation and Chrome storage
    licenseStorage.ts    # License key persistence
    usageStorage.ts      # Monthly usage tracking
    historyStorage.ts    # Analysis history (last 20 entries)
    pageScraper.ts       # Page content extraction via chrome.scripting
    deviceId.ts          # Persistent device ID for rate limiting
  types/
    fraudTypes.ts        # Shared type definitions
fred-proxy/
  src/index.ts           # Cloudflare Worker — proxy, rate limiting, license validation
  wrangler.toml          # Worker configuration
docs/                    # GitHub Pages site (fredsecurity.com)
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
