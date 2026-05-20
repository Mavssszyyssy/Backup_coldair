import { useMemo } from "react";

import { useUserContext } from "../context/UserContext";

export function useRoleGuard(allowedRoles = []) {
  const { current, initialized, resolveHomeRoute } = useUserContext();
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
    allowed: initialized && !!current && normalizedRoles.includes(role),
    redirectHref: current ? resolveHomeRoute(current) : "/sign-in",
  };
}
