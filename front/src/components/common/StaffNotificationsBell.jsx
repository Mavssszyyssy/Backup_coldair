import { Bell } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { useUser } from "../../context/UserContext";
import useAlerts from "../../hooks/useAlerts";
import { translateText } from "../../utils/customerI18n";
import { formatBusinessDateTime } from "../../utils/dateTime";
import { ArchiveAllAlerts, ArchivedAlertPages } from "./AlertArchiveControls";
import LoadingSkeleton from "./LoadingSkeleton";

export default function StaffNotificationsBell({ resolveRoute, superadmin = false }) {
  const { currentLanguage, isAuthenticated, user } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const { unreadCount, openAlerts, drawerProps } = useAlerts(isAuthenticated, user?.id || user?._id, resolveRoute);
  const {
    isOpen, onClose, folder, onChangeFolder, notifications, status, actionError, pendingAction,
    onRetry, onMoveAlert, onNotificationClick, onMarkAllAsRead, onArchiveAll,
    archivePage, hasMoreArchived, onArchivePageChange,
  } = drawerProps;
  const panel = useRef(null);
  const trigger = useRef(null);
  const prefix = superadmin ? "super-notifications" : "admin-notifications";
  const archived = folder === "archived";

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOutside = (event) => {
      if (!panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) onClose();
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [isOpen, onClose]);

  return (
    <div className={prefix}>
      <button ref={trigger} type="button" className={`${prefix}-${superadmin ? "button" : "btn"}`}
        onClick={isOpen ? onClose : openAlerts} aria-label={t("Open alerts")} aria-expanded={isOpen}>
        <Bell size={20} weight="bold" />
        {unreadCount > 0 && <span className={superadmin ? undefined : `${prefix}-badge`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {isOpen && <section ref={panel} className={`${prefix}-panel staff-alert-panel`} role="dialog" aria-label={t("Alerts")}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          onClose();
          trigger.current?.focus();
        }}>
        <div className={`${prefix}-head`}>
          {superadmin ? (
            <div className={`${prefix}-heading`}><span>{t("Alerts")}</span><small>{unreadCount ? `${unreadCount} ${t("unread")}` : t("All caught up")}</small></div>
          ) : <div className={`${prefix}-title`}>{t("Alerts")}</div>}
          <div className={`${prefix}-actions`}>
            <button type="button" className={`${prefix}-link`} onClick={onRetry} disabled={pendingAction || status === "loading"}>{t("Refresh")}</button>
            <button type="button" className={`${prefix}-link`} onClick={onMarkAllAsRead} disabled={pendingAction || archived || !unreadCount}>{t(superadmin ? "Mark read" : "Mark all as read")}</button>
          </div>
        </div>
        <div className={`${prefix}-tabs`} role="group" aria-label={t("Alert folders")}>
          {[["active", "Current"], ["archived", "Archived"]].map(([key, label]) => (
            <button key={key} type="button" aria-pressed={folder === key} className={folder === key ? "active" : ""}
              disabled={pendingAction} onClick={() => onChangeFolder(key)}>{t(label)}</button>
          ))}
        </div>
        {!archived && notifications.length > 0 && <ArchiveAllAlerts t={t} disabled={pendingAction} onArchive={onArchiveAll} />}
        {actionError && <p role="alert" className="staff-alert-feedback">{t(actionError)}</p>}
        {status === "error" && <p role="alert" className="staff-alert-feedback">{t("Unable to load alerts.")}</p>}
        {status === "loading" && !notifications.length ? <LoadingSkeleton label={t("Loading…")} variant="inline" /> : null}
        {status === "ready" && !notifications.length ? <p className={`${prefix}-empty`}>{t(archived ? "No archived alerts." : "No alerts right now.")}</p> : null}
        {notifications.length > 0 && <div className={`${prefix}-list`}>
          {notifications.map((item) => (
            <div className={`${prefix}-row`} key={item.id}>
              <button type="button" className={`${prefix}-item${item.unread ? " unread" : ""}`} disabled={pendingAction} onClick={() => onNotificationClick(item)}>
                <strong className={`${prefix}-item-title`}>{item.title || t("System alert")}</strong>
                <span className={`${prefix}-item-msg`}>{item.message || t("No additional details.")}</span>
                <small className={`${prefix}-item-time`}>{formatBusinessDateTime(item.createdAt)}</small>
              </button>
              {item.id && <button type="button" className={`${prefix}-archive`} disabled={pendingAction}
                aria-label={`${t(archived ? "Restore" : "Archive")}: ${item.title || t("System alert")}`}
                onClick={() => onMoveAlert(item)}>{t(archived ? "Restore" : "Archive")}</button>}
            </div>
          ))}
        </div>}
        {archived && <ArchivedAlertPages page={archivePage} hasMore={hasMoreArchived} onChange={onArchivePageChange}
          disabled={pendingAction || status === "loading"} t={t} />}
      </section>}
    </div>
  );
}
