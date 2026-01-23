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
  },
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

function parseDetalleParams(detalleStr) {
  const out = {};
  const s = String(detalleStr || "");
  if (!s.includes("|")) return out;

  const [, ...paramsRaw] = s.split("|");
  for (const p of paramsRaw) {
    const [k, v] = p.split("=");
    if (k && v) out[String(k).trim()] = String(v).trim();
  }
  return out;
}

function getAffectedInternalUserIdFromDetalle(detalleStr) {
  const p = parseDetalleParams(detalleStr);
  const tt = String(p.target_tipo || "").toLowerCase();
  if (tt !== "usuario_interno") return null;

  const legacyId = p.id_usuario_afectado || p.id_usuario_creado || null;
  const raw = String(p.target_id ?? legacyId ?? "").trim();
  if (!raw.length) return null;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getAffectedInternalUserNameFromDetalle(detalleStr) {
  const p = parseDetalleParams(detalleStr);
  const nombre = String(p.target_nombre || "").trim();
  const apellido = String(p.target_apellido || "").trim();
  const full = `${nombre} ${apellido}`.trim();
  return full.length ? full : null;
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
      "(LOWER(u.nombre) LIKE ? OR LOWER(u.apellido) LIKE ? OR LOWER(CONCAT(u.nombre,' ',u.apellido)) LIKE ?)",
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
      const hasLetters = /[A-Z]/i.test(refTrim);

      if (!hasLetters) {
        where.push("a.rut_usuario_externo = ?");
        params.push(rutNorm);
      } else {
        where.push(
          "(LOWER(ue.nombre) LIKE ? OR LOWER(ue.apellido) LIKE ? OR LOWER(CONCAT(ue.nombre,' ',ue.apellido)) LIKE ?)",
        );
        const term = `%${refTrim.toLowerCase()}%`;
        params.push(term, term, term);
      }
    }

    if (ref_tipo === "usuario_interno") {
      if (isDigitsOnly) {
        const id = Number(refTrim);
        where.push(
          "(" +
            "(a.detalle LIKE ? AND a.detalle LIKE ?)" +
            " OR a.detalle LIKE ?" +
            " OR a.detalle LIKE ?" +
            ")",
        );
        params.push(
          "%target_tipo=usuario_interno%",
          `%target_id=${id}%`,
          `%id_usuario_afectado=${id}%`,
          `%id_usuario_creado=${id}%`,
        );
      } else {
        const term = `%${refTrim.toLowerCase()}%`;
        where.push(
          "(" +
            "LOWER(a.detalle) LIKE ?" +
            " OR LOWER(a.detalle) LIKE ?" +
            " OR LOWER(a.detalle) LIKE ?" +
            ")",
        );
        params.push(
          `%target_nombre=${refTrim.toLowerCase()}%`,
          `%target_apellido=${refTrim.toLowerCase()}%`,
          term,
        );
      }
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { whereSql, params };
}

function computeRefFromRow(r, targetNameMap) {
  if (r.id_recurso != null) {
    return {
      ref_tipo: "recurso",
      ref_id: r.id_recurso,
      ref_nombre: r.nombre_recurso ?? null,
    };
  }

  if (r.id_categoria != null) {
    return {
      ref_tipo: "categoria",
      ref_id: r.id_categoria,
      ref_nombre: r.nombre_categoria ?? null,
    };
  }

  if (r.id_ubicacion != null) {
    return {
      ref_tipo: "ubicacion",
      ref_id: r.id_ubicacion,
      ref_nombre: r.nombre_ubicacion ?? null,
    };
  }

  if (r.rut_usuario_externo != null) {
    const nom = `${r.nombre_externo || ""} ${r.apellido_externo || ""}`.trim();
    return {
      ref_tipo: "externo",
      ref_id: r.rut_usuario_externo,
      ref_nombre: nom.length ? nom : null,
    };
  }

  if (r.id_registro_prestamo != null) {
    return {
      ref_tipo: "prestamo",
      ref_id: r.id_registro_prestamo,
      ref_nombre: null,
    };
  }

  const tid = getAffectedInternalUserIdFromDetalle(r.detalle);
  if (tid != null) {
    const fromDetalle = getAffectedInternalUserNameFromDetalle(r.detalle);
    const fromDb = targetNameMap?.get(tid) || null;
    const name = fromDetalle || fromDb;

    return {
      ref_tipo: "usuario_interno",
      ref_id: tid,
      ref_nombre: name,
    };
  }

  return { ref_tipo: null, ref_id: null, ref_nombre: null };
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

  const targetIds = [];
  for (const r of rows) {
    if (
      r.rut_usuario_externo != null ||
      r.id_recurso != null ||
      r.id_registro_prestamo != null ||
      r.id_categoria != null ||
      r.id_ubicacion != null
    ) {
      continue;
    }

    const tid = getAffectedInternalUserIdFromDetalle(r.detalle);
    if (tid != null) targetIds.push(tid);
  }

  const uniqTargetIds = [...new Set(targetIds)];
  let targetNameMap = new Map();

  if (uniqTargetIds.length) {
    const [urows] = await db.query(
      `SELECT id_usuario, nombre, apellido
       FROM usuario_interno
       WHERE id_usuario IN (${uniqTargetIds.map(() => "?").join(",")})`,
      uniqTargetIds,
    );

    targetNameMap = new Map(
      urows.map((u) => [
        Number(u.id_usuario),
        `${u.nombre} ${u.apellido || ""}`.trim(),
      ]),
    );
  }

  const finalRows = rows.map((r) => {
    const { ref_tipo, ref_id, ref_nombre } = computeRefFromRow(r, targetNameMap);
    return { ...r, ref_tipo, ref_id, ref_nombre };
  });

  return { page: pageNum, limit: limitNum, total, rows: finalRows };
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

