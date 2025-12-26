const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// Lấy Affiliate ID từ file .env
const AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID;

/**
 * Hàm tạo link Shopee Affiliate có tích hợp Sub_ID để theo dõi
 * sub_id=websitedeal1k giúp bạn biết đơn hàng đến từ website này
 */
function createUniversalLink(originUrl) {
    const encodedUrl = encodeURIComponent(originUrl);
    const SUB_ID = "websitedeal1k"; 
    
    return `https://shope.ee/an_redir?origin_link=${encodedUrl}&affiliate_id=${AFFILIATE_ID}&sub_id=${SUB_ID}`;
}

app.get('/api/deals', async (req, res) => {
    try {
        // Lấy dữ liệu trực tiếp từ API gốc (Hiện tại đã là dữ liệu sạch)
        const rawResponse = await axios.get('https://addlivetag.com/api/data_dealxk.php');
        const products = rawResponse.data;

        // Chỉ cần map lại để chuyển đổi link Shopee thường thành link Affiliate
        const processedProducts = products.map(item => {
            return {
                ...item,
                // Giữ nguyên price, percent, amount vì không còn nhiễu
                link: createUniversalLink(item.link)
            };
        });

        res.json(processedProducts);
    } catch (err) {
        console.error("Lỗi lấy dữ liệu:", err.message);
        res.status(500).json({ error: "Lỗi Server không thể lấy dữ liệu deal" });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server sạch đã sẵn sàng tại: http://localhost:${port}`);
});
