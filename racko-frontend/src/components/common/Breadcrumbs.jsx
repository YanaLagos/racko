import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation(); // 👈 Usamos location directamente
  const { pathname, state } = location;

  const parts = pathname.split("/").filter(Boolean);

  // Home
  if (parts.length === 0) {
    return (
      <div className="breadcrumbs">
        <span className="crumb current">{t("menu.home")}</span>
      </div>
    );
  }

  const crumbs = [{ to: "/", label: t("menu.home") }];

  // /activos
  if (parts[0] === "activos") {
    crumbs.push({
      to: "/activos",
      label: t("menu.assets", "Activos"),
    });

    // /activos/categoria/:id
    if (parts[1] === "categoria" && parts[2]) {
      // 1. Buscamos el nombre en el state de la navegación
      // 2. Si no existe (ej. entran por link directo), ponemos un fallback
      const catName = state?.categoryName || "Detalle";

      crumbs.push({
        to: pathname,
        label: catName,
      });
    }

    return (
      <div className="breadcrumbs">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.to + i} className="crumb">
              {!last ? (
                <NavLink to={c.to} className="crumb-link">
                  {c.label}
                </NavLink>
              ) : (
                <span className="crumb current">{c.label}</span>
              )}
              {!last && <span className="crumb-sep">/</span>}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="breadcrumbs">
      <span className="crumb current">{t("menu.home")}</span>
    </div>
  );
}
