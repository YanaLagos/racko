const db = require("../config/db");

function encodeDetalle(key, meta = {}) {
  const cleanKey = String(key || "").trim() || "audit.unknown";
  const parts = [cleanKey];

  if (meta && typeof meta === "object") {
    for (const [k, v] of Object.entries(meta)) {
      if (v === undefined) continue;

      const kk = String(k).replaceAll("|", "").replaceAll("=", "").trim();
      const vv = String(v).replaceAll("|", "").replaceAll("\n", " ").trim();

      if (kk.length) parts.push(`${kk}=${vv}`);
    }
  }

  return parts.join("|");
}

async function registrarEvento(
  executor,
  {
    tipo_evento,
    id_usuario_interno = null,
    rut_usuario_externo = null,
    id_recurso = null,
    id_registro_prestamo = null,
    id_categoria = null,
    id_ubicacion = null,

    detalle = null,

    detalle_key = null,
    detalle_meta = null,
  }
) {
  const finalDetalle = detalle_key
    ? encodeDetalle(detalle_key, detalle_meta || {})
    : detalle;

  const q = `
    INSERT INTO auditoria_evento
      (tipo_evento, id_usuario_interno, rut_usuario_externo, id_recurso, id_registro_prestamo, id_categoria, id_ubicacion, detalle)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await executor.query(q, [
    tipo_evento,
    id_usuario_interno,
    rut_usuario_externo,
    id_recurso,
    id_registro_prestamo,
    id_categoria,
    id_ubicacion,
    finalDetalle,
  ]);
}

function buildWhere(filtros = {}) {
  const {
    tipo_evento,
    desde,
    hasta,
    id_usuario_interno,
    usuario,
    rut_usuario_externo,
    id_recurso,
    id_registro_prestamo,
    id_categoria,
    id_ubicacion,
    q,
    ref_tipo,
    ref,
  } = filtros;

  const where = [];
  const params = [];

  if (tipo_evento) {
    where.push("a.tipo_evento = ?");
    params.push(tipo_evento);
  }
  if (id_usuario_interno) {
    where.push("a.id_usuario_interno = ?");
    params.push(Number(id_usuario_interno));
  }

  if (usuario) {
    where.push(
      "(LOWER(u.nombre) LIKE ? OR LOWER(u.apellido) LIKE ? OR LOWER(CONCAT(u.nombre,' ',u.apellido)) LIKE ?)"
    );
    const term = `%${String(usuario).toLowerCase()}%`;
    params.push(term, term, term);
  }

  if (rut_usuario_externo) {
    where.push("a.rut_usuario_externo = ?");
    params.push(rut_usuario_externo);
  }
  if (id_recurso) {
    where.push("a.id_recurso = ?");
    params.push(Number(id_recurso));
  }
  if (id_registro_prestamo) {
    where.push("a.id_registro_prestamo = ?");
    params.push(Number(id_registro_prestamo));
  }
  if (id_categoria) {
    where.push("a.id_categoria = ?");
    params.push(Number(id_categoria));
  }
  if (id_ubicacion) {
    where.push("a.id_ubicacion = ?");
    params.push(Number(id_ubicacion));
  }

  if (desde) {
    where.push("a.fecha_hora >= ?");
    params.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    where.push("a.fecha_hora <= ?");
    params.push(`${hasta} 23:59:59`);
  }

  if (q) {
    where.push("a.detalle LIKE ?");
    params.push(`%${q}%`);
  }

  if (ref_tipo && ref) {
    const refTrim = String(ref).trim();
    const isDigitsOnly = /^\d+$/.test(refTrim);

    if (ref_tipo === "recurso") {
      if (isDigitsOnly) {
        where.push("a.id_recurso = ?");
        params.push(Number(refTrim));
      } else {
        where.push("LOWER(r.nombre) LIKE ?");
        params.push(`%${refTrim.toLowerCase()}%`);
      }
    }

    if (ref_tipo === "categoria") {
      if (isDigitsOnly) {
        where.push("a.id_categoria = ?");
        params.push(Number(refTrim));
      } else {
        where.push("LOWER(c.nombre) LIKE ?");
        params.push(`%${refTrim.toLowerCase()}%`);
      }
    }

    if (ref_tipo === "ubicacion") {
      if (isDigitsOnly) {
        where.push("a.id_ubicacion = ?");
        params.push(Number(refTrim));
      } else {
        where.push("LOWER(ub.nombre) LIKE ?");
        params.push(`%${refTrim.toLowerCase()}%`);
      }
    }

    if (ref_tipo === "prestamo") {
      if (isDigitsOnly) {
        where.push("a.id_registro_prestamo = ?");
        params.push(Number(refTrim));
      } else {
        where.push("1 = 0");
      }
    }

    if (ref_tipo === "externo") {
      const rutNorm = refTrim
        .toUpperCase()
        .replace(/\./g, "")
        .replace(/\s+/g, "");
      const rutLooksLike =
        /^[0-9K]+-?[0-9K]$/.test(rutNorm) || rutNorm.length >= 7;

      const hasLetters = /[A-Z]/i.test(refTrim);

      if (!hasLetters) {
        where.push("a.rut_usuario_externo = ?");
        params.push(rutNorm);
      } else {
        where.push(
          "(LOWER(ue.nombre) LIKE ? OR LOWER(ue.apellido) LIKE ? OR LOWER(CONCAT(ue.nombre,' ',ue.apellido)) LIKE ?)"
        );
        const term = `%${refTrim.toLowerCase()}%`;
        params.push(term, term, term);
      }
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { whereSql, params };
}

async function listarMovimientos({
  filtros = {},
  page = 1,
  limit = 25,
  sortDir = "desc",
}) {
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  const dir =
    String(sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

  const { whereSql, params } = buildWhere(filtros);

  const query = `
    SELECT
      a.id_evento,
      a.tipo_evento,
      a.fecha_hora,
      a.id_usuario_interno,
      u.nombre AS nombre_usuario,
      u.apellido AS apellido_usuario,

      a.rut_usuario_externo,
      ue.nombre AS nombre_externo,
      ue.apellido AS apellido_externo,

      a.id_recurso,
      r.nombre AS nombre_recurso,

      a.id_registro_prestamo,

      a.id_categoria,
      c.nombre AS nombre_categoria,

      a.id_ubicacion,
      ub.nombre AS nombre_ubicacion,

      a.detalle
    FROM auditoria_evento a
    LEFT JOIN usuario_interno u ON u.id_usuario = a.id_usuario_interno
    LEFT JOIN recurso_fisico r ON r.id_recurso = a.id_recurso
    LEFT JOIN categoria c ON c.id_categoria = a.id_categoria
    LEFT JOIN ubicacion ub ON ub.id_ubicacion = a.id_ubicacion
    LEFT JOIN usuario_externo ue ON ue.rut = a.rut_usuario_externo
    ${whereSql}
    ORDER BY a.fecha_hora ${dir}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM auditoria_evento a
    LEFT JOIN usuario_interno u ON u.id_usuario = a.id_usuario_interno
    LEFT JOIN recurso_fisico r ON r.id_recurso = a.id_recurso
    LEFT JOIN categoria c ON c.id_categoria = a.id_categoria
    LEFT JOIN ubicacion ub ON ub.id_ubicacion = a.id_ubicacion
    LEFT JOIN usuario_externo ue ON ue.rut = a.rut_usuario_externo
    ${whereSql}
  `;

  const [rows] = await db.query(query, [...params, limitNum, offset]);
  const [countRows] = await db.query(countQuery, params);
  const total = countRows?.[0]?.total ?? 0;

  return { page: pageNum, limit: limitNum, total, rows };
}

async function obtenerMovimientosParaReporte({
  filtros = {},
  maxRows = 1000,
  sortDir = "desc",
}) {
  const dir =
    String(sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const { whereSql, params } = buildWhere(filtros);

  const query = `
    SELECT
      a.id_evento,
      a.tipo_evento,
      a.fecha_hora,

      u.nombre AS nombre_usuario,
      u.apellido AS apellido_usuario,

      a.rut_usuario_externo,
      ue.nombre AS nombre_externo,
      ue.apellido AS apellido_externo,

      a.id_recurso,
      r.nombre AS nombre_recurso,

      a.id_registro_prestamo,

      a.id_categoria,
      c.nombre AS nombre_categoria,

      a.id_ubicacion,
      ub.nombre AS nombre_ubicacion,

      a.detalle
    FROM auditoria_evento a
    LEFT JOIN usuario_interno u ON u.id_usuario = a.id_usuario_interno
    LEFT JOIN recurso_fisico r ON r.id_recurso = a.id_recurso
    LEFT JOIN categoria c ON c.id_categoria = a.id_categoria
    LEFT JOIN ubicacion ub ON ub.id_ubicacion = a.id_ubicacion
    LEFT JOIN usuario_externo ue ON ue.rut = a.rut_usuario_externo
    ${whereSql}
    ORDER BY a.fecha_hora ${dir}
    LIMIT ?
  `;

  const [rows] = await db.query(query, [...params, Number(maxRows)]);
  return rows;
}

module.exports = {
  registrarEvento,
  listarMovimientos,
  obtenerMovimientosParaReporte,
  encodeDetalle,
};
