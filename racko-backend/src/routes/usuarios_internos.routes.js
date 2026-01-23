const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const db = require("../config/db");
const { verificarToken, esAdmin } = require("../middlewares/auth.middleware");
const { sendOk, sendError } = require("../utils/http");
const { registrarEvento } = require("../services/auditoria.service");
const crypto = require("crypto");
const { enviarCorreoInvitacionPassword } = require("../services/email.service");

function toPositiveInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// Listar usuarios internos (admin)
router.get("/", verificarToken, esAdmin, async (req, res) => {
  try {
    const estadoQ = req.query.estado;

    let whereSql = "";
    const params = [];

    if (estadoQ === "1") {
      whereSql = "WHERE u.estado = 1";
    } else if (estadoQ === "0") {
      whereSql = "WHERE u.estado = 0";
    }

    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.estado,
        u.idioma,
        r.nombre AS rol_nombre
      FROM usuario_interno u
      JOIN rol r ON u.id_rol = r.id_rol
      ${whereSql}
      ORDER BY u.estado DESC, u.apellido ASC
    `;

    const [rows] = await db.query(query, params);

    return sendOk(res, {
      status: 200,
      message: "success.internalUsers.fetched",
      data: rows,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.internalUsers.fetchFailed",
    });
  }
});

// Crear usuario interno (Admin)
router.post("/", verificarToken, esAdmin, async (req, res) => {
  const { nombre, apellido, username, email, id_rol } = req.body;
  const id_admin = req.user.id_usuario;

  if (
    !isNonEmptyString(nombre) ||
    !isNonEmptyString(apellido) ||
    !isNonEmptyString(username) ||
    !isNonEmptyString(email) ||
    !id_rol
  ) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.requiredFields",
    });
  }

  const idRol = toPositiveInt(id_rol);
  if (Number.isNaN(idRol)) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidRole",
    });
  }

  const usernameNorm = String(username).trim().toLowerCase();
  const emailNorm = String(email).trim().toLowerCase();

  try {
    const [rolRows] = await db.query(
      "SELECT nombre FROM rol WHERE id_rol = ?",
      [idRol],
    );

    if (rolRows.length === 0) {
      return sendError(res, {
        status: 400,
        error: "errors.validation.invalidRole",
      });
    }

    const tempPassword = require("crypto").randomBytes(24).toString("hex");
    const passwordHashed = await bcrypt.hash(tempPassword, 10);

    const token = require("crypto").randomBytes(32).toString("hex");
    const expiracion = new Date(Date.now() + 3600000); // 1 hora

    const [result] = await db.query(
      `INSERT INTO usuario_interno
        (nombre, apellido, username, email, password, id_rol, estado, reset_token, reset_expiracion, idioma)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'es')`,
      [
        nombre.trim(),
        apellido.trim(),
        usernameNorm,
        emailNorm,
        passwordHashed,
        idRol,
        token,
        expiracion,
      ],
    );

    const id_usuario_creado = result.insertId;

    await registrarEvento(db, {
      tipo_evento: "CREACION",
      id_usuario_interno: id_admin,
      detalle_key: "audits.internalUsers.created",
      detalle_meta: {
        target_tipo: "usuario_interno",
        target_id: id_usuario_creado,
        target_nombre: nombre.trim(),
        target_apellido: apellido.trim(),
        target_email: emailNorm,
        target_username: usernameNorm,
        rol: rolRows[0].nombre,
      },
    });

    try {
      await enviarCorreoInvitacionPassword(emailNorm, token, usernameNorm);
    } catch (emailError) {
      console.error("Error enviando correo invitación:", emailError);
    }

    return sendOk(res, {
      status: 201,
      message: "success.internalUsers.created",
      data: { id_usuario: id_usuario_creado },
    });
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("username")) {
        return sendError(res, {
          status: 400,
          error: "errors.internalUsers.usernameAlreadyExists",
        });
      }
      if (msg.includes("email")) {
        return sendError(res, {
          status: 400,
          error: "errors.internalUsers.emailAlreadyExists",
        });
      }
      return sendError(res, {
        status: 400,
        error: "errors.validation.duplicateEntry",
      });
    }

    return sendError(res, {
      status: 500,
      error: "errors.internalUsers.createFailed",
    });
  }
});

// Perfil usuario conectado
router.get("/perfil", verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_usuario, nombre, apellido, email, id_rol, idioma
       FROM usuario_interno
       WHERE id_usuario = ?`,
      [req.user.id_usuario],
    );

    if (rows.length === 0) {
      return sendError(res, {
        status: 404,
        error: "errors.internalUsers.notFound",
      });
    }

    return sendOk(res, {
      status: 200,
      message: "success.internalUsers.profileFetched",
      data: rows[0],
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.internalUsers.profileFetchFailed",
    });
  }
});

