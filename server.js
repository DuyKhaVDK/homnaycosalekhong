const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // BẮT BUỘC: Để đọc dữ liệu JSON từ yêu cầu POST

const port = process.env.PORT || 10000;

// CẤU HÌNH SHOPEE
const AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17301060084';
const APP_ID = '17301060084'; 
const API_SECRET = '2OI7GNRRDK7VDMZRU3AYQ7RPPAPN4VBK'; // Thay bằng Secret Key thật của bạn
const GRAPHQL_ENDPOINT = 'https://open-api.affiliate.shopee.vn/graphql';

// BỘ NHỚ ĐỆM (RAM)
let urlMapping = {}; // Bản đồ: Link an_redir -> Link Shopee sạch từ API gốc
let linkCache = {};  // Bản đồ: Link Shopee sạch -> Link s.shopee.vn rút gọn

function createUniversalLink(originUrl) {
    const encodedUrl = encodeURIComponent(originUrl);
    return `https://shope.ee/an_redir?origin_link=${encodedUrl}&affiliate_id=${AFFILIATE_ID}&sub_id=websitedeal1k`;
}

// 1. API LẤY DEALS & TỰ ĐỘNG NẠP DỮ LIỆU VÀO BẢN ĐỒ
app.get('/api/deals', async (req, res) => {
    try {
        const rawResponse = await axios.get('https://addlivetag.com/api/data_dealxk.php', {
            headers: {
                'Referer': 'https://homnaycosalekhong.com/',
                'Origin': 'https://homnaycosalekhong.com/'
            }
        });

        const products = rawResponse.data;
        const processedProducts = products.map(item => {
            const longLink = createUniversalLink(item.link);
            
            // Ý TƯỞNG CỦA KHA: Lưu đối chiếu ngay khi load dữ liệu
            // Cắt bỏ tracking để có link sạch nhất cho Shopee API
            urlMapping[longLink] = item.link.split('?')[0]; 

            return { ...item, link: longLink };
        });

        res.json(processedProducts);
    } catch (err) {
        console.error("Lỗi lấy dữ liệu:", err.message);
        res.status(500).json({ error: "Lỗi Server" });
    }
});

// 2. API RÚT GỌN LINK: TRA CỨU NGƯỢC TỪ BẢN ĐỒ
app.post('/api/get-short-link', async (req, res) => {
    const { longUrl } = req.body;
    console.log(">>> [NHẬN YÊU CẦU] Link:", longUrl);

    // BƯỚC A: Tra cứu link sạch trực tiếp từ API gốc đã lưu trong RAM
    let cleanUrl = urlMapping[longUrl];
    
    // Nếu không tìm thấy trong bản đồ, bóc tách dự phòng
    if (!cleanUrl) {
        if (longUrl.includes('origin_link=')) {
            const urlObj = new URL(longUrl);
            cleanUrl = decodeURIComponent(urlObj.searchParams.get('origin_link')).split('?')[0];
        } else {
            cleanUrl = longUrl.split('?')[0];
        }
    }

    if (linkCache[cleanUrl]) return res.json({ shortLink: linkCache[cleanUrl] });

    try {
        // BƯỚC B: Chuẩn bị Payload và Chữ ký
        const payload = JSON.stringify({
            query: `mutation{generateShortLink(input:{originUrl:"${cleanUrl}",subIds:["websitedeal1k"]}){shortLink}}`
        });

        const timestamp = Math.floor(Date.now() / 1000);
        const factor = APP_ID + timestamp + payload + API_SECRET;
        const signature = crypto.createHash('sha256').update(factor).digest('hex');

        // BƯỚC C: Gọi Shopee GraphQL
        const response = await axios.post(GRAPHQL_ENDPOINT, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `SHA256 Credential=${APP_ID}, Timestamp=${timestamp}, Signature=${signature}`
            }
        });

        if (response.data.errors) {
            console.error("Lỗi Shopee API:", response.data.errors[0].message);
            return res.json({ shortLink: req.body.longUrl });
        }

        const shortLink = response.data.data.generateShortLink.shortLink;
        linkCache[cleanUrl] = shortLink;
        res.json({ shortLink });

    } catch (error) {
        console.error("Lỗi hệ thống:", error.message);
        res.json({ shortLink: req.body.longUrl });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server của Duy Kha live tại: http://localhost:${port}`);
});
