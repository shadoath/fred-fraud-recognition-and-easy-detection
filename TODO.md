# FRED Extension TODO List

## Completed
- Implement automatic tab selection based on current website (Gmail → Email tab, others → Text tab)
- Remove offline checker functionality and make API key required
- Extract Gmail content script functionality to TypeScript in main app

## High Priority
- Add error handling for website content that can't be scraped (iframes, SPAs, etc.)
- Update the manifest.json to include new permissions needed for content scraping
- Ensure compatibility with the latest Chrome API changes

## Medium Priority
- Implement content extraction optimization for specific sites (Twitter, LinkedIn, news sites)
- Add unit tests for the content scraping functionality
- Create documentation for the new web scraping feature
- Fix potential memory leaks in the content extraction observer

## Low Priority
- Improve the UI feedback during permission requests
- Add option to customize content extraction (e.g., include/exclude specific elements)
- Add rate limiting to prevent excessive scraping requests