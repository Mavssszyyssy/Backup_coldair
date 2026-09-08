// components/ui/PasswordField.jsx
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { getAccountPasswordRequirements } from "../../utils/authValidation";

export default function PasswordField({
  label,
  value,
  onChangeText,
  error,
  maxLength,
  style,
  editable = true,
  showRequirements = false,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ marginBottom: SPACING.sm + 6 }}>
      {label ? (
        <Text
          style={{
            fontSize: FONT.base,
            color: COLORS.textPrimary,
            fontWeight: "600",
            marginBottom: SPACING.xs + 2,
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          {
            backgroundColor: COLORS.surface,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: error ? COLORS.danger : COLORS.borderInput,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: SPACING.md - 2,
          },
          style,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          maxLength={maxLength}
          placeholderTextColor={COLORS.textMuted}
          style={{
            flex: 1,
            paddingVertical: SPACING.md - 2,
            fontSize: FONT.base,
            color: COLORS.textPrimary,
          }}
        />
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}
          disabled={!editable} accessibilityRole="button"
          accessibilityLabel={`${visible ? "Hide" : "Show"} ${(label || "password").toLowerCase()}`}
          style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={COLORS.textSecondary}
          />
        </Pressable>
      </View>

      {showRequirements ? <View accessibilityLabel="Password requirements" style={{ marginTop: SPACING.sm }}>
        {getAccountPasswordRequirements(value).map((rule) => <Text key={rule.label}
          style={{ color: rule.met && value ? COLORS.primary : COLORS.textSecondary, fontSize: FONT.sm, marginBottom: 4 }}>
          {rule.met && value ? "✓" : "○"} {rule.label}
        </Text>)}
      </View> : null}
      {error ? (
        <Text
          style={{
            color: COLORS.danger,
            marginTop: SPACING.xs,
            fontSize: FONT.sm,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
