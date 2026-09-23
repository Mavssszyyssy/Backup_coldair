import { operationalAlertRoute } from "../../../domain/operationalAlerts";
import { Bell } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../config/api";
import { announceNotificationUpdate, subscribeToNotificationUpdates } from "../../../utils/notificationSync";

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
  if (["order", "payment", "delivery", "service", "warranty", "technician"].includes(item.type)) return operationalAlertRoute(item, "admin");
  const targetType = String(item.targetType || item.category || "").toLowerCase();
  if (["amp_pipeline", "maintenance_pipeline"].includes(targetType)) return "/manager/amp";
  if (["contact", "contact_message"].includes(targetType)) return "/admin/services?tab=customer-messages";
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
  const refreshInFlightRef = useRef({ active: false, archived: false });
  const loadedViewsRef = useRef({ active: false, archived: false });

  const [open, setOpen] = useState(false);
  const [itemsByView, setItemsByView] = useState({ active: [], archived: [] });
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("active");
  const items = itemsByView[view] || [];

  const refresh = useCallback(async (targetView = "active", { showBusy = true } = {}) => {
    if (refreshInFlightRef.current[targetView]) return;
    refreshInFlightRef.current[targetView] = true;
    if (showBusy) setBusy(true);
    try {
      const notificationResult = await apiRequest(`/notifications/me?view=${targetView}`, { silentConnection: true });
      const backendItems = (notificationResult.notifications || []).map((item) => ({
        ...item,
        id: item.id || item._id,
        createdAt: item.createdAt || new Date().toISOString(),
        to: resolveNotificationRoute(item),
        source: "backend",
        unread: Boolean(item.unread),
      }));
      setItemsByView((current) => ({ ...current, [targetView]: backendItems }));
      loadedViewsRef.current[targetView] = true;
      setUnreadCount((current) => Number(
        notificationResult.unreadCount
        ?? (targetView === "active" ? backendItems.filter((item) => item.unread).length : current),
      ) || 0);
    } catch (_error) {
      // Keep the last synchronized result during a temporary connection issue.
    } finally {
      if (showBusy) setBusy(false);
      refreshInFlightRef.current[targetView] = false;
    }
  }, []);

  const onArchive = async (item) => {
    if (!item.id) return;
    try {
      await apiRequest(`/notifications/${item.id}/${view === "archived" ? "restore" : "archive"}`, { method: "PATCH" });
      setItemsByView((current) => {
        const source = view;
        const destination = view === "archived" ? "active" : "archived";
        const moved = view === "archived"
          ? { ...item, archivedAt: null, unread: false }
          : { ...item, archivedAt: new Date().toISOString(), unread: false };
        return {
          ...current,
          [source]: current[source].filter((entry) => entry.id !== item.id),
          [destination]: [moved, ...current[destination].filter((entry) => entry.id !== item.id)],
        };
      });
      if (view === "active" && item.unread) setUnreadCount((current) => Math.max(0, current - 1));
      announceNotificationUpdate();
    } catch (_error) {
      // Keep the item visible when the archive request does not complete.
    }
  };

  useEffect(() => {
    refresh(view);
    if (view === "active" && !loadedViewsRef.current.archived) refresh("archived", { showBusy: false });
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh(view, { showBusy: false });
    };
    const refreshWhenFocused = () => refresh(view, { showBusy: false });
    const pollId = view === "active" ? window.setInterval(refreshWhenVisible, 15000) : null;
    const unsubscribe = subscribeToNotificationUpdates(() => refresh("active", { showBusy: false }));
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenFocused);
    return () => {
      if (pollId) window.clearInterval(pollId);
      unsubscribe();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenFocused);
    };
  }, [refresh, view]);

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

  const onMarkAllRead = async () => {
    try {
      await apiRequest("/notifications/me/read-all", { method: "PATCH" });
      setItemsByView((current) => ({ ...current, active: current.active.map((item) => ({ ...item, unread: false })) }));
      setUnreadCount(0);
      announceNotificationUpdate();
    } catch (_error) {
      // Keep the server-backed unread state when the update does not complete.
    }
  };

  const onNavigate = async (item) => {
    if (!item?.to) return;
    if (item.unread && item.id) {
      try {
        await apiRequest(`/notifications/${item.id}/read`, { method: "PATCH" });
        setItemsByView((current) => ({ ...current, [view]: current[view].map((entry) =>
            entry.id === item.id ? { ...entry, unread: false } : entry,
          ) }));
        setUnreadCount((current) => Math.max(0, current - 1));
        announceNotificationUpdate();
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
                onClick={() => refresh(view)}
                disabled={busy}
              >
                {busy ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                className="admin-notifications-link"
                onClick={onMarkAllRead}
                disabled={view === "archived" || unreadCount === 0}
              >
                Mark all as read
              </button>
            </div>
          </div>
          <div className="admin-notifications-tabs" role="tablist" aria-label="Notification folders">
            {[["active", "Current"], ["archived", "Archive"]].map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={view === key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{label}</button>)}
          </div>

          {items.length === 0 ? (
            <div className="admin-notifications-empty">
              No alerts right now.
            </div>
          ) : (
            <div className="admin-notifications-list">
              {items.map((item) => (
                <div className="admin-notifications-row" key={item.id}>
                  <button type="button" className={`admin-notifications-item ${item.unread ? "unread" : ""}`} onClick={() => onNavigate(item)}>
                    <div className="admin-notifications-item-title">{item.title}</div>
                    <div className="admin-notifications-item-msg">{item.message}</div>
                    <time className="admin-notifications-item-time">{new Date(item.createdAt).toLocaleString()}</time>
                  </button>
                  <button type="button" className="admin-notifications-archive" onClick={() => onArchive(item)}>{view === "archived" ? "Restore" : "Archive"}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default AdminNotificationsBell;
