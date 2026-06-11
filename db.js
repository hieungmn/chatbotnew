// db.js
const { Pool } = require('pg');

// Khởi tạo một kết nối Pool tới PostgreSQL Local
const pool = new Pool({
    user: 'postgres',          // Username mặc định của pg
    host: 'localhost',         // Chạy cục bộ dưới máy
    database: 'faq_db',        // Tên database bạn vừa tạo
    password: '123456', // Thay bằng mật khẩu pgAdmin của bạn
    port: 5432,                // Cổng mặc định của PostgreSQL
});

// Kiểm tra kết nối khi khởi động server
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Lỗi kết nối PostgreSQL rồi bạn ơi:', err.stack);
    }
    console.log('✅ Đã kết nối thông suốt tới Database faq_db dưới Local!');
    release();
});

module.exports = pool;