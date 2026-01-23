import ExternalUserModal from "../../components/common/ExternalUserModal";
import CloseIcon from "../../assets/close-icon.svg?react";

export default function RecursosModals(props) {
  const {
    t,
    loading,

    // estados open
    openDetails,
    openAssignRut,
    openConfirmLoan,
    openReturn,
    openCreateExternal,
    openCreateResource,
    openEditResource,
    openConfirmDeactivate,

    // setters
    setOpenDetails,
    setOpenAssignRut,
    setOpenConfirmLoan,
    setOpenReturn,
    setOpenCreateExternal,
    setOpenCreateResource,
    setOpenEditResource,
    setOpenConfirmDeactivate,
    setSelected,
    setOriginalResourceForm,
    setResourceErrorKey,

    // data
    selected,
    ubicacion,
    loadingUbicacion,

    // forms / state
    rutInput,
    setRutInput,
    lookupLoading,
    lookupErrorKey,
    externalUser,
    loanObs,
    setLoanObs,
    dueDate,
    setDueDate,
    returnObs,
    setReturnObs,

    resourceForm,
    setResourceForm,
    confirmCreateResource,
    setConfirmCreateResource,
    resourceErrorKey,
    savingResource,

    // handlers
    lookupUserByRut,
    goToConfirmLoan,
    confirmLoan,
    confirmReturn,
    onExternalCreated,

    goConfirmCreateResource,
    handleCreateResources,
    handleSaveEditResource,
    handleDeactivateResource,

    // utils
    isOccupied,
    fmtDateCL,
    safe,
    fullName,

    crearUsuarioExternoApi,
  } = props;

  return (
    <>
      {/* ========== MODAL DETALLE ========== */}
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
                <CloseIcon className="res-card-edit-icon" />
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

      {/* ========== MODAl PRESTAR =========== */}
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
                      {t("assets.assignFlow.userFound", "Usuario Verificado")}
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
              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenAssignRut(false)}
                disabled={lookupLoading}
              >
                {t("common.cancel", "Cancelar")}
              </button>

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
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAl CONFIRMAR PRÉSTAMO ========== */}
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
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenConfirmLoan(false)}
                disabled={loading}
              >
                {t("common.cancel")}
              </button>

              <button
                className="btn-modal-logout"
                type="button"
                onClick={confirmLoan}
                disabled={loading}
              >
                {t("assets.confirmLoan.assign")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL DEVOLVER ========== */}
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
                <span className="res-info-k">{t("assets.details.loanId")}</span>
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
                <span className="res-info-k">{t("assets.details.loanTo")}</span>
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
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenReturn(false)}
                disabled={loading}
              >
                {t("common.cancel")}
              </button>

              <button
                className="btn-modal-logout"
                type="button"
                onClick={confirmReturn}
                disabled={loading}
              >
                {t("assets.actions.return")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL CREAR EXT  ========== */}
      <ExternalUserModal
        open={openCreateExternal}
        onClose={() => setOpenCreateExternal(false)}
        onCreated={onExternalCreated}
        crearUsuarioExternoApi={crearUsuarioExternoApi}
        initialRut={rutInput}
      />

      {/* ========== MODAL CREAR ========== */}
      {openCreateResource && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !savingResource && setOpenCreateResource(false)}
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
              <label className="label-required">
                {t("assets.fields.prefix", "Nombre / prefijo")}
              </label>
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
              <label className="label-required">
                {t("assets.fields.quantity", "Cantidad")}
              </label>
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
                  "assets.fields.descLater",
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
              <label className="label-required">
                {t("assets.fields.location", "Ubicación")}
              </label>

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

            <div className="modal-form-hint">
              {t("common.requiredFieldsNote", "Campos obligatorios *")}
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => {
                  setOpenCreateResource(false);
                  setConfirmCreateResource(false);
                  setResourceErrorKey("");
                }}
                disabled={savingResource}
              >
                {t("common.cancel", "Cancelar")}
              </button>

              <button
                className="btn-modal-primary"
                type="button"
                onClick={goConfirmCreateResource}
                disabled={savingResource}
              >
                {t("common.continue", "Continuar")}
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
                    {resourceForm.nombre?.trim() || "--"}
                  </div>
                  <div>
                    <strong>{t("assets.fields.quantity", "Cantidad")}:</strong>{" "}
                    {resourceForm.cantidad || 1}
                  </div>
                  <div>
                    <strong>{t("assets.fields.location", "Ubicación")}:</strong>{" "}
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
                      : t("assets.field.descLaterShort", "Se agregará después")}
                  </div>
                </div>

                <div
                  className="modal-confirm-actions"
                  style={{ marginTop: 10 }}
                >
                  <button
                    className="btn-modal-cancel"
                    type="button"
                    onClick={() => {
                      setConfirmCreateResource(false);
                      setResourceErrorKey("");
                    }}
                    disabled={savingResource}
                  >
                    {t("common.back", "Volver a editar")}
                  </button>

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
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== MODAL EDITAR ========== */}
      {openEditResource && selected && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            if (savingResource) return;
            setOpenEditResource(false);
            setSelected(null);
            setOriginalResourceForm(null);
            setResourceErrorKey("");
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
              <label className="label-required">
                {t("assets.fields.name", "Nombre")}
              </label>
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

            <div className="modal-form-hint">
              {t("common.requiredFieldsNote", "Campos obligatorios *")}
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => {
                  setOpenEditResource(false);
                  setSelected(null);
                  setOriginalResourceForm(null);
                  setResourceErrorKey("");
                }}
                disabled={savingResource}
              >
                {t("common.cancel", "Cancelar")}
              </button>

              <button
                className="btn-modal-primary"
                type="button"
                onClick={handleSaveEditResource}
                disabled={savingResource || isOccupied(selected)}
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
                  "Al desactivar el recurso, dejará de estar disponible para nuevos préstamos.",
                )}
              </p>

              <button
                type="button"
                className="btn-deactivate"
                onClick={() => setOpenConfirmDeactivate(true)}
                disabled={savingResource || isOccupied(selected)}
              >
                {t("common.deactivate", "Desactivar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL CONFIRMAR DESACTIVACIÓN ========== */}
      {openConfirmDeactivate && selected && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setOpenConfirmDeactivate(false)}
          role="presentation"
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>
              {t("assets.confirmDeactivate.title", "¿Desactivar recurso?")}
            </h3>

            <p className="modal-hint">
              {t(
                "assets.confirmDeactivate.text",
                "¿Estás seguro/a que deseas desactivar este recurso?",
              )}
            </p>

            <div className="modal-review">
              <div className="modal-review-row">
                <span className="modal-review-label">
                  {t("audits.cols.resource", "Recurso")}:
                </span>
                <span className="modal-review-value">{selected.nombre}</span>
              </div>

              <div className="modal-review-row">
                <span className="modal-review-label">ID:</span>
                <span className="modal-review-value">
                  {selected.id_recurso}
                </span>
              </div>
            </div>

            <div className="modal-confirm-actions" style={{ marginTop: 16 }}>
              <button
                className="btn-modal-cancel"
                type="button"
                onClick={() => setOpenConfirmDeactivate(false)}
                disabled={savingResource}
              >
                {t("common.cancel", "Cancelar")}
              </button>

              <button
                className="btn-danger"
                type="button"
                onClick={async () => {
                  setOpenConfirmDeactivate(false);
                  await handleDeactivateResource();
                }}
                disabled={savingResource}
              >
                {t("common.confirm", "Confirmar desactivación")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
