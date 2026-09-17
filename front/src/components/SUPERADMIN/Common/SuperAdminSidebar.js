import {
  ChartBar,
  MapPin,
  Package,
  Gear,
  Pulse,
  ShieldCheck,
  ShoppingCart,
  SignOut,
  WarningCircle,
  Wrench,
  Users,
} from "@phosphor-icons/react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../../../context/UserContext";
import { confirmDialog } from "../../../utils/dialog";
import logo from "../../common/images/Cold Air Logo.jpg";

const links = [
  { to: "/superadmin/dashboard", label: "Dashboard", icon: ShieldCheck },
  { to: "/superadmin/inventory", label: "Inventory Management", icon: Package },
  { to: "/superadmin/branches", label: "Branch Management", icon: MapPin },
  { to: "/superadmin/sales", label: "Processing Sales", icon: ShoppingCart },
  { to: "/superadmin/services", label: "Services", icon: Wrench },
  { to: "/manager/amp", label: "AMP Planning", icon: Pulse },
  { to: "/superadmin/reports", label: "Analytics & Reports", icon: ChartBar },
  { to: "/superadmin/alerts", label: "Operations Alerts", icon: WarningCircle },
  { to: "/superadmin/profile", label: "My Profile", icon: Users },
  { to: "/superadmin/settings", label: "Settings", icon: Gear },
];

const SuperAdminSidebar = () => {
  const navigate = useNavigate();
  const { logout } = useUser();

  const handleLogout = async () => {
    const confirmed = await confirmDialog(
      "Are you sure you want to log out?",
      "Logout",
    );
    if (!confirmed) return;
    logout();
    navigate("/home");
  };

  return (
    <aside className="super-sidebar open">
      <div className="super-sidebar-top">
        <div className="super-sidebar-brand">
          <img src={logo} alt="" />
          <span className="super-sidebar-brand-copy"><span>AeroPulse HQ</span><small>Company operations</small></span>
        </div>
      </div>
      <nav className="super-nav" aria-label="Superadmin navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `super-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="super-nav-icon-wrap">
              <link.icon size={20} weight="bold" className="inline-icon" />
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        className="super-logout"
        onClick={handleLogout}
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <SignOut size={20} weight="bold" className="inline-icon" /> Logout
      </button>
    </aside>
  );
};

export default SuperAdminSidebar;
