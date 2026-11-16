import React from "react";
import ReactDOM from "react-dom/client";
import App, { preloadShopRoute } from "./App";
import { isShopEntryRoute, primeGuestCatalogue } from "./domain/primeGuestCatalogue";
import "./components/common/boutique/Boutique.css";
import "./index.css";

const { pathname } = window.location;
if (isShopEntryRoute(pathname)) {
  primeGuestCatalogue(pathname);
  preloadShopRoute();
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
