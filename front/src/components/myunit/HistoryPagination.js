export default function HistoryPagination({ currentPage, totalPages, onPageChange, label = "Service record" }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="history-pagination" aria-label={`${label} pagination`}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label={`Previous ${label.toLowerCase()}`}
      >
        Previous
      </button>
      <span aria-live="polite">
        {label} {currentPage} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label={`Next ${label.toLowerCase()}`}
      >
        Next
      </button>
    </nav>
  );
}
