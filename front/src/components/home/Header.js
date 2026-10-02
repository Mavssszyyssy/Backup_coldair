import { useCart } from '../../context/CartContext';
import icons from '../common/icons';
import coldAirLogo from '../common/images/Cold Air Logo.jpg';

function Header({ onMenuToggle, onNotificationClick, onCartClick, notificationCount, scrolled }) {
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  const formatBadgeCount = (count) => {
    const normalized = Number(count) || 0;
    if (normalized <= 0) return '';
    if (normalized > 99) return '99+';
    return String(normalized);
  };

  const notificationBadge = formatBadgeCount(notificationCount);
  const cartBadge = formatBadgeCount(cartCount);

  return (
    <header className={`home-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="header-left">
          {/* Keep menu toggle functional while grouping brand on the left */}
          <button type="button" className="menu-toggle" onClick={onMenuToggle} aria-label="Open menu">
            <img src={icons.customize} alt="" className="inline-icon inline-icon--md" />
          </button>
          <div className="header-brand-group" aria-label="Company identity">
            <div className="logo">
              <div className="logo-icon">
                <img src={coldAirLogo} alt="Cold Air logo" className="logo-icon-img" />
              </div>
              <div className="logo-text">
                <h1>COLD AIR</h1>
                <p>Airconditioning Trading</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flexible middle region keeps left and right groups pinned cleanly */}
        <div className="header-center-spacer" aria-hidden="true" />

        <div className="header-right" aria-label="Header actions">
          <button type="button" className="icon-btn header-action-btn" onClick={onNotificationClick} aria-label="Alerts">
            <img src={icons.visit} alt="" className="inline-icon inline-icon--md" />
            {notificationBadge && (
              <span className="badge" aria-live="polite">{notificationBadge}</span>
            )}
          </button>
          <button type="button" className="icon-btn header-action-btn" onClick={onCartClick} aria-label="Cart">
            <img src={icons.cartShoppingFast} alt="" className="inline-icon inline-icon--md" />
            {cartBadge && <span className="badge" aria-live="polite">{cartBadge}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
