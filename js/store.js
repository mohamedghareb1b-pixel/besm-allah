let cart = [];
let currentCatId = 'all';

document.addEventListener("DOMContentLoaded", async () => {
    const success = await loadData();
    if (success) {
        initStore();
    } else {
        alert("عذراً، فشل الاتصال بالسيرفر. يرجى تحديث الصفحة.");
    }
});

function initStore() {
    document.getElementById('store-name').innerText = DB.settings.storeName || 'سوق فاقوس';
    renderCategories();
    renderProductsMain('all');
    setupCartEvents();
    setupCheckoutForm();
}

// ===== CATEGORIES =====
function renderCategories() {
    const container = document.getElementById('categories-container');
    if (!container) return;
    container.innerHTML = `
        <button onclick="filterProducts('all')" class="cat-btn px-4 py-2 rounded-full font-medium whitespace-nowrap text-sm bg-green-600 text-white">
            🌟 الكل
        </button>
    `;
    DB.categories.forEach(cat => {
        container.innerHTML += `
            <button onclick="filterProducts(${cat.id})" class="cat-btn px-4 py-2 rounded-full font-medium whitespace-nowrap text-sm bg-white border text-gray-700 hover:bg-gray-50 transition">
                ${cat.icon || '📁'} ${cat.name}
            </button>
        `;
    });
}

function filterProducts(catId) {
    currentCatId = catId;
    // Update active button
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('bg-green-600', 'text-white');
        btn.classList.add('bg-white', 'text-gray-700', 'border');
    });
    event.target.classList.add('bg-green-600', 'text-white');
    event.target.classList.remove('bg-white', 'text-gray-700', 'border');
    renderProductsMain(catId);
}

// ===== PRODUCTS MAIN =====
function renderProductsMain(catId) {
    const container = document.getElementById('products-main');
    if (!container) return;
    container.innerHTML = '';

    const activeProducts = DB.products.filter(p => p.active !== false);

    if (catId !== 'all') {
        // Show filtered products in carousel
        const filtered = activeProducts.filter(p => p.cat_id == catId);
        if (filtered.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 py-12">لا توجد منتجات في هذا القسم.</p>`;
            return;
        }
        const cat = DB.categories.find(c => c.id == catId);
        container.innerHTML = `
            <h2 class="text-lg font-bold mb-3">${cat ? cat.icon + ' ' + cat.name : 'المنتجات'}</h2>
            ${buildCarousel('cat-' + catId, filtered)}
        `;
    } else {
        // Show all categories as sections
        const uncategorized = activeProducts.filter(p => !p.cat_id);

        DB.categories.forEach(cat => {
            const catProducts = activeProducts.filter(p => p.cat_id == cat.id);
            if (catProducts.length === 0) return;
            container.innerHTML += `
                <section class="mb-8">
                    <h2 class="text-lg font-bold mb-3 flex items-center gap-2">${cat.icon || '📁'} ${cat.name}</h2>
                    ${buildCarousel('cat-' + cat.id, catProducts)}
                </section>
            `;
        });

        if (uncategorized.length > 0) {
            container.innerHTML += `
                <section class="mb-8">
                    <h2 class="text-lg font-bold mb-3">🛒 منتجات أخرى</h2>
                    ${buildCarousel('cat-misc', uncategorized)}
                </section>
            `;
        }

        if (container.innerHTML === '') {
            container.innerHTML = `<p class="text-center text-gray-400 py-12">لا توجد منتجات متاحة حالياً.</p>`;
        }
    }
}

function buildCarousel(id, products) {
    const cards = products.map(p => `
        <div class="product-card bg-white rounded-xl shadow-sm border p-3 flex flex-col justify-between">
            ${p.image
                ? `<img src="${p.image}" class="w-full h-28 object-cover rounded-lg mb-2" onerror="this.style.display='none'">`
                : `<div class="text-5xl text-center py-3">${p.icon || '🛒'}</div>`
            }
            <div>
                <h3 class="font-bold text-sm text-gray-800 mb-0.5 leading-tight">${p.name}</h3>
                <p class="text-green-600 font-bold text-sm">${p.price} ج <span class="text-xs text-gray-400 font-normal">/ ${p.unit || 'كيلو'}</span></p>
            </div>
            <div class="mt-2" id="card-ctrl-${p.id}">
                <button onclick="addToCartFromCard(${p.id})" class="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg transition">
                    ➕ إضافة
                </button>
            </div>
        </div>
    `).join('');

    return `
        <div class="carousel-wrapper relative">
            <div class="carousel-track" id="track-${id}">
                ${cards}
            </div>
        </div>
    `;
}

// ===== CART FROM CARD =====
function addToCartFromCard(productId) {
    const product = DB.products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    updateCardControl(productId);
}

