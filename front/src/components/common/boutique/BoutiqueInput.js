import { Eye, EyeSlash, WarningDiamond } from "@phosphor-icons/react";
import { useState } from "react";
import BoutiqueBox from "./BoutiqueBox";
import BoutiqueStack from "./BoutiqueStack";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS, BQ_GEOMETRY, BQ_SHADOWS } from "./BoutiqueTheme";

/**
 * BOUTIQUE INPUT
 * Unified field element for text, password, tel, number, and select.
 */
export default function BoutiqueInput({
  label,
  icon: Icon,
  type = "text",
  status = null, // null, 'error', 'success'
  errorMessage,
  hint,
  options = [], // For select type
  inlineAction, // For buttons inside the field (e.g., Verify)
  children, // For block content below the field (e.g., Strength Meter)
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPassword ? "text" : "password") : type;

  const getStatusClass = () => {
    if (status === "error") return "bq-input--error";
    if (status === "success") return "bq-input--success";
    return "";
  };

  return (
    <BoutiqueStack
      gap={8}
      width="100%"
      className={`bq-input-group ${getStatusClass()}`}
      style={{ "--field-accent": BQ_COLORS.inkFaint }}
    >
      {label && (
        <BoutiqueText
          variant="label"
          className="bq-input-label"
          color={BQ_COLORS.ink}
        >
          {label}
        </BoutiqueText>
      )}

      <BoutiqueBox
        className="bq-input-field-area"
        style={{
          position: "relative",
          width: "100%",
          transition: "all 0.3s ease",
        }}
      >
        {Icon && <Icon size={18} weight="bold" className="bq-input-icon" />}

        {type === "select" ? (
          <select
            className={`bq-input-field bq-input-select ${isPassword ? "has-pass" : ""} ${inlineAction ? "has-action" : ""}`}
            {...props}
          >
            {props.placeholder && <option value="">{props.placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={actualType}
            className={`bq-input-field ${isPassword ? "has-pass" : ""} ${inlineAction ? "has-action" : ""}`}
            {...props}
          />
        )}

        {/* Right-side overlays */}
        <BoutiqueBox
          direction="row"
          align="center"
          gap={8}
          className="bq-input-overlays"
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        >
          {isPassword && (
            <button
              type="button"
              className="bq-input-pass-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          )}
          {inlineAction}
        </BoutiqueBox>
      </BoutiqueBox>

      {children}

      {status === "error" && errorMessage && (
        <BoutiqueBox
          direction="row"
          align="center"
          gap={6}
          margin="4px 0 0"
          padding="0 0 0 4px"
          className="bq-input-error-msg bq-slide-down"
        >
          <WarningDiamond size={14} weight="bold" />
          <BoutiqueText size="12px" weight={700} color={BQ_COLORS.danger}>
            {errorMessage}
          </BoutiqueText>
        </BoutiqueBox>
      )}

      {hint && (
        <BoutiqueText
          size="11px"
          weight={600}
          color={BQ_COLORS.inkMuted}
          margin="4px 0 0"
          className="bq-input-hint"
        >
          {hint}
        </BoutiqueText>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-input-group:focus-within { --field-accent: ${BQ_COLORS.brand}; }
        .bq-input--error { --field-accent: ${BQ_COLORS.danger} !important; }
        .bq-input--success { --field-accent: ${BQ_COLORS.success} !important; }

        .bq-input-field {
          width: 100%;
          padding: 16px 20px;
          padding-left: ${Icon ? "48px" : "20px"};
          padding-right: 20px;
          background: ${BQ_COLORS.surfaceAlt};
          border: 1.5px solid var(--field-accent);
          border-radius: ${BQ_GEOMETRY.radiusMd};
          font-family: inherit;
          font-size: 15px;
          color: ${BQ_COLORS.ink};
          transition: all 0.3s ease;
          outline: none;
        }

        /* Responsive Right Padding */
        .bq-input-field.has-pass { padding-right: 54px; }
        .bq-input-field.has-action { padding-right: 88px; }
        .bq-input-field.has-pass.has-action { padding-right: 120px; }

        .bq-input-field:focus { background: white; box-shadow: ${BQ_SHADOWS.soft}; }

        .bq-input-icon {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          color: var(--field-accent); z-index: 5; transition: color 0.3s ease;
        }

        .bq-input--error .bq-input-field { background: #fffafb; }
        .bq-input--success .bq-input-field { background: #fafffb; }

        .bq-input-pass-toggle {
          background: transparent; border: none; cursor: pointer;
          color: var(--field-accent); display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; width: 32px; height: 32px;
        }
        .bq-input-pass-toggle:hover { filter: brightness(0.8); transform: scale(1.1); }

        /* Unified status badge styles used by VerifyInput and Steps */
        .bq-verified-badge {
          color: ${BQ_COLORS.success};
          display: flex;
          align-items: center;
          animation: fadeIn 0.3s ease;
        }
      `,
        }}
      />
    </BoutiqueStack>
  );
}
