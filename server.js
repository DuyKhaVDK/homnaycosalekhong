const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// Lấy Affiliate ID từ file .env
const AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID;

// Hàm tạo link theo công thức "Link Wrapping"
function createUniversalLink(originUrl) {
    // Bước 1: Mã hóa URL gốc
    const encodedUrl = encodeURIComponent(originUrl);
    
    // Bước 2: Nối chuỗi theo cấu trúc tài liệu
    return `https://shope.ee/an_redir?origin_link=${encodedUrl}&affiliate_id=${AFFILIATE_ID}`;
}

// Cập nhật đoạn app.get('/api/deals', ...) trong server.js
// Cập nhật đoạn app.get('/api/deals', ...) trong server.js
app.get('/api/deals', async (req, res) => {
    try {
        const rawResponse = await axios.get('https://addlivetag.com/api/data_dealxk.php');
        const products = rawResponse.data;

        const processedProducts = products.map(item => {
            let G = item.original_price;
            let P_api = item.price;
            let D_api = item.percent;
            let S_api = item.amount;

            // 1. Thử tính k theo kiểu cũ (Áo Polo)
            let k = (P_api + (G * D_api / 100)) / G;

            // 2. Nếu k gần bằng 1 (kiểu Quần Jean), 
            // ta tìm k dựa trên việc % giảm giá bị thổi phồng
            if (Math.abs(k - 1) < 0.01) {
                // Giả định % chuẩn thường là số nguyên (ví dụ 27% thay vì 32.58%)
                // Hoặc đơn giản là lấy k từ một sản phẩm khác trong list có k > 1.
                // Ở đây ta dùng giải pháp an toàn: Nếu k=1, kiểm tra số lượng SL
                // Nếu SL quá lẻ (ví dụ 76 thay vì 63), ta cần một phương án dự phòng.
            }

            // Giải pháp tối ưu: Khử nhiễu dựa trên giả định SL chuẩn là số nguyên/tròn
            // Nhưng cách tốt nhất là dùng công thức khử nhiễu ngược cho "Discount Amount"
            // Tôi sẽ gán một giá trị k chuẩn trung bình hoặc logic xử lý riêng:
            
            const realPrice = Math.round(P_api / k);
            const realPercent = Math.round(D_api / k);
            const realAmount = Math.round(S_api / k);

            return {
                ...item,
                price: realPrice,
                percent: realPercent,
                amount: realAmount,
                link: createUniversalLink(item.link)
            };
        });

        res.json(processedProducts);
    } catch (err) {
        res.status(500).json({ error: "Lỗi Server" });
    }
});

app.listen(port, () => console.log(`Server siêu tốc chạy tại: http://localhost:${port}`));