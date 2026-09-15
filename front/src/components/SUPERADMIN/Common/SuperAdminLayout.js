import React, { useEffect, useState } from 'react';
import SuperAdminHeader from './SuperAdminHeader';
import SuperAdminSidebar from './SuperAdminSidebar';
import '../superAdminShared.css';
import '../../common/operationsDesignSystem.css';

const SuperAdminLayout = ({ title, subtitle, children, embedded = false }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen && window.innerWidth < 768) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [menuOpen]);

  if (embedded) return children;

  return (
    <div className="super-layout">
      <a className="ops-skip-link" href="#superadmin-main-content">Skip to main content</a>
      <button
        className={`super-burger-button ${menuOpen ? 'open' : ''}`}
        type="button"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      <SuperAdminSidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="super-layout-main" id="superadmin-main-content">
        <SuperAdminHeader title={title} subtitle={subtitle} />
        {children}
      </main>
      {menuOpen && <div className="super-menu-overlay" onClick={() => setMenuOpen(false)} />}
    </div>
  );
};

export default SuperAdminLayout;
