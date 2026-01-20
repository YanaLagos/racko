import { http } from "./http";

export async function listarRecursosPorCategoriaApi(id_categoria, params) {
  const { data } = await http.get(
    `/api/recursos/categoria/${id_categoria}`,
    { params }
  );
  return data;
}

export async function crearRecursoApi(payload) {
  const { data } = await http.post("/api/recursos", payload);
  return data;
}

export async function actualizarRecursoApi(id_recurso, payload) {
  const { data } = await http.put(`/api/recursos/${id_recurso}`, payload);
  return data;
}

export async function cambiarEstadoRecursoApi(id_recurso, nuevoEstado) {
  const { data } = await http.patch(
    `/api/recursos/${id_recurso}/estado`,
    { nuevoEstado }
  );
  return data;
}

