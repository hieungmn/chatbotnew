(function () {
    const currentUrl = window.location.href.toLowerCase();
    
    let autoSiteId = 's-wing';
    let autoSiteName = 'S-Wing Học Đường';
    let themeColor = '#0B2F61'; 

    if (currentUrl.includes('cansuke') || currentUrl.includes('support')) {
        autoSiteId = 'cansuke'; autoSiteName = 'Cansuke Support'; themeColor = '#E67E22'; 
    } else if (currentUrl.includes('c-wing') || currentUrl.includes('community')) {
        autoSiteId = 'c-wing'; autoSiteName = 'C-Wing Community'; themeColor = '#1A5276'; 
    } else if (currentUrl.includes('account') || currentUrl.includes('business')) {
        autoSiteId = 'account-business'; autoSiteName = 'Account Business'; themeColor = '#27AE60'; 
    }

    const apiBaseUrl = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;

    window.initCentralChatbot = function (config) {
        const existingWidget = document.getElementById('central-chat-widget');
        const finalSiteId = (config && config.site_id) ? String(config.site_id).trim().toLowerCase() : autoSiteId;
        const finalSiteName = (config && config.site_name) ? config.site_name : autoSiteName;

        if (config && config.site_id) {
            const cId = String(config.site_id).trim().toLowerCase();
            if (cId === 'cansuke') themeColor = '#E67E22';
            else if (cId === 'c-wing') themeColor = '#1A5276';
            else if (cId === 'account' || cId === 'account-business') themeColor = '#27AE60';
            else if (cId === 's-wing') themeColor = '#0B2F61';
        }

        let style = document.getElementById('central-chat-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'central-chat-style';
            document.head.appendChild(style);
        }

        style.innerHTML = `
            #central-chat-widget { --theme: ${themeColor}; position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; color: #1E293B; }
            #chat-launcher { width: 56px; height: 56px; background: var(--theme); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.15); transition: transform 0.2s ease; }
            #chat-launcher:hover { transform: scale(1.05); }
            #chat-box { width: 380px; height: 580px; background: white; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.12); display: none; flex-direction: column; position: absolute; bottom: 72px; right: 0; overflow: hidden; animation: chatFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid #E2E8F0; }
            @keyframes chatFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            #chat-header { background: #F8FAFC; color: var(--text-dark); padding: 16px 20px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; }
            #chat-close { cursor: pointer; font-size: 20px; color: #64748B; opacity: 0.8; transition: opacity 0.2s; }
            #chat-body { flex: 1; padding: 20px; overflow-y: auto; background: #FFFFFF; display: flex; flex-direction: column; gap: 12px; }
            
            .msg { padding: 12px 16px; line-height: 1.5; max-width: 85%; word-break: break-word; }
            .msg.bot { background: #F8FAFC; color: #1E293B; align-self: flex-start; border-radius: 4px 16px 16px 16px; border: 1px solid #E2E8F0; }
            .msg.user { background: var(--theme); color: white; align-self: flex-end; border-radius: 16px 16px 4px 16px; }
            
            .inline-chips-area { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start; padding-top: 4px; padding-bottom: 8px; }
            .suggest-chip { background: transparent; color: var(--theme); padding: 8px 16px; border-radius: 20px; font-size: 13px; cursor: pointer; font-weight: 500; border: 1px solid var(--theme); transition: all 0.2s; white-space: nowrap; }
            .suggest-chip:hover { background: rgba(59, 130, 246, 0.05); }

            /* Nút hiển thị Form nằm ngay trong tin nhắn của Bot */
            .inquiry-trigger-btn { background: #FFFFFF; color: var(--theme); border: 1px solid var(--theme); padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 10px; transition: all 0.2s; display: block; }
            .inquiry-trigger-btn:hover { background: var(--theme); color: white; }

            /* CSS CHUẨN CHO FORM NHÚNG (Có nút Gửi/Hủy) */
            .embedded-form-container { display: flex; flex-direction: column; width: 95%; align-self: flex-start; margin-top: 4px; }
            .embedded-form { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
            .embedded-form-title { font-weight: 600; margin-bottom: 4px; font-size: 14px; color: #1E293B; }
            .form-label { font-size: 12px; font-weight: 600; display: flex; align-items: center; margin-bottom: 6px; color: #334155; margin-top: 10px;}
            .req-mark { color: white; background: #EF4444; font-size: 10px; padding: 2px 5px; border-radius: 4px; margin-left: 6px; font-weight: 600; letter-spacing: 0.5px;}
            .embedded-form input, .embedded-form textarea { width: 100%; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px; font-size: 13px; outline: none; margin-bottom: 4px; font-family: inherit; box-sizing: border-box; background: white; transition: border 0.2s;}
            .embedded-form input:focus, .embedded-form textarea:focus { border-color: var(--theme); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
            .embedded-form textarea { resize: none; }
            
            /* Khu vực chứa nút Gửi và Hủy */
            .form-actions { display: flex; gap: 8px; margin-top: 12px; }
            .btn-submit { background: var(--theme); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; flex: 1; transition: opacity 0.2s; }
            .btn-cancel { background: #E2E8F0; color: #475569; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; flex: 1; transition: background 0.2s; }
            .btn-submit:hover { opacity: 0.9; }
            .btn-cancel:hover { background: #CBD5E1; }
            
            .form-success-msg { background: #DCFCE7; border: 1px solid #BBF7D0; color: #15803D; padding: 16px; border-radius: 8px; text-align: center; font-size: 14px; font-weight: 600; line-height: 1.5; }

            #chat-footer { border-top: 1px solid #E2E8F0; padding: 12px 16px; display: flex; align-items: center; background: white; gap: 8px; }
            #chat-input { flex: 1; border: none; padding: 10px; outline: none; background: transparent; font-size: 14px; }
            #chat-input::placeholder { color: #94A3B8; }
            #chat-send { background: var(--theme); color: white; border: none; padding: 10px 18px; border-radius: 20px; cursor: pointer; font-weight: 600; transition: opacity 0.2s; font-size: 14px; }
            #chat-send:hover { opacity: 0.9; }
            .chat-link { display: inline-block; margin-top: 6px; color: var(--theme); font-weight: 600; text-decoration: underline; }
        `;

        if (!existingWidget) {
            const widgetContainer = document.createElement('div');
            widgetContainer.id = 'central-chat-widget';
            widgetContainer.innerHTML = `
                <div id="chat-launcher" title="Hỗ trợ trực tuyến">💬</div>
                <div id="chat-box">
                    <div id="chat-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 32px; height: 32px; background: var(--theme); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">🤖</div>
                            <span id="chat-header-title">${finalSiteName}</span>
                        </div>
                        <span id="chat-close">✖</span>
                    </div>
                    <div id="chat-body">
                        <div class="msg bot" id="chat-welcome-msg">
                            Xin chào! Dưới đây là các chủ đề đang được quan tâm nhất tại <b>${finalSiteName}</b>. Bạn có thể chọn hoặc nhập câu hỏi bên dưới nhé:
                        </div>
                        <div class="inline-chips-area" id="chat-chips-container"></div>
                    </div>
                    <div id="chat-footer">
                        <input type="text" id="chat-input" placeholder="Nhập câu hỏi của bạn...">
                        <button id="chat-send">送信</button>
                    </div>
                </div>
            `;
            document.body.appendChild(widgetContainer);

            const launcher = document.getElementById('chat-launcher');
            const chatBox = document.getElementById('chat-box');
            const closeBtn = document.getElementById('chat-close');
            const sendBtn = document.getElementById('chat-send');
            const inputField = document.getElementById('chat-input');

            launcher.onclick = () => { chatBox.style.display = 'flex'; launcher.style.display = 'none'; inputField.focus(); };
            closeBtn.onclick = () => { chatBox.style.display = 'none'; launcher.style.display = 'flex'; };
            sendBtn.onclick = () => handleSendMessage();
            inputField.onkeypress = (e) => { if (e.key === 'Enter') handleSendMessage(); };
        } else {
            document.getElementById('chat-header-title').innerText = finalSiteName;
            document.getElementById('chat-welcome-msg').innerHTML = `Xin chào! Dưới đây là các chủ đề đang được quan tâm nhất tại <b>${finalSiteName}</b>. Bạn có thể chọn hoặc nhập câu hỏi bên dưới nhé:`;
        }

        const chatBody = document.getElementById('chat-body');
        const inputField = document.getElementById('chat-input');
        const chipsContainer = document.getElementById('chat-chips-container');
        chipsContainer.innerHTML = '';

        function handleSendMessage(forcedText) {
            const text = typeof forcedText === 'string' ? forcedText.trim() : inputField.value.trim();
            if (!text) return;

            appendMessage(text, 'user');
            if (typeof forcedText !== 'string') inputField.value = '';

            fetch(`${apiBaseUrl}/api/v1/chatbot/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ site_id: finalSiteId, message: text })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    let botReply = data.answer;
                    if (data.redirect_url) {
                        botReply += `<br><a class="chat-link" href="${data.redirect_url}" target="_blank">Chi tiết</a>`;
                    }
                    // Bổ sung flag 'needs_form' để render nút Mở Form
                    appendMessage(botReply, 'bot', data.needs_form);
                }
            });
        }

        // Cập nhật hàm appendMessage để tự chèn nút "お問い合わせ" nếu cần
        function appendMessage(htmlContent, sender, needsForm = false) {
            const div = document.createElement('div');
            div.className = `msg ${sender}`;
            
            if (needsForm && sender === 'bot') {
                const uniqueId = Date.now();
                // Chèn câu xin lỗi và thêm Nút bấm ở dưới cùng của khung chat bot
                div.innerHTML = htmlContent + `<button id="inq-trigger-${uniqueId}" class="inquiry-trigger-btn">お問い合わせ (Liên hệ hỗ trợ)</button>`;
                chatBody.appendChild(div);
                
                // Kích hoạt sự kiện bấm vào nút này sẽ ẩn nút và vẽ Form ra
                setTimeout(() => {
                    const triggerBtn = document.getElementById(`inq-trigger-${uniqueId}`);
                    if (triggerBtn) {
                        triggerBtn.onclick = () => {
                            triggerBtn.style.display = 'none'; 
                            renderEmbeddedForm();
                        };
                    }
                }, 0);
            } else {
                div.innerHTML = htmlContent;
                chatBody.appendChild(div);
            }
            
            chatBody.scrollTop = chatBody.scrollHeight;
        }

        // 👉 HÀM RENDER FORM TIẾNG NHẬT CÓ NÚT HỦY (CANCEL)
        function renderEmbeddedForm() {
            const formContainer = document.createElement('div');
            formContainer.className = 'embedded-form-container';
            const uniqueId = Date.now(); 
            
            formContainer.innerHTML = `
                <div class="embedded-form" id="form-box-${uniqueId}">
                    <div class="embedded-form-title">フォームからのお問い合わせ</div>
                    <div style="font-size: 12px; color: #64748B; margin-bottom: 10px;">お問い合わせ内容をご入力ください。</div>

                    <label class="form-label">貴社名・部署名</label>
                    <input type="text" id="f-company-${uniqueId}" placeholder="例: 株式会社〇〇">

                    <label class="form-label">お名前 <span class="req-mark">必須</span></label>
                    <input type="text" id="f-name-${uniqueId}" placeholder="例: 山田 太郎">

                    <label class="form-label">メールアドレス <span class="req-mark">必須</span></label>
                    <input type="email" id="f-email-${uniqueId}" placeholder="example@domain.com">

                    <label class="form-label">お問い合わせ内容 <span class="req-mark">必須</span></label>
                    <textarea id="f-question-${uniqueId}" rows="3" placeholder="ご質問内容を入力してください..."></textarea>
                    
                    <div class="form-actions">
                        <button class="btn-cancel" id="form-cancel-${uniqueId}">キャンセル</button>
                        <button class="btn-submit" id="form-btn-${uniqueId}">送信</button>
                    </div>
                </div>
            `;
            
            chatBody.appendChild(formContainer);
            chatBody.scrollTop = chatBody.scrollHeight;

            const btnSubmit = document.getElementById(`form-btn-${uniqueId}`);
            const btnCancel = document.getElementById(`form-cancel-${uniqueId}`);
            const iCompany = document.getElementById(`f-company-${uniqueId}`);
            const iName = document.getElementById(`f-name-${uniqueId}`);
            const iEmail = document.getElementById(`f-email-${uniqueId}`);
            const iQuestion = document.getElementById(`f-question-${uniqueId}`);
            const formBox = document.getElementById(`form-box-${uniqueId}`);

            // Logic khi bấm HỦY (Xóa form khỏi màn hình)
            btnCancel.onclick = () => {
                formContainer.remove();
            };

            // Logic khi bấm GỬI
            btnSubmit.onclick = () => {
                const comp = iCompany.value.trim();
                const name = iName.value.trim();
                const email = iEmail.value.trim();
                const quest = iQuestion.value.trim();

                if (!name) { iName.style.borderColor = '#EF4444'; iName.focus(); return; } else { iName.style.borderColor = '#CBD5E1'; }
                if (!email) { iEmail.style.borderColor = '#EF4444'; iEmail.focus(); return; } else { iEmail.style.borderColor = '#CBD5E1'; }
                if (!quest) { iQuestion.style.borderColor = '#EF4444'; iQuestion.focus(); return; } else { iQuestion.style.borderColor = '#CBD5E1'; }

                btnSubmit.disabled = true;
                btnSubmit.innerText = '送信中...'; // Đang gửi
                btnCancel.disabled = true;
                [iCompany, iName, iEmail, iQuestion].forEach(el => el.disabled = true);

                fetch(`${apiBaseUrl}/api/v1/chatbot/submit_ticket`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ site_id: finalSiteId, company_name: comp, customer_name: name, customer_email: email, question: quest })
                })
                .then(res => res.json())
                .then(resData => {
                    if (resData.success) {
                        formBox.innerHTML = `
                            <div class="form-success-msg">
                                ✅ 送信完了<br>
                                <span style="font-size: 13px; font-weight: normal; color: #16A34A; margin-top: 6px; display: inline-block;">お問い合わせを受け付けました。<br>担当者からの連絡をお待ちください。</span>
                            </div>
                        `;
                    }
                })
                .catch(() => {
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = 'エラー (Thử lại)';
                    btnCancel.disabled = false;
                    [iCompany, iName, iEmail, iQuestion].forEach(el => el.disabled = false);
                });
            };
        }

        fetch(`${apiBaseUrl}/api/v1/chatbot/suggestions?site_id=${finalSiteId}`)
            .then(res => res.json())
            .then(data => {
                chipsContainer.innerHTML = ''; 
                if (data.success && data.chips && data.chips.length > 0) {
                    data.chips.forEach(chip => {
                        const chipEl = document.createElement('button');
                        chipEl.className = 'suggest-chip';
                        chipEl.innerText = chip.chip_label;
                        chipEl.onclick = () => handleSendMessage(chip.chip_label);
                        chipsContainer.appendChild(chipEl);
                    });
                }
            })
            .catch(() => {
                chipsContainer.innerHTML = '';
            });
    };

    window.initCentralChatbot();
})();
