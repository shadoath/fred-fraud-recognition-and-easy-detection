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

- `/src/lib/fraudService.ts`: OpenAI integration for fraud detection
- `/src/lib/keyStorage.ts`: API key storage and migration
- `/src/lib/simpleEnhancedStorage.ts`: Key obfuscation utilities
- `/src/types/fraudTypes.ts`: Shared type definitions
- `/src/components/`: React components (MainDisplay, EmailAnalyzer, TextInputAnalyzer, AnalysisTab)

## Best Practices

1. **API Key Security**: Never commit API keys; use obfuscation in `keyStorage.ts`
2. **Testing**: Mock Chrome API in unit tests
3. **Extension Build**: Load the `dist/` folder in Chrome as unpacked extension
4. **Fraud Detection**: Use `safeCheck*` functions for consistent error handling

## Additional Notes

- Use " instead of ' for strings
- Do not use ; to end lines in TypeScript (unless required)
- Use `?.` for optional chaining instead of `&&`
- Use arrow function syntax for functions
