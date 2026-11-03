import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
  BQ_WEIGHTS,
} from "./BoutiqueTheme";

/**
 * BOUTIQUE SEARCH INPUT
 * A specialized search field with an integrated Phosphor icon.
 * CLEANED: Now uses the centralized Boutique.css for layout and strictly
 * scopes its state-based transitions via inline styles.
 */
export default function BoutiqueSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  ...props
}) {
  return (
    <div className="bq-search-container">
      <MagnifyingGlass className="bq-search-icon" size={18} weight="bold" />
      <input
        type="text"
        className="bq-search-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-search-container {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .bq-search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: ${BQ_COLORS.inkFaint};
          z-index: 5;
          pointer-events: none;
        }

        .bq-search-field {
          width: 100%;
          padding: 14px 18px;
          padding-left: 48px;
          background: ${BQ_COLORS.surface};
          border: 1px solid ${BQ_COLORS.border};
          border-radius: ${BQ_GEOMETRY.radiusPill};
          font-family: ${BQ_FONTS.body};
          font-size: 14px;
          font-weight: ${BQ_WEIGHTS.medium};
          color: ${BQ_COLORS.ink};
          box-shadow: ${BQ_SHADOWS.soft};
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
        }

        .bq-search-field:focus {
          box-shadow: ${BQ_SHADOWS.float};
          transform: translateY(-2px);
          border-color: ${BQ_COLORS.brand};
        }

        .bq-search-field:focus ~ .bq-search-icon {
          color: ${BQ_COLORS.brand};
        }
      `,
        }}
      />
    </div>
  );
}
