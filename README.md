# FRED: Fraud Recognition & Easy Detection

<div align="center">
  <img src="./public/fred-128.png" alt="FRED Logo" width="80" height="80">
  <br>
  <h3>Protect yourself from fraud, scams, and phishing attempts</h3>
</div>

FRED (Fraud Recognition & Easy Detection) is a Chrome extension that helps you analyze emails, text, and URLs for potential fraud or phishing attempts using OpenAI's powerful language models. No API key required to get started — FRED includes **25 free checks per week** for everyone.

## Features

- **Free Tier**: 25 free checks per week with no API key or account needed
- **Email Analysis**: Examines Gmail email content, sender details, and formatting for fraud indicators
- **Text Analysis**: Analyze any pasted text for potential scams or suspicious content
- **URL/Link Analysis**: Check suspicious links before clicking them, or scan the current page with one click
- **Threat Rating**: Clear verdict banner — "Looks Safe", "Be Careful", or "Likely a Scam" — with a 1–100 risk score
- **Actionable Advice**: Tells you exactly what to do based on the threat level
- **Detailed Explanations**: Explains why content might be suspicious in plain, non-technical language
- **Fraud Indicators**: Highlights specific elements that triggered warnings
- **Analysis History**: Stores your last 20 analyses for easy reference
- **Result Persistence**: Last result is restored when you reopen the popup
- **Dark Mode**: Toggle between light and dark themes
- **Large Text Mode**: Increase font size for easier reading
- **Bring Your Own Key**: Use your own OpenAI API key for unlimited checks

## Installation

### From Chrome Web Store

1. Visit [FRED on the Chrome Web Store](https://chromewebstore.google.com/detail/fred-fraud-recognition-ea/bjdbcabacnlmbpcmiapcdfancfgcakfn)
2. Click "Add to Chrome"
3. Confirm by clicking "Add extension"

### Manual Installation (for developers)

1. Clone this repository:
   ```
   git clone https://github.com/shadoath/fred-fraud-recognition-and-easy-detection.git
   ```
2. Install dependencies:
   ```
   cd fred-fraud-recognition-and-easy-detection
   npm install
   ```
3. Build the extension:
   ```
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" by toggling the switch in the top-right corner
   - Click "Load unpacked" and select the `dist` folder from the project directory

## Getting Started

FRED works immediately with no setup. Open the extension and start checking — you get **25 free checks per week** powered by FRED's servers.

When you've used your free checks, or if you want unlimited access, you can add your own OpenAI API key in Settings:

1. Sign up for an OpenAI account at [platform.openai.com](https://platform.openai.com)
2. Navigate to [API Keys](https://platform.openai.com/account/api-keys)
3. Click "Create new secret key" and copy the key
4. Open FRED → Settings → switch to "My Own Key"
5. Paste your API key and click "Save API Key"

**Note**: Using your own OpenAI key incurs small charges — typically fractions of a cent per check. Most users spend less than $1/month.

## How to Use

### Gmail Email Analysis
1. Open any email in Gmail
2. Click the FRED icon in your browser toolbar
3. FRED will automatically extract and analyze the open email
4. Review the verdict, explanation, and any warning flags

### Text Analysis
1. Click the FRED icon in your browser toolbar
2. Switch to the "Text" tab
3. Paste any suspicious text (SMS, message, letter, etc.)
4. Click "Check For Fraud"

### URL / Link Analysis
1. Click the FRED icon in your browser toolbar
2. Switch to the "URL" tab
3. Paste a suspicious link, or click "Check This Page" to scan the current tab's URL
4. Review the threat assessment and any flags

## Privacy

- **Free tier**: Content is routed through FRED's Cloudflare Worker to OpenAI. The worker does not log or store your content — it only tracks a per-device check count for rate limiting.
- **BYOK mode**: Content goes directly from your browser to OpenAI. FRED's servers are never involved.
- Your OpenAI API key is stored only on your device and never transmitted to FRED's servers.
- No tracking or analytics are collected about your content.
- The extension requests only the minimum permissions needed to function.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Development

This extension is built with:

- React
- TypeScript
- Material UI
- Vite
- Chrome Extension Manifest V3
- Cloudflare Workers + Cloudflare KV (proxy/rate limiting)

### Development Commands

```bash
# Start the development server
npm run dev

# Build the extension
npm run build

# Watch for changes and rebuild
npm run watch

# Lint the code
npm run lint

# Run tests
npm run test
```

### Cloudflare Worker (Proxy)

The free tier proxy lives in `fred-proxy/`. See the source for deployment instructions, or refer to the setup steps in `fred-proxy/wrangler.toml`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

FRED provides an automated analysis to help identify potentially fraudulent content, but it is not infallible. Always use your best judgment. The analysis is a tool to assist you, not a definitive verdict.

## Contact

If you have any questions or feedback, please open an issue on GitHub.

---

<div align="center">
  Made with ❤️ to help protect people from scams
</div>

## Development Note

This project was built with assistance from Claude AI using Claude Code. Many components, features, and improvements were developed through collaboration with an AI assistant, including code organization, feature implementation, and security enhancements.
