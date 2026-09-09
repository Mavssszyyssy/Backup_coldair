import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, Text, TouchableOpacity, View } from "react-native";

import ServiceResourcesFields from "../../../../../../components/technician/ServiceResourcesFields";
import { PageControls } from "../../../../../../components/ui/PagedItems";
import TechButton from "../../../../../../components/technician/TechButton";
import ServiceReportQuickChoices from "../../../../../../components/technician/ServiceReportQuickChoices";
import { serviceReportError } from "../../../../../../services/serviceReportValidation";
import { suggestedServiceType } from "../../../../../../services/technicianTaskLogic";
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
  LOG_TYPES,
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
  const [findings, setFindings] = useState("");
  const [resolution, setResolution] = useState("");
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState("Good");
  const [hoursSpent, setHoursSpent] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [resourcesError, setResourcesError] = useState("");
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [choiceError, setChoiceError] = useState("");
  const [reportType, setReportType] = useState(logType);
  const isUpdate = mode === "update" || !!logId;
  const scrollRef = useRef(null);
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
          const selectedType = source.logType || logType;
          setReportType(selectedType === "other" ? (LOG_TYPES.some(type => type.id === loadedTask?.serviceType) ? loadedTask.serviceType : suggestedServiceType(loadedTask)) : selectedType);
          setFindings(source.findings || "");
          setResolution(source.resolution || "");
          setNotes(source.notes || "");
          setCondition(source.condition || "Good");
          setHoursSpent(source.hoursSpent ? String(source.hoursSpent) : "");
          setPartsUsed(source.partsUsed || "");
          setLaborCost(source.laborCost == null ? "" : String(source.laborCost));
          setPartsCost(source.partsCost == null ? "" : String(source.partsCost));
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [taskId, logId, isUpdate, logType]),
  );

  useEffect(() => {
    draftStateRef.current = {
      taskId,
      logType: reportType,
      label: LOG_TYPES.find(type => type.id === reportType)?.label || label,
      findings,
      resolution,
      notes,
      condition,
      hoursSpent,
      partsUsed,
      laborCost,
      partsCost,
    };
  }, [condition, findings, hoursSpent, label, reportType, notes, partsUsed, resolution, taskId, laborCost, partsCost]);

  useEffect(() => {
    return () => {
      const draft = draftStateRef.current;
      const hasDraftContent =
        String(draft.findings || "").trim() ||
        String(draft.resolution || "").trim() ||
        String(draft.notes || "").trim() ||
        String(draft.hoursSpent || "").trim() ||
        String(draft.partsUsed || "").trim() ||
        String(draft.laborCost ?? "").trim() || String(draft.partsCost ?? "").trim();

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
        logType: reportType,
        label: LOG_TYPES.find(type => type.id === reportType)?.label || label,
        findings,
        resolution,
        notes,
        condition,
        hoursSpent,
        partsUsed,
        laborCost,
        partsCost,
      });
    }
    router.back();
  };

  const handleSubmit = async () => {
    if (task?.status !== TASK_STATUS.IN_PROGRESS) {
      Alert.alert("Unavailable", "Service notes can only be added or edited while the work order is in progress.");
      return;
    }
    const reportError = resourcesError || choiceError || serviceReportError(findings, resolution);
    if (reportError) {
      Alert.alert("Service report incomplete", reportError);
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
        logType: reportType,
        label: LOG_TYPES.find(type => type.id === reportType)?.label || label,
        findings: findings.trim(),
        resolution: resolution.trim(),
        notes: notes.trim(),
        condition,
        hoursSpent: hoursSpent === "" ? null : Number(hoursSpent),
        laborCost: laborCost === "" ? null : Number(laborCost),
        partsCost: partsCost === "" ? null : Number(partsCost),
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
    } catch (error) {
      Alert.alert("Service note not saved", error?.message || "Please try again. Your entries are still here.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.42)",
        justifyContent: "flex-end",
      }}
    >
      <KeyboardAwareScrollView
        ref={scrollRef}
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

        <Text style={{ fontWeight: "700", marginBottom: SPACING.md }}>{["1. Condition and resources", "2. Findings and work performed", "3. Review service note"][page]}</Text>
        <View style={{ display: page === 0 ? "flex" : "none" }}>
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
          <ServiceResourcesFields hoursSpent={hoursSpent} onHoursChange={setHoursSpent} partsUsed={partsUsed} onPartsChange={setPartsUsed} laborCost={laborCost} onLaborChange={setLaborCost} partsCost={partsCost} onPartsCostChange={setPartsCost} onValidationChange={setResourcesError} />
        </Card>
        </View>
        <View style={{ display: page === 1 ? "flex" : "none" }}>
        <Card style={{ marginBottom: SPACING.md }}>
          <ServiceReportQuickChoices serviceType={reportType} findings={findings} resolution={resolution} onFindingsChange={setFindings} onResolutionChange={setResolution} onValidationChange={setChoiceError} />
          <TextField
            label="Additional Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add customer advice or follow-up details"
            multiline
            numberOfLines={4}
          />
        </Card>

        </View>
        {page === 2 ? <>
        <Card>
          <Text>{`Condition: ${condition}\nHours worked: ${hoursSpent || "Not recorded"}\nParts used: ${partsUsed || "Not recorded"}\nLabor cost: ${laborCost === "" ? "Not recorded" : "PHP " + Number(laborCost).toFixed(2)}\nParts cost: ${partsCost === "" ? "Not recorded" : "PHP " + Number(partsCost).toFixed(2)}`}</Text>
          <Text style={{ marginTop: SPACING.md }}>{`Findings: ${findings}\nWork performed: ${resolution}\nAdditional notes: ${notes || "None"}`}</Text>
        </Card>
        <TechButton
          title={saving ? "Saving..." : "Save Service Note"}
          onPress={handleSubmit}
          loading={saving}
          style={{ marginBottom: SPACING.md }}
        />
        </> : null}
        <PageControls page={page} total={3} label="Service note" onChange={next => {
          const error = next > page ? (page === 0 ? resourcesError : choiceError || serviceReportError(findings, resolution)) : "";
          if (error) { Alert.alert("Check service note", error); return; }
          Keyboard.dismiss();
          setPage(next);
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }} />
        <TechButton title="Save Draft" onPress={persistDraftAndBack} variant="secondary" />
      </KeyboardAwareScrollView>
    </View>
  );
}
