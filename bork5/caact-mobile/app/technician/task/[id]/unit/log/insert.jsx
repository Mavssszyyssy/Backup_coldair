import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, TouchableOpacity, View } from "react-native";

import TechButton from "../../../../../../components/technician/TechButton";
import Card from "../../../../../../components/ui/Card";
import PageHeader from "../../../../../../components/ui/PageHeader";
import TextField from "../../../../../../components/ui/TextField";
import KeyboardAwareScrollView from "../../../../../../components/ui/KeyboardAwareScrollView";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../../../constants/theme";
import { useUserContext } from "../../../../../../context/UserContext";
import { getDisplayName } from "../../../../../../services/profileService";
import { TASK_STATUS, getTaskById } from "../../../../../../services/taskStorage";
import {
  clearLogDraft,
  getLogDraft,
  getServiceLogById,
  saveLogDraft,
  upsertServiceLog,
} from "../../../../../../services/unitServiceLogStorage";

const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Poor"];

export default function LogInsertScreen({ mode = "insert" }) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id: taskId, logId, logType = "other", label = "Other" } = params;
  const { current } = useUserContext();
  const [task, setTask] = useState(null);
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState("Good");
  const [hoursSpent, setHoursSpent] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [saving, setSaving] = useState(false);
  const isUpdate = mode === "update" || !!logId;
  const draftStateRef = useRef({});
  const skipDraftSaveRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function load() {
        const loadedTask = await getTaskById(taskId);
        const existing = logId ? await getServiceLogById(taskId, logId) : null;
        const draft = !existing && !isUpdate ? await getLogDraft(taskId) : null;
        const source = existing || draft || {};
        if (active) {
          setTask(loadedTask);
          setNotes(source.notes || "");
          setCondition(source.condition || "Good");
          setHoursSpent(source.hoursSpent ? String(source.hoursSpent) : "");
          setPartsUsed(source.partsUsed || "");
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [taskId, logId, isUpdate]),
  );

  useEffect(() => {
    draftStateRef.current = {
      taskId,
      logType,
      label,
      notes,
      condition,
      hoursSpent,
      partsUsed,
    };
  }, [condition, hoursSpent, label, logType, notes, partsUsed, taskId]);

  useEffect(() => {
    return () => {
      const draft = draftStateRef.current;
      const hasDraftContent =
        String(draft.notes || "").trim() ||
        String(draft.hoursSpent || "").trim() ||
        String(draft.partsUsed || "").trim();

      if (!isUpdate && !skipDraftSaveRef.current && draft.taskId && hasDraftContent) {
        saveLogDraft(draft.taskId, draft);
      }
    };
  }, [isUpdate]);

  const persistDraftAndBack = async () => {
    if (!isUpdate) {
      skipDraftSaveRef.current = true;
      await saveLogDraft(taskId, {
        taskId,
        logType,
        label,
        notes,
        condition,
        hoursSpent,
        partsUsed,
      });
    }
    router.back();
  };

  const handleSubmit = async () => {
    if (task?.status !== TASK_STATUS.IN_PROGRESS) {
      Alert.alert("Unavailable", "Service notes can only be added or edited while the work order is in progress.");
      return;
    }
    if (!notes.trim()) {
      Alert.alert("Required", "Enter notes about the service work performed.");
      return;
    }

    setSaving(true);
    try {
      await upsertServiceLog({
        id: logId,
        taskId,
        requestId: task?.requestId,
        unitId: task?.unitId,
        unitName: task?.unitName,
        technicianId: current?.id,
        technicianName: getDisplayName(current),
        logType,
        label,
        notes: notes.trim(),
        condition,
        hoursSpent: Number(hoursSpent) || 0,
        partsUsed: partsUsed.trim(),
      });
      skipDraftSaveRef.current = true;
      await clearLogDraft(taskId);
      Alert.alert("Saved", "Service note saved successfully.", [
        {
          text: "OK",
          onPress: () => router.replace(`/technician/task/${taskId}/unit/log/select`),
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Pressable
      onPress={persistDraftAndBack}
      style={{
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.42)",
        justifyContent: "flex-end",
      }}
    >
      <KeyboardAwareScrollView
        onStartShouldSetResponder={() => true}
        minBottomPadding={148}
        contentContainerStyle={{
          padding: SPACING.md,
          paddingBottom: SPACING.lg,
          backgroundColor: COLORS.bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <PageHeader
          title={`${isUpdate ? "Update" : "Add"} Service Note`}
          subtitle={task?.unitName || `Work Order #${String(taskId).slice(0, 8)}`}
          color={COLORS.tech}
          onBack={persistDraftAndBack}
        />

        <Card style={{ marginBottom: SPACING.md }}>
          <Text
            style={{
              fontSize: FONT.base,
              fontWeight: FONT.bold,
              color: COLORS.textPrimary,
              marginBottom: SPACING.sm,
            }}
          >
            AC Unit Condition
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {CONDITION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setCondition(opt)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: SPACING.md,
                  paddingVertical: SPACING.sm,
                  borderRadius: RADIUS.full,
                  backgroundColor: condition === opt ? COLORS.tech : COLORS.border,
                }}
              >
                <Text
                  style={{
                    color: condition === opt ? COLORS.surface : COLORS.textPrimary,
                    fontWeight: FONT.bold,
                    fontSize: FONT.sm,
                  }}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={{ marginBottom: SPACING.md }}>
          <TextField
            label="Hours Worked"
            value={hoursSpent}
            onChangeText={setHoursSpent}
            placeholder="e.g. 2.5"
            keyboardType="decimal-pad"
          />
          <TextField
            label="Parts Used"
            value={partsUsed}
            onChangeText={setPartsUsed}
            placeholder="e.g. Filter, Refrigerant"
          />
        </Card>

        <Card style={{ marginBottom: SPACING.md }}>
          <TextField
            label="Service Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe the service work performed"
            multiline
            numberOfLines={4}
          />
        </Card>

        <TechButton
          title={saving ? "Saving..." : "Save Service Note"}
          onPress={handleSubmit}
          loading={saving}
          style={{ marginBottom: SPACING.md }}
        />
        <TechButton title="Save Draft" onPress={persistDraftAndBack} variant="secondary" />
      </KeyboardAwareScrollView>
    </Pressable>
  );
}
