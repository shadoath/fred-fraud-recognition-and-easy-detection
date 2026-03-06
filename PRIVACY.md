# Privacy Policy for FRED: Fraud Recognition & Easy Detection

*Last Updated: March 6, 2026*

## Introduction

FRED: Fraud Recognition & Easy Detection ("we", "our", or "extension") is committed to protecting your privacy. This Privacy Policy explains how your information is collected, used, and disclosed when you use our Chrome extension.

## Two Modes of Operation

FRED operates in one of two modes, each with different data flows:

### Free Tier (Proxy Mode — default)

Content you submit for analysis is routed through FRED's Cloudflare Worker (serverless proxy) to OpenAI's API. The worker:
- Does **not** log or store the content of your analysis
- Records only a **per-device check count** (a random device ID paired with the current week number) for rate limiting purposes
- Forwards your content to OpenAI and returns the result

### Bring Your Own Key (BYOK Mode)

When you provide your own OpenAI API key, content is sent **directly from your browser to OpenAI**. FRED's servers are not involved at any point.

---

## What Information We Collect

### Information You Provide

- **OpenAI API Key** (BYOK mode only): Your personal OpenAI API key, stored only on your device.
- **Content for Analysis**: Email content, pasted text, or URLs you submit for fraud checking.

### Information Collected Automatically

- **Device ID** (Proxy mode only): A randomly generated UUID stored in your browser's local storage. This is used solely to track your weekly check count for rate limiting. It is never linked to your identity and is never sent to OpenAI.
- **Weekly check count**: The number of checks used in the current week, stored in Cloudflare KV against your device ID. This data expires automatically after 14 days.

---

## How We Use Your Information

- **Content**: Sent to OpenAI for fraud analysis. Not logged or retained by FRED.
- **Device ID**: Used only to enforce the 5 free checks per week limit.
- **OpenAI API Key**: Used only to authenticate requests to OpenAI on your behalf (BYOK mode). Never transmitted to FRED's servers.

---

## Data Storage and Sharing

### On Your Device (chrome.storage.local)

- OpenAI API key (obfuscated, BYOK mode only)
- Device ID (proxy mode)
- Selected model preference
- Connection mode preference
- Analysis history (last 20 entries, stored locally)

### On FRED's Cloudflare Worker (Proxy Mode)

- Device ID + week number → check count. No content is stored. Entries expire after 14 days.

### Third-Party Sharing

- **OpenAI**: Content you submit is sent to OpenAI for analysis. Governed by [OpenAI's Privacy Policy](https://openai.com/policies/privacy-policy).

### What We Do NOT Do

- We do **not** log or store the content of your analyses
- We do **not** store copies of your emails, text, or URLs
- We do **not** track your browsing or email history
- We do **not** use analytics tools to collect usage data
- We do **not** sell or share your data with third parties

---

## User Control and Rights

- **Stop using**: Uninstall the extension at any time to stop all data processing
- **Clear API key**: Remove your API key via Settings at any time
- **Clear history**: Clear your local analysis history via the History tab
- **Switch modes**: Change between Free and BYOK mode in Settings at any time

---

## Security

- Your OpenAI API key is stored with obfuscation in browser local storage and never leaves your device (BYOK mode)
- All communication with OpenAI and FRED's proxy uses HTTPS
- The proxy uses a shared secret header to prevent unauthorized use

---

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will update the "Last Updated" date above when changes are made.

---

## Contact

If you have any questions about this Privacy Policy, please open an issue on our [GitHub repository](https://github.com/shadoath/fred-fraud-recognition-and-easy-detection).

---

## Chrome Web Store Permission Disclosure

This extension requires the following permissions:

- **activeTab**: To access the currently open Gmail email for analysis
- **storage**: To store your API key, preferences, and analysis history on your device
- **tabs**: To read the current tab URL for the "Check This Page" feature
- **scripting**: To extract email content from the Gmail interface
- **host_permissions** (mail.google.com): To operate within Gmail
- **host_permissions** (*.workers.dev): To connect to FRED's free-tier analysis proxy

---

## Children's Privacy

This extension is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children under 13.
