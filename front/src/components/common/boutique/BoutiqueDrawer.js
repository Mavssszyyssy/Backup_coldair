import { X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { BQ_COLORS, BQ_FONTS } from "./BoutiqueTheme";
import { translateText } from "../../../utils/customerI18n";

/**
 * BOUTIQUE DRAWER
 * A unified sliding container for menus, carts, and other side-panels.
 * CLEANED: Now uses hardware-accelerated transforms and strictly
 * scopes its state-based translations via inline styles.
 */
export default function BoutiqueDrawer({
  isOpen,
  onClose,
  title,
  children,
  side = "right", // 'left' or 'right'
  width = "400px",
  currentLanguage = "English",
}) {
  const isLeft = side === "left";
  const closeLabel = `${translateText("Close", currentLanguage)} ${title || translateText("menu", currentLanguage)}`;
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => previousFocus?.focus?.();
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const focusable = [...(panelRef.current?.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])];
      if (!focusable.length) return;
      if (e.shiftKey && document.activeElement === focusable[0]) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        e.preventDefault();
        focusable[0].focus();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`bq-drawer-overlay ${isOpen ? "active" : ""}`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`bq-drawer-panel bq-drawer--${side}`}
        role="dialog"
        aria-modal={isOpen ? "true" : undefined}
        aria-label={title || translateText("Menu", currentLanguage)}
        aria-hidden={!isOpen}
        inert={!isOpen}
        style={{
          width: width,
          transform: isOpen
            ? "translateX(0)"
            : `translateX(${isLeft ? "-100%" : "100%"})`,
          left: isLeft ? 0 : "auto",
          right: isLeft ? "auto" : 0,
        }}
      >
        <div className="bq-drawer-header">
          <h2 className="bq-drawer-title">{title}</h2>
          <button ref={closeRef} type="button" className="bq-drawer-close" onClick={onClose} aria-label={closeLabel}>
            <X size={24} weight="bold" />
          </button>
        </div>

        <div className="bq-drawer-content">{children}</div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-drawer-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);
          z-index: 1500; opacity: 0; pointer-events: none;
          transition: opacity 0.4s ease;
        }
        .bq-drawer-overlay.active { opacity: 1; pointer-events: auto; }

        .bq-drawer-header {
          padding: 32px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid ${BQ_COLORS.border};
        }

        .bq-drawer-title {
          font-family: ${BQ_FONTS.heading};
          font-size: 20px; font-weight: 700; color: ${BQ_COLORS.ink};
          margin: 0; text-transform: uppercase; letter-spacing: 0.05em;
        }

        .bq-drawer-close {
          background: transparent; border: none; color: ${BQ_COLORS.ink};
          cursor: pointer; transition: transform 0.3s ease;
          display: flex; align-items: center; justify-content: center;
        }
        .bq-drawer-close:hover { transform: rotate(90deg); }
        .bq-drawer-close:focus-visible { outline: 3px solid ${BQ_COLORS.accent}; outline-offset: 3px; }

        .bq-drawer-content {
          flex: 1; overflow-y: auto;
          display: flex; flex-direction: column;
          scrollbar-width: thin;
        }
      `,
        }}
      />
    </>
  );
}
