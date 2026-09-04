// components/ui/TextField.jsx
import React, { useId } from "react";
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  keyboardType,
  autoCapitalize,
  showKeyboardDone = false,
  inputAccessoryViewID,
  onSubmitEditing,
  returnKeyType,
  blurOnSubmit,
  style,
  ...props
}) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const accessoryId = inputAccessoryViewID || `coldair-keyboard-${generatedId}`;
  const usesAccessory = Platform.OS === "ios" && showKeyboardDone;

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

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        inputAccessoryViewID={usesAccessory ? accessoryId : inputAccessoryViewID}
        onSubmitEditing={onSubmitEditing || (showKeyboardDone ? Keyboard.dismiss : undefined)}
        returnKeyType={returnKeyType || (showKeyboardDone ? "done" : undefined)}
        blurOnSubmit={showKeyboardDone || blurOnSubmit}
        style={[
          {
            backgroundColor: COLORS.surface,
            borderRadius: RADIUS.md,
            paddingHorizontal: SPACING.md - 2,
            paddingVertical: SPACING.md - 2,
            borderWidth: 1,
            borderColor: error ? COLORS.danger : COLORS.borderInput,
            fontSize: FONT.base,
            color: COLORS.textPrimary,
          },
          style,
        ]}
        {...props}
      />

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
      ) : helperText ? (
        <Text
          style={{
            color: COLORS.textSecondary,
            marginTop: SPACING.xs,
            fontSize: FONT.sm,
          }}
        >
          {helperText}
        </Text>
      ) : null}

      {usesAccessory ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View
            style={{
              minHeight: 44,
              alignItems: "flex-end",
              justifyContent: "center",
              paddingHorizontal: SPACING.md,
              backgroundColor: COLORS.surface,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <Pressable
              onPress={Keyboard.dismiss}
              accessibilityRole="button"
              accessibilityLabel="Close keyboard"
              hitSlop={10}
              style={{ paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs }}
            >
              <Text style={{ color: COLORS.primary, fontSize: FONT.base, fontWeight: "700" }}>
                Done
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}
