import { http } from "./http";

export async function upcomingDueApi() {
  const { data } = await http.get("/api/prestamos/vencimientos/widget");
  return data; 
}

export async function obtenerPredictivoApi() {
  const { data } = await http.get('/api/prestamos/predictivo');
  return data;
}
