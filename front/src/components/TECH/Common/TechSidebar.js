import { ClipboardText, QrCode, SignOut, Users, Wrench } from "@phosphor-icons/react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../../../context/UserContext";
import { confirmDialog } from "../../../utils/dialog";

const items = [
  { to: "/tech/dashboard", label: "Dashboard", icon: ClipboardText },
  { to: "/tech/tasks", label: "Tasks", icon: Wrench },
  { to: "/tech/field-registration", label: "QR Registration", icon: QrCode },
  { to: "/tech/profile", label: "Profile", icon: Users },
];

const TechSidebar = ({ isOpen, onClose }) => {
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
    <aside className={`tech-sidebar ${isOpen ? "open" : ""}`}>
      <div className="tech-sidebar-brand-row">
        <div className="tech-sidebar-brand">AeroPulse Tech</div>
        <button type="button" className="tech-sidebar-close" onClick={onClose}>
          {"\u2715"}
        </button>
      </div>
      <nav className="tech-sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `tech-sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={onClose}
          >
            <span className="tech-nav-icon-wrap">
              <item.icon size={20} weight="bold" className="inline-icon" />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        className="tech-sidebar-logout"
        onClick={handleLogout}
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <SignOut size={20} weight="bold" className="inline-icon" /> Logout
      </button>
    </aside>
  );
};

export default TechSidebar;
