import { Archive, ArrowCounterClockwise, Bell, CheckCircle } from "@phosphor-icons/react";
import { useRef } from "react";
import BoutiqueBox from "./BoutiqueBox";
import BoutiqueDrawer from "./BoutiqueDrawer";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS } from "./BoutiqueTheme";
import { translateText } from "../../../utils/customerI18n";

/**
 * BOUTIQUE NOTIFICATIONS
 * High-end side drawer for user notifications and activity.
 */
export default function BoutiqueNotifications({
  isOpen,
  onClose,
  notifications = [],
  onNotificationClick,
  onMarkAllAsRead,
  folder = "active",
  onChangeFolder,
  status = "ready",
  pendingAction = false,
  actionError,
  onMoveAlert,
  onRetry,
  currentLanguage = "English",
}) {
  const t = (value) => translateText(value, currentLanguage);
  const folderControls = useRef(null);
  const archived = folder === "archived";
  const moveLabel = t(archived ? "Restore" : "Archive");
  const MoveIcon = archived ? ArrowCounterClockwise : Archive;
  const hasNotifications = notifications.length > 0;
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <BoutiqueDrawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      width="min(440px, 100vw)"
      title={t("Alerts")}
      currentLanguage={currentLanguage}
    >
      <BoutiqueBox
        className="bq-notif-wrapper"
        direction="column"
        height="100%"
        style={{ overflow: "hidden" }}
      >
        {onChangeFolder && (
          <div ref={folderControls} className="bq-notif-folders" role="group" aria-label={t("Alert folders")}>
            <button type="button" aria-pressed={!archived} onClick={() => onChangeFolder("active")}>{t("Current")}</button>
            <button type="button" aria-pressed={archived} onClick={() => onChangeFolder("archived")}>{t("Archived")}</button>
          </div>
        )}
        {!archived && hasNotifications && (
          <BoutiqueBox
            direction="row"
            align="center"
            justify="space-between"
            padding="16px 32px"
            background={BQ_COLORS.bgAlt}
            className="bq-notif-header-extra"
            style={{ borderBottom: `1px solid ${BQ_COLORS.border}` }}
          >
            <BoutiqueBox className="bq-notif-summary">
              {unreadCount > 0 ? (
                <BoutiqueText
                  className="bq-unread-tag"
                  color="white"
                  size="10px"
                  weight={800}
                  style={{
                    borderRadius: "6px",
                    backgroundColor: BQ_COLORS.danger,
                    padding: "5px 10px",
                    display: "inline-block",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {currentLanguage === "Filipino" ? `${unreadCount} ${t("new alerts")}` : `YOU HAVE ${unreadCount} NEW ALERT${unreadCount > 1 ? "S" : ""}`}
                </BoutiqueText>
              ) : (
                <BoutiqueText
                  className="bq-all-read-tag"
                  size="10px"
                  weight={800}
                  color={BQ_COLORS.inkMuted}
                  style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
                >
                  {t("NO NEW ALERTS")}
                </BoutiqueText>
              )}
            </BoutiqueBox>
            {unreadCount > 0 && (
              <button type="button" className="bq-mark-all-btn" onClick={onMarkAllAsRead} disabled={pendingAction}>
                <CheckCircle size={18} weight="bold" /> {t("Mark all read")}
              </button>
            )}
          </BoutiqueBox>
        )}

        {actionError && <p role="alert" className="bq-notif-feedback">{t(actionError)}</p>}
        {status === "error" && (
          <div className="bq-notif-feedback">
            <span role="alert">{t("Unable to load alerts.")}</span>
            <button type="button" onClick={onRetry}>{t("Try again")}</button>
          </div>
        )}
        <BoutiqueBox
          key={folder}
          flex={1}
          className="bq-notif-list"
          style={{ overflowY: "auto" }}
        >
          {!hasNotifications && status === "loading" && <p role="status" className="bq-notif-feedback">{t("Loading…")}</p>}
          {!hasNotifications && status === "ready" && (
            <BoutiqueBox
              align="center"
              justify="center"
              height="100%"
              color={BQ_COLORS.inkFaint}
              padding="60px 0"
              className="bq-notif-empty"
            >
              <Bell size={64} weight="bold" />
              <BoutiqueText variant="h3" margin="16px 0 0" weight={700}>
                {t(archived ? "No archived alerts." : "Your inbox is empty.")}
              </BoutiqueText>
            </BoutiqueBox>
          )}
          {notifications.map((notif) => (
            <div className={`bq-notif-entry ${notif.unread ? "unread" : ""}`} key={notif.id}>
              <button
                type="button"
                className="bq-notif-item"
                aria-label={`${t(archived ? "Archived" : notif.unread ? "Unread" : "Read")} ${t("alert:")} ${notif.title}`}
                disabled={pendingAction}
                onClick={() => onNotificationClick?.(notif)}
              >
                <div className="bq-notif-dot" />
                <BoutiqueBox flex={1} className="bq-notif-content">
                  {["maintenance_due", "amp_due_soon", "amp_overdue"].includes(notif.category) ? (
                    <span className={`bq-notif-category ${notif.severity || "info"}`}>{t("AC maintenance")}</span>
                  ) : null}
                  <BoutiqueBox
                    direction="row"
                    justify="space-between"
                    align="baseline"
                    margin="0 0 4px"
                    gap={12}
                    className="bq-notif-row"
                  >
                    <BoutiqueText
                      weight={700}
                      size="15px"
                      color={BQ_COLORS.ink}
                      className="bq-notif-title"
                    >
                      {notif.title}
                    </BoutiqueText>
                    <BoutiqueText
                      size="11px"
                      weight={600}
                      color={BQ_COLORS.inkFaint}
                      className="bq-notif-time"
                      style={{ textTransform: "uppercase" }}
                    >
                      {notif.time}
                    </BoutiqueText>
                  </BoutiqueBox>
                  <BoutiqueText
                    size="14px"
                    color={BQ_COLORS.inkMuted}
                    style={{ lineHeight: 1.5 }}
                    className="bq-notif-msg"
                  >
                    {notif.message}
                  </BoutiqueText>
                </BoutiqueBox>
              </button>
              {onMoveAlert && notif.id && (
                <button
                  type="button"
                  className="bq-notif-move"
                  aria-label={`${moveLabel}: ${notif.title}`}
                  disabled={pendingAction}
                  onClick={async (event) => {
                    const button = event.currentTarget;
                    const moved = await onMoveAlert(notif);
                    if (moved && (document.activeElement === button || document.activeElement === document.body)) {
                      folderControls.current?.querySelector('[aria-pressed="true"]')?.focus();
                    }
                  }}
                >
                  <MoveIcon size={16} aria-hidden="true" /> {moveLabel}
                </button>
              )}
            </div>
          ))}
        </BoutiqueBox>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-mark-all-btn {
            background: none; border: none; color: ${BQ_COLORS.inkMuted};
            font-family: inherit; font-size: 12px; font-weight: 700;
            cursor: pointer; display: flex; align-items: center; gap: 6px;
            transition: color 0.2s;
        }
        .bq-mark-all-btn:hover { color: ${BQ_COLORS.ink}; }
        .bq-notif-wrapper button:disabled { cursor: wait; }
        .bq-notif-folders {
            display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;
            padding: 12px clamp(12px, 5vw, 32px); border-bottom: 1px solid ${BQ_COLORS.border};
        }
        .bq-notif-folders button, .bq-notif-move, .bq-notif-feedback button {
            min-height: 44px; padding: 6px 12px; border: 1px solid ${BQ_COLORS.border};
            border-radius: 8px; background: ${BQ_COLORS.surface}; color: ${BQ_COLORS.ink};
            font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; overflow-wrap: anywhere;
        }
        .bq-notif-folders button[aria-pressed="true"] {
            background: ${BQ_COLORS.bgAlt}; border-color: ${BQ_COLORS.accent};
            box-shadow: inset 0 -2px ${BQ_COLORS.accent};
        }
        .bq-notif-feedback { padding: 12px clamp(12px, 5vw, 32px); color: ${BQ_COLORS.ink}; }
        .bq-notif-feedback button { margin-inline-start: 8px; }
        .bq-notif-header-extra { flex-wrap: wrap; gap: 8px; }

        .bq-notif-list::-webkit-scrollbar { display: none; }
        .bq-notif-list { scrollbar-width: none; }

        .bq-notif-entry {
            display: flex; flex-direction: column; align-items: flex-end;
            border-inline-start: 4px solid transparent; border-bottom: 1px solid ${BQ_COLORS.border};
            background: ${BQ_COLORS.surface};
        }
        .bq-notif-entry.unread { background: #f8fbff; border-inline-start-color: ${BQ_COLORS.accent}; }
        :root[data-theme="dark"] .bq-notif-entry.unread { background: ${BQ_COLORS.bgAlt}; }
        .bq-notif-item {
            display: flex; gap: 12px; padding: 16px clamp(12px, 5vw, 28px); background: transparent;
            border: none; text-align: left; cursor: pointer; width: 100%;
        }
        .bq-notif-item:hover, .bq-notif-move:hover { background: ${BQ_COLORS.bg}; }
        .bq-notif-content { min-width: 0; overflow-wrap: anywhere; }
        .bq-notif-row { flex-wrap: wrap; }
        .bq-notif-move {
            display: inline-flex; align-items: center; gap: 6px;
            margin: 0 clamp(12px, 5vw, 28px) 12px;
        }

        .bq-notif-dot {
            width: 8px; height: 8px; border-radius: 50%; background: ${BQ_COLORS.accent};
            margin-top: 6px; flex-shrink: 0; opacity: 0; transform: scale(0);
            transition: all 0.3s ease;
        }
        .bq-notif-entry.unread .bq-notif-dot { opacity: 1; transform: scale(1); }
        .bq-notif-category {
            display: inline-flex; width: fit-content; margin-bottom: 7px; padding: 3px 8px;
            border-radius: 999px; background: #dbeafe; color: #1d4ed8;
            font-size: 10px; line-height: 1.2; font-weight: 800; letter-spacing: .05em; text-transform: uppercase;
        }
        .bq-notif-category.warning { background: #fef3c7; color: #92400e; }
        .bq-notif-category.critical { background: #fee2e2; color: #b91c1c; }
      `,
        }}
      />
    </BoutiqueDrawer>
  );
}
