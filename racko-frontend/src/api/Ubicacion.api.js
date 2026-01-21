import { http } from "./http";

export async function listarUbicacionesApi({ estado } = {}) {
  try {
    const resp = await http.get("/api/ubicacion", {
      params: estado != null ? { estado: String(estado) } : undefined,
    });
    return resp?.data;
  } catch (e) {
    return {
      ok: false,
      error: e?.response?.data?.error || "errors.locations.fetchFailed",
    };
  }
}

export async function crearUbicacionApi({ nombre, descripcion }) {
  try {
    const resp = await http.post("/api/ubicacion", { nombre, descripcion });
    return resp?.data;
  } catch (e) {
    return {
      ok: false,
      error: e?.response?.data?.error || "errors.locations.createFailed",
    };
  }
}

export async function actualizarUbicacionApi(id, { nombre, descripcion }) {
  try {
    const resp = await http.put(`/api/ubicacion/${id}`, { nombre, descripcion });
    return resp?.data;
  } catch (e) {
    return {
      ok: false,
      error: e?.response?.data?.error || "errors.locations.updateFailed",
    };
  }
}

export async function cambiarEstadoUbicacionApi(id, nuevoEstado) {
  try {
    const resp = await http.patch(`/api/ubicacion/${id}/estado`, { nuevoEstado });
    return resp?.data;
  } catch (e) {
    return {
      ok: false,
      error:
        e?.response?.data?.error || "errors.locations.stateUpdateFailed",
    };
  }
}
