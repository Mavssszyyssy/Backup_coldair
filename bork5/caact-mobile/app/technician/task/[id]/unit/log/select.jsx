import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../../../components/technician/TechButton";
import Card from "../../../../../../components/ui/Card";
import EmptyState from "../../../../../../components/ui/EmptyState";
import PageHeader from "../../../../../../components/ui/PageHeader";
import { COLORS, FONT, SPACING } from "../../../../../../constants/theme";
import { getTaskById, TASK_STATUS } from "../../../../../../services/taskStorage";
import {
  LOG_TYPES,
  getServiceLogsByTask,
} from "../../../../../../services/unitServiceLogStorage";

export default function LogSelectScreen() {
  const router = useRouter();
  const { id: taskId } = useLocalSearchParams();
  const [task, setTask] = useState(null);
  const [logs, setLogs] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function load() {
        const loadedTask = await getTaskById(taskId);
        const loadedLogs = loadedTask?.id
          ? await getServiceLogsByTask(loadedTask.id)
          : [];
        if (active) {
          setTask(loadedTask);
          setLogs(loadedLogs);
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [taskId]),
  );

  const canEdit = task?.status === TASK_STATUS.IN_PROGRESS;
  const isDelivery = String(task?.serviceType || task?.issueType || task?.title || "")
    .toLowerCase()
    .includes("delivery");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: SPACING.md,
          paddingBottom: 96,
        }}
      >
        <PageHeader
          title="Service Notes"
          subtitle={task?.unitName || `Work Order #${String(taskId).slice(0, 8)}`}
          color={COLORS.tech}
          onBack={() => router.back()}
        />

        {canEdit && (
          <Card>
            <Text
              style={{
                color: COLORS.textPrimary,
                fontWeight: FONT.black,
                marginBottom: SPACING.sm,
              }}
            >
              Add Service Note
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
              {isDelivery && (
                <TechButton
                  title="Generate Delivery QR Code"
                  onPress={() =>
                    router.push(`/technician/task/${taskId}/unit/log/generate-qr`)
                  }
                  size="sm"
                  leftIcon={<Ionicons name="qr-code-sharp" size={16} color={COLORS.surface} />}
                />
              )}
              {LOG_TYPES.map((type) => (
                <TechButton
                  key={type.id}
                  title={type.label}
                  onPress={() =>
                    router.push({
                      pathname: `/technician/task/${taskId}/unit/log/insert`,
                      params: { logType: type.id, label: type.label },
                    })
                  }
                  size="sm"
                  variant="secondary"
                  leftIcon={<Ionicons name="add-circle-sharp" size={16} color={COLORS.tech} />}
                />
              ))}
            </View>
          </Card>
        )}

        {logs.length === 0 ? (
          <EmptyState
            title="No service notes"
            message="Previous service notes for this AC unit will appear here."
          />
        ) : (
          logs.map((log) => (
            <TouchableOpacity
              key={log.id}
              onPress={() =>
                router.push(`/technician/task/${taskId}/unit/log/select/${log.id}`)
              }
              activeOpacity={0.75}
            >
              <Card style={{ marginBottom: SPACING.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="document-text-sharp"
                    size={20}
                    color={COLORS.tech}
                    style={{ marginRight: SPACING.sm }}
                  />
                  <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontWeight: FONT.black,
                    marginBottom: SPACING.xs,
                  }}
                >
                  {log.label}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>
                  Condition: {log.condition} • Hours worked: {log.hoursSpent}
                </Text>
                  </View>
                  <Ionicons name="chevron-forward-sharp" size={18} color={COLORS.textMuted} />
                </View>
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: FONT.sm,
                    marginTop: 2,
                  }}
                >
                  {new Date(log.createdAt).toLocaleString()}
                </Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
