import { CaretDown } from "@phosphor-icons/react";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
  BQ_WEIGHTS,
} from "./BoutiqueTheme";

/**
 * BOUTIQUE SELECT
 * A refined dropdown component for sorting and filtering.
 * CLEANED: Now uses the centralized Boutique.css for layout and strictly
 * scopes its state-based transitions via inline styles.
 */
export default function BoutiqueSelect({
  options = [],
  value,
  onChange,
  placeholder,
  ...props
}) {
  return (
    <div className="bq-select-container">
      <select
        className="bq-select-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>

      <div className="bq-select-icon">
        <CaretDown size={14} weight="bold" />
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-select-container {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .bq-select-field {
          appearance: none;
          padding: 12px 40px 12px 20px;
          border-radius: ${BQ_GEOMETRY.radiusPill};
          border: 1px solid ${BQ_COLORS.border};
          font-family: ${BQ_FONTS.heading};
          font-size: 13px;
          font-weight: ${BQ_WEIGHTS.semibold};
          background: ${BQ_COLORS.surface};
          box-shadow: ${BQ_SHADOWS.soft};
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          color: ${BQ_COLORS.ink};
        }

        .bq-select-field:focus-visible {
          outline: 3px solid ${BQ_COLORS.accent};
          outline-offset: 3px;
        }

        .bq-select-field:hover {
          box-shadow: ${BQ_SHADOWS.float};
          transform: translateY(-2px);
          border-color: ${BQ_COLORS.ink};
        }

        .bq-select-icon {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: ${BQ_COLORS.inkMuted};
          transition: transform 0.3s ease;
        }

        .bq-select-field:focus + .bq-select-icon {
          transform: translateY(-50%) rotate(180deg);
          color: ${BQ_COLORS.brand};
        }
      `,
        }}
      />
    </div>
  );
}
