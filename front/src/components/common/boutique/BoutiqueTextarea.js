import { useId } from "react";
import BoutiqueStack from "./BoutiqueStack";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS } from "./BoutiqueTheme";

/** Shared multiline field for screens migrated to the AEROPULSE foundation. */
export default function BoutiqueTextarea({
  label,
  hint,
  errorMessage,
  status = null,
  className = "",
  ...props
}) {
  const generatedId = useId().replaceAll(":", "");
  const fieldId = props.id || props.name || `ap-textarea-${generatedId}`;
  const fallbackId = `${fieldId}-error`;
  const describedBy = props["aria-describedby"] || (errorMessage ? fallbackId : undefined);

  return (
    <BoutiqueStack
      gap={8}
      width="100%"
      className={`bq-input-group ${status ? `bq-input--${status}` : ""}`.trim()}
    >
      {label ? (
        <label className="bq-input-label" htmlFor={fieldId} style={{ color: BQ_COLORS.ink }}>
          {label}
        </label>
      ) : null}
      <textarea
        {...props}
        id={fieldId}
        className={`ap-textarea ${className}`.trim()}
        aria-invalid={status === "error" || undefined}
        aria-describedby={describedBy}
      />
      {status === "error" && errorMessage ? (
        <BoutiqueText id={describedBy} variant="caption" color={BQ_COLORS.danger} role="alert">
          {errorMessage}
        </BoutiqueText>
      ) : hint ? (
        <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
          {hint}
        </BoutiqueText>
      ) : null}
    </BoutiqueStack>
  );
}
