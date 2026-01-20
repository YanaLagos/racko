const db = require("../config/db");
const { registrarEvento } = require("./auditoria.service");
const { calcularRiesgoRetraso } = require("./predictivo.service");
const { normalizeRut, isValidRut } = require("../utils/rut");

// Helpers

function calcularDeltaReputacion(diasAtraso) {
  if (diasAtraso === 0) return 0.1;

  const penalizacionInicial = 0.5;
  let penalizacionExtra = 0;

  if (diasAtraso > 3) {
    penalizacionExtra = (diasAtraso - 3) * 0.1;
  }

  return -(penalizacionInicial + penalizacionExtra);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Prestar
async function prestar({
  id_usuario_interno,
  rut_usuario_ext,
  id_recurso,
  fecha_vencimiento = null,
  observaciones = null,
}) {
  let conn;

  try {
    const rutNorm = normalizeRut(rut_usuario_ext);
    if (!rutNorm || !isValidRut(rutNorm)) {
      return { ok: false, status: 400, error: "errors.validation.invalidRut" };
    }

    if (!id_usuario_interno || !id_recurso) {
      return {
        ok: false,
        status: 400,
        error: "errors.validation.requiredFields",
      };
    }

    conn = await db.getConnection();
    await conn.beginTransaction();

    const [recursoRows] = await conn.query(
      "SELECT disponible FROM recurso_fisico WHERE id_recurso = ? FOR UPDATE",
      [id_recurso]
    );

    if (recursoRows.length === 0) {
      await conn.rollback();
      return { ok: false, status: 404, error: "errors.resources.notFound" };
    }

    if (!recursoRows[0].disponible) {
      await conn.rollback();
      return {
        ok: false,
        status: 400,
        error: "errors.resources.alreadyLoaned",
      };
    }

    const [insertResult] = await conn.query(
      `
      INSERT INTO registro_prestamo
        (rut_usuario, id_recurso, id_usuario_interno, fecha_prestamo, fecha_vencimiento, observaciones)
      VALUES (?, ?, ?, NOW(), ?, ?)
      `,
      [
        rutNorm,
        id_recurso,
        id_usuario_interno,
        fecha_vencimiento,
        observaciones,
      ]
    );

    const id_prestamo = insertResult.insertId;

    const riesgo_retraso = await calcularRiesgoRetraso(conn, rutNorm, 10);

    await conn.query(
      "UPDATE recurso_fisico SET disponible = 0, uso_acumulado = uso_acumulado + 1 WHERE id_recurso = ?",
      [id_recurso]
    );

    await registrarEvento(conn, {
      tipo_evento: "CREACION",
      id_usuario_interno,
      rut_usuario_externo: rutNorm,
      id_recurso,
      id_registro_prestamo: id_prestamo,
      detalle_key: "audits.assets.loanCreated",
      detalle_meta: { id_prestamo },
    });

    await conn.commit();

    return {
      ok: true,
      status: 201,
      message: "success.loans.registered",
      data: { id_prestamo, riesgo_retraso },
    };
  } catch (error) {
    if (conn) await conn.rollback();
    console.error(error);
    return { ok: false, status: 500, error: "errors.server.internal" };
  } finally {
    if (conn) conn.release();
  }
}

// Devolver
async function devolver({ id_usuario_interno, id_prestamo }) {
  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [prestamoRows] = await conn.query(
      `
      SELECT id_recurso, rut_usuario, fecha_devolucion, fecha_vencimiento
      FROM registro_prestamo
      WHERE id_prestamo = ?
      FOR UPDATE
      `,
      [id_prestamo]
    );

    if (prestamoRows.length === 0) {
      await conn.rollback();
      return { ok: false, status: 404, error: "errors.loans.notFound" };
    }

    if (prestamoRows[0].fecha_devolucion !== null) {
      await conn.rollback();
      return { ok: false, status: 400, error: "errors.loans.alreadyReturned" };
    }

    const { id_recurso, rut_usuario, fecha_vencimiento } = prestamoRows[0];

    await conn.query(
      "UPDATE registro_prestamo SET fecha_devolucion = NOW() WHERE id_prestamo = ?",
      [id_prestamo]
    );

    await conn.query(
      "UPDATE recurso_fisico SET disponible = 1 WHERE id_recurso = ?",
      [id_recurso]
    );

    // Reputación usuario externo
    if (fecha_vencimiento) {
      const [diffRows] = await conn.query(
        "SELECT DATEDIFF(NOW(), ?) AS diasAtraso",
        [fecha_vencimiento]
      );

      let diasAtraso = Number(diffRows[0].diasAtraso || 0);
      if (diasAtraso < 0) diasAtraso = 0;

      const delta = calcularDeltaReputacion(diasAtraso);

      const [repRows] = await conn.query(
        "SELECT reputacion FROM usuario_externo WHERE rut = ? FOR UPDATE",
        [rut_usuario]
      );

      if (repRows.length > 0) {
        const repActual = Number(repRows[0].reputacion ?? 10.0); 
        const repNueva = clamp(repActual + delta, 0, 10);

        await conn.query(
          "UPDATE usuario_externo SET reputacion = ? WHERE rut = ?",
          [repNueva, rut_usuario]
        );

        await registrarEvento(conn, {
          tipo_evento: "ACTUALIZACION",
          id_usuario_interno,
          rut_usuario_externo: rut_usuario,
          detalle_key: "audits.externalUsers.reputationUpdated",
          detalle_meta: { delta, diasAtraso, nueva: repNueva },
        });
      }
    }

    await registrarEvento(conn, {
      tipo_evento: "ACTUALIZACION",
      id_usuario_interno,
      rut_usuario_externo: rut_usuario,
      id_recurso,
      id_registro_prestamo: id_prestamo,
      detalle_key: "audits.assets.loanReturned",
      detalle_meta: { id_prestamo },
    });

    await conn.commit();

    return {
      ok: true,
      status: 200,
      message: "success.loans.returned",
      data: null,
    };
  } catch (error) {
    if (conn) await conn.rollback();
    console.error(error);
    return { ok: false, status: 500, error: "errors.server.internal" };
  } finally {
    if (conn) conn.release();
  }
}

