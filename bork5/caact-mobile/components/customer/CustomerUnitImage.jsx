import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { Image, View } from "react-native";

import { API_BASE } from "../../constants/config";
import { COLORS, RADIUS } from "../../constants/theme";

const resolveImageUrl = (value = "") => {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^https?:\/\//i.test(source) || source.startsWith("data:")) return source;
  const apiOrigin = API_BASE.replace(/\/api\/?$/i, "");
  return `${apiOrigin}${source.startsWith("/") ? source : `/${source}`}`;
};

export default function CustomerUnitImage({ unit, size = 68, style }) {
  const imageUrl = useMemo(() => resolveImageUrl(unit?.imageUrl || unit?.image), [unit?.imageUrl, unit?.image]);
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [imageUrl]);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: RADIUS.md,
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {imageUrl && !broken ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel={`${unit?.brand || "AC"} ${unit?.model || unit?.unitName || "unit"} photo`}
          resizeMode="contain"
          onError={() => setBroken(true)}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Ionicons name="snow-sharp" size={Math.round(size * 0.42)} color={COLORS.primary} />
      )}
    </View>
  );
}
