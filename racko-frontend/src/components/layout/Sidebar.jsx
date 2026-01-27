import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import RackoLogo from "../../assets/logo-racko.svg?react";
import HomeIcon from "../../assets/home.svg?react";
import AssetsIcon from "../../assets/assets.svg?react";
import AuditIcon from "../../assets/report.svg?react";
import UsersIcon from "../../assets/users.svg?react";
import AdminIcon from "../../assets/admin.svg?react";
import SignOut from "../../assets/sign-out.svg?react";

export default function Sidebar({ className = "" }) {
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

  useEffect(() => {
    if (!showLogoutModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showLogoutModal]);

  const logoutModal = showLogoutModal
    ? createPortal(
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
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
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <aside className={`sidebar ${className}`}>
        <div className="sidebar-logo">
          <RackoLogo className="sidebar-logo-svg" />
        </div>

        <nav className="sidebar-menu">
          <NavLink to="/" end className={linkClass}>
            <HomeIcon className="menu-icon" />
            <span>{t("menu.home")}</span>
          </NavLink>

          <NavLink to="/activos" className={linkClass}>
            <AssetsIcon className="menu-icon" />
            <span>{t("menu.assets")}</span>
          </NavLink>

          <NavLink to="/auditorias" className={linkClass}>
            <AuditIcon className="menu-icon" />
            <span>{t("menu.audit")}</span>
          </NavLink>

          <NavLink to="/usuarios" className={linkClass}>
            <UsersIcon className="menu-icon" />
            <span>{t("menu.users")}</span>
          </NavLink>

          {isAdmin && (
            <NavLink to="/administracion" className={linkClass}>
              <AdminIcon className="menu-icon" />
              <span>{t("menu.admin")}</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="side-link danger"
            onClick={() => setShowLogoutModal(true)}
          >
            <SignOut className="menu-icon" />
            <span>{t("menu.logout")}</span>
          </button>
        </div>
      </aside>

      {logoutModal}
    </>
  );
}