function updateCardControl(productId) {
    const ctrl = document.getElementById('card-ctrl-' + productId);
    if (!ctrl) return;
    const item = cart.find(i => i.id === productId);
    if (!item) {
        ctrl.innerHTML = `
            <button onclick="addToCartFromCard(${productId})" class="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg transition">
                ➕ إضافة
            </button>`;
    } else {
        ctrl.innerHTML = `
            <div class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                <button onclick="changeCardQty(${productId}, -1)" class="qty-btn text-red-500">−</button>
                <span class="qty-display text-green-700">${item.qty} ${item.unit || 'كيلو'}</span>
                <button onclick="changeCardQty(${productId}, 1)" class="qty-btn text-green-600">+</button>
            </div>`;
    }
}

function changeCardQty(productId, amt) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += amt;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== productId);
    }
    updateCartUI();
    updateCardControl(productId);
}

// ===== CART =====
function openCart() {
    document.getElementById('cart-modal').style.display = 'flex';
}

function closeCartModal() {
    document.getElementById('cart-modal').style.display = 'none';
}

function setupCartEvents() {
    document.getElementById('cart-btn').addEventListener('click', openCart);
    document.getElementById('close-cart').addEventListener('click', closeCartModal);
    document.getElementById('cart-modal').addEventListener('click', function(e) {
        if (e.target === this) closeCartModal();
    });
}

function updateQty(productId, amt) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += amt;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== productId);
    updateCartUI();
    updateCardControl(productId);
}

function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count').innerText = totalQty;

    const container = document.getElementById('cart-items');
    if (!container) return;
    container.innerHTML = '';
    let subtotal = 0;

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">السلة فارغة حالياً</p>';
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;
            container.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                    <div>
                        <h5 class="font-bold text-xs">${item.name}</h5>
                        <span class="text-xs text-gray-500">${item.price} ج × ${item.qty} ${item.unit || 'كيلو'} = <strong>${itemTotal.toFixed(2)} ج</strong></span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="updateQty(${item.id}, -1)" class="w-7 h-7 bg-gray-200 hover:bg-red-100 rounded-full text-sm font-bold transition">−</button>
                        <span class="text-sm font-bold w-5 text-center">${item.qty}</span>
                        <button onclick="updateQty(${item.id}, 1)" class="w-7 h-7 bg-gray-200 hover:bg-green-100 rounded-full text-sm font-bold transition">+</button>
                    </div>
                </div>
            `;
        });
    }

    const deliveryFee = cart.length > 0 ? Number(DB.settings.deliveryFee) || 0 : 0;
    const total = subtotal + deliveryFee;
    document.getElementById('subtotal-val').innerText = subtotal.toFixed(2) + ' ج.م';
    document.getElementById('delivery-val').innerText  = deliveryFee.toFixed(2) + ' ج.م';
    document.getElementById('total-val').innerText     = total.toFixed(2) + ' ج.م';
}

// ===== CHECKOUT =====
function setupCheckoutForm() {
    const btn = document.getElementById('submit-order-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (cart.length === 0) { alert('برجاء إضافة منتجات للسلة أولاً!'); return; }

        const fullName = document.getElementById('order-fullname').value.trim();
        const whatsapp = document.getElementById('order-whatsapp').value.trim();
        const zone     = document.getElementById('order-zone').value.trim();
        const street   = document.getElementById('order-street').value.trim();
        const house    = document.getElementById('order-house').value.trim();

        if (!fullName || !whatsapp || !zone || !street || !house) {
            alert('برجاء إدخال الاسم ورقم الواتساب والعنوان كاملاً!');
            return;
        }

        btn.disabled  = true;
        btn.innerText = '⏳ جاري إرسال طلبك...';

        const subtotal    = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
        const deliveryFee = Number(DB.settings.deliveryFee) || 0;

        const orderData = {
            fullName,
            whatsapp,
            phoneExtra:  document.getElementById('order-phone-extra').value.trim() || null,
            zone,
            street,
            houseNumber: house,
            floor:       document.getElementById('order-floor').value.trim()       || null,
            apartment:   document.getElementById('order-apartment').value.trim()   || null,
            landmark:    document.getElementById('order-landmark').value.trim()    || null,
            notes:       document.getElementById('order-notes').value.trim()       || null,
            items:       cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, unit: i.unit || 'كيلو' })),
            subtotal,
            deliveryFee,
            total: subtotal + deliveryFee,
            status: 'جديد',
        };

        try {
            const savedOrder = await sendNewOrder(orderData);
            await sendNotification('طلب جديد 🎉', `${fullName} — ${orderData.total.toFixed(2)} ج`, savedOrder.id);

            const whatsappNum = (DB.settings.whatsapp || '201000000000').replace(/\D/g, '');
            const msg = buildWhatsAppText(savedOrder);
            window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, '_blank');

            alert('✅ تم تسجيل طلبك بنجاح!');
            cart = [];
            updateCartUI();
            // Reset form fields
            ['order-fullname','order-whatsapp','order-phone-extra','order-zone','order-street',
             'order-house','order-floor','order-apartment','order-landmark','order-notes'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            // Reset all card controls
            DB.products.forEach(p => updateCardControl(p.id));
            closeCartModal();
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء إرسال الطلب: ' + err.message);
        } finally {
            btn.disabled  = false;
            btn.innerText = '✅ تأكيد الطلب وإرساله';
        }
    });
}
