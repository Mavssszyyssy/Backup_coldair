import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../../config/api";

const statusLabel = (value = "new") => String(value).replace(/_/g, " ");

const dateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function ContactHistory({ messageId = "" }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const selectedRef = useRef(null);
  const lastScrolledRef = useRef("");

  const load = useCallback(async ({ background = false } = {}) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!background) setLoading(true);
    try {
      const result = await apiRequest("/contact-messages/me", { silentConnection: background });
      if (!mountedRef.current) return;
      setMessages(Array.isArray(result.messages) ? result.messages : []);
      setError("");
    } catch (requestError) {
      if (mountedRef.current) setError(requestError.message || "Unable to load your support messages.");
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") load({ background: true });
    };
    const refreshWhenFocused = () => load({ background: true });
    const pollId = window.setInterval(refreshWhenVisible, 15000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenFocused);
    return () => {
      mountedRef.current = false;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenFocused);
    };
  }, [load]);

  const orderedMessages = useMemo(() => {
    if (!messageId) return messages;
    const selected = messages.find((item) => String(item.id || item._id) === String(messageId));
    return selected
      ? [selected, ...messages.filter((item) => String(item.id || item._id) !== String(messageId))]
      : messages;
  }, [messageId, messages]);

  useEffect(() => {
    if (!messageId || !selectedRef.current || lastScrolledRef.current === String(messageId)) return;
    lastScrolledRef.current = String(messageId);
    selectedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    selectedRef.current.focus({ preventScroll: true });
  }, [messageId, orderedMessages]);

  if (!loading && !error && messages.length === 0) return null;

  return (
    <section className="contact-history" aria-labelledby="contact-history-title">
      <div className="contact-history__heading">
        <div>
          <span className="contact-section-eyebrow">Support history</span>
          <h2 id="contact-history-title">My Support Messages</h2>
          <p>Replies update automatically while this page is open.</p>
        </div>
        <button type="button" onClick={() => load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>

      {error ? <div className="contact-history__error" role="alert">{error}</div> : null}
      {loading && messages.length === 0 ? <p className="contact-history__empty">Loading your messages…</p> : null}
      <div className="contact-history__list">
        {orderedMessages.map((item) => {
          const id = String(item.id || item._id);
          const selected = Boolean(messageId) && id === String(messageId);
          return (
            <article
              key={id}
              ref={selected ? selectedRef : null}
              tabIndex={selected ? -1 : undefined}
              className={`contact-history__item${selected ? " is-selected" : ""}`}
            >
              <div className="contact-history__meta">
                <strong>{item.subject}</strong>
                <span>{item.ticketCode} · {statusLabel(item.status)}</span>
              </div>
              <p>{item.message}</p>
              <small>Sent {dateTime(item.createdAt)}</small>
              {item.adminReply ? (
                <div className="contact-history__reply">
                  <strong>Support reply</strong>
                  <p>{item.adminReply}</p>
                  {item.repliedAt ? <small>Replied {dateTime(item.repliedAt)}</small> : null}
                </div>
              ) : <div className="contact-history__waiting">Waiting for a support reply.</div>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
