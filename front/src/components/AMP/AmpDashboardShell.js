import {
  ArrowLeft,
  Buildings,
  CalendarDots,
  Pulse,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import "./styles.css";

function AmpDashboardShell({ title, subtitle, children }) {
  const navigate = useNavigate();
  const { logout, user, userRole } = useUser();
  const isOwner = userRole === "owner" || userRole === "superadmin";
  const returnDestination = userRole === "superadmin"
    ? { to: "/superadmin/dashboard", label: "Back to Superadmin" }
    : userRole === "admin"
      ? { to: "/admin/dashboard", label: "Back to Admin" }
      : null;

  return (
    <div className={`amp-shell ${isOwner ? "amp-shell-superadmin" : "amp-shell-admin"}`}>
      <aside className="amp-sidebar">
        <div className="amp-brand">
          <span className="amp-brand-mark"><Pulse size={23} weight="duotone" aria-hidden="true" /></span>
          <span>AeroPulse AMP<small>Predictive maintenance</small></span>
        </div>
        <nav>
          {returnDestination ? (
            <NavLink to={returnDestination.to} className="amp-return-link">
              <ArrowLeft size={18} weight="bold" /> {returnDestination.label}
            </NavLink>
          ) : null}
          <NavLink to="/manager/amp" className={({ isActive }) => (isActive ? "active" : "")}>
            <Buildings size={19} weight="duotone" aria-hidden="true" />
            <span>{isOwner ? "Branch maintenance" : "My branch maintenance"}</span>
          </NavLink>
          {isOwner ? (
            <NavLink to="/owner/amp" className={({ isActive }) => (isActive ? "active" : "")}>
              <CalendarDots size={19} weight="duotone" aria-hidden="true" />
              <span>12-month workload plan</span>
            </NavLink>
          ) : null}
        </nav>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/home");
          }}
        >
          <SignOut size={18} weight="bold" /> Logout
        </button>
      </aside>
      <main className="amp-main">
        <header className="amp-header">
          <div className="amp-header-copy">
            <span className="amp-header-eyebrow">Maintenance intelligence workspace</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="amp-user-chip">
            <span className="amp-user-chip-icon"><UserCircle size={24} weight="duotone" aria-hidden="true" /></span>
            <span><small>{isOwner ? "Company oversight" : "Branch operations"}</small>{user?.name || user?.email || "Internal user"}</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export default AmpDashboardShell;
