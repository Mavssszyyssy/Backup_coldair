import { WarningCircle } from "@phosphor-icons/react";

function InputField({
  label,
  type = "text",
  maxLength = 160,
  placeholder,
  value,
  onChange,
  error,
  disabled,
  required = false,
}) {
  return (
    <div className="input-group">
      {label && (
        <label>
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      <input
        type={type}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={error ? "input-error" : ""}
      />
      {error && (
        <div className="error-message">
          <WarningCircle size={16} weight="bold" className="inline-icon" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default InputField;
