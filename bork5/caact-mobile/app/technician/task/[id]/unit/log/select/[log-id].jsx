import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { startLiveRefresh } from "../../../../../../../services/liveRefresh";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../../../../components/technician/TechButton";
import ServiceNoteDetails from "../../../../../../../components/technician/ServiceNoteDetails";
import PageHeader from "../../../../../../../components/ui/PageHeader";
import { COLORS, FONT, SPACING } from "../../../../../../../constants/theme";
import { getTaskById, TASK_STATUS } from "../../../../../../../services/taskStorage";
import { getServiceLogById } from "../../../../../../../services/unitServiceLogStorage";

export default function LogDetailScreen() {
  const router = useRouter();
  const { id: taskId, "log-id": logId } = useLocalSearchParams();
  const [task, setTask] = useState(null);
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const stop = startLiveRefresh(({ background }) => {
      if (!background) setLoading(true);
      setError("");
      if (!background) setLog(null);
      return Promise.all([getTaskById(taskId, { requireOnline: true }), getServiceLogById(taskId, logId)]).then(
        ([loadedTask, loadedLog]) => {
          if (active) {
            setTask(loadedTask);
            setLog(loadedLog);
          }
        },
      ).catch(e => { if (active) setError(e.message || "Unable to load this service note. Please try again."); })
        .finally(() => { if (active) setLoading(false); });
      });
      return () => {
        active = false;
        stop();
      };
    }, [taskId, logId]),
  );

  const canEdit = !loading && !error && log && task?.status === TASK_STATUS.IN_PROGRESS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        <PageHeader
          title={log?.label || "Service Note"}
          subtitle={log?.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
          color={COLORS.tech}
          onBack={() => router.back()}
        />
        {loading ? <Text>Loading service note...</Text> : error ? <Text accessibilityRole="alert" style={{ color: COLORS.danger }}>{error}</Text> : log ? <ServiceNoteDetails log={log} unitName={task?.unitName} /> : null}
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
        {!loading && !error && !log && (
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
