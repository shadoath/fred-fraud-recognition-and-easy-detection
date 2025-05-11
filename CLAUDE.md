# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FRED (Fraud Recognition & Easy Detection) is a Chrome extension that analyzes emails and text for potential fraud or phishing attempts. It uses OpenAI's language models with the user's personal API key or falls back to an offline pattern-matching system when no API key is available.

## Development Commands

```bash
# Start the development server
npm run dev

# Build the entire extension
npm run build:extension

# Build the React application
npm run build

# Build just the background script
npm run build:background

# Build just the content script
npm run build:content

# Watch for changes and rebuild (useful during development)
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
   - **Background Script**: Handles communication between content scripts and the popup
   - **Content Script**: Injects into Gmail to analyze emails directly
   - **Popup Interface**: React-based UI for user interaction

2. **Fraud Detection Services**
   - **Online Mode** (`fraudService.ts`): Uses OpenAI API with user's key
   - **Offline Mode** (`offlineFraudService.ts`): Pattern matching as fallback

3. **Key Management**
   - API key storage with basic obfuscation (`keyStorage.ts`)
   - Chrome's `storage.local` for persistence

### Data Flow

1. User provides their OpenAI API key which is stored locally
2. When analyzing content, either:
   - Email: Content is extracted from Gmail and sent to OpenAI
   - Text: User-provided text is sent to OpenAI
3. Results are displayed with threat ratings and explanations

### TypeScript Integration

The project uses TypeScript for type safety with separate configurations:
- `tsconfig.json`: Main React application
- `tsconfig.extension.json`: Chrome extension components (background & content scripts)

## Testing

Tests use Jest with the following setup:
- `jest.config.cjs`: Configuration including TypeScript support
- Mock Chrome API available in tests
- Fake timers for async test control
- Coverage reporting enabled

## Build Process

The build system uses:
- Vite for bundling the React application
- TypeScript compiler for extension scripts
- Custom build process in `build.mjs` that:
  1. Builds scripts with Vite
  2. Copies static assets from `/public`
  3. Updates and copies the manifest.json

## Important Files and Directories

- `/src/lib/fraudService.ts`: Main OpenAI integration for fraud detection
- `/src/lib/offlineFraudService.ts`: Fallback pattern-matching system
- `/src/types/fraudTypes.ts`: Shared type definitions
- `/src/components/`: React components for the UI
- `/src/background/`: Extension background script
- `/src/content/`: Gmail content script

## Best Practices

1. **API Key Security**
   - Never commit API keys
   - Use the obfuscation utilities in `keyStorage.ts`

2. **Testing**
   - Mock Chrome API calls for unit tests
   - Use fake timers for async code

3. **Extension Build**
   - Use `npm run build:extension` for the full extension build
   - Ensure proper file paths in `manifest.json`

4. **Fraud Detection**
   - Gracefully handle OpenAI API errors
   - Always have offline fallback ready