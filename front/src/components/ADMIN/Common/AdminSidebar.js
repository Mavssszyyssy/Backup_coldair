import {
  CaretDown,
  ClipboardText,
  Gear,
  Package,
  QrCode,
  ShoppingCart,
  SignOut,
  Users,
  Wrench,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../../context/UserContext";
import { confirmDialog } from "../../../utils/dialog";
import logo from "../../common/images/Cold Air Logo.jpg";
import "./styles.css";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: ClipboardText },
  { to: "/admin/reports", label: "AMP / Reports", icon: ClipboardText },
  { to: "/admin/profile", label: "Profile", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Gear },
];

const AdminSidebar = ({ isOpen, onClose }) => {
  const { logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const inventoryIsActive = [
    "/admin/inventory",
    "/admin/reorder",
    "/admin/serial-qrs",
  ].includes(location.pathname);
  const servicesIsActive = [
    "/admin/services/orders",
    "/admin/services/service-requests",
    "/admin/services/technicians",
  ].includes(location.pathname);
  const [inventoryExpanded, setInventoryExpanded] = useState(inventoryIsActive);
  const [servicesExpanded, setServicesExpanded] = useState(servicesIsActive);

  useEffect(() => {
    if (inventoryIsActive) setInventoryExpanded(true);
  }, [inventoryIsActive]);

  useEffect(() => {
    if (servicesIsActive) setServicesExpanded(true);
  }, [servicesIsActive]);

  const inventoryItems = [
    {
      to: "/admin/inventory",
      label: "Inventory Overview",
      icon: Package,
      isActive: location.pathname === "/admin/inventory" && !location.search,
    },
    {
      to: "/admin/inventory?view=products",
      label: "Products / AC Units",
      icon: Package,
      isActive: location.pathname === "/admin/inventory" && location.search.includes("view=products"),
    },
    {
      to: "/admin/inventory?view=stock",
      label: "Stock Management",
      icon: Package,
      isActive: location.pathname === "/admin/inventory" && location.search.includes("view=stock"),
    },
    {
      to: "/admin/reorder",
      label: "Reorder Management",
      icon: ShoppingCart,
      isActive: location.pathname === "/admin/reorder",
    },
    {
      to: "/admin/serial-qrs",
      label: "Serial / QR Management",
      icon: QrCode,
      isActive: location.pathname === "/admin/serial-qrs",
    },
  ];

  const serviceItems = [
    {
      to: "/admin/services/orders",
      label: "Orders",
      icon: ClipboardText,
      isActive: location.pathname === "/admin/services/orders",
    },
    {
      to: "/admin/services/service-requests",
      label: "Service Requests",
      icon: Wrench,
      isActive: location.pathname === "/admin/services/service-requests",
    },
    {
      to: "/admin/services/technicians",
      label: "Technicians",
      icon: Users,
      isActive: location.pathname === "/admin/services/technicians",
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
        {navItems.slice(0, 1).map((item) => (
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
        <div className={`admin-sidebar-group ${inventoryIsActive ? "active" : ""}`}>
          <button
            type="button"
            className="admin-sidebar-link admin-sidebar-group-trigger"
            onClick={() => setInventoryExpanded((expanded) => !expanded)}
            aria-expanded={inventoryExpanded}
            aria-controls="admin-inventory-navigation"
          >
            <span className="nav-icon">
              <Package size={20} weight="bold" className="inline-icon" />
            </span>
            <span className="nav-label">Inventory</span>
            <CaretDown
              size={16}
              weight="bold"
              className={`admin-sidebar-group-caret ${inventoryExpanded ? "expanded" : ""}`}
            />
          </button>
          {inventoryExpanded ? (
            <div id="admin-inventory-navigation" className="admin-sidebar-subnav">
              {inventoryItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`admin-sidebar-sublink ${item.isActive ? "active" : ""}`}
                  onClick={handleLinkClick}
                >
                  <item.icon size={16} weight="bold" className="inline-icon" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
        <div className={`admin-sidebar-group ${servicesIsActive ? "active" : ""}`}>
          <button
            type="button"
            className="admin-sidebar-link admin-sidebar-group-trigger"
            onClick={() => setServicesExpanded((expanded) => !expanded)}
            aria-expanded={servicesExpanded}
            aria-controls="admin-services-navigation"
          >
            <span className="nav-icon">
              <Wrench size={20} weight="bold" className="inline-icon" />
            </span>
            <span className="nav-label">Services</span>
            <CaretDown
              size={16}
              weight="bold"
              className={`admin-sidebar-group-caret ${servicesExpanded ? "expanded" : ""}`}
            />
          </button>
          {servicesExpanded ? (
            <div id="admin-services-navigation" className="admin-sidebar-subnav">
              {serviceItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`admin-sidebar-sublink ${item.isActive ? "active" : ""}`}
                  onClick={handleLinkClick}
                >
                  <item.icon size={16} weight="bold" className="inline-icon" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
        {navItems.slice(1).map((item) => (
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
