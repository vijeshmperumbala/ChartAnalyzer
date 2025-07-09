// Default API key (will be overridden by the value from storage)
let API_KEY = '';

// Load the API key from storage when the service worker starts
function loadApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey'], function(result) {
      if (result.apiKey) {
        API_KEY = result.apiKey;
        console.log('API key loaded from storage');
      } else {
        console.warn('No API key found in storage. Please set it in the extension options.');
      }
      resolve();
    });
  });
}

// Load API key immediately
loadApiKey();

// Listen for API key updates
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (changes.apiKey) {
    API_KEY = changes.apiKey.newValue;
    console.log('API key updated');
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'captureAndAnalyze') {
    // Get the current window first
    chrome.windows.getCurrent({ populate: true }, function(window) {
      if (chrome.runtime.lastError) {
        sendResponse({ 
          error: { 
            message: 'Failed to get current window: ' + 
                    (chrome.runtime.lastError.message || 'Unknown error') 
          } 
        });
        return;
      }
      
      if (!window || !window.tabs || !window.tabs.length) {
        sendResponse({ 
          error: { 
            message: 'No active tab found' 
          } 
        });
        return;
      }
      
      const activeTab = window.tabs.find(tab => tab.active);
      if (!activeTab) {
        sendResponse({ 
          error: { 
            message: 'No active tab found' 
          } 
        });
        return;
      }
      
      // Now capture the visible tab
      chrome.tabs.captureVisibleTab(
        window.id,
        { format: 'png', quality: 90 },
        function(dataUrl) {
          if (chrome.runtime.lastError) {
            console.error('Capture error:', chrome.runtime.lastError);
            sendResponse({ 
              error: {
                message: 'Failed to capture tab: ' + (chrome.runtime.lastError.message || 'Unknown error')
              } 
            });
            return;
          }
          
          if (!dataUrl) {
            sendResponse({ 
              error: { 
                message: 'Failed to capture tab: No image data received' 
              } 
            });
            return;
          }
          
          console.log('Tab captured, analyzing image...');
          
          // Then analyze the captured image
          analyzeImage(dataUrl)
            .then(function(analysis) {
              console.log('Analysis complete');
              // Ensure we're sending a proper response object
              if (analysis.isJson) {
                // If it's JSON, send as is
                sendResponse({ 
                  analysis: JSON.stringify(analysis.analysis, null, 2),
                  isJson: true 
                });
              } else {
                // If it's plain text, send as is
                sendResponse({ 
                  analysis: analysis.analysis,
                  isJson: false 
                });
              }
            })
            .catch(function(error) {
              console.error('Analysis error:', error);
              sendResponse({ 
                error: { 
                  message: error.message || 'Failed to analyze image' 
                } 
              });
            });
        }
      );
    });
    
    // Return true to indicate we want to send a response asynchronously
    return true;
  }
  
  // Handle direct analyzeImage requests (with existing image data)
  if (request.action === 'analyzeImage' && request.imageData) {
    analyzeImage(request.imageData)
      .then(function(analysis) { 
        if (analysis.isJson) {
          sendResponse({ 
            analysis: JSON.stringify(analysis.analysis, null, 2),
            isJson: true 
          });
        } else {
          sendResponse({ 
            analysis: analysis.analysis,
            isJson: false 
          });
        }
      })
      .catch(function(error) { 
        sendResponse({ error: error.message });
      });
    
    // Return true to indicate we want to send a response asynchronously
    return true;
  }
});