// Actualizar observaciones
async function actualizarObservaciones({
  id_usuario_interno,
  id_prestamo,
  observaciones,
}) {
  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [prestamoRows] = await conn.query(
      "SELECT rut_usuario, id_recurso FROM registro_prestamo WHERE id_prestamo = ? FOR UPDATE",
      [id_prestamo]
    );

    if (prestamoRows.length === 0) {
      await conn.rollback();
      return { ok: false, status: 404, error: "errors.loans.notFound" };
    }

    const { rut_usuario, id_recurso } = prestamoRows[0];

    await conn.query(
      "UPDATE registro_prestamo SET observaciones = ? WHERE id_prestamo = ?",
      [observaciones, id_prestamo]
    );

    await registrarEvento(conn, {
      tipo_evento: "ACTUALIZACION",
      id_usuario_interno,
      rut_usuario_externo: rut_usuario,
      id_recurso,
      id_registro_prestamo: id_prestamo,
      detalle_key: "audits.assets.observationsUpdated",
      detalle_meta: { id_prestamo },
    });

    await conn.commit();

    return {
      ok: true,
      status: 200,
      message: "success.loans.observationUpdated",
      data: null,
    };
  } catch (error) {
    if (conn) await conn.rollback();
    console.error(error);
    return { ok: false, status: 500, error: "errors.server.internal" };
  } finally {
    if (conn) conn.release();
  }
}

// Historial
async function historial() {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id_prestamo,
        r.nombre AS nombre_recurso,
        p.rut_usuario,
        u.nombre AS funcionario_entrega,
        p.fecha_prestamo,
        p.fecha_devolucion,
        p.fecha_vencimiento,
        p.observaciones
      FROM registro_prestamo p
      JOIN recurso_fisico r ON p.id_recurso = r.id_recurso
      JOIN usuario_interno u ON p.id_usuario_interno = u.id_usuario
      ORDER BY p.fecha_prestamo DESC
    `);

    return {
      ok: true,
      status: 200,
      message: "success.loans.historyFetched",
      data: rows,
    };
  } catch (error) {
    console.error(error);
    return { ok: false, status: 500, error: "errors.reports.fetchFailed" };
  }
}

// Próximos vencimientos - Widget
async function vencimientosWidget() {
  try {
    const [rows] = await db.query(`
      SELECT
        p.fecha_vencimiento,
        r.nombre AS recurso_nombre,
        CONCAT(ue.nombre, ' ', ue.apellido) AS usuario_externo_nombre
      FROM registro_prestamo p
      JOIN recurso_fisico r ON r.id_recurso = p.id_recurso
      JOIN usuario_externo ue ON TRIM(ue.rut) = TRIM(p.rut_usuario)
      WHERE
        p.fecha_devolucion IS NULL
        AND p.fecha_vencimiento IS NOT NULL
        AND DATE(p.fecha_vencimiento) IN (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY))
      ORDER BY p.fecha_vencimiento ASC, r.nombre ASC
    `);

    return {
      ok: true,
      status: 200,
      message: "success.loans.upcomingDueFetched",
      data: rows,
    };
  } catch (error) {
    console.error(error);
    return { ok: false, status: 500, error: "errors.server.internal" };
  }
}

module.exports = {
  prestar,
  devolver,
  actualizarObservaciones,
  historial,
  vencimientosWidget,
};
