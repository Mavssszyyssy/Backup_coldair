import { List, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const desktopWidth = () => window.innerWidth >= 1025;
const desktopPreference = (key) => {
  try { return window.sessionStorage.getItem(key) !== 'false'; }
  catch { return true; }
};

export function useOperationsNavigation(role, enabled = true) {
  const storageKey = `${role}-sidebar-open`;
  const sidebarId = `${role}-navigation`;
  const [view, setView] = useState(() => ({ desktop: desktopWidth(), open: desktopWidth() && desktopPreference(storageKey) }));
  const menuRef = useRef(null);
  const { pathname, search } = useLocation();
  const route = `${pathname}${search}`;
  const previousRoute = useRef(route);
  const close = useCallback(() => { setView(current => ({ ...current, open: false })); menuRef.current?.focus(); }, []);
  const toggle = () => setView(current => ({ ...current, open: !current.open }));

  useEffect(() => {
    if (!enabled) return undefined;
    const resize = () => setView(current => {
      const desktop = desktopWidth();
      if (desktop === current.desktop) return current;
      menuRef.current?.focus();
      return { desktop, open: desktop && desktopPreference(storageKey) };
    });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled || !view.desktop) return;
    try { window.sessionStorage.setItem(storageKey, String(view.open)); }
    catch { /* The menu remains usable when browser storage is unavailable. */ }
  }, [enabled, storageKey, view.desktop, view.open]);

  useEffect(() => {
    if (enabled && previousRoute.current !== route && !view.desktop) close();
    previousRoute.current = route;
  }, [enabled, route, view.desktop, close]);

  useEffect(() => {
    if (!enabled || !view.open) return undefined;
    const sidebar = document.getElementById(sidebarId);
    const previousOverflow = document.body.style.overflow;
    if (!view.desktop) {
      document.body.style.overflow = 'hidden';
      sidebar?.querySelector('[data-menu-close]')?.focus();
    }
    const keydown = (event) => {
      if (event.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (view.desktop || event.key !== 'Tab') return;
      const controls = [...(sidebar?.querySelectorAll('a[href], button:not(:disabled)') || [])];
      const first = controls[0], last = controls.at(-1);
      if (!first) return;
      if (!sidebar.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      if (!view.desktop) document.body.style.overflow = previousOverflow;
    };
  }, [enabled, sidebarId, view.open, view.desktop, close]);

  return { isOpen: view.open, sidebarId, menuRef, toggle, close, onNavigate: () => { if (!view.desktop) close(); } };
}

export function OperationsMenuButton({ navigation, t }) {
  return <button className="ops-menu-toggle" type="button" ref={navigation.menuRef}
    onClick={navigation.toggle} aria-label={t('Toggle menu')} aria-expanded={navigation.isOpen} aria-controls={navigation.sidebarId}>
    <List size={22} weight="bold" aria-hidden="true" />
  </button>;
}

export function OperationsMenuClose({ onClose, t }) {
  return <button className="ops-menu-close" type="button" onClick={onClose} aria-label={t('Close menu')} data-menu-close>
    <X size={22} weight="bold" aria-hidden="true" />
  </button>;
}

export function OperationsMenuOverlay({ navigation }) {
  return <div className={`ops-menu-overlay${navigation.isOpen ? ' open' : ''}`} onClick={navigation.close} aria-hidden="true" />;
}
