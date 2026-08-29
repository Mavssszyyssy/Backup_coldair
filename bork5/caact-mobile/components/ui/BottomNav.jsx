// components/ui/BottomNav.jsx
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "../../constants/theme";
import NavButton from "./NavButton";

export default function BottomNav() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 4);

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        height: 68 + bottomInset,
        alignItems: "center",
        paddingBottom: bottomInset,
        paddingHorizontal: 4,
      }}
    >
      <NavButton
        href="/customer/home"
        iconName="home-sharp"
        label="Home"
      />

      <NavButton
        href="/customer/shop"
        iconName="bag-handle-sharp"
        label="Shop"
      />

      <NavButton
        href="/customer/services"
        iconName="construct-sharp"
        label="Services"
      />

      <NavButton
        href="/customer/orders"
        iconName="receipt-sharp"
        label="Orders"
      />

      <NavButton
        href="/customer/settings"
        iconName="person-circle-sharp"
        label="Account"
      />
    </View>
  );
}
