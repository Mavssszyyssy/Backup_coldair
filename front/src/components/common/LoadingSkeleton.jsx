import "./LoadingSkeleton.css";

const defaultCounts = { list: 3, cards: 4, detail: 1, table: 4, inline: 2 };

export default function LoadingSkeleton({ label, variant = "list", count = defaultCounts[variant] }) {
  return (
    <div className={`loading-skeleton loading-skeleton--${variant}`} role="status">
      <span className="loading-skeleton__label">{label}</span>
      <div className="loading-skeleton__items" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div className="loading-skeleton__item" key={index}>
            {variant === "cards" && <div className="loading-skeleton__media" />}
            <div className="loading-skeleton__line loading-skeleton__line--title" />
            <div className="loading-skeleton__line" />
            <div className="loading-skeleton__line loading-skeleton__line--short" />
          </div>
        ))}
      </div>
    </div>
  );
}
