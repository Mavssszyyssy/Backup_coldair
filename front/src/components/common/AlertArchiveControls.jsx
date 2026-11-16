import { useRef, useState } from "react";
import "./AlertArchiveControls.css";

export function ArchiveAllAlerts({ onArchive, disabled, selection, onArchiveSelected, t }) {
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef(null);
  const hasSelection = Boolean(selection?.selectedIds.length);
  return (
    <div className="alert-archive-controls">
      {selection && <SelectAlerts selection={selection} disabled={disabled || confirming} onArchive={onArchiveSelected} t={t} />}
      <button ref={trigger} type="button" disabled={disabled || confirming || hasSelection} onClick={() => setConfirming(true)}>{t("Archive all")}</button>
      {confirming && (
        <div className="alert-archive-confirm" role="group" aria-label={t("Archive all alerts?")}>
          <p>{t("All current alerts will move to Archived.")}</p>
          <button autoFocus type="button" disabled={disabled} onClick={() => {
            setConfirming(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}>{t("Cancel")}</button>
          <button type="button" disabled={disabled || hasSelection} onClick={async () => {
            if (await onArchive()) setConfirming(false);
          }}>{t("Archive all alerts")}</button>
        </div>
      )}
    </div>
  );
}

export function SelectAlerts({ selection, disabled, onArchive, t }) {
  const count = selection.selectedIds.length;
  if (!selection.available) return null;
  return (
    <>
      <label className="alert-select-all">
        <input type="checkbox" checked={selection.allSelected} disabled={disabled}
          ref={(input) => { if (input) input.indeterminate = count > 0 && !selection.allSelected; }}
          onChange={selection.toggleAll} />
        {t("Select all shown")}
      </label>
      <button type="button" disabled={disabled || !count} onClick={async () => {
        if (await onArchive(selection.selectedIds)) selection.clear();
      }}>
        {t("Archive selected")}{count ? ` (${count})` : ""}
      </button>
    </>
  );
}

export function AlertCheckbox({ item, selection, disabled, t }) {
  return <label className="alert-item-selection">
    <input type="checkbox" aria-label={`${t("Select alert")}: ${item.title || t("System alert")}`}
      checked={selection.isSelected(item.id)} disabled={disabled} onChange={() => selection.toggle(item.id)} />
  </label>;
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
