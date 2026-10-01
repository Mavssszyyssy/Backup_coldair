import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS } from "./BoutiqueTheme";

/** Shared title, supporting copy, and action row for future screen migrations. */
export default function BoutiqueSectionHeader({
  title,
  description,
  actions,
  className = "",
}) {
  return (
    <header className={`ap-section-header ${className}`.trim()}>
      <div>
        <BoutiqueText variant="sectionTitle">{title}</BoutiqueText>
        {description ? (
          <BoutiqueText color={BQ_COLORS.inkMuted} margin="4px 0 0">
            {description}
          </BoutiqueText>
        ) : null}
      </div>
      {actions ? (
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
