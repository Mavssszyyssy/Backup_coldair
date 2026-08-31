const PROTECTED_DEMO_STAFF = [
  ["admin.bulacan", "admin-bulacan@example.com"],
  ["admin.cavite", "admin-cavite@example.com"],
  ["admin.laguna", "admin-laguna@example.com"],
  ["admin.bataan", "admin-bataan@example.com"],
  ["admin.pangasinan", "admin-pangasinan@example.com"],
  ["admin.ilocos", "admin-ilocos@example.com"],
  ["tech.main", "tech@example.com"],
  ["superadmin.main", "superadmin@example.com"],
];

const protectedAliases = new Set(PROTECTED_DEMO_STAFF.map(([alias]) => alias));
const protectedEmails = new Set(PROTECTED_DEMO_STAFF.map(([, email]) => email));

const isProtectedDemoStaff = (user = {}) =>
  protectedAliases.has(String(user.alias || "").trim().toLowerCase()) ||
  protectedEmails.has(String(user.email || "").trim().toLowerCase());

module.exports = { PROTECTED_DEMO_STAFF, isProtectedDemoStaff };
