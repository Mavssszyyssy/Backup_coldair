import { Info, WarningDiamond, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import "./GlobalDialog.css";

function GlobalDialog() {
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const busyRef = useRef(false);
  const queuedDialogRef = useRef(null);

  busyRef.current = busy;

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      window.dispatchEvent(
        new CustomEvent("app:dialog", {
          detail: { type: "alert", title: "Notice", message: String(message || "") },
        }),
      );
    };

    const handleDialogEvent = (event) => {
      if (busyRef.current) {
        if (typeof queuedDialogRef.current?.resolve === "function") queuedDialogRef.current.resolve(false);
        queuedDialogRef.current = event.detail;
        return;
      }
      setDialog((current) => {
        if (typeof current?.resolve === "function") current.resolve(false);
        return event.detail;
      });
      busyRef.current = false;
      setBusy(false);
      setError("");
    };

    window.addEventListener("app:dialog", handleDialogEvent);
    return () => {
      if (typeof queuedDialogRef.current?.resolve === "function") queuedDialogRef.current.resolve(false);
      queuedDialogRef.current = null;
      window.alert = originalAlert;
      window.removeEventListener("app:dialog", handleDialogEvent);
    };
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => cancelRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        if (typeof dialog.resolve === "function") dialog.resolve(false);
        setDialog(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [dialog]);

  if (!dialog) return null;

  const isConfirm = dialog.type === "confirm";
  const destructive = Boolean(dialog.destructive);

  const close = (value) => {
    if (busyRef.current) return;
    if (typeof dialog.resolve === "function") dialog.resolve(value);
    setDialog(null);
  };

  const confirm = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await Promise.resolve(dialog.onConfirm?.());
      if (typeof dialog.resolve === "function") dialog.resolve(true);
      const nextDialog = queuedDialogRef.current;
      queuedDialogRef.current = null;
      busyRef.current = false;
      setBusy(false);
      setDialog(nextDialog || null);
    } catch (requestError) {
      const nextDialog = queuedDialogRef.current;
      queuedDialogRef.current = null;
      if (nextDialog) {
        if (typeof dialog.resolve === "function") dialog.resolve(false);
        busyRef.current = false;
        setBusy(false);
        setDialog(nextDialog);
        return;
      }
      setError(requestError?.message || dialog.errorMessage || "Unable to complete this action. Please try again.");
      busyRef.current = false;
      setBusy(false);
    }
  };

  const title = dialog.title || (isConfirm ? "Please Confirm" : "Notice");

  return (
    <div className="app-dialog-layer">
      <div
        className="app-dialog-overlay"
        onMouseDown={() => {
          if (!isConfirm && !busy) close(true);
        }}
        role="presentation"
      />
      <section
        ref={dialogRef}
        className={`app-dialog${destructive ? " app-dialog--destructive" : ""}`}
        role={isConfirm ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
      >
        <button
          ref={!isConfirm ? cancelRef : undefined}
          type="button"
          className="app-dialog-close"
          onClick={() => close(false)}
          disabled={busy}
          aria-label="Close dialog"
        >
          <X size={20} weight="bold" />
        </button>

        <div className="app-dialog-icon" aria-hidden="true">
          {isConfirm ? <WarningDiamond size={42} weight="duotone" /> : <Info size={42} weight="duotone" />}
        </div>
        <h2 id="app-dialog-title" className="app-dialog-title">{title}</h2>
        <p id="app-dialog-message" className="app-dialog-message">{dialog.message}</p>
        {error ? <p className="app-dialog-error" role="alert">{error}</p> : null}

        <div className="app-dialog-actions">
          {isConfirm ? (
            <>
              <button
                ref={cancelRef}
                type="button"
                className="app-dialog-button app-dialog-button--cancel"
                onClick={() => close(false)}
                disabled={busy}
              >
                {dialog.cancelText || "Cancel"}
              </button>
              <button
                type="button"
                className={`app-dialog-button ${destructive ? "app-dialog-button--danger" : "app-dialog-button--confirm"}`}
                onClick={confirm}
                disabled={busy}
              >
                {busy ? (dialog.pendingText || "Processing...") : (dialog.confirmText || "Confirm")}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="app-dialog-button app-dialog-button--confirm"
              onClick={() => close(true)}
            >
              {dialog.confirmText || "Dismiss"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default GlobalDialog;
