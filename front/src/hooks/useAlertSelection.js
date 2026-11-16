import { useEffect, useState } from "react";

export default function useAlertSelection(alerts, scope) {
  const [checkedIds, setCheckedIds] = useState([]);
  const visibleIds = alerts.map((alert) => alert.id).filter(Boolean);
  const selectedIds = visibleIds.filter((id) => checkedIds.includes(id));
  const allSelected = visibleIds.length > 0 && selectedIds.length === visibleIds.length;

  useEffect(() => { setCheckedIds([]); }, [scope]);

  return {
    available: visibleIds.length > 0,
    selectedIds,
    allSelected,
    isSelected: (id) => selectedIds.includes(id),
    toggle: (id) => setCheckedIds((current) => current.includes(id)
      ? current.filter((entry) => entry !== id)
      : [...current, id]),
    toggleAll: () => setCheckedIds(allSelected ? [] : visibleIds),
    clear: () => setCheckedIds([]),
  };
}
