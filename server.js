const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // BẮT BUỘC: Để server đọc được dữ liệu từ nút Copy

const port = process.env.PORT || 3000;

// THÔNG TIN CẤU HÌNH
const APP_ID = '17301060084'; 
const API_SECRET = '2OI7GNRRDK7VDMZRU3AYQ7RPPAPN4VBK'; 
const AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17301060084';
const GRAPHQL_ENDPOINT = 'https://open-api.affiliate.shopee.vn/graphql';

// BỘ NHỚ ĐỆM ĐỂ TRA CỨU
let urlMapping = {}; // Lưu trữ: Link an_redir -> Link sạch từ API gốc
let linkCache = {};  // Lưu trữ: Link sạch -> Link s.shopee.vn rút gọn

function createUniversalLink(originUrl) {
    const encodedUrl = encodeURIComponent(originUrl);
    return `https://shope.ee/an_redir?origin_link=${encodedUrl}&affiliate_id=${AFFILIATE_ID}&sub_id=websitedeal1k`;
}

// 1. API LẤY DEALS & NẠP DỮ LIỆU VÀO BẢN ĐỒ
app.get('/api/deals', async (req, res) => {
    try {
        const rawResponse = await axios.get('https://addlivetag.com/api/data_dealxk.php', {
            headers: { 'Referer': 'https://homnaycosalekhong.com/', 'Origin': 'https://homnaycosalekhong.com/' }
        });
        const products = rawResponse.data;
        
        products.forEach(item => {
            const longLink = createUniversalLink(item.link);
            // Ý TƯỞNG CỦA KHA: Tra cứu ngược về API gốc để lấy link sạch
            urlMapping[longLink] = item.link.split('?')[0]; 
        });

        const processedProducts = products.map(item => ({
            ...item,
            link: createUniversalLink(item.link)
        }));
        res.json(processedProducts);
    } catch (err) { res.status(500).json({ error: "Lỗi Server" }); }
});

// 2. API RÚT GỌN LINK: DÙNG BẢN ĐỒ ĐỐI CHIẾU
app.post('/api/get-short-link', async (req, res) => {
    const { longUrl } = req.body;
    // Tra cứu link sạch trực tiếp từ bộ nhớ RAM
    let cleanUrl = urlMapping[longUrl] || longUrl.split('?')[0];

    if (linkCache[cleanUrl]) return res.json({ shortLink: linkCache[cleanUrl] });

    try {
        const payload = JSON.stringify({
            query: `mutation{generateShortLink(input:{originUrl:"${cleanUrl}",subIds:["websitedeal1k"]}){shortLink}}`
        });

        const timestamp = Math.floor(Date.now() / 1000);
        const factor = APP_ID + timestamp + payload + API_SECRET;
        const signature = crypto.createHash('sha256').update(factor).digest('hex');

        const response = await axios.post(GRAPHQL_ENDPOINT, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `SHA256 Credential=${APP_ID}, Timestamp=${timestamp}, Signature=${signature}`
            }
        });

        if (response.data.errors) return res.json({ shortLink: req.body.longUrl });
        const shortLink = response.data.data.generateShortLink.shortLink;
        linkCache[cleanUrl] = shortLink;
        res.json({ shortLink });
    } catch (error) { res.json({ shortLink: req.body.longUrl }); }
});

app.listen(port, () => {
    console.log(`🚀 Server Duy Kha live tại: http://localhost:${port}`);
});
