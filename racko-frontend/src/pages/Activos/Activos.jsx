import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { listCategoriasApi } from "../../api/categorias.api";
import UbicacionSection from "../../components/common/UbicacionSection";
import { useAuth } from "../../contexts/AuthContext";
import { http } from "../../api/http";

export default function Activos() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { user } = useAuth();
  const isAdmin = Number(user?.id_rol) === 1;

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [openConfirmDeactivate, setOpenConfirmDeactivate] = useState(false);
  const [originalForm, setOriginalForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({
    nombre: "",
    descripcion: "",
  });

  const [form, setForm] = useState({
    id_categoria: "",
    nombre: "",
    descripcion: "",
    estado: 1,
  });

  const [saving, setSaving] = useState(false);
  const [formErrorKey, setFormErrorKey] = useState("");

  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState("");

  const editNoChanges =
    !originalForm ||
    ((form.nombre || "").trim() === (originalForm.nombre || "").trim() &&
      (form.descripcion || "").trim() ===
        (originalForm.descripcion || "").trim());

  function openCreateModal() {
    setFormErrorKey("");
    setForm({ id_categoria: "", nombre: "", descripcion: "", estado: 1 });
    setOpenCreate(true);
  }

  function openEditModal(c) {
    setFormErrorKey("");

    const base = {
      id_categoria: c.id_categoria,
      nombre: c.nombre || "",
      descripcion: c.descripcion || "",
      estado: c.estado ?? 1,
    };

    setForm(base);
    setOriginalForm(base);
    setOpenEdit(true);
  }

  async function reloadCategorias() {
    const resp = await listCategoriasApi();
    if (resp?.ok) setCategorias(resp.data || []);
  }

  function validateCategoryForm(currentForm) {
    const errors = { nombre: "", descripcion: "" };
    const nombre = (currentForm.nombre || "").trim();

    if (!nombre) errors.nombre = "errors.validation.required";
    return errors;
  }

  function hasErrors(errs) {
    return Boolean(errs.nombre || errs.descripcion);
  }

  function goConfirmCreate() {
    const nombre = (form.nombre || "").trim();

    if (!nombre) {
      setFormErrorKey("errors.validation.requiredFields");
      return;
    }

    setFormErrorKey("");
    setConfirmCreate(true);
  }

  async function handleCreate() {
    if (!isAdmin) return;

    const nombre = (form.nombre || "").trim();
    const descripcion = (form.descripcion || "").trim();

    if (!nombre) {
      setFormErrorKey("errors.validation.requiredFields");
      return;
    }

    try {
      setSaving(true);
      setFormErrorKey("");

      const resp = await http.post("/api/categorias", {
        nombre,
        descripcion: descripcion ? descripcion : null,
      });

      if (!resp?.data?.ok) {
        setFormErrorKey(resp?.data?.error || "errors.categories.createFailed");
        return;
      }

      setConfirmCreate(false);
      setOpenCreate(false);
      await reloadCategorias();
    } catch (e) {
      setFormErrorKey(
        e?.response?.data?.error || "errors.categories.createFailed",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!isAdmin) return;

    const id = Number(form.id_categoria);
    const nombre = (form.nombre || "").trim();
    const descripcion = (form.descripcion || "").trim();

    const origNombre = (originalForm?.nombre || "").trim();
    const origDesc = (originalForm?.descripcion || "").trim();

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

      const resp = await http.put(`/api/categorias/${id}`, {
        nombre,
        descripcion: descripcion || null,
      });

      if (!resp?.data?.ok) {
        setFormErrorKey(resp?.data?.error);
        return;
      }

      setOpenEdit(false);
      await reloadCategorias();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!isAdmin) return;

    const id = Number(form.id_categoria);
    if (!id) return;

    try {
      setSaving(true);
      setFormErrorKey("");

      const resp = await http.patch(`/api/categorias/${id}/estado`, {
        nuevoEstado: 0,
      });

      if (!resp?.data?.ok) {
        setFormErrorKey(resp?.data?.error);
        return;
      }

      setOpenConfirmDeactivate(false);
      setOpenEdit(false);
      await reloadCategorias();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let alive = true;

    async function loadCategorias() {
      try {
        setLoading(true);
        setErrorKey("");

        const resp = await listCategoriasApi();
        if (!alive) return;

        if (!resp?.ok) {
          setCategorias([]);
          setErrorKey(resp?.error);
          return;
        }

        setCategorias(resp.data || []);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadCategorias();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="panel">
      <h1>{t("assets.title")}</h1>
      <div className="assets-cats-header">
        <h3>{t("assets.categories")}</h3>

        {isAdmin && (
          <button
            type="button"
            className="cat-btn-category"
            onClick={openCreateModal}
            disabled={loading}
          >
            {t("assets.actions.createCategory", "Crear categoría")}
          </button>
        )}
      </div>

      {loading && <p>{t("common.loading")}</p>}

      {!loading && errorKey && (
        <p>
          {t(
            "assets.categoriesFailed",
            "No se pudieron cargar las categorías.",
          )}
        </p>
      )}

      {!loading && !errorKey && categorias.length === 0 && (
        <p>{t("assets.categoriesEmpty", "Sin categorías disponibles.")}</p>
      )}

      {!loading && !errorKey && categorias.length > 0 && (
        <section className="cat-grid">
          {categorias.map((c) => {
            const creador = `${c.nombre_creador || ""} ${
              c.apellido_creador || ""
            }`.trim();

            return (
              <article key={c.id_categoria} className="cat-card">
                <div className="cat-accent" />

                <div className="cat-body">
                  <div className="cat-info">
                    <div className="cat-name">{c.nombre}</div>

                    <div className="cat-meta">
                      <div className="cat-meta-line">
                        <strong>{c.recursos_count ?? 0}</strong>{" "}
                        {t("assets.resources.title", "recursos")}
                      </div>

                      <div className="cat-meta-line">
                        {t("assets.createdBy", "Creado por")}{" "}
                        <strong>{creador || "-"}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="cat-btn"
                    onClick={() =>
                      navigate(`/activos/categoria/${c.id_categoria}`)
                    }
                  >
                    {t("assets.actions.viewResources", "Ver Recursos")}
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      className="cat-btn cat-btn--secondary"
                      onClick={() => openEditModal(c)}
                    >
                      {t("common.edit", "Modificar")}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
      {/* MODAL CREAR CATEGORÍA */}
      {openCreate && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setOpenCreate(false)}
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
                ? t(
                    "assets.actions.confirmCreation",
                    "Confirmar crear categoría",
                  )
                : t("assets.actions.createCategory", "Crear categoría")}
            </h3>

            {formErrorKey && <p className="error">{t(formErrorKey)}</p>}

            {/* PASO 1: CREAR */}
            {!confirmCreate && (
              <>
                <div className="field">
                  <label className="label-required">
                    {t("assets.fields.name", "Nombre")}
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
                  <label>{t("assets.fields.description", "Descripción")}</label>
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

            {/* PASO 2: REVISAR / CONFIRMAR */}
            {confirmCreate && (
              <div className="modal-confirm-section" style={{ marginTop: 12 }}>
                <p className="modal-hint">
                  {t(
                    "assets.categories.reviewBeforeCreate",
                    "Revisa los datos antes de crear la categoría:",
                  )}
                </p>

                <div className="modal-review">
                  <div className="modal-review-row">
                    <span className="modal-review-label">
                      {t("assets.fields.name", "Nombre")}:{" "}
                    </span>
                    <span className="modal-review-value">
                      {form.nombre?.trim() || "--"}
                    </span>
                  </div>

                  <div className="modal-review-row" style={{ marginTop: 8 }}>
                    <span className="modal-review-label">
                      {t("assets.fields.description", "Descripción")}:{" "}
                    </span>
                    <span className="modal-review-value">
                      {form.descripcion?.trim() || "--"}
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
                    onClick={() => setConfirmCreate(false)}
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
      {/* MODAL MODIFICAR CATEGORÍA */}
      {openEdit && (
        <div
          className="modal-backdrop"
          onClick={() => {
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
            <h3>
              {t("common.edit", "Modificar")}{" "}
              {t("assets.categories", "Categoría")}
            </h3>

            {formErrorKey && <p className="error">{t(formErrorKey)}</p>}

            <div className="field">
              <label>ID</label>
              <input
                className="input-muted"
                value={form.id_categoria}
                disabled
              />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>{t("assets.fields.name", "Nombre")}</label>
              <input
                className="input"
                value={form.nombre}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nombre: e.target.value }))
                }
                disabled={saving}
              />
              {fieldErrors.nombre && (
                <p className="field-error">{t(errors.required.nombre)}</p>
              )}
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>{t("assets.fields.description", "Descripción")}</label>
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
                onMouseDown={() => {
                  if (saving) return;
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
                {t("common.save", "Guardar cambios")}
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
                  "Al desactivar la categoría, dejará de estar disponible para nuevos recursos. Esta acción se puede revertir.",
                )}
              </p>
              <button
                type="button"
                className="btn-deactivate"
                onClick={() => setOpenConfirmDeactivate(true)}
                disabled={saving}
              >
                {t("common.deactivate", "Desactivar")}
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
              "assets.confirmDeactivateTitle",
              "Confirmar desactivación",
            )}
          >
            <h3>
              {t("assets.confirmDeactivateTitle", "Confirmar desactivación")}
            </h3>

            <p style={{ marginTop: 8 }}>
              {t(
                "assets.confirmDeactivateMsg",
                "¿Estás seguro/a que deseas desactivar esta categoría?",
              )}
            </p>

            <div style={{ marginTop: 10, opacity: 0.9 }}>
              <strong>
                #{form.id_categoria} —{" "}
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
                {t("common.deactivate", "Desactivar")}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="loc-section">
        <UbicacionSection />
      </div>
    </div>
  );
}
