// content.js
let shadowRoot = null;
let currentSelection = "";
let lastRect = null;

const LANGUAGES = {
    "en": "English", "ar": "Arabic", "zh-CN": "Chinese", "fr": "French", "de": "German",
    "hi": "Hindi", "id": "Indonesian", "it": "Italian", "ja": "Japanese", "ko": "Korean",
    "pt": "Portuguese", "ru": "Russian", "es": "Spanish", "tr": "Turkish", "ur": "Urdu",
    "vi": "Vietnamese", "bn": "Bengali", "pa": "Punjabi", "nl": "Dutch", "pl": "Polish"
};

function isContextValid() {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); } 
    catch (e) { return false; }
}

function ensureUI() {
    if (shadowRoot || !isContextValid()) return;
    try {
        const host = document.createElement('div');
        host.id = 'lingatrans-host';
        host.style.position = 'absolute';
        host.style.top = '0';
        host.style.left = '0';
        host.style.zIndex = '2147483647';
        document.body.appendChild(host);
        
        shadowRoot = host.attachShadow({mode: 'open'});
        shadowRoot.innerHTML = `
            <style>
                .btn { 
                    position: fixed; z-index: 2147483647; width: 36px; height: 36px; 
                    background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                    border-radius: 50%; color: white; display: none; align-items: center; 
                    justify-content: center; cursor: pointer; border: 2px solid white; 
                    font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.2s;
                }
                .modal { 
                    position: fixed; z-index: 2147483647; background: #fff; 
                    border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); 
                    display: none; flex-direction: column; width: 380px; 
                    font-family: sans-serif; border: 1px solid #ddd; overflow: hidden;
                    max-height: 85vh; /* Responsive to screen height */
                }
                .header { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid #eee; flex-shrink: 0; background: #fff; }
                .logo-img { width: 18px; height: 18px; border-radius: 4px; margin-right: 8px; vertical-align: middle; }
                .title { font-size: 11px; font-weight: 800; color: #4f46e5; margin: 0; display: inline-block; vertical-align: middle; }
                .select { font-size: 11px; padding: 2px 4px; border-radius: 4px; border: 1px solid #ccc; }
                .close { border: none; background: none; cursor: pointer; font-size: 20px; color: #999; }
                
                .scroll-area { flex: 1; overflow-y: auto; padding: 15px; background: #fdfdfd; min-height: 50px; scrollbar-width: thin; }
                .source { font-size: 11px; color: #888; font-style: italic; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .target-txt { font-size: 15px; color: #000; line-height: 1.5; white-space: pre-wrap; font-weight: 500; }
                
                .footer { display: flex; justify-content: flex-end; padding: 10px 15px; border-top: 1px solid #eee; background: #fff; flex-shrink: 0; }
                .copy-btn { background: #6366f1; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 5px; }
                .copy-btn:hover { background: #4f46e5; }
                #toast { margin-right: auto; color: #10b981; font-size: 11px; display: none; font-weight: 600; }
                
                .loader { border: 2px solid #f3f3f3; border-top: 2px solid #6366f1; border-radius: 50%; width: 18px; height: 18px; animation: spin 1s linear infinite; display: inline-block; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
            <div id="magic-btn" class="btn">A</div>
            <div id="tooltip-modal" class="modal">
                <div class="header">
                    <div>
                        <img src="${chrome.runtime.getURL('icon16.png')}" class="logo-img" alt="L">
                        <p class="title">LINGATRANS PRO</p>
                    </div>
                    <div>
                        <select id="lang-sel" class="select"></select>
                        <button id="close-btn" class="close">&times;</button>
                    </div>
                </div>
                <div class="scroll-area">
                    <div class="source" id="source-txt"></div>
                    <div id="target-txt" class="target-txt"><span class="loader"></span></div>
                </div>
                <div class="footer">
                    <span id="toast">✔ Copied</span>
                    <button id="copy-btn" class="copy-btn">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copy
                    </button>
                </div>
            </div>
        `;
        const sel = shadowRoot.getElementById('lang-sel');
        Object.entries(LANGUAGES).forEach(([code, name]) => {
            const op = document.createElement('option'); op.value = code; op.textContent = name;
            sel.appendChild(op);
        });
        shadowRoot.getElementById('close-btn').onclick = hideAll;
        shadowRoot.getElementById('magic-btn').onmousedown = (e) => {
            e.preventDefault(); e.stopPropagation();
            if (isContextValid()) showModal(); else hideAll();
        };
        shadowRoot.getElementById('lang-sel').onchange = (e) => {
            if (isContextValid()) {
                chrome.storage.local.set({lastLang: e.target.value});
                translate(currentSelection, e.target.value);
            }
        };
        shadowRoot.getElementById('copy-btn').onclick = () => {
            const txt = shadowRoot.getElementById('target-txt').textContent;
            navigator.clipboard.writeText(txt).then(() => {
                const t = shadowRoot.getElementById('toast');
                t.style.display = 'inline'; setTimeout(() => t.style.display = 'none', 1500);
            });
        };
    } catch (e) {}
}

