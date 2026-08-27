import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export default function LoadingLogo({ size = 42 }) {
  const pulse = useRef(new Animated.Value(0.86)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 560,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.86,
          duration: 560,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Animated.Image
        source={require("../images/cold logo.png")}
        resizeMode="cover"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: pulse,
          transform: [{ scale: pulse }],
        }}
      />
    </View>
  );
}
