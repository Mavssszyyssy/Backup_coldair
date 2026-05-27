import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../constants/config";
import { getStoredToken } from "./api";

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
  const serialUnits = Array.isArray(item.serialUnits)
    ? item.serialUnits
        .map((unit) => ({
          serialNumber: String(unit?.serialNumber || "").trim(),
          qrCode: String(unit?.qrCode || "").trim(),
          branch: String(unit?.branch || item.sourceBranch || "").trim(),
          status: String(unit?.status || "").trim(),
          productSku: String(unit?.productSku || item.sku || "").trim(),
          productName: String(unit?.productName || item.name || "").trim(),
        }))
        .filter((unit) => unit.serialNumber || unit.qrCode)
    : [];
  const serialNumbers = Array.from(
    new Set(
      [
        ...(Array.isArray(item.serialNumbers) ? item.serialNumbers : []),
        ...serialUnits.map((unit) => unit.serialNumber),
      ]
        .map((serial) => String(serial || "").trim())
        .filter(Boolean),
    ),
  );

  return {
    id: item.id || `order_item_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    productId: item.productId || item.product_id || item.id || "",
    name: item.name || item.productName || "AC Product",
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    specs: item.specs || "",
    sourceBranch: item.sourceBranch || "",
    serialNumbers,
    serialUnits,
  };
}

function paymentStatusFromOrder(order = {}) {
  if (order.paymentStatus) return order.paymentStatus;
  if (order.status === "paid") return ORDER_PAYMENT_STATUS.VERIFIED;
  if (order.paymentMethod === "cod") return ORDER_PAYMENT_STATUS.COD_PENDING;
  return ORDER_PAYMENT_STATUS.PENDING_VERIFICATION;
}

function deliveryStatusFromWorkflow(workflowStatus = "", fallback = "") {
  if (fallback) return fallback;
  if (workflowStatus === "to_deliver") return ORDER_DELIVERY_STATUS.PREPARING;
  if (workflowStatus === "to_install") return ORDER_DELIVERY_STATUS.OUT_FOR_DELIVERY;
  if (workflowStatus === "complete") return ORDER_DELIVERY_STATUS.DELIVERED;
  if (workflowStatus === "cancelled") return ORDER_DELIVERY_STATUS.FAILED_ATTEMPT;
  return ORDER_DELIVERY_STATUS.NOT_STARTED;
}

function statusFromWorkflow(order = {}) {
  if (order.workflowStatus === "cancelled" || order.status === "cancelled") return ORDER_STATUS.CANCELLED;
  if (order.workflowStatus === "complete") return ORDER_STATUS.RELEASED;
  if (order.workflowStatus === "to_install") return ORDER_STATUS.RELEASED;
  if (order.workflowStatus === "to_deliver" || order.status === "paid") return ORDER_STATUS.APPROVED;
  return order.status || ORDER_STATUS.PENDING;
}

export function normalizeOrder(order = {}) {
  const createdAt = order.createdAt || new Date().toISOString();
  const items = Array.isArray(order.items)
    ? order.items.map(normalizeOrderItem)
    : [];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
    0,
  );

  return {
    id: order.id || order._id || order.orderCode || `order_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    orderCode: order.orderCode || order.code || "",
    userId: order.userId || order.customer || "",
    customerEmail: order.customerEmail || "",
    customerName: order.customerName || "",
    trackingNumber: order.trackingNumber || "",
    items,
    address: order.address || null,
    paymentMethod: order.paymentMethod || "COD",
    paymentProvider: order.paymentProvider || "",
    paymentUrl: order.paymentUrl || order.paymongo?.checkoutUrl || "",
    status: statusFromWorkflow(order),
    workflowStatus: order.workflowStatus || "",
    workflowLabel: order.workflowLabel || "",
    estimatedDelivery: order.estimatedDelivery || "",
    estimatedArrival: order.estimatedArrival || "",
    installationDate: order.installationDate || "",
    assignedTechnician: order.assignedTechnician || "",
    receipt: order.receipt || null,
    refundReview: order.refundReview || null,
    cancellationRequest: order.cancellationRequest || null,
    customerBranch: order.customerBranch || "",
    stockSourceBranch: order.stockSourceBranch || "",
    cancelledAt: order.cancelledAt || null,
    cancellationReason: order.cancellationReason || "",
    deliveryStatus:
      deliveryStatusFromWorkflow(order.workflowStatus, order.deliveryStatus),
    paymentStatus:
      paymentStatusFromOrder(order),
    serviceRequestId: order.serviceRequestId || "",
    subtotal: Number(order.subtotal || order.subtotalAmount || order.receipt?.subtotalAmount || subtotal),
    vatAmount: Number(order.vatAmount || order.receipt?.vatAmount || 0),
    shippingFee: Number(order.shippingFee || order.deliveryFee || order.receipt?.shippingFee || 0),
    discountAmount: Number(order.discountAmount || 0),
    total: Number(order.total || order.totalAmount || order.receipt?.amountPaid || subtotal),
    createdAt,
    updatedAt: order.updatedAt || createdAt,
  };
}

function mergeOrders(primary = [], secondary = []) {
  const byId = new Map();
  [...secondary, ...primary].forEach((order) => {
    const normalized = normalizeOrder(order);
    byId.set(String(normalized.id), normalized);
  });
  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
  );
}

async function fetchBackendOrders() {
  const token = await getStoredToken();
  if (!token) return [];
  const response = await fetch(`${API_BASE}/orders/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Unable to fetch backend orders.");
  const data = await response.json().catch(() => ({}));
  return Array.isArray(data?.orders) ? data.orders.map(normalizeOrder) : [];
}

export async function getAllOrders({ sync = true } = {}) {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, []);
  const localOrders = Array.isArray(parsed) ? parsed.map(normalizeOrder) : [];

  if (!sync) return localOrders;

  try {
    const backendOrders = await fetchBackendOrders();
    const merged = mergeOrders(backendOrders, localOrders);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return localOrders;
  }
}

export async function saveAllOrders(orders = []) {
  const normalized = orders.map(normalizeOrder);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function getOrderById(orderId) {
  const orders = await getAllOrders();
  return (
    orders.find(
      (item) =>
        String(item.id) === String(orderId) ||
        String(item.orderCode || "") === String(orderId),
    ) || null
  );
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

export async function requestOrderCancellation(orderId, reason = "") {
  const token = await getStoredToken();
  if (!token) throw new Error("Please sign in again before cancelling this order.");
  const response = await fetch(`${API_BASE}/orders/me/${encodeURIComponent(orderId)}/cancel-request`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Unable to request cancellation.");
  }
  const normalized = data.order ? normalizeOrder(data.order) : null;
  if (normalized) {
    const orders = await getAllOrders({ sync: false });
    await saveAllOrders([normalized, ...orders.filter((item) => String(item.id) !== String(normalized.id))]);
  }
  return {
    order: normalized,
    message: data.message || "Cancellation request submitted.",
  };
}
