import { apiRequest } from "../config/api";
import { getAuthSessionItem } from "../utils/authSession";

export function primeGuestCatalogue(pathname) {
  if (pathname !== "/" && !/^\/shop\/?$/i.test(pathname)) return;
  if (getAuthSessionItem("accessToken")) return;

  // Let the Shop share the request while its route module loads.
  void apiRequest("/products/public", { display: true, silentConnection: true }).catch(() => {});
}
