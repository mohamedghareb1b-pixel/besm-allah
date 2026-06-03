const SUPABASE_URL = "https://wtnrslhorcbhwkzblpbe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bnJzbGhvcmNiaHdremJscGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTU4MTMsImV4cCI6MjA5NjA5MTgxM30.iIi7EAqvSdxkVpZ_XKRx5W8pkpfRLnYzgf1AQed-XPE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DB = {
    categories: [],
    products: [],
    orders: [],
    notifications: [],
    settings: {
        storeName:   'سوق فاقوس',
        whatsapp:    '',
        deliveryFee: 15,
        storeOpen:   true,
    },
};

async function loadData() {
    try {
        const [catsRes, prodsRes, settsRes, ordsRes, notifsRes] = await Promise.all([
            supabaseClient.from('categories').select('*').order('id'),
            supabaseClient.from('products').select('*').order('id'),
            supabaseClient.from('settings').select('*').eq('id', 1).single(),
            supabaseClient.from('orders').select('*').order('id', { ascending: false }),
            supabaseClient.from('notifications').select('*').order('id', { ascending: false }),
        ]);

        if (!catsRes.error  && catsRes.data)   DB.categories    = catsRes.data;
        if (!prodsRes.error && prodsRes.data)   DB.products      = prodsRes.data;
        if (!settsRes.error && settsRes.data)   DB.settings      = settsRes.data;
        if (!ordsRes.error  && ordsRes.data)    DB.orders        = ordsRes.data;
        if (!notifsRes.error && notifsRes.data) DB.notifications = notifsRes.data;

        console.log("✅ تم مزامنة البيانات بنجاح من سوبابيز!");
        return true;
    } catch (error) {
        console.error("❌ فشل في جلب البيانات من سوبابيز:", error);
        return false;
    }
}

async function sendNewOrder(orderData) {
    const { id, ...cleanOrder } = orderData;
    const { data, error } = await supabaseClient
        .from('orders')
        .insert([cleanOrder])
        .select()
        .single();
    if (error) {
        console.error("خطأ أثناء إرسال الطلب:", error);
        throw error;
    }
    return data;
}

async function sendNotification(title, body, orderId) {
    const { data, error } = await supabaseClient
        .from('notifications')
        .insert([{ title, body, order_id: orderId, read: false }])
        .select()
        .single();
    if (error) console.error("خطأ في الإشعار:", error);
    return data;
}

async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabaseClient
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
    if (error) {
        console.error("خطأ في تحديث الحالة:", error);
        throw error;
    }
}

function getStatusClass(status) {
    const map = {
        'جديد':          'status-new',
        'جاري التجهيز':  'status-prep',
        'خرج للتوصيل':  'status-delivery',
        'تم التسليم':    'status-done',
        'ملغي':          'status-cancel',
    };
    return 'status ' + (map[status] || 'status-new');
}

function buildWhatsAppText(order) {
    const lines = order.items.map(i =>
        `• ${i.name} — ${i.qty} ${i.unit} × ${i.price} = ${(i.price * i.qty).toFixed(2)} ج`
    ).join('\n');
    return [
        `🛒 طلب جديد #${order.id}`,
        ``,
        `👤 ${order.fullName}`,
        `📱 ${order.whatsapp}`,
        `📍 ${order.zone} — ${order.street} — م${order.houseNumber}` +
            (order.floor     ? ` — دور ${order.floor}`     : '') +
            (order.apartment ? ` — شقة ${order.apartment}` : ''),
        order.landmark ? `🏠 ${order.landmark}` : '',
        order.notes    ? `📝 ${order.notes}`    : '',
        ``,
        `📦 المنتجات:`,
        lines,
        ``,
        `💰 المنتجات:  ${order.subtotal.toFixed(2)} ج`,
        `🚚 التوصيل:  ${order.deliveryFee} ج`,
        `✅ الإجمالي: ${order.total.toFixed(2)} جنيه`,
    ].filter(l => l !== null && l !== undefined).join('\n');
}
