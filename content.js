// content.js

let shadowHost = null;
let shadowRoot = null;
let modalElement = null;
let magicBtn = null;
let currentSelection = "";

const LANGUAGES = {
    "en": "English", "ar": "Arabic", "zh-CN": "Chinese", "fr": "French", "de": "German",
    "hi": "Hindi", "id": "Indonesian", "it": "Italian", "ja": "Japanese", "ko": "Korean",
    "pt": "Portuguese", "ru": "Russian", "es": "Spanish", "tr": "Turkish", "ur": "Urdu",
    "vi": "Vietnamese", "bn": "Bengali", "pa": "Punjabi", "nl": "Dutch", "pl": "Polish"
};

/**
 * Initialize the Shadow DOM and UI elements
 */
function initShadowDOM() {
    if (shadowHost) return;

    console.log("LingaTrans: Initializing Shadow DOM");
    shadowHost = document.createElement('div');
    shadowHost.id = 'lingatrans-host';
    // Ensure the host doesn't interfere with layout
    shadowHost.style.position = 'absolute';
    shadowHost.style.top = '0';
    shadowHost.style.left = '0';
    shadowHost.style.zIndex = '2147483647';
    document.body.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    // Inject Styles
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('content.css');
    shadowRoot.appendChild(styleLink);

    // Create Magic Button
    magicBtn = document.createElement('div');
    magicBtn.className = 'lingatrans-magic-btn';
    magicBtn.innerHTML = 'A';
    shadowRoot.appendChild(magicBtn);

    // Create Tooltip Modal
    modalElement = document.createElement('div');
    modalElement.className = 'lingatrans-modal-root';
    
    const langOptions = Object.entries(LANGUAGES).map(([code, name]) => 
        `<option value="${code}">${name}</option>`
    ).join('');

    modalElement.innerHTML = `
        <div class="lingatrans-header">
            <h3 class="lingatrans-title">Translation</h3>
            <div class="lingatrans-header-actions">
                <select id="lingatrans-modal-lang" class="lingatrans-select">
                    ${langOptions}
                </select>
                <button class="lingatrans-close">&times;</button>
            </div>
        </div>
        <div class="lingatrans-body">
            <div class="lingatrans-text-container">
                <div class="lingatrans-source-text" id="lingatrans-source">...</div>
                <div class="lingatrans-target-wrapper">
                    <div class="lingatrans-translated-text" id="lingatrans-target">
                        <span class="lingatrans-loader"></span>
                    </div>
                    <button id="lingatrans-copy" title="Copy Translation">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
            </div>
        </div>
        <div id="lingatrans-toast">Copied!</div>
        <div class="lingatrans-footer">LingaTrans</div>
    `;

    shadowRoot.appendChild(modalElement);

    // Actions
    modalElement.querySelector('.lingatrans-close').onclick = hideAll;
    
    const copyBtn = modalElement.querySelector('#lingatrans-copy');
    copyBtn.onclick = () => {
        const text = shadowRoot.getElementById('lingatrans-target').textContent;
        if (!text || text === "...") return;
        
        navigator.clipboard.writeText(text).then(() => {
            const toast = shadowRoot.getElementById('lingatrans-toast');
            toast.classList.add('visible');
            setTimeout(() => toast.classList.remove('visible'), 2000);
        });
    };
    
    const langSelector = modalElement.querySelector('#lingatrans-modal-lang');
    langSelector.onchange = () => {
        const text = shadowRoot.getElementById('lingatrans-source').textContent;
        const newLang = langSelector.value;
        chrome.storage.local.set({ lastLang: newLang });
        performTranslation(text, newLang);
    };

    magicBtn.onclick = (e) => {
        e.stopPropagation();
        showTooltip();
    };
}

function hideAll() {
    if (modalElement) modalElement.classList.remove('active');
    if (magicBtn) magicBtn.classList.remove('active');
    setTimeout(() => {
        if (modalElement) modalElement.style.display = 'none';
        if (magicBtn) magicBtn.style.display = 'none';
    }, 300);
}

function showTooltip() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    chrome.storage.local.get(['lastLang'], (result) => {
        const target = result.lastLang || 'ur';
        
        initShadowDOM();
        shadowRoot.getElementById('lingatrans-source').textContent = currentSelection;
        shadowRoot.getElementById('lingatrans-modal-lang').value = target;
        
        modalElement.style.display = 'flex';
        // Position relative to viewport (fixed)
        modalElement.style.top = `${rect.top - modalElement.offsetHeight - 10}px`;
        modalElement.style.left = `${rect.left}px`;

        // Adjust if it goes above the screen
        if (parseFloat(modalElement.style.top) < 10) {
            modalElement.style.top = `${rect.bottom + 10}px`;
        }

        setTimeout(() => modalElement.classList.add('active'), 10);
        performTranslation(currentSelection, target);
        magicBtn.classList.remove('active');
    });
}

function performTranslation(text, targetLang) {
    const targetEl = shadowRoot.getElementById('lingatrans-target');
    targetEl.innerHTML = '<span class="lingatrans-loader"></span>';
    
    chrome.runtime.sendMessage({
        type: "PERFORM_TRANSLATION",
        text: text,
        targetLang: targetLang
    }, (response) => {
        if (response && response.success) {
            targetEl.textContent = response.result;
        } else {
            targetEl.innerHTML = `<span style="color: #ef4444;">Error</span>`;
        }
    });
}

// Selection Listener
document.addEventListener('mouseup', () => {
    setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text && text.length > 1) {
            currentSelection = text;
            initShadowDOM();
            
            try {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                magicBtn.style.display = 'flex';
                // Fixed position coordinates
                magicBtn.style.top = `${rect.top - 40}px`;
                magicBtn.style.left = `${rect.left + (rect.width / 2) - 16}px`;
                
                setTimeout(() => magicBtn.classList.add('active'), 10);
            } catch (e) {
                console.error("LingaTrans: Selection error", e);
            }
        } else {
            // Only hide if we're not clicking our own UI
            // Since it's shadow DOM, we check if the path contains our host
            if (activeElementInShadow()) return;
            hideAll();
        }
    }, 10);
});

function activeElementInShadow() {
    return document.activeElement === shadowHost;
}

// Hide on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideAll();
});
