import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './styles/global.css';
import { AuthWrapper } from "./components/context/authContext.jsx";
import { ToastProvider } from "./components/context/ToastContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthWrapper>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthWrapper>
  </React.StrictMode>
);
