// background.js

// Initialize Context Menu and Defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateSelection",
    title: "Translate selection with LingaTrans",
    contexts: ["selection"]
  });
  
  // Set default language to Urdu
  chrome.storage.local.get(['lastLang'], (result) => {
    if (!result.lastLang) {
      chrome.storage.local.set({ lastLang: 'ur' });
    }
  });
});

// Handle Context Menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelection") {
    console.log("Context menu clicked for text:", info.selectionText);
    
    // Attempt to send message, handle "Receiving end does not exist"
    chrome.tabs.sendMessage(tab.id, {
      type: "TRANSLATE_SELECTION",
      text: info.selectionText
    }).catch(err => {
      console.error("Message Error:", err.message);
      if (err.message.includes("Receiving end does not exist")) {
        // Fallback: This usually means the content script isn't loaded yet
        alert("Please refresh the page to enable LingaTrans on this tab.");
      }
    });
  }
});

// Handle messages from Popup or Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PERFORM_TRANSLATION") {
    console.log("Requesting translation for:", request.text, "to", request.targetLang);
    const target = request.targetLang || 'en';
    translateText(request.text, target)
      .then(result => {
        console.log("Translation success:", result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error("Translation logic error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

/**
 * Perform translation using unofficial Google Translate API
 */
async function translateText(text, targetLang = 'en') {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error ${response.status}: ${errorBody}`);
    }
    
    const data = await response.json();
    if (!data || !data[0]) throw new Error("Invalid response from API");
    
    const translatedText = data[0].map(item => item[0]).join('');
    return translatedText;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}
