import LoadingSkeleton from "./LoadingSkeleton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS, RADIUS, SPACING, TYPE } from "../../constants/theme";
import { dropdownSearch } from "../../services/dropdownSearch";
import TextField from "./TextField";

export default function BottomSheetSelect({
  label,
  value,
  placeholder,
  items = [],
  loading = false,
  disabled = false,
  error,
  emptyMessage,
  icon = "chevron-down-sharp",
  itemIcon = "location-sharp",
  accentColor = COLORS.primary,
  searchPlaceholder,
  translate = (text) => text,
  getKey = (item) => String(item.code || item.id || item.name),
  getLabel = (item) => item.displayName || item.title || item.name || "",
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef(null);
  const searchLabel = searchPlaceholder || `${translate("Search for")} ${String(label || translate("options")).toLowerCase()}`;

  const dismissKeyboard = () => {
    searchInputRef.current?.blur?.();
    Keyboard.dismiss();
  };

  const closeSheet = () => {
    dismissKeyboard();
    setQuery("");
    setOpen(false);
  };

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const matches = dropdownSearch(query);
    return items.filter((item) => matches(getLabel(item), getKey(item)));
  }, [getKey, getLabel, items, query]);

  return (
    <View style={{ marginBottom: SPACING.sm + 6 }}>
      {!!label && (
        <Text
          style={[TYPE.label, {
            color: COLORS.textPrimary,
            marginBottom: SPACING.xs + 2,
          }]}
        >
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => {
          if (disabled) return;
          Keyboard.dismiss();
          setOpen(true);
        }}
        activeOpacity={0.75}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        style={{
          backgroundColor: disabled ? "#F1F5F9" : COLORS.surface,
          borderRadius: RADIUS.md,
          paddingHorizontal: SPACING.md - 2,
          paddingVertical: SPACING.md - 2,
          borderWidth: 1,
          borderColor: error ? COLORS.danger : COLORS.borderInput,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text
          style={[TYPE.body, {
            flex: 1,
            color: value ? COLORS.textPrimary : COLORS.textSecondary,
            marginRight: SPACING.sm,
          }]}
        >
          {value || placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <Ionicons
            name={icon}
            size={18}
            color={disabled ? COLORS.textMuted : COLORS.textSecondary}
          />
        )}
      </TouchableOpacity>
      {!!error && (
        <Text style={[TYPE.caption, { color: COLORS.danger, marginTop: SPACING.xs }]}>
          {error}
        </Text>
      )}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
        onDismiss={dismissKeyboard}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <Pressable
          onPress={closeSheet}
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.42)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            style={{
              maxHeight: "78%",
              backgroundColor: COLORS.bg,
              borderTopLeftRadius: RADIUS.xl,
              borderTopRightRadius: RADIUS.xl,
              padding: SPACING.md,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: SPACING.sm,
              }}
            >
              <Text
                accessibilityRole="header"
                style={[TYPE.section, {
                  color: COLORS.textPrimary,
                  flex: 1,
                  flexShrink: 1,
                  paddingRight: SPACING.sm,
                }]}
              >
                {label ? `${translate("Select a")} ${label}` : translate("Select an option")}
              </Text>
              <TouchableOpacity onPress={closeSheet} hitSlop={12} accessibilityRole="button" accessibilityLabel={translate("Close")}>
                <Ionicons name="close-sharp" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextField
              maxLength={160}
              ref={searchInputRef}
              label=""
              value={query}
              onChangeText={setQuery}
              placeholder={searchLabel}
              accessibilityLabel={searchLabel}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={dismissKeyboard}
            />

            {loading ? (
              <LoadingSkeleton label={translate("Loading list...")} variant="inline" />
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={getKey}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                ListEmptyComponent={
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      textAlign: "center",
                      padding: SPACING.lg,
                    }}
                  >
                    {(!query.trim() && emptyMessage) || translate("No matching records found.")}
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      closeSheet();
                      onSelect?.(item);
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: getLabel(item) === value }}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: RADIUS.md,
                      padding: SPACING.md,
                      marginBottom: SPACING.sm,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={itemIcon}
                      size={18}
                      color={accentColor}
                      style={{ marginRight: SPACING.sm }}
                    />
                    <Text style={{ color: COLORS.textPrimary, flex: 1 }}>
                      {getLabel(item)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
