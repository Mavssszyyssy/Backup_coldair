import { useMemo } from "react";
import { usePathname } from "expo-router";
import { requiredSetupRoute } from "../services/accountSetupRoute";

import { useUserContext } from "../context/UserContext";

export function useRoleGuard(allowedRoles = []) {
  const { current, initialized, resolveHomeRoute } = useUserContext();
  const pathname = usePathname().replace(/\/index\/?$/, "").replace(/\/$/, "");
  const setupRoute = requiredSetupRoute(current);
  const normalizedRoles = useMemo(
    () =>
      allowedRoles.map((role) =>
        String(role).trim().toLowerCase().replace(/-/g, "_"),
      ),
    [allowedRoles],
  );
  const role = String(current?.role || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

  return {
    current,
    initialized,
    allowed: initialized && !!current && normalizedRoles.includes(role) && (!setupRoute || pathname === setupRoute),
    redirectHref: setupRoute || (current ? resolveHomeRoute(current) : "/sign-in"),
  };
}
