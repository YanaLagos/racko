import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";

import { http } from "../../api/http";
import ExternalUserModal from "../../components/common/ExternalUserModal";
import { getUsuarioExternoByRutApi } from "../../api/Usuarios.api";
import { crearUsuarioExternoApi } from "../../api/Usuarios.api";
import { normalizeRut, isValidRut } from "../../utils/rut";
import {
  crearRecursoApi,
  actualizarRecursoApi,
  cambiarEstadoRecursoApi,
} from "../../api/Recursos.api";

import EditIcon from "../../assets/edit.svg?react";

function fmtDateCL(dt) {
  if (!dt) return "--";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("es-CL");
}
function safe(v) {
  if (v === undefined || v === null || String(v).trim() === "") return "--";
  return String(v);
}
function fullName(u) {
  if (!u) return "--";
  const n = `${u.nombre || ""} ${u.apellido || ""}`.trim();
  return n || "--";
}

function isOccupied(r) {
  return Boolean(r?.id_prestamo_activo);
}

export default function Recursos() {
  const { t } = useTranslation();
  const { id_categoria } = useParams();
  const idCat = useMemo(() => Number(id_categoria), [id_categoria]);

  const [categoria, setCategoria] = useState(null);
  const [recursos, setRecursos] = useState([]);
  const [ubicacion, setUbicacion] = useState([]);
  const [loadingUbicacion, setLoadingUbicacion] = useState(false);

  const [view, setView] = useState("cards");
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState("");

  const [selected, setSelected] = useState(null);

  // modales internos
  const [openDetails, setOpenDetails] = useState(false);
  const [openAssignRut, setOpenAssignRut] = useState(false);
  const [openConfirmLoan, setOpenConfirmLoan] = useState(false);
  const [openReturn, setOpenReturn] = useState(false);

  // modal reutilizable externo
  const [openCreateExternal, setOpenCreateExternal] = useState(false);

  // asignar
  const [rutInput, setRutInput] = useState("");
  const rutNorm = useMemo(() => normalizeRut(rutInput), [rutInput]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupErrorKey, setLookupErrorKey] = useState("");
  const [externalUser, setExternalUser] = useState(null);
  const [loanObs, setLoanObs] = useState("");
  const [dueDate, setDueDate] = useState("");

  // devolver
  const [returnObs, setReturnObs] = useState("");

  const { user } = useAuth();
  const isAdmin = Number(user?.id_rol) === 1;
  const [openCreateResource, setOpenCreateResource] = useState(false);
  const [openEditResource, setOpenEditResource] = useState(false);
  const [confirmCreateResource, setConfirmCreateResource] = useState(false);

  const [resourceForm, setResourceForm] = useState({
    nombre: "",
    descripcion: "",
    cantidad: 1,
    usarDescripcionGlobal: true,
    id_ubicacion: "",
  });

  const [savingResource, setSavingResource] = useState(false);
  const [resourceErrorKey, setResourceErrorKey] = useState("");

  async function fetchAll() {
    try {
      setLoading(true);
      setErrorKey("");

      const catResp = await http.get(`/api/categorias/${idCat}`);
      if (!catResp?.data?.ok) {
        setCategoria(null);
        setRecursos([]);
        setErrorKey(catResp?.data?.error || "errors.categories.fetchFailed");
        return;
      }
      const catData = catResp.data.data;
      setCategoria(catResp.data.data);
      document.title = `Racko | ${catData.nombre}`;

      const recResp = await http.get(`/api/recursos/categoria/${idCat}`);
      if (!recResp?.data?.ok) {
        setRecursos([]);
        setErrorKey(recResp?.data?.error || "errors.resources.fetchFailed");
        return;
      }
      setRecursos(recResp.data.data || []);
    } catch (e) {
      setCategoria(null);
      setRecursos([]);
      setErrorKey(e?.response?.data?.error || "errors.server.internal");
    } finally {
      setLoading(false);
    }
  }
  async function fetchUbicacion() {
    try {
      setLoadingUbicacion(true);

      const resp = await http.get("/api/ubicacion");
      console.log("UBICACIONES RESP:", resp?.status, resp?.data);

      if (!resp?.data?.ok) {
        setUbicacion([]);
        return;
      }

      setUbicacion(resp.data.data || []);
    } catch (e) {
      console.error(
        "Error cargando ubicacion:",
        e?.response?.status,
        e?.response?.data || e,
      );
      setUbicacion([]);
    } finally {
      setLoadingUbicacion(false);
    }
  }

  function openCreateResourceModal() {
    setResourceErrorKey("");
    setResourceForm({
      nombre: "",
      descripcion: "",
      cantidad: 1,
      usarDescripcionGlobal: true,
      id_ubicacion: "",
    });
    setConfirmCreateResource(false);
    setOpenCreateResource(true);
  }
  async function handleCreateResources() {
    if (!isAdmin) return;

    const prefijo = resourceForm.nombre.trim();
    const cantidad = Number(resourceForm.cantidad);

    const idUbicacion = Number(resourceForm.id_ubicacion);

    if (!prefijo || !cantidad || cantidad <= 0 || !idUbicacion) {
      setResourceErrorKey("errors.validation.requiredFields");
      return;
    }

    try {
      setSavingResource(true);
      setResourceErrorKey("");

      for (let i = 1; i <= cantidad; i++) {
        const nombreFinal =
          cantidad === 1 ? prefijo : `${prefijo}${String(i).padStart(2, "0")}`;

        await crearRecursoApi({
          nombre: nombreFinal,
          id_categoria: idCat,
          id_ubicacion: idUbicacion,
          descripcion:
            resourceForm.usarDescripcionGlobal && resourceForm.descripcion
              ? resourceForm.descripcion.trim()
              : null,
        });
      }

      setOpenCreateResource(false);
      setConfirmCreateResource(false);
      await fetchAll();
    } catch (e) {
      setResourceErrorKey(
        e?.response?.data?.error || "errors.resources.createFailed",
      );
    } finally {
      setSavingResource(false);
    }
  }
  function openEditResourceModal(r) {
    if (isOccupied(r)) return;

    setSelected(r);
    setResourceErrorKey("");
    setResourceForm({
      nombre: r.nombre || "",
      descripcion: r.descripcion || "",
      cantidad: 1,
      usarDescripcionGlobal: true,
    });
    setOpenEditResource(true);
  }
  async function handleSaveEditResource() {
    if (!selected) return;

    const nombre = resourceForm.nombre.trim();
    if (!nombre) {
      setResourceErrorKey("errors.validation.requiredFields");
      return;
    }

    try {
      setSavingResource(true);
      setResourceErrorKey("");

      await actualizarRecursoApi(selected.id_recurso, {
        nombre,
        descripcion: resourceForm.descripcion || null,
        id_categoria: selected.id_categoria,
        id_ubicacion: selected.id_ubicacion,
      });

      setOpenEditResource(false);
      setSelected(null);
      await fetchAll();
    } catch (e) {
      setResourceErrorKey(
        e?.response?.data?.error || "errors.resources.updateFailed",
      );
    } finally {
      setSavingResource(false);
    }
  }
  async function handleDeactivateResource() {
    if (!selected) return;

    if (
      !window.confirm(`¿Confirmas desactivar el recurso "${selected.nombre}"?`)
    )
      return;

    try {
      setSavingResource(true);
      await cambiarEstadoRecursoApi(selected.id_recurso, 0);
      setOpenEditResource(false);
      setSelected(null);
      await fetchAll();
    } finally {
      setSavingResource(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(idCat) || idCat <= 0) {
      setLoading(false);
      setErrorKey("errors.validation.invalidCategoryId");
      return;
    }
    fetchAll();
    fetchUbicacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCat]);

  function openDetailsModal(r) {
    setSelected(r);
    setOpenDetails(true);
  }

  function openAssignModal(r) {
    setSelected(r);
    setRutInput("");
    setLookupErrorKey("");
    setExternalUser(null);
    setLoanObs("");
    setDueDate("");
    setOpenAssignRut(true);
  }

  function openReturnModal(r) {
    setSelected(r);
    setReturnObs(r?.observaciones ?? "");
    setOpenReturn(true);
  }

  async function lookupUserByRut() {
    setLookupErrorKey("");
    setExternalUser(null);

    if (!rutInput.trim()) {
      setLookupErrorKey("errors.validation.requiredFields");
      return;
    }
    if (!rutNorm || !isValidRut(rutInput)) {
      setLookupErrorKey("errors.validation.invalidRut");
      return;
    }

    try {
      setLookupLoading(true);
      const resp = await getUsuarioExternoByRutApi(rutNorm);

      if (resp?.ok) {
        setExternalUser(resp.data);
        return;
      }
    } catch (e) {
      const err = e?.response?.data?.error;
      if (e?.response?.status === 404) {
        setLookupErrorKey("errors.externalUsers.notFound");
      } else {
        setLookupErrorKey(err || "errors.externalUsers.fetchFailed");
      }
    } finally {
      setLookupLoading(false);
    }
  }

  function goToConfirmLoan() {
    if (!externalUser) return;
    setOpenAssignRut(false);
    setOpenConfirmLoan(true);
  }

  async function confirmLoan() {
    if (!selected || !externalUser) return;

    try {
      setLoading(true);
      setErrorKey("");

      const payload = {
        rut_usuario_ext: externalUser.rut,
        id_recurso: selected.id_recurso,
        fecha_vencimiento: dueDate || null,
        observaciones: loanObs?.trim() ? loanObs.trim() : null,
      };

      const resp = await http.post("/api/prestamos/prestar", payload);
      if (!resp?.data?.ok) {
        setErrorKey(resp?.data?.error || "errors.server.internal");
        return;
      }

      setOpenConfirmLoan(false);
      setSelected(null);
      setExternalUser(null);
      setLoanObs("");
      await fetchAll();
    } catch (e) {
      setErrorKey(e?.response?.data?.error || "errors.server.internal");
    } finally {
      setLoading(false);
    }
  }

  function onExternalCreated(createdPayload) {
    setExternalUser({
      rut: createdPayload?.rut,
      nombre: createdPayload?.nombre,
      apellido: createdPayload?.apellido,
      telefono: createdPayload?.telefono,
      email: createdPayload?.email,
      direccion: createdPayload?.direccion,
    });
    setOpenCreateExternal(false);
    setOpenConfirmLoan(true);
  }

  async function confirmReturn() {
    if (!selected?.id_prestamo_activo) return;

    const idPrestamo = selected.id_prestamo_activo;

    try {
      setLoading(true);
      setErrorKey("");

      const obsTrim = returnObs?.trim();
      const originalObs = (selected?.observaciones ?? "").trim();

      if ((obsTrim || "") !== (originalObs || "")) {
        const obsResp = await http.patch(
          `/api/prestamos/observaciones/${idPrestamo}`,
          {
            observaciones: obsTrim ? obsTrim : null,
          },
        );
        if (!obsResp?.data?.ok) {
          setErrorKey(obsResp?.data?.error || "errors.server.internal");
          return;
        }
      }

      const devResp = await http.patch(`/api/prestamos/devolver/${idPrestamo}`);
      if (!devResp?.data?.ok) {
        setErrorKey(devResp?.data?.error || "errors.server.internal");
        return;
      }

      setOpenReturn(false);
      setSelected(null);
      setReturnObs("");
      await fetchAll();
    } catch (e) {
      setErrorKey(e?.response?.data?.error || "errors.server.internal");
    } finally {
      setLoading(false);
    }
  }

  const title = categoria?.nombre || t("assets.resources.titleFallback");
  const desc = categoria?.descripcion ? String(categoria.descripcion) : "";

  return (
    <div className="res-panel">
      <div className="res-header">
        <h1 className="res-title">{title}</h1>
        {isAdmin && (
          <button
            type="button"
            className="cat-btn-category"
            onClick={openCreateResourceModal}
            disabled={loading}
          >
            {t("assets.actions.create", "Crear recurso")}
          </button>
        )}

        <div className="res-view-toggle">
          <span className="res-view-label">
            {t("assets.view.label", "Vista")}
          </span>
          <button
            type="button"
            className={`res-icon-btn ${view === "cards" ? "active" : ""}`}
            onClick={() => setView("cards")}
            aria-label={t("assets.view.cards")}
            title={t("assets.view.cards")}
          >
            {/* tu svg cards */}
          </button>

          <button
            type="button"
            className={`res-icon-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
            aria-label={t("assets.view.list")}
            title={t("assets.view.list")}
          ></button>
        </div>
      </div>

      <div className="res-divider" />

      {desc ? <p className="res-category-desc">{desc}</p> : null}

      {loading && <p>{t("common.loading")}</p>}
      {!loading && errorKey && <p className="error">{t(errorKey)}</p>}

      {!loading && !errorKey && recursos.length === 0 && (
        <p>{t("assets.resources.empty")}</p>
      )}

      {!loading && !errorKey && recursos.length > 0 && (
        <>
          {view === "cards" ? (
            <div className="res-grid">
              {recursos.map((r) => {
                const ocupado = isOccupied(r);

                return (
                  <div
                    key={r.id_recurso}
                    className={`res-card-shell ${
                      ocupado ? "is-occupied" : "is-available"
                    }`}
                  >
                    <article className="res-card-inner">
                      <h3 className="res-card-title">{r.nombre}</h3>
                      {isAdmin && !isOccupied(r) && (
                        <button
                          type="button"
                          className="res-card-edit"
                          onClick={() => openEditResourceModal(r)}
                          title={t("common.edit", "Modificar")}
                          aria-label={t("common.edit", "Modificar")}
                        >
                          <EditIcon className="res-card-edit-icon" />
                        </button>
                      )}
                      <div className="res-card-divider" />

                      <div className="res-card-label">
                        {t("assets.details.loanStart")}
                      </div>
                      <div className="res-card-date">
                        {ocupado ? fmtDateCL(r.fecha_prestamo) : "--"}
                      </div>

                      <button
                        type="button"
                        className="res-card-link"
                        onClick={() => openDetailsModal(r)}
                      >
                        {t("assets.actions.viewMore")}
                      </button>

                      <button
                        type="button"
                        className={`res-card-btn ${
                          ocupado ? "danger" : "success"
                        }`}
                        onClick={() =>
                          ocupado ? openReturnModal(r) : openAssignModal(r)
                        }
                      >
                        {ocupado
                          ? t("assets.actions.return")
                          : t("assets.actions.assign")}
                      </button>
                    </article>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="res-table-wrap">
              <table className="res-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{t("audits.cols.resource", "Recurso")}</th>
                    <th>{t("assets.details.description")}</th>
                    <th>{t("assets.details.category")}</th>
                    <th>{t("assets.details.location")}</th>
                    <th>{t("assets.details.usage")}</th>
                    <th>{t("assets.details.state")}</th>
                    <th>{t("assets.actions.loan")}</th>
                    <th>{t("assets.details.details", "Ver más")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recursos.map((r) => {
                    const ocupado = isOccupied(r);
                    return (
                      <tr key={r.id_recurso}>
                        <td>{r.id_recurso}</td>
                        <td>
                          <div className="res-namecell">
                            <span
                              className={`res-dot ${
                                ocupado ? "is-occupied" : "is-available"
                              }`}
                              aria-hidden="true"
                            />
                            <span className="res-name">{r.nombre}</span>
                          </div>
                        </td>
                        <td>{safe(r.descripcion)}</td>
                        <td>{safe(r.nombre_categoria)}</td>
                        <td>{safe(r.nombre_ubicacion)}</td>
                        <td>{safe(r.uso_acumulado)}</td>
                        <td>
                          {r.estado === 1
                            ? t("assets.status.active")
                            : t("assets.status.inactive")}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="res-icon-btn"
                            onClick={() =>
                              ocupado ? openReturnModal(r) : openAssignModal(r)
                            }
                            title={
                              ocupado
                                ? t("assets.actions.return")
                                : t("assets.actions.assign")
                            }
                          >
                            {ocupado ? "↩" : "+"}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => openDetailsModal(r)}
                          >
                            {t("assets.actions.viewMore", "Ver más")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {/* ========== MODAL: Detalle recurso ========== */}
      {openDetails && selected && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setOpenDetails(false)}
          role="presentation"
        >
          <div
            className="modal res-modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header-gradient">
              <div className="header-title-group">
                <h3>{t("assets.details.title")}</h3>
                <p className="header-subtitle">{selected.nombre}</p>
              </div>

              <button
                className="modal-close-icon"
                onClick={() => setOpenDetails(false)}
                aria-label="Cerrar"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-body-content">
              <div className="res-modal-info">
                <div className="res-info-row">
                  <span className="res-info-k">
                    {t("assets.details.resourceId")}:{" "}
                  </span>
                  <span className="res-info-v">
                    {safe(selected.id_recurso)}
                  </span>
                </div>

                <div className="res-info-row">
                  <span className="res-info-k">
                    {t("assets.details.category", "Categoría")}:{" "}
                  </span>
                  <span className="res-info-v">
                    {safe(selected.nombre_categoria)}
                  </span>
                </div>

                <div className="res-info-row">
                  <span className="res-info-k">
                    {t("assets.details.location", "Ubicación")}:{" "}
                  </span>
                  <span className="res-info-v">
                    {safe(selected.nombre_ubicacion)}
                  </span>
                </div>

                <div className="res-info-row">
                  <span className="res-info-k">
                    {t("assets.details.description")}:{" "}
                  </span>
                  <span className="res-info-v">
                    {safe(selected.descripcion)}
                  </span>
                </div>

                <div className="res-info-row">
                  <span className="res-info-k">
                    {t("assets.details.usage")}:{" "}
                  </span>
                  <span className="res-info-v">
                    {safe(selected.uso_acumulado)}
                  </span>
                </div>

                <div className="res-info-row">
                  <span className="res-info-k">
                    {t("assets.details.state")}:{" "}
                  </span>
                  <span className="res-info-v">
                    {selected.estado === 1
                      ? t("assets.status.active")
                      : t("assets.status.inactive")}
                  </span>
                </div>

                <div className="res-info-divider" />

                <div className="res-info-row">
                  <span className="res-info-k">
                    {t("assets.details.loanActive")}:{" "}
                  </span>
                  <span className="res-info-v">
                    {selected.id_prestamo_activo
                      ? t("common.yes")
                      : t("common.no")}
                  </span>
                </div>

                {selected.id_prestamo_activo && (
                  <>
                    <div className="res-info-row">
                      <span className="res-info-k">
                        {t("assets.details.loanId")}:{" "}
                      </span>
                      <span className="res-info-v">
                        {safe(selected.id_prestamo_activo)}
                      </span>
                    </div>
                    <div className="res-info-row">
                      <span className="res-info-k">
                        {t("assets.details.loanStart")}:{" "}
                      </span>
                      <span className="res-info-v">
                        {fmtDateCL(selected.fecha_prestamo)}
                      </span>
                    </div>
                    <div className="res-info-row">
                      <span className="res-info-k">
                        {t("assets.details.loanDue")}:{" "}
                      </span>
                      <span className="res-info-v">
                        {fmtDateCL(selected.fecha_vencimiento)}
                      </span>
                    </div>
                    <div className="res-info-row">
                      <span className="res-info-k">
                        {t("assets.details.loanRut")}:{" "}
                      </span>
                      <span className="res-info-v">
                        {safe(selected.rut_usuario)}
                      </span>
                    </div>
                    <div className="res-info-row">
                      <span className="res-info-k">
                        {t("assets.details.loanTo")}:{" "}
                      </span>
                      <span className="res-info-v">
                        {safe(selected.prestado_a)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: Asignar =========== */}
      {openAssignRut && selected && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setOpenAssignRut(false)}
          role="presentation"
        >
          <div
            className="modal modal-assign"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header-simple">
              <h3>{t("assets.assignFlow.title", "Asignar Recurso")}</h3>
              <p>
                {t(
                  "assets.assignFlow.subtitle",
                  "Ingrese el RUT del usuario externo",
                )}
              </p>
            </div>

            {lookupErrorKey && (
              <div
                className={`modal-status-message ${
                  lookupErrorKey === "errors.externalUsers.notFound"
                    ? "warning"
                    : "error"
                }`}
              >
                {lookupErrorKey === "errors.externalUsers.notFound"
                  ? t(
                      "errors.externalUsers.notFoundMsg",
                      "El usuario no existe. ¿Deseas registrarlo?",
                    )
                  : t(lookupErrorKey)}
              </div>
            )}

            <div className="modal-form-grid">
              <div className="field full">
                <label>{t("assets.assignFlow.rutLabel", "RUT")}</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    className="input-modal-user"
                    value={rutInput}
                    onChange={(e) => setRutInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && lookupUserByRut()}
                    placeholder={t("assets.assignFlow.rutPh", "12345678-k")}
                    disabled={lookupLoading}
                    autoFocus
                  />
                </div>
              </div>

              {externalUser && (
                <div className="field full">
                  <div className="res-mini animated-fade-in">
                    <div className="res-mini-title">
                      {t(
                        "assets.assignFlow.userFound",
                        "Usuario Verificado",
                      )}
                    </div>
                    <div className="res-mini-line">
                      <strong>{fullName(externalUser)}</strong>
                    </div>
                    <div className="res-mini-line">
                      {safe(externalUser.rut)}
                    </div>
                    <div className="res-mini-line">
                      {safe(externalUser.email)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {externalUser ? (
                <button
                  className="btn-modal-logout"
                  type="button"
                  onClick={goToConfirmLoan}
                >
                  {t("assets.actions.continue", "Continuar")}
                </button>
              ) : (
                <>
                  {lookupErrorKey === "errors.externalUsers.notFound" && (
                    <button
                      className="btn-modal-register"
                      type="button"
                      onClick={() => {
                        setOpenAssignRut(false);
                        setOpenCreateExternal(true);
                      }}
                    >
                      {t("assets.actions.register", "Registrar Nuevo")}
                    </button>
                  )}

                  <button
                    className="btn-modal-logout"
                    type="button"
                    onClick={lookupUserByRut}
                    disabled={lookupLoading}
                  >
                    {lookupLoading
                      ? t("common.searching", "Buscando...")
                      : t("common.search", "Buscar")}
                  </button>
                </>
              )}

              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenAssignRut(false)}
                disabled={lookupLoading}
              >
                {t("common.cancel", "Cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: Confirmar préstamo ========== */}
      {openConfirmLoan && selected && externalUser && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setOpenConfirmLoan(false)}
          role="presentation"
        >
          <div
            className="modal modal-confirm-loan"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>{t("assets.confirmLoan.title")}</h3>
            <p>{t("assets.confirmLoan.subtitle")}</p>

            <div className="res-modal-info">
              <div className="res-info-row">
                <span className="res-info-k">
                  {t("audits.cols.resource", "Recurso")}:
                </span>
                <span className="res-info-v">{safe(selected.nombre)}</span>
              </div>
              <div className="res-info-row">
                <span className="res-info-k">
                  {t("assets.details.loanTo")}:
                </span>
                <span className="res-info-v">{fullName(externalUser)}</span>
              </div>
              <div className="res-info-row">
                <span className="res-info-k">
                  {t("assets.details.loanRut")}:
                </span>
                <span className="res-info-v">{safe(externalUser.rut)}</span>
              </div>
            </div>

            <div className="res-info-k">
              <label>
                {t("assets.details.loanDue", "Fecha de vencimiento")}
              </label>
              <input
                type="date"
                className="input-modal-date"
                value={dueDate || ""}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <small className="field-muted">
                {t("assets.confirmLoan.option")}
              </small>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label>{t("assets.confirmLoan.observationsLabel")}</label>
              <textarea
                className="res-textarea"
                value={loanObs}
                onChange={(e) => setLoanObs(e.target.value)}
                placeholder={t("assets.confirmLoan.observationsPh")}
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-modal-logout"
                type="button"
                onClick={confirmLoan}
                disabled={loading}
              >
                {t("assets.confirmLoan.assign")}
              </button>
              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenConfirmLoan(false)}
                disabled={loading}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: Devolver ========== */}
      {openReturn && selected && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setOpenReturn(false)}
          role="presentation"
        >
          <div
            className="modal modal-return-loan"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>{t("assets.returnFlow.title")}</h3>
            <p>{t("assets.returnFlow.subtitle")}</p>

            <div className="res-modal-info">
              <div className="res-info-row">
                <span className="res-info-k">
                  {t("assets.details.loanId")}
                </span>
                <span className="res-info-v">
                  {safe(selected.id_prestamo_activo)}
                </span>
              </div>
              <div className="res-info-row">
                <span className="res-info-k">
                  {t("audits.cols.resource", "Recurso")}
                </span>
                <span className="res-info-v">{safe(selected.nombre)}</span>
              </div>
              <div className="res-info-row">
                <span className="res-info-k">
                  {t("assets.details.loanTo")}
                </span>
                <span className="res-info-v">{safe(selected.prestado_a)}</span>
              </div>
              <div className="res-info-row">
                <span className="res-info-k">
                  {t("assets.details.loanStart")}
                </span>
                <span className="res-info-v">
                  {fmtDateCL(selected.fecha_prestamo)}
                </span>
              </div>
              <div className="res-info-row">
                <span className="res-info-k">
                  {t("assets.details.loanDue")}
                </span>
                <span className="res-info-v">
                  {fmtDateCL(selected.fecha_vencimiento)}
                </span>
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label>{t("assets.returnFlow.observationsLabel")}</label>
              <textarea
                className="res-textarea"
                value={returnObs}
                onChange={(e) => setReturnObs(e.target.value)}
                placeholder={t("assets.returnFlow.observationsPh")}
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-modal-logout"
                type="button"
                onClick={confirmReturn}
                disabled={loading}
              >
                {t("assets.actions.return")}
              </button>
              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenReturn(false)}
                disabled={loading}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: crear usuario interno - reutilizable ========== */}
      <ExternalUserModal
        open={openCreateExternal}
        onClose={() => setOpenCreateExternal(false)}
        onCreated={onExternalCreated}
        crearUsuarioExternoApi={crearUsuarioExternoApi}
        initialRut={rutInput}
      />
      {/* ========== MODAL: crear recurso ========== */}
      {openCreateResource && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setOpenCreateResource(false)}
          role="presentation"
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>{t("assets.actions.create", "Crear recurso")}</h3>

            {resourceErrorKey && <p className="error">{t(resourceErrorKey)}</p>}

            <div className="field" style={{ marginTop: 10 }}>
              <label>{t("assets.fields.prefix", "Nombre / prefijo")}</label>
              <input
                className="input"
                value={resourceForm.nombre}
                onChange={(e) =>
                  setResourceForm((p) => ({ ...p, nombre: e.target.value }))
                }
                disabled={savingResource}
                autoFocus
              />
              <small className="field-muted">
                {t(
                  "assets.fields.prefixHint",
                  'Si creas varios, se numerarán como "Guitarra01, Guitarra02..."',
                )}
              </small>
            </div>

            <div className="field" style={{ marginTop: 10 }}>
              <label>{t("assets.fields.quantity", "Cantidad")}</label>
              <input
                className="input"
                type="number"
                min={1}
                value={resourceForm.cantidad}
                onChange={(e) =>
                  setResourceForm((p) => ({
                    ...p,
                    cantidad: Number(e.target.value || 1),
                  }))
                }
                disabled={savingResource}
              />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!resourceForm.usarDescripcionGlobal}
                  onChange={(e) =>
                    setResourceForm((p) => ({
                      ...p,
                      usarDescripcionGlobal: !e.target.checked,
                    }))
                  }
                  disabled={savingResource}
                />
                {t(
                  "assets.field.descLater",
                  "Ingresar descripción más tarde (individual)",
                )}
              </label>

              <small className="field-muted">
                {t(
                  "assets.fields.descHint",
                  "Si no marcas esto, se guardará la misma descripción para todos los recursos creados.",
                )}
              </small>
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label>{t("assets.fields.location", "Ubicación")}</label>

              <select
                className="input"
                value={resourceForm.id_ubicacion}
                onChange={(e) =>
                  setResourceForm((p) => ({
                    ...p,
                    id_ubicacion: e.target.value,
                  }))
                }
                disabled={savingResource || loadingUbicacion}
              >
                <option value="">
                  {loadingUbicacion
                    ? t("common.loading", "Cargando...")
                    : t("common.select", "Selecciona una opción")}
                </option>

                {ubicacion.map((u) => (
                  <option key={u.id_ubicacion} value={u.id_ubicacion}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ marginTop: 10 }}>
              <label>{t("assets.fields.description", "Descripción")}</label>
              <textarea
                className="modal-category-textarea"
                rows={4}
                value={resourceForm.descripcion}
                onChange={(e) =>
                  setResourceForm((p) => ({
                    ...p,
                    descripcion: e.target.value,
                  }))
                }
                disabled={savingResource || !resourceForm.usarDescripcionGlobal}
                placeholder={t(
                  "assets.fields.descPh",
                  "Ej: Guitarra acústica, cuerdas nuevas...",
                )}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="btn-modal-primary"
                type="button"
                onClick={() => setConfirmCreateResource(true)}
                disabled={savingResource}
              >
                {t("common.continue", "Continuar")}
              </button>

              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenCreateResource(false)}
                disabled={savingResource}
              >
                {t("common.cancel", "Cancelar")}
              </button>
            </div>

            {confirmCreateResource && (
              <div className="modal-confirm-section" style={{ marginTop: 14 }}>
                <p className="modal-hint">
                  {t(
                    "assets.fields.confirm",
                    "Confirma los datos antes de guardar:",
                  )}
                </p>

                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <div>
                    <strong>
                      {t("assets.fields.prefix", "Nombre / prefijo")}:
                    </strong>{" "}
                    {resourceForm.nombre || "--"}
                  </div>
                  <div>
                    <strong>
                      {t("assets.fields.quantity", "Cantidad")}:
                    </strong>{" "}
                    {resourceForm.cantidad || 1}
                  </div>
                  <div>
                    <strong>
                      {t("assets.fields.location", "Ubicación")}:
                    </strong>{" "}
                    {ubicacion.find(
                      (u) =>
                        String(u.id_ubicacion) ===
                        String(resourceForm.id_ubicacion),
                    )?.nombre || "--"}
                  </div>
                  <div>
                    <strong>
                      {t("assets.fields.description", "Descripción")}:
                    </strong>{" "}
                    {resourceForm.usarDescripcionGlobal
                      ? resourceForm.descripcion?.trim() || "--"
                      : t(
                          "assets.field.descLaterShort",
                          "Se agregará después",
                        )}
                  </div>
                </div>

                <div
                  className="modal-confirm-actions"
                  style={{ marginTop: 10 }}
                >
                  <button
                    className="btn-modal-primary"
                    type="button"
                    onClick={handleCreateResources}
                    disabled={savingResource}
                  >
                    {savingResource
                      ? t("common.saving", "Guardando...")
                      : t("common.confirm", "Confirmar")}
                  </button>

                  <button
                    className="btn-modal-cancel"
                    type="button"
                    onClick={() => setConfirmCreateResource(false)}
                    disabled={savingResource}
                  >
                    {t("common.cancel", "Cancelar")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ========== MODAL: editar recurso ========== */}
      {openEditResource && selected && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setOpenEditResource(false)}
          role="presentation"
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>
              {t("common.edit", "Modificar")}{" "}
              {t("audits.cols.resource", "Recurso")}
            </h3>

            {isOccupied(selected) && (
              <p className="error">
                {t(
                  "assets.editBlocked",
                  "No se puede editar: recurso prestado",
                )}
              </p>
            )}

            {resourceErrorKey && <p className="error">{t(resourceErrorKey)}</p>}

            <div className="field" style={{ marginTop: 12 }}>
              <label>ID</label>
              <input
                className="input-muted"
                value={selected.id_recurso}
                disabled
              />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>{t("assets.fields.name", "Nombre")}</label>
              <input
                className="input"
                value={resourceForm.nombre}
                onChange={(e) =>
                  setResourceForm((p) => ({ ...p, nombre: e.target.value }))
                }
                disabled={savingResource || isOccupied(selected)}
              />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>{t("assets.fields.description", "Descripción")}</label>
              <textarea
                className="modal-category-textarea"
                rows={4}
                value={resourceForm.descripcion}
                onChange={(e) =>
                  setResourceForm((p) => ({
                    ...p,
                    descripcion: e.target.value,
                  }))
                }
                disabled={savingResource || isOccupied(selected)}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="btn-modal-primary"
                type="button"
                onClick={handleSaveEditResource}
                disabled={savingResource || isOccupied(selected)}
              >
                {t("common.save", "Guardar cambios")}
              </button>

              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenEditResource(false)}
                disabled={savingResource}
              >
                {t("common.cancel", "Cancelar")}
              </button>
            </div>

            <div
              style={{
                marginTop: 8,
                paddingTop: 12,
                borderTop: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <p className="modal-form-hint">
                {t(
                  "assets.deactivateHint",
                  "Al desactivar el recurso, dejará de estar disponible para nuevos préstamos. Esta acción se puede revertir desde administración.",
                )}
              </p>

              <button
                type="button"
                className="btn-deactivate"
                onClick={handleDeactivateResource}
                disabled={savingResource || isOccupied(selected)}
              >
                {t("common.deactivate", "Desactivar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