function hideAll() {
    if (!shadowRoot) return;
    try {
        shadowRoot.getElementById('magic-btn').style.display = 'none';
        shadowRoot.getElementById('tooltip-modal').style.display = 'none';
    } catch (e) {}
}

async function showModal() {
    if (!isContextValid()) return;
    ensureUI();
    const modal = shadowRoot.getElementById('tooltip-modal');
    const btn = shadowRoot.getElementById('magic-btn');
    if (!modal || !btn) return;
    btn.style.display = 'none';
    
    try {
        chrome.storage.local.get(['lastLang'], (result) => {
            if (chrome.runtime.lastError || !isContextValid()) return;
            const target = result.lastLang || 'ur';
            shadowRoot.getElementById('source-txt').textContent = currentSelection;
            shadowRoot.getElementById('lang-sel').value = target;
            
            modal.style.height = 'auto'; // Reset
            modal.style.display = 'flex';
            modal.style.visibility = 'hidden';
            
            setTimeout(() => {
                const viewportH = window.innerHeight;
                let h = modal.offsetHeight;
                
                // If it's too tall for the entire screen, cap it and force scroll
                if (h > viewportH - 40) {
                    h = viewportH - 40;
                    modal.style.height = h + "px";
                }
                
                const spaceAbove = lastRect.top;
                const spaceBelow = viewportH - lastRect.bottom;
                
                let top;
                if (spaceAbove > h + 30) {
                    top = lastRect.top - h - 15;
                } else if (spaceBelow > h + 30) {
                    top = lastRect.bottom + 15;
                } else {
                    // Fits neither, move it to the edge that is most open
                    if (spaceAbove > spaceBelow) {
                        top = 10;
                        if (h > spaceAbove - 20) {
                             modal.style.height = (spaceAbove - 20) + "px";
                        }
                    } else {
                        top = lastRect.bottom + 15;
                        if (top + h > viewportH - 10) {
                            modal.style.height = (viewportH - top - 15) + "px";
                        }
                    }
                }
                
                modal.style.top = top + "px";
                const w = 380;
                let left = lastRect.left;
                if (left + w > window.innerWidth - 10) left = window.innerWidth - w - 20;
                modal.style.left = Math.max(15, left) + "px";
                modal.style.visibility = 'visible';
            }, 60);
            
            translate(currentSelection, target);
        });
    } catch (e) {}
}

function translate(text, lang) {
    if (!isContextValid()) return;
    const out = shadowRoot.getElementById('target-txt');
    if (!out) return;
    out.innerHTML = '<span class="loader"></span>';
    chrome.runtime.sendMessage({type: 'PERFORM_TRANSLATION', text, targetLang: lang}, (res) => {
        if (!isContextValid() || chrome.runtime.lastError) return;
        if (res && res.success) out.textContent = res.result;
        else out.textContent = "Error: Connection issue.";
    });
}

document.addEventListener('mouseup', (e) => {
    if (!isContextValid()) return;
    if (e.composedPath().some(el => el.id === 'lingatrans-host')) return;
    setTimeout(() => {
        if (!isContextValid()) return;
        const sel = window.getSelection();
        const txt = sel.toString().trim();
        if (txt.length > 1) {
            currentSelection = txt;
            const range = sel.getRangeAt(0);
            lastRect = range.getBoundingClientRect();
            ensureUI();
            const btn = shadowRoot.getElementById('magic-btn');
            if (btn) {
                btn.style.display = 'flex';
                let btnTop = lastRect.top - 45; 
                if (btnTop < 10) btnTop = lastRect.bottom + 15;
                btn.style.top = btnTop + "px";
                btn.style.left = Math.min(window.innerWidth - 45, (lastRect.left + lastRect.width/2 - 18)) + "px";
            }
        } else hideAll();
    }, 10);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideAll(); });
