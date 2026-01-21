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
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const resp = await upcomingDueApi();

        // soporta axios o respuesta plana
        const payload = resp?.data ?? resp;

        let list = [];
        if (Array.isArray(payload)) list = payload;
        else if (payload?.ok && Array.isArray(payload?.data)) list = payload.data;
        else if (Array.isArray(payload?.data)) list = payload.data;

        if (!alive) return;

        setItems(list);
        setIndex(0);
      } catch {
        if (alive) {
          setItems([]);
          setIndex(0);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  // ROTACIÓN: si hay más de 1, rota cada 8s
  useEffect(() => {
    if (items.length <= 1) return;

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 8000);

    return () => clearInterval(id);
  }, [items]);

  let subtitleText = "";

  if (loading) {
    subtitleText = t("common.loading");
  } else if (items.length === 0) {
    subtitleText = t("dashboard.widget.noItems");
  } else {
    const current = items[index] || items[0];
    const when = getWhenLabel(current.fecha_vencimiento, t);
    const fecha = formatFecha(current.fecha_vencimiento);
    const whenPart = `${when} ${fecha}`.trim();

    subtitleText = (
      <>
        {current.recurso_nombre} {t("dashboard.widget.mustBeReturnedBy")}{" "}
        <span className="widget-user">{current.usuario_externo_nombre}</span>
        {whenPart && (
          <>
            {" "}
            — <span className="widget-date">{whenPart}</span>
          </>
        )}
      </>
    );
  }

  return (
    <div className="widget" aria-label={t("dashboard.widget.upcomingDueAria")}>
      <div className="widget-icon"></div>

      <div className="widget-content">
        <div className="widget-title">{t("dashboard.widget.upcomingDueAria")}</div>
        <div className="widget-subtitle">{subtitleText}</div>
      </div>

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

