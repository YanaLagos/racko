import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerPredictivoApi } from "../../api/prestamos.api";
import { useTranslation } from "react-i18next";
import PredictivoRing from "./PredictivoRing";

function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function normalizeItem(x) {
  const nombre =
    x?.nombre_completo ??
    x?.nombreCompleto ??
    x?.nombreCompletoUsuario ??
    (x?.nombre && x?.apellido ? `${x.nombre} ${x.apellido}` : null);

  const prob =
    x?.probabilidad ?? x?.prob ?? x?.score ?? x?.riesgo_pct ?? x?.porcentaje;

  const nivelRaw = x?.nivel ?? x?.riesgo ?? x?.nivel_riesgo ?? x?.level;

  const nivel =
    typeof nivelRaw === "string" ? nivelRaw.toUpperCase() : nivelRaw;

  return {
    ...x,
    _nombre: nombre,
    _probabilidad: clampPct(prob ?? 0),
    _nivel: nivel ?? "SIN_DATOS",
  };
}

export default function PredictivoWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const resp = await obtenerPredictivoApi();
        const payload = resp?.data ?? resp;

        console.log("PRED RAW RESP (axios resp):", resp);
        console.log("PRED PAYLOAD (resp.data):", payload);

        let list = [];
        if (Array.isArray(payload)) list = payload;
        else if (Array.isArray(payload?.data))
          list = payload.data; // <- MUY común
        else if (payload?.ok && Array.isArray(payload?.data))
          list = payload.data;
        else if (payload?.data?.ok && Array.isArray(payload?.data?.data))
          list = payload.data.data;

        // normaliza + (opcional) filtra BAJO si por contrato no se muestra
        const normalized = list.map(normalizeItem).filter((u) => {
          const lvl = String(u._nivel).toUpperCase();
          return lvl === "MEDIO" || lvl === "ALTO";
        });

        if (mounted) {
          setItems(normalized);
          setIndex(0);
        }
      } catch (e) {
        console.error("PRED fetch error:", e);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 8000);
    return () => clearInterval(id);
  }, [items]);

  if (loading) {
    return (
      <div className="predictivo-widget">
        <div className="predictivo-title">
          {t("dashboard.predictive.title")}
        </div>
        <div className="predictivo-card">
          <div className="predictivo-icon" />
          <div className="predictivo-empty">{t("common.loading")}</div>
          <PredictivoRing percent={0} size={130} stroke={12} hasData={false} />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="predictivo-widget">
        <div className="predictivo-title">
          {t("dashboard.predictive.title")}
        </div>
        <div className="predictivo-card">
          <div className="predictivo-icon" />
          <div className="predictivo-empty">
            {t("dashboard.predictive.none")}
          </div>
          <PredictivoRing percent={0} hasData={false} />
        </div>
      </div>
    );
  }

  const u = items[index] || {};
  const hasUser = Boolean(u?._nombre);
  const pct = hasUser ? u._probabilidad : 0;
  const nivel = hasUser ? u._nivel : "SIN_DATOS";

  console.log("PRED ITEM NORMALIZED:", u);

  return (
    <div className="predictivo-widget">
      <div className="predictivo-title">{t("dashboard.predictive.title")}</div>

      <div className="predictivo-card">
        <div className="predictivo-ring-block">
          <div className="predictivo-ring-center">
            <PredictivoRing
              percent={pct}
              hasData={hasUser}
              size={150}
              stroke={16}
            />
            <div className="predictivo-pct">{hasUser ? `${pct}%` : "—"}</div>
          </div>

          <div
            className={`predictivo-level level-${String(nivel).toLowerCase()}`}
          >
            {hasUser
              ? t(`dashboard.predictive.level.${String(nivel).toLowerCase()}`)
              : t("dashboard.predictive.none")}
          </div>

          {hasUser ? (
            <div className="predictivo-user">
              <span className="predictivo-user-label">
                {t("dashboard.predictive.associatedTo")}{" "}
              </span>

              <span
                className="predictivo-user-name"
                role="link"
                tabIndex={0}
                onClick={() =>
                  navigate("/usuarios", { state: { q: u._nombre } })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/usuarios", { state: { q: u._nombre } });
                  }
                }}
              >
                {u._nombre}
              </span>
            </div>
          ) : (
            <div className="predictivo-user muted">
              {t("dashboard.predictive.noUsers")}
            </div>
          )}

          <div className="predictivo-footnote">
            {t("dashboard.predictive.hint")}
          </div>
        </div>
      </div>
    </div>
  );
}