function analyzeImage(imageData) {
  return new Promise(function(resolve, reject) {
    if (!API_KEY) {
      reject(new Error('No API key found. Please set your Gemini API key in the extension options.'));
      return;
    }
    
    // Convert data URL to base64
    const base64Image = imageData.split(',')[1];
    if (!base64Image) {
      reject(new Error('Invalid image data'));
      return;
    }
    
    console.log('Sending image to Gemini 1.5 Flash API...');
    const tradePlanPrompt = `
          You are an elite-level technical analyst and trading strategist AI. Your sole purpose is to analyze the provided trading chart image and generate a comprehensive, actionable trade plan.

          **CRITICAL INSTRUCTIONS:**
          1.  **JSON ONLY:** Your entire response MUST be a single, valid JSON object. Do not include any text, notes, or markdown formatting outside of the JSON structure.
          2.  **STRICT SCHEMA:** Adhere strictly to the JSON schema provided below.
          3.  **VISUALS ONLY:** Base your entire analysis strictly on the visual information in the chart image. Do not use external data or prior knowledge of the asset.
          4.  **NUMBERS, NOT STRINGS:** For all price levels (support, resistance, targets, stop-loss), provide estimated numerical values, not placeholder strings like "[Price]".
          5.  **INDICATORS:** Analyze ONLY the indicators visually present on the chart. If no indicators are shown, return an empty array for the "indicators" field.
          6.  **BE CONCISE:** Keep all "reasoning" and "interpretation" text to a single, short sentence.
          7.  **HANDLE EMPTY DATA:** If a section is not applicable or no patterns/indicators are found, return an empty array \`[]\` for lists or \`null\` for objects. Do not invent data.

          **REQUIRED JSON OUTPUT SCHEMA:**
          {
            "chartContext": {
              "assetTicker": "Asset symbol (e.g., BTC/USD, AAPL)",
              "timeframe": "Timeframe from the chart (e.g., 4H, 1D, 5min)",
              "chartType": "Candlestick, Bar, Line"
            },
            "coreAnalysis": {
              "trend": { "primaryDirection": "Uptrend | Downtrend | Sideways/Consolidating", "shortTermDirection": "Uptrend | Downtrend | Sideways/Consolidating", "strength": "Strong | Moderate | Weak", "reasoning": "Briefly describe the trend based on price structure and trendlines." },
              "priceAction": { "currentPrice": 0.0, "supportLevels": [{ "level": 0.0, "strength": "Strong|Moderate|Weak", "touches": 0 }], "resistanceLevels": [{ "level": 0.0, "strength": "Strong|Moderate|Weak", "touches": 0 }] },
              "volumeAnalysis": { "trend": "Increasing | Decreasing | Average", "interpretation": "e.g., 'Volume confirms the uptrend.'" },
              "indicators": [{ "indicatorName": "e.g., RSI(14)", "status": "e.g., 'Value is 68.2'", "signal": "e.g., 'Approaching Overbought'" }]
            },
            "patternRecognition": {
              "majorPatterns": [{ "patternName": "e.g., Ascending Triangle", "confidence": "High|Medium|Low", "implication": "Bullish|Bearish", "priceTarget": 0.0, "invalidationLevel": 0.0 }],
              "candlestickPatterns": [{ "patternName": "e.g., Bullish Engulfing", "location": "e.g., 'At the 120.00 support level'" }]
            },
            "synthesisAndPlan": {
              "overallBias": "Bullish | Bearish | Neutral",
              "bullishFactors": ["Factor 1", "Factor 2"],
              "bearishFactors": ["Factor 1", "Factor 2"],
              "actionableTradePlan": {
                "strategy": "Long on Breakout | Short on Rejection | Range Trade",
                "entrySetup": { "idealEntryZone": "price - price", "confirmationSignal": "e.g., 'A 4H candle close above resistance.'" },
                "exitStrategy": { "takeProfitTargets": [{ "target": 1, "level": 0.0 }], "stopLossLevel": 0.0 },
                "riskRewardRatio": "e.g., 1:2.5"
              }
            },
            "riskManagement": {
              "tradeConfidence": "High | Medium | Low",
              "keyRisks": ["Risk 1", "Risk 2"]
            },
            "disclaimer": "AI-generated analysis for informational purposes. Not financial advice. Verify all information and manage risk appropriately."
          }

          **A NOTE ON RISK:** You must not calculate position size, as that depends on the user's capital and risk tolerance. The plan should provide all necessary levels for the user to do this themselves.

          Begin analysis and generate the JSON response.
          `;
    fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + API_KEY,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: tradePlanPrompt },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: { 
            temperature: 0.1, // Very low temperature for maximum consistency and adherence to the schema
            topP: 0.9, 
            maxOutputTokens: 8192, // Increased token limit for the larger JSON object
            responseMimeType: 'application/json' // Enforce JSON output at the API level
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      }
    )
    .then(function(response) {
      if (!response.ok) {
        return response.json().then(function(error) {
          console.error('API Error:', error);
          throw new Error(error.error?.message || 'Failed to analyze image');
        });
      }
      return response.json();
    })
    .then(function(data) {
      console.log('API Response:', data);
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        try {
          // Try to parse the response as JSON
          const jsonResponse = JSON.parse(data.candidates[0].content.parts[0].text);
          // If parsing succeeds, return the parsed JSON
          resolve({
            analysis: jsonResponse,
            isJson: true
          });
        } catch (e) {
          // If parsing fails, return as plain text
          console.log('Response is not valid JSON, returning as plain text');
          resolve({
            analysis: data.candidates[0].content.parts[0].text,
            isJson: false
          });
        }
      } else {
        console.warn('Unexpected API response format:', data);
        resolve({
          analysis: 'No analysis available. The response format was not as expected.',
          isJson: false
        });
      }
    })
    .catch(function(error) {
      console.error('Error analyzing image:', error);
      reject(new Error(error.message || 'Failed to analyze image. Please try again.'));
    });
  });
}
