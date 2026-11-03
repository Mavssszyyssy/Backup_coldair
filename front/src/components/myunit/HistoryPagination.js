import { useUser } from '../../context/UserContext';
import { translateText } from '../../utils/customerI18n';

export default function HistoryPagination({ currentPage, totalPages, onPageChange, label = "Service record" }) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  if (totalPages <= 1) return null;

  return (
    <nav
      className="history-pagination"
      aria-label={`${t(label)} ${t("pagination")}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label={`${t("Previous")} ${t(label).toLowerCase()}`}
      >
        {t("Previous")}
      </button>
      <span aria-live="polite">
        {t(label)} {currentPage} {t("of")} {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label={`${t("Next")} ${t(label).toLowerCase()}`}
      >
        {t("Next")}
      </button>
    </nav>
  );
}
