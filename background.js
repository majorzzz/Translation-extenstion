// background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateSelection",
    title: "Translate selection with LingaTrans",
    contexts: ["selection"]
  });
  chrome.storage.local.set({ lastLang: 'ur' });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelection") {
    chrome.tabs.sendMessage(tab.id, {
      type: "TRANSLATE_SELECTION",
      text: info.selectionText
    }).catch(err => console.warn("LingaTrans: Tab not ready."));
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PERFORM_TRANSLATION") {
    const target = request.targetLang || 'ur';
    translateText(request.text, target)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function translateText(text, targetLang = 'ur') {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();
    if (!data || !data[0]) throw new Error("Invalid API response");
    return data[0].map(item => item[0]).join('');
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}
