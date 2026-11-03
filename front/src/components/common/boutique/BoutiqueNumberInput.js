import { Minus, Plus } from "@phosphor-icons/react";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
  BQ_WEIGHTS,
} from "./BoutiqueTheme";

/**
 * BOUTIQUE NUMBER INPUT
 * A technical quantity/number selector with direct text input and step buttons.
 * Supports auto-comma formatting, custom step increments, and keyboard arrow controls.
 */
export default function BoutiqueNumberInput({
  value,
  onChange,
  min = 0,
  max = null,
  step = 1,
  size = "md", // "sm", "md", "lg"
  width = "auto",
  placeholder = "",
  strict = false,
  ariaLabel,
}) {
  const accessibleName = ariaLabel || placeholder || "Quantity";
  // Helper to format with commas
  const formatValue = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    if (strict && !/^\d+$/.test(String(val).replace(/,/g, ""))) return String(val);
    const num = parseInt(val.toString().replace(/,/g, ""));
    if (isNaN(num)) return "";
    return num.toLocaleString();
  };

  // Helper to get raw number
  const getRawNumber = (val) => {
    if (val === "" || val === null) return "";
    return parseInt(val.toString().replace(/,/g, "")) || 0;
  };

  const handleTextChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, "");
    if (strict) {
      onChange(rawValue);
      return;
    }
    if (rawValue === "") {
      onChange("");
      return;
    }
    const num = parseInt(rawValue);
    if (isNaN(num)) return;
    onChange(num);
  };

  const handleBlur = () => {
    if (strict) {
      const raw = String(value ?? "").trim();
      const parsed = Number(raw);
      if (/^\d+$/.test(raw) && Number.isSafeInteger(parsed) && parsed >= min && (max === null || parsed <= max)) onChange(parsed);
      return;
    }
    let num = getRawNumber(value);
    if (num === "") {
      onChange(min);
      return;
    }
    if (num < min) num = min;
    if (max !== null && num > max) num = max;
    onChange(num);
  };

  const increment = () => {
    if (strict && (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)))) return;
    const current = getRawNumber(value) || 0;
    const next = current + step;
    if (max !== null && next > max) onChange(max);
    else onChange(next);
  };

  const decrement = () => {
    if (strict && (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)))) return;
    const current = getRawNumber(value) || 0;
    const next = current - step;
    if (next < min) onChange(min);
    else onChange(next);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      increment();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrement();
    }
  };

  const heights = { sm: "40px", md: "56px", lg: "64px" };
  const fontSizes = { sm: "14px", md: "18px", lg: "20px" };
  const btnSizes = { sm: "30px", md: "40px", lg: "48px" };

  return (
    <div
      className="bq-number-input"
      style={{ height: heights[size], width: width }}
    >
      <button
        type="button"
        className="bq-num-btn"
        style={{ width: btnSizes[size], height: btnSizes[size] }}
        onClick={decrement}
        aria-label={`Decrease ${accessibleName}`}
        disabled={getRawNumber(value) <= min}
      >
        <Minus size={size === "sm" ? 14 : 18} weight="bold" />
      </button>

      <input
        type="text"
        className="bq-num-field"
        style={{ fontSize: fontSizes[size] }}
        value={formatValue(value)}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        inputMode="numeric"
        aria-label={accessibleName}
      />

      <button
        type="button"
        className="bq-num-btn"
        style={{ width: btnSizes[size], height: btnSizes[size] }}
        onClick={increment}
        aria-label={`Increase ${accessibleName}`}
        disabled={max !== null && getRawNumber(value) >= max}
      >
        <Plus size={size === "sm" ? 14 : 18} weight="bold" />
      </button>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-number-input {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px;
          background: ${BQ_COLORS.bg};
          border-radius: ${BQ_GEOMETRY.radiusPill};
          border: 1px solid ${BQ_COLORS.border};
          box-sizing: border-box;
          overflow: hidden;
        }

        .bq-num-btn {
          border-radius: 50%;
          border: none;
          background: ${BQ_COLORS.surface};
          color: ${BQ_COLORS.ink};
          cursor: pointer;
          display: flex;
          align-items: center; justify-content: center;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: ${BQ_SHADOWS.soft};
          flex-shrink: 0;
        }
        .bq-num-btn:hover:not(:disabled) { transform: scale(1.1); box-shadow: ${BQ_SHADOWS.float}; }
        .bq-num-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .bq-num-field {
          flex: 1;
          width: 0;
          min-width: 0;
          height: 100%;
          border: none;
          background: transparent;
          font-family: ${BQ_FONTS.heading};
          font-weight: ${BQ_WEIGHTS.bold};
          text-align: center;
          color: ${BQ_COLORS.ink};
          outline: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `,
        }}
      />
    </div>
  );
}
