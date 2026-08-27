import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../config/api";
import "./styles.css";

const STATUS_OPTIONS = ["new", "in_progress", "resolved", "closed"];
const CATEGORY_LABELS = {
  general: "General question",
  product: "Product question",
  order: "Order help",
  service: "Service or repair",
  warranty: "Warranty help",
  consultation: "Appointment request",
  other: "Other concern",
};

const statusLabel = (value) => ({
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
}[value] || value);

const dateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

export default function AdminContactMessages() {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/contact-messages");
      const next = Array.isArray(result.messages) ? result.messages : [];
      setMessages(next);
      setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id || "");
    } catch (requestError) {
      setError(requestError.message || "Unable to load customer messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return messages.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!needle) return true;
      return [item.ticketCode, item.customerName, item.email, item.phone, item.subject, item.message, item.branch]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [messages, search, statusFilter]);

  const selected = messages.find((item) => item.id === selectedId) || null;
  useEffect(() => { setReply(selected?.adminReply || ""); }, [selectedId, selected?.adminReply]);

  const summary = useMemo(() => ({
    total: messages.length,
    new: messages.filter((item) => item.status === "new").length,
    active: messages.filter((item) => item.status === "in_progress").length,
    resolved: messages.filter((item) => ["resolved", "closed"].includes(item.status)).length,
  }), [messages]);

  const save = async (payload) => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest(`/contact-messages/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMessages((items) => items.map((item) => item.id === selected.id ? result.message : item));
    } catch (requestError) {
      setError(requestError.message || "Unable to update this message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="contact-inbox">
      <div className="contact-inbox__summary">
        <article><span>All messages</span><strong>{summary.total}</strong><small>Customer support inbox</small></article>
        <article className="is-new"><span>Needs review</span><strong>{summary.new}</strong><small>New messages</small></article>
        <article className="is-active"><span>In progress</span><strong>{summary.active}</strong><small>Being handled</small></article>
        <article className="is-resolved"><span>Completed</span><strong>{summary.resolved}</strong><small>Resolved or closed</small></article>
      </div>

      {error ? <div className="contact-inbox__alert" role="alert">{error}<button type="button" onClick={load}>Try again</button></div> : null}

      <div className="contact-inbox__toolbar">
        <label><span>Search messages</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference, customer, subject, or message" /></label>
        <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
        <button type="button" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>

      <div className="contact-inbox__workspace">
        <div className="contact-inbox__queue" aria-label="Customer message list">
          {loading ? <div className="contact-inbox__empty">Loading customer messages…</div> : null}
          {!loading && !filtered.length ? <div className="contact-inbox__empty">No customer messages match the selected filters.</div> : null}
          {!loading && filtered.map((item) => (
            <button key={item.id} type="button" className={item.id === selectedId ? "contact-message-card is-selected" : "contact-message-card"} onClick={() => setSelectedId(item.id)}>
              <span className={`contact-status contact-status--${item.status}`}>{statusLabel(item.status)}</span>
              <strong>{item.subject}</strong>
              <span>{item.customerName} · {item.ticketCode}</span>
              <p>{item.message}</p>
              <small>{item.branch || "All branches"} · {dateTime(item.createdAt)}</small>
            </button>
          ))}
        </div>

        <div className="contact-inbox__detail">
          {!selected ? <div className="contact-inbox__empty">Select a customer message to review it.</div> : (
            <>
              <div className="contact-detail__heading">
                <div><span>{CATEGORY_LABELS[selected.category] || "Customer message"}</span><h2>{selected.subject}</h2><p>{selected.ticketCode}</p></div>
                <span className={`contact-status contact-status--${selected.status}`}>{statusLabel(selected.status)}</span>
              </div>
              <dl className="contact-detail__customer">
                <div><dt>Customer</dt><dd>{selected.customerName}</dd></div>
                <div><dt>Email</dt><dd>{selected.email || "Not provided"}</dd></div>
                <div><dt>Phone</dt><dd>{selected.phone || "Not provided"}</dd></div>
                <div><dt>Routing</dt><dd>{selected.branch || "All branches"} · {selected.source}</dd></div>
              </dl>
              <div className="contact-detail__message"><span>Customer message</span><p>{selected.message}</p><small>Received {dateTime(selected.createdAt)}</small></div>
              <label className="contact-detail__reply"><span>Reply to customer</span><textarea rows="5" maxLength={3000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a clear update for the customer…" /><small>{reply.length}/3000</small></label>
              <div className="contact-detail__actions">
                <button type="button" className="primary" disabled={busy || !reply.trim() || reply.trim() === (selected.adminReply || "")} onClick={() => save({ adminReply: reply, status: selected.status === "new" ? "in_progress" : selected.status })}>{busy ? "Saving…" : "Send Reply"}</button>
                {selected.status !== "in_progress" ? <button type="button" disabled={busy} onClick={() => save({ status: "in_progress" })}>Mark In Progress</button> : null}
                {selected.status !== "resolved" ? <button type="button" disabled={busy} onClick={() => save({ status: "resolved" })}>Mark Resolved</button> : null}
                {selected.status !== "new" ? <button type="button" disabled={busy} onClick={() => save({ status: "new" })}>Reopen</button> : null}
              </div>
              {selected.timeline?.length ? <div className="contact-detail__timeline"><h3>Activity</h3>{[...selected.timeline].reverse().map((event, index) => <div key={`${event.createdAt}-${index}`}><span>{statusLabel(event.status)}</span><p>{event.note}</p><small>{event.actorName} · {dateTime(event.createdAt)}</small></div>)}</div> : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
