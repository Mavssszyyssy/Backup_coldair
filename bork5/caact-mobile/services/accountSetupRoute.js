export function requiredSetupRoute(user) {
  if (!user) return null;
  if (user.role === "technician") {
    if (user.isFirstLogin) return "/technician/oobe";
    return null;
  }
  if (user.role === "customer") {
    const onboarded = user.customerOnboardedAt || user.customer_onboarded_at;
    if (!onboarded) return "/customer/oobe";
  }
  return null;
}
