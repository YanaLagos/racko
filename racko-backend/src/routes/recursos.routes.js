const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verificarToken, esAdmin } = require("../middlewares/auth.middleware");
const { sendOk, sendError } = require("../utils/http");
const { registrarEvento } = require("../services/auditoria.service");

function toPositiveInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

// Listar recursos por categoría + préstamo activo
router.get("/categoria/:id_categoria", verificarToken, async (req, res) => {
  const idCat = toPositiveInt(req.params.id_categoria);
  if (Number.isNaN(idCat)) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidCategoryId",
    });
  }

  try {
    const estadoQ = req.query.estado;
    const isAdminUser = Number(req.user?.id_rol) === 1;

    // colaborador: solo activos
    let whereEstado = "AND r.estado = 1";
    if (isAdminUser) {
      if (estadoQ === "1") whereEstado = "AND r.estado = 1";
      else if (estadoQ === "0") whereEstado = "AND r.estado = 0";
      else whereEstado = "";
    }

    const query = `
      SELECT 
        r.id_recurso,
        r.nombre,
        r.id_categoria,
        c.nombre AS nombre_categoria,
        r.id_ubicacion,
        u.nombre AS nombre_ubicacion,
        r.descripcion,
        r.disponible,
        r.uso_acumulado,
        r.estado,
        r.fecha_desactivacion,

        p.id_prestamo AS id_prestamo_activo,
        p.fecha_prestamo,
        p.fecha_vencimiento,
        p.rut_usuario,
        p.observaciones,
        CONCAT(ue.nombre, ' ', ue.apellido) AS prestado_a

      FROM recurso_fisico r
      LEFT JOIN categoria c
        ON c.id_categoria = r.id_categoria
      LEFT JOIN ubicacion u
        ON u.id_ubicacion = r.id_ubicacion
      LEFT JOIN registro_prestamo p
        ON p.id_recurso = r.id_recurso
        AND p.fecha_devolucion IS NULL
      LEFT JOIN usuario_externo ue
        ON TRIM(ue.rut) = TRIM(p.rut_usuario)
      WHERE r.id_categoria = ?
      ${whereEstado}
      ORDER BY r.estado DESC, r.nombre ASC
    `;

    const [rows] = await db.query(query, [idCat]);

    return sendOk(res, {
      status: 200,
      message: "success.resources.fetched",
      data: rows,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.resources.fetchFailed",
    });
  }
});

// Listar recursos
router.get("/", verificarToken, async (req, res) => {
  try {
    const estadoQ = req.query.estado;
    const isAdminUser = Number(req.user?.id_rol) === 1;

    // colaborador
    let whereSql = "WHERE r.estado = 1";
    const params = [];

    // Admin
    if (isAdminUser) {
      if (estadoQ === "1") {
        whereSql = "WHERE r.estado = 1";
      } else if (estadoQ === "0") {
        whereSql = "WHERE r.estado = 0";
      } else {
        whereSql = "";
      }
    }

    const query = `
      SELECT 
        r.id_recurso,
        r.nombre,
        r.id_categoria,
        r.id_ubicacion,
        r.descripcion,
        r.disponible,
        r.uso_acumulado,
        r.estado,
        r.fecha_desactivacion,
        p.id_prestamo AS id_prestamo_activo
      FROM recurso_fisico r
      LEFT JOIN registro_prestamo p 
        ON r.id_recurso = p.id_recurso
        AND p.fecha_devolucion IS NULL
      ${whereSql}
      ORDER BY r.estado DESC, r.nombre ASC
    `;

    const [rows] = await db.query(query, params);

    return sendOk(res, {
      status: 200,
      message: "success.resources.fetched",
      data: rows,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.resources.fetchFailed",
    });
  }
});

