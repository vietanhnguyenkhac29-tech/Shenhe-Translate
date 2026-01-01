document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. KHAI BÁO CÁC PHẦN TỬ GIAO DIỆN (DOM Elements) ---
    const UI = {
        text: {
            source: document.getElementById('sourceText'),
            target: document.getElementById('targetText'),
            count: document.getElementById('charCount'),
            loader: document.getElementById('loader')
        },
        lang: {
            source: document.getElementById('sourceLang'),
            target: document.getElementById('targetLang'),
            swapBtn: document.getElementById('swapBtn')
        },
        btn: {
            translate: document.getElementById('translateBtn'),
            copy: document.getElementById('copyBtn'),
            paste: document.getElementById('pasteBtn'),
            speakSource: document.getElementById('speakSourceBtn'),
            speakTarget: document.getElementById('speakTargetBtn')
        },
        tabs: {
            buttons: document.querySelectorAll('.tab-btn'),
            panels: document.querySelectorAll('.tab-panel')
        },
        image: {
            dropZone: document.getElementById('dropZone'),
            input: document.getElementById('imageInput'),
            preview: document.getElementById('imagePreview'),
            container: document.getElementById('imagePreviewContainer'),
            status: document.getElementById('ocrStatus')
        },
        web: {
            url: document.getElementById('websiteUrl'),
            btn: document.getElementById('translateWebBtn')
        }
    };

    // --- 2. CÁC HÀM XỬ LÝ CHÍNH (LOGIC) ---

    const App = {
        // Hàm khởi chạy ban đầu
        init: function() {
            this.setupTabs();
            this.setupTranslation();
            this.setupImageOCR();
            this.setupWebTranslate();
            this.setupUtilities();
        },

        // Xử lý chuyển đổi Tab (Văn bản <-> Ảnh <-> Web)
        setupTabs: function() {
            UI.tabs.buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Xóa class active cũ
                    UI.tabs.buttons.forEach(b => b.classList.remove('active'));
                    UI.tabs.panels.forEach(p => p.classList.remove('active'));
                    
                    // Thêm active mới
                    btn.classList.add('active');
                    const tabId = btn.getAttribute('data-tab');
                    
                    if(tabId === 'text') document.getElementById('textPanel').classList.add('active');
                    if(tabId === 'image') document.getElementById('imagePanel').classList.add('active');
                    if(tabId === 'website') document.getElementById('websitePanel').classList.add('active');
                });
            });
        },

        // Xử lý Dịch Văn Bản (Gọi API Google)
        performTranslation: async function(inputText = null) {
            const text = inputText || UI.text.source.value.trim();
            if (!text) return;

            UI.text.loader.style.display = "flex"; // Hiện loading
            
            try {
                const sl = UI.lang.source.value;
                const tl = UI.lang.target.value;
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;

                const res = await fetch(url);
                const data = await res.json();
                const result = data[0].map(item => item[0]).join("");

                UI.text.target.value = result;
                
                // Nếu đang ở tab Ảnh, tự chuyển về tab Văn bản để xem kết quả
                if (document.querySelector('.tab-btn[data-tab="image"]').classList.contains('active')) {
                    document.querySelector('.tab-btn[data-tab="text"]').click();
                }

            } catch (err) {
                console.error(err);
                UI.text.target.value = "Lỗi kết nối. Vui lòng thử lại.";
            } finally {
                UI.text.loader.style.display = "none"; // Tắt loading
            }
        },

        setupTranslation: function() {
            UI.btn.translate.addEventListener('click', () => this.performTranslation());
            // Đếm ký tự khi nhập
            UI.text.source.addEventListener('input', () => {
                UI.text.count.innerText = `${UI.text.source.value.length}/5000`;
            });
        },

        // Xử lý Quét chữ từ Ảnh (AI OCR)
        setupImageOCR: function() {
            UI.image.dropZone.addEventListener('click', () => UI.image.input.click());
            
            UI.image.input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Hiển thị ảnh preview
                UI.image.preview.src = URL.createObjectURL(file);
                UI.image.container.style.display = "block";
                UI.image.status.innerText = "❄️ Shenhe đang đọc chữ...";

                // Map ngôn ngữ cho Tesseract
                const langMap = {'vi': 'vie', 'en': 'eng', 'zh-CN': 'chi_sim', 'ja': 'jpn', 'ko': 'kor', 'fr': 'fra', 'auto': 'eng'};
                const ocrLang = langMap[UI.lang.source.value] || 'eng';

                try {
                    const { data: { text } } = await Tesseract.recognize(file, ocrLang);
                    UI.image.status.innerText = "✅ Đã xong! Đang dịch...";
                    UI.text.source.value = text;
                    this.performTranslation(text);
                } catch (err) {
                    UI.image.status.innerText = "❌ Không đọc được ảnh.";
                }
            });
        },

        // Xử lý Dịch Website
        setupWebTranslate: function() {
            UI.web.btn.addEventListener('click', () => {
                let url = UI.web.url.value.trim();
                if (!url) return alert("Vui lòng nhập link!");
                if (!url.startsWith('http')) url = 'https://' + url;
                
                const link = `https://translate.google.com/translate?sl=${UI.lang.source.value}&tl=${UI.lang.target.value}&u=${encodeURIComponent(url)}`;
                window.open(link, '_blank');
            });
        },

        // Các tiện ích phụ (Copy, Paste, Loa, Đổi ngôn ngữ)
        setupUtilities: function() {
            // Đổi ngôn ngữ
            UI.lang.swapBtn.addEventListener('click', () => {
                const tmp = UI.lang.source.value;
                UI.lang.source.value = UI.lang.target.value;
                UI.lang.target.value = (tmp === 'auto') ? 'vi' : tmp;
                
                const txt = UI.text.source.value;
                UI.text.source.value = UI.text.target.value;
                UI.text.target.value = txt;
                this.performTranslation();
            });

            // Copy & Paste
            UI.btn.copy.addEventListener('click', () => {
                if(UI.text.target.value) navigator.clipboard.writeText(UI.text.target.value);
            });
            UI.btn.paste.addEventListener('click', async () => {
                UI.text.source.value = await navigator.clipboard.readText();
                this.performTranslation();
            });

            // Text to Speech (Loa)
            const speak = (text, lang) => {
                if (!text) return;
                const u = new SpeechSynthesisUtterance(text);
                u.lang = (lang === 'auto') ? 'vi-VN' : lang;
                window.speechSynthesis.speak(u);
            };
            UI.btn.speakSource.addEventListener('click', () => speak(UI.text.source.value, UI.lang.source.value));
            UI.btn.speakTarget.addEventListener('click', () => speak(UI.text.target.value, UI.lang.target.value));
        }
    };

    // --- 3. KHỞI ĐỘNG ỨNG DỤNG ---
    App.init();
});