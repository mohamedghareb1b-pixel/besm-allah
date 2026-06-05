document.addEventListener("DOMContentLoaded", async () => {
    const success = await loadData();
    if (success) {
        renderDashboard();
        renderOrdersTable();
        initRealtimeSubscription();
        setupNotificationDropdown();
        setupTabs();
    } else {
        document.getElementById('orders-rows-container').innerHTML = `
            <tr><td colspan="8" class="p-8 text-center text-red-500 font-bold">
                ❌ فشلت عملية مزامنة البيانات!
            </td></tr>
        `;
    }
});

// ===== TABS =====
function setupTabs() {
    document.getElementById('tab-orders').addEventListener('click', () => showAdminTab('orders'));
    document.getElementById('tab-report').addEventListener('click', () => showAdminTab('report'));
}

function showAdminTab(tab) {
    document.getElementById('section-orders').classList.toggle('hidden', tab !== 'orders');
    document.getElementById('section-report').classList.toggle('hidden', tab !== 'report');
    document.getElementById('tab-orders').className = tab === 'orders'
        ? 'px-5 py-2 rounded-lg font-bold text-sm bg-green-600 text-white'
        : 'px-5 py-2 rounded-lg font-bold text-sm bg-white text-slate-600 border hover:bg-slate-50';
    document.getElementById('tab-report').className = tab === 'report'
        ? 'px-5 py-2 rounded-lg font-bold text-sm bg-green-600 text-white'
        : 'px-5 py-2 rounded-lg font-bold text-sm bg-white text-slate-600 border hover:bg-slate-50';
    if (tab === 'report') renderReport();
}