// Reenviar invitación para definir contraseña (Admin)
router.post(
  "/:id/invitacion-password",
  verificarToken,
  esAdmin,
  async (req, res) => {
    const idNum = toPositiveInt(req.params.id);

    if (Number.isNaN(idNum)) {
      return sendError(res, {
        status: 400,
        error: "errors.validation.invalidId",
      });
    }

    try {
      const [rows] = await db.query(
        `SELECT id_usuario, email, username, estado
       FROM usuario_interno
       WHERE id_usuario = ?`,
        [idNum],
      );

      if (rows.length === 0) {
        return sendError(res, {
          status: 404,
          error: "errors.internalUsers.notFound",
        });
      }

      const user = rows[0];

      if (user.estado !== 1) {
        return sendError(res, {
          status: 400,
          error: "errors.internalUsers.inactiveUser",
        });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiracion = new Date(Date.now() + 3600000);

      await db.query(
        "UPDATE usuario_interno SET reset_token = ?, reset_expiracion = ? WHERE id_usuario = ?",
        [token, expiracion, user.id_usuario],
      );

      const ok = await enviarCorreoInvitacionPassword(
        user.email,
        token,
        user.username,
      );

      if (!ok) {
        return sendError(res, {
          status: 500,
          error: "errors.email.sendFailed",
        });
      }

      await registrarEvento(db, {
        tipo_evento: "ACTUALIZACION",
        id_usuario_interno: req.user.id_usuario,
        detalle_key: "audits.internalUsers.inviteSent",
        detalle_meta: {
          target_tipo: "usuario_interno",
          target_id: user.id_usuario,
          target_email: user.email,
          target_username: user.username,
        },
      });

      return sendOk(res, {
        status: 200,
        message: "success.internalUsers.inviteSent",
        data: null,
      });
    } catch (error) {
      console.error(error);
      return sendError(res, {
        status: 500,
        error: "errors.internalUsers.inviteFailed",
      });
    }
  },
);

// Actualizar idioma preferido
router.patch("/idioma", verificarToken, async (req, res) => {
  const { idioma } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!["es", "en"].includes(idioma)) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidLanguage",
    });
  }

  try {
    const [result] = await db.query(
      "UPDATE usuario_interno SET idioma = ? WHERE id_usuario = ?",
      [idioma, id_usuario],
    );

    if (result.affectedRows === 0) {
      return sendError(res, {
        status: 404,
        error: "errors.internalUsers.notFound",
      });
    }

    return sendOk(res, {
      status: 200,
      message: "success.internalUsers.languageUpdated",
      data: null,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.internalUsers.languageUpdateFailed",
    });
  }
});

