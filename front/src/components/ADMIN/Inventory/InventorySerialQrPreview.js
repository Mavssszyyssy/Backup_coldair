import { Copy, QrCode, X } from "@phosphor-icons/react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "../../../context/UserContext";
import { translateText } from "../../../utils/customerI18n";

const HOVER_OPEN_DELAY_MS = 650;
const HOVER_CLOSE_DELAY_MS = 1200;

const getUnitKey = (unit, index) =>
  unit?.qrUnitId || unit?.serialNumber || `unit-${index}`;

const getProductModel = (product) =>
  product?.model || product?.modelName || product?.specs || product?.sku || "Model not recorded";

function InventorySerialQrPreview({ product, branch, placement = "bottom" }) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const units = useMemo(
    () =>
      (product?.serialUnits || []).filter(
        (unit) => !unit?.branch || unit.branch === branch,
      ),
    [branch, product?.serialUnits],
  );
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [copied, setCopied] = useState(false);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const clearOpenTimer = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  useEffect(() => {
    setOpen(false);
    setPinned(false);
    setSelectedKey("");
    setCopied(false);
  }, [branch, product?.id]);

  useEffect(() => () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  const selectedUnit =
    units.find((unit, index) => getUnitKey(unit, index) === selectedKey) ||
    units[0];

  const openPreview = () => {
    if (!units.length) return;
    clearOpenTimer();
    clearCloseTimer();
    setSelectedKey((current) => current || getUnitKey(units[0], 0));
    setOpen(true);
  };

  const scheduleOpen = () => {
    if (!units.length || open || openTimerRef.current) return;
    clearCloseTimer();
    openTimerRef.current = window.setTimeout(openPreview, HOVER_OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    clearOpenTimer();
    clearCloseTimer();
    if (pinned) return;
    closeTimerRef.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  };

  const closePreview = () => {
    clearOpenTimer();
    clearCloseTimer();
    setPinned(false);
    setOpen(false);
  };

  const copySerial = async () => {
    const serial = String(selectedUnit?.serialNumber || "").trim();
    if (!serial || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(serial);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (_error) {
      // The serial remains selectable when clipboard permission is unavailable.
    }
  };

  if (!units.length) {
    return <span className="inventory-serial-empty">{t("No unit QR")}</span>;
  }

  return (
    <div
      className="inventory-serial-preview-wrap"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="inventory-serial-trigger"
        aria-expanded={open}
        aria-label={`${t('View serial and QR records for')} ${product?.name || t("AC unit")}`}
        onFocus={openPreview}
        onClick={() => {
          if (open && pinned) {
            closePreview();
            return;
          }
          openPreview();
          setPinned(true);
        }}
      >
        <QrCode size={17} weight="bold" />
        <span>{t("Serial / QR")}</span>
        <small>{units.length}</small>
      </button>

      {open && selectedUnit ? (
        <section
          className={`inventory-serial-preview inventory-serial-preview--${placement}`}
          role="dialog"
          aria-label={t("AC unit serial and QR preview")}
          onMouseEnter={openPreview}
          onMouseLeave={scheduleClose}
        >
          <button
            type="button"
            className="inventory-serial-preview-close"
            onClick={closePreview}
            aria-label={t("Close serial and QR details")}
          >
            <X size={15} weight="bold" />
          </button>
          <div className="inventory-serial-preview-heading">
            <div>
              <strong>{product?.name || t("AC Unit")}</strong>
              <span>{getProductModel(product)}</span>
            </div>
            <span className="inventory-serial-status">
              {t(selectedUnit.status || "available")}
            </span>
          </div>

          {units.length > 1 ? (
            <label className="inventory-serial-picker">
              {t("Select AC unit")}
              <select
                value={getUnitKey(selectedUnit, units.indexOf(selectedUnit))}
                onChange={(event) => setSelectedKey(event.target.value)}
              >
                {units.map((unit, index) => (
                  <option key={getUnitKey(unit, index)} value={getUnitKey(unit, index)}>
                    {unit.serialNumber || unit.qrUnitId || `${t('Unit')} ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="inventory-serial-preview-content">
            <div className="inventory-serial-details">
              <span>{t("Serial Number")}</span>
              <code title={t("Serial number is selectable")}>
                {selectedUnit.serialNumber || t("Not recorded")}
              </code>
              <button
                type="button"
                className="inventory-serial-copy"
                onClick={copySerial}
                disabled={!selectedUnit.serialNumber}
              >
                <Copy size={14} weight="bold" />
                {t(copied ? "Copied" : "Copy serial")}
              </button>

              <span>{t("Unit ID")}</span>
              <code title={t("Permanent QR unit identifier")}>
                {selectedUnit.qrUnitId || t("Not recorded")}
              </code>

              <span>{t("Branch")}</span>
              <strong>{selectedUnit.branch || branch || t("Not recorded")}</strong>
            </div>

            <div className="inventory-serial-qr">
              {selectedUnit.qrCode ? (
                <QRCodeCanvas
                  value={selectedUnit.qrCode}
                  size={116}
                  level="M"
                  includeMargin
                />
              ) : (
                <div className="inventory-serial-qr-empty">{t("No stored QR")}</div>
              )}
              <small>{t("Saved QR record")}</small>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default InventorySerialQrPreview;
