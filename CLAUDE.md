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
- `/src/lib/pageScraper.ts`: Scrapes current tab via `chrome.scripting.executeScript`
- `/src/types/fraudTypes.ts`: Shared type definitions. `TextData` has optional `url?` field for subject/URL context.
- `/src/components/MainDisplay.tsx`: Root layout, toolbar, tab switching. Calls `recordCheck(threatRating)` and `saveHistoryEntry` after every analysis.
- `/src/components/ContentAnalyzer.tsx`: Unified form — Subject/URL + Content fields. Routes to `TextData` (with optional url), `URLData`, or `PageData` depending on what's filled.
- `/src/components/EmailAnalyzer.tsx`: Gmail email extraction and analysis
- `/src/components/ApiKeySettings.tsx`: Settings panel with usage stats section showing all-time checks, threats caught, and weekly usage (proxy users only).

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
