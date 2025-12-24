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
    const encodedUrl = encodeURIComponent(originUrl);
    return `https://shope.ee/an_redir?origin_link=${encodedUrl}&affiliate_id=${AFFILIATE_ID}`;
}

app.get('/api/deals', async (req, res) => {
    try {
        console.log("Đang lấy dữ liệu sạch từ nguồn gốc...");
        const rawResponse = await axios.get('https://addlivetag.com/api/data_dealxk.php');
        const products = rawResponse.data;
        const processedProducts = products.map(item => ({
            ...item,
            link: createUniversalLink(item.link) 
        }));

        console.log(`Đã xử lý xong ${processedProducts.length} sản phẩm sạch.`);
        res.json(processedProducts);
    } catch (err) {
        console.error("Lỗi:", err.message);
        res.status(500).json({ error: "Lỗi Server" });
    }
});

// Thêm route trang chủ để tránh lỗi "Cannot GET /" trên Render
app.get('/', (req, res) => {
    res.send('API "HÔM NAY CÓ SALE KHÔNG?" đang hoạt động ổn định!');
});

app.listen(port, () => console.log(`Server chạy tại: http://localhost:${port}`));
