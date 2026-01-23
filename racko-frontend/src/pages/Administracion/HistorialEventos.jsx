import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { http } from "../../api/http";
import { initResize } from "../../utils/tableResize";

const PAGE_SIZE = 30;

const EVENT_TYPES = [
  { value: "", key: "common.all", fallback: "Todos" },
  { value: "CREACION", key: "events.types.create", fallback: "Creación" },
  {
    value: "ACTUALIZACION",
    key: "events.types.update",
    fallback: "Actualización",
  },
  {
    value: "DESACTIVACION",
    key: "events.types.deactivate",
    fallback: "Desactivación",
  },
];

const REF_TYPES = [
  { value: "", key: "common.all", fallback: "Todas" },
  { value: "recurso", key: "events.ref.resource", fallback: "Recurso" },
  { value: "categoria", key: "events.ref.category", fallback: "Categoría" },
  { value: "ubicacion", key: "events.ref.location", fallback: "Ubicación" },
  { value: "externo", key: "events.ref.external", fallback: "Externo" },
  { value: "prestamo", key: "events.ref.loan", fallback: "Préstamo" },
];

const SORTS = [
  { value: "desc", key: "events.sort.mostRecent", fallback: "Más recientes" },
  { value: "asc", key: "events.sort.oldest", fallback: "Más antiguos" },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYYYYMMDD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function last7DaysRange() {
  const hoy = new Date();
  const hasta = new Date(hoy);
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - 7);
  return { desde: toYYYYMMDD(desde), hasta: toYYYYMMDD(hasta) };
}

function formatDateTimeCL(dt) {
  if (!dt) return "--";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("es-CL");
}

