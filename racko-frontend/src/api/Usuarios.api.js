import { http } from "./http";

export async function crearUsuarioExternoApi(payload) {
  const { data } = await http.post("/api/usuarios-externos/registrar-externo", payload);
  return data;
}

export async function listarUsuariosExternosApi(params) {
  const { data } = await http.get("/api/usuarios-externos", { params });
  return data;
}

export async function getUsuarioExternoByRutApi(rut) {
  const { data } = await http.get(`/api/usuarios-externos/rut/${rut}`);
  return data;
}


export async function actualizarUsuarioExternoApi(rut, payload) {
  const { data } = await http.put(`/api/usuarios-externos/${rut}`, payload);
  return data;
}

export async function cambiarEstadoUsuarioExternoApi(rut, nuevoEstado) {
  const { data } = await http.patch(`/api/usuarios-externos/${rut}/estado`, { nuevoEstado });
  return data;
}

export async function cambiarRutUsuarioExternoApi(rut, nuevoRut) {
  const { data } = await http.patch(`/api/usuarios-externos/${rut}/rut`, { nuevoRut });
  return data;
}

export async function checkPurgableUsuarioExternoApi(rut) {
  const { data } = await http.get(`/api/usuarios-externos/${rut}/purgable`);
  return data;
}

export async function eliminarUsuarioExternoApi(rut) {
  const { data } = await http.delete(`/api/usuarios-externos/${rut}/permanente`);
  return data;
}
