import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  listarUsuariosInternosApi,
  crearUsuarioInternoApi,
  cambiarEstadoUsuarioInternoApi,
  listarMovimientosAuditoriaApi,
  actualizarUsuarioInternoApi,
  reenviarInvitacionPasswordApi,
} from "../../api/UsuariosInternos.api";

const Administracion = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Datos
  const [usuarios, setUsuarios] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal crear
  const [isModalCrearOpen, setIsModalCrearOpen] = useState(false);
  const [pasoCrear, setPasoCrear] = useState(1);
  const [nuevoUser, setNuevoUser] = useState({
    nombre: "",
    apellido: "",
    username: "",
    email: "",
    id_rol: "",
  });

  // Modal editar
  const [isModalEditarOpen, setIsModalEditarOpen] = useState(false);
  const [userEdit, setUserEdit] = useState(null);
  const [editPassword, setEditPassword] = useState(""); 

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const resUsers = await listarUsuariosInternosApi();
      const resEvents = await listarMovimientosAuditoriaApi({ limit: 5 });

      setUsuarios(
        resUsers?.ok && Array.isArray(resUsers.data) ? resUsers.data : []
      );
      setEventos(
        resEvents?.ok && Array.isArray(resEvents.data) ? resEvents.data : []
      );
    } catch (error) {
      console.error("Error cargando administración:", error);
      setUsuarios([]);
      setEventos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return usuarios;

    return usuarios.filter(
      (u) =>
        (u.nombre || "").toLowerCase().includes(q) ||
        (u.apellido || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [usuarios, busqueda]);

  // Auditoría (decode)
  const parseDetalle = (detalleStr) => {
    if (!detalleStr) return t("audits.unknown");
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

  // Crear usuario (backend envía invitación)
  const handleGuardarNuevoUsuario = async () => {
    try {
      const payload = {
        nombre: nuevoUser.nombre,
        apellido: nuevoUser.apellido,
        username: nuevoUser.username,
        email: nuevoUser.email,
        id_rol: parseInt(nuevoUser.id_rol, 10),
      };

      const res = await crearUsuarioInternoApi(payload);

      if (res?.ok) {
        setIsModalCrearOpen(false);
        setPasoCrear(1);
        setNuevoUser({
          nombre: "",
          apellido: "",
          username: "",
          email: "",
          id_rol: "",
        });
        await cargarDatos();

        alert(t("success.internalUsers.inviteSent"));
      } else {
        alert(t("errors.internalUsers.createFailed"));
      }
    } catch (error) {
      alert(
        t(error.response?.data?.error || "errors.internalUsers.createFailed")
      );
    }
  };

  const handleToggleEstado = async (user) => {
    const nuevoEstado = user.estado === 1 ? 0 : 1;

    if (nuevoEstado === 0) {
      const ok = window.confirm(t("users.actions.deactivateConfirm"));
      if (!ok) return;
    }

    try {
      const res = await cambiarEstadoUsuarioInternoApi(
        user.id_usuario,
        nuevoEstado
      );
      if (res?.ok) {
        await cargarDatos();

        alert(
          nuevoEstado === 1
            ? t("success.internalUsers.activated")
            : t("success.internalUsers.deactivated")
        );
      } else {
        alert(t("errors.internalUsers.stateUpdateFailed"));
      }
    } catch (error) {
      alert(
        t(
          error.response?.data?.error ||
            "errors.internalUsers.stateUpdateFailed"
        )
      );
    }
  };

  // Abrir editar
  const openEditar = (user) => {
    setUserEdit({
      id_usuario: user.id_usuario,
      nombre: user.nombre || "",
      apellido: user.apellido || "",
      email: user.email || "",
      idioma: user.idioma || "es",
      rol_nombre: user.rol_nombre || "",
      estado: user.estado,
    });
    setEditPassword("");
    setIsModalEditarOpen(true);
  };

  const handleGuardarEdicion = async () => {
    if (!userEdit) return;

    try {
      const payload = {
        nombre: userEdit.nombre,
        apellido: userEdit.apellido,
        email: userEdit.email,
        idioma: userEdit.idioma,
      };

      if (editPassword.trim()) payload.password = editPassword.trim();

      const res = await actualizarUsuarioInternoApi(
        userEdit.id_usuario,
        payload
      );

      if (res?.ok) {
        setIsModalEditarOpen(false);
        setUserEdit(null);
        setEditPassword("");
        await cargarDatos();

        alert(t("success.internalUsers.updated"));
      } else {
        alert(t("errors.internalUsers.updateFailed"));
      }
    } catch (error) {
      alert(
        t(error.response?.data?.error || "errors.internalUsers.updateFailed")
      );
    }
  };

  const handleReenviarInvitacion = async (user) => {
    const ok = window.confirm(t("users.actions.inviteConfirm"));
    if (!ok) return;

    try {
      const res = await reenviarInvitacionPasswordApi(user.id_usuario);
      if (res?.ok) {
        alert(t("success.internalUsers.inviteSent"));
        await cargarDatos();
      } else {
        alert(t("errors.internalUsers.inviteFailed"));
      }
    } catch (error) {
      alert(
        t(error.response?.data?.error || "errors.internalUsers.inviteFailed")
      );
    }
  };

  return (
    <div className="panel admin-page">
      <header className="admin-page-header">
        <h1>{t("administrator.title")}</h1>
      </header>

      {/* ACTIVIDAD RECIENTE */}
      <section className="activity-container-card">
        <div className="section-title-row">
          <h3>{t("administrator.activity.title")}</h3>

          <button
            className="btn-gradient"
            onClick={() => navigate("/historial-eventos")}
            type="button"
          >
            {t("administrator.activity.viewAll")}
          </button>
        </div>

        <div className="activity-list-wrapper">
          {loading ? (
            <p className="no-data-msg">{t("common.loading")}</p>
          ) : eventos.length > 0 ? (
            eventos.map((ev) => (
              <div key={ev.id_evento} className="activity-list-item">
                <span className={`event-dot ${ev.tipo_evento}`} />
                <div className="event-info">
                  <p>
                    <strong>
                      {ev.nombre_usuario
                        ? `${ev.nombre_usuario} ${
                            ev.apellido_usuario || ""
                          }`.trim()
                        : t("administrator.activity.unknownUser")}
                    </strong>{" "}
                    — {parseDetalle(ev.detalle)}
                  </p>
                  <small>{new Date(ev.fecha_hora).toLocaleString()}</small>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data-msg">{t("administrator.activity.empty")}</p>
          )}
        </div>
      </section>

      {/* USUARIOS INTERNOS */}
      <section className="admin-group-card">
        <div className="admin-users-header">
          <div className="title-row">
            <h3>{t("administrator.internalUsers.sectionTitle")}</h3>

            <div className="tools-row">
              <button
                className="btn-create-internal"
                onClick={() => setIsModalCrearOpen(true)}
                type="button"
              >
                {t("administrator.internalUsers.createBtn")}
              </button>

              <div className="search-box">
                <input
                  className="search-input-admin"
                  type="text"
                  placeholder={t(
                    "administrator.internalUsers.searchPlaceholder"
                  )}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="user-cards-stack">
          {loading ? (
            <p className="no-data-msg">{t("common.loading")}</p>
          ) : usuariosFiltrados.length > 0 ? (
            usuariosFiltrados.map((user) => (
              <div
                key={user.id_usuario}
                className={`user-full-card ${
                  user.estado === 0 ? "is-inactive" : ""
                }`}
              >
                <div className="user-main-data">
                  <div className="user-avatar">
                    {user.nombre ? user.nombre[0] : "U"}
                  </div>
                  <div>
                    <h4 className="user-title">
                      {user.nombre} {user.apellido}
                    </h4>
                    <span className="user-tag">{user.rol_nombre}</span>
                  </div>
                </div>

                <div className="user-contact-data">
                  <p>
                    <strong>{t("users.cols.email")}:</strong> {user.email}
                  </p>

                  <button
                    className="btn-link-invite"
                    type="button"
                    onClick={() => handleReenviarInvitacion(user)}
                  >
                    {t("users.actions.invite")}
                  </button>
                </div>

                <div className="user-status-zone">
                  <span
                    className={`status-pill ${
                      user.estado === 1 ? "ACTIVO" : "INACTIVO"
                    }`}
                  >
                    {user.estado === 1
                      ? t("users.modal.active")
                      : t("users.modal.inactive")}
                  </span>

                  <div className="user-actions">
                    <button
                      className="btn-edit"
                      type="button"
                      onClick={() => openEditar(user)}
                    >
                      {t("users.actions.edit")}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data-msg">{t("users.empty.internalUsers")}</p>
          )}
        </div>
      </section>

      {/* MODAL CREAR */}
      {isModalCrearOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            setIsModalCrearOpen(false);
            setPasoCrear(1);
          }}
          role="presentation"
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {pasoCrear === 1 ? (
              <>
                <h3>{t("users.create.title")}</h3>
                <p className="modal-form-hint">
                  {t("users.create.inviteHint")}
                </p>

                <div className="modal-form-grid">
                  <div className="field">
                    <label>{t("users.create.fields.nombre")}</label>
                    <input
                      className="input-modal-user"
                      placeholder={t("users.create.fields.nombrePh")}
                      value={nuevoUser.nombre}
                      onChange={(e) =>
                        setNuevoUser((p) => ({ ...p, nombre: e.target.value }))
                      }
                    />
                  </div>

                  <div className="field">
                    <label>{t("users.create.fields.apellido")}</label>
                    <input
                      className="input-modal-user"
                      placeholder={t("users.create.fields.apellidoPh")}
                      value={nuevoUser.apellido}
                      onChange={(e) =>
                        setNuevoUser((p) => ({
                          ...p,
                          apellido: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="field">
                    <label>{t("users.create.fields.username")}</label>
                    <input
                      className="input-modal-user"
                      placeholder={t("users.create.fields.usernamePh")}
                      value={nuevoUser.username}
                      onChange={(e) =>
                        setNuevoUser((p) => ({
                          ...p,
                          username: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="field">
                    <label>{t("users.create.fields.email")}</label>
                    <input
                      className="input-modal-user"
                      placeholder={t("users.create.fields.emailPh")}
                      value={nuevoUser.email}
                      onChange={(e) =>
                        setNuevoUser((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="field full">
                    <label>{t("users.create.fields.rol")}</label>
                    <select
                      className="input-modal-user"
                      value={nuevoUser.id_rol}
                      onChange={(e) =>
                        setNuevoUser((p) => ({ ...p, id_rol: e.target.value }))
                      }
                    >
                      <option value="">{t("users.create.fields.rolPh")}</option>
                      <option value="1">
                        {t("users.create.fields.rolAdmin")}
                      </option>
                      <option value="2">
                        {t("users.create.fields.rolColab")}
                      </option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => {
                      setIsModalCrearOpen(false);
                      setPasoCrear(1);
                    }}
                  >
                    {t("common.cancel")}
                  </button>

                  <button
                    type="button"
                    className="btn-modal-primary"
                    disabled={!nuevoUser.id_rol}
                    onClick={() => setPasoCrear(2)}
                  >
                    {t("users.create.actions.next")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>{t("users.create.confirmTitle")}</h3>
                <p className="modal-form-hint">
                  {t("users.create.confirmSubtitle")}
                </p>

                <div className="confirm-box">
                  <p>
                    <strong>{t("users.create.fields.nombre")}:</strong>{" "}
                    {nuevoUser.nombre} {nuevoUser.apellido}
                  </p>
                  <p>
                    <strong>{t("users.create.fields.username")}:</strong>{" "}
                    {nuevoUser.username}
                  </p>
                  <p>
                    <strong>{t("users.create.fields.email")}:</strong>{" "}
                    {nuevoUser.email}
                  </p>
                  <p>
                    <strong>{t("users.create.fields.rol")}:</strong>{" "}
                    {nuevoUser.id_rol === "1"
                      ? t("users.create.fields.rolAdmin")
                      : t("users.create.fields.rolColab")}
                  </p>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setPasoCrear(1)}
                  >
                    {t("users.create.actions.back")}
                  </button>

                  <button
                    type="button"
                    className="btn-modal-primary"
                    onClick={handleGuardarNuevoUsuario}
                  >
                    {t("users.create.actions.save")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* MODAL EDITAR */}
      {isModalEditarOpen && userEdit && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            setIsModalEditarOpen(false);
            setUserEdit(null);
            setEditPassword("");
          }}
          role="presentation"
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>{t("users.edit.title")}</h3>

            <div className="modal-form-grid">
              <div className="field">
                <label>{t("users.cols.id")}</label>
                <input
                  className="input-modal-user"
                  value={String(userEdit.id_usuario)}
                  disabled
                />
              </div>

              <div className="field">
                <label>{t("users.create.fields.rol")}</label>
                <input
                  className="input-modal-user"
                  value={userEdit.rol_nombre}
                  disabled
                />
              </div>

              <div className="field">
                <label>{t("users.create.fields.nombre")}</label>
                <input
                  className="input-modal-user"
                  placeholder={t("users.create.fields.nombrePh")}
                  value={userEdit.nombre}
                  onChange={(e) =>
                    setUserEdit((p) => ({ ...p, nombre: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label>{t("users.create.fields.apellido")}</label>
                <input
                  className="input-modal-user"
                  placeholder={t("users.create.fields.apellidoPh")}
                  value={userEdit.apellido}
                  onChange={(e) =>
                    setUserEdit((p) => ({ ...p, apellido: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label>{t("users.create.fields.email")}</label>
                <input
                  className="input-modal-user"
                  placeholder={t("users.create.fields.emailPh")}
                  value={userEdit.email}
                  onChange={(e) =>
                    setUserEdit((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label>
                  {t("common.lang.es")}/{t("common.lang.en")}
                </label>
                <select
                  className="input-modal-user"
                  value={userEdit.idioma}
                  onChange={(e) =>
                    setUserEdit((p) => ({ ...p, idioma: e.target.value }))
                  }
                >
                  <option value="es">{t("common.lang.es")}</option>
                  <option value="en">{t("common.lang.en")}</option>
                </select>
              </div>

              <div className="field full">
                <div className="modal-form-hint">
                  {t("administrator.internalUsers.roleRestriction")}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => {
                  setIsModalEditarOpen(false);
                  setUserEdit(null);
                  setEditPassword("");
                }}
              >
                {t("common.cancel")}
              </button>

              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleGuardarEdicion}
              >
                {t("users.edit.save")}
              </button>
            </div>

            <div>
              <div className="modal-form-hint">
                {t("users.modal.deactivate.text")}
              </div>

              <button
                type="button"
                className="btn-deactivate"
                onClick={async () => {
                  const nuevoEstado = userEdit.estado === 1 ? 0 : 1;

                  if (nuevoEstado === 0) {
                    const ok = window.confirm(
                      t("users.actions.deactivateConfirm")
                    );
                    if (!ok) return;
                  }

                  await handleToggleEstado(userEdit);

                  setIsModalEditarOpen(false);
                  setUserEdit(null);
                  setEditPassword("");
                }}
              >
                {userEdit.estado === 1
                  ? t("users.actions.deactivate")
                  : t("users.actions.activate")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Administracion;
