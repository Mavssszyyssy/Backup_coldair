import {
  ClipboardText,
  Gear,
  House,
  Package,
  QrCode,
  ShoppingCart,
  SignOut,
  Users,
} from "@phosphor-icons/react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../../../context/UserContext";
import { confirmDialog } from "../../../utils/dialog";
import logo from "../../common/images/Cold Air Logo.jpg";
import "./styles.css";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: ClipboardText },
  { to: "/admin/inventory", label: "Inventory", icon: Package },
  { to: "/admin/serial-qrs", label: "Serial QR", icon: QrCode },
  { to: "/admin/technicians", label: "Technicians", icon: Users },
  { to: "/admin/orders", label: "Orders", icon: ClipboardText },
  { to: "/admin/maintenance", label: "Service Requests", icon: ClipboardText },
  { to: "/admin/store", label: "Store", icon: House },
  { to: "/admin/reorder", label: "Reorder", icon: ShoppingCart },
  { to: "/admin/reports", label: "Reports", icon: ClipboardText },
  { to: "/admin/settings", label: "Settings", icon: Gear },
  { to: "/admin/profile", label: "Profile", icon: Users },
];

const AdminSidebar = ({ isOpen, onClose }) => {
  const { logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = await confirmDialog(
      "Are you sure you want to log out?",
      "Logout",
    );
    if (!confirmed) return;
    logout();
    navigate("/home");
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 768) onClose?.();
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : ""}`}>
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
          <span>AeroPulse</span>
        </div>
        <button
          className="admin-sidebar-close"
          onClick={onClose}
          type="button"
          aria-label="Close menu"
        >
          {"\u2715"}
        </button>
      </div>

      <nav className="admin-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `admin-sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={handleLinkClick}
          >
            <span className="nav-icon">
              <item.icon size={20} weight="bold" className="inline-icon" />
            </span>
            <span className="nav-label">{item.label}</span>
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
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
