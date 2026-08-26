import { Bell } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../config/api";
import {
  getAdminNotificationsReadAt,
  markAllAdminNotificationsRead,
} from "../../../utils/adminNotifications";

const adminRouteAliases = {
  "/admin/orders": "/admin/services/orders",
  "/admin/maintenance": "/admin/services/service-requests",
  "/admin/service-requests": "/admin/services/service-requests",
  "/admin/technicians": "/admin/services/technicians",
};

const resolveNotificationRoute = (item = {}) => {
  if (String(item.route || "").startsWith("/admin/")) {
    return adminRouteAliases[item.route] || item.route;
  }
  const targetType = String(item.targetType || item.category || "").toLowerCase();
  if (["inventory", "stock", "reorder"].includes(targetType)) return "/admin/inventory";
  if (["warranty", "claim"].includes(targetType)) return "/admin/services/service-requests";
  if (["service", "parts_request"].includes(targetType)) return "/admin/services/service-requests";
  if (["task", "technician"].includes(targetType)) return "/admin/services/technicians";
  const text = `${item.title || ""} ${item.message || ""}`.toLowerCase();
  if (text.includes("stock") || text.includes("inventory")) return "/admin/reorder";
  if (text.includes("task") || text.includes("technician")) return "/admin/services/technicians";
  if (item.type === "order" || text.includes("order")) return "/admin/services/orders";
  return "/admin/dashboard";
};

function AdminNotificationsBell() {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const refreshInFlightRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [readAt, setReadAt] = useState(() => getAdminNotificationsReadAt());
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setBusy(true);
    try {
      const [notificationResult, lowStockResult, ordersResult] = await Promise.all([
        apiRequest("/notifications/me", { silentConnection: true }).catch(() => ({ notifications: [] })),
        apiRequest("/products/low-stock", { silentConnection: true }).catch(() => ({ products: [] })),
        apiRequest("/orders?summary=alerts", { silentConnection: true }).catch(() => ({ summary: { pendingOrders: 0 } })),
      ]);

      const lowStockCount = (lowStockResult.products || []).filter(
        (p) => Number(p.stock || 0) < 5,
      ).length;

      const pendingOrders = Number(ordersResult.summary?.pendingOrders || 0);

      const backendItems = (notificationResult.notifications || []).map((item) => ({
        ...item,
        id: item.id || item._id,
        createdAt: item.createdAt || new Date().toISOString(),
        to: resolveNotificationRoute(item),
        source: "backend",
        unread: Boolean(item.unread),
      }));

      const next = [...backendItems];
      if (lowStockCount > 0) {
        next.push({
          id: "low-stock",
          createdAt: new Date().toISOString(),
          title: "Low stock items",
          message: `${lowStockCount} item(s) have < 5 units remaining.`,
          to: "/admin/reorder",
          source: "local",
        });
      }
      if (pendingOrders > 0) {
        next.push({
          id: "pending-orders",
          createdAt: new Date().toISOString(),
          title: "Pending orders",
          message: `${pendingOrders} pending order(s) are older than 24 hours.`,
          to: "/admin/services/orders",
          source: "local",
        });
      }
      setItems(next);
    } finally {
      setBusy(false);
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const pollId = window.setInterval(refreshWhenVisible, 45000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const onClickOutside = (event) => {
      const target = event.target;
      if (!open) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const unreadCount = useMemo(() => {
    const readAtDate = readAt ? new Date(readAt) : null;
    return items.filter((item) => {
      if (item.source === "backend") return Boolean(item.unread);
      if (!readAtDate) return true;
      const created = new Date(item.createdAt);
      if (Number.isNaN(created.getTime())) return true;
      return created.getTime() > readAtDate.getTime();
    }).length;
  }, [items, readAt]);

  const onMarkAllRead = async () => {
    try {
      await apiRequest("/notifications/me/read-all", { method: "PATCH" });
    } catch (_error) {
      // Local alert state can still be marked read if the request is retried later.
    }
    const next = markAllAdminNotificationsRead();
    setReadAt(next);
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const onNavigate = async (item) => {
    if (!item?.to) return;
    if (item.source === "backend" && item.unread && item.id) {
      try {
        await apiRequest(`/notifications/${item.id}/read`, { method: "PATCH" });
        setItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id ? { ...entry, unread: false } : entry,
          ),
        );
      } catch (_error) {
        // Navigation remains useful even if read-state fails.
      }
    }
    setOpen(false);
    navigate(item.to);
  };

  return (
    <div className="admin-notifications">
      <button
        ref={buttonRef}
        type="button"
        className="admin-notifications-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open notifications"
      >
        <Bell size={20} weight="bold" />
        {unreadCount > 0 ? (
          <span className="admin-notifications-badge">{unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div
          className="admin-notifications-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="admin-notifications-head">
            <div className="admin-notifications-title">Notifications</div>
            <div className="admin-notifications-actions">
              <button
                type="button"
                className="admin-notifications-link"
                onClick={refresh}
                disabled={busy}
              >
                {busy ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                className="admin-notifications-link"
                onClick={onMarkAllRead}
              >
                Mark all as read
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="admin-notifications-empty">
              No alerts right now.
            </div>
          ) : (
            <div className="admin-notifications-list">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-notifications-item ${item.unread ? "unread" : ""}`}
                  onClick={() => onNavigate(item)}
                >
                  <div className="admin-notifications-item-title">
                    {item.title}
                  </div>
                  <div className="admin-notifications-item-msg">
                    {item.message}
                  </div>
                  <time className="admin-notifications-item-time">
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default AdminNotificationsBell;
