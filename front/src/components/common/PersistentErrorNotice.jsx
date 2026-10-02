import { createPortal } from 'react-dom';
import './PersistentErrorNotice.css';

export default function PersistentErrorNotice({
  message,
  title = 'Please check your information',
  onDismiss,
}) {
  if (!message || typeof document === 'undefined') return null;

  return createPortal(
    <div className="persistent-error-notice-layer">
      <section
        className="persistent-error-notice"
        role="alert"
        aria-atomic="true"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="persistent-error-notice__icon" aria-hidden="true">!</span>
        <div className="persistent-error-notice__copy">
          <strong>{title}</strong>
          <span>{message}</span>
        </div>
        {onDismiss ? (
          <button
            type="button"
            className="persistent-error-notice__dismiss"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            ×
          </button>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
