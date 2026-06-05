let cart = [];

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
    setupCheckoutBtn();
}

// ===== CATEGORIES =====
function renderCategories() {
    const container = document.getElementById('categories-container');
    if (!container) return;
    container.innerHTML = `
        <button onclick="filterProducts('all', this)" class="px-4 py-2 rounded-full font-medium whitespace-nowrap text-sm bg-green-600 text-white flex-shrink-0">
            🌟 الكل
        </button>
    `;
    DB.categories.forEach(cat => {
        container.innerHTML += `
            <button onclick="filterProducts(${cat.id}, this)" class="px-4 py-2 rounded-full font-medium whitespace-nowrap text-sm bg-white border text-gray-700 flex-shrink-0 transition">
                ${cat.icon || '📁'} ${cat.name}
            </button>
        `;
    });
}

function filterProducts(catId, btn) {
    document.querySelectorAll('#categories-container button').forEach(b => {
        b.classList.remove('bg-green-600', 'text-white');
        b.classList.add('bg-white', 'text-gray-700');
    });
    btn.classList.add('bg-green-600', 'text-white');
    btn.classList.remove('bg-white', 'text-gray-700');
    renderProductsMain(catId);
}

// ===== PRODUCTS =====
function renderProductsMain(catId) {
    const container = document.getElementById('products-main');
    if (!container) return;
    container.innerHTML = '';

    const active = DB.products.filter(p => p.active !== false);

    if (catId !== 'all') {
        const filtered = active.filter(p => p.cat_id == catId);
        const cat = DB.categories.find(c => c.id == catId);
        if (filtered.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 py-12">لا توجد منتجات في هذا القسم.</p>`;
            return;
        }
        container.innerHTML = `
            <h2 class="text-base font-bold mb-3">${cat ? cat.icon + ' ' + cat.name : 'المنتجات'}</h2>
            ${buildCarousel(filtered)}
        `;
    } else {
        // كل قسم في صف منفصل
        DB.categories.forEach(cat => {
            const prods = active.filter(p => p.cat_id == cat.id);
            if (prods.length === 0) return;
            container.innerHTML += `
                <section class="mb-6">
                    <h2 class="text-base font-bold mb-2">${cat.icon || '📁'} ${cat.name}</h2>
                    ${buildCarousel(prods)}
                </section>
            `;
        });

        // منتجات بدون قسم
        const misc = active.filter(p => !p.cat_id);
        if (misc.length > 0) {
            container.innerHTML += `
                <section class="mb-6">
                    <h2 class="text-base font-bold mb-2">🛒 منتجات أخرى</h2>
                    ${buildCarousel(misc)}
                </section>
            `;
        }

        if (!container.innerHTML) {
            container.innerHTML = `<p class="text-center text-gray-400 py-12">لا توجد منتجات متاحة حالياً.</p>`;
        }
    }
}

