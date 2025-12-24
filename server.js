const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

const AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID;
// THAY ĐỔI: Điền domain Netlify của bạn vào đây để gửi cho API nhận diện
const MY_DOMAIN = "https://ten-web-cua-ban.netlify.app"; 

function createUniversalLink(originUrl) {
    const encodedUrl = encodeURIComponent(originUrl);
    return `https://shope.ee/an_redir?origin_link=${encodedUrl}&affiliate_id=${AFFILIATE_ID}`;
}

app.get('/api/deals', async (req, res) => {
    try {
        console.log("Đang lấy dữ liệu...");
        const rawResponse = await axios.get('https://addlivetag.com/api/data_dealxk.php', {
            headers: {
                'Referer': MY_DOMAIN,
                'Origin': MY_DOMAIN
            }
        });
        const products = rawResponse.data;

        // BỘ LỌC KHỬ NHIỄU DỰ PHÒNG: 
        // Nếu API vẫn trả về số lỗi, công thức này sẽ đưa nó về chuẩn
        const processedProducts = products.map(item => {
            // Tính hệ số k: k = (Giá_API + (Giá_Gốc * %_API / 100)) / Giá_Gốc
            const k = (item.price + (item.original_price * item.percent / 100)) / item.original_price;
            
            // Nếu k khác 1 (có nhiễu), thực hiện chia cho k. Nếu k = 1 (đã sạch), giữ nguyên.
            const isNoisy = Math.abs(k - 1) > 0.001;
            const divisor = isNoisy ? k : 1;

            const cleanPercent = Math.round(item.percent / divisor);
            const cleanAmount = Math.round(item.amount / divisor);
            // Tính lại giá từ phần trăm sạch để đảm bảo khớp 100% web gốc
            const cleanPrice = Math.round(item.original_price * (1 - cleanPercent / 100));

            return {
                ...item,
                price: cleanPrice,
                percent: cleanPercent,
                amount: cleanAmount,
                link: createUniversalLink(item.link)
            };
        });

        console.log(`Đã xử lý xong ${processedProducts.length} sản phẩm.`);
        res.json(processedProducts);
    } catch (err) {
        console.error("Lỗi:", err.message);
        res.status(500).json({ error: "Lỗi Server" });
    }
});

app.get('/', (req, res) => {
    res.send('API "HÔM NAY CÓ SALE KHÔNG?" đang hoạt động!');
});

app.listen(port, () => console.log(`Server chạy tại: http://localhost:${port}`));
