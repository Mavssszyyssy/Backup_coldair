// components/ui/BottomNav.jsx
// Customer bottom navigation bar — 5 tabs.
// Reloads cart count whenever the screen that mounts this nav gains focus.
import { View } from "react-native";

import { COLORS } from "../../constants/theme";
import NavButton from "./NavButton";

export default function BottomNav() {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        height: 70,
        alignItems: "center",
      }}
    >
      <NavButton
        href="/customer/home"
        icon={require("../../images/home.png")}
        label="Home"
      />

      <NavButton
        href="/customer/shop"
        icon={require("../../images/order.png")}
        label="Shop"
      />

      <NavButton
        href="/customer/services"
        icon={require("../../images/maintenance.png")}
        label="Services"
        elevated
        color="#FFFFFF"
        flex={1.2}
      />

      <NavButton
        href="/customer/orders"
        icon={require("../../images/service.png")}
        label="Orders"
      />

      <NavButton
        href="/customer/settings"
        icon={require("../../images/settings.png")}
        label="Settings"
      />
    </View>
  );
}
