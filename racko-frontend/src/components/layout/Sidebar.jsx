import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import RackoLogo from "../../assets/logo-racko.svg?react";

export default function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isAdmin = user?.id_rol === 1;
  const linkClass = ({ isActive }) =>
    isActive ? "side-link active" : "side-link";

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <RackoLogo className="sidebar-logo-svg" />
        </div>

        <nav className="sidebar-menu">
          <NavLink to="/" end className={linkClass}>{t("menu.home")}</NavLink>
          <NavLink to="/activos" className={linkClass}>{t("menu.assets")}</NavLink>
          <NavLink to="/auditorias" className={linkClass}>{t("menu.audit")}</NavLink>
          <NavLink to="/usuarios" className={linkClass}>{t("menu.users")}</NavLink>

          {isAdmin && (
            <NavLink to="/administracion" className={linkClass}>
              {t("menu.admin")}
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="side-link danger"
            onClick={() => setShowLogoutModal(true)}
          >
            {t("menu.logout")}
          </button>
        </div>
      </aside>

      {/* MODAL */}
      {showLogoutModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{t("logout.title")}</h3>
            <p>{t("logout.subtitle")}</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                {t("common.cancel")}
              </button>

              <button
                type="button"
                className="btn-modal-logout"
                onClick={handleConfirmLogout}
              >
                {t("menu.logout")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
