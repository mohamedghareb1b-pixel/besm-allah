document.addEventListener("DOMContentLoaded", async () => {
    const success = await loadData();
    if (success) {
        renderDashboard();
        renderOrdersTable();
        initRealtimeSubscription();
        setupNotificationDropdown();
        setupTabs();
    } else {
        document.getElementById('orders-rows-container').innerHTML =
            '<tr><td colspan="7" class="p-8 text-center text-red-500 font-bold">❌ فشل الاتصال!</td></tr>';
    }
});

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

function calcOrderProfit(order) {
    var dCost = Number(DB.settings.delivery_cost) || 0;
    var items = Array.isArray(order.items) ? order.items : [];
    var cost = 0;
    items.forEach(function(item) {
        var p = DB.products.find(function(x) { return x.id === item.id; });
        cost += (Number(p ? p.cost_price : 0) || 0) * item.qty;
    });
    return (Number(order.total) || 0) - cost - dCost;
}

function renderDashboard() {
    var today = new Date().toDateString();
    var todayOrders = DB.orders.filter(function(o) {
        return new Date(o.created_at).toDateString() === today;
    });
    var delivered = todayOrders.filter(function(o) { return o.status === 'تم التسليم'; });

    var totalRevenue = 0, totalProfit = 0;
    delivered.forEach(function(o) {
        totalRevenue += Number(o.total) || 0;
        totalProfit  += calcOrderProfit(o);
    });

    document.getElementById('dashboard').innerHTML =
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">' +
            '<div class="bg-white rounded-xl p-4 shadow-sm border text-center">' +
                '<div class="text-2xl font-bold text-blue-600">' + todayOrders.length + '</div>' +
                '<div class="text-xs text-slate-500 mt-1">طلبات اليوم</div>' +
            '</div>' +
            '<div class="bg-white rounded-xl p-4 shadow-sm border text-center">' +
                '<div class="text-2xl font-bold text-green-600">' + delivered.length + '</div>' +
                '<div class="text-xs text-slate-500 mt-1">تم تسليمها</div>' +
            '</div>' +
            '<div class="bg-white rounded-xl p-4 shadow-sm border text-center">' +
                '<div class="text-2xl font-bold text-slate-700">' + totalRevenue.toFixed(0) + ' ج</div>' +
                '<div class="text-xs text-slate-500 mt-1">إجمالي المبيعات</div>' +
            '</div>' +
            '<div class="bg-white rounded-xl p-4 shadow-sm border text-center">' +
                '<div class="text-2xl font-bold text-emerald-600">' + totalProfit.toFixed(0) + ' ج</div>' +
                '<div class="text-xs text-slate-500 mt-1">🏆 صافي الربح</div>' +
            '</div>' +
        '</div>';
}

function renderOrdersTable() {
    var container = document.getElementById('orders-rows-container');
    if (!container) return;

    var today = new Date().toDateString();
    var todayOrders = DB.orders.filter(function(o) {
        return new Date(o.created_at).toDateString() === today;
    });

    if (todayOrders.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">لا يوجد طلبات اليوم بعد.</td></tr>';
        return;
    }

    container.innerHTML = '';
    todayOrders.forEach(function(order) {
        var items = Array.isArray(order.items) ? order.items : [];
        var itemsHtml = items.map(function(i) {
            return '<div class="text-xs text-slate-600">• ' + i.name + ' (' + i.qty + ' ' + i.unit + ')</div>';
        }).join('');

        var profit = calcOrderProfit(order);

        var addr = '<div class="text-xs">';
        addr += '<span class="font-bold text-slate-700">' + (order.zone||'—') + '</span>';
        if (order.street)      addr += ' — ' + order.street;
        if (order.houseNumber) addr += ' م' + order.houseNumber;
        if (order.floor)       addr += ' — دور ' + order.floor;
        if (order.apartment)   addr += ' — شقة ' + order.apartment;
        if (order.landmark)    addr += '<div class="text-green-600 mt-0.5">📍 ' + order.landmark + '</div>';
        addr += '</div>';

        var time = order.created_at
            ? new Date(order.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})
            : '';

        var statusOpts = ['جديد','جاري التجهيز','خرج للتوصيل','تم التسليم','ملغي'];
        var icons      = ['🆕','⏳','🚴','✅','❌'];
        var selectHtml = '<select onchange="changeStatus(' + order.id + ', this.value)" class="text-xs border rounded p-1.5 bg-white cursor-pointer w-full">';
        statusOpts.forEach(function(s, i) {
            selectHtml += '<option value="' + s + '"' + (order.status === s ? ' selected' : '') + '>' + icons[i] + ' ' + s + '</option>';
        });
        selectHtml += '</select>';

        var waNum = (order.whatsapp||'').replace(/\D/g,'');

        container.innerHTML +=
            '<tr class="hover:bg-slate-50 transition">' +
                '<td class="p-3"><div class="font-bold text-blue-600 text-sm">#' + order.id + '</div><div class="text-[10px] text-slate-400">' + time + '</div></td>' +
                '<td class="p-3"><div class="font-bold text-sm">' + (order.fullName||'—') + '</div><div class="text-xs text-slate-400">' + (order.whatsapp||'') + '</div></td>' +
                '<td class="p-3">' + addr + '</td>' +
                '<td class="p-3 space-y-0.5">' + (itemsHtml||'—') + '</td>' +
                '<td class="p-3"><div class="font-bold text-sm">' + Number(order.total||0).toFixed(2) + ' ج</div><div class="text-xs text-emerald-600 font-bold">ربح: ' + profit.toFixed(2) + ' ج</div></td>' +
                '<td class="p-3"><span class="' + getStatusClass(order.status) + '">' + (order.status||'جديد') + '</span></td>' +
                '<td class="p-3 space-y-1.5">' +
                    '<a href="https://wa.me/' + waNum + '" target="_blank" class="flex items-center gap-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1.5 rounded-lg font-bold w-full justify-center">💬 واتساب</a>' +
                    selectHtml +
                '</td>' +
            '</tr>';
    });
}

