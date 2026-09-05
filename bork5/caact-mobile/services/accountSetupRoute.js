export function requiredSetupRoute(user) {
  if (!user) return null;
  const technician = user.role === "technician";
  if (user.security?.totpResetRequired) return technician ? "/technician/oobe/reset" : "/customer/oobe/reset";
  if (technician && (user.isFirstLogin || !(user.technicianOnboardedAt || user.technician_onboarded_at))) return "/technician/oobe";
  if (user.role === "customer" && !(user.customerOnboardedAt || user.customer_onboarded_at)) return "/customer/oobe";
  return null;
}
