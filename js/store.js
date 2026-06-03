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
    renderProducts('all');
    setupCartEvents();
    setupCheckoutForm();
}

function renderCategories() {
    const container = document.getElementById('categories-container');
    if (!container) return;
    container.innerHTML = `
        <button onclick="filterProducts('all')" class="cat-btn active bg-green-600 text-white px-4 py-2 rounded-full font-medium whitespace-nowrap text-sm">
            🌟 الكل
        </button>
    `;
    DB.categories.forEach(cat => {
        container.innerHTML += `
            <button onclick="filterProducts(${cat.id})" class="cat-btn bg-white border text-gray-700 px-4 py-2 rounded-full font-medium whitespace-nowrap text-sm hover:bg-gray-50 transition">
                ${cat.icon || '📁'} ${cat.name}
            </button>
        `;
    });
}

function renderProducts(catId = 'all') {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = DB.products.filter(p =>
        (p.active !== false) && (catId === 'all' || p.catId == catId)
    );

    if (filtered.length === 0) {
        grid.innerHTML = `<p class="col-span-2 md:col-span-4 text-center text-gray-400 py-8">لا توجد منتجات متاحة حالياً.</p>`;
        return;
    }

    filtered.forEach(p => {
        grid.innerHTML += `
            <div class="bg-white rounded-xl shadow-sm border p-4 flex flex-col justify-between hover:shadow-md transition">
                <div class="text-4xl mb-2 text-center">${p.icon || '🛒'}</div>
                <div>
                    <h3 class="font-bold text-sm text-gray-800 mb-1">${p.name}</h3>
                    <p class="text-green-600 font-bold text-sm mb-3">${p.price} ج / <span class="text-xs text-gray-400">${p.unit}</span></p>
                </div>
                <button onclick="addToCart(${p.id})" class="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg transition">
                    ➕ إضافة للسلة
                </button>
            </div>
        `;
    });
}

function filterProducts(catId) {
    // Update active button
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('bg-green-600', 'text-white');
        btn.classList.add('bg-white', 'text-gray-700');
    });
    event.target.classList.remove('bg-white', 'text-gray-700');
    event.target.classList.add('bg-green-600', 'text-white');

    renderProducts(catId);
}

function openCart() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function setupCartEvents() {
    const cartBtn  = document.getElementById('cart-btn');
    const closeBtn = document.getElementById('close-cart');
    const modal    = document.getElementById('cart-modal');

    if (cartBtn)  cartBtn.addEventListener('click',  openCart);
    if (closeBtn) closeBtn.addEventListener('click', closeCartModal);

    // Close on backdrop click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCartModal();
        });
    }
}

function addToCart(productId) {
    const product = DB.products.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();

    // Visual feedback
    const btn = event.target;
    btn.innerText = '✅ تمت الإضافة!';
    btn.classList.add('bg-green-800');
    setTimeout(() => {
        btn.innerText = '➕ إضافة للسلة';
        btn.classList.remove('bg-green-800');
    }, 800);
}

function updateQty(productId, amt) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += amt;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== productId);
    }
    updateCartUI();
}

function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const cartCount = document.getElementById('cart-count');
    if (cartCount) cartCount.innerText = totalQty;

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
                        <span class="text-xs text-gray-500">${item.price} ج × ${item.qty} = <strong>${itemTotal.toFixed(2)} ج</strong></span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="updateQty(${item.id}, -1)" class="w-7 h-7 bg-gray-200 hover:bg-red-100 rounded text-sm font-bold transition">−</button>
                        <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                        <button onclick="updateQty(${item.id}, 1)" class="w-7 h-7 bg-gray-200 hover:bg-green-100 rounded text-sm font-bold transition">+</button>
                    </div>
                </div>
            `;
        });
    }

    const deliveryFee = cart.length > 0 ? Number(DB.settings.deliveryFee) || 0 : 0;
    const total = subtotal + deliveryFee;

    document.getElementById('subtotal-val').innerText = subtotal.toFixed(2) + ' ج.م';
    document.getElementById('delivery-val').innerText = deliveryFee.toFixed(2) + ' ج.م';
    document.getElementById('total-val').innerText    = total.toFixed(2) + ' ج.م';
}

function setupCheckoutForm() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            alert('برجاء إضافة منتجات للسلة أولاً!');
            return;
        }

        const submitBtn = document.getElementById('submit-order-btn');
        submitBtn.disabled  = true;
        submitBtn.innerText = '⏳ جاري إرسال طلبك...';

        const subtotal    = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const deliveryFee = Number(DB.settings.deliveryFee) || 0;

        const orderData = {
            fullName:    document.getElementById('order-fullname').value.trim(),
            whatsapp:    document.getElementById('order-whatsapp').value.trim(),
            phoneExtra:  document.getElementById('order-phone-extra').value.trim() || null,
            zone:        document.getElementById('order-zone').value.trim(),
            street:      document.getElementById('order-street').value.trim(),
            houseNumber: document.getElementById('order-house').value.trim(),
            floor:       document.getElementById('order-floor').value.trim()       || null,
            apartment:   document.getElementById('order-apartment').value.trim()   || null,
            landmark:    document.getElementById('order-landmark').value.trim()    || null,
            notes:       document.getElementById('order-notes').value.trim()       || null,
            items:       cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, unit: i.unit })),
            subtotal,
            deliveryFee,
            total:       subtotal + deliveryFee,
            status:      'جديد',
        };

        try {
            const savedOrder = await sendNewOrder(orderData);
            await sendNotification(
                'طلب جديد 🎉',
                `العميل ${orderData.fullName} — ${orderData.total.toFixed(2)} ج`,
                savedOrder.id
            );

            const messageText  = buildWhatsAppText(savedOrder);
            const whatsappNum  = (DB.settings.whatsapp || '201000000000').replace(/\D/g, '');
            const whatsappUrl  = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(messageText)}`;

            alert('🚀 تم تسجيل طلبك بنجاح! جاري فتح الواتساب...');
            window.open(whatsappUrl, '_blank');

            cart = [];
            updateCartUI();
            form.reset();
            closeCartModal();
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء إرسال الطلب، برجاء المحاولة مرة أخرى.');
        } finally {
            submitBtn.disabled  = false;
            submitBtn.innerText = '✅ تأكيد الطلب وإرساله';
        }
    });
}
