// Prefer the saved name fields; legacy `name` may not contain the suffix.
export function accountDisplayName(user, fallback = "Customer") {
  if (!user) return fallback;
  const parts = [user.name_first, user.name_last].filter((value) => typeof value === "string" && value.trim());
  const base = (parts.length ? parts.join(" ") : String(user.name || "")).trim().replace(/\s+/g, " ");
  const suffix = String(user.suffix || "").trim();
  if (!base) return user.email?.split("@")[0] || fallback;
  const normalize = (value) => value.toLowerCase().replace(/\./g, "");
  const hasSuffix = suffix && normalize(base).endsWith(` ${normalize(suffix)}`);
  return suffix && !hasSuffix ? `${base} ${suffix}` : base;
}

export function accountInitials(user) {
  const name = accountDisplayName({ ...user, suffix: "" }, "?").split(/\s+/);
  const suffix = String(user?.suffix || "").trim().split(/\s+/).filter(Boolean);
  if (suffix.length && name.length > suffix.length && name.slice(-suffix.length).join(" ").toLowerCase().replace(/\./g, "") === suffix.join(" ").toLowerCase().replace(/\./g, "")) name.splice(-suffix.length);
  return `${name[0][0]}${name.length > 1 ? name.at(-1)[0] : ""}`.toUpperCase();
}
