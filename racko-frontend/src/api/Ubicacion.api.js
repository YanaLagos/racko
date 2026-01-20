import { http } from "./http";

export async function listarUbicacionesApi(params) {
  const { data } = await http.get("/api/ubicacion", { params });
  return data;
}
