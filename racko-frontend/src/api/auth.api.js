import { http } from "./http";

export async function loginApi({ username, password }) {
  const { data } = await http.post("/api/auth/login", { username, password });
  return data;
}

export async function forgotPasswordApi({ username, email }) {
  const { data } = await http.post("/api/auth/forgot-password", { username, email });
  return data;
}

export async function resetPasswordApi({ token, password }) {
  const { data } = await http.post(`/api/auth/reset-password/${token}`, { password });
  return data;
}