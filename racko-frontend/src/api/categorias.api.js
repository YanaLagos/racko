import { http } from "./http";

export async function listCategoriasApi() {
  const { data } = await http.get("/api/categorias");
  return data; 
}

export async function getCategoriaByIdApi(id_categoria) {
  const { data } = await http.get(`/api/categorias/${id_categoria}`);
  return data;
}