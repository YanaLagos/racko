const db = require("../config/db");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isValidDateYYYYMMDD(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function buildWhere({ usuario, rut, recurso, dia, desde, hasta, modo }) {
  const where = [];
  const params = [];

  if (isNonEmptyString(usuario)) {
    const q = `%${usuario.trim()}%`;
    where.push(
      "(ue.nombre LIKE ? OR ue.apellido LIKE ? OR CONCAT(ue.nombre,' ',ue.apellido) LIKE ?)",
    );
    params.push(q, q, q);
  }

  if (isNonEmptyString(rut)) {
    where.push("TRIM(p.rut_usuario) = TRIM(?)");
    params.push(rut.trim());
  }

  if (isNonEmptyString(recurso)) {
    where.push("r.nombre LIKE ?");
    params.push(`%${recurso.trim()}%`);
  }

  // día exacto del PRÉSTAMO
  if (isNonEmptyString(dia)) {
    if (!isValidDateYYYYMMDD(dia))
      return { error: "errors.validation.invalidFromDate" };
    where.push("DATE(p.fecha_prestamo) = ?");
    params.push(dia);
  }

  // rango de FECHA PRÉSTAMO (desde/hasta)
  if (isNonEmptyString(desde)) {
    if (!isValidDateYYYYMMDD(desde))
      return { error: "errors.validation.invalidFromDate" };
    where.push("p.fecha_prestamo >= ?");
    params.push(`${desde} 00:00:00`);
  }
  if (isNonEmptyString(hasta)) {
    if (!isValidDateYYYYMMDD(hasta))
      return { error: "errors.validation.invalidToDate" };
    where.push("p.fecha_prestamo <= ?");
    params.push(`${hasta} 23:59:59`);
  }

  const m = String(modo || "en_curso").toLowerCase();

  if (m !== "frecuencia") {
    if (m === "en_curso") {
      where.push("p.fecha_devolucion IS NULL");
    } else if (m === "proximos_venc") {
      where.push("p.fecha_devolucion IS NULL");
      where.push("p.fecha_vencimiento IS NOT NULL");
      where.push(
        "DATE(p.fecha_vencimiento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)",
      );
    } else if (m === "atrasados") {
      where.push("p.fecha_devolucion IS NULL");
      where.push("p.fecha_vencimiento IS NOT NULL");
      where.push(
        "DATE(p.fecha_vencimiento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)",
      );
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { whereSql, params };
}

function safeInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function buildOrder(sortKey, sortDir) {
  const dir =
    String(sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

  const map = {
    id_prestamo: "p.id_prestamo",
    nombre_recurso: "r.nombre",
    prestado_a: "ue.apellido",
    rut_usuario: "p.rut_usuario",
    fecha_prestamo: "p.fecha_prestamo",
    fecha_devolucion: "p.fecha_devolucion",
    fecha_vencimiento: "p.fecha_vencimiento",
    registrado_por: "ui.apellido",
  };

  const col = map[sortKey] || "p.fecha_prestamo";
  return `ORDER BY ${col} ${dir}, p.id_prestamo DESC`;
}

/* Frecuencia */
async function listarPrestamosPorFrecuencia({
  filtros = {},
  page = 1,
  limit = 25,
}) {
  const pageNum = Math.max(1, safeInt(page, 1));
  const limitNum = Math.min(200, Math.max(1, safeInt(limit, 25)));
  const offset = (pageNum - 1) * limitNum;

  const built = buildWhere({ ...filtros, modo: "frecuencia" });
  if (built.error) return { ok: false, status: 400, error: built.error };

  const { whereSql, params } = built;

  const query = `
    WITH base AS (
      SELECT
        p.id_prestamo,
        p.id_recurso,
        r.id_categoria, 
        r.nombre AS nombre_recurso,
        CONCAT(ue.nombre, ' ', ue.apellido) AS prestado_a,
        p.rut_usuario,
        p.fecha_prestamo,
        p.fecha_devolucion,
        p.fecha_vencimiento,
        CONCAT(ui.nombre, ' ', ui.apellido) AS registrado_por,
        p.observaciones,
        r.uso_acumulado AS frecuencia,
        ROW_NUMBER() OVER (
          PARTITION BY p.id_recurso
          ORDER BY p.fecha_prestamo DESC, p.id_prestamo DESC
        ) AS rn
      FROM registro_prestamo p
      LEFT JOIN usuario_externo ue ON TRIM(ue.rut) = TRIM(p.rut_usuario)
      LEFT JOIN recurso_fisico r ON r.id_recurso = p.id_recurso
      LEFT JOIN usuario_interno ui ON ui.id_usuario = p.id_usuario_interno
      ${whereSql}
    )
    SELECT
      id_prestamo,
      id_recurso,
      id_categoria,
      nombre_recurso,
      prestado_a,
      rut_usuario,
      fecha_prestamo,
      fecha_devolucion,
      fecha_vencimiento,
      registrado_por,
      observaciones,
      frecuencia
    FROM base
    WHERE rn = 1
    ORDER BY frecuencia DESC, fecha_prestamo DESC, id_prestamo DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(DISTINCT p.id_recurso) AS total
    FROM registro_prestamo p
    LEFT JOIN usuario_externo ue ON TRIM(ue.rut) = TRIM(p.rut_usuario)
    LEFT JOIN recurso_fisico r ON r.id_recurso = p.id_recurso
    LEFT JOIN usuario_interno ui ON ui.id_usuario = p.id_usuario_interno
    ${whereSql}
  `;

  const [rows] = await db.query(query, [...params, limitNum, offset]);
  const [countRows] = await db.query(countQuery, params);
  const total = countRows?.[0]?.total ?? 0;

  return {
    ok: true,
    status: 200,
    data: rows,
    meta: { page: pageNum, limit: limitNum, total },
  };
}

async function obtenerPrestamosPorFrecuenciaParaReporte({
  filtros = {},
  maxRows = 1000,
}) {
  const built = buildWhere({ ...filtros, modo: "frecuencia" });
  if (built.error) return { ok: false, status: 400, error: built.error };

  const { whereSql, params } = built;

  const query = `
    WITH base AS (
      SELECT
        p.id_prestamo,
        p.id_recurso,
        id_categoria,
        r.nombre AS nombre_recurso,
        CONCAT(ue.nombre, ' ', ue.apellido) AS prestado_a,
        p.rut_usuario,
        p.fecha_prestamo,
        p.fecha_devolucion,
        p.fecha_vencimiento,
        CONCAT(ui.nombre, ' ', ui.apellido) AS registrado_por,
        p.observaciones,
        r.uso_acumulado AS frecuencia,
        ROW_NUMBER() OVER (
          PARTITION BY p.id_recurso
          ORDER BY p.fecha_prestamo DESC, p.id_prestamo DESC
        ) AS rn
      FROM registro_prestamo p
      LEFT JOIN usuario_externo ue ON TRIM(ue.rut) = TRIM(p.rut_usuario)
      LEFT JOIN recurso_fisico r ON r.id_recurso = p.id_recurso
      LEFT JOIN usuario_interno ui ON ui.id_usuario = p.id_usuario_interno
      ${whereSql}
    )
    SELECT
      id_prestamo,
      id_recurso,
      id_categoria,
      nombre_recurso,
      prestado_a,
      rut_usuario,
      fecha_prestamo,
      fecha_devolucion,
      fecha_vencimiento,
      registrado_por,
      observaciones,
      frecuencia
    FROM base
    WHERE rn = 1
    ORDER BY frecuencia DESC, fecha_prestamo DESC, id_prestamo DESC
    LIMIT ?
  `;

  const [rows] = await db.query(query, [...params, Number(maxRows)]);
  return { ok: true, status: 200, data: rows };
}

async function listarPrestamos({
  filtros = {},
  page = 1,
  limit = 25,
  sortKey,
  sortDir,
}) {
  if (String(filtros?.modo || "").toLowerCase() === "frecuencia") {
    return listarPrestamosPorFrecuencia({ filtros, page, limit });
  }

  const pageNum = Math.max(1, safeInt(page, 1));
  const limitNum = Math.min(200, Math.max(1, safeInt(limit, 25)));
  const offset = (pageNum - 1) * limitNum;

  const built = buildWhere(filtros);
  if (built.error) return { ok: false, status: 400, error: built.error };

  const { whereSql, params } = built;
  const orderSql = buildOrder(sortKey, sortDir);

  const query = `
    SELECT
      p.id_prestamo,
      p.id_recurso,
      r.id_categoria, 
      r.nombre AS nombre_recurso,
      CONCAT(ue.nombre, ' ', ue.apellido) AS prestado_a,
      p.rut_usuario,
      p.fecha_prestamo,
      p.fecha_devolucion,
      p.fecha_vencimiento,
      CONCAT(ui.nombre, ' ', ui.apellido) AS registrado_por,
      p.observaciones
    FROM registro_prestamo p
    LEFT JOIN usuario_externo ue ON TRIM(ue.rut) = TRIM(p.rut_usuario)
    LEFT JOIN recurso_fisico r ON r.id_recurso = p.id_recurso
    LEFT JOIN usuario_interno ui ON ui.id_usuario = p.id_usuario_interno
    ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM registro_prestamo p
    LEFT JOIN usuario_externo ue ON TRIM(ue.rut) = TRIM(p.rut_usuario)
    LEFT JOIN recurso_fisico r ON r.id_recurso = p.id_recurso
    LEFT JOIN usuario_interno ui ON ui.id_usuario = p.id_usuario_interno
    ${whereSql}
  `;

  const [rows] = await db.query(query, [...params, limitNum, offset]);
  const [countRows] = await db.query(countQuery, params);
  const total = countRows?.[0]?.total ?? 0;

  return {
    ok: true,
    status: 200,
    data: rows,
    meta: { page: pageNum, limit: limitNum, total },
  };
}

async function obtenerPrestamosParaReporte({
  filtros = {},
  maxRows = 1000,
  sortKey,
  sortDir,
}) {
  if (String(filtros?.modo || "").toLowerCase() === "frecuencia") {
    return obtenerPrestamosPorFrecuenciaParaReporte({ filtros, maxRows });
  }

  const built = buildWhere(filtros);
  if (built.error) return { ok: false, status: 400, error: built.error };

  const { whereSql, params } = built;
  const orderSql = buildOrder(sortKey, sortDir);

  const query = `
  SELECT
    p.id_prestamo,
    p.id_recurso AS id_recurso,
    r.id_categoria AS id_categoria, 
    r.nombre AS nombre_recurso,
    CONCAT(ue.nombre, ' ', ue.apellido) AS prestado_a,
    p.rut_usuario,
    p.fecha_prestamo,
    p.fecha_devolucion,
    p.fecha_vencimiento,
    CONCAT(ui.nombre, ' ', ui.apellido) AS registrado_por,
    p.observaciones
  FROM registro_prestamo p
  LEFT JOIN usuario_externo ue ON TRIM(ue.rut) = TRIM(p.rut_usuario)
  LEFT JOIN recurso_fisico r ON r.id_recurso = p.id_recurso
  LEFT JOIN usuario_interno ui ON ui.id_usuario = p.id_usuario_interno
  ${whereSql}
  ${orderSql}
  LIMIT ?
`;

  const [rows] = await db.query(query, [...params, Number(maxRows)]);
  return { ok: true, status: 200, data: rows };
}

module.exports = {
  listarPrestamos,
  obtenerPrestamosParaReporte,
  listarPrestamosPorFrecuencia,
  obtenerPrestamosPorFrecuenciaParaReporte,
};
