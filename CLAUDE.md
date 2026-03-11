# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FRED (Fraud Recognition & Easy Detection) is a Chrome extension that analyzes emails and text for potential fraud or phishing attempts using OpenAI's language models with the user's personal API key.

## Development Commands

```bash
# Start the development server
npm run dev

# Build the extension (output in dist/)
npm run build

# Watch for changes and rebuild
npm run watch

# Lint the code
npm run lint

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Project Architecture

### Core Components

1. **Extension Structure**
   - **Popup**: React-based UI (index.html) built with Vite
   - **Gmail extraction**: Uses `chrome.scripting.executeScript` to extract email content from Gmail tabs

2. **Fraud Detection**
   - `fraudService.ts`: OpenAI API integration for fraud analysis

3. **Key Management**
   - `keyStorage.ts`: Obfuscation and Chrome `storage.local` persistence
   - `simpleEnhancedStorage.ts`: V3 obfuscation format

### Data Flow

1. User provides their OpenAI API key (stored locally with obfuscation)
2. Email: Content extracted from Gmail via scripting, or Text: User pastes content
3. Content is sent to OpenAI for analysis
4. Results displayed with threat ratings and explanations

## Important Files and Directories

- `/src/lib/fraudService.ts`: OpenAI integration for fraud detection. `buildPrompt` routes by type; `isURLData` guard requires `!("content" in data)` to avoid misrouting `TextData` with a `url` field.
- `/src/lib/keyStorage.ts`: API key storage and migration
- `/src/lib/simpleEnhancedStorage.ts`: V3 obfuscation format
- `/src/lib/usageStorage.ts`: Tracks `allTimeChecks`, `allTimeThreats`, `weeklyChecks`, `weeklyThreats` in `chrome.storage.local`. Weekly counters reset on Monday. Threat threshold = 70.
- `/src/lib/historyStorage.ts`: Stores last 20 analysis results locally. Max 20 entries.
- `/src/lib/heuristics.ts`: Tier 1 client-side fraud checks (pure functions, no Chrome API). Returns `{ score, flags }`. Score ≥ 40 triggers Tier 2 in service worker.
- `/src/lib/autoScanStorage.ts`: Persists `AutoScanSettings` — `enabled`, `tier2Threshold` (default 40), `tier3Threshold` (default 0.7), `showSafeBadge`.
- `/src/lib/pageScraper.ts`: Scrapes current tab via `chrome.scripting.executeScript`
- `/src/types/fraudTypes.ts`: Shared type definitions. `TextData` has optional `url?` field for subject/URL context.
- `/src/background/serviceWorker.ts`: MV3 background service worker. Orchestrates Tier 1→2→3 scanning. Uses native `fetch` (not axios). Access gate: BYOK or paid proxy only for Tier 2/3 AI calls. Stores completed results in `chrome.storage.local` as `fredPendingResult`.
- `/src/content/gmailScanner.ts`: Gmail content script. MutationObserver + hashchange for email detection. Injects badge for all users; auto-scans for paid/BYOK users, shows manual button for free users.
- `/src/content/gmailBadge.ts`: Badge DOM lifecycle using shadow DOM. States: button | scanning | tier2 | safe | suspicious | dangerous | error. Inline detail panel on click.
- `/src/components/MainDisplay.tsx`: Root layout, toolbar, tab switching. On open: checks `fredPendingResult` storage for a pending auto-scan result from the badge. Calls `recordCheck(threatRating)` and `saveHistoryEntry` after every analysis.
- `/src/components/ContentAnalyzer.tsx`: Unified form — Subject/URL + Content fields. Routes to `TextData` (with optional url), `URLData`, or `PageData` depending on what's filled.
- `/src/components/EmailAnalyzer.tsx`: Gmail email extraction and analysis
- `/src/components/ApiKeySettings.tsx`: Settings panel with usage stats section and Gmail Auto-scan toggle. Toggle disabled for free proxy users.

## Build system

Two-pass build:
1. `vite build` — popup (`index.html`) + background service worker (`background.js`, ESM)
2. `vite build --mode content` — Gmail content script (`content/gmailScanner.js`, IIFE)

Content script must be IIFE (not ESM) because Chrome MV3 manifest `content_scripts` entries are loaded as classic scripts.

## Auto-scan architecture

Tier 1 (heuristics) runs in the content script via the service worker message handler. Tier 2 (gpt-4o-mini triage) and Tier 3 (full analysis) are called from `serviceWorker.ts` using native `fetch`. The service worker must NOT import `fraudService.ts` — it uses axios which fails in service worker context. Prompt builders are duplicated in `serviceWorker.ts` for this reason.

## Best Practices

1. **API Key Security**: Never commit API keys; use obfuscation in `keyStorage.ts`
2. **Testing**: Mock Chrome API in unit tests
3. **Extension Build**: Load the `dist/` folder in Chrome as unpacked extension
4. **Fraud Detection**: Use `safeCheck*` functions for consistent error handling
5. **Version bumps**: Update both `package.json` and `public/manifest.json`

## Working Style Notes

- Skylar reviews plans before implementation — briefly state the plan and wait for approval before editing files.
- Prefer simple, focused changes. Don't add abstractions or refactor beyond what's asked.
- `npm run build` must pass (no type errors) before committing.
- A pre-commit hook auto-stages and commits changes — don't be surprised when staged files appear in a hook-generated commit.

## Additional Notes

- Use " instead of ' for strings
- Do not use ; to end lines in TypeScript (unless required)
- Use `?.` for optional chaining instead of `&&`
- Use arrow function syntax for functions
