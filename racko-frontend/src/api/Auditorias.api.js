import { http } from "./http";

export async function listarAuditoriasPrestamosApi(params) {
  const { data } = await http.get("/api/auditoria/prestamos", { params });
  return data;
}

export async function abrirReportePrestamosPdf(params) {
  const { data } = await http.get("/api/auditoria/prestamos/reporte.pdf", {
    params,
    responseType: "blob",
  });

  const file = new Blob([data], { type: "application/pdf" });
  const fileURL = URL.createObjectURL(file);
  window.open(fileURL, "_blank", "noopener,noreferrer");

  setTimeout(() => URL.revokeObjectURL(fileURL), 60_000);
}

export async function actualizarObservacionesPrestamoApi(
  idPrestamo,
  observaciones,
) {
  const { data } = await http.patch(
    `/api/prestamos/observaciones/${idPrestamo}`,
    {
      observaciones,
    },
  );
  return data;
}

export async function listarAuditoriaMovimientosApi(params) {
  const { data } = await http.get("/api/auditoria/movimientos", { params });
  return data;
}

export async function abrirReporteMovimientosPdf(params) {
  const { data } = await http.get("/api/auditoria/reporte.pdf", {
    params,
    responseType: "blob",
  });

  const file = new Blob([data], { type: "application/pdf" });
  const fileURL = URL.createObjectURL(file);
  window.open(fileURL, "_blank", "noopener,noreferrer");

  setTimeout(() => URL.revokeObjectURL(fileURL), 60_000);
}
