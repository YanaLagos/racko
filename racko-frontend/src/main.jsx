import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./i18n/i18n";

import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";

// 1) Variables
import "./styles/variables.css";

// 2) Global base
import "./styles/base.css";

// 3) Reusables 
import "./styles/components.css";
import "./styles/modals.css";
import "./styles/widgets.css";

// 4) Módulos
import "./styles/resources.css";
import "./styles/audits.css";
import "./styles/assets.css";
import "./styles/users.css";
import "./styles/admin.css";

// 5) Otros módulos
import "./styles/pages.css";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);

