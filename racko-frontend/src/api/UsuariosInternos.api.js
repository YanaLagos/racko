import { http } from "./http";

export async function listarUsuariosInternosApi(params) {
  const res = await http.get("/api/usuarios-internos", { params });
  return res.data; 
}

export async function listarMovimientosAuditoriaApi(params) {
  const res = await http.get("/api/auditoria/movimientos", { params });
  return res.data; 
}

export async function crearUsuarioInternoApi(payload) {
  const { data } = await http.post("/api/usuarios-internos", payload);
  return data;
}

export async function reenviarInvitacionPasswordApi(id) {
  const { data } = await http.post(`/api/usuarios-internos/${id}/invitacion-password`);
  return data;
}

export async function actualizarUsuarioInternoApi(id, payload) {
  const { data } = await http.patch(`/api/usuarios-internos/${id}`, payload);
  return data; 
}

export async function cambiarEstadoUsuarioInternoApi(id, nuevoEstado) {
  const { data } = await http.patch(`/api/usuarios-internos/${id}/estado`, { nuevoEstado });
  return data;
}
