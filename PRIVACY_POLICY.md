# FRED: Privacy Policy

## Effective Date: May 10, 2024

Thank you for using FRED (Fraud Recognition & Easy Detection). This Privacy Policy explains how FRED handles your data and protects your privacy.

## Our Privacy Principles

FRED is designed with privacy as a core principle. We believe that protecting your information is of utmost importance. This extension:

1. **Never stores your email content** on our servers
2. **Never collects or transmits your browsing history**
3. **Only sends content to OpenAI** — either directly (BYOK) or via FRED's anonymous proxy (Free/Paid)
4. **Stores your API key locally** on your device only

## Data Collection and Usage

### What we DO collect/use:

- **API Key**: Your OpenAI API key (BYOK mode) is stored locally in your browser's secure storage with obfuscation. It is never transmitted to our servers.
- **Email and Page Content (Temporary)**: When you scan an email or webpage, its content is temporarily processed and sent to OpenAI's API — either directly from your browser (BYOK) or via FRED's Cloudflare Worker proxy (Free/Paid). This data is never stored persistently.
- **Analysis Results**: Fraud detection results are saved locally on your device (last 20 entries). They are never transmitted to our servers.
- **Device ID** (proxy mode only): A randomly generated UUID used solely for rate limiting. It is never linked to your identity.

### What we DO NOT collect:

- We do not collect or store any personal information about users
- We do not track your browsing history
- We do not use cookies or any other tracking technologies
- We do not collect analytics about your usage of the extension
- We do not store copies of your emails, page content, or analyzed text anywhere on our servers

## Data Sharing and Third Parties

- **OpenAI**: Content you submit for analysis is sent to OpenAI's API — directly (BYOK) or via the FRED proxy (Free/Paid). Please refer to [OpenAI's Privacy Policy](https://openai.com/policies/privacy-policy) for information on how they handle your data.

- **Google**: As a Chrome extension, certain technical information may be available to Google as outlined in their Chrome Web Store policies. We do not separately share data with Google.

## Client-Side Heuristics

FRED includes a Tier 1 heuristics engine that:
- Runs pattern matching entirely on your device
- Does not transmit any data externally
- Provides instant fraud signal detection before any AI call is made

## Security

We protect your information by:
- Storing sensitive data (like API keys) only in your local browser storage with obfuscation
- Using secure HTTPS connections for all API communications
- Never transmitting your API key to our servers
- Using a shared secret header to prevent unauthorized use of the proxy

## Your Rights and Choices

Since we don't collect or store your personal information on our servers, there isn't much to manage. However, you can:

- Delete your API key from local storage at any time through the extension's settings
- Clear your local analysis history via the History panel
- Uninstall the extension to remove all locally stored data
- Switch between Free proxy, Paid proxy, and BYOK modes in Settings at any time

## Changes to This Policy

If we make significant changes to this privacy policy, we will update the policy in the extension and may notify users through the Chrome Web Store listing.

## Contact Us

If you have questions or concerns about this privacy policy or FRED's data practices, please open an issue on our [GitHub repository](https://github.com/shadoath/fred-fraud-recognition-and-easy-detection).

---

By using FRED, you agree to the practices described in this Privacy Policy.