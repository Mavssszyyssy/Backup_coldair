const PUBLIC_PREFIXES = ["/shop", "/sign-in", "/login", "/sign-up", "/recover"];

export function isPublicRoute(pathname = "") {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getAllowedRolesForRoute(pathname = "") {
  if (pathname.startsWith("/technician")) return ["technician"];
  if (pathname.startsWith("/staff")) return ["admin", "superadmin", "manager", "owner"];
  if (pathname.startsWith("/manager")) return ["manager", "owner", "admin", "superadmin"];
  if (pathname.startsWith("/customer")) return ["customer"];
  return [];
}
