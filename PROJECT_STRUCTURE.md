# Gmail Fraud Detector - Project Structure

This document outlines the essential files and components required for the Gmail Fraud Detector extension.

## Core Files

### Extension Configuration

- `/public/manifest.json` - Extension manifest file
- `/public/web-icon-*.png` - Extension icons in various sizes

### UI Components

- `/src/components/ApiKeySettings.tsx` - API key management
- `/src/components/AnalysisTab.tsx` - Analysis results display
- `/src/components/EmailAnalyzer.tsx` - Email fraud analysis
- `/src/components/MainDisplay.tsx` - Root popup with tabs
- `/src/components/TabPanel.tsx` - Shared tab panel component
- `/src/components/TextInputAnalyzer.tsx` - Text fraud analysis
- `/src/components/ThreatRating.tsx` - Threat rating display

### Services

- `/src/lib/fraudService.ts` - Service for OpenAI API integration

### Contexts

- `/src/contexts/CustomSnackbarContext.tsx` - Toast notifications context
- `/src/contexts/CustomThemeContext.tsx` - Theme management context

### Root Files

- `/src/App.tsx` - Application root component
- `/src/main.tsx` - Application entry point
- `/src/index.css` - Global styles
- `/src/App.css` - Application styles

### Config Files

- `/package.json` - Project dependencies and scripts
- `/tsconfig.json` - TypeScript configuration
- `/vite.config.ts` - Vite bundler configuration

## Documentation

- `/README.md` - Project overview, installation and usage instructions
- `/PRIVACY.md` - Privacy policy
- `/LICENSE` - MIT license
- `/PROJECT_STRUCTURE.md` - This file

## Development Approach

When developing this extension:

1. **Main Extension Functionality**:

   - `MainDisplay.tsx` orchestrates the popup with Email/Text/Analysis tabs
   - `ApiKeySettings.tsx` manages the OpenAI API key storage and retrieval
   - `fraudService.ts` handles the OpenAI API integration

2. **Gmail Integration**:

   - `chrome.scripting.executeScript` extracts email content from Gmail tabs
   - Popup communicates with active tab for extraction

3. **UI Components**:
   - Material UI for consistent design
   - Notification system for user feedback
   - Dark/light theme support

## Removed Components

The following components from the original project were removed as they weren't needed for the Gmail Fraud Detector functionality:

- All pages and navigation components
- Account and user management
- Search, bookmarks, and favorites functionality
- All domain scraping and analysis tools

## Adding New Features

When adding new features to this extension:

1. Keep the UI simple and focused on email fraud detection
2. Maintain the privacy-first approach (no server-side components)
3. Follow the Material UI design patterns
4. Add clear documentation for any new functionality
