import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { upcomingDueApi } from "../../api/prestamos.api";

function formatFecha(fechaISO) {
  const d = new Date(fechaISO);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getWhenLabel(fechaISO, t) {
  const d = new Date(fechaISO);
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, hoy)) return t("dashboard.widget.today", "Hoy");
  if (sameDay(d, manana)) return t("dashboard.widget.tomorrow", "Mañana");

  return "";
}

export default function UpcomingDue() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const resp = await upcomingDueApi();
        if (!alive) return;

        if (resp?.ok) setItems(resp.data || []);
        else setItems([]);
      } catch {
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  let badgeText = "";
  let subtitleText = "";

  if (loading) {
    subtitleText = t("common.loading");
  } else if (items.length === 0) {
    subtitleText = t("dashboard.widget.noItems");
  } else {
    const first = items[0];
    const when = getWhenLabel(first.fecha_vencimiento, t);
    const fecha = formatFecha(first.fecha_vencimiento);

    badgeText = `${when} ${fecha}`.trim();

    subtitleText = `${first.recurso_nombre} ${t(
      "dashboard.widget.mustBeReturnedBy"
    )} ${first.usuario_externo_nombre}`;
  }

  return (
    <div className="widget" aria-label={t("dashboard.widget.upcomingDueAria")}>
      <div className="widget-icon"></div>

      <div className="widget-content">
        <div className="widget-title">
          {t("dashboard.widget.upcomingDueAria")}
        </div>

        <div className="widget-subtitle">{subtitleText}</div>
      </div>

      {badgeText && <div className="widget-badge">{badgeText}</div>}

      <div className="widget-controls">
        <button
          type="button"
          className="btn-widget"
          onClick={() => navigate("/vencimientos")}
          aria-label={t("dashboard.widget.upcomingDueAria")}
        >
          {t("dashboard.widget.goToDeadline")}
        </button>
      </div>
    </div>
  );
}
