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

export default function useCustomerAlerts(isAuthenticated, accountId) {
  const navigate = useNavigate();
  const sessionRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [folder, setFolder] = useState("active");
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
      const url = target === "archived" ? "/notifications/me?view=archived" : "/notifications/me";
      const response = await apiRequest(url, { silentConnection: true });
      const items = (response.notifications || []).map((item) => ({
        ...item,
        id: getNotificationId(item),
        unread: target === "active" && Boolean(item.unread),
        time: new Date(item.createdAt).toLocaleString(),
      }));
      if (isCurrent()) {
        setFolders((current) => ({ ...current, [target]: { items, status: "ready" } }));
      }
    } catch {
      if (isCurrent()) {
        setFolders((current) => ({ ...current, [target]: { ...current[target], status: "error" } }));
      }
    } finally {
      delete session.requests[target];
      if (sessionRef.current === session && request.stale) void load(target);
    }
  }, []);

  useEffect(() => {
    setFolders(emptyFolders);
    setIsOpen(false);
    setFolder("active");
    setPendingAction(false);
    setActionError("");
    if (!isAuthenticated) return undefined;

    const session = { requests: {}, pending: false, archiveVisited: false };
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
    return () => {
      sessionRef.current = null;
      window.clearInterval(poll);
      unsubscribe();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
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

  const updateAlerts = async (path, apply, errorMessage = "") => {
    const session = sessionRef.current;
    if (!session || session.pending) return false;
    session.pending = true;
    setPendingAction(true);
    setActionError("");
    try {
      await apiRequest(path, { method: "PATCH", silentConnection: true });
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
    navigate(resolveCustomerNotificationRoute(item));
  };

  const moveAlert = (item) => {
    const restoring = folder === "archived";
    return updateAlerts(
      `/notifications/${encodeURIComponent(item.id)}/${restoring ? "restore" : "archive"}`,
      (current) => ({
        ...current,
        [folder]: {
          ...current[folder],
          items: current[folder].items.filter((entry) => entry.id !== item.id),
        },
      }),
      restoring ? "Unable to restore this alert." : "Unable to archive this alert.",
    );
  };

  const unreadCount = folders.active.items.filter((item) => item.unread).length;
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
      onRetry: () => refresh(folder),
      onMoveAlert: moveAlert,
      onNotificationClick: handleAlertClick,
      onMarkAllAsRead: () => updateAlerts("/notifications/me/read-all", markRead(), "Unable to mark alerts as read."),
    },
  };
}
