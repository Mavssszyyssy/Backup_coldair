import SearchableSelect from "../../common/SearchableSelect";
import LoadingSkeleton from "../../common/LoadingSkeleton";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { countInquiryWords, validateContactReply, MESSAGE_MAX_CHARACTERS, MESSAGE_MAX_WORDS } from "../../../domain/contactInquiryValidation";
import { apiRequest } from "../../../config/api";
import { formatBusinessDateTime } from "../../../utils/dateTime";
import { useUser } from "../../../context/UserContext";
import { translateText } from "../../../utils/customerI18n";
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

const dateTime = (value) => formatBusinessDateTime(value);

function SupportText({ text = "", t }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const content = typeof text === "string" ? text : "";
  const long = content.length > 600 || content.split("\n").length > 8;
  return <>
    <p id={id} className={long ? `contact-detail__text ${expanded ? "is-expanded" : "is-collapsed"}` : "contact-detail__text"}>{content}</p>
    {long ? <button type="button" className="contact-detail__expand" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((value) => !value)}>{t(expanded ? "Show less" : "Show full message")}</button> : null}
  </>;
}

export default function AdminContactMessages({ recordId = "" }) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [summary, setSummary] = useState({ total: 0, new: 0, active: 0, resolved: 0 });
  const [replyDraft, setReplyDraft] = useState({ ticketId: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const load = useCallback(async (fresh = false) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    const showMessages = (result) => {
      if (version !== requestVersion.current) return;
      const next = Array.isArray(result.messages) ? result.messages : [];
      setMessages(next);
      setPagination(result.pagination || { page, pages: 1, total: next.length });
      setSummary(result.counts || { total: next.length, new: 0, active: 0, resolved: 0 });
      setSelectedId((current) => recordId && next.some((item) => item.id === recordId)
        ? recordId
        : current && next.some((item) => item.id === current) ? current : next[0]?.id || "");
      setLoading(false);
    };
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const options = fresh ? { fresh: true } : { onCached: showMessages };
      showMessages(await apiRequest(`/contact-messages?${params}`, options));
    } catch (requestError) {
      if (version === requestVersion.current) {
        if ([401, 403].includes(requestError.status)) showMessages({});
        setError(requestError.message || "Unable to load customer messages.");
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [recordId, page, search, statusFilter]);

  useEffect(() => {
    load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  const selected = messages.find((item) => item.id === selectedId) || null;
  // Keep a draft tied to its ticket so a delayed selection effect cannot erase
  // text entered immediately after the detail view appears.
  const reply = replyDraft.ticketId === selectedId ? replyDraft.text : "";
  const replyError = reply ? validateContactReply(reply) : "";

  const save = async (payload) => {
    if (!selected) return;
    if (Object.prototype.hasOwnProperty.call(payload, "adminReply")) {
      const validationError = validateContactReply(payload.adminReply);
      if (validationError) { setError(validationError); return; }
    }
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest(`/contact-messages/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMessages((items) => items.map((item) => item.id === selected.id ? result.message : item));
      await load();
      if (Object.prototype.hasOwnProperty.call(payload, "adminReply")) setReplyDraft({ ticketId: selected.id, text: "" });
    } catch (requestError) {
      setError(requestError.message || "Unable to update this message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="contact-inbox">
      <div className="contact-inbox__summary">
        <article><span>{t("All messages")}</span><strong>{summary.total}</strong><small>{t("Customer support inbox")}</small></article>
        <article className="is-new"><span>{t("Needs review")}</span><strong>{summary.new}</strong><small>{t("New messages")}</small></article>
        <article className="is-active"><span>{t("In progress")}</span><strong>{summary.active}</strong><small>{t("Being handled")}</small></article>
        <article className="is-resolved"><span>{t("Completed")}</span><strong>{summary.resolved}</strong><small>{t("Resolved or closed")}</small></article>
      </div>

      {error ? <div className="contact-inbox__alert" role="alert">{t(error)}<button type="button" onClick={() => load(true)}>{t("Try again")}</button></div> : null}

      <div className="contact-inbox__toolbar">
        <label><span>{t("Search messages")}</span><input maxLength={160} type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("Reference, customer, subject, or message")} /></label>
        <label><span>{t("Status")}</span><SearchableSelect value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">{t("All statuses")}</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{t(statusLabel(status))}</option>)}</SearchableSelect></label>
        <button type="button" onClick={() => load(true)} disabled={loading}>{t(loading ? "Refreshing…" : "Refresh")}</button>
      </div>

      <div className="contact-inbox__workspace">
        <div className="contact-inbox__queue" aria-label={t("Customer message list")}>
          {loading ? <LoadingSkeleton label={t("Loading customer messages…")} /> : null}
          {!loading && !messages.length ? <div className="contact-inbox__empty">{t("No customer messages match the selected filters.")}</div> : null}
          {!loading && messages.map((item) => (
            <button key={item.id} type="button" className={item.id === selectedId ? "contact-message-card is-selected" : "contact-message-card"} onClick={() => { setSelectedId(item.id); setReplyDraft({ ticketId: item.id, text: "" }); }}>
              <span className={`contact-status contact-status--${item.status}`}>{t(statusLabel(item.status))}</span>
              <strong>{item.subject}</strong>
              <span>{item.customerName} · {item.ticketCode}</span>
              <p>{item.message}</p>
              <small>{item.branch || t("All branches")} · {dateTime(item.createdAt)}</small>
            </button>
          ))}
          {!loading && pagination.pages > 1 ? <nav className="contact-inbox__pagination" aria-label={t("Message pages")}><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>{t("Previous")}</button><span>{t("Page")} {pagination.page} {t("of")} {pagination.pages}</span><button type="button" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>{t("Next")}</button></nav> : null}
        </div>

        <div className="contact-inbox__detail">
          {!selected ? <div className="contact-inbox__empty">{t("Select a customer message to review it.")}</div> : (
            <>
              <div className="contact-detail__heading">
                <div><span>{t(CATEGORY_LABELS[selected.category] || "Customer message")}</span><h2>{selected.subject}</h2><p>{selected.ticketCode}</p></div>
                <span className={`contact-status contact-status--${selected.status}`}>{t(statusLabel(selected.status))}</span>
              </div>
              <dl className="contact-detail__customer">
                <div><dt>{t("Customer")}</dt><dd>{selected.customerName}</dd></div>
                <div><dt>{t("Email")}</dt><dd>{selected.email || t("Not provided")}</dd></div>
                <div><dt>{t("Phone")}</dt><dd>{selected.phone || t("Not provided")}</dd></div>
                <div><dt>{t("Routing")}</dt><dd>{selected.branch || t("All branches")} · {t(selected.source)}</dd></div>
              </dl>
              <div className="contact-detail__message"><span>{t("Customer message")}</span><SupportText key={selected.id} text={selected.message} t={t} /><small>{t("Received")} {dateTime(selected.createdAt)}</small></div>
              <label className="contact-detail__reply" htmlFor="contact-staff-reply"><span>{t("Reply to customer")}</span></label>
              <textarea id="contact-staff-reply" className="contact-detail__reply-input" rows="4" maxLength={MESSAGE_MAX_CHARACTERS} value={reply} disabled={busy} aria-describedby="contact-reply-count contact-reply-error" aria-invalid={!!replyError} onChange={(event) => setReplyDraft({ ticketId: selectedId, text: event.target.value })} placeholder={t("Write a clear update for the customer…")} />
              <small id="contact-reply-count" className="contact-detail__count">{countInquiryWords(reply)}/{MESSAGE_MAX_WORDS} {t("words")} · {reply.length}/{MESSAGE_MAX_CHARACTERS} {t("characters")}</small>
              <p id="contact-reply-error" className="contact-detail__validation" aria-live="polite">{t(replyError)}</p>
              <div className="contact-detail__actions">
                <button type="button" className="primary" disabled={busy || !reply.trim() || !!replyError || reply.trim() === (selected.adminReply || "")} onClick={() => save({ adminReply: reply, status: selected.status === "new" ? "in_progress" : selected.status })}>{t(busy ? "Saving…" : "Send Reply")}</button>
                {selected.status !== "in_progress" ? <button type="button" disabled={busy} onClick={() => save({ status: "in_progress" })}>{t("Mark In Progress")}</button> : null}
                {selected.status !== "resolved" ? <button type="button" disabled={busy} onClick={() => save({ status: "resolved" })}>{t("Mark Resolved")}</button> : null}
                {selected.status !== "new" ? <button type="button" disabled={busy} onClick={() => save({ status: "new" })}>{t("Reopen")}</button> : null}
              </div>
              {selected.timeline?.length ? <div className="contact-detail__timeline"><h3>{t("Activity")}</h3>{[...selected.timeline].reverse().map((event, index) => <div key={`${selected.id}-${event.createdAt}-${index}`}><span>{t(statusLabel(event.status))}</span><SupportText text={event.note} t={t} /><small>{event.actorName} · {dateTime(event.createdAt)}</small></div>)}</div> : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
