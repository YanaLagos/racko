import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminOnly({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.id_rol === 1;
  return isAdmin ? children : <Navigate to="/app" replace />;
}