// Crear recursos
router.post("/", verificarToken, esAdmin, async (req, res) => {
  const { nombre, id_categoria, id_ubicacion, descripcion, disponible } =
    req.body;
  const id_admin = req.user.id_usuario;

  if (!nombre || !id_categoria || !id_ubicacion) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.requiredFields",
    });
  }

  const idCategoria = toPositiveInt(id_categoria);
  const idUbicacion = toPositiveInt(id_ubicacion);

  if (Number.isNaN(idCategoria) || Number.isNaN(idUbicacion)) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidForeignKey",
    });
  }

  try {
    const disponibleBool =
      disponible === undefined || disponible === null
        ? 1
        : disponible === true || disponible === 1 || disponible === "1"
          ? 1
          : 0;

    const [catRows] = await db.query(
      `SELECT id_categoria FROM categoria WHERE id_categoria = ? AND estado = 1`,
      [idCategoria],
    );

    if (catRows.length === 0) {
      return sendError(res, {
        status: 404,
        error: "errors.categories.notFound",
      });
    }

    const [ubiRows] = await db.query(
      `SELECT id_ubicacion FROM ubicacion WHERE id_ubicacion = ? AND estado = 1`,
      [idUbicacion],
    );

    if (ubiRows.length === 0) {
      return sendError(res, {
        status: 404,
        error: "errors.locations.notFound",
      });
    }

    const [existe] = await db.query(
      `SELECT id_recurso
       FROM recurso_fisico
       WHERE nombre = ?
         AND id_ubicacion = ?
         AND estado = 1`,
      [nombre.trim(), idUbicacion],
    );

    if (existe.length > 0) {
      return sendError(res, {
        status: 400,
        error: "errors.resources.alreadyExists",
      });
    }

    const [result] = await db.query(
      `INSERT INTO recurso_fisico
        (nombre, id_categoria, id_ubicacion, descripcion, disponible, uso_acumulado, estado)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        nombre.trim(),
        idCategoria,
        idUbicacion,
        descripcion ?? null,
        disponibleBool,
        0,
      ],
    );

    const id_recurso = result.insertId;

    await registrarEvento(db, {
      tipo_evento: "CREACION",
      id_usuario_interno: id_admin,
      id_recurso,
      detalle_key: "audits.assets.resourceCreated",
      detalle_meta: { nombre: nombre.trim() },
    });

    return sendOk(res, {
      status: 201,
      message: "success.resources.created",
      data: { id_recurso },
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.resources.createFailed",
    });
  }
});

// ACtualizar
router.put("/:id", verificarToken, esAdmin, async (req, res) => {
  const idNum = toPositiveInt(req.params.id);
  const { nombre, id_categoria, id_ubicacion, descripcion, disponible } =
    req.body;

  if (Number.isNaN(idNum) || !nombre || !id_categoria || !id_ubicacion) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.requiredFields",
    });
  }

  const idCategoria = toPositiveInt(id_categoria);
  const idUbicacion = toPositiveInt(id_ubicacion);

  if (Number.isNaN(idCategoria) || Number.isNaN(idUbicacion)) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidForeignKey",
    });
  }

  const disponibleBool =
    disponible === undefined || disponible === null
      ? null
      : disponible === true || disponible === 1 || disponible === "1"
        ? 1
        : 0;

  try {
    const afterNombre = nombre.trim();

    const [existe] = await db.query(
      `SELECT id_recurso
   FROM recurso_fisico
   WHERE nombre = ?
     AND id_ubicacion = ?
     AND estado = 1
     AND id_recurso <> ?`,
      [afterNombre, idUbicacion, idNum],
    );

    if (existe.length > 0) {
      return sendError(res, {
        status: 400,
        error: "errors.resources.alreadyExists",
      });
    }

    const [beforeRows] = await db.query(
      `SELECT nombre, id_categoria, id_ubicacion, descripcion, disponible
       FROM recurso_fisico
       WHERE id_recurso = ?`,
      [idNum],
    );

    if (beforeRows.length === 0) {
      return sendError(res, {
        status: 404,
        error: "errors.resources.notFound",
      });
    }

    const before = beforeRows[0];

    if (disponibleBool === null) {
      await db.query(
        `UPDATE recurso_fisico
         SET nombre = ?, id_categoria = ?, id_ubicacion = ?, descripcion = ?
         WHERE id_recurso = ?`,
        [nombre.trim(), idCategoria, idUbicacion, descripcion || null, idNum],
      );
    } else {
      await db.query(
        `UPDATE recurso_fisico
         SET nombre = ?, id_categoria = ?, id_ubicacion = ?, descripcion = ?, disponible = ?
         WHERE id_recurso = ?`,
        [
          nombre.trim(),
          idCategoria,
          idUbicacion,
          descripcion || null,
          disponibleBool,
          idNum,
        ],
      );
    }

    const changed = [];
    if (before.nombre !== nombre.trim()) changed.push("nombre");
    if (before.id_categoria !== idCategoria) changed.push("id_categoria");
    if (before.id_ubicacion !== idUbicacion) changed.push("id_ubicacion");
    if ((before.descripcion ?? null) !== (descripcion || null))
      changed.push("descripcion");
    if (disponibleBool !== null && before.disponible !== disponibleBool)
      changed.push("disponible");

    if (changed.length > 0) {
      await registrarEvento(db, {
        tipo_evento: "ACTUALIZACION",
        id_usuario_interno: req.user.id_usuario,
        id_recurso: idNum,
        detalle_key: "audits.assets.resourceUpdated",
        detalle_meta: { fields: changed.join(",") },
      });
    }

    return sendOk(res, {
      status: 200,
      message: "success.resources.updated",
      data: null,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.resources.updateFailed",
    });
  }
});

// Activar o desactivar recurso
router.patch("/:id/estado", verificarToken, esAdmin, async (req, res) => {
  const idNum = toPositiveInt(req.params.id);
  const { nuevoEstado } = req.body;

  if (Number.isNaN(idNum) || (nuevoEstado !== 0 && nuevoEstado !== 1)) {
    return sendError(res, {
      status: 400,
      error: "errors.validation.invalidState",
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE recurso_fisico
       SET estado = ?,
           fecha_desactivacion = ?
       WHERE id_recurso = ?`,
      [nuevoEstado, nuevoEstado === 0 ? new Date() : null, idNum],
    );

    if (result.affectedRows === 0) {
      return sendError(res, {
        status: 404,
        error: "errors.resources.notFound",
      });
    }

    await registrarEvento(db, {
      tipo_evento: nuevoEstado === 0 ? "DESACTIVACION" : "ACTUALIZACION",
      id_usuario_interno: req.user.id_usuario,
      id_recurso: idNum,
      detalle_key:
        nuevoEstado === 0
          ? "audits.assets.resourceDeactivated"
          : "audits.assets.resourceActivated",
      detalle_meta: { nuevoEstado },
    });

    return sendOk(res, {
      status: 200,
      message:
        nuevoEstado === 1
          ? "success.resources.activated"
          : "success.resources.deactivated",
      data: null,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      error: "errors.resources.stateUpdateFailed",
    });
  }
});

module.exports = router;
