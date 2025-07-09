document.addEventListener('DOMContentLoaded', function() {
  // Load the saved API key, if any
  chrome.storage.sync.get(['apiKey'], function(result) {
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
  });

  // Save the API key when the save button is clicked
  document.getElementById('save').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const status = document.getElementById('status');
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    // Save the API key to storage
    chrome.storage.sync.set({ apiKey: apiKey }, function() {
      showStatus('API key saved successfully!', 'success');
      // Notify the background script about the API key update
      chrome.runtime.sendMessage({ action: 'apiKeyUpdated', apiKey: apiKey });
    });
  });

  // Helper function to show status messages
  function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = type;
    status.style.display = 'block';
    
    // Hide the status after 3 seconds
    setTimeout(function() {
      status.style.display = 'none';
    }, 3000);
  }
});
