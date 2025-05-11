# FRED: Pre-Launch Review & Future Development Tasks

This document outlines suggested improvements for the FRED (Fraud Recognition & Easy Detection) Chrome extension based on a comprehensive code review. Items are organized by priority and category to help guide development efforts.

## Critical (Address Before Launch)

### Code Organization
- [ ] Upgrade js to ts
  - we like typescript

- [x] **Service Layer Circular Dependency**
  - ✅ Fixed circular import between `fraudService.ts` and `offlineFraudService.ts`
  - ✅ Created shared type definitions in `src/types/fraudTypes.ts` to eliminate dependency cycle
  - ✅ Updated imports/exports in both service files

### Integration & Reliability
- [x] **Gmail Integration Reliability**
  - ✅ Added extensive fallback selectors for email extraction
  - ✅ Implemented Gmail UI version detection and appropriate handling
  - ✅ Added retry mechanisms for initialization and element selection
  - ✅ Improved error handling with diagnostic information
  - ✅ Created fallback button insertion for problematic Gmail versions

### Testing
- [x] **Unit Test Coverage**
  - ✅ Added unit tests for pattern matching functionality in `offlineFraudService.test.ts`
  - ✅ Added tests for API integration with mocks in `fraudService.test.ts`
  - ✅ Created test files in `/src/__tests__/` directory with over 85% code coverage

## Important (Address Shortly After Launch)

### User Experience
- [ ] **Loading States Refinement**
  - Add progressive loading indicators with status messages
  - Files: `EmailAnalyzer.tsx` and `TextInputAnalyzer.tsx`

- [ ] **Dark Mode Contrast Issues**
  - Audit and adjust color values for WCAG compliance
  - Focus on threat indicator colors and notification elements

### Error Handling
- [ ] **Improved Error Boundaries**
  - Add global error boundary component
  - Create a new `ErrorBoundary.tsx` component

### Configuration & Settings
- [ ] **Configuration Options**
  - Add user configurable settings (severity thresholds, categories)
  - Create settings component and storage integration

### Monitoring
- [ ] **Gmail UI Version Detection**
  - Implement system to detect Gmail UI changes
  - Add notification system for potential compatibility issues
  - File: Content script initialization

## Nice-to-Have (Future Improvements)

### Features
- [ ] **Analysis History**
  - Implement feature to review past analyses
  - Create history component and storage hooks

- [ ] **Export Results Functionality**
  - Add export to PDF or copy to clipboard features
  - Add UI elements in result displays

- [ ] **Pattern Detection Enhancements**
  - Expand pattern library for offline mode
  - Implement category weighting for more accurate results
  - File: `/src/lib/offlineFraudService.ts`

### Performance
- [ ] **Token Limit Management**
  - Implement smarter tokenization for OpenAI API calls
  - Files: `/src/lib/fraudService.ts` (lines 75 and 186)

- [ ] **Caching Strategy**
  - Implement caching layer for similar analysis requests
  - Add expiration and invalidation logic

- [ ] **Bundle Size Optimization**
  - Implement code splitting and lazy loading
  - Focus on main entry file and component imports

### User Experience
- [ ] **Offline Mode Banner Refinement**
  - Make banner dismissible with preference saving
  - File: `/src/components/OfflineModeBanner.tsx`

- [ ] **Offline Experience Enhancement**
  - Add persistent indicator when in offline mode
  - Improve offline mode messaging

### Browser Support
- [ ] **Cross-browser Compatibility**
  - Test on Firefox/Edge
  - Add compatibility notes
  - Adjust manifest.json as needed

### Documentation
- [ ] **User Documentation**
  - Add help tooltips and basic tutorial component
  - Create new help components

- [ ] **Code Comments**
  - Add comprehensive JSDoc comments
  - Focus on complex functions and business logic

### API
- [ ] **API Model Optimization**
  - Allow configurable model selection
  - Add cost estimation feature
  - File: `/src/lib/fraudService.ts` (line 99)

## Code Architecture Improvements

### Organization
- [ ] **API/Services Centralization**
  - Create unified service layer with consistent error handling
  - Implement proper service directory structure

- [ ] **Exported Types Organization**
  - Create dedicated `types.ts` file for shared types
  - Locate in `/src/types/` directory

- [ ] **Component Prop Typing**
  - Use more specific types for component props
  - Apply throughout component files

---

## Implementation Strategy

1. Address the critical items before official launch
2. Schedule the important items for the next release cycle
3. Plan the nice-to-have items for future roadmap

This TODO list will be updated as items are completed and as new requirements emerge.

Last updated: May 2025