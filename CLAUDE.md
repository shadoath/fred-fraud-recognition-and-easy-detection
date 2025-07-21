# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FRED (Fraud Recognition & Easy Detection) is a Chrome extension that analyzes emails and text for potential fraud or phishing attempts. It uses OpenAI's language models with the user's personal API key. The extension is built as a popup-based Chrome extension using React and TypeScript.

## Development Commands

```bash
# Start the development server
npm run dev

# Build the React application
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

### Extension Structure

This is a **popup-based Chrome extension** (Manifest V3) with the following components:

- **Popup Interface**: React-based UI (`src/App.tsx`) that opens when clicking the extension icon
- **Main Entry**: `src/main.tsx` renders the React app into `index.html`
- **No Background/Content Scripts**: The current implementation works entirely through the popup interface

### Core Services

- **Fraud Detection** (`src/lib/fraudService.ts`): Integrates with OpenAI API for email and text analysis
- **Key Management** (`src/lib/keyStorage.ts`): Handles API key storage with basic obfuscation using Chrome's `storage.local`
- **Permissions** (`src/lib/permissionsService.ts`): Manages Chrome extension permissions

### React Architecture

- **Components** (`src/components/`): Modular UI components including EmailAnalyzer, TextInputAnalyzer, ThreatRating
- **Contexts** (`src/contexts/`): CustomThemeContext and CustomSnackbarContext for global state
- **Hooks** (`src/hooks/`): useApiKey and useManifestHook for reusable logic
- **Types** (`src/types/fraudTypes.ts`): Shared TypeScript type definitions

### Data Flow

1. User provides OpenAI API key through popup interface
2. User can analyze either:
   - Email content by pasting it into the text analyzer
   - Any text content for fraud detection
3. Content is sent directly to OpenAI API with user's key
4. Results displayed with threat ratings and explanations

## Testing

Tests use Jest with the following setup:

- `jest.config.cjs`: Configuration with TypeScript support and jsdom environment
- Coverage reporting enabled in the `coverage/` directory
- Mock Chrome API available for extension-specific tests
- Test files located in `src/__tests__/` directory

## Build Process

The build system uses:

- **Vite** for bundling the React application (`vite.config.ts`)
- **TypeScript** compilation with strict type checking
- Static assets in `/public` directory including extension manifest and icons
- Output to `dist/` directory for extension loading

## Technology Stack

- **React 18** with TypeScript for the UI
- **Material-UI (MUI)** for component styling and theming
- **Vite** for development server and building  
- **Jest** with Testing Library for unit tests
- **ESLint** for code linting with TypeScript rules

## API Integration

The extension integrates with OpenAI's chat completions API:

- Uses `gpt-3.5-turbo` model for cost-effectiveness
- Sends structured prompts for fraud analysis
- Handles API errors gracefully with user-friendly messages
- All API communication happens directly from browser to OpenAI (no backend)

## Additional Notes

- Use " intead of ' for strings
- DO NOT USE ; to end lines of code in typescript (unless required)
- In Typescript, use `?.` to an optional chain instead of `&&`
- Use arrow function syntax for functions
