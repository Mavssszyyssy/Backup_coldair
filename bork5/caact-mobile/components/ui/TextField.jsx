// components/ui/TextField.jsx
import React, { forwardRef, useId, useState } from "react";
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPE } from "../../constants/theme";

const TextField = forwardRef(function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  keyboardType,
  autoCapitalize,
  showKeyboardDone = false,
  translate = (text) => text,
  inputAccessoryViewID,
  onSubmitEditing,
  returnKeyType,
  blurOnSubmit,
  onFocus,
  onBlur,
  style,
  maxLength = 160,
  ...props
}, forwardedRef) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const accessoryId = inputAccessoryViewID || `coldair-keyboard-${generatedId}`;
  const usesAccessory = Platform.OS === "ios" && showKeyboardDone;
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: SPACING.sm + 6 }}>
      {label ? (
        <Text
          style={[TYPE.label, {
            color: COLORS.textPrimary,
            marginBottom: SPACING.xs + 2,
          }]}
        >
          {label}
        </Text>
      ) : null}

      <TextInput
        accessibilityLabel={label}
        ref={forwardedRef}
        value={value}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? (props.secureTextEntry ? "none" : "sentences")}
        autoCorrect={props.secureTextEntry ? false : undefined}
        spellCheck={props.secureTextEntry ? false : undefined}
        inputAccessoryViewID={usesAccessory ? accessoryId : inputAccessoryViewID}
        onSubmitEditing={onSubmitEditing || (showKeyboardDone ? Keyboard.dismiss : undefined)}
        returnKeyType={returnKeyType || (showKeyboardDone ? "done" : undefined)}
        blurOnSubmit={showKeyboardDone || blurOnSubmit}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          {
            backgroundColor: COLORS.surface,
            borderRadius: RADIUS.md,
            paddingHorizontal: SPACING.md - 2,
            paddingVertical: SPACING.md - 2,
            borderColor: error ? COLORS.danger : focused ? COLORS.borderFocus : COLORS.borderInput,
            borderWidth: focused || error ? 1.5 : 1,
            fontSize: TYPE.body.fontSize,
            color: COLORS.textPrimary,
            minHeight: 50,
          },
          style,
        ]}
        {...props}
      />

      {error ? (
        <Text
          style={[TYPE.caption, {
            color: COLORS.danger,
            marginTop: SPACING.xs,
          }]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[TYPE.caption, {
            color: COLORS.textSecondary,
            marginTop: SPACING.xs,
          }]}
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
              accessibilityLabel={translate("Close keyboard")}
              hitSlop={10}
              style={{ paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs }}
            >
              <Text style={[TYPE.label, { color: COLORS.primary }]}>
                {translate("Done")}
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
});

export default TextField;