function buildCarousel(products) {
    const cards = products.map(p => `
        <div class="product-card bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
            ${p.image
                ? `<img src="${p.image}" class="w-full h-28 object-cover" onerror="this.style.display='none'">`
                : `<div class="text-4xl text-center py-4">${p.icon || '🛒'}</div>`
            }
            <div class="p-2 flex flex-col flex-1 justify-between">
                <div>
                    <h3 class="font-bold text-xs text-gray-800 leading-tight mb-0.5">${p.name}</h3>
                    <p class="text-green-600 font-bold text-sm">${p.price} ج <span class="text-[10px] text-gray-400 font-normal">/ ${p.unit || 'كيلو'}</span></p>
                </div>
                <div class="mt-2" id="card-ctrl-${p.id}">
                    <button onclick="addToCartCard(${p.id})" class="w-full bg-green-600 active:bg-green-800 text-white text-xs font-bold py-1.5 rounded-lg transition">
                        ➕ إضافة
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    return `
        <div class="carousel-wrapper">
            <div class="carousel-track pb-1">
                ${cards}
            </div>
        </div>
    `;
}

// ===== CARD QTY CONTROL =====
function addToCartCard(productId) {
    const product = DB.products.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(i => i.id === productId);
    if (existing) existing.qty++;
    else cart.push({ ...product, qty: 1 });
    updateCartUI();
    renderCardControl(productId);
}

function changeCardQty(productId, amt) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += amt;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== productId);
    updateCartUI();
    renderCardControl(productId);
}

function renderCardControl(productId) {
    // update all instances (filtered + all view)
    document.querySelectorAll(`[id="card-ctrl-${productId}"]`).forEach(ctrl => {
        const item = cart.find(i => i.id === productId);
        const unit = (DB.products.find(p => p.id === productId) || {}).unit || 'كيلو';
        if (!item) {
            ctrl.innerHTML = `
                <button onclick="addToCartCard(${productId})" class="w-full bg-green-600 active:bg-green-800 text-white text-xs font-bold py-1.5 rounded-lg transition">
                    ➕ إضافة
                </button>`;
        } else {
            ctrl.innerHTML = `
                <div class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-1 py-0.5">
                    <button onclick="changeCardQty(${productId}, -1)" class="qty-btn text-red-500 text-lg">−</button>
                    <span class="qty-display text-green-700 text-xs">${item.qty} ${unit}</span>
                    <button onclick="changeCardQty(${productId}, 1)" class="qty-btn text-green-600 text-lg">+</button>
                </div>`;
        }
    });
}

// ===== CART =====
function openCart()      { document.getElementById('cart-modal').style.display = 'flex'; }
function closeCartModal(){ document.getElementById('cart-modal').style.display = 'none'; }

function setupCartEvents() {
    document.getElementById('cart-btn').addEventListener('click', openCart);
    document.getElementById('close-cart').addEventListener('click', closeCartModal);
    document.getElementById('cart-modal').addEventListener('click', e => {
        if (e.target === document.getElementById('cart-modal')) closeCartModal();
    });
}

function updateQty(productId, amt) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += amt;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== productId);
    updateCartUI();
    renderCardControl(productId);
}

function updateCartUI() {
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    document.getElementById('cart-count').innerText = totalQty;

    const container = document.getElementById('cart-items');
    if (!container) return;
    let subtotal = 0;
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">السلة فارغة حالياً</p>';
    } else {
        cart.forEach(item => {
            const t = item.price * item.qty;
            subtotal += t;
            container.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                    <div>
                        <div class="font-bold text-xs">${item.name}</div>
                        <div class="text-xs text-gray-500">${item.price} ج × ${item.qty} ${item.unit||'كيلو'} = <b>${t.toFixed(2)} ج</b></div>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="updateQty(${item.id},-1)" class="w-7 h-7 bg-gray-200 rounded-full font-bold text-sm flex items-center justify-center">−</button>
                        <span class="w-5 text-center text-sm font-bold">${item.qty}</span>
                        <button onclick="updateQty(${item.id},1)"  class="w-7 h-7 bg-gray-200 rounded-full font-bold text-sm flex items-center justify-center">+</button>
                    </div>
                </div>`;
        });
    }

    const fee = cart.length > 0 ? Number(DB.settings.deliveryFee)||0 : 0;
    document.getElementById('subtotal-val').innerText = subtotal.toFixed(2) + ' ج.م';
    document.getElementById('delivery-val').innerText  = fee.toFixed(2) + ' ج.م';
    document.getElementById('total-val').innerText     = (subtotal + fee).toFixed(2) + ' ج.م';
}

// ===== CHECKOUT =====
function setupCheckoutBtn() {
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
            alert('برجاء إدخال: الاسم، رقم الواتساب، المنطقة، الشارع، رقم المنزل!');
            return;
        }

        btn.disabled = true;
        btn.innerText = '⏳ جاري الإرسال...';

        const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const deliveryFee = Number(DB.settings.deliveryFee) || 0;

        const orderData = {
            fullName, whatsapp,
            phoneExtra:  document.getElementById('order-phone-extra').value.trim() || null,
            zone, street,
            houseNumber: house,
            floor:       document.getElementById('order-floor').value.trim()     || null,
            apartment:   document.getElementById('order-apartment').value.trim() || null,
            landmark:    document.getElementById('order-landmark').value.trim()  || null,
            notes:       document.getElementById('order-notes').value.trim()     || null,
            items:       cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, unit: i.unit||'كيلو' })),
            subtotal, deliveryFee,
            total: subtotal + deliveryFee,
            status: 'جديد',
        };

        try {
            const saved = await sendNewOrder(orderData);
            await sendNotification('طلب جديد 🎉', `${fullName} — ${orderData.total.toFixed(2)} ج`, saved.id);

            alert('✅ تم استلام طلبك بنجاح!\nسيتواصل معك المتجر قريباً على الواتساب.');
            cart = [];
            updateCartUI();
            DB.products.forEach(p => renderCardControl(p.id));
            ['order-fullname','order-whatsapp','order-phone-extra','order-zone','order-street',
             'order-house','order-floor','order-apartment','order-landmark','order-notes']
             .forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
            closeCartModal();
        } catch(err) {
            console.error(err);
            alert('حدث خطأ: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = '✅ تأكيد الطلب وإرساله';
        }
    });
}
