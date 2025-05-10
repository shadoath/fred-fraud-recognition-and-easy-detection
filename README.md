# FRED: Fraud Recognition & Easy Detection

<div align="center">
  <img src="./public/fred-128.png" alt="FRED Logo" width="80" height="80">
  <br>
  <h3>Protect yourself from fraud, scams, and phishing attempts</h3>
</div>

FRED (Fraud Recognition & Easy Detection) is a Chrome extension that helps you analyze emails and text for potential fraud or phishing attempts using OpenAI's powerful language models. It's designed with privacy in mind - your content never reaches our servers, as analysis happens directly between your browser and OpenAI using your personal API key.

## 🔍 Features

- **Email Analysis**: Examines Gmail email content, sender details, and formatting for fraud indicators
- **Text Analysis**: Analyze any pasted text for potential scams or suspicious content
- **Threat Rating**: Provides a 1-10 scale threat assessment with color-coded risk levels
- **Detailed Explanations**: Explains why content might be suspicious with specific reasoning
- **Fraud Indicators**: Highlights specific elements that triggered warnings
- **Privacy-Focused**: Your content is only shared with OpenAI, never stored on our servers
- **User-Supplied API Key**: Use your own OpenAI API key (no subscription to us required)
- **Simple UI**: Easy-to-understand tabbed interface with clear visual indicators

## 🚀 Installation

### From Chrome Web Store

1. Visit the [Gmail Fraud Detector](https://chrome.google.com/webstore/detail/gmail-fraud-detector/your-extension-id) on the Chrome Web Store
2. Click "Add to Chrome"
3. Confirm by clicking "Add extension"

### Manual Installation (for developers)

1. Clone this repository:
   ```
   git clone https://github.com/your-username/gmail-fraud-detector.git
   ```
2. Install dependencies:
   ```
   cd gmail-fraud-detector
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

## 🔑 Setting Up Your OpenAI API Key

This extension requires an OpenAI API key to function. Your API key is stored locally on your device and is only used to communicate with OpenAI.

1. Sign up for an OpenAI account at [platform.openai.com](https://platform.openai.com)
2. Navigate to [API Keys](https://platform.openai.com/account/api-keys)
3. Click "Create new secret key" and copy the key
4. Open the Gmail Fraud Detector extension in Gmail
5. Click the "Settings" button
6. Paste your API key and click "Save API Key"

**Note**: Using OpenAI's API will incur charges based on your usage. The extension uses GPT-3.5 Turbo to minimize costs while providing quality analysis. Check [OpenAI's pricing page](https://openai.com/pricing) for current rates.

## 💡 How to Use

### Gmail Email Analysis
1. Make sure you've added your OpenAI API key in the extension settings
2. Open any email in Gmail
3. Either:
   - Click the "Check for Fraud" button injected into Gmail's interface, or
   - Click the FRED icon in your browser extension toolbar and use the "Email" tab
4. Click "Check Current Email" to analyze the open email
5. Review the threat assessment, explanation, and detected indicators
6. Use this information to make an informed decision about the email

### Text Analysis
1. Make sure you've added your OpenAI API key in the extension settings
2. Click the FRED icon in your browser extension toolbar
3. Switch to the "Text" tab
4. Paste any text you want to analyze for potential fraud
5. Click "Check For Fraud" to analyze the text
6. Review the threat assessment, explanation, and detected indicators

## 🔒 Privacy

We take your privacy seriously:

- Your email and text content never passes through our servers
- All data is sent directly from your browser to OpenAI
- Your OpenAI API key is stored only in your browser's local storage
- No tracking or analytics are collected about your content
- The extension requests minimal permissions (only what's needed to function)
- Text you paste for analysis is never stored persistently

## ⚙️ Development

This extension is built with:

- React
- TypeScript
- Material UI
- Vite
- Chrome Extension Manifest V3

### Development Commands

```bash
# Start the development server
npm run dev

# Build the extension
npm run build

# Watch for changes and rebuild (useful during development)
npm run watch

# Lint the code
npm run lint

# Run tests
npm run test
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the project's style guidelines and passes all tests.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This extension provides an automated analysis of emails for potentially fraudulent content, but it is not infallible. Always use your best judgment when dealing with suspicious emails. The extension's analysis is provided as a tool to assist you, not as a definitive assessment of an email's legitimacy.

## 📧 Contact

If you have any questions or feedback, please open an issue on GitHub.

---

<div align="center">
  Made with ❤️ to help protect people from scams
</div>