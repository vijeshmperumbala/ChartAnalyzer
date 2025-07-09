# Chart Analyzer Extension

A powerful Chrome extension that uses Google's Gemini AI to analyze financial charts and provide detailed technical analysis. Simply capture any chart on the web and get instant insights.

## ✨ Features

- **AI-Powered Analysis**: Utilizes Gemini 2.5 Flash model for accurate chart analysis
- **One-Click Capture**: Easily capture any chart on a webpage
- **Detailed Reports**: Get comprehensive technical analysis including:
  - Trend analysis
  - Support and resistance levels
  - Key price levels
  - Technical indicators interpretation
- **Copy to Clipboard**: One-click copy of analysis results
- **Lightweight**: Fast and efficient, doesn't slow down your browser

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vijeshmperumbala/ChartAnalyzer.git
   cd ChartAnalyzer
   ```

2. **Set up your API key**:
   - Get your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)
   - Open `config.js` and replace `YOUR_API_KEY` with your actual API key

3. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" and select the extension directory

## 🛠️ Usage

1. Navigate to any webpage with a chart you want to analyze
2. Click the Chart Analyzer extension icon in your toolbar
3. Click the "Analyze Chart" button
4. Select the area of the chart you want to analyze
5. View the detailed analysis in the popup
6. Use the "Copy" button to copy the analysis to your clipboard

## 🔧 Configuration

You can customize the analysis by modifying the following in `config.js`:

```javascript
const CONFIG = {
  // Your Google Gemini API key
  API_KEY: 'YOUR_API_KEY',
  
  // Model configuration
  MODEL: 'gemini-2.5-flash',
  TEMPERATURE: 0.1,  // Lower for more deterministic responses
  MAX_TOKENS: 8192,  // Maximum response length
  
  // Analysis settings
  ANALYSIS_PROMPT: `
    You are a professional technical analyst. Analyze the provided chart and provide:
    1. Current trend direction and strength
    2. Key support and resistance levels
    3. Any visible chart patterns
    4. Trading volume analysis
    5. Potential price targets
    
    Be concise and focus on actionable insights.
  `
};
```

## 🐛 Troubleshooting

### Common Issues

1. **"No analysis data available"**
   - Ensure your API key is correctly set in `config.js`
   - Check your internet connection
   - Verify that the chart is visible in the captured area

2. **Copy button not working**
   - Make sure you're using a modern browser with clipboard API support
   - Check the browser console for any error messages (Ctrl+Shift+J)

3. **Slow response times**
   - The analysis depends on the Gemini API response time
   - Try reducing the `MAX_TOKENS` in the configuration if responses are too slow

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

Vijesh M Perumbala - vijeshmperumbala31@gmail.com

Project Link: [https://github.com/vijeshmperumbala/ChartAnalyzer](https://github.com/vijeshmperumbala/ChartAnalyzer)