import { Redirect } from "expo-router";
import { View } from "react-native";

import LoadingLogo from "../components/LoadingLogo";
import { COLORS } from "../constants/theme";
import { useUserContext } from "../context/UserContext";

export default function Index() {
  const { current, initialized, resolveHomeRoute } = useUserContext();

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg }}>
        <LoadingLogo size={88} />
      </View>
    );
  }

  // Catalogue browsing is public. Individual data requests still update the
  // shared connection banner, so entry routing must not be blocked by a
  // separate cross-origin health request.
  return <Redirect href={current ? resolveHomeRoute(current) : "/shop"} />;
}
