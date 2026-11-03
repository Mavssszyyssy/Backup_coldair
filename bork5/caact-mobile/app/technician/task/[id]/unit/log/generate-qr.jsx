import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../../../components/technician/TechButton";
import Card from "../../../../../../components/ui/Card";
import PageHeader from "../../../../../../components/ui/PageHeader";
import { COLORS, FONT, SPACING } from "../../../../../../constants/theme";
import { buildUnitQrCode } from "../../../../../../services/qrLookupService";
import { getTaskById } from "../../../../../../services/taskStorage";
import { getUnitByCode } from "../../../../../../services/unitStorage";
import { useInterfaceLanguage } from "../../../../../../hooks/useInterfaceLanguage";

function isDelivery(task) {
  return String(task?.serviceType || task?.issueType || task?.title || "")
    .toLowerCase()
    .includes("delivery");
}

export default function GenerateDeliveryQrScreen() {
  const router = useRouter();
  const { t } = useInterfaceLanguage();
  const { id: taskId } = useLocalSearchParams();
  const [task, setTask] = useState(null);
  const [qrValue, setQrValue] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function load() {
        const loadedTask = await getTaskById(taskId);
        const unit = loadedTask?.unitId ? await getUnitByCode(loadedTask.unitId) : null;
        const value =
          loadedTask && unit
            ? `${buildUnitQrCode(unit)}|REQUEST:${loadedTask.requestId || ""}|TASK:${loadedTask.id}`
            : "";
        if (active) {
          setTask(loadedTask);
          setQrValue(value);
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [taskId]),
  );

  const handleUnavailable = () => {
    Alert.alert(
      t("Unavailable"),
      t("Delivery QR code generation is only available for delivery work orders with a linked AC unit."),
    );
  };

  const canGenerate = isDelivery(task) && !!qrValue;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        <PageHeader
          title={t("Delivery QR Code")}
          subtitle={task?.unitName || `${t("Work Order")} #${String(taskId).slice(0, 8)}`}
          color={COLORS.tech}
          onBack={() => router.back()}
        />
        <Card>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontWeight: FONT.black,
              fontSize: FONT.lg,
              marginBottom: SPACING.sm,
            }}
          >
            {t("Customer Delivery Confirmation Code")}
          </Text>
          <Text
            selectable
            style={{
              color: canGenerate ? COLORS.textPrimary : COLORS.textMuted,
              lineHeight: 22,
              marginBottom: SPACING.md,
            }}
          >
            {canGenerate ? qrValue : t("No QR code is available for this work order.")}
          </Text>
          <TechButton
            title={t("Show QR Code Value")}
            onPress={canGenerate ? () => Alert.alert(t("QR Ready"), qrValue) : handleUnavailable}
            disabled={!canGenerate}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
