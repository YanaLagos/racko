import { useAuth } from "../../contexts/AuthContext";
import LanguageSwitch from "../common/LanguageSwitch";
import { useTranslation } from "react-i18next";

export default function TopBar() {
  const { t } = useTranslation(); 
  const { user } = useAuth();

  const fullName = [user?.nombre, user?.apellido].filter(Boolean).join(" ");
  const roleLabel = user?.id_rol === 1 ? t("roles.admin") : t("roles.collab"); 
  return (
    <header className="topbar">
      <div className="user-box">
        <div className="user-name">{fullName || "-"}</div>
        <div className="user-role">{roleLabel}</div>
      </div>

      <div className="topbar-right">
        <LanguageSwitch />
      </div>
    </header>
  );
}
