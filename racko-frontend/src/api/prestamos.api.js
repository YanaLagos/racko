import { http } from "./http";

export async function upcomingDueApi() {
  const { data } = await http.get("/api/prestamos/vencimientos/widget");
  return data; 
}