// ===== DASHBOARD CARDS =====
function renderDashboard() {
    const today = new Date().toDateString();
    const todayOrders = DB.orders.filter(o => new Date(o.created_at).toDateString() === today);
    const delivered   = todayOrders.filter(o => o.status === 'تم التسليم');

    // حساب الأرباح
    const deliveryCost = Number(DB.settings.delivery_cost) || 0;
    const deliveryFee  = Number(DB.settings.deliveryFee)   || 0;

    let totalRevenue = 0, totalCost = 0, totalProfit = 0;
    delivered.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        let orderCost = 0;
        items.forEach(item => {
            const product = DB.products.find(p => p.id === item.id);
            const cost = product ? (Number(product.cost_price) || 0) : 0;
            orderCost += cost * item.qty;
        });
        const deliveryProfit = deliveryFee - deliveryCost;
        totalRevenue += Number(order.total) || 0;
        totalCost    += orderCost + deliveryCost;
        totalProfit  += (Number(order.total) - orderCost - deliveryCost);
    });

    document.getElementById('dashboard').innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-xl p-4 shadow-sm border text-center">
                <div class="text-2xl font-bold text-blue-600">${todayOrders.length}</div>
                <div class="text-xs text-slate-500 mt-1">طلبات اليوم</div>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm border text-center">
                <div class="text-2xl font-bold text-green-600">${delivered.length}</div>
                <div class="text-xs text-slate-500 mt-1">تم تسليمها</div>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm border text-center">
                <div class="text-2xl font-bold text-slate-700">${totalRevenue.toFixed(0)} ج</div>
                <div class="text-xs text-slate-500 mt-1">إجمالي المبيعات</div>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm border text-center">
                <div class="text-2xl font-bold text-emerald-600">${totalProfit.toFixed(0)} ج</div>
                <div class="text-xs text-slate-500 mt-1">🏆 صافي الربح</div>
            </div>
        </div>
    `;
}

// ===== ORDERS TABLE =====
function renderOrdersTable() {
    const container = document.getElementById('orders-rows-container');
    if (!container) return;
    container.innerHTML = '';

    if (DB.orders.length === 0) {
        container.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-gray-400">لا يوجد أي طلبات.</td></tr>`;
        return;
    }

    const today = new Date().toDateString();
    const todayOrders = DB.orders.filter(o => new Date(o.created_at).toDateString() === today);

    if (todayOrders.length === 0) {
        container.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-400">لا يوجد طلبات اليوم بعد.</td></tr>`;
        return;
    }

    const tblDeliveryCost = Number(DB.settings.delivery_cost) || 0;

    todayOrders.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        const itemsHtml = items.map(i =>
            `<div class="text-xs text-slate-600">• ${i.name} (${i.qty} ${i.unit})</div>`
        ).join('');

        // حساب ربح الطلب
        let orderCost = 0;
        items.forEach(item => {
            const product = DB.products.find(p => p.id === item.id);
            const cost = product ? (Number(product.cost_price) || 0) : 0;
            orderCost += cost * item.qty;
        });
        const orderProfit = (Number(order.total) || 0) - orderCost - tblDeliveryCost;

        const addressHtml = `
            <div class="text-xs">
                <span class="font-bold text-slate-700">${order.zone || '—'}</span>
                ${order.street ? ` — ${order.street}` : ''}
                ${order.houseNumber ? ` م${order.houseNumber}` : ''}
                ${order.floor     ? ` — دور ${order.floor}`     : ''}
                ${order.apartment ? ` — شقة ${order.apartment}` : ''}
                ${order.landmark  ? `<div class="text-green-600 mt-0.5">📍 ${order.landmark}</div>` : ''}
            </div>`;

        const createdAt = order.created_at
            ? new Date(order.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
            : '';

        container.innerHTML += `
            <tr class="hover:bg-slate-50 transition" id="order-row-${order.id}">
                <td class="p-3">
                    <div class="font-bold text-blue-600 text-sm">#${order.id}</div>
                    <div class="text-[10px] text-slate-400">${createdAt}</div>
                </td>
                <td class="p-3">
                    <div class="font-bold text-slate-800 text-sm">${order.fullName || '—'}</div>
                    <div class="text-xs text-slate-400">${order.whatsapp || ''}</div>
                </td>
                <td class="p-3">${addressHtml}</td>
                <td class="p-3 space-y-0.5">${itemsHtml || '—'}</td>
                <td class="p-3">
                    <div class="font-bold text-slate-700 text-sm">${Number(order.total||0).toFixed(2)} ج</div>
                    <div class="text-xs text-emerald-600 font-bold">ربح: ${orderProfit.toFixed(2)} ج</div>
                </td>
                <td class="p-3">
                    <span class="${getStatusClass(order.status)}">${order.status || 'جديد'}</span>
                </td>
                <td class="p-3 space-y-1.5">
                    <a href="https://wa.me/${(order.whatsapp||'').replace(/\D/g,'')}" target="_blank"
                       class="flex items-center gap-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1.5 rounded-lg font-bold transition w-full justify-center">
                        💬 واتساب
                    </a>
                    <select onchange="changeStatus(${order.id}, this.value)" class="text-xs border rounded p-1.5 bg-white shadow-sm focus:outline-none cursor-pointer w-full">
                        <option value="جديد"         ${order.status==='جديد'         ?'selected':''}>🆕 جديد</option>
                        <option value="جاري التجهيز" ${order.status==='جاري التجهيز' ?'selected':''}>⏳ جاري التجهيز</option>
                        <option value="خرج للتوصيل" ${order.status==='خرج للتوصيل'  ?'selected':''}>🚴 خرج للتوصيل</option>
                        <option value="تم التسليم"  ${order.status==='تم التسليم'   ?'selected':''}>✅ تم التسليم</option>
                        <option value="ملغي"         ${order.status==='ملغي'          ?'selected':''}>❌ ملغي</option>
                    </select>
                </td>
            </tr>`;
    });
}

async function changeStatus(orderId, newStatus) {
    try {
        await updateOrderStatus(orderId, newStatus);
        const order = DB.orders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        renderOrdersTable();
        renderDashboard();
    } catch (e) {
        alert("❌ فشل تحديث الحالة!");
    }
}

