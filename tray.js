import dotenv from "dotenv";
dotenv.config();

const TRAY_API_URL = "https://api.dooki.com.br/v2";
const TRAY_STORE   = process.env.TRAY_STORE_ID;
const TRAY_TOKEN   = process.env.TRAY_ACCESS_TOKEN;

// ─── Headers padrão Tray ─────────────────────────────────────────────────────
function trayHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${TRAY_TOKEN}`,
  };
}

// ─── Buscar pedidos por telefone ─────────────────────────────────────────────
export async function getOrdersByPhone(phone) {
  try {
    // Tray permite buscar pedidos por dados do cliente
    const url = `${TRAY_API_URL}/${TRAY_STORE}/orders?customer_phone=${phone}&limit=5&sort=-id`;

    const res = await fetch(url, { headers: trayHeaders() });

    if (!res.ok) {
      console.error(`❌ Tray orders error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const orders = data.Orders || data.orders || [];

    return orders.map((o) => ({
      id: o.Order?.id || o.id,
      status: o.Order?.status_name || o.status_name || "Desconhecido",
      total: o.Order?.total || o.total || 0,
      tracking: o.Order?.delivery_delivery_code || null,
      date: o.Order?.date_add || null,
    }));
  } catch (err) {
    console.error("❌ Erro ao buscar pedidos Tray:", err.message);
    return [];
  }
}

// ─── Buscar catálogo de produtos ─────────────────────────────────────────────
export async function getProductCatalog({ limit = 5, category = null } = {}) {
  try {
    let url = `${TRAY_API_URL}/${TRAY_STORE}/products?limit=${limit}&sort=-id&availability=1`;
    if (category) url += `&category_id=${category}`;

    const res = await fetch(url, { headers: trayHeaders() });

    if (!res.ok) {
      console.error(`❌ Tray products error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const products = data.Products || data.products || [];

    return products.map((p) => ({
      id: p.Product?.id || p.id,
      name: p.Product?.name || p.name || "Produto",
      price: p.Product?.price || p.price || 0,
      stock: p.Product?.stock || p.stock || 0,
      url: p.Product?.link || null,
    }));
  } catch (err) {
    console.error("❌ Erro ao buscar catálogo Tray:", err.message);
    return [];
  }
}

// ─── Buscar pedido por ID ─────────────────────────────────────────────────────
export async function getOrderById(orderId) {
  try {
    const url = `${TRAY_API_URL}/${TRAY_STORE}/orders/${orderId}`;
    const res = await fetch(url, { headers: trayHeaders() });

    if (!res.ok) return null;

    const data = await res.json();
    const o = data.Order || data;

    return {
      id: o.id,
      status: o.status_name || "Desconhecido",
      total: o.total || 0,
      tracking: o.delivery_delivery_code || null,
      items: o.OrderProduct || [],
    };
  } catch (err) {
    console.error("❌ Erro ao buscar pedido Tray:", err.message);
    return null;
  }
}
