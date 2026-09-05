import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../../../components/technician/TechButton";
import Card from "../../../../../../components/ui/Card";
import UnitHistoryPanel from "../../../../../../components/technician/UnitHistoryPanel";
import { fetchTechnicianUnitHistory, getStoredToken } from "../../../../../../services/api";
import EmptyState from "../../../../../../components/ui/EmptyState";
import PageHeader from "../../../../../../components/ui/PageHeader";
import { COLORS, FONT, SPACING } from "../../../../../../constants/theme";
import { getTaskById, TASK_STATUS } from "../../../../../../services/taskStorage";
import { isInstallationWorkOrder } from "../../../../../../services/technicianTaskLogic";
import {
  LOG_TYPES,
  getServiceLogsByTask,
} from "../../../../../../services/unitServiceLogStorage";

export default function LogSelectScreen() {
  const router = useRouter();
  const { id: taskId } = useLocalSearchParams();
  const [task, setTask] = useState(null);
  const [logs, setLogs] = useState([]);
  const [unitHistory, setUnitHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        setLoadError("");
        setUnitHistory(null);
        try {
        const loadedTask = await getTaskById(taskId);
        if (!loadedTask) throw new Error("This work order is no longer available.");
        const loadedLogs = loadedTask?.id
          ? await getServiceLogsByTask(loadedTask.id)
          : [];
        if (active) {
          setTask(loadedTask);
          setLogs(loadedLogs);
        }
        const serialNumber = loadedTask.unit?.serialNumber;
        if (serialNumber) {
          const token = await getStoredToken();
          const history = await fetchTechnicianUnitHistory(token, serialNumber, loadedTask.id);
          if (!history.success) throw new Error(history.error || "Unable to load previous AC service history.");
          if (active) setUnitHistory(history);
        }
        } catch (error) {
          if (active) setLoadError(error?.message || "Unable to load service notes.");
        } finally {
          if (active) setLoading(false);
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
  const visibleLogTypes = React.useMemo(() => {
    if (isInstallationWorkOrder(task)) return LOG_TYPES.filter((type) => type.id === "installation");
    const source = `${task?.issueType || ""} ${task?.title || ""} ${task?.description || ""}`.toLowerCase();
    if (source.includes("warranty") || source.includes("repair")) return LOG_TYPES.filter((type) => type.id === "repair");
    if (source.includes("inspection") || source.includes("check")) return LOG_TYPES.filter((type) => type.id === "inspection");
    return LOG_TYPES.filter((type) => ["regular_cleaning", "deep_cleaning"].includes(type.id));
  }, [task]);

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
              {visibleLogTypes.map((type) => (
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

        {loading ? <Text style={{ color: COLORS.textSecondary }}>Loading work-order notes and AC history...</Text> : null}
        {loadError ? <Text style={{ color: COLORS.danger }}>{loadError}</Text> : null}
        {!loading && !loadError && logs.length === 0 ? (
          <EmptyState
            title="No notes for this work order yet"
            message="Notes you add here belong to this visit. Earlier completed visits are listed separately below."
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
        {!loading && unitHistory ? <UnitHistoryPanel history={unitHistory} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
