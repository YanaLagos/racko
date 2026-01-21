import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { isValidRut, normalizeRut } from "../../utils/rut";

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function fmt(v) {
  const s = (v ?? "").toString().trim();
  return s ? s : "--";
}

export default function ExternalUserModal({
  open,
  onClose,
  onCreated,
  crearUsuarioExternoApi,
  initialRut = "",
}) {
  const { t } = useTranslation();

  const [step, setStep] = useState("edit");

  const [rut, setRut] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");

  const [draft, setDraft] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState("");

  const rutNorm = useMemo(() => normalizeRut(rut), [rut]);

  useEffect(() => {
    if (!open) return;

    setStep("edit");
    setDraft(null);

    setRut(initialRut || "");
    setNombre("");
    setApellido("");
    setTelefono("");
    setEmail("");
    setDireccion("");

    setLoading(false);
    setErrorKey("");
  }, [open, initialRut]);

  if (!open) return null;

  function validateToDraft() {
    setErrorKey("");

    if (
      !rut ||
      !nombre.trim() ||
      !apellido.trim() ||
      !telefono.trim() ||
      !email.trim()
    ) {
      setErrorKey("errors.validation.requiredFields");
      return null;
    }

    if (!rutNorm || !isValidRut(rut)) {
      setErrorKey("errors.validation.invalidRut");
      return null;
    }

    if (!isValidEmail(email)) {
      setErrorKey("errors.validation.invalidEmail");
      return null;
    }

    const payload = {
      rut: rutNorm,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      direccion: direccion.trim() || null,
    };

    return payload;
  }

  function onGuardarPaso1() {
    const payload = validateToDraft();
    if (!payload) return;

    setDraft(payload);
    setStep("confirm");
  }

  async function onConfirmarCreacion() {
    if (!draft) return;

    try {
      setLoading(true);
      setErrorKey("");

      const resp = await crearUsuarioExternoApi(draft);
      if (!resp?.ok) {
        setErrorKey(resp?.error || "errors.externalUsers.createFailed");
        return;
      }

      onCreated?.(draft);
      onClose?.();
    } catch (e) {
      setErrorKey(
        e?.response?.data?.error || "errors.externalUsers.createFailed",
      );
    } finally {
      setLoading(false);
    }
  }

  function volverAEditar() {
    setErrorKey("");
    setStep("edit");
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3>{t("users.title")}</h3>
        <p>{t("users.create.subtitle")}</p>

        {errorKey && (
          <div className="error modal-form-error">{t(errorKey)}</div>
        )}

        {step === "edit" && (
          <>
            <div className="modal-form-grid">
              <div className="field">
                <label>{t("users.create.fields.rut")}</label>
                <input
                  className="input-modal-user"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder={t("users.create.fields.rutPh")}
                  disabled={loading}
                />
                {rut && (!rutNorm || !isValidRut(rut)) && (
                  <div className="error" style={{ fontSize: 13, marginTop: 6 }}>
                    {t("errors.validation.invalidRut")}
                  </div>
                )}
              </div>

              <div className="field">
                <label>{t("users.create.fields.nombre")}</label>
                <input
                  className="input-modal-user"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={t("users.create.fields.nombrePh")}
                  disabled={loading}
                />
              </div>

              <div className="field">
                <label>{t("users.create.fields.apellido")}</label>
                <input
                  className="input-modal-user"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder={t("users.create.fields.apellidoPh")}
                  disabled={loading}
                />
              </div>

              <div className="field">
                <label>{t("users.create.fields.telefono")}</label>
                <input
                  className="input-modal-user"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder={t("users.create.fields.telefonoPh")}
                  disabled={loading}
                />
              </div>

              <div className="field full">
                <label>{t("users.create.fields.email")}</label>
                <input
                  className="input-modal-user"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("users.create.fields.emailPh")}
                  disabled={loading}
                />
                {email && !isValidEmail(email) && (
                  <div className="error" style={{ fontSize: 13, marginTop: 6 }}>
                    {t("errors.validation.invalidEmail")}
                  </div>
                )}
              </div>

              <div className="field full">
                <label>{t("users.create.fields.direccion")}</label>
                <input
                  className="input-modal-user"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder={t("users.create.fields.direccionPh")}
                  disabled={loading}
                />
              </div>

              <div className="modal-form-hint field full">
                {t("users.create.hint")}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={onClose}
                disabled={loading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn-modal-logout"
                onClick={onGuardarPaso1}
                disabled={loading}
              >
                {t("common.continue")}
              </button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="modal-form-hint" style={{ marginTop: 10 }}>
              {t("users.create.confirmSubtitle")}
            </div>

            <div className="modal-form-grid" style={{ marginTop: 12 }}>
              <div className="field">
                <label>{t("users.create.fields.rut")}</label>
                <input className="input" value={fmt(draft?.rut)} disabled />
              </div>

              <div className="field">
                <label>{t("users.create.fields.nombre")}</label>
                <input className="input" value={fmt(draft?.nombre)} disabled />
              </div>

              <div className="field">
                <label>{t("users.create.fields.apellido")}</label>
                <input
                  className="input"
                  value={fmt(draft?.apellido)}
                  disabled
                />
              </div>

              <div className="field">
                <label>{t("users.create.fields.telefono")}</label>
                <input
                  className="input"
                  value={fmt(draft?.telefono)}
                  disabled
                />
              </div>

              <div className="field full">
                <label>{t("users.create.fields.email")}</label>
                <input className="input" value={fmt(draft?.email)} disabled />
              </div>

              <div className="field full">
                <label>{t("users.create.fields.direccion")}</label>
                <input
                  className="input"
                  value={fmt(draft?.direccion)}
                  disabled
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={volverAEditar}
                disabled={loading}
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                className="btn-modal-logout"
                onClick={onConfirmarCreacion}
                disabled={loading}
              >
                {t("common.confirm")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
