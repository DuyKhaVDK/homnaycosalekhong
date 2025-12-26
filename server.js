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
        // Thêm headers để "giả lập" rằng yêu cầu này đến từ domain chính thức của bạn
        const rawResponse = await axios.get('https://addlivetag.com/api/data_dealxk.php', {
            headers: {
                'Referer': 'https://homnaycosalekhong.com/',
                'Origin': 'https://homnaycosalekhong.com/'
            }
        });

        const products = rawResponse.data;

        const processedProducts = products.map(item => {
            return {
                ...item,
                link: createUniversalLink(item.link)
            };
        });

        res.json(processedProducts);
    } catch (err) {
        console.error("Lỗi lấy dữ liệu:", err.message);
        res.status(500).json({ error: "Lỗi Server" });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server sạch đã sẵn sàng tại: http://localhost:${port}`);
});
