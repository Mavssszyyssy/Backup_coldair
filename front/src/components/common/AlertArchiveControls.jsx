import { useRef, useState } from "react";
import "./AlertArchiveControls.css";

export function ArchiveAllAlerts({ onArchive, disabled, t }) {
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef(null);
  return (
    <div className="alert-archive-controls">
      <button ref={trigger} type="button" disabled={disabled || confirming} onClick={() => setConfirming(true)}>{t("Archive all")}</button>
      {confirming && (
        <div className="alert-archive-confirm" role="group" aria-label={t("Archive all alerts?")}>
          <p>{t("All current alerts will move to Archived.")}</p>
          <button autoFocus type="button" disabled={disabled} onClick={() => {
            setConfirming(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}>{t("Cancel")}</button>
          <button type="button" disabled={disabled} onClick={async () => {
            if (await onArchive()) setConfirming(false);
          }}>{t("Archive all alerts")}</button>
        </div>
      )}
    </div>
  );
}

export function ArchivedAlertPages({ page, hasMore, onChange, disabled, t }) {
  if (!onChange || (page === 1 && !hasMore)) return null;
  return (
    <nav className="alert-archive-controls alert-archive-pages" aria-label={t("Archived alerts pages")}>
      <button type="button" disabled={disabled || page === 1} onClick={() => onChange(page - 1)}>{t("Previous page")}</button>
      <span>{t("Page")} {page}</span>
      <button type="button" disabled={disabled || !hasMore} onClick={() => onChange(page + 1)}>{t("Next page")}</button>
    </nav>
  );
}
