import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
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
  getKey = (item) => String(item.code || item.id || item.name),
  getLabel = (item) => item.displayName || item.title || item.name || "",
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const closeSheet = () => {
    Keyboard.dismiss();
    setQuery("");
    setOpen(false);
  };

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => getLabel(item).toLowerCase().includes(needle));
  }, [getLabel, items, query]);

  return (
    <View style={{ marginBottom: SPACING.sm + 6 }}>
      {!!label && (
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
      )}
      <TouchableOpacity
        onPress={() => {
          if (disabled) return;
          Keyboard.dismiss();
          setOpen(true);
        }}
        activeOpacity={0.75}
        disabled={disabled}
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
          style={{
            flex: 1,
            color: value ? COLORS.textPrimary : COLORS.textMuted,
            fontSize: FONT.base,
          }}
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
        <Text style={{ color: COLORS.danger, marginTop: SPACING.xs, fontSize: FONT.sm }}>
          {error}
        </Text>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={closeSheet}>
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
                style={{
                  color: COLORS.textPrimary,
                  fontWeight: FONT.black,
                  fontSize: FONT.lg,
                }}
              >
                Select {label || "Option"}
              </Text>
              <TouchableOpacity onPress={closeSheet} hitSlop={12}>
                <Ionicons name="close-sharp" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextField
              label=""
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder || `Search ${String(label || "options").toLowerCase()}`}
              autoCapitalize="words"
            />

            {loading ? (
              <View style={{ padding: SPACING.xl, alignItems: "center" }}>
                <ActivityIndicator size="large" color={accentColor} />
                <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm }}>
                  Loading list...
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={getKey}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      textAlign: "center",
                      padding: SPACING.lg,
                    }}
                  >
                    {emptyMessage || "No matching records found."}
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      onSelect?.(item);
                      closeSheet();
                    }}
                    activeOpacity={0.75}
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
      </Modal>
    </View>
  );
}
