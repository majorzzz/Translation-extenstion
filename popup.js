// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const sourceText = document.getElementById('source-text');
    const targetLang = document.getElementById('target-lang');
    const translateBtn = document.getElementById('translate-btn');
    const resultBox = document.getElementById('result-box');

    // Safety check
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    // Load preference, default to Urdu
    chrome.storage.local.get(['lastLang'], (result) => {
        if (chrome.runtime.lastError) return;
        targetLang.value = result.lastLang || 'ur';
    });

    translateBtn.addEventListener('click', async () => {
        const text = sourceText.value.trim();
        if (!text) return;

        translateBtn.disabled = true;
        const originalText = translateBtn.innerHTML;
        translateBtn.innerHTML = 'Translating...';
        resultBox.innerHTML = '<span class="loader"></span>';

        const lang = targetLang.value;
        chrome.storage.local.set({ lastLang: lang });

        chrome.runtime.sendMessage({
            type: "PERFORM_TRANSLATION",
            text: text,
            targetLang: lang
        }, (response) => {
            if (chrome.runtime.lastError) {
                resultBox.innerHTML = '<span style="color: #ef4444;">Error: Extension reloaded. Close and reopen popup.</span>';
                return;
            }
            
            translateBtn.disabled = false;
            translateBtn.innerHTML = originalText;

            if (response && response.success) {
                resultBox.textContent = response.result;
            } else {
                resultBox.innerHTML = `<span style="color: #ef4444;">Error: ${response ? response.error : 'Unknown'}</span>`;
            }
        });
    });

    sourceText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            translateBtn.click();
        }
    });
});
