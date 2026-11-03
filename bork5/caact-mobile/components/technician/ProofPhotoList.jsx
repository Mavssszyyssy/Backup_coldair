import React, { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

export default function ProofPhotoList({ photos = [], height = 170 }) {
  const { language, t } = useInterfaceLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const visiblePhotos = photos.filter((photo) => photo?.uri);
  if (!visiblePhotos.length) return <Text style={{ color: COLORS.textSecondary }}>{t("No photo submitted")}</Text>;

  return (
    <View style={{ gap: SPACING.sm }}>
      {visiblePhotos.map((photo, index) => (
        <View key={`${photo.capturedAt || "photo"}-${index}`}>
          <Pressable onPress={() => setSelectedPhoto(photo)} accessibilityRole="button" accessibilityLabel={`${t("View photo")} ${index + 1}`}>
            <Image source={{ uri: photo.uri }} style={{ width: "100%", height, borderRadius: RADIUS.md, backgroundColor: COLORS.border }} resizeMode="cover" />
          </Pressable>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 4 }}>
            {photo.label || (language === "Filipino" ? `Larawan ${index + 1}` : `Photo ${index + 1}`)}
          </Text>
        </View>
      ))}
      <Modal visible={Boolean(selectedPhoto)} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "#101820", paddingTop: 48, paddingBottom: 24 }}>
          <Pressable onPress={() => setSelectedPhoto(null)} accessibilityRole="button" accessibilityLabel={t("Close photo")} style={{ alignSelf: "flex-end", padding: SPACING.md, marginRight: SPACING.sm }}>
            <Text style={{ color: "#FFFFFF", fontSize: FONT.md, fontWeight: FONT.bold }}>{t("Close photo")}</Text>
          </Pressable>
          {selectedPhoto?.uri ? <Image source={{ uri: selectedPhoto.uri }} style={{ flex: 1, width: "100%" }} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}
