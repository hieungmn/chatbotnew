// ==========================================
// CENTRALIZED FAQ PLATFORM - API SERVER (PHASE 1)
// Technology: Node.js + Express + PostgreSQL
// Architecture: Tối giản 3 Màn hình Admin Cốt lõi
// ==========================================

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Whitelist bảo mật CORS cho 4 tên miền chỉ định
const ALLOWED_DOMAINS = [
    'https://s-wing.net',
    'https://jukou-kanri.jp',
    'https://cansuke.net',
    'https://anabuki-cs.jp'
];

app.use(helmet());
app.use(express.json());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || ALLOWED_DOMAINS.some(domain => origin.startsWith(domain)) || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('❌ Đăng ký Tên miền không hợp lệ - Truy cập bị chặn bởi chính sách CORS!'));
        }
    }
}));

// Kết nối cơ sở dữ liệu PostgreSQL (AI-Ready Base)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/faq_central_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ==========================================
// THÀNH PHẦN 1: API TƯƠNG TÁC WIDGET (CLIENT-FACING CHAT)
// ==========================================

// 1. API xử lý tin nhắn và so khớp từ khóa (ILIKE)
app.post('/api/v1/chat', async (req, res) => {
    try {
        const { site_id, message } = req.body;
        if (!site_id || !message) {
            return res.status(400).json({ success: false, error: 'Thiếu site_id hoặc message!' });
        }

        const cleanMessage = message.trim().toLowerCase();

        // Thuật toán so khớp từ khóa trong database
        const queryText = `
            SELECT category, answer_text, redirect_url 
            FROM faq_master 
            WHERE site_id = $1 AND keywords ILIKE $2
            LIMIT 1
        `;
        const result = await pool.query(queryText, [site_id, `%${cleanMessage}%`]);

        if (result.rows.length > 0) {
            return res.json({
                success: true,
                type: 'static_match',
                category: result.rows[0].category,
                answer: result.rows[0].answer_text,
                redirect_url: result.rows[0].redirect_url
            });
        } else {
            // Tự động bẫy ghi log từ khóa trượt phục vụ MÀN HÌNH 2 (Analytics & Logs)
            const logQuery = `
                INSERT INTO search_miss_logs (site_id, keyword_missed, created_at)
                VALUES ($1, $2, NOW())
            `;
            await pool.query(logQuery, [site_id, cleanMessage]);

            return res.json({
                success: true,
                type: 'no_match',
                category: 'Chưa phân loại',
                answer: 'Xin lỗi, hệ thống chưa tìm thấy thông tin phù hợp cho câu hỏi của bạn. Câu hỏi đã được ghi nhận để cập nhật sớm nhất!',
                redirect_url: null
            });
        }
    } catch (err) {
        console.error('API Error:', err.message);
        return res.status(500).json({ success: false, error: 'Lỗi hệ thống nội bộ!' });
    }
});

// 2. API lấy danh mục gợi ý ban đầu đổ ra nút bấm trên Widget
app.get('/api/v1/categories', async (req, res) => {
    try {
        const { site_id } = req.query;
        if (!site_id) return res.status(400).json({ success: false, error: 'Thiếu site_id!' });

        const queryText = `SELECT DISTINCT category FROM faq_master WHERE site_id = $1 ORDER BY category ASC`;
        const result = await pool.query(queryText, [site_id]);
        return res.json({ success: true, categories: result.rows.map(row => row.category) });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// THÀNH PHẦN 2: API HỖ TRỢ VẬN HÀNH CHO 3 MÀN HÌNH ADMIN CMS
// ==========================================

// [MÀN HÌNH 1 - HUB QUẢN LÝ] API ghi đè hoặc thêm mới dữ liệu FAQ (Tích hợp từ luồng Excel/CRUD)
app.post('/api/v1/admin/faq/sync', async (req, res) => {
    const client = await pool.connect();
    try {
        const { staff_email, site_id, faq_list } = req.body; // faq_list chứa mảng các hàng dữ liệu từ Excel/CRUD tay
        
        await client.query('BEGIN');
        
        for (let faq of faq_list) {
            const queryUpsert = `
                INSERT INTO faq_master (site_id, data_id, category, keywords, answer_text, redirect_url, ai_context, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (data_id) 
                DO UPDATE SET 
                    category = EXCLUDED.category,
                    keywords = EXCLUDED.keywords,
                    answer_text = EXCLUDED.answer_text,
                    redirect_url = EXCLUDED.redirect_url,
                    ai_context = EXCLUDED.ai_context,
                    updated_at = NOW();
            `;
            await client.query(queryUpsert, [site_id, faq.data_id, faq.category, faq.keywords, faq.answer_text, faq.redirect_url, faq.ai_context]);
        }

        // Tự động ghi nhận lịch sử kiểm toán gộp vào MÀN HÌNH 2
        const queryAudit = `
            INSERT INTO admin_audit_logs (staff_email, action_type, target_site, details, performed_at)
            VALUES ($1, 'SYNC_FAQ_DATA', $2, $3, NOW())
        `;
        await client.query(queryAudit, [staff_email, site_id, `Đồng bộ hóa thành công ${faq_list.length} bản ghi FAQ.`]);
        
        await client.query('COMMIT');
        return res.json({ success: true, message: 'Đồng bộ hóa dữ liệu FAQ Master thành công!' });
    } catch (err) {
        await client.query('ROLLBACK');
        return res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

// [MÀN HÌNH 2 - ANALYTICS & LOGS] API lấy báo cáo tổng hợp từ khóa trượt và nhật ký hệ thống
app.get('/api/v1/admin/analytics', async (req, res) => {
    try {
        const missLogs = await pool.query(`SELECT site_id, keyword_missed, count(*), max(created_at) as last_time FROM search_miss_logs GROUP BY site_id, keyword_missed ORDER BY count(*) DESC LIMIT 20`);
        const auditLogs = await pool.query(`SELECT staff_email, action_type, target_site, details, performed_at FROM admin_audit_logs ORDER BY performed_at DESC LIMIT 30`);
        
        return res.json({
            success: true,
            top_missed_keywords: missLogs.rows,
            recent_audit_actions: auditLogs.rows
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Central Core API Server is running on port ${PORT}`);
});