function changeStatus(orderId, newStatus) {
    updateOrderStatus(orderId, newStatus).then(function() {
        var order = DB.orders.find(function(o) { return o.id === orderId; });
        if (order) order.status = newStatus;
        renderOrdersTable();
        renderDashboard();
    }).catch(function() {
        alert("❌ فشل تحديث الحالة!");
    });
}

function renderReport() {
    var container = document.getElementById('report-container');
    if (!container) return;

    var dCost = Number(DB.settings.delivery_cost) || 0;
    var days = {};

    DB.orders.filter(function(o) { return o.status === 'تم التسليم'; }).forEach(function(order) {
        var day = new Date(order.created_at).toLocaleDateString('ar-EG');
        if (!days[day]) days[day] = { revenue:0, cost:0, profit:0, count:0 };

        var items = Array.isArray(order.items) ? order.items : [];
        var oCost = dCost;
        items.forEach(function(item) {
            var p = DB.products.find(function(x) { return x.id === item.id; });
            oCost += (Number(p ? p.cost_price : 0) || 0) * item.qty;
        });

        days[day].revenue += Number(order.total) || 0;
        days[day].cost    += oCost;
        days[day].profit  += (Number(order.total) || 0) - oCost;
        days[day].count++;
    });

    var entries = Object.entries(days).reverse();
    if (entries.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-12">لا يوجد طلبات مسلّمة بعد.</p>';
        return;
    }

    var totRev = 0, totCost = 0, totProfit = 0, totCount = 0;
    entries.forEach(function(e) { totRev += e[1].revenue; totCost += e[1].cost; totProfit += e[1].profit; totCount += e[1].count; });

    var rows = entries.map(function(e) {
        return '<tr class="hover:bg-slate-50">' +
            '<td class="p-3 font-bold text-slate-700">' + e[0] + '</td>' +
            '<td class="p-3">' + e[1].count + ' طلب</td>' +
            '<td class="p-3 font-bold">' + e[1].revenue.toFixed(2) + ' ج</td>' +
            '<td class="p-3 text-red-500">' + e[1].cost.toFixed(2) + ' ج</td>' +
            '<td class="p-3 font-bold text-emerald-600">' + e[1].profit.toFixed(2) + ' ج</td>' +
        '</tr>';
    }).join('');

    container.innerHTML =
        '<div class="overflow-x-auto">' +
        '<table class="w-full text-right text-sm">' +
            '<thead><tr class="bg-slate-100 text-slate-600 text-xs border-b">' +
                '<th class="p-3">التاريخ</th><th class="p-3">عدد الطلبات</th>' +
                '<th class="p-3">المبيعات</th><th class="p-3">التكلفة</th>' +
                '<th class="p-3 text-emerald-600">صافي الربح</th>' +
            '</tr></thead>' +
            '<tbody class="divide-y">' + rows + '</tbody>' +
            '<tfoot class="border-t-2 bg-slate-50 font-bold">' +
                '<tr><td class="p-3">الإجمالي</td>' +
                '<td class="p-3">' + totCount + ' طلب</td>' +
                '<td class="p-3">' + totRev.toFixed(2) + ' ج</td>' +
                '<td class="p-3 text-red-500">' + totCost.toFixed(2) + ' ج</td>' +
                '<td class="p-3 text-emerald-600 text-base">' + totProfit.toFixed(2) + ' ج</td>' +
                '</tr>' +
            '</tfoot>' +
        '</table></div>';
}

function initRealtimeSubscription() {
    supabaseClient.channel('orders-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, function(payload) {
            if (!DB.orders.find(function(o) { return o.id === payload.new.id; })) {
                DB.orders.unshift(payload.new);
                renderOrdersTable();
                renderDashboard();
                triggerNotificationAlert('طلب جديد من ' + (payload.new.fullName||'؟') + ' — ' + payload.new.total + ' ج');
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, function(payload) {
            var index = DB.orders.findIndex(function(o) { return o.id === payload.new.id; });
            if (index !== -1) {
                DB.orders[index] = payload.new;
                renderOrdersTable();
                renderDashboard();
            }
        })
        .subscribe();
}

function setupNotificationDropdown() {
    var btn      = document.getElementById('notif-btn');
    var dropdown = document.getElementById('notif-dropdown');
    if (!btn || !dropdown) return;
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        document.getElementById('notif-count').classList.add('hidden');
        document.getElementById('notif-count').innerText = '0';
    });
    document.addEventListener('click', function() { dropdown.classList.add('hidden'); });
}

function triggerNotificationAlert(message) {
    var badge = document.getElementById('notif-count');
    if (!badge) return;
    badge.classList.remove('hidden');
    badge.innerText = (parseInt(badge.innerText) || 0) + 1;
    var list = document.getElementById('notif-list');
    if (!list) return;
    var p = list.querySelector('p');
    if (p) p.remove();
    var timeStr = new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'});
    list.insertAdjacentHTML('afterbegin',
        '<div class="p-2 hover:bg-slate-50 border-b rounded transition bg-green-50">' +
            '<div class="font-bold text-slate-800 text-xs">🎉 طلب وارد جديد!</div>' +
            '<div class="text-slate-600 text-xs mt-0.5">' + message + '</div>' +
            '<div class="text-[10px] text-slate-400 mt-1">' + timeStr + '</div>' +
        '</div>');
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}
}
