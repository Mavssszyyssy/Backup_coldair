import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Platform, Text, TextInput, TouchableOpacity, View } from "react-native";

import TechButton from "./TechButton";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

export default function QrCameraScanner({ active = true, onScanned }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [testValue, setTestValue] = useState("");
  const lockedRef = useRef(false);

  const granted = permission?.granted;

  const handleBarcodeScanned = (result) => {
    if (lockedRef.current || locked || !active) return;

    const data = result?.data || result?.nativeEvent?.data || "";
    if (!data) return;

    lockedRef.current = true;
    setLocked(true);
    onScanned?.(data);
  };

  const resetScan = () => {
    lockedRef.current = false;
    setLocked(false);
  };

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          borderRadius: RADIUS.xl,
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: SPACING.md,
          marginBottom: SPACING.md,
        }}
      >
        <View
          style={{
            minHeight: 188,
            borderRadius: RADIUS.lg,
            backgroundColor: COLORS.techLight,
            alignItems: "center",
            justifyContent: "center",
            padding: SPACING.md,
          }}
        >
          <Ionicons name="qr-code-sharp" size={34} color={COLORS.tech} />
          <Text
            style={{
              color: COLORS.textPrimary,
              fontWeight: FONT.black,
              fontSize: FONT.base,
              marginTop: SPACING.sm,
              textAlign: "center",
            }}
          >
            Web QR test
          </Text>
          <TextInput
            value={testValue}
            onChangeText={setTestValue}
            autoCapitalize="none"
            numberOfLines={1}
            style={{
              alignSelf: "stretch",
              backgroundColor: COLORS.surface,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              borderColor: COLORS.border,
              color: COLORS.textPrimary,
              marginTop: SPACING.md,
              paddingHorizontal: SPACING.sm,
              paddingVertical: SPACING.sm,
            }}
          />
          <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm }}>
            <TechButton
              title="Test QR Scan"
              onPress={() => onScanned?.(testValue)}
              style={{ flex: 1 }}
              leftIcon={<Ionicons name="scan-sharp" size={18} color={COLORS.surface} />}
            />
          </View>
        </View>
      </View>
    );
  }

  if (!granted) {
    return (
      <View
        style={{
          borderRadius: RADIUS.xl,
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: SPACING.md,
          marginBottom: SPACING.md,
        }}
      >
        <View
          style={{
            minHeight: 188,
            borderRadius: RADIUS.lg,
            backgroundColor: COLORS.techLight,
            alignItems: "center",
            justifyContent: "center",
            padding: SPACING.md,
          }}
        >
          <Ionicons name="camera-sharp" size={34} color={COLORS.tech} />
          <Text
            style={{
              color: COLORS.textPrimary,
              fontWeight: FONT.black,
              fontSize: FONT.lg,
              marginTop: SPACING.sm,
              textAlign: "center",
            }}
          >
            Camera access needed
          </Text>
          <Text style={{ color: COLORS.textSecondary, textAlign: "center", marginTop: 4 }}>
            Allow camera access to scan AC unit QR codes.
          </Text>
          <TechButton
            title="Allow Camera"
            onPress={requestPermission}
            style={{ alignSelf: "stretch", marginTop: SPACING.md }}
            leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.surface} />}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.sm,
        marginBottom: SPACING.md,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 280,
          borderRadius: RADIUS.lg,
          overflow: "hidden",
          backgroundColor: "#020617",
        }}
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39"] }}
          onBarcodeScanned={locked || !active ? undefined : handleBarcodeScanned}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 220,
              height: 220,
              borderRadius: RADIUS.xl,
              borderWidth: 3,
              borderColor: COLORS.surface,
              backgroundColor: "rgba(2, 132, 199, 0.08)",
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            left: SPACING.md,
            right: SPACING.md,
            bottom: SPACING.md,
            backgroundColor: "rgba(15, 23, 42, 0.72)",
            borderRadius: RADIUS.lg,
            padding: SPACING.sm,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons name="scan-sharp" size={22} color={COLORS.surface} />
          <Text style={{ color: COLORS.surface, flex: 1, marginLeft: SPACING.sm }}>
            {locked ? "QR code captured. Review the AC unit details below." : "Align the AC unit QR code inside the frame."}
          </Text>
          {locked ? (
            <TouchableOpacity onPress={resetScan} hitSlop={10}>
              <Text style={{ color: "#BAE6FD", fontWeight: FONT.black }}>Scan again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
