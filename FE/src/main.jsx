import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './styles/global.css';
import { AuthWrapper } from "./components/context/authContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthWrapper>
      <App />
    </AuthWrapper>
  </React.StrictMode>
);
