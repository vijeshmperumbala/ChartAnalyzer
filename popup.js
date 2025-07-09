// Function to safely parse potentially incomplete JSON
function tryParseJSON(jsonString) {
  try {
    // Try to parse as complete JSON first
    const result = JSON.parse(jsonString);
    return { success: true, data: result };
  } catch (e) {
    // If parsing fails, try to recover partial JSON
    try {
      // Try to fix common JSON issues
      let fixedJson = jsonString;
      
      // Add missing closing brackets/braces
      const openBraces = (fixedJson.match(/\{/g) || []).length;
      const closeBraces = (fixedJson.match(/\}/g) || []).length;
      const openBrackets = (fixedJson.match(/\[/g) || []).length;
      const closeBrackets = (fixedJson.match(/\]/g) || []).length;
      
      // Add missing closing brackets
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixedJson += '}'; 
      }
      
      // Add missing closing array brackets
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixedJson += ']';
      }
      
      // Try parsing the fixed JSON
      const result = JSON.parse(fixedJson);
      return { success: true, data: result, wasFixed: true };
    } catch (e2) {
      return { 
        success: false, 
        error: e2.message,
        partialData: jsonString
      };
    }
  }
}

// Function to format analysis data as a structured HTML report
function formatAnalysisReport(data) {
  console.log('[formatAnalysisReport] Input data:', { type: typeof data, data });
  
  if (!data) {
    console.error('No analysis data provided');
    return '<div class="analysis-error">No analysis data available</div>';
  }

  try {
    // If data is a string, check if it's a known error message
    if (typeof data === 'string') {
      const trimmedData = data.trim();
      
      // Check for common error patterns first
      if (trimmedData.startsWith('No analysis available') || 
          trimmedData.startsWith('Error:') ||
          trimmedData.startsWith('Failed to') ||
          trimmedData.includes('error') ||
          trimmedData.includes('Error:')) {
        return `
          <div class="analysis-report">
            <div class="section">
              <h3>Analysis Result</h3>
              <div class="section-content">
                <div class="error-message">${trimmedData}</div>
              </div>
            </div>
          </div>`;
      }
      
      // Handle empty string case
      if (!trimmedData) {
        return `
          <div class="analysis-report">
            <div class="section">
              <h3>Analysis Result</h3>
              <div class="section-content">
                <div class="warning-message">No data received from the analysis service.</div>
              </div>
            </div>
          </div>`;
      }
      
      // Try to parse the data using our safe JSON parser
      const parseResult = tryParseJSON(trimmedData);
      
      if (parseResult.success) {
        data = parseResult.data;
        if (parseResult.wasFixed) {
          console.warn('Successfully recovered from incomplete JSON data');
        }
      } else {
        // If we can't parse as JSON, try to extract JSON from the string
        const jsonMatch = trimmedData.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractResult = tryParseJSON(jsonMatch[0]);
          if (extractResult.success) {
            data = extractResult.data;
            console.warn('Successfully extracted JSON from string');
          } else {
            console.error('Error parsing extracted JSON:', extractResult.error);
            return `
              <div class="analysis-report">
                <div class="section">
                  <h3>Analysis Result</h3>
                  <div class="section-content">
                    <div class="error-message">Error parsing analysis data. The data may be incomplete or corrupted.</div>
                    <details class="error-details">
                      <summary>Show raw data</summary>
                      <pre class="raw-content">${trimmedData.length > 1000 ? trimmedData.substring(0, 1000) + '...' : trimmedData}</pre>
                    </details>
                  </div>
                </div>
              </div>`;
          }
        } else {
          // If no JSON found, return as plain text with proper formatting
          return `
            <div class="analysis-report">
              <div class="section">
                <h3>Analysis Result</h3>
                <div class="section-content">
                  <div class="warning-message">Received unexpected response format. Showing raw data:</div>
                  <pre class="raw-content">${trimmedData.length > 1000 ? trimmedData.substring(0, 1000) + '...' : trimmedData}</pre>
                </div>
              </div>
            </div>
          `;
        }
      }
    }

    let html = `
      <div class="analysis-report">
        <div class="section">
          <h3>📊 Chart Analysis</h3>
          <div class="section-content">
            <p><strong>Asset:</strong> ${data.chartContext?.assetTicker || 'N/A'}</p>
            <p><strong>Timeframe:</strong> ${data.chartContext?.timeframe || 'N/A'}</p>
            <p><strong>Current Price:</strong> ${data.coreAnalysis?.priceAction?.currentPrice || 'N/A'}</p>
          </div>
        </div>
    `;

    // Add Trend Analysis
    if (data.coreAnalysis?.trend) {
      const trend = data.coreAnalysis.trend;
      html += `
        <div class="section">
          <h3>📈 Trend Analysis</h3>
          <div class="section-content">
            <p><strong>Primary Direction:</strong> ${trend.primaryDirection || 'N/A'}</p>
            <p><strong>Short-term Direction:</strong> ${trend.shortTermDirection || 'N/A'}</p>
            <p><strong>Strength:</strong> ${trend.strength || 'N/A'}</p>
            <p class="reasoning">${trend.reasoning || ''}</p>
          </div>
        </div>
      `;
    }

    // Add Support/Resistance
    if (data.coreAnalysis?.priceAction) {
      const pa = data.coreAnalysis.priceAction;
      html += `
        <div class="section">
          <h3>📊 Key Levels</h3>
          <div class="section-content">
            <div class="levels">
              <div class="level-group">
                <h4>Support Levels</h4>
                ${(pa.supportLevels || []).map(level => `
                  <p>${level.level} (${level.strength}) - ${level.touches} touches</p>
                `).join('')}
              </div>
              <div class="level-group">
                <h4>Resistance Levels</h4>
                ${(pa.resistanceLevels || []).map(level => `
                  <p>${level.level} (${level.strength}) - ${level.touches} touches</p>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Add Indicators
    if (data.coreAnalysis?.indicators?.length) {
      html += `
        <div class="section">
          <h3>📊 Technical Indicators</h3>
          <div class="section-content indicators">
            ${data.coreAnalysis.indicators.map(ind => `
              <div class="indicator">
                <h4>${ind.indicatorName}</h4>
                <p>${ind.status || ''}</p>
                <p class="signal">${ind.signal || ''}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Add Trade Plan
    if (data.synthesisAndPlan) {
      const plan = data.synthesisAndPlan;
      html += `
        <div class="section">
          <h3>📝 Trading Plan</h3>
          <div class="section-content">
            <div class="bias">
              <h4>Overall Bias: <span class="${plan.overallBias?.toLowerCase() || ''}">${plan.overallBias || 'Neutral'}</span></h4>
              
              <div class="factors">
                <div class="factor-group">
                  <h5>Bullish Factors</h5>
                  <ul>${(plan.bullishFactors || []).map(f => `<li>${f}</li>`).join('') || '<li>None identified</li>'}</ul>
                </div>
                <div class="factor-group">
                  <h5>Bearish Factors</h5>
                  <ul>${(plan.bearishFactors || []).map(f => `<li>${f}</li>`).join('') || '<li>None identified</li>'}</ul>
                </div>
              </div>
              
              ${plan.actionableTradePlan ? `
                <div class="trade-plan">
                  <h5>Strategy: ${plan.actionableTradePlan.strategy || 'N/A'}</h5>
                  <p><strong>Entry Zone:</strong> ${plan.actionableTradePlan.entrySetup?.idealEntryZone || 'N/A'}</p>
                  <p><strong>Confirmation:</strong> ${plan.actionableTradePlan.entrySetup?.confirmationSignal || 'N/A'}</p>
                  ${plan.actionableTradePlan.exitStrategy?.takeProfitTargets?.length ? `
                    <div class="targets">
                      <h5>Take Profit Targets:</h5>
                      <ol>
                        ${plan.actionableTradePlan.exitStrategy.takeProfitTargets.map(t => `
                          <li>${t.level || 'N/A'}</li>
                        `).join('')}
                      </ol>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }

    html += '</div>'; // Close analysis-report
    return html;

  } catch (error) {
    console.error('Error formatting analysis report:', error);
    return `
      <div class="analysis-error">
        <p>Error formatting analysis report. Showing raw data instead.</p>
        <div class="json-container">${formatJson(data)}</div>
      </div>
    `;
  }
}

// Function to format JSON with syntax highlighting and better readability
function formatJson(json) {
  if (typeof json === 'string') {
    try {
      json = JSON.parse(json);
    } catch (e) {
      return `<div class="json-error">${json}</div>`; // Return as-is if not valid JSON
    }
  }

  // Convert JSON to string with indentation
  const jsonStr = JSON.stringify(json, null, 2);
  
  // Process the JSON string to add HTML for syntax highlighting
  let result = jsonStr
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Add line breaks and indentation
    .replace(/\n/g, '<br>')
    .replace(/\s{2,}/g, (match) => {
      // Convert spaces to non-breaking spaces for consistent indentation
      return '&nbsp;'.repeat(match.length);
    })
    
    // Highlight JSON keys
    .replace(/"([^"]+)"\s*:/g, '<span class="json-key">"$1"</span>:')
    
    // Highlight string values
    .replace(/:\s*"([^"]*)"/g, (match, p1) => {
      // Skip if it's a key
      if (match.startsWith('"')) return match;
      return `: <span class="json-string">"${p1}"</span>`;
    })
    
    // Highlight numbers
    .replace(/:\s*(\d+(\.\d+)?)/g, ': <span class="json-number">$1</span>')
    
    // Highlight booleans
    .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
    
    // Highlight null
    .replace(/:\s*null/g, ': <span class="json-null">null</span>')
    
    // Highlight brackets and braces
    .replace(/([\[\]{}])/g, '<span class="json-punctuation">$1</span>')
    
    // Add indentation for nested objects/arrays
    .replace(/(\{[^}]*\}|\[[^\]]*\])/g, (match) => {
      // Count the number of newlines to determine indentation level
      const indent = (match.match(/<br>/g) || []).length > 1 ? '&nbsp;&nbsp;' : '';
      return match.replace(/<br>/g, '<br>' + indent);
    });

  // Wrap the result in a pre tag with a monospace font
  return `<div class="json-container">${result}</div>`;
}

// Function to copy text to clipboard with fallback method
async function copyToClipboard(text) {
  // Modern method using Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, falling back to execCommand', err);
      // Continue to fallback method
    }
  }
  
  // Fallback method using document.execCommand
  try {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Make the textarea out of viewport
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    
    // Add to document
    document.body.appendChild(textarea);
    
    // Select and copy
    textarea.select();
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textarea);
    
    if (!successful) {
      throw new Error('execCommand copy failed');
    }
    
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    // Last resort - show the text in a prompt
    try {
      window.prompt('Copy to clipboard: Ctrl+C, Enter', text);
      return true;
    } catch (e) {
      console.error('Fallback copy method also failed', e);
      return false;
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loadingDiv = document.getElementById('loading');
  const resultDiv = document.getElementById('result');
  const copyResultBtn = document.getElementById('copyResultBtn');
  const analysisText = document.getElementById('analysisText');
  
  // Store original button state
  const originalButtonState = {
    text: copyResultBtn.textContent,
    background: copyResultBtn.style.backgroundColor,
    border: copyResultBtn.style.borderColor,
    cursor: copyResultBtn.style.cursor
  };

  // Function to reset button to original state
  const resetButtonState = () => {
    copyResultBtn.textContent = originalButtonState.text;
    copyResultBtn.style.backgroundColor = originalButtonState.background;
    copyResultBtn.style.borderColor = originalButtonState.border;
    copyResultBtn.style.cursor = originalButtonState.cursor;
    copyResultBtn.disabled = false;
  };

  // Add click event listener for the copy button with enhanced feedback
  copyResultBtn.addEventListener('click', async () => {
    // Try to get the analysis report content
    const reportContainer = document.getElementById('analysisReport');
    
    // If report container exists, use its text content
    let textToCopy = '';
    if (reportContainer) {
      textToCopy = reportContainer.textContent.trim();
    } 
    // Fallback to analysisText if report container not found
    else if (analysisText) {
      textToCopy = analysisText.textContent.trim();
    }
    
    if (!textToCopy) {
      console.warn('No analysis content available to copy');
      // Show feedback to the user
      const originalText = copyResultBtn.textContent;
      copyResultBtn.textContent = '❌ No content';
      copyResultBtn.disabled = true;
      setTimeout(() => {
        copyResultBtn.textContent = originalText;
        copyResultBtn.disabled = false;
      }, 2000);
      return;
    }
    
    // Set button to copying state
    copyResultBtn.textContent = 'Copying...';
    copyResultBtn.style.backgroundColor = '#e3f2fd';
    copyResultBtn.style.borderColor = '#90caf9';
    copyResultBtn.style.cursor = 'wait';
    copyResultBtn.disabled = true;
    
    try {
      // Copy to clipboard with a timeout to prevent hanging
      const copyPromise = copyToClipboard(textToCopy);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Copy operation timed out')), 5000)
      );
      
      const success = await Promise.race([copyPromise, timeoutPromise]);
      
      // Update button to show success state
      copyResultBtn.textContent = '✓ Copied!';
      copyResultBtn.style.backgroundColor = '#e8f5e9';
      copyResultBtn.style.borderColor = '#4caf50';
      copyResultBtn.style.color = '#2e7d32';
      
      // Log success
      console.log('Successfully copied analysis to clipboard');
      
    } catch (error) {
      console.error('Error during copy operation:', error);
      
      // Update button to show error state
      copyResultBtn.textContent = '❌ Try again';
      copyResultBtn.style.backgroundColor = '#ffebee';
      copyResultBtn.style.borderColor = '#f44336';
      copyResultBtn.style.color = '#c62828';
      
      // If it was a timeout error, show a more specific message
      if (error.message.includes('timed out')) {
        copyResultBtn.textContent = '❌ Timed out';
      }
    } finally {
      // Always reset the button after 2 seconds, whether successful or not
      setTimeout(resetButtonState, 2000);
      
      // Re-enable the button immediately if it was disabled due to an error
      if (copyResultBtn.disabled) {
        setTimeout(() => {
          copyResultBtn.disabled = false;
          copyResultBtn.style.cursor = 'pointer';
        }, 2000);
      }
    }
  });
  const jsonViewer = document.getElementById('jsonViewer');
  const jsonContent = document.getElementById('jsonContent');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const errorDiv = document.getElementById('error');
  
  // Copy JSON to clipboard
  copyJsonBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(jsonContent.textContent);
      const originalText = copyJsonBtn.textContent;
      copyJsonBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        copyJsonBtn.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  });
  const optionsLink = document.createElement('a');
  
  // Add options link
  optionsLink.href = '#';
  optionsLink.textContent = 'Set API Key';
  optionsLink.style.display = 'block';
  optionsLink.style.marginTop = '10px';
  optionsLink.style.textAlign = 'center';
  optionsLink.style.fontSize = '12px';
  optionsLink.style.color = '#4285f4';
  optionsLink.style.textDecoration = 'none';
  optionsLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  document.querySelector('.container').appendChild(optionsLink);

  // Check if API key is set
  function checkApiKey() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['apiKey'], function(result) {
        if (result.apiKey) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  analyzeBtn.addEventListener('click', async function() {
    // Show loading state
    analyzeBtn.disabled = true;
    loadingDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');

    try {
      // First check if API key is set
      const hasApiKey = await checkApiKey();
      if (!hasApiKey) {
        handleError({
          message: 'Please set your Gemini API key in the extension options.'
        });
        return;
      }

      console.log('Requesting tab capture and analysis...');
      
      // Send message to background script to capture and analyze the tab
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'captureAndAnalyze' },
          function(response) {
            if (chrome.runtime.lastError) {
              resolve({
                error: {
                  message: 'Failed to communicate with extension: ' + 
                          (chrome.runtime.lastError.message || 'Unknown error')
                }
              });
            } else {
              resolve(response || { error: { message: 'No response from the extension' } });
            }
          }
        );
      });
      
      // Check for error in response
      if (response.error) {
        throw new Error(response.error.message || 'Unknown error occurred');
      }
      
      // Display the result
      console.log('Analysis complete');
      
      // Log the full response for debugging
      console.log('Full response:', response);
      
      try {
        // Check if we have a valid response with analysis
        if (!response || !response.analysis) {
          throw new Error('No analysis data received');
        }

        // Handle the analysis data
        const analysisData = response.analysis;
        console.log('Analysis data:', analysisData);

        try {
          // Try to format as a structured report
          const reportHtml = formatAnalysisReport(analysisData);
          
          // Hide the text area and show the formatted report
          analysisText.style.display = 'none';
          
          // Create or update the report container
          let reportContainer = document.getElementById('analysisReport');
          if (!reportContainer) {
            reportContainer = document.createElement('div');
            reportContainer.id = 'analysisReport';
            analysisText.parentNode.insertBefore(reportContainer, analysisText.nextSibling);
          }
          
          // Update the report content
          reportContainer.innerHTML = reportHtml;
          reportContainer.classList.remove('hidden');
          
          // Show the JSON viewer toggle
          const toggleJsonBtn = document.createElement('button');
          toggleJsonBtn.id = 'toggleJsonBtn';
          toggleJsonBtn.textContent = 'View Raw JSON';
          toggleJsonBtn.className = 'toggle-json-btn';
          toggleJsonBtn.onclick = function() {
            const isHidden = jsonViewer.classList.toggle('hidden');
            toggleJsonBtn.textContent = isHidden ? 'View Raw JSON' : 'Hide Raw JSON';
          };
          
          // Add the toggle button if it doesn't exist
          if (!document.getElementById('toggleJsonBtn')) {
            reportContainer.parentNode.insertBefore(toggleJsonBtn, jsonViewer);
          }
          
          // Prepare the JSON view
          try {
            const jsonData = typeof analysisData === 'string' ? JSON.parse(analysisData) : analysisData;
            jsonContent.innerHTML = formatJson(jsonData);
            jsonViewer.classList.add('hidden');
          } catch (e) {
            jsonContent.textContent = 'Unable to format JSON data';
            jsonViewer.classList.add('hidden');
          }
          
        } catch (error) {
          console.error('Error processing analysis:', error);
          analysisText.textContent = 'Error processing analysis data. Please try again.';
          analysisText.style.display = 'block';
          jsonViewer.classList.add('hidden');
        }
        
      } catch (error) {
        console.error('Error processing analysis:', error);
        analysisText.textContent = 'Error processing analysis. Please try again.';
        jsonViewer.classList.add('hidden');
      }
      
      resultDiv.classList.remove('hidden');
      
    } catch (error) {
      handleError(error);
      return;
    } finally {
      // Hide loading state
      loadingDiv.classList.add('hidden');
      analyzeBtn.disabled = false;
    }
  });
  
  function handleError(error) {
    console.error('Error:', error);
    
    let errorMessage = 'Error analyzing chart. Please try again.';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && error.message) {
      errorMessage = error.message;
    } else if (error && typeof error.toString === 'function') {
      errorMessage = error.toString();
    }
    
    // Handle common error cases
    if (errorMessage.includes('Cannot access contents of url')) {
      errorMessage = 'Cannot access this page. Try a different tab or page.';
    } else if (errorMessage.includes('permissions')) {
      errorMessage = 'Permission denied. Please check extension permissions.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      errorMessage = 'Invalid or missing API key. Please set a valid API key in the extension options.';
    }
    
    errorDiv.textContent = errorMessage;
    errorDiv.classList.remove('hidden');
    loadingDiv.classList.add('hidden');
    analyzeBtn.disabled = false;
  }
});
