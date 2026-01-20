import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import ProtectedRoute from "./ProtectedRoute";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";

import AppLayout from "../components/layout/AppLayout";
import AdminOnly from "../components/common/AdminOnly";

import Inicio from "../pages/Inicio";
import Activos from "../pages/Activos/Activos";
import Recursos from "../pages/Activos/Recursos";
import Auditorias from "../pages/Auditorias/Auditorias";
import Usuarios from "../pages/Usuarios/Usuarios";
import Administracion from "../pages/Administracion/Administracion";
import HistorialEventos from "../pages/Administracion/HistorialEventos";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Privadas (con layout) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Inicio />} />
          <Route path="activos" element={<Activos />} />
          <Route
            path="activos/categoria/:id_categoria"
            element={<Recursos />}
          />
          <Route path="auditorias" element={<Auditorias />} />
          <Route path="usuarios" element={<Usuarios />} />

          <Route
            path="administracion"
            element={
              <AdminOnly>
                <Administracion />
              </AdminOnly>
            }
          />
          <Route
            path="historial-eventos"
            element={
              <AdminOnly>
                <HistorialEventos />
              </AdminOnly>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
