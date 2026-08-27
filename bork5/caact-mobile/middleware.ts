const PUBLIC_PREFIXES = ["/sign-in", "/login", "/sign-up", "/recover"];

export function isPublicRoute(pathname = "") {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getAllowedRolesForRoute(pathname = "") {
  if (pathname.startsWith("/technician")) return ["technician"];
  if (pathname.startsWith("/manager")) return ["manager", "owner"];
  if (pathname.startsWith("/customer")) return ["customer"];
  return [];
}
