const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken, esAdmin } = require('../middlewares/auth.middleware');
const { sendOk, sendError } = require('../utils/http');
const { registrarEvento } = require('../services/auditoria.service');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function toPositiveInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

// Listar ubicaciones
router.get('/', verificarToken, async (req, res) => {
  try {
    const estadoQ = req.query.estado; 
    const isAdminUser = Number(req.user?.id_rol) === 1;

    let whereSql = 'WHERE u.estado = 1'; 
    if (isAdminUser) {
      if (estadoQ === '1') whereSql = 'WHERE u.estado = 1';
      else if (estadoQ === '0') whereSql = 'WHERE u.estado = 0';
      else whereSql = ''; 
    }

    const query = `
      SELECT u.id_ubicacion, u.nombre, u.descripcion, u.estado, u.fecha_desactivacion
      FROM ubicacion u
      ${whereSql}
      ORDER BY u.estado DESC, u.nombre ASC
    `;

    const [rows] = await db.query(query);

    return sendOk(res, {
      status: 200,
      message: 'success.locations.fetched',
      data: rows
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: 'errors.locations.fetchFailed' });
  }
});

// Crear ubicación
router.post('/', verificarToken, esAdmin, async (req, res) => {
  const { nombre, descripcion } = req.body;
  const adminId = req.user.id_usuario;

  if (!isNonEmptyString(nombre)) {
    return sendError(res, {
      status: 400,
      error: 'errors.validation.requiredFields'
    });
  }

  try {
    const [existe] = await db.query(
      `SELECT id_ubicacion
       FROM ubicacion
       WHERE nombre = ?
         AND estado = 1`,
      [nombre.trim()]
    );

    if (existe.length > 0) {
      return sendError(res, {
        status: 400,
        error: 'errors.locations.alreadyExists'
      });
    }
    const [result] = await db.query(
      `INSERT INTO ubicacion (nombre, descripcion, estado)
       VALUES (?, ?, 1)`,
      [nombre.trim(), descripcion || null]
    );

    const id_ubicacion = result.insertId;

    await registrarEvento(db, {
      tipo_evento: 'CREACION',
      id_usuario_interno: adminId,
      id_ubicacion,
      detalle_key: 'audits.assets.locationCreated',
      detalle_meta: { nombre: nombre.trim() }
    });

    return sendOk(res, {
      status: 201,
      message: 'success.locations.created',
      data: { id_ubicacion }
    });
  } catch (error) {
    console.error(error);

    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, {
        status: 400,
        error: 'errors.locations.alreadyExists'
      });
    }

    return sendError(res, {
      status: 500,
      error: 'errors.locations.createFailed'
    });
  }
});

// Editar ubicación
router.put('/:id', verificarToken, esAdmin, async (req, res) => {
  const id = toPositiveInt(req.params.id);
  const { nombre, descripcion } = req.body;

  if (Number.isNaN(id) || !isNonEmptyString(nombre)) {
    return sendError(res, {
      status: 400,
      error: 'errors.validation.requiredFields'
    });
  }

  try {
    const [beforeRows] = await db.query(
      'SELECT nombre, descripcion FROM ubicacion WHERE id_ubicacion = ?',
      [id]
    );

    if (beforeRows.length === 0) {
      return sendError(res, {
        status: 404,
        error: 'errors.locations.notFound'
      });
    }

    const before = beforeRows[0];
    const afterNombre = nombre.trim();
    const afterDescripcion = descripcion || null;

    const [existe] = await db.query(
      `SELECT id_ubicacion
       FROM ubicacion
       WHERE nombre = ?
         AND estado = 1
         AND id_ubicacion <> ?`,
      [afterNombre, id]
    );

    if (existe.length > 0) {
      return sendError(res, {
        status: 400,
        error: 'errors.locations.alreadyExists'
      });
    }

    await db.query(
      'UPDATE ubicacion SET nombre = ?, descripcion = ? WHERE id_ubicacion = ?',
      [afterNombre, afterDescripcion, id]
    );

    const changed = [];
    if ((before.nombre ?? '') !== afterNombre) changed.push('nombre');
    if ((before.descripcion ?? null) !== afterDescripcion) changed.push('descripcion');

    if (changed.length > 0) {
      await registrarEvento(db, {
        tipo_evento: 'ACTUALIZACION',
        id_usuario_interno: req.user.id_usuario,
        id_ubicacion: id,
        detalle_key: 'audits.assets.locationUpdated',
        detalle_meta: { fields: changed.join(',') }
      });
    }

    return sendOk(res, {
      status: 200,
      message: 'success.locations.updated',
      data: null
    });
  } catch (error) {
    console.error(error);

    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, {
        status: 400,
        error: 'errors.locations.alreadyExists'
      });
    }

    return sendError(res, {
      status: 500,
      error: 'errors.locations.updateFailed'
    });
  }
});

// Activar o dsactivar ubicación
router.patch('/:id/estado', verificarToken, esAdmin, async (req, res) => {
  const id = toPositiveInt(req.params.id);
  const { nuevoEstado } = req.body;

  if (Number.isNaN(id) || (nuevoEstado !== 0 && nuevoEstado !== 1)) {
    return sendError(res, {
      status: 400,
      error: 'errors.validation.invalidState'
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE ubicacion
       SET estado = ?, fecha_desactivacion = ?
       WHERE id_ubicacion = ?`,
      [
        nuevoEstado,
        nuevoEstado === 0 ? new Date() : null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return sendError(res, {
        status: 404,
        error: 'errors.locations.notFound'
      });
    }

    await registrarEvento(db, {
      tipo_evento: nuevoEstado === 0 ? 'DESACTIVACION' : 'ACTUALIZACION',
      id_usuario_interno: req.user.id_usuario,
      id_ubicacion: id,
      detalle_key: nuevoEstado === 0
        ? 'audits.assets.locationDeactivated'
        : 'audits.assets.locationActivated',
      detalle_meta: { nuevoEstado }
    });

    return sendOk(res, {
      status: 200,
      message: nuevoEstado === 1
        ? 'success.locations.activated'
        : 'success.locations.deactivated',
      data: null
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: 'errors.locations.stateUpdateFailed'
    });
  }
});

module.exports = router;
