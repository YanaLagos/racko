import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listarAuditoriasPrestamosApi } from "../../api/Auditorias.api";

function fmtDateTimeCL(dt) {
  if (!dt) return "--";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("es-CL");
}

function getMovimientoTipo(row) {
  return row?.fecha_devolucion ? "RETURN" : "LOAN";
}

export default function UltimosPrestamos({ limit = 5 }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErrorKey("");

      const resp = await listarAuditoriasPrestamosApi({
        page: 1,
        limit,
        modo: "todos",
        sortKey: "fecha_prestamo",
        sortDir: "desc",
      });

      if (!resp?.ok) {
        setRows([]);
        setErrorKey(resp?.error || "errors.audit.fetchFailed");
        return;
      }

      setRows(resp.data || []);
    } catch (e) {
      setRows([]);
      setErrorKey(e?.response?.data?.error || "errors.audit.fetchFailed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

  }, [limit]);

  function goToCategoria(row) {
    const idCat = row?.id_categoria;
    if (!idCat) return;
    navigate(`/activos/categoria/${idCat}`);
  }

  return (
    <section className="dash-card dash-lastloans">
      <div className="dash-card-head">
        <h2 className="dash-card-title">{t("dashboard.lastMoves.title")}</h2>
      </div>

      {loading && <div className="dash-hint">{t("common.loading")}</div>}
      {!loading && errorKey && <div className="dash-hint">{t(errorKey)}</div>}

      {!loading && !errorKey && rows.length === 0 && (
        <div className="dash-hint">{t("dashboard.lastMoves.empty")}</div>
      )}

      {!loading && !errorKey && rows.length > 0 && (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>{t("dashboard.lastMoves.cols.detail.detail")}</th>
                <th>{t("dashboard.lastMoves.cols.resource")}</th>
                <th>{t("dashboard.lastMoves.cols.user")}</th>
                <th>{t("dashboard.lastMoves.cols.date")}</th>
                <th style={{ width: 120 }} />
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const tipo = getMovimientoTipo(r);
                const fecha = r?.fecha_devolucion || r?.fecha_prestamo;

                const detailKey =
                  tipo === "RETURN"
                    ? "dashboard.lastMoves.cols.detail.return"
                    : "dashboard.lastMoves.cols.detail.loan";

                return (
                  <tr key={r.id_prestamo}>
                    <td>
                      <span
                        className={`dash-pill ${
                          tipo === "LOAN" ? "loan" : "return"
                        }`}
                      >
                        {t(detailKey)}
                      </span>
                    </td>

                    <td
                      className="dash-td-truncate"
                      title={r?.nombre_recurso || ""}
                    >
                      {r?.nombre_recurso || "--"}
                    </td>

                    <td className="user-name">{r?.prestado_a || "--"}</td>

                    <td>{fmtDateTimeCL(fecha)}</td>

                    <td>
                      <button
                        type="button"
                        className="dash-btn"
                        onClick={() => goToCategoria(r)}
                        disabled={!r?.id_categoria}
                        title={
                          !r?.id_categoria
                            ? t("dashboard.lastMoves.noCategoryTitle")
                            : t("dashboard.lastMoves.viewCategoryTitle")
                        }
                      >
                        {t("assets.actions.viewResources")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

