import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../config/api";
import { getNotificationId } from "../domain/notifications/notificationIdentity";
import { resolveCustomerNotificationRoute } from "../domain/notifications/resolveCustomerNotificationRoute";
import { announceNotificationUpdate, subscribeToNotificationUpdates } from "../utils/notificationSync";

const emptyFolders = {
  active: { items: [], status: "loading" },
  archived: { items: [], status: "loading" },
};

export default function useAlerts(isAuthenticated, accountId, resolveRoute = resolveCustomerNotificationRoute) {
  const navigate = useNavigate();
  const sessionRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [folder, setFolder] = useState("active");
  const [archivePage, setArchivePage] = useState(1);
  const [folders, setFolders] = useState(emptyFolders);
  const [pendingAction, setPendingAction] = useState(false);
  const [actionError, setActionError] = useState("");

  const refresh = useCallback(async function load(target, invalidate = false) {
    const session = sessionRef.current;
    if (!session) return;
    const inFlight = session.requests[target];
    if (inFlight) {
      if (invalidate) inFlight.stale = true;
      return;
    }

    const request = { stale: false };
    session.requests[target] = request;
    const isCurrent = () => sessionRef.current === session && !request.stale;
    setFolders((current) => ({
      ...current,
      [target]: { ...current[target], status: "loading" },
    }));
    try {
      const url = target === "archived"
        ? `/notifications/me?view=archived${session.archivePage > 1 ? `&page=${session.archivePage}` : ""}`
        : "/notifications/me";
      const response = await apiRequest(url, { silentConnection: true, fresh: invalidate });
      const items = (response.notifications || []).map((item) => ({
        ...item,
        id: getNotificationId(item),
        unread: target === "active" && Boolean(item.unread),
        time: new Date(item.createdAt).toLocaleString(),
      }));
      if (isCurrent()) {
        const unreadCount = response.unreadCount ?? items.filter((item) => item.unread).length;
        setFolders((current) => ({ ...current, [target]: { items, status: "ready", unreadCount, hasMore: Boolean(response.hasMore) } }));
      }
    } catch {
      if (isCurrent()) {
        setFolders((current) => ({ ...current, [target]: { ...current[target], status: "error" } }));
      }
    } finally {
      delete session.requests[target];
      if (sessionRef.current === session && request.stale) void load(target, true);
    }
  }, []);

  useEffect(() => {
    setFolders(emptyFolders);
    setIsOpen(false);
    setFolder("active");
    setArchivePage(1);
    setPendingAction(false);
    setActionError("");
    if (!isAuthenticated) return undefined;

    const session = { requests: {}, pending: false, archiveVisited: false, archivePage: 1 };
    sessionRef.current = session;
    void refresh("active");
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh("active");
    };
    const poll = window.setInterval(refreshWhenVisible, 20000);
    const unsubscribe = subscribeToNotificationUpdates(() => {
      void refresh("active", true);
      if (session.archiveVisited) void refresh("archived", true);
    });
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      sessionRef.current = null;
      window.clearInterval(poll);
      unsubscribe();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [accountId, isAuthenticated, refresh]);

  useEffect(() => {
    if (!isOpen || folder !== "archived" || !sessionRef.current) return;
    sessionRef.current.archiveVisited = true;
    void refresh("archived");
  }, [folder, isOpen, refresh]);

  const changeFolder = (target) => {
    setActionError("");
    setFolder(target);
  };

  const changeArchivePage = (page) => {
    const session = sessionRef.current;
    if (!session || session.pending || page < 1 || page === session.archivePage) return;
    session.archivePage = page;
    setArchivePage(page);
    setFolders((current) => ({ ...current, archived: emptyFolders.archived }));
    void refresh("archived", true);
  };

  const updateAlerts = async (path, apply, errorMessage = "", body) => {
    const session = sessionRef.current;
    if (!session || session.pending) return false;
    session.pending = true;
    setPendingAction(true);
    setActionError("");
    try {
      await apiRequest(path, { method: "PATCH", silentConnection: true, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (sessionRef.current !== session) return false;
      setFolders(apply);
      announceNotificationUpdate();
      return true;
    } catch {
      if (sessionRef.current === session) setActionError(errorMessage);
      return false;
    } finally {
      session.pending = false;
      if (sessionRef.current === session) setPendingAction(false);
    }
  };

  const markRead = (id) => (current) => ({
    ...current,
    active: {
      ...current.active,
      unreadCount: id ? Math.max(0, (current.active.unreadCount || 0) - Number(current.active.items.some((item) => item.id === id && item.unread))) : 0,
      items: current.active.items.map((item) => (
        !id || item.id === id ? { ...item, unread: false } : item
      )),
    },
  });

  const handleAlertClick = async (item) => {
    const session = sessionRef.current;
    if (session?.pending) return;
    if (item.unread && item.id) {
      await updateAlerts(`/notifications/${encodeURIComponent(item.id)}/read`, markRead(item.id));
    }
    if (!session || sessionRef.current !== session) return;
    setIsOpen(false);
    const route = resolveRoute(item);
    if (route) navigate(route);
  };

  const moveAlert = (item) => {
    const restoring = folder === "archived";
    return updateAlerts(
      `/notifications/${encodeURIComponent(item.id)}/${restoring ? "restore" : "archive"}`,
      (current) => ({
        ...current,
        [folder]: {
          ...current[folder],
          unreadCount: restoring ? current[folder].unreadCount
            : Math.max(0, (current.active.unreadCount || 0) - Number(Boolean(item.unread))),
          items: current[folder].items.filter((entry) => entry.id !== item.id),
        },
      }),
      restoring ? "Unable to restore this alert." : "Unable to archive this alert.",
    );
  };

  const unreadCount = folders.active.unreadCount || 0;
  return {
    unreadCount,
    openAlerts: () => { changeFolder("active"); setIsOpen(true); },
    drawerProps: {
      isOpen: isAuthenticated && isOpen,
      onClose: () => setIsOpen(false),
      folder,
      onChangeFolder: changeFolder,
      notifications: folders[folder].items,
      status: folders[folder].status,
      actionError,
      pendingAction,
      onRetry: () => refresh(folder, true),
      archivePage,
      hasMoreArchived: folders.archived.hasMore,
      onArchivePageChange: changeArchivePage,
      onMoveAlert: moveAlert,
      onArchiveSelected: (ids) => {
        const selected = new Set(ids);
        return updateAlerts("/notifications/me/archive-selected", (current) => {
          const remaining = current.active.items.filter((item) => !selected.has(item.id));
          const archivedUnread = current.active.items.filter((item) => item.unread && selected.has(item.id)).length;
          return {
            ...current,
            active: {
              ...current.active,
              items: remaining,
              unreadCount: Math.max(0, (current.active.unreadCount || 0) - archivedUnread),
            },
          };
        }, "Unable to archive selected alerts.", { ids });
      },
      onArchiveAll: () => updateAlerts("/notifications/me/archive-all", (current) => ({
        ...current,
        active: { ...current.active, items: [], unreadCount: 0 },
      }), "Unable to archive alerts."),
      onNotificationClick: handleAlertClick,
      onMarkAllAsRead: () => updateAlerts("/notifications/me/read-all", markRead(), "Unable to mark alerts as read."),
    },
  };
}
