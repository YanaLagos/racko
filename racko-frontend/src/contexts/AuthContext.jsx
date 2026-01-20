import { createContext, useContext, useMemo, useState } from "react";
import { loginApi } from "../api/auth.api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("racko_token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("racko_user");
    return raw ? JSON.parse(raw) : null;
  });

  const isAuthenticated = !!token;

  const login = async ({ username, password }) => {
    const res = await loginApi({ username, password });

    const newToken = res?.data?.token;
    const newUser = res?.data?.usuario;

    if (!newToken) throw new Error("missing_token");

    localStorage.setItem("racko_token", newToken);
    localStorage.setItem("racko_user", JSON.stringify(newUser ?? null));

    setToken(newToken);
    setUser(newUser ?? null);

    return res;
  };

  const logout = () => {
    localStorage.removeItem("racko_token");
    localStorage.removeItem("racko_user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, isAuthenticated, login, logout }),
    [token, user, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
