import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../../../../components/technician/TechButton";
import Card from "../../../../../../../components/ui/Card";
import InfoCard from "../../../../../../../components/ui/InfoCard";
import PageHeader from "../../../../../../../components/ui/PageHeader";
import { COLORS, FONT, SPACING } from "../../../../../../../constants/theme";
import { getTaskById, TASK_STATUS } from "../../../../../../../services/taskStorage";
import { getServiceLogById } from "../../../../../../../services/unitServiceLogStorage";

export default function LogDetailScreen() {
  const router = useRouter();
  const { id: taskId, "log-id": logId } = useLocalSearchParams();
  const [task, setTask] = useState(null);
  const [log, setLog] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      Promise.all([getTaskById(taskId), getServiceLogById(taskId, logId)]).then(
        ([loadedTask, loadedLog]) => {
          if (active) {
            setTask(loadedTask);
            setLog(loadedLog);
          }
        },
      );
      return () => {
        active = false;
      };
    }, [taskId, logId]),
  );

  const canEdit = task?.status === TASK_STATUS.IN_PROGRESS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        <PageHeader
          title={log?.label || "Service Note"}
          subtitle={log?.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
          color={COLORS.tech}
          onBack={() => router.back()}
        />
        <Card>
          <InfoCard label="AC Unit" value={log?.unitName || task?.unitName || "Unknown"} />
          <InfoCard label="Condition" value={log?.condition || "Unknown"} />
          <InfoCard label="Hours Worked" value={String(log?.hoursSpent ?? 0)} />
          <InfoCard label="Parts Used" value={log?.partsUsed || "None"} />
          <InfoCard label="Technician" value={log?.technicianName || "Unknown"} />
          <InfoCard label="Notes" value={log?.notes || "No notes"} />
        </Card>
        {canEdit && (
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <TechButton
              title="Update"
              onPress={() =>
                router.push({
                  pathname: `/technician/task/${taskId}/unit/log/update`,
                  params: {
                    logId: log?.id,
                    logType: log?.logType,
                    label: log?.label,
                  },
                })
              }
              style={{ flex: 1 }}
            />
            <TechButton
              title="Delete"
              onPress={() =>
                router.push({
                  pathname: `/technician/task/${taskId}/unit/log/delete`,
                  params: { logId: log?.id },
                })
              }
              variant="danger"
              style={{ flex: 1 }}
            />
          </View>
        )}
        {!log && (
          <Text
            style={{
              color: COLORS.textSecondary,
              fontWeight: FONT.bold,
              textAlign: "center",
            }}
          >
            Service note not found.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
