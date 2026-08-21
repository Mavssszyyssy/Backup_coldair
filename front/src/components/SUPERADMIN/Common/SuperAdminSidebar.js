import {
  CaretDown,
  MapPin,
  Package,
  QrCode,
  Gear,
  ShieldCheck,
  ShoppingCart,
  SignOut,
  WarningCircle,
  Wrench,
  Users,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../../context/UserContext";
import { confirmDialog } from "../../../utils/dialog";

const links = [
  { to: "/superadmin/dashboard", label: "Dashboard", icon: ShieldCheck },
  { to: "/superadmin/branches", label: "Branch Management", icon: MapPin },
  { to: "/superadmin/sales", label: "Processing Sales", icon: ShoppingCart },
  { to: "/superadmin/orders", label: "Customer Orders", icon: ShoppingCart },
  { to: "/superadmin/maintenance", label: "Service Requests", icon: Wrench },
  { to: "/superadmin/technicians", label: "Technicians", icon: Users },
  { to: "/superadmin/reports", label: "AMP / Reports", icon: ShieldCheck },
  { to: "/superadmin/tasks", label: "Processing Tech Tasks", icon: Wrench },
  { to: "/superadmin/alerts", label: "Customer Support Alerts", icon: WarningCircle },
  { to: "/superadmin/profile", label: "My Profile", icon: Users },
  { to: "/superadmin/settings", label: "Settings", icon: Gear },
];

const SuperAdminSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useUser();
  const inventoryIsActive = [
    "/superadmin/inventory",
    "/superadmin/serial-qrs",
    "/superadmin/reorders",
  ].includes(location.pathname);
  const [inventoryExpanded, setInventoryExpanded] = useState(inventoryIsActive);

  useEffect(() => {
    if (inventoryIsActive) setInventoryExpanded(true);
  }, [inventoryIsActive]);

  const inventoryItems = [
    {
      to: "/superadmin/inventory",
      label: "Inventory Checker",
      icon: Package,
      isActive: location.pathname === "/superadmin/inventory",
    },
    {
      to: "/superadmin/serial-qrs",
      label: "Serial / QR Registry",
      icon: QrCode,
      isActive: location.pathname === "/superadmin/serial-qrs",
    },
    {
      to: "/superadmin/reorders",
      label: "Reorder Approvals",
      icon: ShoppingCart,
      isActive: location.pathname === "/superadmin/reorders",
    },
  ];

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
    <aside className={`super-sidebar ${isOpen ? "open" : ""}`}>
      <div className="super-sidebar-top">
        <div className="super-sidebar-brand">AeroPulse HQ</div>
        <button type="button" className="super-close" onClick={onClose}>
          {"\u2715"}
        </button>
      </div>
      <nav className="super-nav">
        {links.slice(0, 3).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `super-nav-link ${isActive ? "active" : ""}`
            }
            onClick={onClose}
          >
            <span className="super-nav-icon-wrap">
              <link.icon size={20} weight="bold" className="inline-icon" />
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
        <div className={`super-nav-group ${inventoryIsActive ? "active" : ""}`}>
          <button
            type="button"
            className="super-nav-link super-nav-group-trigger"
            onClick={() => setInventoryExpanded((expanded) => !expanded)}
            aria-expanded={inventoryExpanded}
            aria-controls="superadmin-inventory-navigation"
          >
            <span className="super-nav-icon-wrap">
              <Package size={20} weight="bold" className="inline-icon" />
            </span>
            <span>Inventory Management</span>
            <CaretDown
              size={16}
              weight="bold"
              className={`super-nav-group-caret ${inventoryExpanded ? "expanded" : ""}`}
            />
          </button>
          {inventoryExpanded ? (
            <div id="superadmin-inventory-navigation" className="super-nav-subnav">
              {inventoryItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`super-nav-sublink ${item.isActive ? "active" : ""}`}
                  onClick={onClose}
                >
                  <item.icon size={16} weight="bold" className="inline-icon" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
        {links.slice(3).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `super-nav-link ${isActive ? "active" : ""}`
            }
            onClick={onClose}
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
