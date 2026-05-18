import { Bell, CheckCircle } from "@phosphor-icons/react";
import BoutiqueDrawer from "./BoutiqueDrawer";
import { BQ_COLORS, BQ_FONTS } from "./BoutiqueTheme";

/**
 * BOUTIQUE NOTIFICATIONS
 * High-end side drawer for user alerts and activity.
 */
export default function BoutiqueNotifications({
  isOpen,
  onClose,
  notifications = [],
  onNotificationClick,
  onMarkAllAsRead,
}) {
  const hasNotifications = notifications.length > 0;
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <BoutiqueDrawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      width="440px"
      title="Alerts"
    >
      <div className="bq-notif-wrapper">
        {hasNotifications && (
          <div className="bq-notif-header-extra">
            <div className="bq-notif-summary">
              {unreadCount > 0 ? (
                <span className="bq-unread-tag">
                  YOU HAVE {unreadCount} NEW ALERT{unreadCount > 1 ? "S" : ""}
                </span>
              ) : (
                <span className="bq-all-read-tag">NO NEW ALERTS</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="bq-mark-all-btn" onClick={onMarkAllAsRead}>
                <CheckCircle size={18} weight="bold" /> Mark all read
              </button>
            )}
          </div>
        )}

        <div className="bq-notif-list">
          {notifications.length === 0 ? (
            <div className="bq-notif-empty">
              <Bell size={64} weight="bold" />
              <p>Your inbox is empty.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                className={`bq-notif-item ${notif.unread ? "unread" : ""}`}
                onClick={() => onNotificationClick?.(notif.id)}
              >
                <div className="bq-notif-dot" />
                <div className="bq-notif-content">
                  <div className="bq-notif-row">
                    <span className="bq-notif-title">{notif.title}</span>
                    <span className="bq-notif-time">{notif.time}</span>
                  </div>
                  <p className="bq-notif-msg">{notif.message}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-notif-wrapper { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

        .bq-notif-header-extra {
            padding: 16px 32px; border-bottom: 1px solid ${BQ_COLORS.border};
            display: flex; align-items: center; justify-content: space-between;
            background: ${BQ_COLORS.bgAlt};
        }

        .bq-unread-tag {
            background: ${BQ_COLORS.danger}; color: white; padding: 4px 10px;
            border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .bq-all-read-tag {
            color: ${BQ_COLORS.inkMuted}; font-size: 10px; font-weight: 800; letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        .bq-mark-all-btn {
            background: none; border: none; color: ${BQ_COLORS.inkMuted};
            font-family: ${BQ_FONTS.heading}; font-size: 12px; font-weight: 700;
            cursor: pointer; display: flex; align-items: center; gap: 6px;
            transition: color 0.2s;
        }
        .bq-mark-all-btn:hover { color: ${BQ_COLORS.ink}; }

        .bq-notif-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; scrollbar-width: none; }
        .bq-notif-list::-webkit-scrollbar { display: none; }

        .bq-notif-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: ${BQ_COLORS.inkFaint}; padding-top: 60px; }
        .bq-notif-empty p { font-family: ${BQ_FONTS.heading}; font-weight: 700; margin-top: 16px; }

        .bq-notif-item {
            display: flex; gap: 16px; padding: 24px 32px; background: white;
            border: none; border-bottom: 1px solid ${BQ_COLORS.border};
            text-align: left; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
        }
        .bq-notif-item:hover { background: ${BQ_COLORS.bg}; }

        .bq-notif-dot {
            width: 8px; height: 8px; border-radius: 50%; background: ${BQ_COLORS.accent};
            margin-top: 6px; flex-shrink: 0; opacity: 0; transform: scale(0);
            transition: all 0.3s ease;
        }
        .bq-notif-item.unread .bq-notif-dot { opacity: 1; transform: scale(1); }

        .bq-notif-content { flex: 1; }
        .bq-notif-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; gap: 12px; }

        .bq-notif-title { font-family: ${BQ_FONTS.heading}; font-size: 15px; font-weight: 700; color: ${BQ_COLORS.ink}; }
        .bq-notif-time { font-size: 11px; font-weight: 600; color: ${BQ_COLORS.inkFaint}; text-transform: uppercase; }

        .bq-notif-msg { font-size: 14px; color: ${BQ_COLORS.inkMuted}; line-height: 1.5; margin: 0; }

        .bq-notif-item.unread { background: rgba(37, 99, 235, 0.01); }
        .bq-notif-item.unread:hover { background: rgba(37, 99, 235, 0.03); }
      `,
        }}
      />
    </BoutiqueDrawer>
  );
}
