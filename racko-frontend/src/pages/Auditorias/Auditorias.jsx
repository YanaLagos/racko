import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  listarAuditoriasPrestamosApi,
  abrirReportePrestamosPdf,
  actualizarObservacionesPrestamoApi,
} from "../../api/Auditorias.api";

function formatDateCL(dt) {
  if (!dt) return "--";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("es-CL");
}

function normalizeRut(s) {
  if (!s) return "";
  return String(s).trim().toUpperCase().replace(/\./g, "").replace(/\s+/g, "");
}

function getEstadoPrestamo({ fecha_devolucion, fecha_vencimiento }) {
  if (fecha_devolucion) return "devuelto";
  if (!fecha_vencimiento) return "en_curso";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const venc = new Date(fecha_vencimiento);
  venc.setHours(0, 0, 0, 0);

  return venc < hoy ? "vencido" : "en_curso";
}

const MODOS = [
  { value: "en_curso", key: "audits.filters.mode.inProgress" },
  { value: "todos", key: "audits.filters.mode.all" },
  { value: "proximos_venc", key: "audits.filters.mode.upcomingDue" },
  { value: "frecuencia", key: "audits.filters.mode.frequency" },
];

const PAGE_SIZE = 30;

export default function Auditorias() {
  const { t } = useTranslation();

  const [usuario, setUsuario] = useState("");
  const [rut, setRut] = useState("");
  const [recurso, setRecurso] = useState("");
  const [dia, setDia] = useState("");

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [modo, setModo] = useState("en_curso");

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0 });

  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState("");

  const [sort, setSort] = useState({ key: "fecha_prestamo", dir: "desc" });

  const [page, setPage] = useState(1);

  const [obsOpen, setObsOpen] = useState(false);
  const [obsSaving, setObsSaving] = useState(false);
  const [obsErrorKey, setObsErrorKey] = useState("");
  const [obsRow, setObsRow] = useState(null);
  const [obsValue, setObsValue] = useState("");

  const paramsBase = useMemo(() => {
    const base = {
      usuario: usuario.trim() || null,
      rut: normalizeRut(rut) || null,
      recurso: recurso.trim() || null,
      modo,
      limit: PAGE_SIZE,
      sortKey: sort.key,
      sortDir: sort.dir,
    };

    if (modo !== "proximos_venc") {
      base.dia = dia || null;
      base.desde = desde || null;
      base.hasta = hasta || null;
    } else {
      base.dia = null;
      base.desde = null;
      base.hasta = null;
    }

    return base;
  }, [usuario, rut, recurso, dia, desde, hasta, modo, sort]);

  // FUNCIÓN PARA REDIMENSIONAR COLUMNAS
  const initResize = (e) => {
    const th = e.target.parentElement;
    const startX = e.pageX;
    const startWidth = th.offsetWidth;

    const onMouseMove = (moveEvent) => {
      const currentWidth = startWidth + (moveEvent.pageX - startX);
      if (currentWidth > 60) {
        th.style.width = `${currentWidth}px`;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "default";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
  };

  async function consultar(targetPage = page) {
    try {
      setLoading(true);
      setErrorKey("");

      const resp = await listarAuditoriasPrestamosApi({
        ...paramsBase,
        page: targetPage,
      });

      if (!resp?.ok) {
        setRows([]);
        setMeta(resp?.meta || { page: targetPage, limit: PAGE_SIZE, total: 0 });
        setErrorKey(resp?.error || "errors.audit.fetchFailed");
        return;
      }

      setRows(resp.data || []);
      setMeta(resp.meta || { page: targetPage, limit: PAGE_SIZE, total: 0 });
      setPage(resp?.meta?.page ?? targetPage);
    } catch (e) {
      setRows([]);
      setMeta({ page: targetPage, limit: PAGE_SIZE, total: 0 });
      setErrorKey(e?.response?.data?.error || "errors.audit.fetchFailed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    consultar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSort(key) {
    if (modo === "frecuencia") return;

    setSort((prev) => {
      const next =
        prev.key === key
          ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
          : { key, dir: "asc" };
      setPage(1);
      consultar(1);
      return next;
    });
  }

  function openObsModal(r) {
    setObsRow(r);
    setObsValue(r?.observaciones ?? "");
    setObsErrorKey("");
    setObsOpen(true);
  }

  function closeObsModal() {
    if (obsSaving) return;
    setObsOpen(false);
    setObsRow(null);
    setObsValue("");
    setObsErrorKey("");
  }

  async function saveObsModal() {
    if (!obsRow) return;

    try {
      setObsSaving(true);
      setObsErrorKey("");

      const payload = obsValue.trim() || null;

      const resp = await actualizarObservacionesPrestamoApi(
        obsRow.id_prestamo,
        payload
      );

      if (!resp?.ok) {
        setObsErrorKey(resp?.error || "errors.audit.updateObsFailed");
        return;
      }

      setRows((prev) =>
        prev.map((x) =>
          x.id_prestamo === obsRow.id_prestamo
            ? { ...x, observaciones: payload }
            : x
        )
      );

      closeObsModal();
    } catch (e) {
      setObsErrorKey(
        e?.response?.data?.error || "errors.audit.updateObsFailed"
      );
    } finally {
      setObsSaving(false);
    }
  }

  function generarReporte() {
    abrirReportePrestamosPdf({
      ...paramsBase,
      page: undefined,
    });
  }

  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  function onConsultarClick() {
    setPage(1);
    consultar(1);
  }

  function goPrev() {
    if (!canPrev) return;
    const nextPage = page - 1;
    setPage(nextPage);
    consultar(nextPage);
  }

  function goNext() {
    if (!canNext) return;
    const nextPage = page + 1;
    setPage(nextPage);
    consultar(nextPage);
  }

  return (
    <div className="panel audit-page">
      <h1>{t("audits.title")}</h1>
      <div className="audit-filters">
        <div className="audit-filters-accent" aria-hidden="true" />
        <div className="audit-filters-body">
          <div className="audit-filters-grid">
            {/* Fila 1 */}
            <div className="audit-field">
              <label>{t("audits.filters.externalUser")}</label>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder={t("audits.filters.externalUserPh")}
              />
            </div>

            <div className="audit-field">
              <label>{t("audits.filters.day")}</label>
              <input
                type="date"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
              />
            </div>

            <div className="audit-field">
              <label>{t("audits.filters.modeLabel")}</label>
              <select value={modo} onChange={(e) => setModo(e.target.value)}>
                {MODOS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {t(m.key)}
                  </option>
                ))}
              </select>
            </div>

            {/* Fila 2 */}
            <div className="audit-field">
              <label>{t("audits.filters.rut")}</label>
              <input
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder={t("audits.filters.rutPh")}
              />
            </div>

            <div className="audit-field">
              <label>{t("audits.filters.rangeFrom")}</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>

            <div className="audit-field" />

            {/* Fila 3 */}
            <div className="audit-field">
              <label>{t("audits.filters.resource")}</label>
              <input
                value={recurso}
                onChange={(e) => setRecurso(e.target.value)}
                placeholder={t("audits.filters.resourcePh")}
              />
            </div>

            <div className="audit-field">
              <label>{t("audits.filters.rangeTo")}</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>

            <div className="audit-actions">
              <button
                type="button"
                className="audit-btn audit-btn-primary"
                onClick={onConsultarClick}
                disabled={loading}
              >
                {t("audits.actions.query")}
              </button>
              <button
                type="button"
                className="audit-btn audit-btn-secondary"
                onClick={generarReporte}
                disabled={loading}
              >
                {t("audits.actions.report")}
              </button>
            </div>
          </div>

          {loading && <div className="audit-hint">{t("audits.loading")}</div>}
          {!loading && errorKey && (
            <div className="audit-hint">{t(errorKey)}</div>
          )}
        </div>
      </div>
      {/* CONTENEDOR DE TABLA */}
      <div className="audit-table-wrap">
        <table
          className="audit-table"
          style={{ tableLayout: "fixed", width: "100%", minWidth: "100%" }}
        >
          <thead>
            <tr>
              <th
                style={{ width: modo === "frecuencia" ? "100px" : "100px" }}
                onClick={() =>
                  toggleSort(
                    modo === "frecuencia" ? "frecuencia" : "id_prestamo"
                  )
                }
              >
                {modo === "frecuencia"
                  ? t("audits.cols.frequency")
                  : t("audits.cols.loanId")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th
                style={{ width: "200px" }}
                onClick={() => toggleSort("nombre_recurso")}
              >
                {t("audits.cols.resource")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th
                style={{ width: "180px" }}
                onClick={() => toggleSort("prestado_a")}
              >
                {t("audits.cols.loanedTo")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th
                style={{ width: "120px" }}
                onClick={() => toggleSort("rut_usuario")}
              >
                {t("audits.cols.rut")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th
                style={{ width: "150px" }}
                onClick={() => toggleSort("fecha_prestamo")}
              >
                {t("audits.cols.loanDate")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th
                style={{ width: "150px" }}
                onClick={() => toggleSort("fecha_devolucion")}
              >
                {t("audits.cols.returnDate")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th
                style={{ width: "150px" }}
                onClick={() => toggleSort("fecha_vencimiento")}
              >
                {t("audits.cols.dueDate")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th
                style={{ width: "150px" }}
                onClick={() => toggleSort("registrado_por")}
              >
                {t("audits.cols.registeredBy")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th style={{ width: "250px" }}>
                {t("audits.cols.observations")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const estado = getEstadoPrestamo(r);
              const recursoLabel =
                modo === "frecuencia" && r.frecuencia != null
                  ? `${r.nombre_recurso || "--"} (${r.frecuencia})`
                  : r.nombre_recurso || "--";

              return (
                <tr
                  key={r.id_prestamo}
                  className={`audit-row audit-row--${estado}`}
                >
                  <td>{r.id_prestamo}</td>
                  <td>{r.nombre_recurso}</td>
                  <td>{r.prestado_a || "--"}</td>
                  <td>{r.rut_usuario || "--"}</td>
                  <td>{formatDateCL(r.fecha_prestamo)}</td>
                  <td>{formatDateCL(r.fecha_devolucion)}</td>
                  <td>{formatDateCL(r.fecha_vencimiento)}</td>
                  <td>{r.registrado_por || "--"}</td>
                  <td>
                    <div className="audit-obs">
                      <span>{r.observaciones ?? t("audits.table.noObs")}</span>
                      <button
                        type="button"
                        className="audit-obs-btn"
                        onClick={() => openObsModal(r)}
                        title={t("audits.table.editObs")}
                      >
                        ✎
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && !errorKey && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="audit-empty">
                  {t("audits.table.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>{" "}
      {/* ✅ MODAL OBSERVACIONES */}
      {obsOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeObsModal();
          }}
        >
          <div
            className="modal audit-obs-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {t("audits.table.obsModalTitle", {
                  id: obsRow?.id_prestamo ?? "--",
                })}
              </h2>

              <button
                type="button"
                className="modal-close"
                onClick={closeObsModal}
                disabled={obsSaving}
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <label className="modal-label">
                {t("audits.cols.observations")}
              </label>

              <textarea
                className="modal-category-textarea"
                value={obsValue}
                onChange={(e) => setObsValue(e.target.value)}
                rows={6}
                placeholder={t("audits.table.noObs")}
                disabled={obsSaving}
              />

              {obsErrorKey && (
                <div className="modal-error">{t(obsErrorKey)}</div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={closeObsModal}
                disabled={obsSaving}
              >
                {t("common.cancel")}
              </button>

              <button
                type="button"
                className="btn-modal-primary"
                onClick={saveObsModal}
                disabled={obsSaving}
              >
                {obsSaving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PAGINACIÓN */}
      <div className="audit-meta audit-meta--center">
        <div className="audit-pagination-info">
          {t("audits.table.total")}: <strong>{total}</strong>
          {"  "}—{"  "}
          {t("audits.table.pagination.pageOf", { page, totalPages })}
        </div>

        <div className="audit-pagination">
          <button
            type="button"
            className="audit-pagination-btn"
            onClick={goPrev}
            disabled={loading || !canPrev}
          >
            ← {t("audits.table.pagination.prev")}
          </button>

          <button
            type="button"
            className="audit-pagination-btn"
            onClick={goNext}
            disabled={loading || !canNext}
          >
            {t("audits.table.pagination.next")} →
          </button>
        </div>
      </div>
    </div>
  );
}
