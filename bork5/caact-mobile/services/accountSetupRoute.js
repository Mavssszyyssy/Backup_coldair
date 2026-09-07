export function requiredSetupRoute(user) {
  if (!user) return null;
  // Technician setup ends after replacing the initial password. Legacy
  // authenticator flags must not send technicians back into customer security.
  if (user.role === "technician") return user.isFirstLogin ? "/technician/oobe" : null;
  if (user.security?.totpResetRequired) return "/customer/oobe/reset";
  if (user.role === "customer" && !(user.customerOnboardedAt || user.customer_onboarded_at)) return "/customer/oobe";
  return null;
}
