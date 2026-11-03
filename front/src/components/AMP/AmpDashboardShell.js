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
import { confirmLogout } from "../../utils/dialog";
import { translateText } from "../../utils/customerI18n";
import "./styles.css";

function AmpDashboardShell({ title, subtitle, children }) {
  const navigate = useNavigate();
  const { logout, user, userRole, currentLanguage } = useUser();
  const t = (text) => translateText(text, currentLanguage);
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
          <span>AeroPulse AMP<small>{t("Maintenance planning")}</small></span>
        </div>
        <nav>
          {returnDestination ? (
            <NavLink to={returnDestination.to} className="amp-return-link">
              <ArrowLeft size={18} weight="bold" /> {t(returnDestination.label)}
            </NavLink>
          ) : null}
          <NavLink to="/manager/amp" className={({ isActive }) => (isActive ? "active" : "")}>
            <Buildings size={19} weight="duotone" aria-hidden="true" />
            <span>{t(isOwner ? "Branch maintenance" : "My branch maintenance")}</span>
          </NavLink>
          {isOwner ? (
            <NavLink to="/owner/amp" className={({ isActive }) => (isActive ? "active" : "")}>
              <CalendarDots size={19} weight="duotone" aria-hidden="true" />
              <span>{t("12-month workload plan")}</span>
            </NavLink>
          ) : null}
        </nav>
        <button
          type="button"
          onClick={() => confirmLogout(() => {
            logout();
            navigate("/home");
          })}
        >
          <SignOut size={18} weight="bold" /> {t("Logout")}
        </button>
      </aside>
      <main className="amp-main">
        <header className="amp-header">
          <div className="amp-header-copy">
            <h1>{t(title)}</h1>
            <p>{t(subtitle)}</p>
          </div>
          <div className="amp-user-chip">
            <span className="amp-user-chip-icon"><UserCircle size={24} weight="duotone" aria-hidden="true" /></span>
            <span><small>{isOwner ? "Superadmin" : "Admin"}</small>{user?.name || user?.email || t("Staff user")}</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export default AmpDashboardShell;
