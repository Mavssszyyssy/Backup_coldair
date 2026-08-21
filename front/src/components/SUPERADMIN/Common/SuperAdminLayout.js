import React, { useEffect, useState } from 'react';
import SuperAdminHeader from './SuperAdminHeader';
import SuperAdminSidebar from './SuperAdminSidebar';
import '../superAdminShared.css';

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
      <button
        className={`super-burger-button ${menuOpen ? 'open' : ''}`}
        type="button"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      <SuperAdminSidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="super-layout-main">
        <SuperAdminHeader title={title} subtitle={subtitle} />
        {children}
      </div>
      {menuOpen && <div className="super-menu-overlay" onClick={() => setMenuOpen(false)} />}
    </div>
  );
};

export default SuperAdminLayout;
