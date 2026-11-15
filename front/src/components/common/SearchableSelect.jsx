import { MagnifyingGlass } from "@phosphor-icons/react";
import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { translateText } from "../../utils/customerI18n";
import "./SearchableSelect.css";

const MIN_SEARCH_OPTIONS = 8;

function optionText(children) {
  return Children.toArray(children).join("").trim();
}

function readOptions(children, group = "", groupDisabled = false) {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const { disabled, hidden, label, value, children: content } = child.props;
    if (child.type === Fragment) return readOptions(content, group, groupDisabled);
    if (child.type === "optgroup") return readOptions(content, label, groupDisabled || disabled);
    if (child.type !== "option" || hidden) return [];
    const text = label ?? optionText(content);
    return [{ text, value: String(value ?? optionText(content)), group, disabled: groupDisabled || disabled }];
  });
}

const normalize = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function SearchableSelect({ children, disabled, multiple, size, ref, ...props }) {
  const panelId = useId();
  const nativeRef = useRef(null);
  const openerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [query, setQuery] = useState("");
  const options = readOptions(children);
  const searchable = !multiple && !(size > 1) && options.length >= MIN_SEARCH_OPTIONS;
  const open = Boolean(position && searchable && !disabled);

  function updatePosition() {
    const box = openerRef.current?.parentElement?.getBoundingClientRect();
    if (!box) return;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    if (box.bottom <= 0 || box.top >= viewportHeight) return setPosition(null);
    const width = Math.min(Math.max(260, box.width), viewportWidth - 16);
    const below = viewportHeight - box.bottom - 8;
    const above = box.top - 8;
    const showAbove = below < 230 && above > below;
    setPosition({ width, left: Math.min(Math.max(8, box.left), viewportWidth - width - 8),
      ...(showAbove ? { bottom: viewportHeight - box.top + 4 } : { top: box.bottom + 4 }),
      maxHeight: Math.min(320, Math.max(0, showAbove ? above : below) - 4),
    });
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onOutside = (event) => {
      if (!panelRef.current?.contains(event.target) && !openerRef.current?.contains(event.target)) setPosition(null);
    };
    const onScroll = (event) => {
      if (!panelRef.current?.contains(event.target)) updatePosition();
    };
    document.addEventListener("pointerdown", onOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const select = <select {...props} disabled={disabled} multiple={multiple} size={size} ref={(node) => {
    nativeRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }}>{children}</select>;
  if (!searchable) return select;

  const t = (text) => translateText(text, document.documentElement.dataset.language);
  const searchLabel = t("Search options");
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const results = open ? options.filter(({ text, value, group }) => words.every((word) => normalize(`${text} ${value} ${group}`).includes(word))) : [];
  const close = () => { setPosition(null); openerRef.current?.focus(); };
  const choose = (value) => {
    const field = nativeRef.current;
    if (field && !field.disabled && field.value !== value) {
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close();
  };

  return <span className="searchable-select">
    {select}
    <button ref={openerRef} className="searchable-select__trigger" type="button" disabled={disabled}
      aria-label={searchLabel} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}
      title={searchLabel} onClick={() => {
        if (open) return close();
        setQuery("");
        updatePosition();
      }}><MagnifyingGlass size={18} aria-hidden="true" /></button>
    {open && createPortal(
      <div ref={panelRef} id={panelId} role="dialog" aria-label={searchLabel} className="searchable-select__panel" style={position}
        onBlur={(event) => {
          const nextTarget = event.relatedTarget;
          if (nextTarget && !event.currentTarget.contains(nextTarget) && nextTarget !== openerRef.current) setPosition(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
          if (event.key === "Enter" && event.target === searchRef.current) { event.preventDefault(); }
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          const choices = Array.from(event.currentTarget.querySelectorAll("button:not(:disabled)"));
          const current = choices.indexOf(event.target);
          const previous = current === 0 ? searchRef.current : choices[current - 1];
          const next = event.key === "ArrowDown" ? choices[current + 1] : previous;
          if (next) { event.preventDefault(); next.focus(); }
        }}>
        <input maxLength={160} ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={searchLabel} placeholder={searchLabel} />
        <ul>
          {results.map(({ text, value, group, disabled: unavailable }, index) => <li key={`${value}-${index}`}>
            <button type="button" disabled={unavailable} aria-pressed={String(props.value ?? nativeRef.current?.value) === value} onClick={() => choose(value)}>
              {text}{group && <small>{group}</small>}
            </button>
          </li>)}
        </ul>
        {!results.length && <p role="status">{t("No matching records found.")}</p>}
      </div>, openerRef.current?.closest('[aria-modal="true"], dialog[open]') || document.body)}
  </span>;
}
