import { apiRequest } from "../config/api";
import { getAuthSessionItem } from "../utils/authSession";

export const isShopEntryRoute = (pathname) => pathname === "/" || /^\/shop\/?$/i.test(pathname);

export function primeGuestCatalogue(pathname) {
  if (!isShopEntryRoute(pathname)) return;
  if (getAuthSessionItem("accessToken")) return;

  // Let the Shop share the request while its route module loads.
  void apiRequest("/products/public", { display: true, silentConnection: true }).catch(() => {});
}
