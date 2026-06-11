const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./db'); 

const app = express();
const PORT = 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

app.get('/widget_embed.js', (req, res) => {
    const filePath = path.join(__dirname, 'widget_embed.js');
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.sendFile(filePath);
    } else {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(404).send("Error: File 'widget_embed.js' không tồn tại!");
    }
});

// Khởi tạo Database
const initDb = async () => {
    let client;
    try {
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS faq_master (
                id SERIAL PRIMARY KEY,
                site_id VARCHAR(50) NOT NULL,
                data_id VARCHAR(100) UNIQUE NOT NULL,
                category VARCHAR(100),
                keywords TEXT,
                answer_text TEXT NOT NULL,
                redirect_url TEXT,
                ai_context TEXT,
                hit_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await client.query(`ALTER TABLE faq_master ADD COLUMN IF NOT EXISTS hit_count INT DEFAULT 0;`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS search_miss_logs (
                id SERIAL PRIMARY KEY,
                site_id VARCHAR(50) NOT NULL,
                keyword VARCHAR(255) NOT NULL,
                hit_count INT DEFAULT 1,
                last_searched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_site_keyword UNIQUE (site_id, keyword)
            );
        `);

        // BẢNG CHỨA CÂU HỎI TỪ KHÁCH HÀNG
        await client.query(`
            CREATE TABLE IF NOT EXISTS customer_tickets (
                id SERIAL PRIMARY KEY,
                site_id VARCHAR(50) NOT NULL,
                question TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'Chờ xử lý',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Bổ sung các cột thông tin khách hàng
        await client.query(`ALTER TABLE customer_tickets ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`);
        await client.query(`ALTER TABLE customer_tickets ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);`);
        await client.query(`ALTER TABLE customer_tickets ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);`);
        
        console.log('✅ Hệ thống Database Postgres đã khởi tạo thành công!');
    } catch (err) {
        console.error('❌ Lỗi DB:', err.message);
    } finally {
        if (client) client.release();
    }
};
initDb();

// API ĐỒNG BỘ TỪ ADMIN EXCEL
app.post('/api/v1/admin/faq/sync', async (req, res) => {
    let client;
    try {
        const { site_id, faq_list } = req.body;
        if (!site_id || !Array.isArray(faq_list) || faq_list.length === 0) {
            return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ!" });
        }

        client = await pool.connect();
        await client.query('BEGIN');

        const insertQuery = `
            INSERT INTO faq_master (site_id, data_id, category, keywords, answer_text, redirect_url, ai_context, hit_count)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
            ON CONFLICT (data_id) DO UPDATE SET 
                site_id = EXCLUDED.site_id, category = EXCLUDED.category, keywords = EXCLUDED.keywords,
                answer_text = EXCLUDED.answer_text, redirect_url = EXCLUDED.redirect_url, ai_context = EXCLUDED.ai_context;
        `;

        if (site_id === 'auto') {
            const siteMap = { 's-wing': [], 'c-wing': [], 'cansuke': [], 'account-business': [] };
            for (const item of faq_list) {
                if (!item.data_id || !item.answer_text) continue;
                const idUpper = String(item.data_id).trim().toUpperCase();
                let targetSite = 's-wing'; 
                if (idUpper.includes('SW')) targetSite = 's-wing';
                else if (idUpper.includes('CW')) targetSite = 'c-wing';
                else if (idUpper.includes('CS') || idUpper.includes('CANSUKE')) targetSite = 'cansuke';
                else if (idUpper.includes('AB') || idUpper.includes('ACCOUNT')) targetSite = 'account-business';
                siteMap[targetSite].push(item);
            }

            for (const [sId, items] of Object.entries(siteMap)) {
                if (items.length > 0) {
                    await client.query('DELETE FROM faq_master WHERE LOWER(site_id) = $1', [sId]);
                    for (const item of items) {
                        const uniqueDataId = `${sId.toUpperCase()}_${String(item.data_id).trim().toUpperCase()}`;
                        await client.query(insertQuery, [
                            sId, uniqueDataId, item.category ? String(item.category).trim() : 'Chung',
                            item.keywords ? String(item.keywords).trim().toLowerCase() : '',
                            String(item.answer_text).trim(),
                            item.redirect_url ? String(item.redirect_url).trim() : null,
                            item.ai_context ? String(item.ai_context).trim() : null
                        ]);
                    }
                }
            }
        } else {
            const cleanSiteId = String(site_id).trim().toLowerCase();
            await client.query('DELETE FROM faq_master WHERE LOWER(site_id) = $1', [cleanSiteId]);
            for (const item of faq_list) {
                if (!item.data_id || !item.answer_text) continue;
                const uniqueDataId = `${cleanSiteId.toUpperCase()}_${String(item.data_id).trim().toUpperCase()}`;
                await client.query(insertQuery, [
                    cleanSiteId, uniqueDataId, item.category ? String(item.category).trim() : 'Chung',
                    item.keywords ? String(item.keywords).trim().toLowerCase() : '',
                    String(item.answer_text).trim(),
                    item.redirect_url ? String(item.redirect_url).trim() : null,
                    item.ai_context ? String(item.ai_context).trim() : null
                ]);
            }
        }

        await client.query('COMMIT');
        return res.json({ success: true, message: "Đồng bộ dữ liệu thành công!" });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        return res.status(500).json({ success: false, message: "Lỗi kết nối Server: " + error.message });
    } finally {
        if (client) client.release();
    }
});

// API GỢI Ý TOP 5
app.get('/api/v1/chatbot/suggestions', async (req, res) => {
    try {
        const siteId = String(req.query.site_id || '').trim().toLowerCase();
        const resDb = await pool.query(
            `SELECT category FROM faq_master 
             WHERE LOWER(site_id) = $1 AND category IS NOT NULL AND category != '' AND LOWER(category) != 'chung'
             GROUP BY category
             ORDER BY SUM(hit_count) DESC, category ASC
             LIMIT 5;`,
            [siteId]
        );
        return res.json({ success: true, chips: resDb.rows.map(row => ({ chip_label: row.category })) });
    } catch (error) {
        return res.status(500).json({ success: false, chips: [] });
    }
});

// API CHATBOT TÌM KIẾM CÂU TRẢ LỜI
app.post('/api/v1/chatbot/query', async (req, res) => {
    try {
        const { site_id, message } = req.body;
        if (!site_id || !message) return res.status(400).json({ success: false, message: "Thiếu tham số!" });

        const cleanSiteId = String(site_id).trim().toLowerCase();
        const cleanMsg = String(message).trim().toLowerCase();
        const fallbackMsg = "申し訳ございません。該当する質問が見つかりませんでした。";

        if (cleanMsg.length < 2) {
            return res.json({ success: true, answer: fallbackMsg, needs_form: true });
        }

        const querySearch = `
            SELECT id, answer_text, redirect_url FROM faq_master 
            WHERE LOWER(site_id) = $1 AND (
                LOWER(category) = $2 OR LOWER(keywords) = $2 OR
                (LENGTH($2) >= 3 AND POSITION(LOWER(keywords) IN $2) > 0) OR
                (LENGTH($2) >= 3 AND POSITION($2 IN LOWER(keywords)) > 0)
            ) LIMIT 1;
        `;
        const resDb = await pool.query(querySearch, [cleanSiteId, cleanMsg]);

        if (resDb.rows.length > 0) {
            pool.query(`UPDATE faq_master SET hit_count = hit_count + 1 WHERE id = $1`, [resDb.rows[0].id]).catch(e => console.error(e));
            return res.json({ success: true, answer: resDb.rows[0].answer_text, redirect_url: resDb.rows[0].redirect_url });
        } else {
            await pool.query(
                `INSERT INTO search_miss_logs (site_id, keyword, hit_count, last_searched) VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
                 ON CONFLICT (site_id, keyword) DO UPDATE SET hit_count = search_miss_logs.hit_count + 1, last_searched = CURRENT_TIMESTAMP;`,
                [cleanSiteId, cleanMsg]
            );
            return res.json({ success: true, answer: fallbackMsg, needs_form: true });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
});

// 👉 API NHẬN DATA TỪ FORM ĐIỀN TRONG CHAT
app.post('/api/v1/chatbot/submit_ticket', async (req, res) => {
    try {
        const { site_id, company_name, customer_name, customer_email, question } = req.body;
        await pool.query(
            `INSERT INTO customer_tickets (site_id, company_name, customer_name, customer_email, question) 
             VALUES ($1, $2, $3, $4, $5)`, 
            [site_id, company_name, customer_name, customer_email, question]
        );
        return res.json({ success: true, message: "送信完了" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false });
    }
});

// API ĐỌC LOGS TỪ KHÓA LỖI
app.get('/api/v1/admin/analytics', async (req, res) => {
    try {
        const resDb = await pool.query(`SELECT site_id, keyword, hit_count FROM search_miss_logs ORDER BY hit_count DESC;`);
        return res.json({ success: true, top_missed_keywords: resDb.rows.map(row => ({ site_id: row.site_id, keyword_missed: row.keyword, count: row.hit_count })) });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi CSDL!" });
    }
});

// 👉 API ĐỌC HÒM THƯ (TICKETS) CHO MÀN HÌNH ADMIN
app.get('/api/v1/admin/tickets', async (req, res) => {
    try {
        const resDb = await pool.query(
            `SELECT site_id, company_name, customer_name, customer_email, question, status, created_at 
             FROM customer_tickets ORDER BY created_at DESC;`
        );
        return res.json({ success: true, tickets: resDb.rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi CSDL!" });
    }
});

app.listen(PORT, () => { console.log(`🚀 Central API Server đang vận hành ổn định tại cổng ${PORT}`); });