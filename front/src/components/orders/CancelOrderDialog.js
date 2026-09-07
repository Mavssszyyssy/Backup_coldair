import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./CancelOrderDialog.css";

export default function CancelOrderDialog({ order, onClose, onConfirm }) {
  const dialogRef = useRef(null);
  const submitting = useRef(false);
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const paidOnline = order.paymentProvider === "paymongo" && order.paymentStatus === "paid";

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  const dismiss = () => { if (!submitting.current) onClose(); };
  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!reason.trim()) { setError("Please tell us why you want to cancel this order."); return; }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await onConfirm(order, reason.trim());
      onClose();
    } catch (err) {
      setError(err?.message || "Unable to submit your request. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return createPortal(
    <dialog ref={dialogRef} className="cancel-order-dialog" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); dismiss(); }}
      onClick={event => { if (event.target === dialogRef.current) dismiss(); }}>
      <form onSubmit={submit} className="cancel-order-dialog__content" aria-busy={busy}>
        <header className="cancel-order-dialog__header">
          <div><p className="cancel-order-dialog__eyebrow">ORDER SUPPORT</p><h2 id={titleId}>{paidOnline ? "Request cancellation" : "Cancel this order?"}</h2></div>
          <button type="button" className="cancel-order-dialog__close" aria-label="Close cancellation dialog" disabled={busy} onClick={dismiss}>×</button>
        </header>
        <p className="cancel-order-dialog__order">Order #{order.orderCode || order.id}</p>
        <p className="cancel-order-dialog__description">{paidOnline
          ? "Your branch team will review your cancellation and refund request. Submitting this request does not issue an automatic refund."
          : "You can cancel before your order is dispatched. Please share a short reason so we can assist you."}</p>
        <label htmlFor={reasonId}>Reason for cancellation <span aria-hidden="true">*</span></label>
        <textarea id={reasonId} value={reason} onChange={event => { setReason(event.target.value); setError(""); }}
          placeholder="Tell us why you’d like to cancel…" rows={4} maxLength={500} disabled={busy}
          aria-invalid={Boolean(error)} aria-describedby={error ? reasonId + "-error" : undefined} autoFocus />
        <div className="cancel-order-dialog__count">{reason.length}/500</div>
        {error ? <p id={reasonId + "-error"} className="cancel-order-dialog__error" role="alert">{error}</p> : null}
        <footer className="cancel-order-dialog__actions">
          <button type="button" className="cancel-order-dialog__keep" disabled={busy} onClick={dismiss}>Keep my order</button>
          <button type="submit" className="cancel-order-dialog__submit" disabled={busy}>{busy ? "Submitting…" : paidOnline ? "Submit request" : "Confirm cancellation"}</button>
        </footer>
      </form>
    </dialog>, document.body,
  );
}
