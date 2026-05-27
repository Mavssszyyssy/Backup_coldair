import { SignOut } from "@phosphor-icons/react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import "./styles.css";

function AmpDashboardShell({ title, subtitle, children }) {
  const navigate = useNavigate();
  const { logout, user, userRole } = useUser();
  const isOwner = userRole === "owner" || userRole === "superadmin";

  return (
    <div className="amp-shell">
      <aside className="amp-sidebar">
        <div className="amp-brand">AeroPulse AMP</div>
        <nav>
          <NavLink to="/manager/amp" className={({ isActive }) => (isActive ? "active" : "")}>
            Manager Pipeline
          </NavLink>
          {isOwner ? (
            <NavLink to="/owner/amp" className={({ isActive }) => (isActive ? "active" : "")}>
              Owner Forecast
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
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <span>{user?.name || user?.email || "Internal user"}</span>
        </header>
        {children}
      </main>
    </div>
  );
}

export default AmpDashboardShell;