export default function HistorialEventos() {
  const { t } = useTranslation();

  const initialRange = useMemo(() => last7DaysRange(), []);
  const [q, setQ] = useState("");
  const [tipoEvento, setTipoEvento] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  const [desde, setDesde] = useState(initialRange.desde);
  const [hasta, setHasta] = useState(initialRange.hasta);

  const [refTipo, setRefTipo] = useState("");
  const [refValor, setRefValor] = useState("");

  const [usuario, setUsuario] = useState("");

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0 });

  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState("");

  const [page, setPage] = useState(1);

  const parseDetalle = (detalleStr) => {
    if (!detalleStr) return t("events.detail.unknown", "Evento desconocido");
    if (!detalleStr.includes("|")) return detalleStr;

    const [rawKey, ...paramsRaw] = detalleStr.split("|");

    const key = rawKey.startsWith("audit.")
      ? rawKey.replace(/^audit\./, "audits.")
      : rawKey;

    const params = {};
    paramsRaw.forEach((p) => {
      const [k, v] = p.split("=");
      if (k && v) params[k] = v;
    });

    return t(key, params);
  };

  const paramsBase = useMemo(() => {
    return {
      q: q.trim() || null,
      tipo_evento: tipoEvento || null,
      desde: desde || null,
      hasta: hasta || null,
      usuario: usuario.trim() || null,
      sortDir: sortDir || "desc",
      limit: PAGE_SIZE,
      ref_tipo: refTipo || null,
      ref: refValor.trim() || null,
    };
  }, [q, tipoEvento, desde, hasta, usuario, sortDir, refTipo, refValor]);

  async function consultar(targetPage = page) {
    try {
      setLoading(true);
      setErrorKey("");

      const resp = await http.get("/api/auditoria/movimientos", {
        params: { ...paramsBase, page: targetPage },
      });

      const data = resp?.data;

      if (!data?.ok) {
        setRows([]);
        setMeta(data?.meta || { page: targetPage, limit: PAGE_SIZE, total: 0 });
        setErrorKey(data?.error || "errors.audit.fetchFailed");
        return;
      }

      setRows(Array.isArray(data.data) ? data.data : []);
      setMeta(data.meta || { page: targetPage, limit: PAGE_SIZE, total: 0 });
      setPage(data?.meta?.page ?? targetPage);
    } catch (e) {
      setRows([]);
      setMeta({ page: targetPage, limit: PAGE_SIZE, total: 0 });
      setErrorKey(e?.response?.data?.error || "errors.audit.fetchFailed");
    } finally {
      setLoading(false);
    }
  }

  async function exportarPdf() {
    try {
      setLoading(true);
      setErrorKey("");

      const resp = await http.get("/api/auditoria/reporte.pdf", {
        params: { ...paramsBase, page: undefined },
        responseType: "blob",
      });

      const contentType = resp.headers?.["content-type"] || "";
      if (contentType.includes("application/json")) {
        const text = await resp.data.text();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {}
        setErrorKey(json?.error || "errors.audit.pdfFailed");
        return;
      }

      const file = new Blob([resp.data], { type: "application/pdf" });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(fileURL), 60_000);
    } catch (e) {
      try {
        const blob = e?.response?.data;
        if (blob && typeof blob.text === "function") {
          const text = await blob.text();
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          setErrorKey(json?.error || "errors.audit.pdfFailed");
        } else {
          setErrorKey(e?.response?.data?.error || "errors.audit.pdfFailed");
        }
      } catch {
        setErrorKey("errors.audit.pdfFailed");
      }
    } finally {
      setLoading(false);
    }
  }

  function onConsultarClick() {
    setPage(1);
    consultar(1);
  }

  function onLimpiarClick() {
    const range = last7DaysRange();
    setQ("");
    setTipoEvento("");
    setSortDir("desc");
    setDesde(range.desde);
    setHasta(range.hasta);
    setRefTipo("");
    setRefValor("");
    setUsuario("");
    setPage(1);
    setTimeout(() => consultar(1), 0);
  }

  useEffect(() => {
    consultar(1);
  }, []);

  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

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

  function getRefTipo(ev) {
    const rt = ev?.ref_tipo || ev?.refTipo || "";

    if (rt) {
      const map = {
        recurso: "events.ref.resource",
        categoria: "events.ref.category",
        ubicacion: "events.ref.location",
        externo: "events.ref.external",
        prestamo: "events.ref.loan",
        usuario_interno: "events.ref.internalUser",
      };

      const key = map[String(rt).toLowerCase()] || "events.ref.unknown";
      return t(key, "—");
    }

    if (ev?.id_recurso) return t("events.ref.resource", "Recurso");
    if (ev?.id_categoria) return t("events.ref.category", "Categoría");
    if (ev?.id_ubicacion) return t("events.ref.location", "Ubicación");
    if (ev?.rut_usuario_externo) return t("events.ref.external", "Externo");
    if (ev?.id_registro_prestamo) return t("events.ref.loan", "Préstamo");
    if (ev?.id_usuario_interno)
      return t("events.ref.internalUser", "Usuario interno");
    return "—";
  }

  function getRefValor(ev) {
    const rt = ev?.ref_tipo || ev?.refTipo || "";
    const refId = ev?.ref_id ?? ev?.refId ?? null;
    const refNombre =
      ev?.ref_nombre ?? ev?.refNombre ?? ev?.ref_valor ?? ev?.refValor ?? "";

    if (rt) {
      const rtNorm = String(rt).toLowerCase();

      if (rtNorm === "usuario_interno") {
        const name =
          refNombre ||
          `${ev?.nombre_usuario_afectado || ""} ${ev?.apellido_usuario_afectado || ""}`.trim();

        if (refId != null) return `#${refId}${name ? ` · ${name}` : ""}`;
        return name || "—";
      }

      if (refId != null && refNombre) return `#${refId} · ${refNombre}`;
      if (refId != null) return `#${refId}`;
      if (refNombre) return String(refNombre);
    }

    if (ev?.id_recurso) {
      const name = ev?.nombre_recurso ? ` · ${ev.nombre_recurso}` : "";
      return `#${ev.id_recurso}${name}`;
    }
    if (ev?.id_categoria) {
      const name = ev?.nombre_categoria ? ` · ${ev.nombre_categoria}` : "";
      return `#${ev.id_categoria}${name}`;
    }
    if (ev?.id_ubicacion) {
      const name = ev?.nombre_ubicacion ? ` · ${ev.nombre_ubicacion}` : "";
      return `#${ev.id_ubicacion}${name}`;
    }
    if (ev?.rut_usuario_externo) {
      const fullName =
        ev?.nombre_externo || ev?.apellido_externo
          ? ` · ${ev?.nombre_externo || ""} ${ev?.apellido_externo || ""}`.trim()
          : "";
      return `${ev.rut_usuario_externo}${fullName}`;
    }
    if (ev?.id_registro_prestamo) 
      return `#${ev.id_registro_prestamo}`;
    if (ev?.id_usuario_interno) {
      const name = ev?.nombre_usuario
        ? `${ev.nombre_usuario} ${ev.apellido_usuario || ""}`.trim()
        : "";
      return `#${ev.id_usuario_interno}${name ? ` · ${name}` : ""}`;
    }
    return "—";
  }

  const refValorPlaceholder =
    refTipo === "externo"
      ? t("events.filters.refValueExternalPh", "RUT o nombre/apellido")
      : refTipo
        ? t("events.filters.refValuePh", "ID o nombre")
        : t("events.filters.refValueDisabledPh", "Selecciona un tipo");

  return (
    <div className="panel events-page">
      <h1>{t("events.title", "Historial de eventos")}</h1>

      {/* FILTROS */}
      <div className="events-filters">
        <div className="events-filters-accent" aria-hidden="true" />
        <div className="events-filters-body">
          <div className="events-filters-grid">
            {/* Fila 1 */}
            <div className="events-field">
              <label>{t("events.filters.search", "Buscar")}</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("events.filters.searchPh", "Buscar en detalle…")}
              />
            </div>

            <div className="events-field">
              <label>{t("events.filters.eventType", "Tipo")}</label>
              <select
                value={tipoEvento}
                onChange={(e) => setTipoEvento(e.target.value)}
              >
                {EVENT_TYPES.map((x) => (
                  <option key={x.value} value={x.value}>
                    {t(x.key, x.fallback)}
                  </option>
                ))}
              </select>
            </div>

            <div className="events-field">
              <label>{t("events.filters.sort", "Orden")}</label>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                {SORTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.key, o.fallback)}
                  </option>
                ))}
              </select>
            </div>

            {/* Fila 2 */}
            <div className="events-field">
              <label>{t("events.filters.rangeFrom", "Desde")}</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>

            <div className="events-field">
              <label>{t("events.filters.rangeTo", "Hasta")}</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>

            <div className="events-field">
              <label>
                {t("events.filters.internalUser", "Usuario interno")}
              </label>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder={t(
                  "events.filters.internalUserPh",
                  "Nombre o apellido",
                )}
              />
            </div>

            {/* Fila 3 */}
            <div className="events-field">
              <label>{t("events.filters.refType", "Ref. tipo")}</label>
              <select
                value={refTipo}
                onChange={(e) => {
                  setRefTipo(e.target.value);
                  setRefValor("");
                }}
              >
                {REF_TYPES.map((x) => (
                  <option key={x.value} value={x.value}>
                    {t(x.key, x.fallback)}
                  </option>
                ))}
              </select>
            </div>

            <div className="events-field">
              <label>{t("events.filters.refValue", "Ref. valor")}</label>
              <input
                value={refValor}
                onChange={(e) => setRefValor(e.target.value)}
                placeholder={refValorPlaceholder}
              />
            </div>

            <div className="events-actions">
              <button
                type="button"
                className="events-btn events-btn-primary"
                onClick={onConsultarClick}
                disabled={loading}
              >
                {t("events.actions.query", "Consultar")}
              </button>

              <button
                type="button"
                className="events-btn events-btn-secondary"
                onClick={onLimpiarClick}
                disabled={loading}
              >
                {t("events.actions.clear", "Limpiar")}
              </button>

              <button
                type="button"
                className="events-btn events-btn-secondary"
                onClick={exportarPdf}
                disabled={loading}
              >
                {t("events.actions.exportPdf", "Exportar PDF")}
              </button>
            </div>
          </div>

          {loading && (
            <div className="events-hint">
              {t("common.loading", "Cargando…")}
            </div>
          )}
          {!loading && errorKey && (
            <div className="events-hint">{t(errorKey)}</div>
          )}
        </div>
      </div>

      {/* TABLA */}
      <div className="events-table-wrap">
        <table className="events-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>
                {t("events.cols.eventId", "ID")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th style={{ width: "175px" }}>
                {t("events.cols.dateTime", "Fecha/Hora")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th style={{ width: "130px" }}>
                {t("events.cols.type", "Tipo")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th style={{ width: "130px" }}>
                {t("events.cols.internalUser", "Usuario interno")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th style={{ width: "100px" }}>
                {t("events.cols.refType", "Ref. tipo")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th style={{ width: "200px" }}>
                {t("events.cols.refValue", "Ref. valor")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
              <th style={{ width: "400px" }}>
                {t("events.cols.detail", "Detalle")}
                <div className="resizer" onMouseDown={initResize} />
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((ev) => {
              const userLabel = ev?.nombre_usuario
                ? `${ev.nombre_usuario} ${ev.apellido_usuario || ""}`.trim()
                : t("events.table.unknownUser", "(sin usuario)");

              const refTipoLabel = getRefTipo(ev);
              const refValorLabel = getRefValor(ev);
              const detailLabel = parseDetalle(ev.detalle);

              return (
                <tr key={ev.id_evento}>
                  <td>{ev.id_evento}</td>
                  <td title={formatDateTimeCL(ev.fecha_hora)}>
                    {formatDateTimeCL(ev.fecha_hora)}
                  </td>
                  <td title={ev.tipo_evento || "--"}>
                    {ev.tipo_evento || "--"}
                  </td>
                  <td title={userLabel}>{userLabel}</td>
                  <td title={refTipoLabel}>{refTipoLabel}</td>
                  <td title={refValorLabel}>{refValorLabel}</td>
                  <td title={detailLabel}>{detailLabel}</td>
                </tr>
              );
            })}

            {!loading && !errorKey && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="events-empty">
                  {t("events.table.empty", "No hay registros para mostrar.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      <div className="events-meta events-meta--center">
        <div className="events-pagination-info">
          {t("events.table.total", "Total")}: <strong>{total}</strong>
          {"  "}—{"  "}
          {t(
            "events.table.pagination.pageOf",
            { page, totalPages },
            `Página ${page} de ${totalPages}`,
          )}
        </div>

        <div className="events-pagination">
          <button
            type="button"
            className="events-pagination-btn"
            onClick={goPrev}
            disabled={loading || !canPrev}
          >
            ← {t("events.table.pagination.prev", "Anterior")}
          </button>

          <button
            type="button"
            className="events-pagination-btn"
            onClick={goNext}
            disabled={loading || !canNext}
          >
            {t("events.table.pagination.next", "Siguiente")} →
          </button>
        </div>
      </div>
    </div>
  );
}
