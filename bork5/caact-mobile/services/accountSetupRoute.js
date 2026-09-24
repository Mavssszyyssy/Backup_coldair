export function requiredSetupRoute(user) {
  if (!user) return null;
  if (user.role === "technician") {
    if (user.isFirstLogin) return "/technician/oobe";
    if (user.security?.totpResetRequired || !user.security?.totpEnabled) {
      return "/technician/oobe/reset";
    }
    return null;
  }
  if (user.role === "customer") {
    const onboarded = user.customerOnboardedAt || user.customer_onboarded_at;
    if (!onboarded) return "/customer/oobe";
    if (user.security?.totpResetRequired || !user.security?.totpEnabled) {
      return "/customer/oobe/reset";
    }
  }
  return null;
}
