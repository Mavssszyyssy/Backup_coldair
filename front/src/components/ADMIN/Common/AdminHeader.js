import { Gear } from "@phosphor-icons/react";
import { useUser } from "../../../context/UserContext";
import { translateText } from "../../../utils/customerI18n";
import "./styles.css";

const AdminHeader = ({
  title = "Admin Module",
  subtitle = "Control panel",
  onMenuToggle,
}) => {
  const { user, currentLanguage } = useUser();
  const t = (text) => translateText(text, currentLanguage);

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button
          className="admin-menu-toggle"
          onClick={onMenuToggle}
          type="button"
          aria-label={t("Open menu")}
        >
          <Gear size={20} weight="bold" className="inline-icon" />
        </button>
        <div>
          <h1>{t(title)}</h1>
          <p>{t(subtitle)}</p>
        </div>
      </div>
      <div className="admin-header-user">
        <span className="admin-user-avatar">
          {(user?.name || "Admin").charAt(0).toUpperCase()}
        </span>
        <span>{user?.name || t("Administrator")}</span>
      </div>
    </header>
  );
};

export default AdminHeader;
