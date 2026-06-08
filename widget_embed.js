/**
 * ==========================================================
 * COMPACT CROSS-PLATFORM CLIENT WIDGET (JAVASCRIPT)
 * Mã nhúng 1 dòng duy nhất tự động nhận diện site_id & phối màu
 * Giao diện tương thích hoàn toàn cấu hình tại MÀN HÌNH 3
 * ==========================================================
 */
(function() {
    if (window.CentralChatbotInitialized) return;
    window.CentralChatbotInitialized = true;

    const API_BASE_URL = "https://chatbot-central-api.onrender.com"; 

    window.initCentralChatbot = function(config) {
        const siteId = config.site_id || 's-wing';
        const siteName = config.site_name || 'Support Hub';
        
        // Luồng logic phối màu tự động theo Brand (Đồng bộ cấu hình Widget Studio)
        let primaryColor = "#0B2F61"; // Navy mặc định cho S-Wing
        if (siteId === 'c-wing') primaryColor = "#1A5276"; // Xanh sáng C-Wing
        if (siteId === 'cansuke') primaryColor = "#E67E22"; // Cam đậm Cansuke
        if (siteId === 'account') primaryColor = "#27AE60"; // Xanh lá Account Soft

        // Bơm mã CSS vào trang Head
        const style = document.createElement('style');
        style.innerHTML = `
            #faq-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: 'Meiryo', Arial, sans-serif; }
            #faq-launcher-btn { background: ${primaryColor}; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.25); transition: transform 0.2s; }
            #faq-launcher-btn:hover { transform: scale(1.05); }
            #faq-launcher-btn svg { width: 28px; height: 28px; fill: white; }
            #faq-chatbox { width: 360px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 5px 25px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; position: absolute; bottom: 75px; right: 0; }
            #faq-header { background: ${primaryColor}; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
            #faq-close-btn { cursor: pointer; font-size: 20px; }
            #faq-body { flex: 1; padding: 15px; overflow-y: auto; background: #F7F9FA; display: flex; flex-direction: column; gap: 10px; }
            .msg-bubble { max-width: 80%; padding: 10px 14px; border-radius: 8px; font-size: 13.5px; line-height: 1.5; word-wrap: break-word; }
            .msg-bot { background: white; color: #333; align-self: flex-start; border: 1px solid #E2E8F0; }
            .msg-user { background: ${primaryColor}; color: white; align-self: flex-end; }
            .msg-link-btn { display: inline-block; margin-top: 8px; padding: 6px 12px; background: white; border: 1px solid ${primaryColor}; color: ${primaryColor}; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .msg-link-btn:hover { background: ${primaryColor}; color: white; }
            #faq-suggested-hub { padding: 10px; background: white; border-top: 1px solid #E2E8F0; display: flex; flex-wrap: wrap; gap: 6px; }
            .suggest-btn { padding: 6px 12px; background: #EDF2F7; border: none; border-radius: 15px; font-size: 12px; cursor: pointer; color: #4A5568; }
            .suggest-btn:hover { background: #E2E8F0; }
            #faq-input-area { display: flex; border-top: 1px solid #E2E8F0; }
            #faq-input-field { flex: 1; border: none; padding: 15px; font-size: 13.5px; outline: none; }
            #faq-send-btn { border: none; background: white; color: ${primaryColor}; padding: 0 20px; font-weight: bold; cursor: pointer; }
        `;
        document.head.appendChild(style);

        // Tạo cây cấu trúc DOM cho Widget bong bóng chat
        const container = document.createElement('div');
        container.id = 'faq-widget-container';
        container.innerHTML = `
            <div id="faq-chatbox">
                <div id="faq-header"><span>${siteName}</span><span id="faq-close-btn">&times;</span></div>
                <div id="faq-body">
                    <div class="msg-bubble msg-bot">Xin chào! Hệ thống trợ giúp tự động xin kính chào quý khách. Vui lòng nhập từ khóa câu hỏi hoặc chọn các danh mục gợi ý bên dưới.</div>
                </div>
                <div id="faq-suggested-hub"></div>
                <div id="faq-input-area">
                    <input type="text" id="faq-input-field" placeholder="Nhập câu hỏi tìm kiếm..." autocomplete="off">
                    <button id="faq-send-btn">Gửi</button>
                </div>
            </div>
            <div id="faq-launcher-btn">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
            </div>
        `;
        document.body.appendChild(container);

        const chatbox = document.getElementById('faq-chatbox');
        const launcherBtn = document.getElementById('faq-launcher-btn');
        const closeBtn = document.getElementById('faq-close-btn');
        const sendBtn = document.getElementById('faq-send-btn');
        const inputField = document.getElementById('faq-input-field');
        const body = document.getElementById('faq-body');
        const suggestedHub = document.getElementById('faq-suggested-hub');

        launcherBtn.onclick = () => { chatbox.style.display = chatbox.style.display === 'flex' ? 'none' : 'flex'; };
        closeBtn.onclick = () => { chatbox.style.display = 'none'; };

        // Đổ danh mục gợi ý tự động từ API trung tâm
        fetch(`${API_BASE_URL}/api/v1/categories?site_id=${siteId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.categories.length > 0) {
                    data.categories.forEach(cat => {
                        const btn = document.createElement('button');
                        btn.className = 'suggest-btn';
                        btn.innerText = cat;
                        btn.onclick = () => {
                            appendMessage('user', cat);
                            processSendMessage(cat);
                        };
                        suggestedHub.appendChild(btn);
                    });
                }
            }).catch(err => console.error("Lỗi lấy danh mục gợi ý:", err));

        function appendMessage(sender, text, redirectUrl = null) {
            const bubble = document.createElement('div');
            bubble.className = `msg-bubble msg-${sender}`;
            bubble.innerText = text;

            if (redirectUrl) {
                const linkBtn = document.createElement('a');
                linkBtn.className = 'msg-link-btn';
                linkBtn.href = redirectUrl;
                linkBtn.target = '_blank';
                linkBtn.innerText = '👉 Nhấp xem chi tiết trang gốc';
                bubble.appendChild(linkBtn);
            }
            body.appendChild(bubble);
            body.scrollTop = body.scrollHeight;
        }

        function processSendMessage(messageText) {
            if (!messageText.trim()) return;

            fetch(`${API_BASE_URL}/api/v1/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ site_id: siteId, message: messageText })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    appendMessage('bot', data.answer, data.redirect_url);
                } else {
                    appendMessage('bot', 'Hệ thống đang quá tải, vui lòng thử lại sau!');
                }
            }).catch(() => appendMessage('bot', 'Không thể kết nối máy chủ trung tâm. Hãy kiểm tra mạng!'));
        }

        sendBtn.onclick = () => {
            const txt = inputField.value;
            if(!txt.trim()) return;
            appendMessage('user', txt);
            inputField.value = '';
            processSendMessage(txt);
        };

        inputField.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const txt = inputField.value;
                if(!txt.trim()) return;
                appendMessage('user', txt);
                inputField.value = '';
                processSendMessage(txt);
            }
        };
    };
})();
