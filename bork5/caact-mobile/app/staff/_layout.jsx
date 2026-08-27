import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";
import { View } from "react-native";

import LoadingLogo from "../../components/LoadingLogo";
import { COLORS } from "../../constants/theme";
import { useRoleGuard } from "../../hooks/useRoleGuard";

const STAFF_ROLES = ["admin", "superadmin", "manager", "owner"];

export default function StaffLayout() {
  const { initialized, allowed, redirectHref } = useRoleGuard(STAFF_ROLES);
  if (!initialized) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg }}><LoadingLogo size={82} /></View>;
  if (!allowed) return <Redirect href={redirectHref} />;
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" /></Stack>;
}
