import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { api } from "@/lib/api";
import "./index.css";

// Fetch-basierten API-Client global bereitstellen. Alle Seiten nutzen
// weiterhin window.api.* - die Kommunikation laeuft jetzt aber ueber HTTP
// zur REST-API statt ueber Electron-IPC.
window.api = api;
window.appInfo = { platform: "web" };

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
