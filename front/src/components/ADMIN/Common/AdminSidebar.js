import {
  ChartBar,
  ClipboardText,
  Gear,
  Package,
  Pulse,
  SignOut,
  Users,
  Wrench,
} from "@phosphor-icons/react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../../../context/UserContext";
import { confirmLogout } from "../../../utils/dialog";
import { translateText } from "../../../utils/customerI18n";
import "./styles.css";
import { OperationsMenuClose } from '../../common/OperationsNavigation';

const logo = "/Cold Air Logo-compact.webp";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: ClipboardText },
  { to: "/admin/inventory", label: "Inventory", icon: Package },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { to: "/manager/amp", label: "AMP Planning", icon: Pulse },
  { to: "/admin/reports", label: "Analytics & Reports", icon: ChartBar },
  { to: "/admin/profile", label: "Profile", icon: Users },
  { to: "/admin/settings", label: "System Settings", icon: Gear },
];

const AdminSidebar = ({ isOpen, onClose, onNavigate, sidebarId }) => {
  const { logout, currentLanguage } = useUser();
  const t = (text) => translateText(text, currentLanguage);
  const navigate = useNavigate();

  const handleLogout = () => confirmLogout(() => {
    logout();
    navigate("/home");
  });

  return (
    <aside id={sidebarId} className={`admin-sidebar ${isOpen ? "open" : ""}`} inert={!isOpen} aria-hidden={!isOpen}>
      <div className="admin-sidebar-brand-row">
        <div className="admin-sidebar-brand">
          <span className="brand-icon">
            <img
              src={logo}
              alt="AeroPulse"
              className="inline-icon"
              style={{ borderRadius: "4px", width: "20px", height: "20px" }}
            />
          </span>
          <span className="admin-sidebar-brand-copy"><span>AeroPulse</span><small>{t("Branch operations")}</small></span>
        </div>
        <OperationsMenuClose onClose={onClose} t={t} />
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `admin-sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={onNavigate}
          >
            <span className="nav-icon">
              <item.icon size={20} weight="bold" className="inline-icon" />
            </span>
            <span className="nav-label">{t(item.label)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button
          className="admin-sidebar-logout"
          onClick={handleLogout}
          type="button"
        >
          <span>
            <SignOut size={20} weight="bold" className="inline-icon" />
          </span>
          <span>{t("Logout")}</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
