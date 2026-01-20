const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verificarToken, esAdmin } = require("../middlewares/auth.middleware");
const { sendOk, sendError } = require("../utils/http");
const { registrarEvento } = require("../services/auditoria.service");
const { normalizeRut, isValidRut } = require("../utils/rut");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isValidEmail(email) {
  if (!isNonEmptyString(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function safeInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* GET */
router.get("/", verificarToken, async (req, res) => {
  try {
    const isAdminUser = Number(req.user?.id_rol) === 1;

    const q = isNonEmptyString(req.query.q) ? req.query.q.trim() : null;
    const rutQ = isNonEmptyString(req.query.rut) ? normalizeRut(req.query.rut) : null;
    const soloActivos = String(req.query.soloActivos ?? "0") === "1";

    const sortKey = String(req.query.sortKey || "apellido");
    const sortDir = String(req.query.sortDir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

    const page = Math.max(1, safeInt(req.query.page, 1));
    const limit = Math.min(200, Math.max(1, safeInt(req.query.limit, 30)));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (!isAdminUser) {
      where.push("e.estado = 1");
    } else {
      if (soloActivos) where.push("e.estado = 1");
    }

    if (q) {
      const like = `%${q}%`;
      where.push("(e.nombre LIKE ? OR e.apellido LIKE ? OR CONCAT(e.nombre,' ',e.apellido) LIKE ?)");
      params.push(like, like, like);
    }

    if (rutQ) {
      if (!rutQ || !isValidRut(rutQ)) {
        return sendError(res, { status: 400, error: "errors.validation.invalidRut" });
      }
      where.push("TRIM(e.rut) = TRIM(?)");
      params.push(rutQ);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sortMap = {
      reputacion: "e.reputacion",
      nombre: "e.nombre",
      apellido: "e.apellido",
      estado: "e.estado",
    };
    const orderCol = sortMap[sortKey] || "e.apellido";
    const orderSql = `ORDER BY ${orderCol} ${sortDir}, e.apellido ASC, e.nombre ASC`;

    const query = `
      SELECT 
        e.rut,
        e.nombre,
        e.apellido,
        e.telefono,
        e.email,
        e.direccion,
        e.reputacion,
        e.estado,
        e.fecha_desactivacion,
        CONCAT(u.nombre, ' ', u.apellido) AS registrado_por
      FROM usuario_externo e
      JOIN usuario_interno u ON e.registrado_por = u.id_usuario
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM usuario_externo e
      JOIN usuario_interno u ON e.registrado_por = u.id_usuario
      ${whereSql}
    `;

    const [rows] = await db.query(query, [...params, limit, offset]);
    const [countRows] = await db.query(countQuery, params);
    const total = countRows?.[0]?.total ?? 0;

    return sendOk(res, {
      status: 200,
      message: "success.externalUsers.fetched",
      data: rows,
      meta: { page, limit, total },
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: "errors.externalUsers.fetchFailed" });
  }
});

// Obtener usuario externo por RUT
router.get('/rut/:rut', verificarToken, async (req, res) => {
  const rutNorm = normalizeRut(req.params.rut);
  if (!rutNorm || !isValidRut(rutNorm)) {
    return sendError(res, { status: 400, error: 'errors.validation.invalidRut' });
  }

  try {
    const [rows] = await db.query(
      `SELECT rut, nombre, apellido, telefono, email, direccion, reputacion, estado, fecha_desactivacion
       FROM usuario_externo
       WHERE TRIM(rut) = TRIM(?)`,
      [rutNorm]
    );

    if (rows.length === 0) {
      return sendError(res, { status: 404, error: 'errors.externalUsers.notFound' });
    }

    return sendOk(res, {
      status: 200,
      message: 'success.externalUsers.fetched',
      data: rows[0]
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: 'errors.externalUsers.fetchFailed' });
  }
});

// Crear usuario
router.post("/registrar-externo", verificarToken, async (req, res) => {
  const { rut, nombre, apellido, telefono, email, direccion } = req.body;
  const registrado_por = req.user.id_usuario;

  if (!isNonEmptyString(rut) || !isNonEmptyString(nombre) || !isNonEmptyString(apellido)) {
    return sendError(res, { status: 400, error: "errors.validation.requiredFields" });
  }

  const rutNorm = normalizeRut(rut);
  if (!rutNorm || !isValidRut(rutNorm)) {
    return sendError(res, { status: 400, error: "errors.validation.invalidRut" });
  }

  if (email != null && String(email).trim() !== "" && !isValidEmail(email)) {
    return sendError(res, { status: 400, error: "errors.validation.invalidEmail" });
  }

  const nombreNorm = nombre.trim();
  const apellidoNorm = apellido.trim();

  try {
    const [existe] = await db.query("SELECT rut FROM usuario_externo WHERE rut = ?", [rutNorm]);
    if (existe.length > 0) {
      return sendError(res, { status: 400, error: "errors.externalUsers.rutAlreadyExists" });
    }

    await db.query(
      `INSERT INTO usuario_externo
        (rut, nombre, apellido, telefono, email, direccion, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        rutNorm,
        nombreNorm,
        apellidoNorm,
        telefono || null,
        email ? String(email).trim() : null,
        direccion || null,
        registrado_por,
      ]
    );

    await registrarEvento(db, {
      tipo_evento: "CREACION",
      id_usuario_interno: registrado_por,
      rut_usuario_externo: rutNorm,
      detalle_key: "audits.externalUsers.created",
      detalle_meta: { nombre: nombreNorm, apellido: apellidoNorm },
    });

    return sendOk(res, { status: 201, message: "success.externalUsers.created", data: null });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: "errors.externalUsers.createFailed" });
  }
});

// Actualizar usuario ext (sin cambiar rut)
router.put("/:rut", verificarToken, async (req, res) => {
  const rutParam = req.params.rut;
  const { nombre, apellido, telefono, email, direccion } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!isNonEmptyString(rutParam)) {
    return sendError(res, { status: 400, error: "errors.validation.invalidRut" });
  }

  const rutNorm = normalizeRut(rutParam);
  if (!rutNorm || !isValidRut(rutNorm)) {
    return sendError(res, { status: 400, error: "errors.validation.invalidRut" });
  }

  if (!isNonEmptyString(nombre) || !isNonEmptyString(apellido)) {
    return sendError(res, { status: 400, error: "errors.validation.requiredFields" });
  }

  if (email != null && String(email).trim() !== "" && !isValidEmail(email)) {
    return sendError(res, { status: 400, error: "errors.validation.invalidEmail" });
  }

  const nombreNorm = nombre.trim();
  const apellidoNorm = apellido.trim();

  try {
    const [beforeRows] = await db.query(
      `SELECT nombre, apellido, telefono, email, direccion
       FROM usuario_externo
       WHERE rut = ?`,
      [rutNorm]
    );

    if (beforeRows.length === 0) {
      return sendError(res, { status: 404, error: "errors.externalUsers.notFound" });
    }

    const before = beforeRows[0];

    const [result] = await db.query(
      `UPDATE usuario_externo
       SET nombre = ?, apellido = ?, telefono = ?, email = ?, direccion = ?
       WHERE rut = ?`,
      [
        nombreNorm,
        apellidoNorm,
        telefono || null,
        email ? String(email).trim() : null,
        direccion || null,
        rutNorm,
      ]
    );

    if (result.affectedRows === 0) {
      return sendError(res, { status: 404, error: "errors.externalUsers.notFound" });
    }

    const changed = [];
    if ((before.nombre ?? "") !== nombreNorm) changed.push("nombre");
    if ((before.apellido ?? "") !== apellidoNorm) changed.push("apellido");
    if ((before.telefono ?? null) !== (telefono || null)) changed.push("telefono");
    if ((before.email ?? null) !== (email ? String(email).trim() : null)) changed.push("email");
    if ((before.direccion ?? null) !== (direccion || null)) changed.push("direccion");

    if (changed.length > 0) {
      await registrarEvento(db, {
        tipo_evento: "ACTUALIZACION",
        id_usuario_interno: id_usuario,
        rut_usuario_externo: rutNorm,
        detalle_key: "audits.externalUsers.updated",
        detalle_meta: { fields: changed.join(",") },
      });
    }

    return sendOk(res, { status: 200, message: "success.externalUsers.updated", data: null });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: "errors.externalUsers.updateFailed" });
  }
});

router.patch("/:rut/rut", verificarToken, async (req, res) => {
  const rutParam = req.params.rut;
  const { nuevoRut } = req.body;
  const id_usuario = req.user.id_usuario;

  const rutActual = normalizeRut(rutParam);
  const rutNuevo = normalizeRut(nuevoRut);

  if (!rutActual || !isValidRut(rutActual)) {
    return sendError(res, { status: 400, error: "errors.validation.invalidRut" });
  }
  if (!rutNuevo || !isValidRut(rutNuevo)) {
    return sendError(res, { status: 400, error: "errors.validation.invalidRut" });
  }
  if (rutActual === rutNuevo) {
    return sendOk(res, { status: 200, message: "success.externalUsers.updated", data: null });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existsNew] = await conn.query("SELECT rut FROM usuario_externo WHERE rut = ?", [rutNuevo]);
    if (existsNew.length > 0) {
      await conn.rollback();
      return sendError(res, { status: 400, error: "errors.externalUsers.rutAlreadyExists" });
    }

    const [existsOld] = await conn.query("SELECT rut FROM usuario_externo WHERE rut = ?", [rutActual]);
    if (existsOld.length === 0) {
      await conn.rollback();
      return sendError(res, { status: 404, error: "errors.externalUsers.notFound" });
    }

    await conn.query("UPDATE usuario_externo SET rut = ? WHERE rut = ?", [rutNuevo, rutActual]);

    await conn.query("UPDATE registro_prestamo SET rut_usuario = ? WHERE rut_usuario = ?", [
      rutNuevo,
      rutActual,
    ]);

    await registrarEvento(conn, {
      tipo_evento: "ACTUALIZACION",
      id_usuario_interno: id_usuario,
      rut_usuario_externo: rutNuevo,
      detalle_key: "audits.externalUsers.rutChanged",
      detalle_meta: { from: rutActual, to: rutNuevo },
    });

    await conn.commit();
    return sendOk(res, { status: 200, message: "success.externalUsers.updated", data: null });
  } catch (error) {
    try { await conn.rollback(); } catch {}
    console.error(error);
    return sendError(res, { status: 500, error: "errors.externalUsers.updateFailed" });
  } finally {
    conn.release();
  }
});

// Activar o desactivar usuarios ext
router.patch("/:rut/estado", verificarToken, async (req, res) => {
  const { rut } = req.params;
  const { nuevoEstado } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!rut || typeof rut !== "string") {
    return sendError(res, { status: 400, error: "errors.validation.invalidRut" });
  }

  if (nuevoEstado !== 0 && nuevoEstado !== 1) {
    return sendError(res, { status: 400, error: "errors.validation.invalidState" });
  }

  const rutNorm = normalizeRut(rut);
  if (!rutNorm || !isValidRut(rutNorm)) {
    return sendError(res, { status: 400, error: "errors.validation.invalidRut" });
  }

  try {
    const [result] = await db.query("UPDATE usuario_externo SET estado = ? WHERE rut = ?", [
      nuevoEstado,
      rutNorm,
    ]);

    if (result.affectedRows === 0) {
      return sendError(res, { status: 404, error: "errors.externalUsers.notFound" });
    }

    await registrarEvento(db, {
      tipo_evento: nuevoEstado === 0 ? "DESACTIVACION" : "ACTUALIZACION",
      id_usuario_interno: id_usuario,
      rut_usuario_externo: rutNorm,
      detalle_key:
        nuevoEstado === 0 ? "audits.externalUsers.deactivated" : "audits.externalUsers.activated",
      detalle_meta: { nuevoEstado },
    });

    return sendOk(res, {
      status: 200,
      message: nuevoEstado === 1 ? "success.externalUsers.activated" : "success.externalUsers.deactivated",
      data: null,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: "errors.externalUsers.stateUpdateFailed" });
  }
});

module.exports = router;
