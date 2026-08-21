import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import icons from '../common/icons';

function SideMenu({ isOpen, onClose, activePage, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useUser();
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState(activePage);

  const menuItems = useMemo(() => ([
    { id: 'shop', label: 'Shop Catalog', iconSrc: icons.cartShoppingFast, path: '/shop', description: 'Browse AC products' },
    { id: 'orders', label: 'My Orders', iconSrc: icons.receipt || icons.cartShoppingFast, path: '/my-orders', description: 'Track orders, payments and delivery' },
    { id: 'myunit', label: 'My Unit', iconSrc: icons.temperatureFrigid, path: '/myunit', description: 'Manage your AC units' },
    { id: 'services', label: 'Get the App', iconSrc: icons.tools, path: '/services', description: 'Manage services on Mobile' },
    { id: 'contact', label: 'Contact', iconSrc: icons.phoneCall, path: '/contact', description: 'Get in touch with us' },
    { id: 'settings', label: 'Settings', iconSrc: icons.customize, path: '/settings', description: 'Profile and account preferences' },
  ]), []);

  useEffect(() => {
    const menuItem = menuItems.find(item => item.path === location.pathname);
    if (menuItem) {
      setActiveMenuItem(menuItem.id);
    }
  }, [location.pathname, menuItems]);

  const getUserDisplayName = () => {
    if (!user) return 'Guest User';
    if (user.name) return user.name;
    if (user.name_first && user.name_last) return `${user.name_first} ${user.name_last}`;
    if (user.name_first) return user.name_first;
    if (user.email) return user.email.split('@')[0];
    return 'Cold Air Customer';
  };

  const getUserRole = () => {
    if (!user) return 'Guest';
    if (user.role === 'admin') return 'Admin';
    if (user.role === 'superadmin') return 'Super Admin';
    if (user.isGoogleAccount) return 'Google User';
    return 'Customer';
  };

  const getUserInitial = () => {
    const name = getUserDisplayName();
    if (name && name !== 'Guest User') {
      return name.charAt(0).toUpperCase();
    }
    return null;
  };

  useEffect(() => {
    setAvatarBroken(false);
  }, [user?.avatarUrl]);

  const handleNavigation = (path, itemId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setActiveMenuItem(itemId);
    navigate(path);
    onClose();
  };

  const handleLoginClick = () => {
    navigate('/login');
    onClose();
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    if (onLogout) {
      onLogout();
    }
    setShowLogoutModal(false);
    onClose();
    navigate('/shop', { replace: true });
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="side-menu-backdrop" onClick={onClose} role="presentation">
        <div className="backdrop-blur"></div>
      </div>

      <div className={`side-menu ${isOpen ? 'open' : ''}`}>
        {isAuthenticated ? (
          <>
            <div className="menu-header">
              <div className="menu-header-content">
                <div className="user-avatar">
                  {user?.avatarUrl && !avatarBroken ? (
                    <img
                      src={user.avatarUrl}
                      alt="Profile"
                      className="inline-icon inline-icon--lg"
                      onError={() => setAvatarBroken(true)}
                    />
                  ) : getUserInitial() ? (
                    <span className="user-initial">{getUserInitial()}</span>
                  ) : (
                    <img src={icons.memberList} alt="" className="inline-icon inline-icon--lg" />
                  )}
                </div>
                <div className="user-info">
                  <h3>Welcome Back,</h3>
                  <p className="user-name">{getUserDisplayName()}</p>
                  <span className="user-role">{getUserRole()}</span>
                </div>
              </div>
              <button type="button" className="close-menu" onClick={onClose} aria-label="Close menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="menu-nav">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`menu-item ${activeMenuItem === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigation(item.path, item.id)}
                  role="presentation"
                >
                  <div className="menu-icon-wrapper">
                    <span className="menu-icon">
                      <img src={item.iconSrc} alt="" className="inline-icon inline-icon--md" />
                    </span>
                  </div>
                  <div className="menu-item-content">
                    <span className="menu-label">{item.label}</span>
                    <span className="menu-description">{item.description}</span>
                  </div>
                  {activeMenuItem === item.id && (
                    <div className="active-indicator"></div>
                  )}
                </div>
              ))}

              <div className="menu-divider"></div>

              <div className="menu-item logout-item" onClick={handleLogoutClick} role="presentation">
                <div className="menu-icon-wrapper">
                  <span className="menu-icon">
                    <img src={icons.signOutAlt} alt="" className="inline-icon inline-icon--md" />
                  </span>
                </div>
                <div className="menu-item-content">
                  <span className="menu-label">Logout</span>
                  <span className="menu-description">Sign out of your account</span>
                </div>
              </div>
            </div>

            <div className="menu-footer">
              <div className="version-info">
                <span>Version 1.0.0</span>
                <span>© Cold Air</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Unauthenticated view */}
            <div className="menu-header">
              <div className="menu-header-content">
                <div className="user-avatar">
                  <img src={icons.memberList} alt="" className="inline-icon inline-icon--lg" />
                </div>
                <div className="user-info">
                  <h3>Welcome,</h3>
                  <p className="user-name">Guest User</p>
                  <span className="user-role">Not logged in</span>
                </div>
              </div>
              <button type="button" className="close-menu" onClick={onClose} aria-label="Close menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="menu-nav">
              <div className="menu-info-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <p>Log in to access all features and manage your account.</p>
              </div>

              <button 
                type="button" 
                className="menu-login-btn"
                onClick={handleLoginClick}
              >
                <img src={icons.signOutAlt} alt="" className="inline-icon" />
                <span>Go to Login</span>
              </button>
            </div>

            <div className="menu-footer">
              <div className="version-info">
                <span>Version 1.0.0</span>
                <span>© Cold Air</span>
              </div>
            </div>
          </>
        )}

      </div>

      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={handleCancelLogout} role="presentation">
          <div className="logout-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="logout-modal-header">
              <div className="logout-icon-wrapper">
                <div className="logout-icon">
                  <img src={icons.signOutAlt} alt="" className="inline-icon inline-icon--xl" />
                </div>
              </div>
              <h3>Logout Confirmation</h3>
              <p>Are you sure you want to log out?</p>
            </div>
            <div className="logout-modal-body">
              <div className="warning-message">
                <span className="warning-icon">
                  <img src={icons.diamondExclamation} alt="" className="inline-icon" />
                </span>
                <span>You will need to login again to access your account.</span>
              </div>
            </div>
            <div className="logout-modal-footer">
              <button type="button" className="logout-cancel-btn" onClick={handleCancelLogout}>
                Cancel
              </button>
              <button type="button" className="logout-confirm-btn" onClick={handleConfirmLogout}>
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SideMenu;
