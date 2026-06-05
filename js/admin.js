document.addEventListener("DOMContentLoaded", async () => {
    const success = await loadData();
    if (success) {
        renderOrdersTable();
        initRealtimeSubscription();
        setupNotificationDropdown();
    } else {
        document.getElementById('orders-rows-container').innerHTML = `
            <tr><td colspan="7" class="p-8 text-center text-red-500 font-bold">
                ❌ فشلت عملية مزامنة البيانات! تأكد من الاتصال بالإنترنت وأعد تحميل الصفحة.
            </td></tr>
        `;
    }
});

function renderOrdersTable() {
    const container = document.getElementById('orders-rows-container');
    if (!container) return;
    container.innerHTML = '';

    if (DB.orders.length === 0) {
        container.innerHTML = `
            <tr><td colspan="7" class="p-8 text-center text-gray-400">لا يوجد أي طلبات مسجلة حتى الآن.</td></tr>
        `;
        return;
    }

    DB.orders.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        const itemsHtml = items.map(i =>
            `<div class="text-xs text-slate-600 font-medium">• ${i.name} (${i.qty} ${i.unit})</div>`
        ).join('');

        const addressHtml = `
            <div class="text-xs">
                <span class="font-bold text-slate-700">${order.zone || '—'}</span>
                ${order.street ? ` — ${order.street}` : ''}
                ${order.houseNumber ? ` م${order.houseNumber}` : ''}
                ${order.floor     ? ` — دور ${order.floor}`      : ''}
                ${order.apartment ? ` — شقة ${order.apartment}`  : ''}
                ${order.landmark  ? `<div class="text-green-600 mt-0.5">📍 ${order.landmark}</div>` : ''}
            </div>
        `;

        const createdAt = order.created_at
            ? new Date(order.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
            : '';

        container.innerHTML += `
            <tr class="hover:bg-slate-50 transition" id="order-row-${order.id}">
                <td class="p-4">
                    <div class="font-bold text-blue-600">#${order.id}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">${createdAt}</div>
                </td>
                <td class="p-4">
                    <div class="font-bold text-slate-800">${order.fullName || '—'}</div>
                    <div class="text-xs text-slate-400 mt-0.5">${order.whatsapp || ''}</div>
                    ${order.phoneExtra ? `<div class="text-xs text-slate-400">${order.phoneExtra}</div>` : ''}
                </td>
                <td class="p-4">${addressHtml}</td>
                <td class="p-4 space-y-0.5">${itemsHtml || '<span class="text-gray-400 text-xs">—</span>'}</td>
                <td class="p-4 font-bold text-slate-700">${Number(order.total || 0).toFixed(2)} ج</td>
                <td class="p-4">
                    <span class="${getStatusClass(order.status)}">${order.status || 'جديد'}</span>
                </td>
                <td class="p-4 space-y-2">
                    <a href="https://wa.me/${(order.whatsapp||'').replace(/\D/g,'')}" target="_blank" 
                       class="flex items-center gap-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1.5 rounded-lg font-bold transition w-full justify-center">
                        💬 تواصل واتساب
                    </a>
                    <select onchange="changeStatus(${order.id}, this.value)" class="text-xs border rounded p-1.5 bg-white shadow-sm focus:outline-none cursor-pointer w-full">
                        <option value="جديد"          ${order.status === 'جديد'          ? 'selected' : ''}>🆕 جديد</option>
                        <option value="جاري التجهيز"  ${order.status === 'جاري التجهيز'  ? 'selected' : ''}>⏳ جاري التجهيز</option>
                        <option value="خرج للتوصيل"  ${order.status === 'خرج للتوصيل'   ? 'selected' : ''}>🚴 خرج للتوصيل</option>
                        <option value="تم التسليم"   ${order.status === 'تم التسليم'    ? 'selected' : ''}>✅ تم التسليم</option>
                        <option value="ملغي"          ${order.status === 'ملغي'           ? 'selected' : ''}>❌ ملغي</option>
                    </select>
                </td>
            </tr>
        `;
    });
}

async function changeStatus(orderId, newStatus) {
    try {
        await updateOrderStatus(orderId, newStatus);
        const order = DB.orders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        renderOrdersTable();
    } catch (e) {
        alert("❌ فشل تحديث الحالة، حاول مرة أخرى!");
    }
}

function initRealtimeSubscription() {
    supabaseClient
        .channel('orders-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
            console.log('📬 طلب جديد:', payload.new);
            // Avoid duplicates
            if (!DB.orders.find(o => o.id === payload.new.id)) {
                DB.orders.unshift(payload.new);
                renderOrdersTable();
                triggerNotificationAlert('طلب جديد من ' + (payload.new.fullName || '؟') + ' — ' + payload.new.total + ' ج');
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
            console.log('🔄 تحديث طلب:', payload.new);
            const index = DB.orders.findIndex(o => o.id === payload.new.id);
            if (index !== -1) {
                DB.orders[index] = payload.new;
                renderOrdersTable();
            }
        })
        .subscribe((status) => {
            console.log('📡 حالة الاتصال اللحظي:', status);
        });
}

function setupNotificationDropdown() {
    const btn      = document.getElementById('notif-btn');
    const dropdown = document.getElementById('notif-dropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        // Reset count when opened
        document.getElementById('notif-count').classList.add('hidden');
        document.getElementById('notif-count').innerText = '0';
    });

    document.addEventListener('click', () => dropdown.classList.add('hidden'));
}

function triggerNotificationAlert(message) {
    const countBadge = document.getElementById('notif-count');
    if (!countBadge) return;

    countBadge.classList.remove('hidden');
    let currentCount = parseInt(countBadge.innerText) || 0;
    countBadge.innerText = currentCount + 1;

    const list = document.getElementById('notif-list');
    if (!list) return;

    // Remove empty placeholder
    const placeholder = list.querySelector('p');
    if (placeholder) placeholder.remove();

    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    list.insertAdjacentHTML('afterbegin', `
        <div class="p-2 hover:bg-slate-50 border-b rounded transition bg-green-50">
            <div class="font-bold text-slate-800 text-xs">🎉 طلب وارد جديد!</div>
            <div class="text-slate-600 text-xs mt-0.5">${message}</div>
            <div class="text-[10px] text-slate-400 mt-1 text-left">${timeStr}</div>
        </div>
    `);

    // Play a soft beep if possible
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
}
