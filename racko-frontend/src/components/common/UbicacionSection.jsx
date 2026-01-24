import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";

import {
  listarUbicacionesApi,
  crearUbicacionApi,
  actualizarUbicacionApi,
  cambiarEstadoUbicacionApi,
} from "../../api/Ubicacion.api";

import EditIcon from "../../assets/edit.svg?react";
import Location from "../../assets/location.svg?react";

function cleanStr(v) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : "";
}

export default function UbicacionSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = Number(user?.id_rol) === 1;

  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);

  const [openEdit, setOpenEdit] = useState(false);
  const [openConfirmDeactivate, setOpenConfirmDeactivate] = useState(false);

  const [saving, setSaving] = useState(false);
  const [originalForm, setOriginalForm] = useState(null);
  const [formErrorKey, setFormErrorKey] = useState("");

  const [form, setForm] = useState({
    id_ubicacion: "",
    nombre: "",
    descripcion: "",
    estado: 1,
  });

  async function reload() {
    const resp = await listarUbicacionesApi();
    if (resp?.ok) {
      setUbicaciones(resp.data || []);
      setErrorKey("");
    } else {
      setUbicaciones([]);
      setErrorKey(resp?.error || "errors.locations.fetchFailed");
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorKey("");

        const resp = await listarUbicacionesApi();
        if (!alive) return;

        if (resp?.ok) setUbicaciones(resp.data || []);
        else {
          setUbicaciones([]);
          setErrorKey(resp?.error || "errors.locations.fetchFailed");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function openCreateModal() {
    setFormErrorKey("");
    setConfirmCreate(false);
    setForm({ id_ubicacion: "", nombre: "", descripcion: "", estado: 1 });
    setOpenCreate(true);
  }

  function openEditModal(u) {
    setFormErrorKey("");

    const base = {
      id_ubicacion: u.id_ubicacion,
      nombre: u.nombre || "",
      descripcion: u.descripcion || "",
      estado: u.estado ?? 1,
    };

    setForm(base);
    setOriginalForm(base);
    setOpenEdit(true);
  }

  function goConfirmCreate() {
    const nombre = cleanStr(form.nombre);

    if (!nombre) {
      setFormErrorKey("errors.validation.requiredFields");
      return;
    }

    setFormErrorKey("");
    setConfirmCreate(true);
  }

  async function handleCreate() {
    if (!isAdmin) return;

    const nombre = cleanStr(form.nombre);
    const descripcion = cleanStr(form.descripcion);

    if (!nombre) {
      setFormErrorKey("errors.validation.requiredFields");
      return;
    }

    try {
      setSaving(true);
      setFormErrorKey("");

      const resp = await crearUbicacionApi({
        nombre,
        descripcion: descripcion ? descripcion : null,
      });

      if (!resp?.ok) {
        setFormErrorKey(resp?.error || "errors.locations.createFailed");
        return;
      }

      setOpenCreate(false);
      setConfirmCreate(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!isAdmin) return;

    const id = Number(form.id_ubicacion);
    const nombre = cleanStr(form.nombre);
    const descripcion = cleanStr(form.descripcion);
    const origNombre = cleanStr(originalForm?.nombre);
    const origDesc = cleanStr(originalForm?.descripcion);

    const noChanges = nombre === origNombre && descripcion === origDesc;

    if (noChanges) {
      setFormErrorKey("errors.validation.noChanges");
      return;
    }

    if (!id || !nombre) {
      setFormErrorKey("errors.validation.requiredFields");
      return;
    }

    try {
      setSaving(true);
      setFormErrorKey("");

      const resp = await actualizarUbicacionApi(id, {
        nombre,
        descripcion: descripcion ? descripcion : null,
      });

      if (!resp?.ok) {
        setFormErrorKey(resp?.error || "errors.locations.updateFailed");
        return;
      }

      setOpenEdit(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!isAdmin) return;

    const id = Number(form.id_ubicacion);
    if (!id) return;

    try {
      setSaving(true);
      setFormErrorKey("");

      const resp = await cambiarEstadoUbicacionApi(id, 0);

      if (!resp?.ok) {
        setFormErrorKey(resp?.error || "errors.locations.stateUpdateFailed");
        return;
      }

      setOpenConfirmDeactivate(false);
      setOpenEdit(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="assets-cats-header" style={{ marginTop: 26 }}>
        <h3>{t("assets.location.title", "Ubicaciones")}</h3>

        {isAdmin && (
          <button
            type="button"
            className="cat-btn-category"
            onClick={openCreateModal}
            disabled={loading}
          >
            {t("assets.location.actions.create", "Crear ubicación")}
          </button>
        )}
      </div>

      {loading && <p>{t("common.loading")}</p>}

      {!loading && errorKey && (
        <p>
          {t(
            "assets.location.loadFailed",
            "No se pudieron cargar las ubicaciones.",
          )}
        </p>
      )}

      {!loading && !errorKey && ubicaciones.length === 0 && (
        <p>{t("assets.location.empty", "Sin ubicaciones disponibles.")}</p>
      )}

      {!loading && !errorKey && ubicaciones.length > 0 && (
        <section className="loc-list">
          {ubicaciones.map((loc) => (
            <article key={loc.id_ubicacion} className="loc-row">
              <div className="loc-left">
                <Location className="loc-flag-svg" />
                <div className="loc-text">
                  <div className="loc-name">{loc.nombre}</div>
                  {loc.descripcion && (
                    <div className="loc-desc">{loc.descripcion}</div>
                  )}
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  className="loc-iconbtn"
                  onClick={() => openEditModal(loc)}
                  title={t("assets.location.actions.edit", "Modificar")}
                  aria-label={t("assets.location.actions.edit", "Modificar")}
                >
                  <EditIcon className="loc-icon-svg" />
                </button>
              )}
            </article>
          ))}
        </section>
      )}

      {/* MODAL CREAR */}
      {openCreate && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !saving && setOpenCreate(false)}
          role="presentation"
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>
              {confirmCreate
                ? t("assets.location.modal.review", "Confirmar ubicación")
                : t("assets.location.modal.create", "Crear ubicación")}
            </h3>

            {formErrorKey && <p className="error">{t(formErrorKey)}</p>}

            {!confirmCreate && (
              <>
                <div className="field">
                  <label className="label-required">
                    {t("assets.location.fields.name", "Nombre")}
                  </label>
                  <input
                    className="input"
                    value={form.nombre}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, nombre: e.target.value }))
                    }
                    disabled={saving}
                    autoFocus
                  />
                </div>

                <div className="field" style={{ marginTop: 12 }}>
                  <label>
                    {t("assets.location.fields.description", "Descripción")}
                  </label>
                  <textarea
                    className="modal-category-textarea"
                    rows={4}
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, descripcion: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="modal-form-hint">
                  {t("common.requiredFieldsNote", "Campos obligatorios *")}
                </div>
                <div className="modal-actions" style={{ marginTop: 16 }}>
                  <button
                    className="btn-modal-cancel"
                    type="button"
                    onClick={() => setOpenCreate(false)}
                    disabled={saving}
                  >
                    {t("common.cancel", "Cancelar")}
                  </button>
                  <button
                    className="btn-modal-primary"
                    type="button"
                    onClick={goConfirmCreate}
                    disabled={saving}
                  >
                    {t("common.continue", "Continuar")}
                  </button>
                </div>
              </>
            )}

            {confirmCreate && (
              <div className="modal-confirm-section" style={{ marginTop: 12 }}>
                <p className="modal-hint">
                  {t(
                    "assets.location.modal.reviewHint",
                    "Revisa los datos antes de crear la ubicación:",
                  )}
                </p>

                <div className="modal-review">
                  <div className="modal-review-row">
                    <span className="modal-review-label">
                      {t("assets.location.fields.name", "Nombre")}:{" "}
                    </span>
                    <span className="modal-review-value">
                      {cleanStr(form.nombre) || "--"}
                    </span>
                  </div>

                  <div className="modal-review-row" style={{ marginTop: 8 }}>
                    <span className="modal-review-label">
                      {t("assets.location.fields.description", "Descripción")}
                      :{" "}
                    </span>
                    <span className="modal-review-value">
                      {cleanStr(form.descripcion) || "--"}
                    </span>
                  </div>
                </div>

                <div
                  className="modal-confirm-actions"
                  style={{ marginTop: 16 }}
                >
                  <button
                    className="btn-modal-cancel"
                    type="button"
                    onClick={() => {
                      setConfirmCreate(false);
                      setFormErrorKey("");
                    }}
                    disabled={saving}
                  >
                    {t("common.back", "Volver a editar")}
                  </button>
                  <button
                    className="btn-modal-primary"
                    type="button"
                    onClick={handleCreate}
                    disabled={saving}
                  >
                    {t("common.confirm", "Confirmar")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {openEdit && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            if (saving) return;
            setOpenEdit(false);
            setOriginalForm(null);
            setFormErrorKey("");
          }}
          role="presentation"
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>{t("assets.location.modal.edit", "Modificar ubicación")}</h3>

            {formErrorKey && <p className="error">{t(formErrorKey)}</p>}

            <div className="field">
              <label>ID</label>
              <input
                className="input-muted"
                value={String(form.id_ubicacion)}
                disabled
              />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>{t("assets.location.fields.name", "Nombre")}</label>
              <input
                className="input"
                value={form.nombre}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nombre: e.target.value }))
                }
                disabled={saving}
              />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>
                {t("assets.location.fields.description", "Descripción")}
              </label>
              <textarea
                className="modal-category-textarea"
                rows={4}
                value={form.descripcion}
                onChange={(e) =>
                  setForm((p) => ({ ...p, descripcion: e.target.value }))
                }
                disabled={saving}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => {
                  setOpenEdit(false);
                  setOriginalForm(null);
                  setFormErrorKey("");
                }}
                disabled={saving}
              >
                {t("common.cancel", "Cancelar")}
              </button>

              <button
                className="btn-modal-primary"
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {t("assets.location.actions.save", "Guardar cambios")}
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
                  "assets.location.deactivateHint",
                  "Al desactivar la ubicación, dejará de estar disponible.",
                )}
              </p>

              <button
                type="button"
                className="btn-deactivate"
                onClick={() => setOpenConfirmDeactivate(true)}
                disabled={saving}
              >
                {t("assets.location.actions.deactivate", "Desactivar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR DESACTIVACIÓN */}
      {openConfirmDeactivate && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !saving && setOpenConfirmDeactivate(false)}
          role="presentation"
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t(
              "assets.location.confirmDeactivate.title",
              "Confirmar desactivación",
            )}
          >
            <h3>
              {t(
                "assets.location.confirmDeactivate.title",
                "Confirmar desactivación",
              )}
            </h3>

            <p style={{ marginTop: 8 }}>
              {t(
                "assets.location.confirmDeactivate.message",
                "¿Estás seguro/a que deseas desactivar esta ubicación?",
              )}
            </p>

            <div style={{ marginTop: 10, opacity: 0.9 }}>
              <strong>
                #{form.id_ubicacion} —{" "}
                {form.nombre || t("common.unnamed", "Sin nombre")}
              </strong>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenConfirmDeactivate(false)}
                disabled={saving}
              >
                {t("common.cancel", "Cancelar")}
              </button>

              <button
                className="btn-danger"
                type="button"
                onClick={handleDeactivate}
                disabled={saving}
                autoFocus
              >
                {t("assets.location.actions.deactivate", "Desactivar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
