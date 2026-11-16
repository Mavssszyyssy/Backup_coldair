import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { primeGuestCatalogue } from "./domain/primeGuestCatalogue";
import "./components/common/boutique/Boutique.css";
import "./index.css";

primeGuestCatalogue(window.location.pathname);
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
