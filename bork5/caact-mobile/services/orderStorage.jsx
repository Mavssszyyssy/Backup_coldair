import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "orders_storage_v1";

export const ORDER_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  RELEASED: "RELEASED",
  CANCELLED: "CANCELLED",
};

export const ORDER_DELIVERY_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  PREPARING: "PREPARING",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED_ATTEMPT: "FAILED_ATTEMPT",
};

export const ORDER_PAYMENT_STATUS = {
  COD_PENDING: "COD_PENDING",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  VERIFIED: "VERIFIED",
  FAILED: "FAILED",
  NOT_REQUIRED: "NOT_REQUIRED",
};

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeOrderItem(item = {}) {
  return {
    id: item.id || `order_item_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name: item.name || item.productName || "AC Product",
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
  };
}

function normalizeOrder(order = {}) {
  const createdAt = order.createdAt || new Date().toISOString();
  const items = Array.isArray(order.items)
    ? order.items.map(normalizeOrderItem)
    : [];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
    0,
  );

  return {
    id: order.id || `order_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    userId: order.userId || "",
    customerEmail: order.customerEmail || "",
    customerName: order.customerName || "",
    trackingNumber: order.trackingNumber || "",
    items,
    address: order.address || null,
    paymentMethod: order.paymentMethod || "COD",
    status: order.status || ORDER_STATUS.PENDING,
    deliveryStatus:
      order.deliveryStatus || ORDER_DELIVERY_STATUS.NOT_STARTED,
    paymentStatus:
      order.paymentStatus || ORDER_PAYMENT_STATUS.NOT_REQUIRED,
    serviceRequestId: order.serviceRequestId || "",
    subtotal: Number(order.subtotal || subtotal),
    vatAmount: Number(order.vatAmount || 0),
    shippingFee: Number(order.shippingFee || order.deliveryFee || 0),
    discountAmount: Number(order.discountAmount || 0),
    total: Number(order.total || subtotal),
    createdAt,
    updatedAt: order.updatedAt || createdAt,
  };
}

export async function getAllOrders() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed.map(normalizeOrder) : [];
}

export async function saveAllOrders(orders = []) {
  const normalized = orders.map(normalizeOrder);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function getOrdersByUser(user = {}) {
  const orders = await getAllOrders();
  return orders
    .filter((order) => {
      if (user?.id && String(order.userId) === String(user.id)) return true;
      if (user?.email) {
        return (
          String(order.customerEmail || "").toLowerCase() ===
          String(user.email).toLowerCase()
        );
      }
      return false;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
    );
}
