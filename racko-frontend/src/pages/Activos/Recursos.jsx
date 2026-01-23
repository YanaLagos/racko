import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";

import { http } from "../../api/http";
import RecursosModals from "./RecursosModals";
import { getUsuarioExternoByRutApi } from "../../api/Usuarios.api";
import { crearUsuarioExternoApi } from "../../api/Usuarios.api";
import { normalizeRut, isValidRut } from "../../utils/rut";
import {
  crearRecursoApi,
  actualizarRecursoApi,
  cambiarEstadoRecursoApi,
} from "../../api/Recursos.api";

import EditIcon from "../../assets/edit.svg?react";
import ViewGrid from "../../assets/view-grid.svg?react";
import ViewList from "../../assets/view-list.svg?react";

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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const apply = () => {
      const mobileNow = mq.matches;
      setIsMobile(mobileNow);
      if (mobileNow) setView("cards");
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState("");

  const [selected, setSelected] = useState(null);

  // modales internos
  const [openDetails, setOpenDetails] = useState(false);
  const [openAssignRut, setOpenAssignRut] = useState(false);
  const [openConfirmLoan, setOpenConfirmLoan] = useState(false);
  const [openReturn, setOpenReturn] = useState(false);
  const [openConfirmDeactivate, setOpenConfirmDeactivate] = useState(false);

  const [openCreateExternal, setOpenCreateExternal] = useState(false);

  const [rutInput, setRutInput] = useState("");
  const rutNorm = useMemo(() => normalizeRut(rutInput), [rutInput]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupErrorKey, setLookupErrorKey] = useState("");
  const [externalUser, setExternalUser] = useState(null);
  const [loanObs, setLoanObs] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [returnObs, setReturnObs] = useState("");

  const { user } = useAuth();
  const isAdmin = Number(user?.id_rol) === 1;

  const [openCreateResource, setOpenCreateResource] = useState(false);
  const [openEditResource, setOpenEditResource] = useState(false);

  const [confirmCreateResource, setConfirmCreateResource] = useState(false);

  const [originalResourceForm, setOriginalResourceForm] = useState(null);

  const [resourceForm, setResourceForm] = useState({
    nombre: "",
    descripcion: "",
    cantidad: 1,
    usarDescripcionGlobal: true,
    id_ubicacion: "",
  });

  const [savingResource, setSavingResource] = useState(false);
  const [resourceErrorKey, setResourceErrorKey] = useState("");

  // ======= BLOQUEO MOBILE =======
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");

    const apply = () => {
      const mobileNow = mq.matches;
      setIsMobile(mobileNow);

      if (mobileNow) setView("cards");
    };

    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (isMobile && view === "list") setView("cards");
  }, [isMobile, view]);

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
      setCategoria(catData);
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
      if (!resp?.data?.ok) {
        setUbicacion([]);
        return;
      }

      setUbicacion(resp.data.data || []);
    } catch (e) {
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

  function goConfirmCreateResource() {
    const prefijo = (resourceForm.nombre || "").trim();
    const cantidad = Number(resourceForm.cantidad);
    const idUbicacion = Number(resourceForm.id_ubicacion);

    if (!prefijo || !cantidad || cantidad <= 0 || !idUbicacion) {
      setResourceErrorKey("errors.validation.requiredFields");
      return;
    }

    setResourceErrorKey("");
    setConfirmCreateResource(true);
  }

  async function handleCreateResources() {
    if (!isAdmin) return;

    const prefijo = (resourceForm.nombre || "").trim();
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

    const base = {
      nombre: r.nombre || "",
      descripcion: r.descripcion || "",
      cantidad: 1,
      usarDescripcionGlobal: true,
      id_ubicacion: r.id_ubicacion ? String(r.id_ubicacion) : "",
    };

    setResourceForm(base);
    setOriginalResourceForm(base);
    setOpenEditResource(true);
  }

  async function handleSaveEditResource() {
    if (!selected) return;

    const nombre = (resourceForm.nombre || "").trim();
    const descripcion = (resourceForm.descripcion || "").trim();

    if (!nombre) {
      setResourceErrorKey("errors.validation.requiredFields");
      return;
    }

    const origNombre = (originalResourceForm?.nombre || "").trim();
    const origDesc = (originalResourceForm?.descripcion || "").trim();
    const noChanges = nombre === origNombre && descripcion === origDesc;

    if (noChanges) {
      setResourceErrorKey("errors.validation.noChanges");
      return;
    }

    try {
      setSavingResource(true);
      setResourceErrorKey("");

      await actualizarRecursoApi(selected.id_recurso, {
        nombre,
        descripcion: descripcion ? descripcion : null,
        id_categoria: selected.id_categoria,
        id_ubicacion: selected.id_ubicacion,
      });

      setOpenEditResource(false);
      setSelected(null);
      setOriginalResourceForm(null);
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

    try {
      setSavingResource(true);
      await cambiarEstadoRecursoApi(selected.id_recurso, 0);
      setOpenEditResource(false);
      setSelected(null);
      setOriginalResourceForm(null);
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
  const isListDisabled = isMobile;

  return (
    <div className="res-panel">
      <div className="res-header">
        <h1 className="res-title">{title}</h1>

        <div className="res-view-toggle">
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

          <span className="res-view-label">
            {t("assets.view.label", "Vista")}
          </span>

          <button
            type="button"
            className={`res-view-btn ${view === "cards" ? "active" : ""}`}
            onClick={() => setView("cards")}
            aria-label={t("assets.view.cards")}
            title={t("assets.view.cards")}
          >
            <ViewGrid className="res-card-view-icon" />
          </button>

          <button
            type="button"
            className={`res-view-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
            aria-label={t("assets.view.list")}
            title={t("assets.view.list")}
          >
            <ViewList className="res-card-view-icon" />
          </button>
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
      <RecursosModals
        t={t}
        loading={loading}
        setSelected={setSelected}
        setOriginalResourceForm={setOriginalResourceForm}
        setResourceErrorKey={setResourceErrorKey}
        openDetails={openDetails}
        openAssignRut={openAssignRut}
        openConfirmLoan={openConfirmLoan}
        openReturn={openReturn}
        openCreateExternal={openCreateExternal}
        openCreateResource={openCreateResource}
        openEditResource={openEditResource}
        openConfirmDeactivate={openConfirmDeactivate}
        setOpenDetails={setOpenDetails}
        setOpenAssignRut={setOpenAssignRut}
        setOpenConfirmLoan={setOpenConfirmLoan}
        setOpenReturn={setOpenReturn}
        setOpenCreateExternal={setOpenCreateExternal}
        setOpenCreateResource={setOpenCreateResource}
        setOpenEditResource={setOpenEditResource}
        setOpenConfirmDeactivate={setOpenConfirmDeactivate}
        selected={selected}
        ubicacion={ubicacion}
        loadingUbicacion={loadingUbicacion}
        rutInput={rutInput}
        setRutInput={setRutInput}
        lookupLoading={lookupLoading}
        lookupErrorKey={lookupErrorKey}
        externalUser={externalUser}
        loanObs={loanObs}
        setLoanObs={setLoanObs}
        dueDate={dueDate}
        setDueDate={setDueDate}
        returnObs={returnObs}
        setReturnObs={setReturnObs}
        resourceForm={resourceForm}
        setResourceForm={setResourceForm}
        confirmCreateResource={confirmCreateResource}
        setConfirmCreateResource={setConfirmCreateResource}
        resourceErrorKey={resourceErrorKey}
        savingResource={savingResource}
        lookupUserByRut={lookupUserByRut}
        goToConfirmLoan={goToConfirmLoan}
        confirmLoan={confirmLoan}
        confirmReturn={confirmReturn}
        onExternalCreated={onExternalCreated}
        goConfirmCreateResource={goConfirmCreateResource}
        handleCreateResources={handleCreateResources}
        handleSaveEditResource={handleSaveEditResource}
        handleDeactivateResource={handleDeactivateResource}
        isOccupied={isOccupied}
        fmtDateCL={fmtDateCL}
        safe={safe}
        fullName={fullName}
        crearUsuarioExternoApi={crearUsuarioExternoApi}
      />
    </div>
  );
}
