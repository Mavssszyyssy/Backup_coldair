import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { translateText } from '../../utils/customerI18n';

function UnitKebabMenu({
  unit,
  onViewHistory,
  onWarrantyStatus
}) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const run = (fn) => (e) => {
    e.stopPropagation();
    setOpen(false);
    fn(unit);
  };

  return (
    <div className="unit-kebab" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="unit-kebab-btn"
        aria-label={t("Unit actions")}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⋮
      </button>
      {open && (
        <ul className="unit-kebab-menu" role="menu">
          <li>
            <button type="button" role="menuitem" onClick={run(onViewHistory)}>
              {t("Service history")}
            </button>
          </li>
          <li>
            <button type="button" role="menuitem" onClick={run(onWarrantyStatus)}>
              {t("Warranty status")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

export default UnitKebabMenu;
