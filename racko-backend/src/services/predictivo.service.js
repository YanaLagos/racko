const db = require("../config/db");

async function calcularRiesgoRetraso(connOrDb, rutUsuarioExterno, limit = 10) {
  const rut = String(rutUsuarioExterno || '').trim();
  const n = Number(limit) || 10;
  
  if (!rut) {
    return { total: 0, atrasos: 0, probabilidad: null, nivel: 'SIN_DATOS', muestra: 0 };
  }

  const [rows] = await connOrDb.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(
        CASE
          WHEN p.fecha_vencimiento IS NULL THEN 0
          WHEN p.fecha_devolucion IS NOT NULL AND p.fecha_devolucion > p.fecha_vencimiento THEN 1
          WHEN p.fecha_devolucion IS NULL AND NOW() > p.fecha_vencimiento THEN 1
          ELSE 0
        END
      ) AS atrasos
    FROM (
      SELECT fecha_vencimiento, fecha_devolucion, fecha_prestamo
      FROM registro_prestamo
      WHERE rut_usuario = ?
      ORDER BY fecha_prestamo DESC
      LIMIT ?
    ) p
    `,
    [rut, n]
  );

  const total = Number(rows?.[0]?.total ?? 0);
  const atrasos = Number(rows?.[0]?.atrasos ?? 0);

  if (total === 0) {
    return { total: 0, atrasos: 0, probabilidad: null, nivel: 'SIN_DATOS', muestra: 0 };
  }

  const prob = atrasos / total;

  let nivel = 'BAJO';
  if (prob >= 0.70) nivel = 'ALTO';
  else if (prob >= 0.40) nivel = 'MEDIO';

  return {
    total,
    atrasos,
    probabilidad: Number((prob * 100).toFixed(1)),
    nivel,
    muestra: total, 
  };
}

async function obtenerUsuariosPredictivo({ max = 5, hist = 10 } = {}) {
  const maxN = Math.min(5, Math.max(1, Number(max) || 5));
  const histN = Math.min(50, Math.max(1, Number(hist) || 10));

  const [usuarios] = await db.query(`
    SELECT rut, nombre, apellido
    FROM usuario_externo
    WHERE estado = 1
  `);

  const resultados = [];

  for (const u of usuarios) {
    const riesgo = await calcularRiesgoRetraso(db, u.rut, histN);

    if (riesgo.nivel === "MEDIO" || riesgo.nivel === "ALTO") {
      resultados.push({
        rut: u.rut,
        nombre: u.nombre,
        apellido: u.apellido,
        probabilidad: riesgo.probabilidad,
        nivel: riesgo.nivel,
      });
    }
  }

  resultados.sort((a, b) => {
    const pa = a.probabilidad == null ? -1 : a.probabilidad;
    const pb = b.probabilidad == null ? -1 : b.probabilidad;
    return pb - pa;
  });

  return resultados.slice(0, maxN);
}

module.exports = {
  calcularRiesgoRetraso,
  obtenerUsuariosPredictivo,
};

