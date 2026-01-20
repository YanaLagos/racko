import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";

import {
  listarUsuariosExternosApi,
  actualizarUsuarioExternoApi,
  cambiarEstadoUsuarioExternoApi,
  checkPurgableUsuarioExternoApi,
  eliminarUsuarioExternoApi,
  cambiarRutUsuarioExternoApi,
  crearUsuarioExternoApi,
} from "../../api/Usuarios.api";

import ExternalUserModal from "../../components/common/ExternalUserModal";
import { normalizeRut, isValidRut } from "../../utils/rut";

const PAGE_SIZE = 30;

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function fmtNull(v) {
  if (v == null || String(v).trim() === "") return "--";
  return String(v);
}

function normalizeReputacion(val) {
  const n = Number(val);
  if (isNaN(n)) return { n: 0, colorClass: "rep-low" };

  let colorClass = "rep-high"; // Verde (7.0 - 10.0)
  if (n < 4) colorClass = "rep-low"; // Rojo (0.0 - 3.9)
  else if (n < 7) colorClass = "rep-mid"; // Naranja/Amarillo (4.0 - 6.9)

  return { n, colorClass };
}

export default function Usuarios() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = Number(user?.id_rol) === 1;

  // filtros
  const [q, setQ] = useState("");
  const [rut, setRut] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);

  const [sort, setSort] = useState({ key: "apellido", dir: "asc" });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0 });
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState("");

  // modal crear
  const [openCreate, setOpenCreate] = useState(false);

  // modal editar
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [purgableInfo, setPurgableInfo] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [fNombre, setFNombre] = useState("");
  const [fApellido, setFApellido] = useState("");
  const [fTelefono, setFTelefono] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fDireccion, setFDireccion] = useState("");
  const [fEstado, setFEstado] = useState(1);

  const [rutFixOpen, setRutFixOpen] = useState(false);
  const [nuevoRut, setNuevoRut] = useState("");

  const [formError, setFormError] = useState("");

  const paramsBase = useMemo(() => {
    return {
      q: q.trim() || null,
      rut: rut.trim() ? normalizeRut(rut) : null,
      soloActivos: soloActivos ? "1" : "0",
      sortKey: sort.key,
      sortDir: sort.dir,
      page,
      limit: PAGE_SIZE,
    };
  }, [q, rut, soloActivos, sort, page]);

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

      const resp = await listarUsuariosExternosApi({
        ...paramsBase,
        page: targetPage,
      });

      if (!resp?.ok) {
        setRows([]);
        setMeta(resp?.meta || { page: targetPage, limit: PAGE_SIZE, total: 0 });
        setErrorKey(resp?.error || "errors.externalUsers.fetchFailed");
        return;
      }

      setRows(resp.data || []);
      setMeta(resp.meta || { page: targetPage, limit: PAGE_SIZE, total: 0 });
      setPage(resp?.meta?.page ?? targetPage);
    } catch (e) {
      setRows([]);
      setMeta({ page: targetPage, limit: PAGE_SIZE, total: 0 });
      setErrorKey(
        e?.response?.data?.error || "errors.externalUsers.fetchFailed"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    consultar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onConsultar() {
    setPage(1);
    consultar(1);
  }

  function toggleSort(key) {
    setSort((prev) => {
      const next =
        prev.key === key
          ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
          : { key, dir: "asc" };
      setPage(1);
      setTimeout(() => consultar(1), 0);
      return next;
    });
  }

  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  function goPrev() {
    if (!canPrev) return;
    const p = page - 1;
    setPage(p);
    consultar(p);
  }

  function goNext() {
    if (!canNext) return;
    const p = page + 1;
    setPage(p);
    consultar(p);
  }

  async function openModal(row) {
    setSelected(row);
    setOpen(true);
    setFormError("");
    setPurgableInfo(null);
    setModalLoading(false);

    setRutFixOpen(false);
    setNuevoRut("");

    setFNombre(row?.nombre || "");
    setFApellido(row?.apellido || "");
    setFTelefono(row?.telefono || "");
    setFEmail(row?.email || "");
    setFDireccion(row?.direccion || "");
    setFEstado(Number(row?.estado ?? 1));

    if (isAdmin && Number(row?.estado) === 0) {
      try {
        const resp = await checkPurgableUsuarioExternoApi(row.rut);
        if (resp?.ok) setPurgableInfo(resp.data);
      } catch {}
    }
  }

  function closeModal() {
    setOpen(false);
    setSelected(null);
    setPurgableInfo(null);
    setModalLoading(false);
    setFormError("");
    setRutFixOpen(false);
    setNuevoRut("");
  }

  async function guardar() {
    if (!selected) return;
    setFormError("");

    if (fEmail && !isValidEmail(fEmail)) {
      setFormError(t("errors.validation.invalidEmail"));
      return;
    }

    const payload = {
      nombre: String(fNombre || "").trim(),
      apellido: String(fApellido || "").trim(),
      telefono: String(fTelefono || "").trim() || null,
      email: String(fEmail || "").trim() || null,
      direccion: String(fDireccion || "").trim() || null,
    };

    try {
      setModalLoading(true);
      const resp1 = await actualizarUsuarioExternoApi(selected.rut, payload);
      if (!resp1?.ok) {
        setFormError(t(resp1?.error || "errors.externalUsers.updateFailed"));
        return;
      }

      if (Number(fEstado) !== Number(selected.estado)) {
        const respEstado = await cambiarEstadoUsuarioExternoApi(selected.rut, Number(fEstado));
        if (!respEstado?.ok) {
          setFormError(t(respEstado?.error || "errors.externalUsers.stateUpdateFailed"));
          return;
        }
      }

      await consultar(page);
      closeModal();
    } catch (e) {
      setFormError(t(e?.response?.data?.error || "errors.externalUsers.updateFailed"));
    } finally {
      setModalLoading(false);
    }
  }

  async function confirmarCorreccionRut() {
    if (!selected || !isAdmin) return;
    const rutNuevo = normalizeRut(nuevoRut);
    if (!rutNuevo || !isValidRut(nuevoRut)) {
      setFormError(t("errors.validation.invalidRut"));
      return;
    }
    if (!window.confirm(t("users.modal.rutFix.confirm"))) return;

    try {
      setModalLoading(true);
      const resp = await cambiarRutUsuarioExternoApi(selected.rut, rutNuevo);
      if (!resp?.ok) {
        setFormError(t(resp?.error || "errors.externalUsers.updateFailed"));
        return;
      }
      await consultar(1);
      closeModal();
    } catch (e) {
      setFormError(t(e?.response?.data?.error || "errors.externalUsers.updateFailed"));
    } finally {
      setModalLoading(false);
    }
  }

  async function eliminarPermanente() {
    if (!selected || !isAdmin) return;
    if (!window.confirm(t("users.modal.deleteConfirm"))) return;
    try {
      setModalLoading(true);
      const resp = await eliminarUsuarioExternoApi(selected.rut);
      if (!resp?.ok) {
        setFormError(t(resp?.error || "errors.externalUsers.permanentDeleteFailed"));
        return;
      }
      await consultar(1);
      closeModal();
    } catch (e) {
      setFormError(t(e?.response?.data?.error || "errors.externalUsers.permanentDeleteFailed"));
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <div className="panel users-page">
      <h1>{t("users.title")}</h1>

      {/* FILTROS */}
      <div className="users-filters">
        <div className="users-filters-accent" aria-hidden="true" />
        <div className="users-filters-body">
          <div className="users-filters-grid">
            <div className="users-field">
              <label>{t("users.filters.name")}</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("users.filters.namePh")} />
            </div>
            <div className="users-field">
              <label>{t("users.filters.rut")}</label>
              <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder={t("users.filters.rutPh")} />
            </div>
            <div className="users-field users-field--check">
              <label>{t("users.filters.onlyActive")}</label>
              <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} />
            </div>
            <div className="users-field">
              <label>{t("users.filters.sortBy")}</label>
              <select value={sort.key} onChange={(e) => { setSort(prev => ({ ...prev, key: e.target.value })); setPage(1); consultar(1); }}>
                <option value="reputacion">{t("users.sort.reputation")}</option>
                <option value="nombre">{t("users.sort.name")}</option>
                <option value="apellido">{t("users.sort.lastName")}</option>
              </select>
            </div>
            <div className="users-field">
              <label>{t("users.filters.sortDir")}</label>
              <select value={sort.dir} onChange={(e) => { setSort(prev => ({ ...prev, dir: e.target.value })); setPage(1); consultar(1); }}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
            <div className="users-actions">
              <button type="button" className="users-btn users-btn-primary" onClick={onConsultar} disabled={loading}>{t("common.query")}</button>
              <button type="button" className="users-btn users-btn-secondary" onClick={() => setOpenCreate(true)} disabled={loading}>{t("users.actions.add")}</button>
            </div>
          </div>
          {loading && <div className="users-hint">{t("common.loading")}…</div>}
          {!loading && errorKey && <div className="users-hint">{t(errorKey)}</div>}
        </div>
      </div>

      {/* TABLA REDIMENSIONABLE */}
      <div className="users-table-wrap">
        <table className="users-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '120px' }}>{t("users.cols.rut")}<div className="resizer" onMouseDown={initResize} /></th>
              <th style={{ width: '100px' }} onClick={() => toggleSort("reputacion")}>{t("users.cols.reputation")}<div className="resizer" onMouseDown={initResize} /></th>
              <th style={{ width: '150px' }} onClick={() => toggleSort("nombre")}>{t("users.cols.name")}<div className="resizer" onMouseDown={initResize} /></th>
              <th style={{ width: '150px' }} onClick={() => toggleSort("apellido")}>{t("users.cols.lastName")}<div className="resizer" onMouseDown={initResize} /></th>
              <th style={{ width: '120px' }}>{t("users.cols.phone")}<div className="resizer" onMouseDown={initResize} /></th>
              <th style={{ width: '180px' }}>{t("users.cols.email")}<div className="resizer" onMouseDown={initResize} /></th>
              <th style={{ width: '200px' }}>{t("users.cols.address")}<div className="resizer" onMouseDown={initResize} /></th>
              <th style={{ width: '150px' }}>{t("users.cols.registeredBy")}<div className="resizer" onMouseDown={initResize} /></th>
              <th style={{ width: '100px' }}>{t("users.cols.status")}<div className="resizer" onMouseDown={initResize} /></th>
              <th style={{ width: '50px' }}>{t("users.cols.edit")}<div className="resizer" onMouseDown={initResize} /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const { n, colorClass } = normalizeReputacion(r.reputacion);
              const statusLabel = Number(r.estado) === 1 ? t("users.modal.active") : t("users.modal.inactive");
              return (
                <tr key={r.rut}>
                  <td>{r.rut}</td>
                  <td className="td-reputacion"><div className={`rep-badge ${colorClass}`}>{Number.isFinite(n) ? n.toFixed(1) : "--"}</div></td>
                  <td className="text-truncate">{fmtNull(r.nombre)}</td>
                  <td className="text-truncate">{fmtNull(r.apellido)}</td>
                  <td>{fmtNull(r.telefono)}</td>
                  <td className="text-truncate">{fmtNull(r.email)}</td>
                  <td className="text-truncate" title={fmtNull(r.direccion)}>{fmtNull(r.direccion)}</td>
                  <td className="text-truncate">{fmtNull(r.registrado_por)}</td>
                  <td><span className={`status-pill ${Number(r.estado) === 1 ? "active" : "inactive"}`}>{statusLabel}</span></td>
                  <td><button type="button" className="users-icon-btn" onClick={() => openModal(r)}>✎</button></td>
                </tr>
              );
            })}
            {!loading && !errorKey && rows.length === 0 && (
              <tr><td colSpan={10} className="users-empty">{t("users.table.empty")}</td></tr>
            )}
          </tbody>
        </table>

        {/* PAGINACIÓN */}
        <div className="audit-meta audit-meta--center">
          <div className="audit-pagination-info">
            {t("audits.table.total")}: <strong>{total}</strong> — {t("audits.table.pagination.pageOf", { page, totalPages })}
          </div>
          <div className="audit-pagination">
            <button type="button" className="audit-pagination-btn" onClick={goPrev} disabled={loading || !canPrev}>← {t("audits.table.pagination.prev")}</button>
            <button type="button" className="audit-pagination-btn" onClick={goNext} disabled={loading || !canNext}>{t("audits.table.pagination.next")} →</button>
          </div>
        </div>
      </div>

      {/* MODAL AÑADIR */}
      <ExternalUserModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={async () => { await consultar(1); }}
        crearUsuarioExternoApi={crearUsuarioExternoApi}
      />

      {/* MODAL EDITAR */}
      {open && selected && (
        <div className="modal-backdrop" onMouseDown={closeModal} role="presentation">
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>{t("users.modal.title")}</h3>
            {formError && <div className="error modal-form-error">{formError}</div>}
            <div className="users-modal-grid">
              <div className="field"><label>{t("users.cols.rut")}</label><input className="input-muted" value={selected.rut || ""} disabled /></div>
              <div className="field"><label>{t("users.cols.name")}</label><input className="input" value={fNombre} onChange={(e) => setFNombre(e.target.value)} /></div>
              <div className="field"><label>{t("users.cols.lastName")}</label><input className="input" value={fApellido} onChange={(e) => setFApellido(e.target.value)} /></div>
              <div className="field"><label>{t("users.cols.phone")}</label><input className="input" value={fTelefono} onChange={(e) => setFTelefono(e.target.value)} /></div>
              <div className="field"><label>{t("users.cols.email")}</label><input className="input" value={fEmail} onChange={(e) => setFEmail(e.target.value)} /></div>
              <div className="field"><label>{t("users.cols.address")}</label><input className="input" value={fDireccion} onChange={(e) => setFDireccion(e.target.value)} /></div>
              <div className="field">
                <label>{t("users.cols.status")}</label>
                <select className="input" value={String(fEstado)} onChange={(e) => setFEstado(Number(e.target.value))}>
                  <option value="1">{t("users.modal.active")}</option>
                  <option value="0">{t("users.modal.inactive")}</option>
                </select>
              </div>
            </div>

            {isAdmin && (
              <div className="users-rutfix">
                <div className="users-rutfix-header">
                  <div className="users-rutfix-title">{t("users.modal.rutFix.title")}</div>
                  <button type="button" className="users-rutfix-toggle" onClick={() => { setRutFixOpen(!rutFixOpen); setNuevoRut(""); }}>{rutFixOpen ? "Cerrar" : "Abrir"}</button>
                </div>
                {rutFixOpen && (
                  <div className="users-rutfix-row">
                    <input className="input" value={nuevoRut} onChange={(e) => setNuevoRut(e.target.value)} placeholder="Nuevo RUT" />
                    <button type="button" className="users-rutfix-apply" onClick={confirmarCorreccionRut}>Aplicar</button>
                  </div>
                )}
              </div>
            )}

            {isAdmin && purgableInfo?.purgable && (
              <div className="users-danger">
                <button type="button" className="users-danger-btn" onClick={eliminarPermanente}>{t("users.modal.delete")}</button>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-modal-logout" onClick={guardar} disabled={modalLoading}>{t("users.modal.save")}</button>
              <button type="button" className="btn-modal-cancel" onClick={closeModal}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}