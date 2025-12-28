const BASE_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname) 
                 ? 'http://localhost:3000' 
                 : 'https://homnaycosalekhong.onrender.com';
const API_URL = `${BASE_URL}/api/deals`;

let allProducts = [];
let filteredProducts = [];
let wishlist = JSON.parse(localStorage.getItem('wishlist_v1')) || [];
let isWishlistMode = false;
let currentPage = 1;
const perPage = 20;
let filters = { price: [], percent: [], stock: [], time: [], exclude: [] };
let isLoading = false;
let isResetting = false;
let confirmResolve;

async function init() {
    try {
        const res = await fetch(API_URL);
        allProducts = await res.json();
        updateWishlistCounter();
        setupFilters();
        applyFilters();
        setupInfiniteScroll();
    } catch (e) { console.error(e); }
}

// COPY MOBILE "VÀNG"
async function copyLink(url, btn) {
    const oldText = btn.innerText;
    btn.innerText = 'ĐANG LẤY...';
    btn.disabled = true;

    if (navigator.clipboard && window.ClipboardItem) {
        const copyPromise = fetch(`${BASE_URL}/api/get-short-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ longUrl: url })
        })
        .then(res => res.json())
        .then(data => data.shortLink || url);

        const item = new ClipboardItem({
            "text/plain": copyPromise.then(text => new Blob([text], { type: "text/plain" }))
        });

        navigator.clipboard.write([item]).then(() => {
            btn.innerText = 'XONG!';
            btn.classList.add('bg-emerald-600');
            finish();
        }).catch(() => handleLegacyCopy(url, btn, oldText));
    } else {
        handleLegacyCopy(url, btn, oldText);
    }

    function finish() {
        setTimeout(() => {
            btn.innerText = oldText;
            btn.classList.remove('bg-emerald-600');
            btn.disabled = false;
        }, 1500);
    }
}

function handleLegacyCopy(text, btn, oldText) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; textArea.style.left = "-9999px"; textArea.style.fontSize = '16px'; 
    document.body.appendChild(textArea);
    textArea.focus(); textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    btn.innerText = 'XONG!';
    setTimeout(() => { btn.innerText = oldText; btn.disabled = false; }, 1500);
}

// LOGIC LỌC & SẮP XẾP
function applyFilters() {
    const searchVal = (document.getElementById('searchInput').value || "").toLowerCase();
    const selectedShop = document.getElementById('shop-select').value;
    const sortSelect = document.getElementById('sort-select');
    const sortType = sortSelect.value;

    const generalFiltered = allProducts.filter(item => {
        const titleMatch = (item.title || "").toLowerCase().includes(searchVal);
        const shopMatch = (item.shop_name || "").toLowerCase().includes(searchVal);
        if (searchVal && !titleMatch && !shopMatch) return false;
        if (selectedShop && item.shop_name !== selectedShop) return false;
        if (filters.time.length > 0 && !filters.time.includes(item.sale_slot)) return false;
        
        const tier = item.price <= 2000 ? 1000 : (item.price <= 10000 ? 9000 : (item.price <= 30000 ? 29000 : 0));
        if (filters.price.length > 0 && !filters.price.includes(tier)) return false;
        if (filters.exclude.includes(tier)) return false;
        if (filters.percent.length > 0 && !filters.percent.some(p => item.percent >= p)) return false;
        if (filters.stock.length > 0 && !filters.stock.some(s => item.amount >= s)) return false;
        return true;
    });

    document.getElementById('count-all').innerText = generalFiltered.length;
    filteredProducts = isWishlistMode ? generalFiltered.filter(item => wishlist.some(w => w.link === item.link)) : generalFiltered;
    
    if (sortType === 'random') {
        filteredProducts.sort(() => Math.random() - 0.5);
        setTimeout(() => { sortSelect.value = 'default'; }, 100);
    } else if (sortType === 'price-asc') filteredProducts.sort((a, b) => a.price - b.price);
    else if (sortType === 'price-desc') filteredProducts.sort((a, b) => b.price - a.price);
    else if (sortType === 'discount-desc') filteredProducts.sort((a, b) => b.percent - a.percent);
    else if (sortType === 'sold-desc') filteredProducts.sort((a, b) => (b.sold || 0) - (a.sold || 0));

    currentPage = 1; renderUI();
}

// CẬP NHẬT GIAO DIỆN VÀ ĐẾM NGƯỢC
function renderUI() {
    const grid = document.getElementById('product-grid');
    const items = filteredProducts.slice(0, currentPage * perPage);
    if (items.length === 0 && currentPage === 1) { grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500 italic">Trống...</div>`; return; }
    
    grid.innerHTML = items.map((item, index) => {
        const isLiked = wishlist.some(w => w.link === item.link);
        return `
        <div class="product-card glass rounded-3xl overflow-hidden flex flex-col group relative transition-all" id="prod-${index}">
            <div class="relative overflow-hidden">
                <img src="${item.img}" class="w-full aspect-square object-cover transition-all group-hover:scale-110 duration-700">
                <div class="absolute top-2 left-2 flex flex-col gap-1.5">
                    <span class="bg-indigo-600/90 text-white text-[9px] font-bold px-2 py-1 rounded-lg">📅 ${item.sale_date}</span>
                    <span class="bg-slate-900/80 text-white text-[9px] font-bold px-2 py-1 rounded-lg">⚡ ${item.sale_slot}</span>
                </div>
            </div>
            <div class="p-3 md:p-4 flex flex-col flex-grow">
                <a href="${item.link}" target="_blank" class="block mb-2 group/title"><h3 class="text-[11px] md:text-xs font-semibold text-slate-200 line-clamp-2 h-9 group-hover/title:text-indigo-400 leading-snug"><span class="bg-red-500 text-white text-[9px] px-1 rounded mr-1">-${item.percent}%</span>${item.title}</h3></a>
                <div class="flex items-center gap-2 mb-3 flex-wrap">
                    <span class="text-[16px] md:text-[18px] font-extrabold text-indigo-400 leading-none">${item.price.toLocaleString()}đ</span>
                    <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">SL: ${item.amount}</span>
                    <span class="text-[9px] md:text-[10px] text-slate-500 line-through opacity-70 w-full mt-[-4px]">${item.original_price ? item.original_price.toLocaleString() + 'đ' : ''}</span>
                </div>
                <div class="relative w-full h-3.5 bg-slate-700/50 rounded-full overflow-hidden mb-4"><div class="progress-bar-fill absolute top-0 left-0 h-full transition-all duration-500"></div><div class="countdown-text absolute inset-0 flex items-center justify-center text-[8px] font-black text-white uppercase tracking-tighter">TẢI...</div></div>
                <div class="flex gap-1.5 mt-auto">
                    <a href="${item.link}" target="_blank" class="buy-btn flex-[2] bg-indigo-600 text-white text-[10px] font-bold py-2.5 rounded-xl text-center active:scale-95 truncate px-1">MUA</a>
                    <button onclick='toggleWishlist(${JSON.stringify(item).replace(/'/g, "&apos;")}, event)' class="flex-1 bg-slate-800/50 rounded-xl flex items-center justify-center ${isLiked ? 'text-pink-500' : 'text-slate-400'}"><i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart text-xs"></i></button>
                    <button onclick="copyLink('${item.link}', this)" class="flex-[2] bg-slate-800 text-slate-300 text-[10px] font-bold py-2.5 rounded-xl active:scale-95 truncate px-1">COPY</button>
                </div>
            </div>
        </div>`;
    }).join('');
    updateTimers();
}

function updateTimers() {
    const now = new Date();
    filteredProducts.slice(0, currentPage * perPage).forEach((item, index) => {
        const card = document.getElementById(`prod-${index}`); if (!card) return;
        const [d, m] = item.sale_date.split('/').map(Number); const [h, min] = item.sale_slot.split(':').map(Number);
        const saleTime = new Date(now.getFullYear(), m - 1, d, h, min);
        const isNotStarted = now < saleTime; const rem = (item.amount || 0) - (item.sold || 0);
        const textEl = card.querySelector('.countdown-text'); const barEl = card.querySelector('.progress-bar-fill');
        if (isNotStarted) {
            const diff = saleTime - now; const hh = Math.floor(diff / 3600000); const mm = Math.floor((diff % 3600000) / 60000); const ss = Math.floor((diff % 60000) / 1000);
            textEl.innerText = `SĂN GIÁ SALE SAU: ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
            barEl.style.width = "0%"; barEl.className = "progress-bar-fill absolute top-0 left-0 h-full bg-indigo-500/50";
        } else {
            if (rem <= 0) { textEl.innerText = "HẾT SALE"; barEl.style.width = "100%"; card.classList.add('brightness-[0.3]'); }
            else { textEl.innerText = rem <= 10 ? `CÒN: ${rem}` : `ĐÃ BÁN: ${item.sold || 0}`; barEl.style.width = Math.min(((item.sold || 0) / (item.amount || 1)) * 100, 100) + '%'; }
            barEl.className = "progress-bar-fill absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-600";
        }
    });
}

// CÁC HÀM TIỆN ÍCH
function toggleMultiFilter(type, val) { const idx = filters[type].indexOf(val); if (idx > -1) filters[type].splice(idx, 1); else filters[type].push(val); updateFilterUI(); applyFilters(); }
function toggleExclude(val) { const idx = filters.exclude.indexOf(val); if (idx > -1) filters.exclude.splice(idx, 1); else filters.exclude.push(val); updateFilterUI(); applyFilters(); }
function updateFilterUI() { document.querySelectorAll('.filter-chip').forEach(btn => { const { type, val, ex } = btn.dataset; const isSel = (type && filters[type].includes(type === 'time' ? val : parseInt(val))) || (ex && filters.exclude.includes(parseInt(ex))); btn.classList.toggle('active', !!isSel); }); }
function updateWishlistCounter() { document.getElementById('wishlist-count').innerText = wishlist.length; }
function toggleWishlist(item, event) { event.preventDefault(); event.stopPropagation(); const idx = wishlist.findIndex(w => w.link === item.link); if (idx > -1) wishlist.splice(idx, 1); else wishlist.push(item); localStorage.setItem('wishlist_v1', JSON.stringify(wishlist)); updateWishlistCounter(); renderUI(); }
function toggleWishlistFilter() { isWishlistMode = true; updateTabUI(); applyFilters(); }
function showAllProducts() { isWishlistMode = false; updateTabUI(); applyFilters(); }
function updateTabUI() { const allBtn = document.getElementById('all-btn'); const wishBtn = document.getElementById('wishlist-filter-btn'); if (isWishlistMode) { wishBtn.classList.add('active-wish'); allBtn.classList.replace('text-indigo-400', 'text-slate-500'); } else { wishBtn.classList.remove('active-wish'); allBtn.classList.replace('text-slate-500', 'text-indigo-400'); } }
function setupFilters() { const slots = [...new Set(allProducts.map(i => i.sale_slot))].filter(Boolean).sort(); document.getElementById('time-tags').innerHTML = slots.map(s => `<button onclick="toggleMultiFilter('time', '${s}')" class="filter-chip px-3 py-2 rounded-xl text-[10px] whitespace-nowrap" data-type="time" data-val="${s}">${s}</button>`).join(''); const shops = [...new Set(allProducts.map(i => i.shop_name))].filter(Boolean).sort(); document.getElementById('shop-select').innerHTML = '<option value="">Tất cả shop</option>' + shops.map(s => `<option value="${s}">${s}</option>`).join(''); }
function setupInfiniteScroll() { const trigger = document.getElementById('infinite-scroll-trigger'); const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && !isLoading && filteredProducts.length > currentPage * perPage) { loadMore(); } }, { threshold: 0.1 }); observer.observe(trigger); }
function loadMore() { isLoading = true; document.getElementById('infinite-scroll-trigger').style.opacity = "1"; setTimeout(() => { currentPage++; renderUI(); isLoading = false; document.getElementById('infinite-scroll-trigger').style.opacity = "0"; }, 300); }
function toggleGuide() { const modal = document.getElementById('guide-modal'); modal.classList.toggle('hidden'); modal.classList.toggle('flex'); document.body.style.overflow = modal.classList.contains('hidden') ? 'auto' : 'hidden'; }
function showConfirmModal(msg) { document.getElementById('confirm-msg').innerText = msg; const modal = document.getElementById('confirm-modal'); const box = document.getElementById('confirm-box'); modal.classList.replace('hidden', 'flex'); setTimeout(() => { box.classList.replace('scale-95', 'scale-100'); box.classList.replace('opacity-0', 'opacity-100'); }, 10); return new Promise((res) => { confirmResolve = res; }); }
function closeConfirmModal(res) { const modal = document.getElementById('confirm-modal'); modal.classList.replace('flex', 'hidden'); if (confirmResolve) confirmResolve(res); }

async function resetData() {
    if (wishlist.length > 0) { const confirmed = await showConfirmModal("Xóa toàn bộ danh sách yêu thích?"); if (!confirmed) return; wishlist = []; localStorage.removeItem('wishlist_v1'); updateWishlistCounter(); if (isWishlistMode) showAllProducts(); }
    const btn = document.querySelector('button[onclick="resetData()"]'); btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>';
    try { filters = { price: [], percent: [], stock: [], time: [], exclude: [] }; document.getElementById('searchInput').value = ''; document.getElementById('shop-select').value = ''; updateFilterUI(); await init(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    finally { setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> <span class="text-[10px]">Reset</span>'; btn.disabled = false; isResetting = false; }, 2000); }
}

setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString(); }, 1000);
setInterval(updateTimers, 1000);
init();
