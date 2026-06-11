-- ==========================================================
-- LƯỢC ĐỒ CƠ SỞ DỮ LIỆU POSTGRESQL (PHASE 1 - AI-READY BASE)
-- Hệ thống FAQ tập trung phân phối đa Website 
-- Định hướng tối giản gộp chung nghiệp vụ vào 3 Màn hình Admin CMS
-- ==========================================================

-- 1. Bảng dữ liệu FAQ Master (Kho lưu trữ tập trung của cả 4 Website)
CREATE TABLE IF NOT EXISTS faq_master (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL,        -- 's-wing', 'c-wing', 'cansuke', 'account'
    data_id VARCHAR(100) UNIQUE NOT NULL, -- Định danh dòng dữ liệu phục vụ sửa CRUD tay và kiểm tra trùng lặp
    category VARCHAR(150) NOT NULL,     -- Phân loại lớn (Dùng làm nút bấm gợi ý tự động)
    keywords TEXT NOT NULL,              -- Chuỗi từ khóa cách nhau bằng dấu phẩy phục vụ thuật toán so khớp ILIKE
    answer_text TEXT NOT NULL,           -- Nội dung câu trả lời cố định chính xác bằng tiếng Nhật (です・ます調)
    redirect_url TEXT,                   -- Link điều hướng trang đích (Bắt đầu bằng http:// hoặc https://)
    reference_note TEXT,
    ai_context TEXT,                     -- CỘT CẤU TRÚC MỞ: Lưu ngữ cảnh nghiệp vụ chờ Phase 2 kích hoạt AI RAG
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cấu hình bộ chỉ mục複合 (Compound Index) để tăng tốc truy vấn tìm kiếm từ khóa theo từng site độc lập
CREATE INDEX IF NOT EXISTS idx_faq_site_keywords ON faq_master(site_id, keywords);


-- 2. Bảng bẫy dữ liệu từ khóa khách tra cứu trượt (Nguồn cấp dữ liệu cho MÀN HÌNH 2)
CREATE TABLE IF NOT EXISTS search_miss_logs (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL,
    keyword_missed TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);


-- 3. Bảng lưu vết lịch sử kiểm toán thao tác của nhân viên (Gộp vào MÀN HÌNH 2)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id SERIAL PRIMARY KEY,
    staff_email VARCHAR(150) NOT NULL,   -- Danh tính nhân viên thực hiện thao tác
    action_type VARCHAR(100) NOT NULL,   -- 'SYNC_FAQ_DATA', 'DELETE_ROW', 'UPDATE_STUDIO'
    target_site VARCHAR(50),             -- Website bị tác động
    details TEXT,                        -- Nội dung mô tả hành vi chi tiết
    performed_at TIMESTAMP DEFAULT NOW()
);
