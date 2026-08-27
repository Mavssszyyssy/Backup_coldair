// app/technician/_layout.jsx
// Role guard + Stack navigator for technician screens.
import { Redirect, usePathname } from "expo-router";
import { Stack } from "expo-router/stack";
import { View } from "react-native";

import LoadingLogo from "../../components/LoadingLogo";
import TechnicianBottomNav from "../../components/technician/TechnicianBottomNav";
import { COLORS } from "../../constants/theme";
import { useRoleGuard } from "../../hooks/useRoleGuard";

export default function TechnicianLayout() {
  const { initialized, allowed, redirectHref } = useRoleGuard(["technician"]);
  const pathname = usePathname();
  const topLevelScreens = [
    "/technician",
    "/technician/home",
    "/technician/dashboard",
    "/technician/notifications",
    "/technician/profile",
  ];
  const showBottomNav = topLevelScreens.includes(pathname);

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.bg,
        }}
      >
        <LoadingLogo size={82} />
      </View>
    );
  }

  if (!allowed) {
    return <Redirect href={redirectHref} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack style={{ flex: 1 }} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "Technician" }} />
        <Stack.Screen name="home" options={{ title: "Dashboard" }} />
        <Stack.Screen name="oobe/index" options={{ title: "Technician Setup" }} />
        <Stack.Screen name="oobe/reset" options={{ title: "Reset Setup" }} />
        <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="tasks" options={{ title: "My Work Orders" }} />
        <Stack.Screen name="scan-qr" options={{ title: "Work Orders" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen
          name="task/[id]/information"
          options={{ title: "Work Order Details" }}
        />
        <Stack.Screen
          name="task/[id]/complete-service"
          options={{ title: "Work Order Proof" }}
        />
        <Stack.Screen
          name="task/[id]/amp-registration"
          options={{ title: "AMP Unit Registration" }}
        />
        <Stack.Screen
          name="task/[id]/unit/log/select"
          options={{ title: "Service Notes" }}
        />
        <Stack.Screen
          name="task/[id]/unit/log/select/[log-id]"
          options={{ title: "Service Note Details" }}
        />
        <Stack.Screen
          name="task/[id]/unit/log/insert"
          options={{
            title: "Add Service Note",
            presentation: "transparentModal",
            animation: "slide_from_bottom",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="task/[id]/unit/log/update"
          options={{ title: "Update Service Note" }}
        />
        <Stack.Screen
          name="task/[id]/unit/log/delete"
          options={{
            title: "Delete Service Note",
            presentation: "transparentModal",
            animation: "fade",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="task/[id]/unit/log/generate-qr"
          options={{ title: "Delivery QR Code" }}
        />
      </Stack>
      {showBottomNav ? <TechnicianBottomNav /> : null}
    </View>
  );
}