// Editar usuario interno (solo Admin)
router.patch("/:id", verificarToken, esAdmin, async (req, res) => {
  const idNum = toPositiveInt(req.params.id);
  if (Number.isNaN(idNum)) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidId",
    });
  }

  const { nombre, apellido, email, idioma, password } = req.body;

  if (
    !isNonEmptyString(nombre) ||
    !isNonEmptyString(apellido) ||
    !isNonEmptyString(email)
  ) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.requiredFields",
    });
  }

  if (idioma && !["es", "en"].includes(idioma)) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidLanguage",
    });
  }

  if (password !== undefined && password !== null && password !== "") {
    if (typeof password !== "string" || password.trim().length < 6) {
      return sendError(res, {
        status: 400,
        error: "errors.validation.passwordTooShort",
      });
    }
  }

  const id_admin = req.user.id_usuario;

  try {
    const [existRows] = await db.query(
      "SELECT id_usuario, email, nombre, apellido, idioma FROM usuario_interno WHERE id_usuario = ?",
      [idNum],
    );
    if (existRows.length === 0) {
      return sendError(res, {
        status: 404,
        error: "errors.internalUsers.notFound",
      });
    }

    const prev = existRows[0];

    const emailNorm = email.trim().toLowerCase();

    const [dupRows] = await db.query(
      "SELECT id_usuario FROM usuario_interno WHERE email = ? AND id_usuario <> ? LIMIT 1",
      [emailNorm, idNum],
    );
    if (dupRows.length > 0) {
      return sendError(res, {
        status: 400,
        error: "errors.internalUsers.emailAlreadyExists",
      });
    }

    const fields = [];
    const params = [];

    fields.push("nombre = ?");
    params.push(nombre.trim());
    fields.push("apellido = ?");
    params.push(apellido.trim());
    fields.push("email = ?");
    params.push(emailNorm);

    if (idioma) {
      fields.push("idioma = ?");
      params.push(idioma);
    }

    if (password !== undefined && password !== null && password !== "") {
      const passwordHashed = await bcrypt.hash(password, 10);
      fields.push("password = ?");
      params.push(passwordHashed);
    }

    params.push(idNum);

    const q = `UPDATE usuario_interno SET ${fields.join(", ")} WHERE id_usuario = ?`;
    const [result] = await db.query(q, params);

    if (result.affectedRows === 0) {
      return sendError(res, {
        status: 404,
        error: "errors.internalUsers.notFound",
      });
    }

    const cambios = [];
    if (prev.nombre !== nombre.trim()) cambios.push("nombre");
    if (prev.apellido !== apellido.trim()) cambios.push("apellido");
    if ((prev.email || "").toLowerCase() !== emailNorm) cambios.push("email");
    if (idioma && prev.idioma !== idioma) cambios.push("idioma");
    if (password !== undefined && password !== null && password !== "")
      cambios.push("password");

    await registrarEvento(db, {
      tipo_evento: "ACTUALIZACION",
      id_usuario_interno: id_admin,
      detalle_key: "audits.internalUsers.updated",
      detalle_meta: {
        target_tipo: "usuario_interno",
        target_id: idNum,
        target_nombre: nombre.trim(),
        target_apellido: apellido.trim(),
        target_email: emailNorm,
        cambios: cambios.length ? cambios.join(",") : null,

      },
    });

    return sendOk(res, {
      status: 200,
      message: "success.internalUsers.updated",
      data: null,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.internalUsers.updateFailed",
    });
  }
});

// ACtivar o desactivar usuario (Admin)
router.patch("/:id/estado", verificarToken, esAdmin, async (req, res) => {
  const idNum = toPositiveInt(req.params.id);
  const { nuevoEstado } = req.body;

  if (Number.isNaN(idNum)) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidId",
    });
  }

  if (nuevoEstado !== 0 && nuevoEstado !== 1) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidState",
    });
  }

  try {
    // regla de negocio: admin no puede desactivarse a sí mismo
    if (idNum === req.user.id_usuario && nuevoEstado === 0) {
      return sendError(res, {
        status: 400,
        error: "errors.internalUsers.cannotDeactivateSelf",
      });
    }

    const [result] = await db.query(
      "UPDATE usuario_interno SET estado = ? WHERE id_usuario = ?",
      [nuevoEstado, idNum],
    );

    if (result.affectedRows === 0) {
      return sendError(res, {
        status: 404,
        error: "errors.internalUsers.notFound",
      });
    }

    await registrarEvento(db, {
      tipo_evento: nuevoEstado === 0 ? "DESACTIVACION" : "ACTUALIZACION",
      id_usuario_interno: req.user.id_usuario,
      detalle_key:
        nuevoEstado === 0
          ? "audits.internalUsers.deactivated"
          : "audits.internalUsers.activated",
      detalle_meta: {
        target_tipo: "usuario_interno",
        target_id: idNum,
        nuevoEstado,
      },
    });

    return sendOk(res, {
      status: 200,
      message:
        nuevoEstado === 1
          ? "success.internalUsers.activated"
          : "success.internalUsers.deactivated",
      data: null,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.internalUsers.stateUpdateFailed",
    });
  }
});

module.exports = router;
