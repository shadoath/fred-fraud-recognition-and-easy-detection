# FRED - Project Structure

This document outlines the files and components of the FRED Chrome extension.

## Core Files

### Extension Configuration

- `/public/manifest.json` - Extension manifest (MV3), declares background service worker and Gmail content script
- `/public/fred-16.png`, `fred-19.png`, `fred-38.png`, `fred-48.png`, `fred-128.png` - Extension icons (resized from `fred-icon-512.png`)
- `/public/fred-icon-512.png` - Primary icon source
- `/public/good-green.png`, `bad-red.png`, `maybe-yellow.png` - Threat status icons used in history cards

### UI Components

- `/src/components/MainDisplay.tsx` - Root popup layout: toolbar (with history/settings/help icons), scan view, and page routing
- `/src/components/Scanner.tsx` - Unified scan button — auto-detects Gmail email vs. webpage, labels button accordingly, handles auto-scan on mount
- `/src/components/GeneralSettings.tsx` - General Settings accordion: text size slider (S/M/L/XL), Gmail auto-scan toggle, website auto-scan toggle
- `/src/components/ApiKeySettings.tsx` - API Settings accordion: connection mode, license key, OpenAI API key
- `/src/components/HistoryTab.tsx` - History view: card layout with type pill (Email/Website), threat icon, and colored status pill
- `/src/components/ThreatRating.tsx` - Threat rating result display
- `/src/components/AnalysisResultPanel.tsx` - Wraps and presents a completed analysis result
- `/src/components/DetectedIndicators.tsx` - Renders the list of detected red flags
- `/src/components/ScanningIndicator.tsx` - Loading/scanning animation
- `/src/components/UsageStatsSection.tsx` - All-time and weekly usage stats (accessible via chart icon in toolbar)
- `/src/components/HelpContent.tsx` - Help panel content
- `/src/components/ErrorBoundary.tsx` - React error boundary

### Background & Content Scripts

- `/src/background/serviceWorker.ts` - MV3 background service worker: badge management, message routing
- `/src/content/gmailScanner.ts` - Gmail content script: extracts email content, supports badge-based scanning
- `/src/content/gmailBadge.ts` - Badge update helpers for the Gmail content script

### Services & Libraries

- `/src/lib/fraudService.ts` - OpenAI API integration for fraud analysis
- `/src/lib/heuristics.ts` - Local heuristics engine (Phase 1 infrastructure)
- `/src/lib/keyStorage.ts` - API key obfuscation and `chrome.storage.local` persistence
- `/src/lib/simpleEnhancedStorage.ts` - V3 obfuscation format for stored keys
- `/src/lib/historyStorage.ts` - Stores last 20 analysis results locally
- `/src/lib/usageStorage.ts` - Tracks all-time and weekly check/threat counters
- `/src/lib/autoScanStorage.ts` - Persists auto-scan preferences (Gmail and website)
- `/src/lib/pageScraper.ts` - Scrapes current tab content via `chrome.scripting.executeScript`
- `/src/lib/licenseStorage.ts` - License key storage
- `/src/lib/deviceId.ts` - Stable per-device ID for proxy rate limiting
- `/src/lib/apiErrorUtils.ts` - API error classification helpers
- `/src/lib/theme.ts` - MUI theme: primary color `#47b1e5`, single light theme

### Contexts & Hooks

- `/src/contexts/CustomSnackbarContext.tsx` - Toast notification context
- `/src/contexts/CustomThemeContext.tsx` - Theme context (light theme only)
- `/src/hooks/useApiKey.tsx` - Hook for API key state and connection mode
- `/src/hooks/useManifestHook.tsx` - Hook to read manifest version

### Types

- `/src/types/fraudTypes.ts` - Shared TypeScript types (`TextData`, `URLData`, `PageData`, `AnalysisResult`, etc.)

### Root Files

- `/src/App.tsx` - Application root component
- `/src/main.tsx` - Application entry point
- `/package.json` - Project dependencies and scripts
- `/tsconfig.json` - TypeScript configuration
- `/vite.config.ts` - Vite bundler configuration

## Documentation

- `/README.md` - Project overview, installation, and usage instructions
- `/CHROME_STORE.md` - Chrome Web Store listing copy and assets checklist
- `/CLAUDE.md` - Architecture notes for Claude Code
- `/DEV.md` - Development setup, commands, and contributing guidelines
- `/PRIVACY.md` / `/PRIVACY_POLICY.md` - Privacy policy
- `/LICENSE` - MIT license
- `/PROJECT_STRUCTURE.md` - This file

## Architecture Notes

### Popup Flow

1. `MainDisplay.tsx` renders the toolbar and routes between scan view, history, settings, and help
2. `Scanner.tsx` checks the active tab URL to determine if it's Gmail; renders "Scan This Email" or "Scan This Page" accordingly
3. On scan, content is extracted (via `gmailScanner.ts` for email, `pageScraper.ts` for pages) and sent to `fraudService.ts`
4. Results are displayed via `ThreatRating` / `AnalysisResultPanel`, then saved to history via `historyStorage.ts` and counted via `usageStorage.ts`

### Settings

Settings are split into two accordions in the settings panel:

- **General Settings** (`GeneralSettings.tsx`): text size slider (S/M/L/XL stored in `chrome.storage.local`), Gmail auto-scan toggle, website auto-scan toggle
- **API Settings** (`ApiKeySettings.tsx`): connection mode (proxy / BYOK / premium), license key, OpenAI API key

Usage stats are accessible via the chart icon in the main toolbar, not buried in settings.

### Phase 1 Infrastructure

- `serviceWorker.ts` handles background badge updates on Gmail tabs
- `gmailScanner.ts` content script enables badge-based scanning without opening the popup
- `heuristics.ts` provides a local heuristics engine for fast pre-screening

### Removed Components

The following components were replaced in the UI overhaul:

- `EmailAnalyzer.tsx` — replaced by `Scanner.tsx`
- `ContentAnalyzer.tsx` — replaced by `Scanner.tsx`
- `TabPanel.tsx` — tab-based layout removed; replaced by icon-based toolbar routing in `MainDisplay.tsx`
