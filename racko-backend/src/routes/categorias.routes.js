const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken, esAdmin } = require('../middlewares/auth.middleware');
const { sendOk, sendError } = require('../utils/http');
const { registrarEvento } = require('../services/auditoria.service');

// Listar categorías 
router.get('/', verificarToken, async (req, res) => {
  try {
    const estadoQ = req.query.estado;
    const isAdminUser = Number(req.user?.id_rol) === 1;

    let whereSql = 'WHERE c.estado = 1'; 
    if (isAdminUser) {
      if (estadoQ === '1') whereSql = 'WHERE c.estado = 1';
      else if (estadoQ === '0') whereSql = 'WHERE c.estado = 0';
      else whereSql = ''; 
    }

    const query = `
      SELECT
        c.*,
        u.nombre AS nombre_creador,
        u.apellido AS apellido_creador,
        COUNT(rf.id_recurso) AS recursos_count
      FROM categoria c
      LEFT JOIN usuario_interno u
        ON c.creado_por = u.id_usuario
      LEFT JOIN recurso_fisico rf
        ON rf.id_categoria = c.id_categoria
        AND rf.estado = 1
      ${whereSql}
      GROUP BY c.id_categoria
      ORDER BY c.estado DESC, c.nombre ASC
    `;
    
    const [rows] = await db.query(query);

    return sendOk(res, {
      status: 200,
      message: 'success.categories.fetched',
      data: rows
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: 'errors.categories.fetchFailed' });
  }
});

// Obtener categoría por ID
router.get('/:id', verificarToken, async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return sendError(res, { status: 400, error: 'errors.validation.invalidId' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id_categoria, nombre, descripcion, estado, creado_por, fecha_desactivacion
       FROM categoria
       WHERE id_categoria = ?`,
      [idNum]
    );

    if (rows.length === 0) {
      return sendError(res, { status: 404, error: 'errors.categories.notFound' });
    }

    return sendOk(res, {
      status: 200,
      message: 'success.categories.fetched',
      data: rows[0]
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: 'errors.categories.fetchFailed' });
  }
});


// Crear categoría (admin)
router.post('/', verificarToken, esAdmin, async (req, res) => {
  const { nombre, descripcion } = req.body;
  const id_admin = req.user.id_usuario;

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return sendError(res, { status: 400, error: 'errors.validation.requiredFields' });
  }

  try {
    const [existe] = await db.query(
      `SELECT id_categoria
      FROM categoria
      WHERE nombre = ?
      AND estado = 1`,
      [nombre.trim()]
    );
    
    if (existe.length > 0) {
      return sendError(res, {status: 400, error: 'errors.categories.alreadyExists'});
}
    const [result] = await db.query(
      'INSERT INTO categoria (nombre, descripcion, creado_por) VALUES (?, ?, ?)',
      [nombre.trim(), descripcion || null, id_admin]
    );

    const id_categoria = result.insertId;

    await registrarEvento(db, {
      tipo_evento: 'CREACION',
      id_usuario_interno: id_admin,
      id_categoria,
      detalle_key: 'audits.assets.categoryCreated',
      detalle_meta: { nombre: nombre.trim() }
    });

    return sendOk(res, {
      status: 201,
      message: 'success.categories.created',
      data: { id_categoria }
    });
  } catch (error) {
    console.error(error);

    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, { status: 400, error: 'errors.categories.alreadyExists' });
    }

    return sendError(res, { status: 500, error: 'errors.categories.createFailed' });
  }
});

// Editar categoría (admin)
router.put('/:id', verificarToken, esAdmin, async (req, res) => {
  const idNum = Number(req.params.id);
  const { nombre, descripcion } = req.body;

  if (!Number.isInteger(idNum) || idNum <= 0) {
    return sendError(res, { status: 400, error: 'errors.validation.invalidId' });
  }

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return sendError(res, { status: 400, error: 'errors.validation.requiredFields' });
  }

  try {

    const afterNombre = nombre.trim();
    const afterDescripcion = descripcion || null;

    const [existe] = await db.query(
      `SELECT id_categoria
       FROM categoria
       WHERE nombre = ?
         AND estado = 1
         AND id_categoria <> ?`,
      [afterNombre, idNum]
    );

    if (existe.length > 0) {
      return sendError(res, { status: 400, error: 'errors.categories.alreadyExists' });
    }

    const [beforeRows] = await db.query(
      'SELECT nombre, descripcion FROM categoria WHERE id_categoria = ?',
      [idNum]
    );

    if (beforeRows.length === 0) {
      return sendError(res, { status: 404, error: 'errors.categories.notFound' });
    }

    const before = beforeRows[0];

    await db.query(
      'UPDATE categoria SET nombre = ?, descripcion = ? WHERE id_categoria = ?',
      [afterNombre, afterDescripcion, idNum]
    );

    const changed = [];
    if ((before.nombre ?? '') !== afterNombre) changed.push('nombre');
    if ((before.descripcion ?? null) !== afterDescripcion) changed.push('descripcion');

    if (changed.length > 0) {
      await registrarEvento(db, {
        tipo_evento: 'ACTUALIZACION',
        id_usuario_interno: req.user.id_usuario,
        id_categoria: idNum,
        detalle_key: 'audits.assets.categoryUpdated',
        detalle_meta: { fields: changed.join(',') }
      });
    }

    return sendOk(res, { status: 200, message: 'success.categories.updated', data: null });
  } catch (error) {
    console.error(error);

    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, { status: 400, error: 'errors.categories.alreadyExists' });
    }

    return sendError(res, { status: 500, error: 'errors.categories.updateFailed' });
  }
});

// Activar o desactivar (admin)
router.patch('/:id/estado', verificarToken, esAdmin, async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;

  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return sendError(res, { status: 400, error: 'errors.validation.invalidId' });
  }

  if (nuevoEstado !== 0 && nuevoEstado !== 1) {
    return sendError(res, { status: 400, error: 'errors.validation.invalidState' });
  }

  try {
    const [result] = await db.query(
      'UPDATE categoria SET estado = ? WHERE id_categoria = ?',
      [nuevoEstado, idNum]
    );

    if (result.affectedRows === 0) {
      return sendError(res, { status: 404, error: 'errors.categories.notFound' });
    }

    await registrarEvento(db, {
      tipo_evento: nuevoEstado === 0 ? 'DESACTIVACION' : 'ACTUALIZACION',
      id_usuario_interno: req.user.id_usuario,
      id_categoria: idNum,
      detalle_key: nuevoEstado === 0 ? 'audits.categories.deactivated' : 'audits.assets.categoryActivated',
      detalle_meta: { nuevoEstado }
    });

    const message = nuevoEstado === 1
      ? 'success.categories.activated'
      : 'success.categories.deactivated';

    return sendOk(res, { status: 200, message, data: null });
  } catch (error) {
    console.error(error);
    return sendError(res, { status: 500, error: 'errors.categories.stateUpdateFailed' });
  }
});

module.exports = router;
