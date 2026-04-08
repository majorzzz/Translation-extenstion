// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const sourceText = document.getElementById('source-text');
    const targetLang = document.getElementById('target-lang');
    const translateBtn = document.getElementById('translate-btn');
    const resultBox = document.getElementById('result-box');

    // Load last used language from storage
    chrome.storage.local.get(['lastLang'], (result) => {
        if (result.lastLang) {
            targetLang.value = result.lastLang;
        }
    });

    translateBtn.addEventListener('click', async () => {
        const text = sourceText.value.trim();
        if (!text) return;

        // Show loading state
        translateBtn.disabled = true;
        const originalText = translateBtn.innerHTML;
        translateBtn.innerHTML = 'Translating...';
        resultBox.innerHTML = '<span class="loader"></span>';

        const lang = targetLang.value;
        
        // Save language preference globally for content script to use
        chrome.storage.local.set({ lastLang: lang });

        // Request translation from background script
        chrome.runtime.sendMessage({
            type: "PERFORM_TRANSLATION",
            text: text,
            targetLang: lang
        }, (response) => {
            translateBtn.disabled = false;
            translateBtn.innerHTML = originalText;

            if (response && response.success) {
                resultBox.textContent = response.result;
            } else {
                resultBox.innerHTML = `<span style="color: #ef4444;">Error: ${response ? response.error : 'Unknown error'}</span>`;
            }
        });
    });

    // Allow Enter key to translate (unless Shift is held)
    sourceText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            translateBtn.click();
        }
    });
});