// ===== REPORT =====
function renderReport() {
    const container = document.getElementById('report-container');
    if (!container) return;

    const rptDeliveryCost = Number(DB.settings.delivery_cost) || 0;

    // تجميع الطلبات المسلّمة حسب اليوم
    const days = {};
    DB.orders.filter(o => o.status === 'تم التسليم').forEach(order => {
        const day = new Date(order.created_at).toLocaleDateString('ar-EG');
        if (!days[day]) days[day] = { revenue: 0, cost: 0, profit: 0, count: 0 };

        const items = Array.isArray(order.items) ? order.items : [];
        let orderCost = 0;
        items.forEach(item => {
            const product = DB.products.find(p => p.id === item.id);
            orderCost += (Number(product?.cost_price) || 0) * item.qty;
        });
        orderCost += rptDeliveryCost;

        days[day].revenue += Number(order.total) || 0;
        days[day].cost    += orderCost;
        days[day].profit  += (Number(order.total) || 0) - orderCost;
        days[day].count++;
    });

    const dayEntries = Object.entries(days).reverse();

    if (dayEntries.length === 0) {
        container.innerHTML = `<p class="text-center text-slate-400 py-12">لا يوجد طلبات مسلّمة بعد لعرض التقرير.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-right text-sm">
                <thead>
                    <tr class="bg-slate-100 text-slate-600 text-xs border-b">
                        <th class="p-3">التاريخ</th>
                        <th class="p-3">عدد الطلبات</th>
                        <th class="p-3">إجمالي المبيعات</th>
                        <th class="p-3">إجمالي التكلفة</th>
                        <th class="p-3 text-emerald-600">صافي الربح</th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    ${dayEntries.map(([day, d]) => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-3 font-bold text-slate-700">${day}</td>
                            <td class="p-3">${d.count} طلب</td>
                            <td class="p-3 font-bold">${d.revenue.toFixed(2)} ج</td>
                            <td class="p-3 text-red-500">${d.cost.toFixed(2)} ج</td>
                            <td class="p-3 font-bold text-emerald-600">${d.profit.toFixed(2)} ج</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot class="border-t-2 bg-slate-50">
                    <tr class="font-bold">
                        <td class="p-3">الإجمالي الكلي</td>
                        <td class="p-3">${dayEntries.reduce((s,[,d])=>s+d.count,0)} طلب</td>
                        <td class="p-3">${dayEntries.reduce((s,[,d])=>s+d.revenue,0).toFixed(2)} ج</td>
                        <td class="p-3 text-red-500">${dayEntries.reduce((s,[,d])=>s+d.cost,0).toFixed(2)} ج</td>
                        <td class="p-3 text-emerald-600 text-base">${dayEntries.reduce((s,[,d])=>s+d.profit,0).toFixed(2)} ج</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

// ===== REALTIME =====
function initRealtimeSubscription() {
    supabaseClient
        .channel('orders-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
            if (!DB.orders.find(o => o.id === payload.new.id)) {
                DB.orders.unshift(payload.new);
                renderOrdersTable();
                renderDashboard();
                triggerNotificationAlert('طلب جديد من ' + (payload.new.fullName||'؟') + ' — ' + payload.new.total + ' ج');
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
            const index = DB.orders.findIndex(o => o.id === payload.new.id);
            if (index !== -1) {
                DB.orders[index] = payload.new;
                renderOrdersTable();
                renderDashboard();
            }
        })
        .subscribe();
}

// ===== NOTIFICATIONS =====
function setupNotificationDropdown() {
    const btn      = document.getElementById('notif-btn');
    const dropdown = document.getElementById('notif-dropdown');
    if (!btn || !dropdown) return;
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        document.getElementById('notif-count').classList.add('hidden');
        document.getElementById('notif-count').innerText = '0';
    });
    document.addEventListener('click', () => dropdown.classList.add('hidden'));
}

function triggerNotificationAlert(message) {
    const badge = document.getElementById('notif-count');
    if (!badge) return;
    badge.classList.remove('hidden');
    badge.innerText = (parseInt(badge.innerText) || 0) + 1;

    const list = document.getElementById('notif-list');
    if (!list) return;
    const p = list.querySelector('p');
    if (p) p.remove();

    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    list.insertAdjacentHTML('afterbegin', `
        <div class="p-2 hover:bg-slate-50 border-b rounded transition bg-green-50">
            <div class="font-bold text-slate-800 text-xs">🎉 طلب وارد جديد!</div>
            <div class="text-slate-600 text-xs mt-0.5">${message}</div>
            <div class="text-[10px] text-slate-400 mt-1">${timeStr}</div>
        </div>
    `);

    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch(_) {}
}
