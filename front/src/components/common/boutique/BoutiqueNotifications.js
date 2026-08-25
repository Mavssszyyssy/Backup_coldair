import { Bell, CheckCircle } from "@phosphor-icons/react";
import BoutiqueBox from "./BoutiqueBox";
import BoutiqueDrawer from "./BoutiqueDrawer";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS } from "./BoutiqueTheme";

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
      <BoutiqueBox
        className="bq-notif-wrapper"
        direction="column"
        height="100%"
        style={{ overflow: "hidden" }}
      >
        {hasNotifications && (
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
                  background={BQ_COLORS.danger}
                  color="white"
                  padding="4px 10px"
                  size="10px"
                  weight={800}
                  style={{
                    borderRadius: "6px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  YOU HAVE {unreadCount} NEW ALERT{unreadCount > 1 ? "S" : ""}
                </BoutiqueText>
              ) : (
                <BoutiqueText
                  className="bq-all-read-tag"
                  size="10px"
                  weight={800}
                  color={BQ_COLORS.inkMuted}
                  style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
                >
                  NO NEW ALERTS
                </BoutiqueText>
              )}
            </BoutiqueBox>
            {unreadCount > 0 && (
              <button className="bq-mark-all-btn" onClick={onMarkAllAsRead}>
                <CheckCircle size={18} weight="bold" /> Mark all read
              </button>
            )}
          </BoutiqueBox>
        )}

        <BoutiqueBox
          flex={1}
          className="bq-notif-list"
          style={{ overflowY: "auto" }}
        >
          {notifications.length === 0 ? (
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
                Your inbox is empty.
              </BoutiqueText>
            </BoutiqueBox>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                className={`bq-notif-item ${notif.unread ? "unread" : ""}`}
                onClick={() => onNotificationClick?.(notif)}
              >
                <div className="bq-notif-dot" />
                <BoutiqueBox flex={1} className="bq-notif-content">
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
            ))
          )}
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

        .bq-notif-list::-webkit-scrollbar { display: none; }
        .bq-notif-list { scrollbar-width: none; }

        .bq-notif-item {
            display: flex; gap: 16px; padding: 24px 32px; background: white;
            border: none; border-bottom: 1px solid ${BQ_COLORS.border};
            text-align: left; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative; width: 100%;
        }
        .bq-notif-item:hover { background: ${BQ_COLORS.bg}; }

        .bq-notif-dot {
            width: 8px; height: 8px; border-radius: 50%; background: ${BQ_COLORS.accent};
            margin-top: 6px; flex-shrink: 0; opacity: 0; transform: scale(0);
            transition: all 0.3s ease;
        }
        .bq-notif-item.unread .bq-notif-dot { opacity: 1; transform: scale(1); }

        .bq-notif-item.unread { background: rgba(37, 99, 235, 0.01); }
        .bq-notif-item.unread:hover { background: rgba(37, 99, 235, 0.03); }
      `,
        }}
      />
    </BoutiqueDrawer>
  );
}
